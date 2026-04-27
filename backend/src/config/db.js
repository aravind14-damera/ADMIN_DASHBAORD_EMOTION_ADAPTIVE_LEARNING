import mongoose from "mongoose";
import env from "./env.js";

const connectDB = async () => {
  try {
    if (!env.mongodbUri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    const connectionOptions = {};
    if (env.mongoDbName) {
      connectionOptions.dbName = env.mongoDbName;
    }

    await mongoose.connect(env.mongodbUri, connectionOptions);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
