import { expect, it } from 'vitest';
import { extractOptionsModification, getSchemaMeta, modifyOpts, withSchemaMeta } from './optionsModification.js';
import { Schema } from './Schema.js';

it('returns a new schema with merged options and preserves prototype', () => {
  const base = Schema({ foo: 'bar' });
  const modified = modifyOpts(base, { baz: 123 });

  expect(modified).toEqual({ foo: 'bar', baz: 123 });
  expect(modified).not.toBe(base);
  expect(Object.getPrototypeOf(modified)).toBe(Object.getPrototypeOf(base));
  expect(modified).toBeInstanceOf(Schema);
});

it('stores modification metadata on a non-enumerable property', () => {
  const base = Schema({ alpha: true });
  const modified = modifyOpts(base, { beta: false });

  expect(modified).toEqual({ alpha: true, beta: false });
  expect(Object.getOwnPropertyDescriptor(modified, '$modification')).toMatchObject({ enumerable: false });
});

it('extracts original schema and option diff', () => {
  const base = Schema({ a: 1 });
  const modified = modifyOpts(base, { b: 2 });
  const metadata = extractOptionsModification(modified);

  expect(metadata).toBeDefined();
  expect(metadata?.originalSchema).toBe(base);
  expect(metadata?.options).toEqual({ b: 2 });
});

it('returns undefined when schema has no modification metadata', () => {
  const schema = Schema({ c: 3 });

  expect(extractOptionsModification(schema)).toBeUndefined();
});

it('preserves symbol and non-enumerable properties', () => {
  const meta = Symbol('meta');
  const base = withSchemaMeta(Schema({ a: 1 }), meta, 'value');
  Object.defineProperty(base, 'hidden', { value: true, enumerable: false });
  const modified = modifyOpts(base, { b: 2 });

  expect(getSchemaMeta(modified, meta)).toBe('value');
  expect(Object.getOwnPropertyDescriptor(modified, 'hidden')).toMatchObject({ value: true, enumerable: false });
  expect(extractOptionsModification(modified)?.originalSchema).toBe(base);
});

it('stores metadata without changing options or modification', () => {
  const meta = Symbol('meta');
  const other = Symbol('other');
  const base = Schema({ a: 1 });
  const modified = modifyOpts(base, { b: 2 });
  const withMeta = withSchemaMeta(withSchemaMeta(modified, meta, 1), other, 2);
  const replaced = withSchemaMeta(withMeta, meta, 3);

  expect(withMeta).toEqual({ a: 1, b: 2 });
  expect(Object.keys(withMeta)).toEqual(['a', 'b']);
  expect(withMeta).toBeInstanceOf(Schema);
  expect(extractOptionsModification(withMeta)).toBe(extractOptionsModification(modified));
  expect(getSchemaMeta(withMeta, meta)).toBe(1);
  expect(getSchemaMeta(replaced, meta)).toBe(3);
  expect(getSchemaMeta(replaced, other)).toBe(2);
  expect(getSchemaMeta(modified, meta)).toBeUndefined();
  expect(getSchemaMeta(base, meta)).toBeUndefined();
});
