import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleColumnDef, FactoryColumns } from '../../base.js';

const columns = {
  postgresql: () => pg.smallint(),
  mysql: () => mysql.smallint(),
  sqlite: () => sqlite.integer(),
} satisfies ColumnFactories;
export type Int16Columns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/integer/Int16.js' {
  interface Int16 {
    $drizzleColumn: DrizzleColumnDef<Int16Columns, false>;
  }
}

extend(S.Int16, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
