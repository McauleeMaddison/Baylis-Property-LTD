import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  author: { type: String, default: "User" },
  message: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const communityPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, default: "" },
  message: { type: String, required: true },
  author: { type: String, default: "User" },
  pinned: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  comments: { type: [commentSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("CommunityPost", communityPostSchema);
