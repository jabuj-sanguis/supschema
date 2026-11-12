import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { z } from 'zod';
import { applyNumericConstraints } from './common.js';

declare module '@supschema/common-types/numeric/integer/Int32.js' {
  interface Int32 {
    $zod: z.ZodInt32;
  }
}

extend(S.Int32, {
  get $zod() {
    return applyNumericConstraints(this, z.int32());
  },
});
