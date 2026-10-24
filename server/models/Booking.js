
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
    name: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      required: true
    },
    allergies: [{
      type: String
    }],
    specialNeeds: {
      type: String,
      default: ''
    }
  }],

  numberOfChildren: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },

  dateString: {
    type: String,
    required: true
  },

  startTime: {
    type: String,
    required: true
  },

  endTime: {
    type: String,
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

  // Booking lifecycle
  status: {
    type: String,
    enum: [
      'pending_payment',
      'pending',
      'confirmed',
      'in-progress',
      'completed',
      'cancelled'
    ],
    default: 'pending_payment'
  },

  // Payment details
  paymentMethod: {
    type: String,
    enum: [
      'demo_upi',
      'cash_after_service',
      ''
    ],
    default: ''
  },

  paymentStatus: {
    type: String,
    enum: [
      'pending',
      'paid',
      'failed',
      'refunded',
      'due'
    ],
    default: 'pending'
  },

  paymentTransactionId: {
    type: String,
    default: ''
  },

  paymentPaidAt: {
    type: Date,
    default: null
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
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    relation: {
      type: String,
      default: 'Parent / Guardian'
    }
  },

  specialInstructions: {
    type: String,
    default: ''
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);
