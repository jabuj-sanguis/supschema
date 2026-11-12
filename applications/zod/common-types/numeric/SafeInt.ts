import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { ZodExtension } from '../../base.js';
import { z } from 'zod';
import { applyNumericConstraints } from './common.js';

declare module '@supschema/common-types/numeric/integer/SafeInt.js' {
  interface SafeInt extends ZodExtension<z.ZodNumberFormat<'safeint' | 'int32' | 'uint32'>> {}
}

extend(S.SafeInt, {
  get $zod() {
    return applyNumericConstraints(this, z.int());
  },
});
