CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) DEFAULT '',
  passwordHash VARCHAR(255) DEFAULT '',
  role ENUM('landlord','resident') NOT NULL DEFAULT 'resident',
  profile JSON DEFAULT (JSON_OBJECT()),
  contact JSON DEFAULT (JSON_OBJECT()),
  prefs JSON DEFAULT (JSON_OBJECT()),
  settings JSON DEFAULT (JSON_OBJECT()),
  stats JSON DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  type ENUM('cleaning','repair','message') NOT NULL,
  name VARCHAR(255),
  address VARCHAR(255),
  issue TEXT,
  cleaning_type VARCHAR(255),
  date VARCHAR(255),
  message TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  status_updated_at TIMESTAMP NULL DEFAULT NULL,
  photos JSON DEFAULT (JSON_ARRAY()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255),
  message TEXT,
  author VARCHAR(255),
  pinned TINYINT(1) DEFAULT 0,
  likes INT DEFAULT 0,
  comments JSON DEFAULT (JSON_ARRAY()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sid VARCHAR(255) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  csrf_digest CHAR(64) NOT NULL,
  ip_address VARCHAR(255) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  INDEX idx_sessions_sid (sid),
  INDEX idx_sessions_user (user_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  delivery VARCHAR(50) DEFAULT 'email',
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_resets_user (user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  metadata JSON DEFAULT (JSON_OBJECT()),
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (read_at)
);
