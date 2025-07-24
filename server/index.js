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

// Mongo URI Fallback
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baylis';

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'https://mcauleemaddison.github.io', // ✅ GitHub Pages (prod)
    'http://localhost:5500'              // ✅ Dev
  ],
  credentials: true
}));
app.use(helmet());

// Mongoose settings
mongoose.set('strictQuery', false);

// MongoDB Connection
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// Session Middleware
if (typeof session === 'function') {
  app.use(session);
} else {
  console.warn('⚠️ Session middleware not loaded properly');
}

// Routes
app.get('/', (req, res) => {
  res.send('✅ Baylis Property LTD Backend running');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api', authRoutes);
app.use('/api', formRoutes);

// Properties Route
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    console.error('❌ Property fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

Fetch properties data (this part is usually in the client-side code)
fetch('http://localhost:5000/api/properties')
.then(response => response.json())
.then(data => {
console.log(data);
})
.catch(error => console.error('Error:', error));
