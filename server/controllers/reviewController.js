const Review = require('../models/Review');
const Booking = require('../models/Booking');
const ProviderProfile = require('../models/ProviderProfile');

// @desc    Create a review for a completed booking
// @route   POST /api/reviews
// @access  Private (Parent only)
exports.createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide booking ID, star rating (1-5), and review comment.'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Must be the parent of the booking
    if (booking.parent.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only review bookings made from your own account.'
      });
    }

    // Must be completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only leave a review after the childcare session has been completed.'
      });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this booking.'
      });
    }

    const review = await Review.create({
      booking: bookingId,
      parent: req.user._id,
      provider: booking.provider,
      rating: Number(rating),
      comment
    });

    // Recalculate provider's average rating & review count
    const allProviderReviews = await Review.find({ provider: booking.provider });
    const totalRating = allProviderReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Math.round((totalRating / allProviderReviews.length) * 10) / 10;

    await ProviderProfile.findOneAndUpdate(
      { user: booking.provider },
      {
        rating: avgRating,
        reviewCount: allProviderReviews.length
      }
    );

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been published.',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews for a provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
exports.getProviderReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate('parent', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};
