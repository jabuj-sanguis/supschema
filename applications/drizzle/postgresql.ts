import { dialectDrizzleSchema } from './dialect.js';

export * from './index.js';

declare module './base.js' {
  interface DrizzleDialects {
    postgresql: true;
  }
}

export const drizzleSchema = dialectDrizzleSchema('postgresql');
