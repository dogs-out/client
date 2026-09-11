#!/usr/bin/env node
// Finds hook calls that sit after a top-level `return` in a component body.
// Run directly, or via the conditionalHooks test which fails the build on a hit.
// React counts hooks per render, so such a hook runs on some renders and not
// others — "Rendered more hooks than during the previous render", a hard crash.
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name) && !full.includes('__tests__')) files.push(full);
  }
})('src');

const isHook = name => /^use[A-Z]/.test(name);
let found = 0;

for (const file of files) {
  const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const checkBody = body => {
    if (!body || !ts.isBlock(body)) return;
    let returnedAt = null;
    for (const stmt of body.statements) {
      // Only statements directly in the function body count as "top level".
      const hasTopLevelReturn = ts.isReturnStatement(stmt)
        || (ts.isIfStatement(stmt) && containsReturn(stmt.thenStatement));
      if (hasTopLevelReturn && returnedAt === null) {
        returnedAt = src.getLineAndCharacterOfPosition(stmt.getStart()).line + 1;
      }
      if (returnedAt !== null) {
        forEachHookCall(stmt, (name, node) => {
          const line = src.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          console.log(`${file}:${line}  ${name}() after a return at line ${returnedAt}`);
          found++;
        });
      }
    }
  };

  const containsReturn = node => {
    if (ts.isReturnStatement(node)) return true;
    if (ts.isBlock(node)) return node.statements.some(containsReturn);
    return false;
  };

  // Hook calls that belong to THIS function, not to a nested callback.
  const forEachHookCall = (node, visit) => {
    const walkNode = n => {
      if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n)) return;
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && isHook(n.expression.text)) {
        visit(n.expression.text, n);
      }
      ts.forEachChild(n, walkNode);
    };
    ts.forEachChild(node, walkNode);
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
        && ts.isIdentifier(node.expression.expression) && isHook(node.expression.expression.text)) {
      visit(node.expression.expression.text, node.expression);
    }
  };

  const visit = node => {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      checkBody(node.body);
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
}

console.log(found === 0 ? '\nNo conditional hooks found.' : `\n${found} conditional hook call(s).`);
