import mongoose from 'mongoose';

const repairSchema = new mongoose.Schema({
  name: String,
  address: String,
  issue: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

export default mongoose.model('Repair', repairSchema);
