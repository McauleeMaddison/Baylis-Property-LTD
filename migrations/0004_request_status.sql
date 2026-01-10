ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'open' AFTER message,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP NULL DEFAULT NULL AFTER status;

UPDATE requests SET status = 'open' WHERE status IS NULL OR status = '';
