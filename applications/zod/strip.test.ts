import { expect, it } from 'vitest';
import { S } from '@supschema/common-types';
import { setDefaultUnknownKeys } from './strip.js';

it('strips unknown object keys by default', () => {
  const value = { a: 'a', b: 1 };

  expect(S.Object({ a: S.String() }).$zod.parse(value)).toEqual({ a: 'a' });
  expect(S.Object({ a: S.String() }, { unknownKeys: 'strict' }).$zod.safeParse(value).success).toBe(false);
  expect(() => setDefaultUnknownKeys('passthrough')).toThrow('Default of unknown object keys is already set to strip');
});
