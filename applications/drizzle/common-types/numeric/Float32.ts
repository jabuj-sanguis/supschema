import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleExtension, FactoryColumns } from '../../base.js';

const columns = {
  postgresql: () => pg.real(),
  mysql: () => mysql.float(),
  sqlite: () => sqlite.real(),
} satisfies ColumnFactories;
export type Float32Columns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/float/Float32.js' {
  interface Float32 extends DrizzleExtension<Float32Columns> {}
}

extend(S.Float32, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
