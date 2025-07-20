import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from './models/User.js';
import Repair from './models/Repair.js';
import Cleaning from './models/Cleaning.js';
import Message from './models/Message.js';


mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

export const mongo = {
  User,
  Repair,
  Cleaning,
  Message,
  mongoose
};
