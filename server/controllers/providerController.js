const ProviderProfile = require('../models/ProviderProfile');
const User = require('../models/User');
const Review = require('../models/Review');

// @desc    Get all verified providers (with filtering, search, sorting)
// @route   GET /api/providers
// @access  Public
exports.getProviders = async (req, res, next) => {
  try {
    const {
      search,
      city,
      service,
      is24x7,
      maxRate,
      minRating,
      allStatus
    } = req.query;

    const query = {};

    // By default, public search only returns verified providers unless specifically overridden by admin/query
    if (!allStatus) {
      query.verificationStatus = 'verified';
    }

    if (city) {
      query.city = { $regex: new RegExp(city, 'i') };
    }

    if (is24x7 === 'true') {
      query.is24x7Available = true;
    }

    if (service) {
      query.services = { $in: [service] };
    }

    if (maxRate) {
      query.hourlyRate = { $lte: Number(maxRate) };
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    let profiles = await ProviderProfile.find(query)
      .populate('user', 'name email phone address isActive')
      .sort({ isFeatured: -1, rating: -1, reviewCount: -1 });

    // Filter out inactive users if any
    profiles = profiles.filter(p => p.user && p.user.isActive !== false);

    // If search keyword provided, match user name or bio or city
    if (search) {
      const keyword = search.toLowerCase();
      profiles = profiles.filter(p =>
        (p.user && p.user.name.toLowerCase().includes(keyword)) ||
        (p.bio && p.bio.toLowerCase().includes(keyword)) ||
        (p.city && p.city.toLowerCase().includes(keyword))
      );
    }

    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single provider by ID (Profile ID or User ID)
// @route   GET /api/providers/:id
// @access  Public
exports.getProviderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let profile = await ProviderProfile.findById(id).populate('user', 'name email phone address');
    if (!profile) {
      // Check if the id passed was the user ID
      profile = await ProviderProfile.findOne({ user: id }).populate('user', 'name email phone address');
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Childcare provider profile not found.'
      });
    }

    // Fetch provider reviews
    const reviews = await Review.find({ provider: profile.user._id })
      .populate('parent', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        profile,
        reviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current provider's profile & settings
// @route   PUT /api/providers/profile
// @access  Private (Provider only)
exports.updateCurrentProviderProfile = async (req, res, next) => {
  try {
    const {
      bio,
      experienceYears,
      services,
      hourlyRate,
      overnightRate,
      maxCapacity,
      is24x7Available,
      availabilitySchedule,
      certifications,
      city
    } = req.body;

    let profile = await ProviderProfile.findOne({ user: req.user._id });

    if (!profile) {
      profile = new ProviderProfile({ user: req.user._id });
    }

    if (bio !== undefined) profile.bio = bio;
    if (experienceYears !== undefined) profile.experienceYears = Number(experienceYears);
    if (services !== undefined) profile.services = services;
    if (hourlyRate !== undefined) profile.hourlyRate = Number(hourlyRate);
    if (overnightRate !== undefined) profile.overnightRate = Number(overnightRate);
    if (maxCapacity !== undefined) profile.maxCapacity = Number(maxCapacity);
    if (is24x7Available !== undefined) profile.is24x7Available = Boolean(is24x7Available);
    if (availabilitySchedule !== undefined) profile.availabilitySchedule = availabilitySchedule;
    if (certifications !== undefined) profile.certifications = certifications;
    if (city !== undefined) profile.city = city;

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Provider profile updated successfully.',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit verification document for admin review
// @route   POST /api/providers/verification-docs
// @access  Private (Provider only)
exports.submitVerificationDoc = async (req, res, next) => {
  try {
    const { docType, fileName, documentUrl } = req.body;

    if (!docType || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide document type and file name.'
      });
    }

    let profile = await ProviderProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = await ProviderProfile.create({ user: req.user._id });
    }

    // Add or update document
    const existingIndex = profile.verificationDocuments.findIndex(d => d.docType === docType);
    if (existingIndex > -1) {
      profile.verificationDocuments[existingIndex] = {
        docType,
        fileName,
        documentUrl: documentUrl || `https://storage.littlesteps.local/docs/${Date.now()}-${fileName}`,
        status: 'pending',
        uploadedAt: new Date()
      };
    } else {
      profile.verificationDocuments.push({
        docType,
        fileName,
        documentUrl: documentUrl || `https://storage.littlesteps.local/docs/${Date.now()}-${fileName}`,
        status: 'pending',
        uploadedAt: new Date()
      });
    }

    // If profile was rejected, move it back to pending
    profile.verificationStatus = 'pending';
    profile.rejectionReason = '';

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Verification document submitted successfully for admin review.',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};
