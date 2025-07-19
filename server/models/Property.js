import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true }
});

export default mongoose.model('Property', propertySchema);
