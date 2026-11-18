import { dialectDrizzleSchema } from './dialect.js';

export * from './index.js';

declare module './base.js' {
  interface DrizzleDialects {
    mysql: true;
  }
}

export const drizzleSchema = dialectDrizzleSchema('mysql');
