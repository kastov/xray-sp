// Download country flag SVGs at build time so they are served locally and the
// app has no runtime dependency on flagcdn.com. Idempotent (skips files that
// already exist) and non-fatal: on a network error the build proceeds and the
// frontend falls back to the flag emoji.
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'flags');
const CODES_URL = 'https://flagcdn.com/en/codes.json';
const svgUrl = (cc) => `https://flagcdn.com/${cc}.svg`;
const CONCURRENCY = 16;

async function main() {
  await mkdir(OUT, { recursive: true });

  let codes;
  try {
    const res = await fetch(CODES_URL, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Keep only real 2-letter country codes (drops US states like "us-ca").
    codes = Object.keys(json).filter((c) => /^[a-z]{2}$/.test(c));
  } catch (err) {
    console.warn(`[flags] could not fetch code list (${err.message}); skipping. ` +
      `Flags will fall back to emoji at runtime.`);
    return;
  }

  const existing = new Set(
    (await readdir(OUT).catch(() => [])).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)),
  );
  const todo = codes.filter((c) => !existing.has(c));
  if (todo.length === 0) {
    console.log(`[flags] ${existing.size} flags already present, nothing to download.`);
    return;
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (cc) => {
        try {
          const res = await fetch(svgUrl(cc), { signal: AbortSignal.timeout(20000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const svg = await res.text();
          await writeFile(join(OUT, `${cc}.svg`), svg);
          ok++;
        } catch (err) {
          fail++;
          console.warn(`[flags] ${cc} failed: ${err.message}`);
        }
      }),
    );
  }
  console.log(`[flags] downloaded ${ok} flags${fail ? `, ${fail} failed` : ''} (total ${existing.size + ok}).`);
}

main().catch((err) => {
  console.warn(`[flags] unexpected error: ${err.message}; continuing build.`);
});
