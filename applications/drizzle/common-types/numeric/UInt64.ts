import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleExtension, FactoryColumns } from '../../base.js';

const columns = {
  postgresql: () => pg.numeric({ precision: 20, scale: 0 }),
  mysql: () => mysql.bigint({ mode: 'bigint', unsigned: true }),
  sqlite: () => sqlite.text(),
} satisfies ColumnFactories;
export type UInt64Columns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/integer/UInt64.js' {
  interface UInt64 extends DrizzleExtension<UInt64Columns> {}
}

extend(S.UInt64, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
