import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleColumnDef, FactoryColumns } from '../../base.js';

const columns = {
  postgresql: () => pg.integer(),
  mysql: () => mysql.smallint({ unsigned: true }),
  sqlite: () => sqlite.integer(),
} satisfies ColumnFactories;
export type UInt16Columns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/integer/UInt16.js' {
  interface UInt16 {
    $drizzleColumn: DrizzleColumnDef<UInt16Columns, false>;
  }
}

extend(S.UInt16, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
