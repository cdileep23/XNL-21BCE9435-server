// controllers/jobController.js
const Job = require('../models/job.model');
const User = require('../models/user.model');
const Bid=require('../models/bid.model')
const Chat=require('../models/chat.model')
const { validationResult } = require('express-validator');
const Payment=require('../models/payment.model')

exports.createJob = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const user = await User.findById(req.user._id);
      if (user.userType !== 'jobPoster') {
        return res.status(403).json({ message: 'Only job posters can create jobs' });
      }
  
      const { title, description, budget, deadline, skillsRequired } = req.body;
  
      // Deadline logic (Assuming deadline is a number of days)
      if (typeof deadline !== 'number' || deadline < 1 || deadline > 10) {
        return res.status(400).json({
          message: 'Deadline must be a number between 1 and 10 (days from today)'
        });
      }
  
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + deadline);
  
      const job = await Job.create({
        title,
        description,
        budget,
        deadline: deadlineDate,
        skillsRequired,
        jobPoster: req.user._id
      });
  
      res.status(201).json(job);
    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  

exports.getJobs = async (req, res) => {
  try {
    const { keyword, minBudget, maxBudget, skills } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    if (minBudget) {
      filter.budget = { ...filter.budget, $gte: Number(minBudget) };
    }
    
    if (maxBudget) {
      filter.budget = { ...filter.budget, $lte: Number(maxBudget) };
    }
    
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      filter.skillsRequired = { $in: skillsArray };
    }
    
    // Only show open jobs by default
    filter.status = filter.status || 'open';

    const jobs = await Job.find(filter)
      .populate('jobPoster', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('jobPoster', 'fullName email')
      .populate('selectedBid');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Get job by ID error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};


exports.updateJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check ownership
    if (job.jobPoster.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    // Only allow updates if job is still open
    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Cannot update job that is not open' });
    }

    const { title, description, budget, deadline, skillsRequired } = req.body;

    job.title = title || job.title;
    job.description = description || job.description;
    job.budget = budget || job.budget;
    job.deadline = deadline ? new Date(deadline) : job.deadline;  // Convert to Date
    job.skillsRequired = skillsRequired || job.skillsRequired;

    const updatedJob = await job.save();
    res.json(updatedJob);
  } catch (error) {
    console.error('Update job error:', error);

    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.status(500).json({ message: 'Server error' });
  }
};



exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

   
    if (job.jobPoster.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this job' });
    }

 
    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Cannot cancel a job that is not open' });
    }

    job.status = 'canceled';
    await job.save();

    res.json({ message: 'Job has been canceled' });
  } catch (error) {
    console.error('Cancel job error:', error);

    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.status(500).json({ message: 'Server error' });
  }
};


exports.markJobAsCompleted = async (req, res) => {
  try {
    console.log("mark as completed");
    const jobId = req.params.id;
    
    // Find the job by ID
    const job = await Job.findById(jobId);
    console.log("mark as completed");
    console.log(job);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
  
    if (job.jobPoster.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to mark this job as completed' });
    }
    
    if (job.status !== 'in-progress') {
      return res.status(400).json({
        message: 'Only jobs in progress can be marked as completed'
      });
    }
    
   
    if (!job.selectedBid) {
      return res.status(400).json({
        message: 'Cannot complete a job without an accepted bid'
      });
    }
    

    const bid = await Bid.findById(job.selectedBid)
      .populate('freelancer');
    
    if (!bid) {
      return res.status(404).json({ message: 'Selected bid not found' });
    }

    const payment = new Payment({
      job: job._id,
      bid: bid._id,
      amount: bid.amount,
      from: job.jobPoster,
      to: bid.freelancer._id,
      status: 'completed'
    });
    
    await payment.save();
    
  
    const freelancer = await User.findById(bid.freelancer._id);
    freelancer.moneyEarned += bid.amount;
    await freelancer.save();
    

    const jobPoster = await User.findById(job.jobPoster);
    jobPoster.moneySpent += bid.amount;
    await jobPoster.save();

    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();
    
    res.json({
      message: 'Job marked as completed and payment processed',
      job,
      payment
    });
    
  } catch (error) {
    console.error('Mark job as completed error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    
    const user = await User.findById(req.user._id);
    if (user.userType !== 'jobPoster') {
      return res.status(403).json({ message: 'Only job posters can access this endpoint' });
    }

    const jobs = await Job.find({ jobPoster: req.user._id })
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    console.error('Get my jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getAvailableJobs = async (req, res) => {
    try {
      
        const user = await User.findById(req.user._id);
        if (user.userType !== 'freelancer') {
            return res.status(403).json({ message: 'Only freelancers can access this endpoint' });
        }

      
        const bids = await Bid.find({ freelancer: req.user._id }).distinct("job");

        const jobs = await Job.find({
            status: 'open',
            jobPoster: { $ne: req.user._id },
            _id: { $nin: bids } 
        })
        .populate('jobPoster', 'fullName email')
        .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (error) {
        console.error('Get available jobs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.applyForJob = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.user._id);
      if (user.userType !== 'freelancer') {
        return res.status(403).json({ message: 'Only freelancers can apply for jobs' });
      }
      
      const jobId = req.params.id;
      const { amount, deliveryTime, proposal } = req.body;
      
    
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      if (job.status !== 'open') {
        return res.status(400).json({ message: 'Cannot apply for a job that is not open' });
      }
      
      const existingBid = await Bid.findOne({
        job: jobId,
        freelancer: req.user._id
      });
      
      if (existingBid) {
        return res.status(400).json({ message: 'You have already applied for this job' });
      }
      
  
      const bid = await Bid.create({
        job: jobId,
        freelancer: req.user._id,
        amount,
        deliveryTime,
        proposal
      });
      
      res.status(201).json({
        message: 'Application submitted successfully',
        bid
      });
    } catch (error) {
      console.error('Apply for job error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  

  exports.getMyApplications = async (req, res) => {
    try {
   
      const user = await User.findById(req.user._id);
      if (user.userType !== 'freelancer') {
        return res.status(403).json({ message: 'Only freelancers can access this endpoint' });
      }
      
   
      const myBids = await Bid.find({ freelancer: req.user._id });

      const jobIds = myBids.map(bid => bid.job);
      
   
      const appliedJobs = await Job.find({
        _id: { $in: jobIds }
      })
        .populate('jobPoster', 'fullName email')
        .populate({
          path: 'selectedBid',
          populate: {
            path: 'freelancer',
            select: 'fullName email'
          }
        })
        .sort({ createdAt: -1 });
      
      const jobsWithBidInfo = await Promise.all(appliedJobs.map(async (job) => {
    
        const myBid = await Bid.findOne({
          job: job._id,
          freelancer: req.user._id
        });
        
       
        const allBids = await Bid.find({ job: job._id })
          .populate('freelancer', 'fullName email')
          
        
    
        const bidStats = {
          count: allBids.length,
          avgAmount: allBids.reduce((sum, bid) => sum + bid.amount, 0) / allBids.length || 0,
          avgDeliveryTime: allBids.reduce((sum, bid) => sum + bid.deliveryTime, 0) / allBids.length || 0
        };
        
        return {
          ...job.toJSON(),
          myBid: {
            _id: myBid._id,
            amount: myBid.amount,
            deliveryTime: myBid.deliveryTime,
            proposal: myBid.proposal,
            status: myBid.status,
            submittedAt: myBid.createdAt
          },
          bidStats,
          allBids 
        };
      }));
      
      res.json(jobsWithBidInfo);
    } catch (error) {
      console.error('Get my applications error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  