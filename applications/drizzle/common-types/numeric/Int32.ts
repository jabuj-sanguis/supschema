import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleColumnDef, FactoryColumns } from '../../base.js';

const columns = {
  postgresql: () => pg.integer(),
  mysql: () => mysql.int(),
  sqlite: () => sqlite.integer(),
} satisfies ColumnFactories;
export type Int32Columns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/integer/Int32.js' {
  interface Int32 {
    $drizzleColumn: DrizzleColumnDef<Int32Columns, false>;
  }
}

extend(S.Int32, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
