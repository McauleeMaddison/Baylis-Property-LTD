import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["cleaning", "repair", "message"], required: true },
  name: { type: String, default: "" },
  address: { type: String, default: "" },
  issue: { type: String, default: "" },
  cleaningType: { type: String, default: "" },
  date: { type: String, default: "" },
  status: { type: String, enum: ["open", "in_progress", "done"], default: "open" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Request", requestSchema);
