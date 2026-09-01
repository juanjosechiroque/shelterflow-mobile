import { access, readdir, stat } from 'fs/promises';
import path from 'path';

const appDir = path.resolve(__dirname, '..', 'src', 'app');

async function collect(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await collect(full)));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      found.push(full);
    }
  }

  return found;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    const targetStat = await stat(target);
    return targetStat.isDirectory();
  } catch {
    return false;
  }
}

describe('Expo Router route structure', () => {
  it('does not mix a dynamic route file with a dynamic route directory of the same name', async () => {
    const files = await collect(appDir);
    const conflicts: string[] = [];

    for (const file of files) {
      const fileName = path.basename(file);
      const dynamicFile = fileName.match(/^\[(.+)\]\.(tsx?|jsx?)$/);
      if (!dynamicFile) continue;

      const paramName = dynamicFile[1];
      const siblingDir = path.join(path.dirname(file), `[${paramName}]`);

      if (await exists(siblingDir)) {
        conflicts.push(
          `Route file "${path.relative(
            appDir,
            file,
          )}" conflicts with sibling directory "[${paramName}]/". Both map to the same dynamic segment; use an index.tsx inside the directory instead.`,
        );
      }
    }

    expect(conflicts).toEqual([]);
  });
});
