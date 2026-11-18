import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import { DrizzleColumnDef, DrizzleColumnsOf, DrizzleExtended, DrizzleExtension, withColumnModifiers } from '../base.js';

declare module '@supschema/common-types/Nullable.js' {
  interface Nullable<S> extends DrizzleExtension<S extends DrizzleExtended ? DrizzleColumnsOf<S> : undefined, true> {}
}

type ExtendedNullable = S.Nullable<S.DataValue & DrizzleExtended>;
extend(S.Nullable, {
  get $drizzleColumn(): DrizzleColumnDef | undefined {
    const def = this.schema.$drizzleColumn;
    if (!def) return;
    return withColumnModifiers(this, { column: (ctx) => def.column(ctx), nullable: true });
  },
} as ThisType<ExtendedNullable>);
