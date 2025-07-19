import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  name: String,
  email: String,
  body: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

export default mongoose.model('Message', messageSchema);
