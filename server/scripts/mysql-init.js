import { db } from '../mysql.js';

await db.query(`CREATE TABLE IF NOT EXISTS users (
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
)`);

await db.query(`CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  type ENUM('cleaning','repair','message') NOT NULL,
  name VARCHAR(255),
  address VARCHAR(255),
  property_id VARCHAR(64) DEFAULT NULL,
  issue TEXT,
  cleaning_type VARCHAR(255),
  date VARCHAR(255),
  message TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  status_updated_at TIMESTAMP NULL DEFAULT NULL,
  photos JSON DEFAULT (JSON_ARRAY()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

await db.query(`CREATE TABLE IF NOT EXISTS properties (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

await db.query(`INSERT INTO properties (id, label) VALUES
  ('crownfield-1-3', '1 & 3 Crownfield Road, Ashford, Kent'),
  ('christchurch-4-74', '4 & 74 Christchurch Road, Ashford, Kent'),
  ('christchurch-9', '9 Christchurch Road, Ashford, Kent'),
  ('cross-stile-21', '21 Cross Stile, Ashford, Kent'),
  ('beaver-32', '32 Beaver Road (including adjoining land), Ashford, Kent'),
  ('bond-40', '40 Bond Road, Ashford, Kent'),
  ('francis-59', '59 Francis Road, Ashford, Kent'),
  ('cottage-28-the-street', 'The Cottage, 28 The Street, Kennington, Ashford, Kent')
ON DUPLICATE KEY UPDATE label = VALUES(label)`);

await db.query(`CREATE TABLE IF NOT EXISTS community_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255),
  message TEXT,
  author VARCHAR(255),
  pinned TINYINT(1) DEFAULT 0,
  likes INT DEFAULT 0,
  comments JSON DEFAULT (JSON_ARRAY()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

await db.query(`CREATE TABLE IF NOT EXISTS sessions (
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
)`);

await db.query(`CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  delivery VARCHAR(50) DEFAULT 'email',
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_resets_user (user_id)
)`);

await db.query(`CREATE TABLE IF NOT EXISTS notifications (
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
)`);

await db.query(`CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  event VARCHAR(100) NOT NULL,
  severity ENUM('info','warn','error') DEFAULT 'info',
  ip_address VARCHAR(255) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  metadata JSON DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_event (event)
)`);

console.log('MySQL tables created/verified.');
process.exit();
