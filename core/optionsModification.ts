import Schema, { SchemaOptions } from './Schema.js';

export interface OptionsModification<S extends Schema> {
  originalSchema: S;
  options: Partial<SchemaOptions<S>>;
}
const MODIFICATION_KEY = '$modification';
const META_SOURCE_KEY = '$metaSource';

/**
 * Copies the schema with options and metadata, including symbols and non-enumerable properties.
 * `$` properties are skipped: they are computed values memoized by getters, e.g. `$zod`,
 * or internal references, which are set by the callers.
 */
const cloneSchema = <S extends Schema>(schema: S, exclude: PropertyKey[] = []): S => {
  const descriptors: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(schema);
  for (const key of Reflect.ownKeys(descriptors))
    if ((typeof key === 'string' && key.startsWith('$')) || exclude.includes(key)) delete descriptors[key];
  return Object.create(Object.getPrototypeOf(schema), descriptors) as S;
};

/**
 * Returns a new schema with merged options. Metadata stored with {@link withSchemaMeta}
 * and other non-enumerable properties are preserved.
 */
export const modifyOpts = <S extends Schema>(originalSchema: S, options: Partial<SchemaOptions<S>>): S => {
  // The options differ, so the schema is no metadata copy of the source of the original schema
  const newSchema = Object.assign(cloneSchema(originalSchema), options);
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
 * The copy refers to the schema without metadata, see {@link getMetaSource}.
 */
export const withSchemaMeta = <S extends Schema>(schema: S, key: symbol, value: unknown): S => {
  const newSchema = cloneSchema(schema, [key]);
  Object.defineProperty(newSchema, key, { enumerable: false, value });
  // The options are the same, so the modification is kept
  const modification = Object.getOwnPropertyDescriptor(schema, MODIFICATION_KEY);
  if (modification) Object.defineProperty(newSchema, MODIFICATION_KEY, modification);
  Object.defineProperty(newSchema, META_SOURCE_KEY, { enumerable: false, value: getMetaSource(schema) ?? schema });
  return newSchema;
};

/**
 * Returns the schema a {@link withSchemaMeta} copy was created from, without any metadata.
 * Both have the same options, so applications can treat the copy as this schema, e.g. to refer to it by name.
 */
export const getMetaSource = <S extends Schema>(schema: S): S | undefined =>
  META_SOURCE_KEY in schema ? (schema[META_SOURCE_KEY] as S) : undefined;

/**
 * Returns the schema and the schemas it is created from, following metadata copies ({@link withSchemaMeta})
 * and option modifications ({@link modifyOpts}). Use it to find schemas known by identity, e.g. declared ones.
 */
export const getSchemaOrigins = <S extends Schema>(schema: S): S[] => {
  const origins: S[] = [];
  for (let s: S | undefined = schema; s; s = getMetaSource(s) ?? extractOptionsModification(s)?.originalSchema)
    origins.push(s);
  return origins;
};

/** Returns metadata stored with {@link withSchemaMeta} */
export const getSchemaMeta = <T = unknown>(schema: Schema, key: symbol): T | undefined =>
  (schema as Record<symbol, T | undefined>)[key];
