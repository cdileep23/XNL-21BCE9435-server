// controllers/jobController.js
const Job = require('../models/job.model');
const User = require('../models/user.model');
const Bid=require('../models/bid.model')
const Chat=require('../models/chat.model')
const { validationResult } = require('express-validator');

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private (Job Poster only)
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
  

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
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

// @desc    Get job by ID
// @route   GET /api/jobs/:id 
// @access  Public
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

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Job Poster only)
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
    if (job.jobPoster.toString() !== req.user._id) {
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
    job.deadline = deadline || job.deadline;
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

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Job Poster only)
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check ownership
    if (job.jobPoster.toString() !== req.user._id) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    // Only allow deletion if job is still open and has no bids
    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Cannot delete job that is not open' });
    }

    await job.remove();
    res.json({ message: 'Job removed' });
  } catch (error) {
    console.error('Delete job error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get jobs created by the logged-in job poster
// @route   GET /api/jobs/my-postings
// @access  Private (Job Poster only)
exports.getMyJobs = async (req, res) => {
  try {
    // Check if user is a job poster
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
        // Check if user is a freelancer
        const user = await User.findById(req.user._id);
        if (user.userType !== 'freelancer') {
            return res.status(403).json({ message: 'Only freelancers can access this endpoint' });
        }

        // Get all job IDs where the freelancer has already placed a bid
        const bids = await Bid.find({ freelancer: req.user._id }).distinct("job");

        // Get all open jobs excluding those the freelancer has already bid on
        const jobs = await Job.find({
            status: 'open',
            jobPoster: { $ne: req.user._id },
            _id: { $nin: bids }  // Exclude jobs with bids from the current freelancer
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
      
      // Check if user is a freelancer
      const user = await User.findById(req.user._id);
      if (user.userType !== 'freelancer') {
        return res.status(403).json({ message: 'Only freelancers can apply for jobs' });
      }
      
      const jobId = req.params.id;
      const { amount, deliveryTime, proposal } = req.body;
      
      // Check if job exists and is open
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      if (job.status !== 'open') {
        return res.status(400).json({ message: 'Cannot apply for a job that is not open' });
      }
      
      // Check if freelancer already placed a bid for this job
      const existingBid = await Bid.findOne({
        job: jobId,
        freelancer: req.user._id
      });
      
      if (existingBid) {
        return res.status(400).json({ message: 'You have already applied for this job' });
      }
      
      // Create bid
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
  
  // @desc    Get jobs I've applied for (as a freelancer)
  // @route   GET /api/jobs/my-applications
  // @access  Private (Freelancer only)
  exports.getMyApplications = async (req, res) => {
    try {
      // Check if user is a freelancer
      const user = await User.findById(req.user._id);
      if (user.userType !== 'freelancer') {
        return res.status(403).json({ message: 'Only freelancers can access this endpoint' });
      }
      
      // Get all bids by this freelancer 
      const myBids = await Bid.find({ freelancer: req.user._id });
      
      // Get all job IDs from the bids
      const jobIds = myBids.map(bid => bid.job);
      
      // Find all jobs that the freelancer has applied for
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
      
      // Add bid information to each job
      const jobsWithBidInfo = await Promise.all(appliedJobs.map(async (job) => {
        // Find the current user's bid for this job
        const myBid = await Bid.findOne({
          job: job._id,
          freelancer: req.user._id
        });
        
        // Find all bids for this job
        const allBids = await Bid.find({ job: job._id })
          .populate('freelancer', 'fullName email')
          
        
        // Calculate some statistics
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
          allBids // Including all bids for context
        };
      }));
      
      res.json(jobsWithBidInfo);
    } catch (error) {
      console.error('Get my applications error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  