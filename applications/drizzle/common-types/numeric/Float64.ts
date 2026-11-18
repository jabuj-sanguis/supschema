import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleExtension, FactoryColumns } from '../../base.js';

const columns = {
  postgresql: () => pg.doublePrecision(),
  mysql: () => mysql.double(),
  sqlite: () => sqlite.real(),
} satisfies ColumnFactories;
export type Float64Columns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/float/Float64.js' {
  interface Float64 extends DrizzleExtension<Float64Columns> {}
}

extend(S.Float64, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
