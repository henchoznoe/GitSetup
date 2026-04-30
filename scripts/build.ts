/**
 * File: scripts/build.ts
 * Description: Bundles the CLI into a single executable JS file via esbuild
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { buildSync } from 'esbuild'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))

const shimBanner = [
  '#!/usr/bin/env node',
  'import { createRequire as __createRequire } from "node:module";',
  'const require = __createRequire(import.meta.url);',
].join('\n')

buildSync({
  entryPoints: [resolve(root, 'src/bin/git-setup.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: resolve(root, 'dist/git-setup.js'),
  banner: { js: shimBanner },
  sourcemap: false,
  minify: false,
  external: [],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})

console.log('Built dist/git-setup.js')
