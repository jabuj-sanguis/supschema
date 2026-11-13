import Schema, { SchemaOptions } from './Schema.js';

export interface OptionsModification<S extends Schema> {
  originalSchema: S;
  options: Partial<SchemaOptions<S>>;
}
const MODIFICATION_KEY = '$modification';

/** Copies the schema with all own properties, including symbols and non-enumerable ones */
const cloneSchema = <S extends Schema>(schema: S, exclude?: PropertyKey): S => {
  const descriptors: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(schema);
  if (exclude !== undefined) delete descriptors[exclude];
  return Object.create(Object.getPrototypeOf(schema), descriptors) as S;
};

/**
 * Returns a new schema with merged options. Metadata stored with {@link withSchemaMeta}
 * and other non-enumerable properties are preserved.
 */
export const modifyOpts = <S extends Schema>(originalSchema: S, options: Partial<SchemaOptions<S>>): S => {
  const newSchema = Object.assign(cloneSchema(originalSchema, MODIFICATION_KEY), options);
  Object.defineProperty(newSchema, MODIFICATION_KEY, {
    enumerable: false,
    value: {
      originalSchema,
      options,
    },
  });
  return newSchema;
};
export const extractOptionsModification = <S extends Schema>(schema: S) =>
  MODIFICATION_KEY in schema ? (schema[MODIFICATION_KEY] as OptionsModification<S>) : undefined;

/**
 * Returns a copy of the schema with a non-enumerable metadata property, which is not an option of the schema.
 * Use it for application specific data that must not be serialized, e.g. functions. The metadata is preserved
 * by {@link modifyOpts} and further `withSchemaMeta` calls, the modification of the schema stays the same.
 */
export const withSchemaMeta = <S extends Schema>(schema: S, key: symbol, value: unknown): S => {
  const newSchema = cloneSchema(schema, key);
  Object.defineProperty(newSchema, key, { enumerable: false, value });
  return newSchema;
};

/** Returns metadata stored with {@link withSchemaMeta} */
export const getSchemaMeta = <T = unknown>(schema: Schema, key: symbol): T | undefined =>
  (schema as Record<symbol, T | undefined>)[key];
