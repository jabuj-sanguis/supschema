import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleColumnDef, FactoryColumns } from '../../base.js';

const columns = {
  postgresql: () => pg.smallint(),
  mysql: () => mysql.tinyint(),
  sqlite: () => sqlite.integer(),
} satisfies ColumnFactories;
export type Int8Columns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/integer/Int8.js' {
  interface Int8 {
    $drizzleColumn: DrizzleColumnDef<Int8Columns, false>;
  }
}

extend(S.Int8, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
