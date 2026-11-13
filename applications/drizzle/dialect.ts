import { drizzleSchema as createDrizzleSchema, DrizzleDialect, DrizzleSchema, registerDialect, RootSchemas } from './base.js';

/** Registers the dialect and returns `drizzleSchema` bound to it, used by entry points like `@supschema/drizzle/postgresql` */
export const dialectDrizzleSchema = <D extends DrizzleDialect>(dialect: D) => {
  registerDialect(dialect);
  /** Creates drizzle tables, relations, enums and database schemas from supschema models */
  return <T extends Record<string, RootSchemas>>(schemas: T): DrizzleSchema<D, T> =>
    createDrizzleSchema(dialect, schemas);
};
