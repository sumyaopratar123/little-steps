const crypto = require('crypto');
const Booking = require('../models/Booking');
const ProviderProfile = require('../models/ProviderProfile');
const Notification = require('../models/Notification');

const timeToMinutes = (time) => {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
};

const doRangesOverlap = (
  start1,
  end1,
  start2,
  end2,
  overnight1 = false,
  overnight2 = false
) => {
  let s1 = timeToMinutes(start1);
  let e1 = timeToMinutes(end1);
  let s2 = timeToMinutes(start2);
  let e2 = timeToMinutes(end2);

  if (overnight1 && e1 <= s1) e1 += 1440;
  if (overnight2 && e2 <= s2) e2 += 1440;

  // Handle bookings that cross midnight.
  return (
    (s1 < e2 && e1 > s2) ||
    (overnight2 && s1 + 1440 < e2 && e1 + 1440 > s2) ||
    (overnight1 && s1 < e2 + 1440 && e1 > s2 + 1440)
  );
};

const notifyUser = async (userId, title, message, link) => {
  await Notification.create({
    user: userId,
    title,
    message,
    type: 'booking',
    link
  });
};

// POST /api/bookings
// Create a booking.
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

    if (!providerId || !dateString || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide provider, date, start time and end time.'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking date.'
      });
    }

    const [year, month, day] = dateString.split('-').map(Number);
    const bookingDate = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
      bookingDate.getFullYear() !== year ||
      bookingDate.getMonth() !== month - 1 ||
      bookingDate.getDate() !== day ||
      bookingDate < today
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid date today or in the future.'
      });
    }

    if (
      !emergencyContact ||
      !emergencyContact.name ||
      !emergencyContact.phone
    ) {
      return res.status(400).json({
        success: false,
        message: 'Emergency contact name and phone are required.'
      });
    }

    if (
      !Array.isArray(childDetails) ||
      childDetails.length === 0 ||
      childDetails.some(
        (child) =>
          !child.name ||
          child.age === undefined ||
          child.age === null
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid details for at least one child.'
      });
    }

    if (String(req.user._id) === String(providerId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own childcare service.'
      });
    }

    const profile = await ProviderProfile.findOne({
      $or: [
        { user: providerId },
        { _id: providerId }
      ]
    }).populate('user', 'name email phone');

    if (!profile || !profile.user) {
      return res.status(404).json({
        success: false,
        message: 'Childcare provider not found.'
      });
    }

    if (profile.verificationStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'This provider is not verified to accept bookings.'
      });
    }

    const providerUserId = profile.user._id;
    const numberOfChildren = childDetails.length;
    const maxCapacity = Math.max(
      0,
      Number(profile.maxCapacity) || 3
    );
    const overnightBooking = Boolean(isOvernight);

    if (numberOfChildren > maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Maximum capacity is ${maxCapacity} children.`
      });
    }

    if (
      !/^\d{2}:\d{2}$/.test(startTime) ||
      !/^\d{2}:\d{2}$/.test(endTime)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid start and end times.'
      });
    }

    const startMins = timeToMinutes(startTime);
    let endMins = timeToMinutes(endTime);

    if (
      startMins < 0 ||
      startMins >= 1440 ||
      endMins < 0 ||
      endMins >= 1440
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking time.'
      });
    }

    if (!overnightBooking && endMins <= startMins) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time.'
      });
    }

    if (overnightBooking && endMins <= startMins) {
      endMins += 1440;
    }

    const totalHours =
      Math.round(((endMins - startMins) / 60) * 10) / 10;

    if (totalHours < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'Booking must be at least 30 minutes.'
      });
    }

    // Check provider availability.
    if (!profile.is24x7Available) {
      const days = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      ];

      const dayOfWeek = days[bookingDate.getDay()];

      const daySchedule = (profile.availabilitySchedule || []).find(
        (item) => item.day === dayOfWeek
      );

      if (!daySchedule || !daySchedule.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Provider is unavailable on ${dayOfWeek}.`
        });
      }

      const providerStart = timeToMinutes(
        daySchedule.startTime || '08:00'
      );

      const providerEnd = timeToMinutes(
        daySchedule.endTime || '20:00'
      );

      if (
        startMins < providerStart ||
        (!overnightBooking && endMins > providerEnd)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Selected time is outside provider availability.'
        });
      }
    }

    /*
     * CAPACITY CHECK
     * Only active bookings that overlap the requested time
     * should reduce the provider's available capacity.
     */
    const activeStatuses = [
  'pending',
  'confirmed',
  'in-progress'
];

    const activeBookings = await Booking.find({
      provider: providerUserId,
      dateString,
      status: { $in: activeStatuses }
    });

    let childrenAlreadyBooked = 0;

    for (const existing of activeBookings) {
      if (
        !existing.startTime ||
        !existing.endTime
      ) {
        continue;
      }

      const overlaps = doRangesOverlap(
        startTime,
        endTime,
        existing.startTime,
        existing.endTime,
        overnightBooking,
        Boolean(existing.isOvernight)
      );

      if (!overlaps) continue;

      const savedChildCount = Number(existing.numberOfChildren);

      const existingChildren =
        Number.isFinite(savedChildCount) && savedChildCount > 0
          ? savedChildCount
          : Array.isArray(existing.childDetails) &&
              existing.childDetails.length > 0
            ? existing.childDetails.length
            : 1;

      childrenAlreadyBooked += existingChildren;
    }

    const availablePlaces = Math.max(
      0,
      maxCapacity - childrenAlreadyBooked
    );

    console.log('BOOKING CAPACITY DEBUG:', {
      providerId: String(providerUserId),
      dateString,
      requestedStartTime: startTime,
      requestedEndTime: endTime,
      overnightBooking,
      maxCapacity,
      childrenAlreadyBooked,
      requestedChildren: numberOfChildren,
      availablePlaces,
      activeBookings: activeBookings.map((booking) => ({
        id: String(booking._id),
        status: booking.status,
        dateString: booking.dateString,
        numberOfChildren: booking.numberOfChildren,
        startTime: booking.startTime,
        endTime: booking.endTime,
        isOvernight: booking.isOvernight
      }))
    });

    if (numberOfChildren > availablePlaces) {
      return res.status(409).json({
        success: false,
        message: `Capacity conflict. ${availablePlaces} place(s) remain.`,
        data: {
          maxCapacity,
          childrenAlreadyBooked,
          requestedChildren: numberOfChildren,
          availablePlaces
        }
      });
    }

    // Calculate price.
    const hourlyRate = overnightBooking
      ? (profile.overnightRate || profile.hourlyRate)
      : profile.hourlyRate;

    if (!Number.isFinite(Number(hourlyRate)) || Number(hourlyRate) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Provider hourly rate is not configured correctly.'
      });
    }

    const subtotal = Math.round(
      Number(hourlyRate) * totalHours * numberOfChildren
    );

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
      hourlyRate: Number(hourlyRate),
      subtotal,
      platformFee,
      totalAmount,
      status: 'pending_payment',
      paymentStatus: 'pending',
      paymentMethod: '',
      paymentTransactionId: '',
      paymentPaidAt: null,
      emergencyContact,
      specialInstructions: specialInstructions || ''
    });

    return res.status(201).json({
      success: true,
      message: 'Booking created. Please choose a payment method.',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/bookings/:id/payment-method
exports.selectPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;

    if (!['demo_upi', 'cash_after_service'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Choose Demo UPI or Cash After Service.'
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (String(booking.parent) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only select payment for your own booking.'
      });
    }

    if (booking.status !== 'pending_payment') {
      return res.status(400).json({
        success: false,
        message: 'This booking is no longer awaiting payment selection.'
      });
    }

    booking.paymentMethod = paymentMethod;

    if (paymentMethod === 'demo_upi') {
      booking.paymentStatus = 'pending';
      booking.paymentTransactionId = '';
      booking.paymentPaidAt = null;
    } else {
      booking.paymentStatus = 'due';
      booking.paymentTransactionId = '';
      booking.paymentPaidAt = null;
    }

    booking.status = 'pending';
    await booking.save();

    await notifyUser(
      booking.provider,
      'New Booking Request',
      `A parent submitted a childcare booking for ${booking.dateString} (${booking.startTime} - ${booking.endTime}). Payment method: ${
        paymentMethod === 'demo_upi'
          ? 'Demo UPI (not a real payment)'
          : 'Cash after service'
      }.`,
      '/provider/dashboard'
    );

    return res.status(200).json({
      success: true,
      message:
        paymentMethod === 'demo_upi'
          ? 'Demo payment selected. No real money was transferred.'
          : 'Cash after service selected. Payment is due after care.',
      realMoneyTransferred: false,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/bookings/:id/demo-payment
exports.processDemoPayment = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (String(booking.parent) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only pay for your own booking.'
      });
    }

    if (
      booking.paymentMethod !== 'demo_upi' ||
      booking.status !== 'pending' ||
      booking.paymentStatus !== 'pending'
    ) {
      return res.status(400).json({
        success: false,
        message: 'This booking is not awaiting a demo UPI payment.'
      });
    }

    booking.paymentStatus = 'paid';
    booking.paymentTransactionId = `DEMO-${crypto.randomUUID()}`;
    booking.paymentPaidAt = new Date();

    await booking.save();

    return res.status(200).json({
      success: true,
      message:
        'Demo payment simulated successfully. No real money transferred.',
      demoPayment: true,
      realMoneyTransferred: false,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings
exports.getMyBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};

    if (req.user.role === 'parent') {
      query.parent = req.user._id;
    } else if (req.user.role === 'provider') {
      query.provider = req.user._id;
    }

    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('parent', 'name email phone')
      .populate('provider', 'name email phone')
      .populate(
        'providerProfile',
        'hourlyRate overnightRate rating city'
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/:id
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

    const parentId = booking.parent._id || booking.parent;
    const providerId = booking.provider._id || booking.provider;

    const allowed =
      String(parentId) === String(req.user._id) ||
      String(providerId) === String(req.user._id) ||
      req.user.role === 'admin';

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking.'
      });
    }

    return res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/bookings/:id/status
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body;

    const allowedStatuses = [
      'confirmed',
      'in-progress',
      'completed',
      'cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status.'
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('parent', 'name email')
      .populate('provider', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const parentId = booking.parent._id || booking.parent;
    const providerId = booking.provider._id || booking.provider;

    const isParent = String(parentId) === String(req.user._id);
    const isProvider = String(providerId) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isParent && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this booking.'
      });
    }

    if (
      ['confirmed', 'in-progress', 'completed'].includes(status) &&
      booking.paymentMethod === 'demo_upi' &&
      booking.paymentStatus !== 'paid'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Demo UPI payment has not been completed.'
      });
    }

    if (
      ['confirmed', 'in-progress', 'completed'].includes(status) &&
      !isProvider &&
      !isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only the provider or admin can update this status.'
      });
    }

    if (status === 'cancelled' && booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking.'
      });
    }

    booking.status = status;

    if (
      status === 'completed' &&
      booking.paymentMethod === 'cash_after_service' &&
      booking.paymentStatus === 'due'
    ) {
      booking.paymentStatus = 'paid';
      booking.paymentPaidAt = new Date();
    }

    if (status === 'cancelled') {
      booking.cancelledBy = req.user._id;
      booking.cancellationReason =
        cancellationReason || `Cancelled by ${req.user.role}`;
    }

    await booking.save();

    const targetUserId = isParent
      ? providerId
      : parentId;

    await notifyUser(
      targetUserId,
      `Booking ${status.toUpperCase()}`,
      `Booking for ${booking.dateString} (${booking.startTime} - ${booking.endTime}) is now ${status}.`,
      isParent ? '/provider/dashboard' : '/parent/dashboard'
    );

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}.`,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};