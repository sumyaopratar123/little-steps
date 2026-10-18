const express = require('express');
const router = express.Router();
const {
  getProviders,
  getProviderById,
  updateCurrentProviderProfile,
  submitVerificationDoc
} = require('../controllers/providerController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Public routes
router.get('/', getProviders);
router.get('/:id', getProviderById);

// Provider authenticated routes
router.put('/profile/update', protect, authorize('provider'), updateCurrentProviderProfile);
router.post('/verification-docs', protect, authorize('provider'), submitVerificationDoc);

module.exports = router;
