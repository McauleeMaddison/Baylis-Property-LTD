import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import Property from './models/Property.js';
import session from './middleware/session.js';
import authRoutes from './auth.js';
import formRoutes from './forms.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(session);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Auth routes
app.use('/api', authRoutes);

// Form routes
app.use('/api', formRoutes);

// Sample API route
// Get all properties from MongoDB
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Fetch properties data (this part is usually in the client-side code)
// fetch('http://localhost:5000/api/properties')
//   .then(response => response.json())
//   .then(data => {
//     console.log(data); // Use this data in your UI
//   })
//   .catch(error => console.error('Error:', error));
