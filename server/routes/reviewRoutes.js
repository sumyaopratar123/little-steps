const express = require('express');
const router = express.Router();
const {
  createReview,
  getProviderReviews
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/provider/:providerId', getProviderReviews);
router.post('/', protect, authorize('parent'), createReview);

module.exports = router;
