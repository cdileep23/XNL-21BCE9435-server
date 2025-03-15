// routes/bidRoutes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const bidController = require('../controllers/bid.controller');
const { userAuth } = require("../middleware/auth");


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

router.get('/job/:jobId/bids', userAuth, bidController.getBidsForJob);

router.get('/my-bids', userAuth, bidController.getMyBids);

router.patch('/bids/:id/accept', userAuth, bidController.acceptBid);

router.patch('/bids/:id/reject', userAuth, bidController.rejectBid);

module.exports = router;