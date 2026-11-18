import type { UnknownKeys } from './base.js';

// Internal: set by entry points like `@supschema/zod/strip`, not exported from the index

let defaultUnknownKeys: UnknownKeys | undefined;
/** Sets the runtime default of unknown object keys */
export const setDefaultUnknownKeys = (unknownKeys: UnknownKeys) => {
  if (defaultUnknownKeys && defaultUnknownKeys !== unknownKeys)
    throw new Error(`Default of unknown object keys is already set to ${defaultUnknownKeys}`);
  defaultUnknownKeys = unknownKeys;
};
export const getDefaultUnknownKeys = (): UnknownKeys => defaultUnknownKeys ?? 'strict';
