import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "./models/User.js";
import Request from "./models/Request.js";
import CommunityPost from "./models/CommunityPost.js";
import Session from "./models/Session.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/baylis";

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  return mongoose.connection;
}

export const models = {
  User,
  Request,
  CommunityPost,
  Session
};
