const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Parent booking creation
router.post('/', protect, authorize('parent'), createBooking);

// Get bookings (filtered by user role)
router.get('/', protect, getMyBookings);

// Get single booking
router.get('/:id', protect, getBookingById);

// Update status (confirm, in-progress, complete, cancel)
router.patch('/:id/status', protect, updateBookingStatus);

module.exports = router;
