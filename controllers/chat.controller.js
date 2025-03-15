
const Chat = require('../models/chat.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');


exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: { $in: [req.user._id] }
    })
      .populate('participants', 'fullName email profileImage')
      .populate('job', 'title')
      .sort({ lastActivity: -1 });

  
    const formattedChats = chats.map(chat => {
   
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


exports.getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'fullName email profileImage')
      .populate('job', 'title');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }


    if (!chat.participants.some(p => p._id.toString() === req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

  
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

   
    if (!chat.participants.some(p => p.toString() === req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }

    const newMessage = {
      sender: req.user.userId,
      content,
      timestamp: Date.now(),
      read: false
    };

    chat.messages.push(newMessage);
    chat.lastActivity = Date.now();
    
    await chat.save();

    
    const addedMessage = chat.messages[chat.messages.length - 1];

    res.status(201).json(addedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};