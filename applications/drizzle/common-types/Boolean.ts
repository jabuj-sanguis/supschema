import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleExtension, FactoryColumns } from '../base.js';

const columns = {
  postgresql: () => pg.boolean(),
  mysql: () => mysql.boolean(),
  sqlite: () => sqlite.integer({ mode: 'boolean' }),
} satisfies ColumnFactories;
export type BooleanColumns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/Boolean.js' {
  interface Boolean extends DrizzleExtension<BooleanColumns> {}
}

extend(S.Boolean, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
