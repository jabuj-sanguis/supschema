import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { applyDataValueMeta, ZodExtended, ZodExtension, ZodOf } from '../base.js';
import z from 'zod';

declare module '@supschema/common-types/object/Optional.js' {
  interface Optional<S> extends ZodExtension<S extends ZodExtended ? z.ZodOptional<ZodOf<S>> : never> {}
}

type ExtendedOptional = S.Optional<S.DataValue & ZodExtended>;
extend(S.Optional, {
  get $zod(): ExtendedOptional['$zod'] | undefined {
    if (!this.schema.$zod) return;
    return applyDataValueMeta(this, this.schema.$zod.optional());
  },
} as ThisType<ExtendedOptional>);
