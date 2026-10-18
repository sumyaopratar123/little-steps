const Booking = require('../models/Booking');
const ProviderProfile = require('../models/ProviderProfile');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper to convert "HH:mm" to minutes from midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to check if two time ranges overlap
// Handles normal same-day ranges and overnight ranges (wrapping past midnight)
const doRangesOverlap = (start1, end1, start2, end2, isOvernight1, isOvernight2) => {
  let mStart1 = timeToMinutes(start1);
  let mEnd1 = timeToMinutes(end1);
  let mStart2 = timeToMinutes(start2);
  let mEnd2 = timeToMinutes(end2);

  if (isOvernight1 && mEnd1 <= mStart1) {
    mEnd1 += 24 * 60;
  }
  if (isOvernight2 && mEnd2 <= mStart2) {
    mEnd2 += 24 * 60;
  }

  return mStart1 < mEnd2 && mEnd1 > mStart2;
};

// @desc    Create a new booking with capacity & availability conflict checks
// @route   POST /api/bookings
// @access  Private (Parent only)
exports.createBooking = async (req, res, next) => {
  try {
    const {
      providerId,
      childDetails,
      dateString,
      startTime,
      endTime,
      isOvernight,
      emergencyContact,
      specialInstructions
    } = req.body;

    // Validate inputs
    if (!providerId || !dateString || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide provider, date, start time, and end time.'
      });
    }

    if (!emergencyContact || !emergencyContact.name || !emergencyContact.phone) {
      return res.status(400).json({
        success: false,
        message: 'Emergency contact name and phone number are required.'
      });
    }

    if (!childDetails || !Array.isArray(childDetails) || childDetails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select or add at least one child for this booking.'
      });
    }

    // Check self-booking
    if (req.user._id.toString() === providerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own childcare services.'
      });
    }

    // Find provider profile
    let profile = await ProviderProfile.findOne({
      $or: [{ user: providerId }, { _id: providerId }]
    }).populate('user', 'name email phone');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Childcare provider not found.'
      });
    }

    const providerUserId = profile.user._id;

    // Verify provider is approved
    if (profile.verificationStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'This provider is not yet verified to accept bookings on Little Steps.'
      });
    }

    const numberOfChildren = childDetails.length;
    const maxCapacity = profile.maxCapacity || 3;

    if (numberOfChildren > maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Booking exceeds provider's absolute capacity limit (${maxCapacity} children max).`
      });
    }

    // Calculate duration in hours
    const startMins = timeToMinutes(startTime);
    let endMins = timeToMinutes(endTime);
    const overnightBooking = Boolean(isOvernight);

    if (!overnightBooking && endMins <= startMins) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time for daytime bookings. For overnight care, please enable overnight option.'
      });
    }

    if (overnightBooking && endMins <= startMins) {
      endMins += 24 * 60;
    }

    const durationMinutes = endMins - startMins;
    if (durationMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking duration.'
      });
    }

    const totalHours = Math.round((durationMinutes / 60) * 10) / 10;

    // Check Provider Availability Schedule (if not 24x7)
    if (!profile.is24x7Available) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      // Parse UTC date string YYYY-MM-DD
      const [year, month, day] = dateString.split('-').map(Number);
      const bookingDateObj = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = days[bookingDateObj.getUTCDay()];

      const daySchedule = (profile.availabilitySchedule || []).find(s => s.day === dayOfWeek);

      if (!daySchedule || !daySchedule.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Provider is not available on ${dayOfWeek}s. Please choose an available day.`
        });
      }

      const provStart = timeToMinutes(daySchedule.startTime || '08:00');
      const provEnd = timeToMinutes(daySchedule.endTime || '20:00');

      if (startMins < provStart || (!overnightBooking && endMins > provEnd)) {
        return res.status(400).json({
          success: false,
          message: `Booking time (${startTime} - ${endTime}) falls outside provider's operating hours on ${dayOfWeek} (${daySchedule.startTime} - ${daySchedule.endTime}).`
        });
      }
    }

    // Check for Capacity Conflicts with overlapping active bookings
    const activeBookings = await Booking.find({
      provider: providerUserId,
      dateString,
      status: { $in: ['pending', 'confirmed', 'in-progress'] }
    });

    let currentChildrenInSlot = 0;
    for (const existing of activeBookings) {
      const overlaps = doRangesOverlap(
        startTime,
        endTime,
        existing.startTime,
        existing.endTime,
        overnightBooking,
        existing.isOvernight
      );

      if (overlaps) {
        currentChildrenInSlot += (existing.numberOfChildren || 1);
      }
    }

    if (currentChildrenInSlot + numberOfChildren > maxCapacity) {
      const remainingCapacity = Math.max(0, maxCapacity - currentChildrenInSlot);
      return res.status(409).json({
        success: false,
        message: `Capacity conflict: Provider has ${currentChildrenInSlot} child(ren) booked during this time window. Max capacity is ${maxCapacity} (only ${remainingCapacity} spot(s) remaining).`
      });
    }

    // Calculate pricing
    const applicableRate = overnightBooking ? (profile.overnightRate || profile.hourlyRate) : profile.hourlyRate;
    const subtotal = Math.round(applicableRate * totalHours * numberOfChildren);
    const platformFee = 5;
    const totalAmount = subtotal + platformFee;

    const booking = await Booking.create({
      parent: req.user._id,
      provider: providerUserId,
      providerProfile: profile._id,
      childDetails,
      numberOfChildren,
      dateString,
      startTime,
      endTime,
      isOvernight: overnightBooking,
      totalHours,
      hourlyRate: applicableRate,
      subtotal,
      platformFee,
      totalAmount,
      status: 'pending',
      emergencyContact,
      specialInstructions: specialInstructions || ''
    });

    // Notify provider
    await Notification.create({
      user: providerUserId,
      title: 'New Booking Request',
      message: `${req.user.name} requested childcare for ${numberOfChildren} child(ren) on ${dateString} (${startTime} - ${endTime}).`,
      type: 'booking',
      link: '/provider/dashboard'
    });

    res.status(201).json({
      success: true,
      message: 'Booking request created successfully.',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings for logged in user (filtered by parent or provider role)
// @route   GET /api/bookings
// @access  Private
exports.getMyBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};

    if (req.user.role === 'parent') {
      query.parent = req.user._id;
    } else if (req.user.role === 'provider') {
      query.provider = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('parent', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('providerProfile', 'hourlyRate overnightRate rating city')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('parent', 'name email phone address')
      .populate('provider', 'name email phone')
      .populate('providerProfile');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Role check: Only parent, provider, or admin involved can view
    const isParent = booking.parent._id.toString() === req.user._id.toString();
    const isProvider = booking.provider._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isParent && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking.'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status (confirmed, in-progress, completed, cancelled)
// @route   PATCH /api/bookings/:id/status
// @access  Private (Provider, Parent, Admin)
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('parent', 'name email')
      .populate('provider', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const isParent = booking.parent._id.toString() === req.user._id.toString();
    const isProvider = booking.provider._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isParent && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this booking.'
      });
    }

    // Validate state transitions
    if (status === 'confirmed') {
      if (!isProvider && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the provider or admin can confirm a booking.'
        });
      }
      booking.status = 'confirmed';
    } else if (status === 'in-progress') {
      if (!isProvider && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the provider or admin can start the childcare session.'
        });
      }
      booking.status = 'in-progress';
    } else if (status === 'completed') {
      if (!isProvider && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the provider or admin can complete a booking.'
        });
      }
      booking.status = 'completed';
    } else if (status === 'cancelled') {
      if (booking.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel an already completed booking.'
        });
      }
      booking.status = 'cancelled';
      booking.cancelledBy = req.user._id;
      booking.cancellationReason = cancellationReason || `Cancelled by ${req.user.role}`;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status.'
      });
    }

    await booking.save();

    // Send notification to the opposite party
    const targetUserId = isParent ? booking.provider._id : booking.parent._id;
    await Notification.create({
      user: targetUserId,
      title: `Booking ${status.toUpperCase()}`,
      message: `Booking for ${booking.dateString} (${booking.startTime} - ${booking.endTime}) is now ${status}.`,
      type: 'booking',
      link: isParent ? '/provider/dashboard' : '/parent/dashboard'
    });

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}.`,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};
