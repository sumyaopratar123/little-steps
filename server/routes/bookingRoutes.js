
const express = require('express');
const router = express.Router();

const {
  createBooking,
  selectPaymentMethod,
  processDemoPayment,
  getMyBookings,
  getBookingById,
  updateBookingStatus
} = require('../controllers/bookingController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Create a new booking
router.post(
  '/',
  protect,
  authorize('parent'),
  createBooking
);

// Select payment method: Demo UPI or Cash After Service
router.post(
  '/:id/payment-method',
  protect,
  authorize('parent'),
  selectPaymentMethod
);

// Process simulated UPI payment (no real money transfer)
router.post(
  '/:id/demo-payment',
  protect,
  authorize('parent'),
  processDemoPayment
);

// Get current user's bookings
router.get(
  '/',
  protect,
  getMyBookings
);

// Get booking details by ID
router.get(
  '/:id',
  protect,
  getBookingById
);

// Update booking status
router.patch(
  '/:id/status',
  protect,
  updateBookingStatus
);

module.exports = router;
