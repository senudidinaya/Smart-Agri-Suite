const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/agrisuite";
  try {
    await mongoose.connect(uri);
    console.log("MongoDB Connected to:", uri);
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    // process.exit(1);
  }
};

module.exports = connectDB;
