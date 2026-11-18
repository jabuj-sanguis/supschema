import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleColumnDef, FactoryColumns } from '../../base.js';

const columns = {
  postgresql: () => pg.bigint({ mode: 'number' }),
  mysql: () => mysql.int({ unsigned: true }),
  sqlite: () => sqlite.integer(),
} satisfies ColumnFactories;
export type UInt32Columns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/integer/UInt32.js' {
  interface UInt32 {
    $drizzleColumn: DrizzleColumnDef<UInt32Columns, false>;
  }
}

extend(S.UInt32, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
