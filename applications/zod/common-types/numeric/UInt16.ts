import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { z } from 'zod';
import { ResolveZod } from '../../base.js';
import { applyNumericConstraints } from './common.js';

declare module '@supschema/common-types/numeric/integer/UInt16.js' {
  interface UInt16 {
    $zod: ResolveZod<this, z.ZodUInt32>;
  }
}

extend(S.UInt16, {
  get $zod() {
    return applyNumericConstraints(this, z.uint32().max((2 ^ 16) - 1));
  },
});
