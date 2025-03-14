const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  bid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'refunded'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);