const express = require("express");
const { userAuth } = require("../middleware/auth");
const { 
  createJob, 
  getJobs, 
  getJobById, 
  updateJob, 
  deleteJob, 
  getMyJobs, 
  getAvailableJobs,
  applyForJob,
  getMyApplications
} = require("../controllers/job.controller");
const { check } = require('express-validator');

const router = express.Router();

// Create a new job
router.post(
    '/job/create',
    [
      userAuth,
      [
        check('title', 'Title is required').not().isEmpty(),
        check('description', 'Description is required').not().isEmpty(),
        check('budget', 'Budget is required and must be a number').isNumeric(),
        check('deadline', 'Deadline must be a number between 1 and 10').isInt({ min: 1, max: 10 }),
        check('skillsRequired', 'Skills required must be an array').isArray()
      ]
    ],
    createJob
  );
  

// Get all jobs (with optional filters)
router.get('/job/all', userAuth, getJobs);

// Get jobs that a freelancer can apply for
router.get('/jobs/open/apply', userAuth, getAvailableJobs);

// Get jobs created by the logged-in job poster
router.get('/job/posted/me', userAuth, getMyJobs);

// Get jobs I've applied for (as a freelancer)
router.get('/job/applications/me', userAuth, getMyApplications);

// Get job by ID
router.get('/job/:id', userAuth, getJobById);

// Update job
router.patch(
  '/job/update/:id', 
  [
    userAuth,
    [
      check('title', 'Title is required').optional(),
      check('description', 'Description is required').optional(),
      check('budget', 'Budget must be a number').optional().isNumeric(),
      check('deadline', 'Deadline must be a valid date').optional(),
      check('skillsRequired', 'Skills required must be an array').optional().isArray()
    ]
  ],
  updateJob
);

// Delete job
router.delete('/job/:id', userAuth, deleteJob);

// Apply for a job (create a bid)
router.post(
  '/job/:id/apply',
  [
    userAuth,
    [
      check('amount', 'Bid amount is required and must be a number').isNumeric(),
      check('deliveryTime', 'Delivery time is required and must be a number of days').isNumeric(),
      check('proposal', 'Proposal is required').not().isEmpty()
    ]
  ],
  applyForJob
);

module.exports = router;