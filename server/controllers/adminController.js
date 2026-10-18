const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Notification = require('../models/Notification');

// @desc    Get system-wide platform statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getPlatformStats = async (req, res, next) => {
  try {
    const totalParents = await User.countDocuments({ role: 'parent' });
    const totalProviders = await User.countDocuments({ role: 'provider' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    const verifiedProviders = await ProviderProfile.countDocuments({ verificationStatus: 'verified' });
    const pendingVerifications = await ProviderProfile.countDocuments({ verificationStatus: 'pending' });
    const rejectedProviders = await ProviderProfile.countDocuments({ verificationStatus: 'rejected' });

    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const inProgressBookings = await Booking.countDocuments({ status: 'in-progress' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

    const financialAgg = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, platformFees: { $sum: '$platformFee' } } }
    ]);

    const totalRevenue = financialAgg[0] ? financialAgg[0].totalRevenue : 0;
    const platformFees = financialAgg[0] ? financialAgg[0].platformFees : 0;

    res.status(200).json({
      success: true,
      data: {
        users: {
          totalParents,
          totalProviders,
          totalAdmins,
          total: totalParents + totalProviders + totalAdmins
        },
        providers: {
          verified: verifiedProviders,
          pending: pendingVerifications,
          rejected: rejectedProviders
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          inProgress: inProgressBookings,
          completed: completedBookings,
          cancelled: cancelledBookings
        },
        financials: {
          totalCompletedVolume: totalRevenue,
          totalPlatformFees: platformFees
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending provider verification submissions
// @route   GET /api/admin/verifications
// @access  Private (Admin only)
exports.getPendingVerifications = async (req, res, next) => {
  try {
    const profiles = await ProviderProfile.find({ verificationStatus: 'pending' })
      .populate('user', 'name email phone address createdAt')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject a provider verification
// @route   PATCH /api/admin/verifications/:id
// @access  Private (Admin only)
exports.verifyProvider = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;
    const { id } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'approve' or 'reject'."
      });
    }

    let profile = await ProviderProfile.findById(id).populate('user', 'name email');
    if (!profile) {
      profile = await ProviderProfile.findOne({ user: id }).populate('user', 'name email');
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found.'
      });
    }

    if (action === 'approve') {
      profile.verificationStatus = 'verified';
      profile.rejectionReason = '';
      profile.verificationDocuments.forEach(doc => {
        doc.status = 'verified';
      });

      await Notification.create({
        user: profile.user._id,
        title: 'Provider Account Verified!',
        message: 'Congratulations! Your credentials have been verified by the Little Steps safety team. Your profile is now live and accepting bookings.',
        type: 'verification',
        link: '/provider/dashboard'
      });
    } else {
      profile.verificationStatus = 'rejected';
      profile.rejectionReason = rejectionReason || 'Documents did not meet Little Steps verification guidelines.';
      profile.verificationDocuments.forEach(doc => {
        if (doc.status === 'pending') {
          doc.status = 'rejected';
        }
      });

      await Notification.create({
        user: profile.user._id,
        title: 'Verification Action Required',
        message: `Your verification request was not approved: ${profile.rejectionReason}. Please re-submit valid credentials.`,
        type: 'verification',
        link: '/provider/dashboard'
      });
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: `Provider verification ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (parents, providers, admins)
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { email: { $regex: new RegExp(search, 'i') } }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active/banned status
// @route   PATCH /api/admin/users/:id/toggle-status
// @access  Private (Admin only)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Admins cannot deactivate their own account.'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account has been ${user.isActive ? 'reactivated' : 'deactivated'}.`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings platform-wide
// @route   GET /api/admin/bookings
// @access  Private (Admin only)
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('parent', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('providerProfile', 'city hourlyRate')
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
