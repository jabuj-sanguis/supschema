import {
  relations as drizzleRelations,
  sql,
  type $Type,
  type BuildColumns,
  type BuildExtraConfigColumns,
  One,
  type Many,
  type NotNull,
  type Relations,
} from 'drizzle-orm';
import * as pg from 'drizzle-orm/pg-core';
import * as mysql from 'drizzle-orm/mysql-core';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { capitalize, groupBy, mapValues } from 'remeda';
import { extractOptionsModification, getSchemaMeta, Schema } from '@supschema/core';
import { Model, ModelRelation, ReferentialAction } from '@supschema/model-types';
import type { S } from '@supschema/common-types';
import Enum from '@supschema/common-types/Enum.js';
import Nullable from '@supschema/common-types/Nullable.js';
import Array from '@supschema/common-types/Array.js';

export type DrizzleDialect = 'postgresql' | 'mysql' | 'sqlite';

/** Column builder types of a schema for every dialect */
export interface DialectColumns {
  postgresql: pg.PgColumnBuilderBase;
  mysql: mysql.MySqlColumnBuilderBase;
  sqlite: sqlite.SQLiteColumnBuilderBase;
}

export interface DrizzleContext<D extends DrizzleDialect = DrizzleDialect> {
  dialect: D;
  /** Returns the PostgreSQL enum declared for the schema */
  pgEnum(schema: S.Enum): pg.PgEnum<[string, ...string[]]>;
}

export interface DrizzleColumnDef<C extends DialectColumns = DialectColumns, N extends boolean = boolean> {
  /** Creates a new column builder without name and constraints */
  column<D extends DrizzleDialect>(ctx: DrizzleContext<D>): C[D];
  /** Whether the column accepts `NULL` values */
  nullable: N;
}

export interface DrizzleExtension<
  C extends DialectColumns | undefined = DialectColumns | undefined,
  N extends boolean = false,
> {
  $drizzleColumn: [C] extends [DialectColumns] ? DrizzleColumnDef<C, N> : undefined;
}
export interface DrizzleExtended<C extends DialectColumns = DialectColumns, N extends boolean = boolean> {
  $drizzleColumn: DrizzleColumnDef<C, N>;
}

/** Column builders per dialect. Dialects without a builder are not supported by the schema */
export type ColumnFactories = { [D in DrizzleDialect]?: () => DialectColumns[D] };
/** Column types of {@link ColumnFactories}, `never` for unsupported dialects */
export type FactoryColumns<F extends ColumnFactories> = {
  [D in DrizzleDialect]: F[D] extends () => (infer C extends DialectColumns[D]) ? C : never;
};

/**
 * Dialects used by the application. Registered by importing a dialect entry point, e.g. `@supschema/drizzle/postgresql`,
 * so column and table settings are typed for that dialect only.
 */
export interface DrizzleDialects {}
/** Explicit dialect, takes precedence over {@link DrizzleDialects}, e.g. when several entry points are imported */
export interface DrizzleConfig {}
export type ConfiguredDialect = DrizzleConfig extends { dialect: infer D extends DrizzleDialect }
  ? D
  : keyof DrizzleDialects extends never
    ? DrizzleDialect
    : Extract<keyof DrizzleDialects, DrizzleDialect>;

const registeredDialects = new Set<DrizzleDialect>();
/** Registers a dialect imported via its entry point, so it can be used as default at runtime */
export const registerDialect = (dialect: DrizzleDialect) => registeredDialects.add(dialect);
/** Returns the only registered dialect or throws */
export const getRegisteredDialect = (): DrizzleDialect => {
  const [dialect, ...others] = registeredDialects;
  if (!dialect || others.length)
    throw new Error(
      'Dialect is ambiguous. Import exactly one dialect entry point, e.g. `@supschema/drizzle/postgresql`, or pass the dialect explicitly',
    );
  return dialect;
};

