import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';

export default session({
  secret: 'baylis_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: mongoose.connection._connectionString || process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
});
