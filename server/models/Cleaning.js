import mongoose from 'mongoose';

const cleaningSchema = new mongoose.Schema({
  name: String,
  address: String,
  date: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

export default mongoose.model('Cleaning', cleaningSchema);
