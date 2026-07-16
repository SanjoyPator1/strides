#!/usr/bin/env node
// Thin bootstrap: loads the real (TypeScript) CLI via jiti, so the package ships
// as source with no separate build step, same as the rest of the monorepo.
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
await jiti.import('./cli.ts')
