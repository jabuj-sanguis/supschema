import { dialectDrizzleSchema } from './dialect.js';

export * from './index.js';

declare module './base.js' {
  interface DrizzleDialects {
    sqlite: true;
  }
}

export const drizzleSchema = dialectDrizzleSchema('sqlite');
