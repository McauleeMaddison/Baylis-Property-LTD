CREATE TABLE IF NOT EXISTS audit_logs (
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
);