/** Type-only key of the columns set by `$drizzle`, see {@link DrizzleColumnsMarker} */
export declare const DRIZZLE_COLUMNS: unique symbol;
/**
 * Type-only marker of the columns set by `$drizzle`. It is added as an intersection instead of replacing
 * `$drizzleColumn`, so methods returning `this` keep the modified type. When the marker is added several times,
 * the property is an intersection of functions, and the last one, i.e. the latest modifier, is inferred.
 */
export interface DrizzleColumnsMarker<C extends DialectColumns> {
  readonly [DRIZZLE_COLUMNS]?: () => C;
}

/** Column types of a schema, taking `$drizzle` modifiers into account */
export type DrizzleColumnsOf<T> = T extends { readonly [DRIZZLE_COLUMNS]?: () => infer C extends DialectColumns }
  ? C
  : T extends DrizzleExtended<infer C>
    ? C
    : never;
/** Whether the column of a schema is nullable */
export type DrizzleNullableOf<T> = T extends DrizzleExtended<DialectColumns, infer N> ? N : never;

/** Schema with the column builder replaced by the result of a `$drizzle` modifier */
export type WithDrizzleColumn<T, R> = T &
  DrizzleColumnsMarker<{
    [D in DrizzleDialect]: D extends ConfiguredDialect ? Extract<R, DialectColumns[D]> : DrizzleColumnsOf<T>[D];
  }>;

declare module '@supschema/common-types/DataValue.js' {
  interface DataValue {
    /**
     * Returns a schema with the drizzle column modified, e.g. `S.Int32().$drizzle((c) => c.default(0))`.
     * The modifier is applied before `.notNull()`, `.primaryKey()` and `.unique()`, which are added by the table.
     */
    $drizzle<T extends DrizzleExtended, R extends DialectColumns[ConfiguredDialect]>(
      this: T,
      modify: (column: DrizzleColumnsOf<T>[ConfiguredDialect]) => R,
    ): WithDrizzleColumn<T, R>;
  }
}

/**
 * Key of the column modifier set by `$drizzle`. It is stored as schema metadata instead of an option,
 * so it is not serialized and is preserved by other schema modifications.
 */
export const DRIZZLE_COLUMN_MODIFIER = Symbol('supschema.drizzle.columnModifier');
export type DrizzleColumnModifier = (column: any) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Applies the column modifier of the schema. Must be used by every `$drizzleColumn` getter. */
export const withColumnModifiers = <Def extends DrizzleColumnDef>(schema: S.DataValue, def: Def): Def => {
  const modify = getSchemaMeta<DrizzleColumnModifier>(schema, DRIZZLE_COLUMN_MODIFIER);
  return modify ? { ...def, column: (ctx) => modify(def.column(ctx)) } : def;
};

/** Thrown when a schema has no column for the dialect */
export class UnsupportedDialectError extends Error {}

/** Column definition of a non-nullable scalar type with a fixed builder per dialect */
export const columnDef = <F extends ColumnFactories>(
  schema: S.DataValue,
  factories: F,
): DrizzleColumnDef<FactoryColumns<F>, false> =>
  withColumnModifiers(schema, {
    column: (ctx) => {
      const factory = factories[ctx.dialect];
      if (!factory) throw new UnsupportedDialectError(`Dialect ${ctx.dialect} is not supported`);
      return factory() as never;
    },
    nullable: false,
  });

/** Type of the column value used when the column is embedded into a JSON column */
export type JsonData<T> =
  T extends DrizzleExtended
    ? DrizzleColumnsOf<T> extends infer C extends DialectColumns
      ?
          | (C['postgresql']['_'] extends { $type: infer U } ? U : C['postgresql']['_']['data'])
          | (DrizzleNullableOf<T> extends true ? null : never)
      : never
    : unknown;

