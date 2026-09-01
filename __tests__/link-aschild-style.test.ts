import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';

type JsxLike = ts.JsxElement | ts.JsxSelfClosingElement;

function getTagName(node: JsxLike): ts.JsxTagNameExpression | undefined {
  return ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
}

function getAttributes(node: JsxLike): ts.JsxAttributes | undefined {
  return ts.isJsxElement(node)
    ? node.openingElement.attributes
    : node.attributes;
}

function getChildren(node: JsxLike): readonly ts.JsxChild[] {
  return ts.isJsxElement(node) ? node.children : [];
}

function attrName(name: ts.JsxAttributeName): string | undefined {
  return ts.isIdentifier(name) ? name.text : undefined;
}

function collectTsxFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsxFiles(full, files);
    } else if (entry.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function findLinkWithAsChildSourceFiles(
  source: ts.SourceFile,
): { line: number }[] {
  const problems: { line: number }[] = [];

  function visit(node: ts.Node | undefined): void {
    if (!node) return;

    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = getTagName(node);
      const isLink =
        tagName && ts.isIdentifier(tagName) && tagName.text === 'Link';

      if (isLink) {
        const attributes = getAttributes(node);
        let hasAsChild = false;
        if (attributes) {
          for (const attr of attributes.properties) {
            if (ts.isJsxAttribute(attr) && attrName(attr.name) === 'asChild') {
              hasAsChild = true;
            }
          }
        }

        if (hasAsChild && ts.isJsxElement(node)) {
          const child = getChildren(node).find((c): c is ts.JsxElement =>
            ts.isJsxElement(c),
          );
          if (child) {
            const childAttributes = child.openingElement.attributes;
            const styleAttr = childAttributes.properties.find(
              (attr) =>
                ts.isJsxAttribute(attr) && attrName(attr.name) === 'style',
            );

            if (styleAttr && ts.isJsxAttribute(styleAttr)) {
              const initializer = styleAttr.initializer;
              if (
                initializer &&
                ts.isJsxExpression(initializer) &&
                initializer.expression &&
                ts.isArrayLiteralExpression(initializer.expression)
              ) {
                const { expression } = initializer;
                const char = expression.getStart(source);
                const line =
                  source.getLineAndCharacterOfPosition(char).line + 1;
                problems.push({ line });
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return problems;
}

describe('Link asChild style slot', () => {
  const srcDir = join(__dirname, '..', 'src');
  const files = collectTsxFiles(srcDir);

  it.each(files.map((file) => [file]))(
    'does not pass an array of styles to a direct child of <Link asChild> (%s)',
    (file) => {
      const sourceText = readFileSync(file, 'utf8');
      const source = ts.createSourceFile(
        file,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      expect(findLinkWithAsChildSourceFiles(source)).toEqual([]);
    },
  );
});
