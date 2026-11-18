import { getSchemaMeta, withSchemaMeta } from '@supschema/core';
import { S } from '@supschema/common-types';
import { z } from 'zod';

/** Type-only key of the zod schema set by `$zodWith`, see {@link ZodSchemaMarker} */
export declare const ZOD_SCHEMA: unique symbol;
/**
 * Type-only marker of the zod schema set by `$zodWith`. It is added as an intersection, so methods returning `this`
 * keep the modified type. When it is added several times, the last one, i.e. the latest modifier, is inferred.
 */
export interface ZodSchemaMarker<Z extends z.ZodType> {
  readonly [ZOD_SCHEMA]?: () => Z;
}
export type ResolveZod<Self, T> = Self extends { readonly [ZOD_SCHEMA]?: () => infer Z extends z.ZodType } ? Z : T;

export interface ZodExtension<T extends z.ZodType | undefined = z.ZodType | undefined> {
  /** zod schema, including changes of `$zodWith` */
  $zod: ResolveZod<this, T>;
}
export interface ZodExtended<T extends z.ZodType = z.ZodType> extends ZodExtension<T> {}

/** zod schema type of a schema, including changes of `$zodWith` */
export type ZodOf<T> = T extends ZodExtended ? Extract<T['$zod'], z.ZodType> : never;

/** Schema with the zod schema replaced by the result of a `$zodWith` modifier */
export type WithZod<T, Z extends z.ZodType> = T & ZodSchemaMarker<Z>;

/**
 * Key of the zod schema modifier set by `$zodWith`. It is stored as schema metadata instead of an option,
 * so it is not serialized and is preserved by other schema modifications.
 */
export const ZOD_MODIFIER = Symbol('supschema.zod.modifier');
type ZodModifier = (schema: z.ZodType) => z.ZodType;

declare module '@supschema/common-types/DataValue.js' {
  interface DataValue {
    /**
     * Returns a schema with the zod schema modified, e.g. `S.String().$zodWith((z) => z.trim())`.
     * The modifier receives the complete zod schema, including metadata, and is applied by containing schemas too.
     */
    $zodWith<T extends ZodExtended, Z extends z.ZodType>(this: T, modify: (zodSchema: ZodOf<T>) => Z): WithZod<T, Z>;
  }
}

/** Applies title, description and the `$zodWith` modifier. Must be used by every `$zod` getter. */
export const applyDataValueMeta = <T extends z.ZodType>(schema: S.DataValue, zodSchema: T): T => {
  const withMeta =
    schema.title || schema.description || schema.deprecated
      ? zodSchema.meta({ title: schema.title, description: schema.description, deprecated: schema.deprecated })
      : zodSchema;
  const modify = getSchemaMeta<ZodModifier>(schema, ZOD_MODIFIER);
  return (modify ? modify(withMeta) : withMeta) as T;
};

/** Implementation of `$zodWith`, registered on `S.DataValue` */
export const zodWith = (schema: S.DataValue, modify: ZodModifier) => {
  const previous = getSchemaMeta<ZodModifier>(schema, ZOD_MODIFIER);
  return withSchemaMeta(schema, ZOD_MODIFIER, previous ? (z: z.ZodType) => modify(previous(z)) : modify);
};

/** Handling of object keys, which are not declared in the schema */
export type UnknownKeys = 'strict' | 'strip' | 'passthrough';
/**
 * Default handling of unknown object keys. Set by importing `@supschema/zod/strip`,
 * which sets the runtime default as well.
 */
export interface ZodConfig {}
export type ConfiguredUnknownKeys = ZodConfig extends { unknownKeys: infer U extends UnknownKeys } ? U : 'strict';

let defaultUnknownKeys: UnknownKeys | undefined;
/** Sets the runtime default of unknown object keys, used by entry points like `@supschema/zod/strip` */
export const setDefaultUnknownKeys = (unknownKeys: UnknownKeys) => {
  if (defaultUnknownKeys && defaultUnknownKeys !== unknownKeys)
    throw new Error(`Default of unknown object keys is already set to ${defaultUnknownKeys}`);
  defaultUnknownKeys = unknownKeys;
};
export const getDefaultUnknownKeys = (): UnknownKeys => defaultUnknownKeys ?? 'strict';
