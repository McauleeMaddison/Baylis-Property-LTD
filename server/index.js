import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import Property from './models/Property.js';
import session from './middleware/session.js';
import authRoutes from './auth.js';
import formRoutes from './forms.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'https://mcauleemaddison.github.io', // ✅ Removed trailing slash
  credentials: true
}));
app.use(helmet());

// Optional: fix mongoose deprecation warning
mongoose.set('strictQuery', false);

// Safe session init (if needed)
try {
  app.use(session);
} catch (err) {
  console.warn('⚠️ Session middleware failed to load:', err.message);
}

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baylis';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.send('✅ Backend is running');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongo: mongoose.connection.readyState });
});

app.use('/api', authRoutes);
app.use('/api', formRoutes);

// Property Route
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: '❌ Failed to fetch properties' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Fetch properties data (this part is usually in the client-side code)
// fetch('http://localhost:5000/api/properties')
//   .then(response => response.json())
//   .then(data => {
//     console.log(data); // Use this data in your UI
//   })
//   .catch(error => console.error('Error:', error));
