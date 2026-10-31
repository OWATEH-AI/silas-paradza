import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const bundle = resolve(".wrangler", "pages-worker-bundle", "entry.js");
const outputDirectory = resolve("dist", "client");

await mkdir(outputDirectory, { recursive: true });
await copyFile(bundle, resolve(outputDirectory, "_worker.js"));
await rm(resolve(".wrangler", "deploy", "config.json"), { force: true });
