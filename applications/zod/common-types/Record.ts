import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { applyDataValueMeta, ZodExtended, ZodExtension, ZodOf } from '../base.js';
import { z } from 'zod';

declare module '@supschema/common-types/Record.js' {
  interface Record<K, V> extends ZodExtension<
    K extends ZodExtended
      ? ZodOf<K> extends infer ZK extends z.core.$ZodRecordKey
        ? V extends ZodExtended
          ? z.ZodRecord<ZK, ZodOf<V>>
          : never
        : never
      : never
  > {}
}

// Typed loosely, the exact record type is too deep to instantiate here
type ExtendedRecord = S.DataValue & { keys: { $zod?: z.ZodType }; values: { $zod?: z.ZodType } };
extend(S.Record, {
  get $zod(): z.ZodType | undefined {
    const keys = this.keys.$zod as z.core.$ZodRecordKey | undefined;
    const values: z.ZodType | undefined = this.values.$zod;
    if (!keys || !values) return;
    return applyDataValueMeta(this, z.record(keys, values));
  },
} as ThisType<ExtendedRecord> as never);
