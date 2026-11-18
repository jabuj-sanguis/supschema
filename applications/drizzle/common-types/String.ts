import { extend } from '@supschema/core';
import { S } from '@supschema/common-types';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { columnDef, DrizzleColumnDef, DrizzleExtension } from '../base.js';

/**
 * `maxLength` is a validation rule and does not change the column type. MySQL uses `varchar(255)`,
 * because `text` columns can't be indexed without a prefix length. Use `$drizzle` for other types.
 */
export interface StringColumns {
  postgresql: pg.PgTextBuilderInitial<'', [string, ...string[]]>;
  mysql: mysql.MySqlVarCharBuilderInitial<'', [string, ...string[]], 255>;
  sqlite: sqlite.SQLiteTextBuilderInitial<'', [string, ...string[]], undefined>;
}

declare module '@supschema/common-types/String.js' {
  interface String extends DrizzleExtension<StringColumns> {}
}

extend(S.String, {
  get $drizzleColumn(): DrizzleColumnDef<StringColumns, false> {
    return columnDef(this, {
      postgresql: () => pg.text(),
      mysql: () => mysql.varchar({ length: 255 }),
      sqlite: () => sqlite.text(),
    });
  },
});
