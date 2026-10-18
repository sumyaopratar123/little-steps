const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  docType: {
    type: String,
    enum: ['Government ID', 'Criminal Background Check', 'CPR & First Aid Certificate', 'Childcare License', 'Other'],
    required: true
  },
  fileName: { type: String, required: true },
  documentUrl: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  uploadedAt: { type: Date, default: Date.now }
});

const dayScheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  isAvailable: { type: Boolean, default: true },
  startTime: { type: String, default: '08:00' }, // HH:mm format
  endTime: { type: String, default: '20:00' }    // HH:mm format
}, { _id: false });

const defaultSchedule = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
].map(day => ({
  day,
  isAvailable: true,
  startTime: '08:00',
  endTime: '20:00'
}));

const providerProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bio: {
    type: String,
    default: 'Dedicated, loving, and certified childcare specialist committed to nurturing every child in a safe and supportive environment.'
  },
  experienceYears: {
    type: Number,
    default: 3,
    min: 0,
    max: 50
  },
  services: [{
    type: String,
    enum: [
      'Infant Care (0-1 yr)',
      'Toddler Care (1-3 yrs)',
      'Preschool Care (3-5 yrs)',
      'Overnight / 24x7 Care',
      'After-School Care',
      'Special Needs Support',
      'Weekend Care',
      'Emergency Drop-in'
    ]
  }],
  hourlyRate: {
    type: Number,
    required: true,
    default: 25,
    min: 10,
    max: 200
  },
  overnightRate: {
    type: Number,
    default: 30,
    min: 10,
    max: 300
  },
  maxCapacity: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  is24x7Available: {
    type: Boolean,
    default: false
  },
  availabilitySchedule: {
    type: [dayScheduleSchema],
    default: defaultSchedule
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationDocuments: [documentSchema],
  rejectionReason: {
    type: String,
    default: ''
  },
  certifications: [{
    type: String
  }],
  city: {
    type: String,
    default: 'San Francisco',
    trim: true
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProviderProfile', providerProfileSchema);
