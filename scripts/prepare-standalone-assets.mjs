import { access, cp, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const standalone = resolve(root, ".next/standalone");
const assets = [
  [resolve(root, ".next/static"), resolve(standalone, ".next/static")],
  [resolve(root, "public"), resolve(standalone, "public")],
];

await access(standalone);

for (const [source, destination] of assets) {
  await access(source);
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true, force: true });
}
