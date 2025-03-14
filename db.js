const mongoose = require("mongoose");



const connectDB = async () => {
  try {
   
  
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    throw err;
  }
};

module.exports = connectDB;