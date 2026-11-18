import { modifyOpts } from '@supschema/core';
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

/** Modifier of the zod schema, set by `$zodWith` */
export type ZodModifier = (schema: z.ZodType) => z.ZodType;

declare module '@supschema/common-types/DataValue.js' {
  interface DataValue {
    /**
     * Modifiers of the zod schema, applied in order. Set through `$zodWith` only.
     */
    zodWith?: ZodModifier[];
    /**
     * Returns a schema with the zod schema modified, e.g. `S.String().$zodWith((z) => z.trim())`.
     * The modifier receives the complete zod schema, including metadata, and is applied by containing schemas too.
     * It is stored as an option, so the schema can't be written as source by `self-source`.
     */
    $zodWith<T extends ZodExtended, Z extends z.ZodType>(this: T, modify: (zodSchema: ZodOf<T>) => Z): WithZod<T, Z>;
  }
}

/** Applies title, description and the `$zodWith` modifiers. Must be used by every `$zod` getter. */
export const applyDataValueMeta = <T extends z.ZodType>(schema: S.DataValue, zodSchema: T): T => {
  const withMeta =
    schema.title || schema.description || schema.deprecated
      ? zodSchema.meta({ title: schema.title, description: schema.description, deprecated: schema.deprecated })
      : zodSchema;
  return (schema.zodWith ?? []).reduce<z.ZodType>((acc, modify) => modify(acc), withMeta) as T;
};

/** Implementation of `$zodWith`, registered on `S.DataValue` */
export const zodWith = <S extends S.DataValue>(schema: S, modify: ZodModifier): S =>
  modifyOpts<S.DataValue>(schema, { zodWith: [...(schema.zodWith ?? []), modify] }) as S;

/** Handling of object keys, which are not declared in the schema */
export type UnknownKeys = 'strict' | 'strip' | 'passthrough';
/**
 * Default handling of unknown object keys. Set by importing `@supschema/zod/strip`,
 * which sets the runtime default as well.
 */
export interface ZodConfig {}
export type ConfiguredUnknownKeys = ZodConfig extends { unknownKeys: infer U extends UnknownKeys } ? U : 'strict';
