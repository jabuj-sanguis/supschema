import { extend, getSchemaMeta, withSchemaMeta } from '@supschema/core';
import { S } from '@supschema/common-types';
import { DRIZZLE_COLUMN_MODIFIER, DrizzleColumnModifier } from '../base.js';

extend(S.DataValue, {
  $drizzle(this: S.DataValue, modify: DrizzleColumnModifier) {
    const previous = getSchemaMeta<DrizzleColumnModifier>(this, DRIZZLE_COLUMN_MODIFIER);
    return withSchemaMeta(this, DRIZZLE_COLUMN_MODIFIER, previous ? (column: unknown) => modify(previous(column)) : modify);
  },
} as never);
