// controllers/chatController.js
const Chat = require('../models/chat.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: { $in: [req.user._id] }
    })
      .populate('participants', 'fullName email profileImage')
      .populate('job', 'title')
      .sort({ lastActivity: -1 });

    // Format the chats for the frontend
    const formattedChats = chats.map(chat => {
      // Get the other participant
      const otherParticipants = chat.participants.filter(
        participant => participant._id.toString() !== req.user._id
      );

      return {
        _id: chat._id,
        otherParticipants,
        job: chat.job,
        lastMessage: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null,
        unreadCount: chat.messages.filter(
          msg => !msg.read && msg.sender.toString() !== req.user._id
        ).length,
        lastActivity: chat.lastActivity
      };
    });

    res.json(formattedChats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get chat by ID with messages
// @route   GET /api/chats/:id
// @access  Private
exports.getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'fullName email profileImage')
      .populate('job', 'title');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    if (!chat.participants.some(p => p._id.toString() === req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

    // Mark all unread messages as read
    chat.messages.forEach(msg => {
      if (msg.sender.toString() !== req.user._id && !msg.read) {
        msg.read = true;
      }
    });
    await chat.save();

    res.json(chat);
  } catch (error) {
    console.error('Get chat by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/chats/:id/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    if (!chat.participants.some(p => p.toString() === req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }

    // Add message
    const newMessage = {
      sender: req.user.userId,
      content,
      timestamp: Date.now(),
      read: false
    };

    chat.messages.push(newMessage);
    chat.lastActivity = Date.now();
    
    await chat.save();

    // Return the newly added message
    const addedMessage = chat.messages[chat.messages.length - 1];

    res.status(201).json(addedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};