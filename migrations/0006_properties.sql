CREATE TABLE IF NOT EXISTS properties (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO properties (id, label) VALUES
  ('crownfield-1-3', '1 & 3 Crownfield Road, Ashford, Kent'),
  ('christchurch-4-74', '4 & 74 Christchurch Road, Ashford, Kent'),
  ('christchurch-9', '9 Christchurch Road, Ashford, Kent'),
  ('cross-stile-21', '21 Cross Stile, Ashford, Kent'),
  ('beaver-32', '32 Beaver Road (including adjoining land), Ashford, Kent'),
  ('bond-40', '40 Bond Road, Ashford, Kent'),
  ('francis-59', '59 Francis Road, Ashford, Kent'),
  ('cottage-28-the-street', 'The Cottage, 28 The Street, Kennington, Ashford, Kent')
ON DUPLICATE KEY UPDATE label = VALUES(label);

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS property_id VARCHAR(64) NULL AFTER address;

UPDATE requests r
JOIN properties p ON LOWER(TRIM(r.address)) = LOWER(TRIM(p.label))
SET r.property_id = p.id
WHERE r.address IS NOT NULL
  AND TRIM(r.address) <> ''
  AND (r.property_id IS NULL OR TRIM(r.property_id) = '');
