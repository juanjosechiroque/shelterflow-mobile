import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

const SRC_ROOT = path.join(__dirname, '..', 'src');

const MOCK_REPOSITORY = path.join(
  SRC_ROOT,
  'features',
  'prototype-flow',
  'mock-repository.ts',
);

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

// A fixture specifier points at a feature-level mock data file (mock-animals,
// mock-candidates, etc.) but never at the mock-repository implementation.
function isFixtureSpecifier(specifier: string): boolean {
  const basename = specifier.split('/').pop() ?? '';
  const stem = basename.replace(/\.(ts|tsx)$/, '');
  return /^mock-/.test(stem) && stem !== 'mock-repository';
}

// Returns every fixture module specifier referenced from a source string.
function findFixtureSpecifiers(source: string, filePath: string): string[] {
  const scriptKind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  const specifiers = new Set<string>();

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const statement = node as ts.ImportDeclaration | ts.ExportDeclaration;
      const specifier = statement.moduleSpecifier;
      if (specifier && ts.isStringLiteral(specifier)) {
        if (isFixtureSpecifier(specifier.text)) specifiers.add(specifier.text);
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      // `import data = require('...')` stores the module specifier directly on
      // the external module reference expression.
      const reference = node.moduleReference;
      if (ts.isExternalModuleReference(reference)) {
        const expression = reference.expression;
        if (
          ts.isStringLiteral(expression) &&
          isFixtureSpecifier(expression.text)
        ) {
          specifiers.add(expression.text);
        }
      }
    } else if (ts.isCallExpression(node)) {
      const calleeText = node.expression.getText(sourceFile);
      const isRequire = calleeText === 'require';
      const isDynamicImport =
        node.expression.kind === ts.SyntaxKind.ImportKeyword;
      if (isRequire || isDynamicImport) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg) && isFixtureSpecifier(arg.text)) {
          specifiers.add(arg.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return Array.from(specifiers);
}

describe('production mock-import isolation', () => {
  it('only allows the explicit mock repository to import mock data fixtures', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC_ROOT)) {
      const relative = path.relative(SRC_ROOT, file);
      const source = fs.readFileSync(file, 'utf8');
      const facts = findFixtureSpecifiers(source, file);
      if (
        facts.length > 0 &&
        path.resolve(file) !== path.resolve(MOCK_REPOSITORY)
      ) {
        offenders.push(`${relative} -> ${facts.join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not flag the mock repository itself', () => {
    const source = fs.readFileSync(MOCK_REPOSITORY, 'utf8');
    expect(source).toMatch(/mock-animals/);
    expect(source).toMatch(/mock-candidates/);
    expect(source).toMatch(/mock-evaluations/);
    expect(source).toMatch(/mock-meetings/);
    expect(source).toMatch(/mock-adoptions/);
    expect(source).toMatch(/mock-followups/);
    expect(source).toMatch(/mock-timeline/);
  });

  describe('fixture specifier detector', () => {
    it('detects a default and a named import from a mock fixture', () => {
      const source = `
        import defaultAnimals from '@/features/animals/mock-animals';
        import { mockShelter } from '@/features/animals/mock-shelter';
      `;
      const specifiers = findFixtureSpecifiers(source, '/virtual/example.ts');
      expect(specifiers).toContain('@/features/animals/mock-animals');
      expect(specifiers).toContain('@/features/animals/mock-shelter');
    });

    it('detects a side-effect import of a mock fixture', () => {
      const source = `
        import '@/features/animals/mock-timeline';
      `;
      const specifiers = findFixtureSpecifiers(source, '/virtual/example.ts');
      expect(specifiers).toContain('@/features/animals/mock-timeline');
    });

    it('detects an import-equals and a require call of a mock fixture', () => {
      const source = `
        import adoptions = require('@/features/adoptions/mock-adoptions');
        const candidates = require('@/features/candidates/mock-candidates');
      `;
      const specifiers = findFixtureSpecifiers(source, '/virtual/example.ts');
      expect(specifiers).toContain('@/features/adoptions/mock-adoptions');
      expect(specifiers).toContain('@/features/candidates/mock-candidates');
    });

    it('detects a dynamic import with a string literal of a mock fixture', () => {
      const source = `
        void import('@/features/meetings/mock-meetings');
      `;
      const specifiers = findFixtureSpecifiers(source, '/virtual/example.ts');
      expect(specifiers).toContain('@/features/meetings/mock-meetings');
    });

    it('does not treat the mock repository implementation as a fixture', () => {
      const source = `
        import { createMockPrototypeRepository } from './mock-repository';
        call(createMockPrototypeRepository());
      `;
      const specifiers = findFixtureSpecifiers(source, '/virtual/example.ts');
      expect(specifiers).toEqual([]);
    });
  });
});
