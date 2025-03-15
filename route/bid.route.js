// routes/bidRoutes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const bidController = require('../controllers/bid.controller');
const { userAuth } = require("../middleware/auth");

// @route   POST /api/bids
// @desc    Create a new bid
// @access  Private (Freelancer only)
router.post(
  '/',
  [
    userAuth,
    [
      check('jobId', 'Job ID is required').not().isEmpty(),
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('deliveryTime', 'Delivery time is required and must be a number').isNumeric(),
      check('proposal', 'Proposal is required').not().isEmpty()
    ]
  ],
  bidController.createBid
);

// @route   GET /api/bids/job/:jobId
// @desc    Get bids for a job
// @access  Private (Job Poster only)
router.get('/job/:jobId/bids', userAuth, bidController.getBidsForJob);

// @route   GET /api/bids/my-bids
// @desc    Get my bids (freelancer)
// @access  Private (Freelancer only)
router.get('/my-bids', userAuth, bidController.getMyBids);

// @route   PUT /api/bids/:id/accept
// @desc    Accept a bid
// @access  Private (Job Poster only)
router.patch('/bids/:id/accept', userAuth, bidController.acceptBid);

// @route   PUT /api/bids/:id/reject
// @desc    Reject a bid
// @access  Private (Job Poster only)
router.patch('/bids/:id/reject', userAuth, bidController.rejectBid);

module.exports = router;