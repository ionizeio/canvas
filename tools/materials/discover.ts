import { relative, resolve } from "node:path";
import ts from "typescript";
import type { PublicRenderable } from "./types";

function reactElement(type: ts.Type, checker: ts.TypeChecker, visited = new Set<ts.Type>()): boolean {
  if (visited.has(type)) return false;
  visited.add(type);
  if (type.isUnionOrIntersection()) return type.types.some((part) => reactElement(part, checker, visited));
  // Null-only declarative children and scalar-returning components are legal React
  // output too. Do not require JSX syntax or a frame.
  if (type.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.BigIntLike)) return true;
  const symbol = type.getSymbol();
  // ReactNode expands to a union containing ReactElement. JSX.Element and
  // createElement's FunctionComponentElement extend ReactElement.
  if (symbol?.getName() === "ReactElement" && symbol.declarations?.some((node) => /[/\\]@types[/\\]react[/\\]/.test(node.getSourceFile().fileName))) return true;
  if (type.flags & ts.TypeFlags.Object) {
    const object = type as ts.ObjectType;
    if (object.objectFlags & ts.ObjectFlags.Reference) {
      const reference = type as ts.TypeReference;
      if (reference.target !== type && reactElement(reference.target, checker, visited)) return true;
      if (symbol?.getName() === "Promise" && checker.getTypeArguments(reference).some((value) => reactElement(value, checker, visited))) return true;
    }
    if (object.objectFlags & ts.ObjectFlags.ClassOrInterface) {
      return (checker.getBaseTypes(type as ts.InterfaceType) ?? []).some((base) => reactElement(base, checker, visited));
    }
  }
  return false;
}

function componentType(type: ts.Type, checker: ts.TypeChecker): boolean {
  // React 19 contexts are callable providers. They remain context APIs rather
  // than named UI components and must not inflate the component inventory.
  if (type.getProperty("Provider") && type.getProperty("Consumer") && type.getProperty("$$typeof")) return false;
  if (type.isUnionOrIntersection() && type.types.some((part) => componentType(part, checker))) return true;
  if (type.getCallSignatures().some((signature) => reactElement(checker.getReturnTypeOfSignature(signature), checker))) return true;
  return type.getConstructSignatures().some((signature) => {
    const instance = checker.getReturnTypeOfSignature(signature);
    const render = instance.getProperty("render");
    const declaration = render?.valueDeclaration ?? render?.declarations?.[0];
    if (!render || !declaration || !instance.getProperty("props")) return false;
    return checker.getTypeOfSymbolAtLocation(render, declaration).getCallSignatures()
      .some((method) => reactElement(checker.getReturnTypeOfSignature(method), checker));
  });
}

/** Resolve aliases, factories, forwardRef/class components and compound members. */
export function renderableExports(program: ts.Program, entryFile: string, root: string): PublicRenderable[] {
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entryFile);
  const module = source && checker.getSymbolAtLocation(source);
  if (!module) throw new Error(`Cannot inspect public entry: ${entryFile}`);
  const result: PublicRenderable[] = [];

  function visit(name: string, exported: ts.Symbol, ancestors: Set<ts.Type>) {
    if (!/^[A-Z]/.test(name.split(".").at(-1)!)) return;
    const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
    if (!declaration || !(symbol.flags & ts.SymbolFlags.Value)) return;
    const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
    if (!componentType(type, checker) || ancestors.has(type)) return;
    result.push({
      name,
      files: [...new Set((symbol.declarations ?? [declaration]).map((node) => relative(root, node.getSourceFile().fileName).replaceAll("\\", "/")))].sort(),
    });
    const next = new Set(ancestors).add(type);
    for (const member of type.getProperties()) visit(`${name}.${member.getName()}`, member, next);
  }

  for (const exported of checker.getExportsOfModule(module)) visit(exported.getName(), exported, new Set());
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function discoverPublicRenderables(root: string): PublicRenderable[] {
  const configPath = resolve(root, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (parsed.errors.length) throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"));
  const entry = resolve(root, "src/index.ts");
  const program = ts.createProgram([entry], { ...parsed.options, noEmit: true });
  return renderableExports(program, entry, root);
}
