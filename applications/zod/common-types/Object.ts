import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import {
  applyDataValueMeta,
  ConfiguredUnknownKeys,
  getDefaultUnknownKeys,
  UnknownKeys,
  ZodExtended,
  ZodExtension,
  ZodOf,
} from '../base.js';
import { z } from 'zod';
import { mapValues } from 'remeda';

interface UnknownKeysConfigs {
  strict: z.core.$strict;
  strip: z.core.$strip;
  passthrough: z.core.$loose;
}

declare module '@supschema/common-types/object/Object.js' {
  interface Object<P> extends ZodExtension<
    AllPropertiesExtend<P, ZodExtended> extends true
      ? z.ZodObject<{ [K in keyof P]: ZodOf<P[K]> }, UnknownKeysConfigs[ConfiguredUnknownKeys]>
      : never
  > {
    /**
     * Handling of keys, which are not declared in the schema, by zod: rejected (`strict`), removed (`strip`)
     * or kept (`passthrough`). The default is `strict` or the one set by `@supschema/zod/strip`.
     */
    unknownKeys?: UnknownKeys;
  }
}

const objectFactories = { strict: z.strictObject, strip: z.object, passthrough: z.looseObject };

type ExtendedObject = S.Object<Record<string, S.DataValue & ZodExtended>>;
extend(S.Object, {
  get $zod(): ExtendedObject['$zod'] | undefined {
    if (Object.values(this.properties).some((prop) => !prop.$zod)) return;
    const factory = objectFactories[this.unknownKeys ?? getDefaultUnknownKeys()];
    return applyDataValueMeta(this, factory(mapValues(this.properties, (s) => s.$zod)) as never);
  },
} as ThisType<ExtendedObject>);
