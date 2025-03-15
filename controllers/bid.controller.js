
const Bid = require('../models/bid.model');
const Job = require('../models/job.model');
const User = require('../models/user.model');
const Chat = require('../models/chat.model');
const { validationResult } = require('express-validator');


exports.createBid = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (user.userType !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can create bids' });
    }

    const { jobId, amount, deliveryTime, proposal } = req.body;

 
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Cannot bid on a job that is not open' });
    }

   
    const existingBid = await Bid.findOne({
      job: jobId,
      freelancer: req.user._id
    });

    if (existingBid) {
      return res.status(400).json({ message: 'You have already placed a bid for this job' });
    }


    const bid = await Bid.create({
      job: jobId,
      freelancer: req.user._id,
      amount,
      deliveryTime,
      proposal
    });

    let chat = await Chat.findOne({
      participants: { $all: [job.jobPoster, req.user._id] },
      job: jobId
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [job.jobPoster, req.user._id],
        job: jobId,
        messages: []
      });
    }

    res.status(201).json(bid);
  } catch (error) {
    console.error('Create bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getBidsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }


    
    if (job.jobPoster.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view these bids' });
    }


    const bids = await Bid.find({ job: jobId })
      .populate('freelancer', 'fullName email skills')
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (error) {
    console.error('Get bids for job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyBids = async (req, res) => {
  try {
    
    const user = await User.findById(req.user._id);
    if (user.userType !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can access this endpoint' });
    }

    const bids = await Bid.find({ freelancer: req.user._id })
      .populate('job', 'title budget deadline status')
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.acceptBid = async (req, res) => {
  try {
  
    const bid = await Bid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }
    
    const job = await Job.findById(bid.job);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
   
    if (job.jobPoster.toString() !== req.user._id.toString()) {

      return res.status(403).json({ message: 'Not authorized to accept this bid' });
    }
    

    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Cannot accept bid for a job that is not open' });
    }
    
  
    
   
    bid.status = 'accepted';
    await bid.save();
    
   
    await Bid.updateMany(
      { 
        job: job._id, 
        _id: { $ne: bid._id },  
        status: 'pending'      
      },
      { status: 'rejected' }
    );
    
   
    job.status = 'in-progress';
    job.selectedBid = bid._id;
    await job.save();
    
    
    const chat = await Chat.create({
      participants: [job.jobPoster, bid.freelancer],
      job: bid.job,
      messages: []
    });
    
    res.json({
      message: 'Bid accepted successfully',
      bid,
      job,
      chatId: chat._id
    });
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.rejectBid = async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    const job = await Job.findById(bid.job);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

 
    if (job.jobPoster.toString() !== req.user._id.toString()) {

      return res.status(403).json({ message: 'Not authorized to reject this bid' });
    }

 
    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Cannot reject bid for a job that is not open' });
    }


    bid.status = 'rejected';
    await bid.save();

    res.json({ message: 'Bid rejected successfully', bid });
  } catch (error) {
    console.error('Reject bid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};