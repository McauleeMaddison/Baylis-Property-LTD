import session from 'express-session';
import dotenv from 'dotenv';

dotenv.config();
const secret = process.env.SESSION_SECRET || 'change-me';

export default session({
  secret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
});
