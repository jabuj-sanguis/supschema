import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { DrizzleColumnDef, DrizzleExtension, JsonColumns, JsonObjectData, jsonColumnDef } from '../base.js';

declare module '@supschema/common-types/object/Object.js' {
  interface Object<P> extends DrizzleExtension<JsonColumns<JsonObjectData<P>>> {}
}

extend(S.Object, {
  get $drizzleColumn(): DrizzleColumnDef<JsonColumns<Record<string, unknown>>, false> {
    return jsonColumnDef(this);
  },
});
