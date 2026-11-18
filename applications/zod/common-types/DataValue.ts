import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { zodWith } from '../base.js';

extend(S.DataValue, {
  $zodWith(this: S.DataValue, modify: Parameters<typeof zodWith>[1]) {
    return zodWith(this, modify);
  },
} as never);
