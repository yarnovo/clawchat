import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { zipSync } from "fflate";

/**
 * Pack a skill directory into a ZIP buffer (compatible with ClawHub format).
 * Only includes text files (SKILL.md, scripts, references, etc.).
 * Excludes _meta.json, .git, node_modules.
 */
export async function packSkillZip(skillDir: string): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  await collectFiles(skillDir, skillDir, files);
  return zipSync(files);
}

const EXCLUDE = new Set(["_meta.json", ".git", "node_modules", ".clawhub", ".clawdhub"]);

async function collectFiles(
  root: string,
  dir: string,
  out: Record<string, Uint8Array>,
): Promise<void> {
  const entries = await readdir(dir);
  for (const name of entries) {
    if (EXCLUDE.has(name) || name.startsWith(".")) continue;
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      await collectFiles(root, full, out);
    } else if (s.isFile()) {
      const rel = relative(root, full);
      const content = await readFile(full);
      out[rel] = new Uint8Array(content);
    }
  }
}
