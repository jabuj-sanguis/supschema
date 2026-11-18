import {
  extractOptionsModification,
  getSchemaType,
  nodeModulesSchemaPathGetter,
  Schema,
  SchemaPathGetter,
} from '@supschema/core';
import {
  Children,
  render,
  stc,
  createContext,
  useContext,
  ReferenceOrContent,
  refkey,
  writeOutput,
} from '@alloy-js/core';
import { Output, StatementList } from '@alloy-js/core/stc';
import * as ts from '@alloy-js/typescript/stc';
import { importRef } from '@supschema/codegen-utils/alloy-js-typescript.js';

export const ImportPathGetterContext = createContext<SchemaPathGetter>();

export const SelfSourceValue = stc(({ value, declaration }: { value: unknown; declaration?: boolean }): Children => {
  if (typeof value !== 'object' || value === null) return ts.ValueExpression({ jsValue: value });

  let children: Children;
  if (value instanceof Schema) {
    const optionsModification = extractOptionsModification(value);
    if (optionsModification) {
      children = ts.FunctionCallExpression({
        target: importRef('@supschema/core', 'modifyOpts' satisfies keyof typeof import('@supschema/core')),
        args: [optionsModification.originalSchema, optionsModification.options].map((a) =>
          SelfSourceValue({ value: a }),
        ),
      });
    } else {
      const importPathGetter = useContext(ImportPathGetterContext) ?? nodeModulesSchemaPathGetter;
      const type = getSchemaType(value);
      children = ts.FunctionCallExpression({
        target: importRef(importPathGetter(type.importMeta)),
        args: type.getConstructorArgs(value).map((a) => SelfSourceValue({ value: a })),
      });
    }
  } else if (Array.isArray(value)) {
    children = ts.ValueExpression({ jsValue: value.map((i) => SelfSourceValue({ value: i })) });
  } else {
    children = ts.ObjectExpression({
      jsValue: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SelfSourceValue({ value: v })])),
    });
  }

  return declaration ? children : ReferenceOrContent({ refkey: refkey(value), children });
});

/**
 * Throws if writing `value` as source would have to write a function: options are data, a function option works at run
 * time, but the generated code would silently lack it. Declared schemas other than `value` itself are written by
 * reference, so their options don't matter here.
 */
const assertWritableAsSource = (
  value: unknown,
  path: string,
  declared: ReadonlySet<unknown>,
  visited = new Set<object>(),
): void => {
  if (typeof value === 'function') throw new Error(`${path}: a function can't be written as source`);
  if (typeof value !== 'object' || value === null || visited.has(value)) return;
  visited.add(value);
  const visit = (v: unknown, p: string) => {
    if (!declared.has(v)) assertWritableAsSource(v, p, declared, visited);
  };

  if (value instanceof Schema) {
    const optionsModification = extractOptionsModification(value);
    if (optionsModification) {
      visit(optionsModification.originalSchema, path);
      visit(optionsModification.options, path);
    } else {
      for (const arg of getSchemaType(value).getConstructorArgs(value)) visit(arg, path);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => visit(item, `${path}[${i}]`));
  } else {
    for (const [k, v] of Object.entries(value)) visit(v, `${path}.${k}`);
  }
};

export const generateSelfSourceFilesOutput = (
  files: Record<string, Record<string, Schema>>,
  importPathGetter?: SchemaPathGetter,
) => {
  const declared = new Set<unknown>(Object.values(files).flatMap((schemas) => Object.values(schemas)));
  for (const schemas of Object.values(files)) {
    for (const [name, schema] of Object.entries(schemas)) assertWritableAsSource(schema, name, declared);
  }

  return render(
    ImportPathGetterContext.ProviderStc({ value: importPathGetter }).children(
      Output().children(
        Object.entries(files).map(([path, schemas]) =>
          ts.SourceFile({ path }).children(
            StatementList({
              children: Object.entries(schemas).map(([name, s]) =>
                ts.VarDeclaration({
                  export: true,
                  name,
                  refkey: refkey(s),
                  initializer: SelfSourceValue({ value: s, declaration: true }),
                }),
              ),
            }),
          ),
        ),
      ),
    ),
  );
};

export const generateSelfSourceFiles = (
  files: Record<string, Record<string, Schema>>,
  importPathGetter?: SchemaPathGetter,
) => writeOutput(generateSelfSourceFilesOutput(files, importPathGetter));
