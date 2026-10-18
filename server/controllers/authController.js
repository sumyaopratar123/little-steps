const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');

const sendTokenResponse = (user, statusCode, res, extra = {}) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'littlesteps_secure_jwt_secret_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      children: user.children,
      isActive: user.isActive,
      ...extra
    }
  });
};

// @desc    Register a new user (parent or provider)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address, children } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const assignedRole = role === 'provider' ? 'provider' : (role === 'admin' ? 'parent' : 'parent');

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      phone: phone || '',
      address: address || {},
      children: children || []
    });

    let profile = null;
    if (assignedRole === 'provider') {
      profile = await ProviderProfile.create({
        user: user._id,
        hourlyRate: 25,
        overnightRate: 30,
        maxCapacity: 3,
        is24x7Available: false,
        verificationStatus: 'pending'
      });
    }

    sendTokenResponse(user, 201, res, { providerProfile: profile });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently disabled. Please contact support.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    let profile = null;
    if (user.role === 'provider') {
      profile = await ProviderProfile.findOne({ user: user._id });
    }

    sendTokenResponse(user, 200, res, { providerProfile: profile });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user & profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let profile = null;
    if (user.role === 'provider') {
      profile = await ProviderProfile.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      user: {
        ...user.toJSON(),
        providerProfile: profile
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & child records
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, children } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (phone !== undefined) fieldsToUpdate.phone = phone;
    if (address) fieldsToUpdate.address = address;
    if (children) fieldsToUpdate.children = children;

    const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    let profile = null;
    if (user.role === 'provider') {
      profile = await ProviderProfile.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      user: {
        ...user.toJSON(),
        providerProfile: profile
      }
    });
  } catch (error) {
    next(error);
  }
};
