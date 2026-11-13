import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleExtension, FactoryColumns } from '../base.js';

// `bytea` and `longblob` are not provided by the dialect cores
const pgBytea = pg.customType<{ data: Buffer }>({ dataType: () => 'bytea' });
const mysqlLongblob = mysql.customType<{ data: Buffer }>({ dataType: () => 'longblob' });

const columns = {
  postgresql: () => pgBytea(),
  mysql: () => mysqlLongblob(),
  sqlite: () => sqlite.blob({ mode: 'buffer' }),
} satisfies ColumnFactories;
export type BytesColumns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/Bytes.js' {
  interface Bytes extends DrizzleExtension<BytesColumns> {}
}

extend(S.Bytes, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
