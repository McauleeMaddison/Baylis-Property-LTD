ALTER TABLE requests
  ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'open' AFTER message,
  ADD COLUMN status_updated_at TIMESTAMP NULL DEFAULT NULL AFTER status;

UPDATE requests SET status = 'open' WHERE status IS NULL OR status = '';