export interface JsonColumns<T> {
  postgresql: $Type<pg.PgJsonbBuilderInitial<''>, T>;
  mysql: $Type<mysql.MySqlJsonBuilderInitial<''>, T>;
  sqlite: $Type<sqlite.SQLiteTextJsonBuilderInitial<''>, T>;
}

export const jsonColumn = (dialect: DrizzleDialect) =>
  ({
    postgresql: () => pg.jsonb(),
    mysql: () => mysql.json(),
    sqlite: () => sqlite.text({ mode: 'json' }),
  })[dialect]();

/**
 * Schemas accepted by {@link drizzleSchema}: models, enums and model relations. Other schemas are ignored.
 * Schema types are invariant because of extensions referencing themselves, so they are matched structurally.
 */
export type RootSchemas = Schema;

interface ModelLike {
  name: string;
  key: unknown[];
  properties: Record<string, unknown>;
}
interface EnumLike<V extends string = string> {
  values: Record<V, unknown>;
}
interface RelationLike<M1 extends string = string, N1 = string, M2 extends string = string, N2 = string> {
  model: { name: M1 };
  name: N1;
  otherModel: { name: M2 };
  otherName: N2;
  fields: string[];
}

type PropertyColumn<T, D extends DrizzleDialect> =
  T extends DrizzleExtended
    ? DrizzleNullableOf<T> extends true
      ? DrizzleColumnsOf<T>[D]
      : NotNull<DrizzleColumnsOf<T>[D]>
    : never;
type PropertiesColumns<P, D extends DrizzleDialect> = { [K in keyof P]: PropertyColumn<P[K], D> };
type ModelColumns<M extends ModelLike, D extends DrizzleDialect> = PropertiesColumns<M['properties'], D>;

type ExtraConfigColumns<Name extends string, P, D extends DrizzleDialect> = D extends DrizzleDialect
  ? PropertiesColumns<P, D> extends infer C extends Record<string, DialectColumns[D]>
    ? BuildExtraConfigColumns<Name, C, { postgresql: 'pg'; mysql: 'mysql'; sqlite: 'sqlite' }[D]>
    : never
  : never;

interface TableExtraConfigValues {
  postgresql: pg.PgTableExtraConfigValue;
  mysql: mysql.MySqlTableExtraConfigValue;
  sqlite: sqlite.SQLiteTableExtraConfigValue;
}

/** Drizzle table settings of a model */
export interface DrizzleTableOptions<Name extends string = string, P = Record<string, unknown>> {
  /** Additional indexes, checks, policies, etc. Returned values are added to ones generated from the model */
  extraConfig?: (
    t: ExtraConfigColumns<Name, P, ConfiguredDialect>,
  ) => TableExtraConfigValues[ConfiguredDialect][];
}

declare module '@supschema/model-types/Model.js' {
  interface Model<Name, P> {
    /** Drizzle table settings */
    drizzleTable?: DrizzleTableOptions<Name, P>;
  }
}

export type DrizzleTable<D extends DrizzleDialect, M extends ModelLike> = {
  postgresql: pg.PgTableWithColumns<{
    name: M['name'];
    schema: string | undefined;
    columns: BuildColumns<M['name'], ModelColumns<M, 'postgresql'>, 'pg'>;
    dialect: 'pg';
  }>;
  mysql: mysql.MySqlTableWithColumns<{
    name: M['name'];
    schema: string | undefined;
    columns: BuildColumns<M['name'], ModelColumns<M, 'mysql'>, 'mysql'>;
    dialect: 'mysql';
  }>;
  sqlite: sqlite.SQLiteTableWithColumns<{
    name: M['name'];
    schema: undefined;
    columns: BuildColumns<M['name'], ModelColumns<M, 'sqlite'>, 'sqlite'>;
    dialect: 'sqlite';
  }>;
}[D];

type Values<T> = T[keyof T];
type ModelKeys<T> = { [K in keyof T]: T[K] extends ModelLike ? K : never }[keyof T] & string;
type EnumKeys<T> = { [K in keyof T]: T[K] extends EnumLike ? K : never }[keyof T] & string;

