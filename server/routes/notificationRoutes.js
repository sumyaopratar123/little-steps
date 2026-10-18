const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAllRead
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getMyNotifications);
router.patch('/read-all', protect, markAllRead);

module.exports = router;
