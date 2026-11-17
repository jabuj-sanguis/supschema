import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { DrizzleColumnDef, DrizzleExtension, JsonColumns, JsonDataIntersection, jsonColumnDef } from '../base.js';

declare module '@supschema/common-types/Intersect.js' {
  interface Intersect<T> extends DrizzleExtension<JsonColumns<JsonDataIntersection<T>>> {}
}

extend(S.Intersect, {
  get $drizzleColumn(): DrizzleColumnDef<JsonColumns<unknown>, false> {
    return jsonColumnDef(this);
  },
});
