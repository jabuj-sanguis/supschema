import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import type * as pg from 'drizzle-orm/pg-core';
import { DrizzleColumnDef, DrizzleExtended, DrizzleExtension, JsonColumns, JsonData, jsonColumn, withColumnModifiers } from '../base.js';

/** Only PostgreSQL supports native arrays, and only of scalar non-nullable values */
export type ArrayColumns<I> =
  I extends DrizzleExtended<infer C, infer N>
    ? JsonColumns<JsonData<I>[]> extends infer J extends JsonColumns<JsonData<I>[]>
      ? {
          postgresql: N extends true
            ? J['postgresql']
            : C['postgresql'] extends pg.PgArrayBuilder<any, any> | J['postgresql']
              ? J['postgresql']
              : C['postgresql'] extends { array(): infer A extends pg.PgColumnBuilderBase }
                ? A
                : J['postgresql'];
          mysql: J['mysql'];
          sqlite: J['sqlite'];
        }
      : never
    : undefined;

declare module '@supschema/common-types/Array.js' {
  interface Array<S> extends DrizzleExtension<ArrayColumns<S>> {}
}

type ExtendedArray = S.Array<S.DataValue & DrizzleExtended>;
extend(S.Array, {
  get $drizzleColumn(): DrizzleColumnDef | undefined {
    const item = this.items.$drizzleColumn;
    if (!item) return;

    const native = !item.nullable && !(this.items instanceof S.Array) && !(this.items instanceof S.Object);
    return withColumnModifiers(this, {
      column: (ctx) =>
        (ctx.dialect === 'postgresql' && native
          ? (item.column(ctx) as unknown as pg.PgColumnBuilder).array()
          : jsonColumn(ctx.dialect)) as never,
      nullable: false,
    });
  },
} as ThisType<ExtendedArray>);
