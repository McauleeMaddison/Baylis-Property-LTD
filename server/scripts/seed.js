import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedProperties = async () => {
  await Property.deleteMany();
  await Property.create([
    { name: 'Property One', location: 'London' },
    { name: 'Property Two', location: 'Manchester' },
    { name: 'Property Three', location: 'Liverpool' }
  ]);
  console.log('Database seeded!');
  mongoose.disconnect();
};

seedProperties();
