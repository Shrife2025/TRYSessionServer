import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
    },
    displayName: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
    },
    photos: {
      type: String,
    },
    role: {
      type: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", schema);

export default User;
