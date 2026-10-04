import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Source-level guard for sibling apps. This is not a full Rust module resolver.
const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = process.argv[2] ? path.resolve(process.argv[2]) : path.dirname(kit);
const apps = ["movie-explorer", "movie-folder-explorer", "repo-explorer", "site-bookmark-browser", "tauri-tree-file-explorer"];
const layers = ["app", "pages", "widgets", "features", "entities", "shared"];
const findings = [];
function files(directory, extensions) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(directory, entry.name);
    return entry.isDirectory() ? files(item, extensions) : extensions.includes(path.extname(item)) ? [item] : [];
  });
}
function report(file, line, message) {
  findings.push(`${path.relative(workspace, file)}:${line}: ${message}`);
}
for (const app of apps) {
  const repo = path.join(workspace, app);
  const desktop = fs.existsSync(path.join(repo, "apps/desktop/src")) ? path.join(repo, "apps/desktop") : repo;
  const source = path.join(desktop, "src");
  if (!fs.existsSync(source)) throw new Error(`Missing sibling app: ${app}`);
  let count = 0;
  for (const file of files(source, [".ts", ".tsx"])) {
    const parts = path.relative(source, file).split(path.sep);
    const ast = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function inspect(specifier) {
      const spec = specifier.text;
      const destination = spec.startsWith("@/") ? path.join(source, spec.slice(2))
        : spec.startsWith(".") ? path.resolve(path.dirname(file), spec) : null;
      if (!destination) return;
      const target = path.relative(source, destination).split(path.sep);
      if (!layers.includes(target[0])) return;
      count++;
      const line = ast.getLineAndCharacterOfPosition(specifier.getStart(ast)).line + 1;
      const sameSlice = parts[0] === target[0] && parts[1] === target[1];
      if (layers.includes(parts[0]) && layers.indexOf(parts[0]) > layers.indexOf(target[0])) {
        report(file, line, `upward import: ${spec}`);
      }
      if (parts[0] === target[0] && !["app", "shared"].includes(parts[0]) && !sameSlice) {
        report(file, line, `cross-slice import: ${spec}`);
      }
      if (!["app", "shared"].includes(target[0]) && !sameSlice && target.length > 2
          && !(target.length === 3 && /^index(?:\.[cm]?[jt]sx?)?$/.test(target[2]))) {
        report(file, line, `public API bypass: ${spec}`);
      }
    }
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) inspect(node.moduleSpecifier);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) inspect(node.arguments[0]);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  // Tests may instantiate real adapters; check production source before in-file tests.
  let rustCount = 0;
  for (const layer of ["domain", "application"]) {
    const moduleFile = path.join(desktop, "src-tauri/src", `${layer}.rs`);
    const candidates = [...files(path.join(desktop, "src-tauri/src", layer), [".rs"]), ...(fs.existsSync(moduleFile) ? [moduleFile] : [])];
    for (const file of candidates) {
      if (/(?:^|[/\\])tests(?:[/\\]|\.rs$)/.test(file)) continue;
      rustCount++;
      const code = fs.readFileSync(file, "utf8").split(/#\[cfg\(test\)\]/)[0];
      for (const match of code.matchAll(/\b(?:crate::infrastructure\b|tauri::|std::(?:fs|process|net)\b|explorer_(?:json_store|image_store|fs_core)::)/g)) {
        report(file, code.slice(0, match.index).split("\n").length, `external implementation in ${layer}: ${match[0]}`);
      }
    }
  }
  console.log(`${app}: ${count} local FSD references, ${rustCount} domain/application Rust files checked`);
}
if (findings.length) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Architecture boundary checks passed (static imports and selected Rust paths).");
}
