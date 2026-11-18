import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { DrizzleColumnDef, DrizzleExtension, JsonColumns, JsonData, jsonColumnDef } from '../base.js';

declare module '@supschema/common-types/Union.js' {
  interface Union<T> extends DrizzleExtension<JsonColumns<JsonData<T[number]>>> {}
}

extend(S.Union, {
  get $drizzleColumn(): DrizzleColumnDef<JsonColumns<unknown>, false> {
    return jsonColumnDef(this);
  },
});
