import fs from 'node:fs';
import path from 'node:path';

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

// A data fixture import points at one of the feature-level mock-* data files
// (e.g. mock-animals, mock-candidates) but not at the mock-repository
// implementation itself.
function isDataFixtureImport(specifier: string): boolean {
  const basename = specifier.split('/').pop() ?? '';
  const stem = basename.replace(/\.(ts|tsx)$/, '');
  return /^mock-/.test(stem) && stem !== 'mock-repository';
}

describe('production mock-import isolation', () => {
  it('only allows the explicit mock repository to import mock data fixtures', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC_ROOT)) {
      const relative = path.relative(SRC_ROOT, file);
      const source = fs.readFileSync(file, 'utf8');

      const importRegex = /\bfrom\s+['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(source)) !== null) {
        const specifier = match[1];
        if (isDataFixtureImport(specifier)) {
          if (path.resolve(file) !== path.resolve(MOCK_REPOSITORY)) {
            offenders.push(`${relative} -> ${specifier}`);
          }
        }
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
});
