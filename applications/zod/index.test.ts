import { expect, expectTypeOf, it } from 'vitest';
import { extractOptionsModification, modifyOpts } from '@supschema/core';
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

it('handles unknown object keys', () => {
  const props = { a: S.String() };
  const value = { a: 'a', b: 1 };

  expect(S.Object(props).$zod.safeParse(value).success).toBe(false);
  expect(S.Object(props, { unknownKeys: 'strict' }).$zod.safeParse(value).success).toBe(false);
  expect(S.Object(props, { unknownKeys: 'strip' }).$zod.parse(value)).toEqual({ a: 'a' });
  expect(S.Object(props, { unknownKeys: 'passthrough' }).$zod.parse(value)).toEqual(value);
  // Encoding drops fields the schema doesn't list
  expect(z.encode(S.Object(props, { unknownKeys: 'strip' }).$zod, value as never)).toEqual({ a: 'a' });
});

it('trims strings before length and pattern checks', () => {
  const schema = S.String({ trim: true, minLength: 1, maxLength: 3, pattern: '^a' });

  expect(schema.$zod.parse('  abc ')).toBe('abc');
  expect(schema.$zod.safeParse('  ').success).toBe(false);
  expect(schema.$zod.safeParse(' abcd ').success).toBe(false);
  expect(S.String({ minLength: 1 }).$zod.parse('  ')).toBe('  ');
});

it('modifies zod schemas with $zodWith', () => {
  const Trimmed = S.String({ description: 'Trimmed' }).$zodWith((z) => z.trim());
  const schema = S.Object({
    trimmed: Trimmed,
    length: S.String().$zodWith((z) => z.transform((v) => v.length)),
    chained: S.Int32()
      .$zodWith((z) => z.refine((v) => v > 0))
      .$zodWith((z) => z.default(1)),
    // Kept by option modifications
    upper: modifyOpts(
      S.String().$zodWith((z) => z.toUpperCase()),
      { title: 'Upper' },
    ),
  });

  expectTypeOf(Trimmed.$zod).toEqualTypeOf<z.ZodString>();
  expectTypeOf(schema.properties.chained.$zod).toEqualTypeOf<z.ZodDefault<z.ZodInt32>>();
  expectTypeOf<z.input<typeof schema.$zod>>().toEqualTypeOf<{
    trimmed: string;
    length: string;
    chained?: number | undefined;
    upper: string;
  }>();
  expectTypeOf<z.output<typeof schema.$zod>>().toEqualTypeOf<{
    trimmed: string;
    length: number;
    chained: number;
    upper: string;
  }>();

  expect(schema.$zod.parse({ trimmed: ' a ', length: 'abc', upper: 'x' })).toEqual({
    trimmed: 'a',
    length: 3,
    chained: 1,
    upper: 'X',
  });
  expect(schema.$zod.safeParse({ trimmed: '', length: '', chained: 0, upper: '' }).success).toBe(false);
  // Metadata is applied before the modifier and kept
  expect(Trimmed.$zod.description).toBe('Trimmed');
  // The modifier is an option set with `modifyOpts`
  expect(extractOptionsModification(Trimmed)?.options).toEqual({ zodWith: [expect.any(Function)] });
});

it('applies $zodWith modifiers in order', () => {
  const schema = S.String()
    .$zodWith((z) => z.transform((v) => `${v}1`))
    .$zodWith((z) => z.transform((v) => `${v}2`));

  expectTypeOf<z.output<typeof schema.$zod>>().toEqualTypeOf<string>();
  expect(schema.$zod.parse('0')).toBe('012');
  expect(schema.zodWith).toHaveLength(2);
});

it('applies $zodWith of an object', () => {
  const Range = S.Object({ from: S.Int32(), to: S.Int32() }).$zodWith((z) =>
    z.refine((r) => r.from <= r.to, { path: ['to'], message: 'to before from' }),
  );
  const schema = S.Object({ range: Range });

  expectTypeOf<z.output<typeof schema.$zod>>().toEqualTypeOf<{ range: { from: number; to: number } }>();
  expect(schema.$zod.safeParse({ range: { from: 1, to: 2 } }).success).toBe(true);
  expect(schema.$zod.safeParse({ range: { from: 2, to: 1 } }).error?.issues[0]?.path).toEqual(['range', 'to']);
});
