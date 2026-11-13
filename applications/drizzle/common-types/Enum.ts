import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import type * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { DrizzleColumnDef, DrizzleExtension, withColumnModifiers } from '../base.js';

export interface EnumColumns<V extends string> {
  postgresql: pg.PgEnumColumnBuilderInitial<'', [V, ...V[]]>;
  mysql: mysql.MySqlEnumColumnBuilderInitial<'', [V, ...V[]]>;
  sqlite: sqlite.SQLiteTextBuilderInitial<'', [V, ...V[]], undefined>;
}

declare module '@supschema/common-types/Enum.js' {
  interface Enum<V> extends DrizzleExtension<EnumColumns<V>> {
    /** Database schema of the PostgreSQL enum */
    dbSchema?: string;
  }
}

extend(S.Enum, {
  get $drizzleColumn(): DrizzleColumnDef<EnumColumns<string>, false> {
    const values = Object.keys(this.values) as [string, ...string[]];
    return withColumnModifiers(this, {
      column: (ctx) =>
        ({
          postgresql: () => ctx.pgEnum(this)(),
          mysql: () => mysql.mysqlEnum(values),
          sqlite: () => sqlite.text({ enum: values }),
        })[ctx.dialect]() as never,
      nullable: false,
    });
  },
});
