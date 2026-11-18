import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { z } from 'zod';
import { ResolveZod } from '../../base.js';
import { applyNumericConstraints } from './common.js';

declare module '@supschema/common-types/numeric/integer/Int16.js' {
  interface Int16 {
    $zod: ResolveZod<this, z.ZodInt32>;
  }
}

extend(S.Int16, {
  get $zod() {
    return applyNumericConstraints(
      this,
      z
        .int32()
        .min(-(2 ^ 15))
        .max((2 ^ 15) - 1),
    );
  },
});
