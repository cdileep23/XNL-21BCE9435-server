const socket = require("socket.io");
const User = require("./models/user.model");
const Job = require("./models/job.model");
const Bid = require("./models/bid.model");
const Chat = require("./models/chat.model");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: { origin: "http://localhost:5173" },
  });

  io.on("connection", (socket) => {
    // Join a specific job chat room
    socket.on("joinJobChat", async ({ userId, jobId }) => {
      try {
        // Verify the user has access to this job chat
        const job = await Job.findById(jobId);
        if (!job) {
          socket.emit("error", { message: "Job not found" });
          return;
        }

        // Get the accepted bid for this job
        const selectedBid = await Bid.findOne({ 
          job: jobId, 
          status: 'accepted' 
        });
        
        if (!selectedBid) {
          socket.emit("error", { message: "No accepted bid found for this job" });
          return;
        }

        // Check if user is either job poster or the accepted freelancer
        const isJobPoster = job.jobPoster.toString() === userId;
        const isFreelancer = selectedBid.freelancer.toString() === userId;

        if (!isJobPoster && !isFreelancer) {
          socket.emit("error", { message: "Not authorized to access this chat" });
          return;
        }

        // Find or create the chat for this job
        let chat = await Chat.findOne({ job: jobId });
        
        // If no chat exists yet, we shouldn't create one here
        // Chats should only be created when a bid is accepted
        if (!chat) {
          socket.emit("error", { message: "Chat not found for this job" });
          return;
        }

        // Join the room
        const room = `job_${jobId}`;
        socket.join(room);
        
        const user = await User.findById(userId).select("fullName");
        console.log(`${user.fullName} joined job chat room ${room}`);
        
        // Get recent messages
        const recentMessages = chat.messages.slice(-50); // Get last 50 messages
        socket.emit("previousMessages", recentMessages);
      } catch (error) {
        console.error("Error joining job chat:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Send a message in a job chat
    socket.on("sendJobMessage", async ({ userId, jobId, content }) => {
      try {
        // Verify the job exists
        const job = await Job.findById(jobId);
        if (!job) {
          socket.emit("error", { message: "Job not found" });
          return;
        }

        // Get the accepted bid for this job
        const acceptedBid = await Bid.findOne({ 
          job: jobId, 
          status: 'accepted' 
        });
        
        if (!acceptedBid) {
          socket.emit("error", { message: "No accepted bid found for this job" });
          return;
        }

        // Check if user is either job poster or the accepted freelancer
        const isJobPoster = job.jobPoster.toString() === userId;
        const isFreelancer = acceptedBid.freelancer.toString() === userId;

        if (!isJobPoster && !isFreelancer) {
          socket.emit("error", { message: "Not authorized to send messages in this chat" });
          return;
        }

        // Find the chat for this job
        let chat = await Chat.findOne({ job: jobId });
        
        if (!chat) {
          socket.emit("error", { message: "Chat not found for this job" });
          return;
        }

        // Get user details for the message
        const user = await User.findById(userId).select("fullName profileImage");

        // Create new message
        const newMessage = {
          sender: userId,
          content,
          timestamp: new Date(),
          read: false
        };

        // Add message to chat
        chat.messages.push(newMessage);
        chat.lastActivity = new Date();
        await chat.save();

        // Prepare the message with sender details for front-end
        const messageWithDetails = {
          ...newMessage,
          sender: {
            _id: userId,
            fullName: user.fullName,
            profileImage: user.profileImage || ''
          }
        };

        // Broadcast to everyone in the room
        io.to(`job_${jobId}`).emit("newJobMessage", messageWithDetails);
      } catch (error) {
        console.error("Error sending job message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Mark messages as read
    socket.on("markMessagesRead", async ({ userId, jobId }) => {
      try {
        // Find the chat for this job
        const chat = await Chat.findOne({ job: jobId });
        
        if (!chat) return;

        let updated = false;
        
        // Mark unread messages from other users as read
        chat.messages.forEach(msg => {
          if (!msg.read && msg.sender.toString() !== userId) {
            msg.read = true;
            updated = true;
          }
        });

        if (updated) {
          await chat.save();
          // Notify room that messages were read
          socket.to(`job_${jobId}`).emit("messagesRead", { jobId, readBy: userId });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  return io;
};

// Function to create a chat when a bid is accepted
const createJobChat = async (jobId, jobPosterId, freelancerId) => {
  try {
    // Check if chat already exists for this job
    let existingChat = await Chat.findOne({ job: jobId });
    
    if (existingChat) {
      return existingChat; // Chat already exists
    }

    // Create a new chat
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Get user details for congratulation message
    const jobPoster = await User.findById(jobPosterId).select("fullName");
    
    // Create new chat with initial congratulations message
    const newChat = new Chat({
      participants: [jobPosterId, freelancerId],
      job: jobId,
      messages: [{
        sender: jobPosterId,
        content: `Congratulations! Your bid for "${job.title}" has been accepted.`,
        timestamp: new Date(),
        read: false
      }],
      lastActivity: new Date()
    });

    await newChat.save();
    
    return newChat;
  } catch (error) {
    console.error('Error creating job chat:', error);
    throw error;
  }
};

module.exports = { initializeSocket, createJobChat };