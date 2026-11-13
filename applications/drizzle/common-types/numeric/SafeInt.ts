import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { ColumnFactories, columnDef, DrizzleExtension, FactoryColumns } from '../../base.js';
import type { Int8Columns } from './Int8.js';
import type { Int16Columns } from './Int16.js';
import type { Int32Columns } from './Int32.js';
import type { UInt8Columns } from './UInt8.js';
import type { UInt16Columns } from './UInt16.js';
import type { UInt32Columns } from './UInt32.js';

const columns = {
  postgresql: () => pg.bigint({ mode: 'number' }),
  mysql: () => mysql.bigint({ mode: 'number' }),
  sqlite: () => sqlite.integer(),
} satisfies ColumnFactories;
export type SafeIntColumns = FactoryColumns<typeof columns>;

declare module '@supschema/common-types/numeric/integer/SafeInt.js' {
  interface SafeInt extends DrizzleExtension<SafeIntColumns | Int8Columns | Int16Columns | Int32Columns | UInt8Columns | UInt16Columns | UInt32Columns> {}
}

extend(S.SafeInt, {
  get $drizzleColumn() {
    return columnDef(this, columns);
  },
});
