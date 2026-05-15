export const DEFAULT_PROPERTIES = Object.freeze([
  { id: 'crownfield-1-3', label: '1 & 3 Crownfield Road, Ashford, Kent' },
  { id: 'christchurch-4-74', label: '4 & 74 Christchurch Road, Ashford, Kent' },
  { id: 'christchurch-9', label: '9 Christchurch Road, Ashford, Kent' },
  { id: 'cross-stile-21', label: '21 Cross Stile, Ashford, Kent' },
  { id: 'beaver-32', label: '32 Beaver Road (including adjoining land), Ashford, Kent' },
  { id: 'bond-40', label: '40 Bond Road, Ashford, Kent' },
  { id: 'francis-59', label: '59 Francis Road, Ashford, Kent' },
  { id: 'cottage-28-the-street', label: 'The Cottage, 28 The Street, Kennington, Ashford, Kent' },
]);

const propertyById = new Map(DEFAULT_PROPERTIES.map((property) => [property.id, property]));

export function listProperties() {
  return DEFAULT_PROPERTIES.map((property) => ({ ...property }));
}

export function findPropertyById(id) {
  if (!id) return null;
  return propertyById.get(String(id).trim()) || null;
}

export function findPropertyByAddress(address) {
  const normalized = String(address || '').trim().toLowerCase();
  if (!normalized) return null;
  return DEFAULT_PROPERTIES.find((property) => property.label.toLowerCase() === normalized) || null;
}
