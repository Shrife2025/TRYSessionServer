import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const db = async () => {
  const dbUrl = process.env.DATABASELINK;
  try {
    await mongoose.connect(dbUrl);
    console.log("Database connected successfully");
  } catch (error) {
    console.error(`Database connection failed: ${error}`);
  }
};

export default db;
