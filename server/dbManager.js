// Compatibility shim — projects should import from `./models/sqlModels.js`.
import { models } from './models/sqlModels.js';
export { models };
export async function connectMongo() { return null; }
