import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { DrizzleColumnDef, DrizzleExtension, JsonColumns, JsonDataItems, jsonColumnDef } from '../base.js';

declare module '@supschema/common-types/Tuple.js' {
  interface Tuple<T> extends DrizzleExtension<JsonColumns<JsonDataItems<T>>> {}
}

extend(S.Tuple, {
  get $drizzleColumn(): DrizzleColumnDef<JsonColumns<unknown[]>, false> {
    return jsonColumnDef(this);
  },
});