type DirectRelations<T, Name> = {
  [R in Values<T> as R extends RelationLike<Name & string, infer N1> ? N1 & string : never]: R extends RelationLike<
    string,
    unknown,
    infer M2
  >
    ? One<M2>
    : never;
};
type ReverseRelations<T, Name> = {
  [R in Values<T> as R extends RelationLike<string, unknown, Name & string, infer N2> ? N2 & string : never]: R extends
    RelationLike<infer M1>
    ? One<M1> | Many<M1>
    : never;
};
export type DrizzleRelations<T, M extends ModelLike> = Relations<
  M['name'],
  DirectRelations<T, M['name']> & ReverseRelations<T, M['name']>
>;

type EnumTuple<E> = E extends EnumLike<infer V> ? [V, ...V[]] : never;

/**
 * Result of {@link drizzleSchema}. Besides tables, relations and root enums it contains database schemas
 * (`<name>Schema`) and enums of model properties (`<Model><Property>`), which are typed as `unknown`.
 */
export type DrizzleSchema<D extends DrizzleDialect, T extends Record<string, RootSchemas>> = {
  [K in ModelKeys<T>]: DrizzleTable<D, Extract<T[K], ModelLike>>;
} & {
  [K in ModelKeys<T> as `${K}Relations`]: DrizzleRelations<T, Extract<T[K], ModelLike>>;
} & (D extends 'postgresql' ? { [K in EnumKeys<T>]: pg.PgEnum<EnumTuple<T[K]>> } : unknown) & {
    [K: string]: unknown;
  };

const referentialActions: Record<ReferentialAction, 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default'> =
  {
    Cascade: 'cascade',
    Restrict: 'restrict',
    NoAction: 'no action',
    SetNull: 'set null',
    SetDefault: 'set default',
  };

/** Returns true when the fields are guaranteed to identify at most one row of the model */
const isUniqueFieldSet = (model: Model, fields: string[]) => {
  const [singleField] = fields;
  const singleProperty = fields.length === 1 && singleField !== undefined ? model.properties[singleField] : undefined;
  return (
    model.key.every((k) => fields.includes(k as string)) ||
    (!!singleProperty && 'unique' in singleProperty && !!singleProperty.unique) ||
    !!model.uniques?.some((u) => !u.where && u.fields.every((f) => fields.includes(f as string)))
  );
};

/** Enum used by a column, unwrapping nullable and array schemas */
const columnEnum = (schema: Schema) => {
  let s = schema;
  while (s instanceof Nullable || s instanceof Array) s = s instanceof Nullable ? s.schema : s.items;
  return s instanceof Enum ? s : undefined;
};

/* eslint-disable @typescript-eslint/no-explicit-any -- column builders of different dialects share no usable type */
type AnyBuilder = any;
type AnyTable = any;
type AnyDbSchema = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Reverse side of a one-to-one relation. drizzle's `one` requires fields when a relation name is passed,
 * but the reverse side must be resolved by the relation name only.
 */
class ReverseOne extends One {
  constructor(
    sourceTable: AnyTable,
    referencedTable: AnyTable,
    readonly reverseRelationName: string | undefined,
  ) {
    super(sourceTable, referencedTable, undefined, true);
    (this as { relationName: string }).relationName = reverseRelationName!;
  }

  override withFieldName(fieldName: string): One {
    const relation = new ReverseOne(this.sourceTable, this.referencedTable, this.reverseRelationName);
    (relation as { fieldName: string }).fieldName = fieldName;
    return relation;
  }
}

const dialectCores = { postgresql: pg, mysql, sqlite } as const;

/**
 * Creates drizzle tables, relations, enums and database schemas from supschema models.
 *
 * Keys of the result are names of exports expected by drizzle-kit: tables and enums keep keys of the input,
 * relations are exported as `<Model>Relations`, database schemas as `<name>Schema` and enums of model
 * properties, which are not passed explicitly, as `<Model><Property>`.
 */
