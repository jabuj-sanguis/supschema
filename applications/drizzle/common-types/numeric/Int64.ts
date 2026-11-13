import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleExtension, FactoryColumns } from '../../base.js';

const columns = {
  postgresql: () => pg.bigint({ mode: 'bigint' }),
  mysql: () => mysql.bigint({ mode: 'bigint' }),
  sqlite: () => sqlite.blob({ mode: 'bigint' }),
} satisfies ColumnFactories;
export type Int64Columns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/integer/Int64.js' {
  interface Int64 extends DrizzleExtension<Int64Columns> {}
}

extend(S.Int64, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
