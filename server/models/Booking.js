const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProviderProfile'
  },
  childDetails: [{
    name: { type: String, required: true },
    age: { type: Number, required: true },
    allergies: [{ type: String }],
    specialNeeds: { type: String, default: '' }
  }],
  numberOfChildren: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  dateString: {
    type: String, // 'YYYY-MM-DD'
    required: true
  },
  startTime: {
    type: String, // 'HH:mm'
    required: true
  },
  endTime: {
    type: String, // 'HH:mm'
    required: true
  },
  isOvernight: {
    type: Boolean,
    default: false
  },
  totalHours: {
    type: Number,
    required: true,
    min: 0.5
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    default: 5
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  emergencyContact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relation: { type: String, default: 'Parent / Guardian' }
  },
  specialInstructions: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);
