const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  deadline: {
    type: Number,
    required: true
  },
  skillsRequired: [{
    type: String,
    trim: true
  }],
  jobPoster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'canceled'],
    default: 'open'
  },
  selectedBid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);