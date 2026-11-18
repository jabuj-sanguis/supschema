import { setDefaultUnknownKeys } from './unknownKeys.js';

export * from './index.js';

declare module './base.js' {
  interface ZodConfig {
    unknownKeys: 'strip';
  }
}

setDefaultUnknownKeys('strip');
