import { defineConstructor, createType, SchemaOptions } from '@supschema/core';
import { Object, ObjectProperties } from '@supschema/common-types/object/Object.js';

export interface ModelIndex<P extends ObjectProperties = any> {
  fields: (keyof P)[];
  /** Database name of the index or constraint, the default name of the application is used if omitted */
  name?: string;
  /** Raw SQL condition of a partial index */
  where?: string;
}

export interface Model<Name extends string = any, P extends ObjectProperties = any> extends Object<P> {
  name: Name;
  dbSchema?: string;
  key: (keyof P)[];
  indexes?: ModelIndex<P>[];
  uniques?: ModelIndex<P>[];
  description?: string;
  view?: boolean;
}

export const Model = createType(
  import.meta,
  Object,
  defineConstructor(
    <Name extends string, P extends ObjectProperties>(
      opts: Omit<SchemaOptions<Model<Name, P>>, 'properties'>,
      properties: P,
    ): SchemaOptions<Model<Name, P>> => ({
      properties,
      ...opts,
    }),
  ),
  ({ properties, ...opts }) => [opts, properties] as const,
);
export default Model;
