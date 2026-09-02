import fs from 'fs';
import path from 'path';

const rootLayoutPath = path.resolve(
  __dirname,
  '..',
  'src',
  'app',
  '_layout.tsx',
);

describe('Root layout uses Stack.Protected for navigation guarding', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(rootLayoutPath, 'utf-8');
  });

  it('imports Stack from expo-router', () => {
    expect(source).toMatch(/from\s+['"]expo-router['"]/);
    expect(source).toMatch(/\bStack\b/);
  });

  it('mounts a Stack.Protected guard that flips with the auth status', () => {
    const guardCalls = Array.from(
      source.matchAll(/<Stack\.Protected\s+guard=\{([^}]+)\}/g),
    ).map((match) => match[1].trim());

    expect(guardCalls).toContain('isAuthenticated');
    expect(guardCalls).toContain('!isAuthenticated');
  });

  it('keeps the tabs and settings screens inside the authenticated guard', () => {
    const guardBlock = source.match(
      /<Stack\.Protected\s+guard=\{isAuthenticated\}>([\s\S]*?)<\/Stack\.Protected>/,
    );
    expect(guardBlock).not.toBeNull();
    expect(guardBlock?.[1]).toMatch(/name="\(tabs\)"/);
    expect(guardBlock?.[1]).toMatch(/name="settings"/);
  });

  it('keeps the login screen inside the unauthenticated guard', () => {
    const guardBlock = source.match(
      /<Stack\.Protected\s+guard=\{!isAuthenticated\}>([\s\S]*?)<\/Stack\.Protected>/,
    );
    expect(guardBlock).not.toBeNull();
    expect(guardBlock?.[1]).toMatch(/name="\(auth\)\/login"/);
  });
});
