export type SchemaPathGetter = (importMeta: ImportMeta) => string;
// Resolved lazily, `import.meta.url` is undefined when the module is transpiled to CommonJS, e.g. by drizzle-kit
let nodeModulesPath: string | undefined;
export const nodeModulesSchemaPathGetter: SchemaPathGetter = (m) => {
  nodeModulesPath ??= new URL('../..', import.meta.url).href;
  return m.url
    .replace(nodeModulesPath, '')
    .replace(/\.ts$/, '')
    .replace(/\/index$/, '');
};
