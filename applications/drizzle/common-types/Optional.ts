import type { DRIZZLE_OPTIONAL } from '../base.js';

declare module '@supschema/common-types/object/Optional.js' {
  interface Optional<S> {
    /** Type-only brand, so optional properties of JSON objects can be told apart from nullable ones */
    readonly [DRIZZLE_OPTIONAL]: true;
  }
}
