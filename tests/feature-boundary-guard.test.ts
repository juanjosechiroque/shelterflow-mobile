import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

const SRC_ROOT = path.join(__dirname, '..', 'src');
const FEATURES_ROOT = path.join(SRC_ROOT, 'features');

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function ownFeature(filePath: string): string {
  return path.relative(FEATURES_ROOT, filePath).split(path.sep)[0];
}

// A private surface is a repository or a screen — matched by filename, not
// by directory, since screens live at the feature root (e.g. `*-screen.tsx`)
// and repositories do too (e.g. `*-repository.ts`).
function isPrivateSurfaceSpecifier(specifier: string): string | null {
  const match = /^@\/features\/([a-z-]+)\/([a-zA-Z-]+)$/.exec(specifier);
  if (!match) return null;
  const [, feature, basename] = match;
  if (/-repository$/.test(basename) || /-screen$/.test(basename)) {
    return feature;
  }
  return null;
}

function findCrossFeatureViolations(
  source: string,
  filePath: string,
): string[] {
  const feature = ownFeature(filePath);
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

  const violations: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const specifier = node.moduleSpecifier.text;
      const importedFeature = isPrivateSurfaceSpecifier(specifier);
      if (importedFeature && importedFeature !== feature) {
        violations.push(specifier);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

describe('feature boundary isolation', () => {
  it('never imports a sibling feature repository or screen directly', () => {
    const offenders: string[] = [];

    for (const file of walk(FEATURES_ROOT)) {
      const relative = path.relative(SRC_ROOT, file);
      const source = fs.readFileSync(file, 'utf8');
      const violations = findCrossFeatureViolations(source, file);
      if (violations.length > 0) {
        offenders.push(`${relative} -> ${violations.join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  describe('violation detector', () => {
    it('flags a sibling feature repository import', () => {
      const source = `
        import { getFoo } from '@/features/animals/animal-repository';
      `;
      const violations = findCrossFeatureViolations(
        source,
        path.join(FEATURES_ROOT, 'adoptions', 'example.ts'),
      );
      expect(violations).toEqual(['@/features/animals/animal-repository']);
    });

    it('flags a sibling feature screen import', () => {
      const source = `
        import { AnimalsScreen } from '@/features/animals/animals-screen';
      `;
      const violations = findCrossFeatureViolations(
        source,
        path.join(FEATURES_ROOT, 'adoptions', 'example.ts'),
      );
      expect(violations).toEqual(['@/features/animals/animals-screen']);
    });

    it('allows a same-feature repository or screen import', () => {
      const source = `
        import { getFoo } from '@/features/animals/animal-repository';
        import { AnimalsScreen } from '@/features/animals/animals-screen';
      `;
      const violations = findCrossFeatureViolations(
        source,
        path.join(FEATURES_ROOT, 'animals', 'example.ts'),
      );
      expect(violations).toEqual([]);
    });

    it('allows a sibling feature query-key, type, or component import', () => {
      const source = `
        import { animalKeys } from '@/features/animals/animal-query-keys';
        import type { Animal } from '@/features/animals/types';
        import { CandidateRow } from '@/features/candidates/components/candidate-row';
      `;
      const violations = findCrossFeatureViolations(
        source,
        path.join(FEATURES_ROOT, 'adoptions', 'example.ts'),
      );
      expect(violations).toEqual([]);
    });
  });
});
