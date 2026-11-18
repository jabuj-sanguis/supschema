import { expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { S } from '@supschema/common-types';
import { setDefaultUnknownKeys } from './unknownKeys.js';
import './strip.js';

it('strips unknown object keys by default', () => {
  const value = { a: 'a', b: 1 };

  const schema = S.Object({ a: S.String() });

  expectTypeOf(schema.$zod).toEqualTypeOf<z.ZodObject<{ a: z.ZodString }, z.core.$strip>>();
  expect(schema.$zod.parse(value)).toEqual({ a: 'a' });
  expect(S.Object({ a: S.String() }, { unknownKeys: 'strict' }).$zod.safeParse(value).success).toBe(false);
  expect(() => setDefaultUnknownKeys('passthrough')).toThrow('Default of unknown object keys is already set to strip');
});
