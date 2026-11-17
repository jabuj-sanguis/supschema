import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { DrizzleColumnDef, DrizzleExtension, JsonColumns, JsonData, jsonColumnDef } from '../base.js';

declare module '@supschema/common-types/Record.js' {
  interface Record<K, V> extends DrizzleExtension<JsonColumns<{ [key: string]: JsonData<V> }>> {}
}

extend(S.Record, {
  get $drizzleColumn(): DrizzleColumnDef<JsonColumns<{ [key: string]: unknown }>, false> {
    return jsonColumnDef(this);
  },
});
