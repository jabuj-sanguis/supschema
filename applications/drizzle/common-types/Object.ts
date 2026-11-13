import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { DrizzleColumnDef, DrizzleExtension, JsonColumns, JsonData, jsonColumn, withColumnModifiers } from '../base.js';

declare module '@supschema/common-types/object/Object.js' {
  interface Object<P> extends DrizzleExtension<JsonColumns<{ [K in keyof P]: JsonData<P[K]> }>> {}
}

extend(S.Object, {
  get $drizzleColumn(): DrizzleColumnDef<JsonColumns<Record<string, unknown>>, false> {
    return withColumnModifiers(this, { column: (ctx) => jsonColumn(ctx.dialect) as never, nullable: false });
  },
});
