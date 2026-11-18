import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { DrizzleColumnModifier, drizzleWith } from '../base.js';

extend(S.DataValue, {
  $drizzle(this: S.DataValue, modify: DrizzleColumnModifier) {
    return drizzleWith(this, modify);
  },
} as never);
