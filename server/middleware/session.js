import session from 'express-session';

export default session({
  secret: 'baylis_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
});
