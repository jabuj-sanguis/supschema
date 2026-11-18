import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { is } from 'drizzle-orm';
import * as pg from 'drizzle-orm/pg-core';
import {
  DialectColumns,
  DrizzleColumnDef,
  DrizzleColumnsOf,
  DrizzleExtended,
  DrizzleExtension,
  DrizzleNullableOf,
  JsonColumns,
  JsonData,
  jsonColumn,
  withColumnModifiers,
} from '../base.js';

/** Columns which can't be items of a native PostgreSQL array, the array is stored as JSON instead */
type NonNativeArrayItem = pg.PgArrayBuilder<any, any> | pg.PgJsonbBuilder<any> | pg.PgJsonBuilder<any>;
const isNonNativeArrayItem = (column: unknown) =>
  is(column, pg.PgArrayBuilder) || is(column, pg.PgJsonbBuilder) || is(column, pg.PgJsonBuilder);

/** Only PostgreSQL supports native arrays, and only of scalar non-nullable values */
export type ArrayColumns<I> = I extends DrizzleExtended
  ? [DrizzleColumnsOf<I>, DrizzleNullableOf<I>, JsonColumns<JsonData<I>[]>] extends [
      infer C extends DialectColumns,
      infer N,
      infer J extends JsonColumns<JsonData<I>[]>,
    ]
    ? {
        postgresql: N extends true
          ? J['postgresql']
          : C['postgresql'] extends NonNativeArrayItem
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

    return withColumnModifiers(this, {
      column: (ctx) => {
        if (ctx.dialect !== 'postgresql' || item.nullable) return jsonColumn(ctx.dialect) as never;
        const column = item.column(ctx);
        return (
          isNonNativeArrayItem(column) ? jsonColumn(ctx.dialect) : (column as pg.PgColumnBuilder).array()
        ) as never;
      },
      nullable: false,
    });
  },
} as ThisType<ExtendedArray>);
