import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  displayName: { type: String, default: "" },
  unit: { type: String, default: "" },
  bio: { type: String, default: "" },
  avatarUrl: { type: String, default: "" }
}, { _id: false });

const contactSchema = new mongoose.Schema({
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  preferred: { type: String, default: "email" }
}, { _id: false });

const prefsSchema = new mongoose.Schema({
  emailUpdates: { type: Boolean, default: true },
  communityVisible: { type: Boolean, default: true }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  general: { type: mongoose.Schema.Types.Mixed, default: {} },
  appearance: { type: mongoose.Schema.Types.Mixed, default: {} },
  notify: { type: mongoose.Schema.Types.Mixed, default: {} },
  security: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const statsSchema = new mongoose.Schema({
  requests: { type: Number, default: 0 },
  posts: { type: Number, default: 0 }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, default: "", trim: true },
  role: { type: String, enum: ["resident", "landlord"], default: "resident" },
  passwordHash: { type: String, required: true },
  profile: { type: profileSchema, default: () => ({}) },
  contact: { type: contactSchema, default: () => ({}) },
  prefs: { type: prefsSchema, default: () => ({}) },
  settings: { type: settingsSchema, default: () => ({}) },
  stats: { type: statsSchema, default: () => ({}) }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
