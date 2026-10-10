import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  minify: true,
  format: "esm",
  target: ["es2022"],
  outfile: "script.js",
  legalComments: "linked",
});
let html = await readFile("index.html", "utf8");
for (const asset of ["styles.css", "script.css", "script.js"]) {
  const version = createHash("sha256")
    .update(await readFile(asset))
    .digest("hex")
    .slice(0, 12);
  const escapedAsset = asset.replaceAll(".", "\\.");
  html = html.replace(
    new RegExp(`(href|src)="\\./${escapedAsset}(?:\\?v=[a-f0-9]+)?"`, "g"),
    `$1="./${asset}?v=${version}"`,
  );
}
await writeFile("index.html", html);
console.log(
  "Built static assets. The repository root is ready for GitHub Pages.",
);
