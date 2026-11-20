import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const templatePath = path.join(__dirname, "template.html");
const outputPath = path.join(rootDir, "index.html");

function indentLines(text, indent) {
  return text
    .replace(/\r\n/g, "\n")
    .trimEnd()
    .split("\n")
    .map((line) => (line.length > 0 ? `${indent}${line}` : ""))
    .join("\n");
}

async function resolveIncludes(html, baseDir) {
  const includeRegex = /^([ \t]*)<!--\s*@include\s+([^\s]+)\s*-->[ \t]*$/gm;
  const matches = [...html.matchAll(includeRegex)];
  if (matches.length === 0) return html;

  let result = html;
  for (const match of matches) {
    const [fullMatch, indent, relPath] = match;
    const targetPath = path.resolve(baseDir, relPath);
    const partialRaw = await readFile(targetPath, "utf8");
    const partialResolved = await resolveIncludes(partialRaw, path.dirname(targetPath));
    const indented = indentLines(partialResolved, indent);
    result = result.replace(fullMatch, indented);
  }
  return result;
}

async function inlineStylesheets(html, baseDir) {
  const linkBlockRegex =
    /(?:^[ \t]*<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>[ \t]*\r?\n?)+/gm;

  const matches = [...html.matchAll(linkBlockRegex)];
  let result = html;

  for (const match of matches) {
    const block = match[0];
    const indentMatch = block.match(/^([ \t]*)/);
    const indent = indentMatch ? indentMatch[1] : "";
    const hrefRegex = /href="([^"]+)"/g;
    const cssParts = [];

    for (const hrefMatch of block.matchAll(hrefRegex)) {
      const cssPath = path.resolve(baseDir, hrefMatch[1]);
      const cssContent = await readFile(cssPath, "utf8");
      cssParts.push(indentLines(cssContent, `${indent}  `));
    }

    const styleTag = `${indent}<style>\n${cssParts.join("\n\n")}\n${indent}</style>\n`;
    result = result.replace(block, styleTag);
  }

  return result;
}

async function inlineModuleScripts(html, baseDir) {
  const scriptRegex =
    /^([ \t]*)<script\s+type="module"\s+src="([^"]+)"\s*><\/script>[ \t]*$/gm;

  const matches = [...html.matchAll(scriptRegex)];
  let result = html;

  for (const match of matches) {
    const [fullMatch, indent, relPath] = match;
    const entryPath = path.resolve(baseDir, relPath);

    const buildResult = await Bun.build({
      entrypoints: [entryPath],
      target: "browser",
      format: "esm",
      plugins: [
        {
          name: "external-dist-bundle",
          setup(build) {
            build.onResolve({ filter: /^\.\/dist\/bundle\.js$/ }, (args) => ({
              path: args.path,
              external: true,
            }));
          },
        },
      ],
    });

    if (!buildResult.success) {
      const details = buildResult.logs.map((log) => log.message || String(log)).join("\n");
      throw new Error(`Failed to bundle ${relPath}:\n${details}`);
    }

    const bundledJs = (await buildResult.outputs[0].text()).replace(/<\/script>/gi, "<\\/script>");
    const indentedJs = indentLines(bundledJs, `${indent}  `);
    const scriptTag = `${indent}<script type="module">\n${indentedJs}\n${indent}</script>`;
    result = result.replace(fullMatch, scriptTag);
  }

  return result;
}

export async function buildIndexHtml() {
  let html = await readFile(templatePath, "utf8");
  html = await resolveIncludes(html, __dirname);
  html = await inlineStylesheets(html, __dirname);
  html = await inlineModuleScripts(html, __dirname);
  await writeFile(outputPath, html.replace(/\r\n/g, "\n"), "utf8");
  return { outputPath, bytes: Buffer.byteLength(html, "utf8") };
}

if (import.meta.main) {
  const { outputPath: out, bytes } = await buildIndexHtml();
  console.log(`Bundled ${path.relative(rootDir, out)} (${(bytes / 1024).toFixed(2)} KB)`);
}
