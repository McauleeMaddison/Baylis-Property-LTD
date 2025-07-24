// server.js
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
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baylis';

// Mongoose setup
mongoose.set('strictQuery', false);

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'https://mcauleemaddison.github.io', // Production
    'http://localhost:5500'              // Development
  ],
  credentials: true
}));
app.use(helmet());

// Custom session middleware
if (typeof session === 'function') {
  app.use(session);
} else {
  console.warn('⚠️ Session middleware not loaded correctly');
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

// Property route
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    console.error('❌ Failed to fetch properties:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
// server.js
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
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baylis';

// Mongoose setup
mongoose.set('strictQuery', false);

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'https://mcauleemaddison.github.io', // Production
    'http://localhost:5500'              // Development
  ],
  credentials: true
}));
app.use(helmet());

// Custom session middleware
if (typeof session === 'function') {
  app.use(session);
} else {
  console.warn('⚠️ Session middleware not loaded correctly');
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

// Property route
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    console.error('❌ Failed to fetch properties:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