export const drizzleSchema = <D extends DrizzleDialect, T extends Record<string, RootSchemas>>(
  dialect: D,
  schemas: T,
): DrizzleSchema<D, T> => {
  const core = dialectCores[dialect] as AnyBuilder;
  const result: Record<string, unknown> = {};
  const entries = Object.entries(schemas);

  const relations = entries.flatMap(([, s]) => (s instanceof ModelRelation ? [s] : []));
  const directRelations = groupBy(relations, (r) => r.model.name);
  const reverseRelations = groupBy(relations, (r) => r.otherModel.name);

  const dbSchemas = new Map<string, AnyDbSchema>();
  const getDbSchema = (name: string) => {
    let dbSchema = dbSchemas.get(name);
    if (!dbSchema) {
      if (dialect === 'sqlite') throw new Error('Database schemas are not supported by SQLite');
      dbSchema = dialect === 'postgresql' ? pg.pgSchema(name) : mysql.mysqlSchema(name);
      dbSchemas.set(name, dbSchema);
      result[name + 'Schema'] = dbSchema;
    }
    return dbSchema;
  };
  for (const [, s] of entries) {
    if (s instanceof Model && s.dbSchema) getDbSchema(s.dbSchema);
    if (s instanceof Enum && dialect === 'postgresql' && s.dbSchema) getDbSchema(s.dbSchema);
  }

  const enums = new Map<Schema, pg.PgEnum<[string, ...string[]]>>();
  const findEnum = (schema: Schema) => {
    for (let s: Schema | undefined = schema; s; s = extractOptionsModification(s)?.originalSchema) {
      const e = enums.get(s);
      if (e) return e;
    }
  };
  const declareEnum = (name: string, schema: S.Enum) => {
    const values = Object.keys(schema.values) as [string, ...string[]];
    const pgEnum = schema.dbSchema ? (getDbSchema(schema.dbSchema) as pg.PgSchema).enum(name, values) : pg.pgEnum(name, values);
    enums.set(schema, pgEnum);
    result[name] = pgEnum;
  };

  const ctx: DrizzleContext<D> = {
    dialect,
    pgEnum: (schema) => {
      const e = findEnum(schema);
      if (!e) throw new Error('Enum is not declared');
      return e;
    },
  };

  if (dialect === 'postgresql') {
    for (const [name, s] of entries) if (s instanceof Enum) declareEnum(name, s);
  }

  const tables = new Map<string, AnyTable>();
  const getTable = (model: Model) => {
    const table = tables.get(model.name);
    if (!table) throw new Error(`Model ${model.name} is not passed to drizzleSchema`);
    return table;
  };

  for (const [name, model] of entries) {
    if (!(model instanceof Model)) continue;

    if (dialect === 'postgresql') {
      for (const [key, prop] of Object.entries(model.properties)) {
        const e = columnEnum(prop);
        if (e && !findEnum(e)) declareEnum(name + capitalize(key), e);
      }
    }

    if (dialect === 'mysql' && [...(model.uniques ?? []), ...(model.indexes ?? [])].some((i) => i.where))
      throw new Error('Partial indexes are not supported by MySQL');

    const singleKey = model.key.length === 1 ? model.key[0] : undefined;
    const columns = mapValues(model.properties, (prop, key) => {
      const def = (prop as Partial<DrizzleExtended>).$drizzleColumn;
      if (!def) throw new Error(`Property ${model.name}.${key} is not supported by drizzle`);

      let column: AnyBuilder;
      try {
        column = def.column(ctx);
      } catch (e) {
        if (!(e instanceof UnsupportedDialectError)) throw e;
        throw new UnsupportedDialectError(`Property ${model.name}.${key}: ${e.message}`, { cause: e });
      }
      if (key === singleKey) column = column.primaryKey();
      else if (!def.nullable) column = column.notNull();
      if ('unique' in prop && prop.unique) column = column.unique();
      return column;
    });

    const tableFn = model.dbSchema
      ? getDbSchema(model.dbSchema).table
      : { postgresql: pg.pgTable, mysql: mysql.mysqlTable, sqlite: sqlite.sqliteTable }[dialect];
    // Called lazily by drizzle, so tables declared later can be referenced
    const tableExtras = (t: AnyTable) => {
      const cols = (fields: (string | number | symbol)[]) => fields.map((f) => t[f]);
      // Without a name PostgreSQL uses the default names of drizzle, MySQL and SQLite require a name
      const indexName = (index: { name?: string; fields: (string | number | symbol)[] }, suffix: string) =>
        index.name ?? (dialect === 'postgresql' ? undefined : [model.name, ...index.fields, suffix].join('_'));
      const where = (builder: AnyBuilder, condition: string | undefined) =>
        condition ? builder.where(sql.raw(condition)) : builder;

      const extras: unknown[] = [];
      if (model.key.length > 1) extras.push(core.primaryKey({ columns: cols(model.key) }));
      for (const u of model.uniques ?? [])
        extras.push(where(core[u.where ? 'uniqueIndex' : 'unique'](indexName(u, 'unique')).on(...cols(u.fields)), u.where));
      for (const i of model.indexes ?? [])
        extras.push(where(core.index(indexName(i, 'index') as string).on(...cols(i.fields)), i.where));
      for (const rel of directRelations[model.name] ?? []) {
        let fk = core.foreignKey({
          columns: cols(rel.fields),
          // Self references must use columns of the table being built
          foreignColumns:
            rel.otherModel === rel.model ? cols(rel.otherFields) : rel.otherFields.map((f) => getTable(rel.otherModel)[f]),
          ...(rel.map ? { name: rel.map } : {}),
        });
        if (rel.onDelete) fk = fk.onDelete(referentialActions[rel.onDelete]);
        if (rel.onUpdate) fk = fk.onUpdate(referentialActions[rel.onUpdate]);
        extras.push(fk);
      }
      extras.push(...(model.drizzleTable?.extraConfig?.(t as never) ?? []));
      return extras;
    };

    const table = tableFn(model.name, columns, tableExtras);
    tables.set(model.name, table);
    result[name] = table;
  }

  for (const [name, model] of entries) {
    if (!(model instanceof Model)) continue;

    const direct = directRelations[model.name] ?? [];
    const reverse = reverseRelations[model.name] ?? [];
    const pairKey = (r: ModelRelation) => [r.model.name, r.otherModel.name].sort((a, b) => a.localeCompare(b)).join('\0');
    const pairCounts = groupBy([...direct, ...reverse], pairKey);
    const relationName = (r: ModelRelation): { relationName?: string } =>
      (pairCounts[pairKey(r)]?.length ?? 0) > 1 || r.model === r.otherModel ? { relationName: r.name } : {};

    const table = getTable(model);
    result[name + 'Relations'] = drizzleRelations(table, ({ one, many }) => ({
      ...Object.fromEntries(
        direct.map((rel) => [
          rel.name,
          one(getTable(rel.otherModel), {
            fields: rel.fields.map((f) => getTable(rel.model)[f]) as [AnyTable],
            references: rel.otherFields.map((f) => getTable(rel.otherModel)[f]) as [AnyTable],
            ...relationName(rel),
          }),
        ]),
      ),
      ...Object.fromEntries(
        reverse.map((rel) => {
          const { relationName: name } = relationName(rel);
          const target = getTable(rel.model);
          if (!isUniqueFieldSet(rel.model, rel.fields))
            return [rel.otherName, many(target, name === undefined ? undefined : { relationName: name })];

          return [rel.otherName, new ReverseOne(table, target, name)];
        }),
      ),
    }));
  }

  return result as DrizzleSchema<D, T>;
};
