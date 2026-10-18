const express = require('express');
const router = express.Router();
const {
  getPlatformStats,
  getPendingVerifications,
  verifyProvider,
  getAllUsers,
  toggleUserStatus,
  getAllBookings
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// All admin routes require protect and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getPlatformStats);
router.get('/verifications', getPendingVerifications);
router.patch('/verifications/:id', verifyProvider);
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.get('/bookings', getAllBookings);

module.exports = router;
