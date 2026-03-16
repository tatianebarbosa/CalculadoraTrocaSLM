import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const viteConfigChunkPath = path.resolve(currentDir, "..", "node_modules", "vite", "dist", "node", "chunks", "config.js");
const brokenSnippet = "return (code) => code.replace(`__DEFINES__`, definesReplacement);";
const fixedSnippet = "return (code) => code.replaceAll(`__DEFINES__`, definesReplacement);";

if (!fs.existsSync(viteConfigChunkPath)) {
  console.log("Vite ainda nao esta instalado. Patch ignorado.");
  process.exit(0);
}

const viteConfigChunk = fs.readFileSync(viteConfigChunkPath, "utf8");

if (viteConfigChunk.includes(fixedSnippet)) {
  console.log("Patch do Vite ja aplicado.");
  process.exit(0);
}

if (!viteConfigChunk.includes(brokenSnippet)) {
  throw new Error("Nao foi possivel localizar o trecho esperado para corrigir o Vite.");
}

fs.writeFileSync(viteConfigChunkPath, viteConfigChunk.replace(brokenSnippet, fixedSnippet), "utf8");
console.log("Patch do Vite aplicado com sucesso.");
