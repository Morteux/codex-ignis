// Regenerates StellarisAssetsFileTree.txt from the StellarisAssets repository (T2524):
// node tools/extract/assets_file_tree.mjs [ASSETS_DIR] [--commit REV]
// Lists the files git knows there (tracked and new, not ignored), or those of a commit with
// --commit; folders first, then files, each in localeCompare order, LF line endings.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const commitAt = argv.indexOf("--commit");
const commit = commitAt >= 0 ? argv.splice(commitAt, 2)[1] : null;
const assets = argv[0] || "C:/Users/ignis/OneDrive/Documentos/StellarisAssets";

const list = commit ? ["ls-tree", "-r", "--name-only", commit] : ["ls-files", "--cached", "--others", "--exclude-standard"];
const paths = execFileSync("git", ["-C", assets, "-c", "core.quotepath=off", ...list], { encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean);

const tree = {};
for (const path of paths) {
  let node = tree;
  const parts = path.split("/");
  for (const folder of parts.slice(0, -1)) node = node[folder + "/"] ??= {};
  node[parts.at(-1)] = null;
}

const lines = ["StellarisAssets/"];
function walk(node, prefix) {
  const keys = Object.keys(node).sort((a, b) => (node[a] === null) - (node[b] === null) || a.localeCompare(b));
  keys.forEach((key, i) => {
    const last = i === keys.length - 1;
    lines.push(prefix + (last ? "└── " : "├── ") + key);
    if (node[key] !== null) walk(node[key], prefix + (last ? "    " : "│   "));
  });
}
walk(tree, "");
writeFileSync(join(root, "StellarisAssetsFileTree.txt"), lines.join("\n"));
console.log(`StellarisAssetsFileTree.txt: ${paths.length} files`);
