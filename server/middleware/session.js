import session from 'express-session';

// Using default MemoryStore for sessions (suitable for development).
// For production you should replace with a persistent store (Redis, MySQL-backed, etc.).
export default session({
  secret: 'baylis_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
});
