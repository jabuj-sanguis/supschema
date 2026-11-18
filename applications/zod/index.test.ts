import { expect, expectTypeOf, it } from 'vitest';
import { extend, getSchemaMeta, modifyOpts, withSchemaMeta } from '@supschema/core';
import { z } from 'zod';
import { S } from '@supschema/common-types';
import './common-types/index.js';

it('supports scalar and numeric common-types', () => {
  const schema = S.Object({
    bool: S.Boolean(),
    string: S.String({ minLength: 2, maxLength: 5, pattern: '^a' }),
    bytes: S.Bytes(),
    int: S.Int32({ minimum: 1, maximum: 10 }),
    float: S.Float64({ exclusiveMinimum: 0, exclusiveMaximum: 100 }),
    nullable: S.Nullable(S.String()),
  });

  const zodSchema = schema.$zod;

  expect(
    zodSchema.safeParse({
      bool: true,
      string: 'abc',
      bytes: new Uint8Array([1, 2]),
      int: 5,
      float: 2.5,
      nullable: null,
    }).success,
  ).toBe(true);

  expect(
    zodSchema.safeParse({
      bool: true,
      string: 'x',
      bytes: new Uint8Array([1, 2]),
      int: 5,
      float: 2.5,
      nullable: null,
    }).success,
  ).toBe(false);
});

it('supports array, tuple, union, intersect, enum and record', () => {
  const schema = S.Object({
    list: S.Array(S.Int16(), {
      minItems: 2,
      uniqueItems: true,
      contains: S.Int16({ minimum: 7 }),
    }),
    tuple: S.Tuple([S.String(), S.Boolean()]),
    union: S.Union([S.String(), S.Int32()]),
    intersect: S.Intersect([S.Object({ a: S.String() }), S.Object({ b: S.Int32() })]),
    enum: S.Enum({ a: {}, b: {} }),
    record: S.Record(S.String({ pattern: '^key_' }), S.Boolean()),
  });

  const zodSchema = schema.$zod;
  expectTypeOf<z.infer<typeof zodSchema>['tuple']>().toEqualTypeOf<[string, boolean]>();
  expect(S.Tuple([S.String(), S.Boolean()]).$zod.safeParse(['x', true, 'y']).success).toBe(false);

  expect(
    zodSchema.safeParse({
      list: [7, 8],
      tuple: ['x', true],
      union: 1,
      intersect: { a: 'a', b: 1 },
      enum: 'a',
      record: { key_one: true },
    }).success,
  ).toBe(true);

  expect(
    zodSchema.safeParse({
      list: [1, 1],
      tuple: ['x', true],
      union: 1,
      intersect: { a: 'a', b: 1 },
      enum: 'a',
      record: { wrong: true },
    }).success,
  ).toBe(false);
});

it('supports object modifiers Optional, Omit, Pick and Partial', () => {
  const Base = S.Object({
    id: S.String(),
    name: S.String(),
    age: S.Int32(),
    alias: S.Optional(S.String()),
  });

  const omitted = S.Omit(Base, ['age']).$zod;
  const picked = S.Pick(Base, ['id', 'name']).$zod;
  const partial = S.Partial(Base).$zod;

  expect(omitted.safeParse({ id: '1', name: 'n' }).success).toBe(true);
  expect(omitted.safeParse({ id: '1', name: 'n', age: 1 }).success).toBe(false);

  expect(picked.safeParse({ id: '1', name: 'n' }).success).toBe(true);
  expect(picked.safeParse({ id: '1', name: 'n', age: 1 }).success).toBe(false);

  expect(partial.safeParse({}).success).toBe(true);
  expect(partial.safeParse({ id: '1' }).success).toBe(true);
});

// Application specific metadata, set by a method returning `this`
const PUB = Symbol('pub');
declare module '@supschema/common-types/DataValue.js' {
  interface DataValue {
    $testPub(): this;
  }
}
extend(S.DataValue, {
  $testPub() {
    return withSchemaMeta(this, PUB, true);
  },
});

it('modifies zod schemas with $zodWith', () => {
  const Trimmed = S.String({ description: 'Trimmed' }).$zodWith((z) => z.trim());
  const schema = S.Object({
    trimmed: Trimmed,
    pubLast: S.String()
      .$zodWith((z) => z.transform((v) => v.length))
      .$testPub(),
    chained: S.Int32()
      .$zodWith((z) => z.refine((v) => v > 0))
      .$testPub()
      .$zodWith((z) => z.default(1)),
    // Kept by option modifications
    unique: modifyOpts(S.String().$zodWith((z) => z.toUpperCase()), { title: 'Unique' }),
  });

  expectTypeOf<z.input<typeof schema.$zod>>().toEqualTypeOf<{
    trimmed: string;
    pubLast: string;
    chained?: number | undefined;
    unique: string;
  }>();
  expectTypeOf<z.output<typeof schema.$zod>>().toEqualTypeOf<{
    trimmed: string;
    pubLast: number;
    chained: number;
    unique: string;
  }>();
  expect(schema.$zod.parse({ trimmed: ' a ', pubLast: 'abc', unique: 'x' })).toEqual({
    trimmed: 'a',
    pubLast: 3,
    chained: 1,
    unique: 'X',
  });
  expect(schema.$zod.safeParse({ trimmed: '', pubLast: '', chained: 0, unique: '' }).success).toBe(false);
  expect(getSchemaMeta(schema.properties.pubLast, PUB)).toBe(true);
  // Metadata is applied before the modifier and kept
  expect(Trimmed.$zod.description).toBe('Trimmed');
  // The modifier is no option
  expect(Object.values(schema.properties.trimmed).some((v) => typeof v === 'function')).toBe(false);
});

it('handles unknown object keys', () => {
  const props = { a: S.String() };
  const value = { a: 'a', b: 1 };

  expect(S.Object(props).$zod.safeParse(value).success).toBe(false);
  expect(S.Object(props, { unknownKeys: 'strict' }).$zod.safeParse(value).success).toBe(false);
  expect(S.Object(props, { unknownKeys: 'strip' }).$zod.parse(value)).toEqual({ a: 'a' });
  expect(S.Object(props, { unknownKeys: 'passthrough' }).$zod.parse(value)).toEqual(value);
});
