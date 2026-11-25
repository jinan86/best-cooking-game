// Sizzle & Serve — the hand-in program (Node 22, standard library only).
//
// It hands the entry to make.fun: copy this repository's game/ and screenshots/ into the
// output directory and write /output/dossier.json, the summary the judge reads, using the
// vendored make.fun library (vendor/makefun-game.ts, copied from the kit unchanged).
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program runs twice in the grader and both runs must write the same bytes, so it
// does nothing time- or environment-dependent: no timestamps, no random data, just copies.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps are the gate's own: the dossier text is capped at 160 KiB, at most 4 screenshots
// of at most 256 KiB each, and game/ stays within 993 entries and 48 MiB with paths under
// 1,000 bytes — the same limits the scorer enforces, so this fails where the scorer would.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
