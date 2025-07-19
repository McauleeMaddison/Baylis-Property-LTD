import mongoose from 'mongoose';
import User from './models/User.js';
import Repair from './models/Repair.js';
import Cleaning from './models/Cleaning.js';
import Message from './models/Message.js';

export const mongo = {
  User,
  Repair,
  Cleaning,
  Message,
  mongoose
};
