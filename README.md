# Sudoku Solver

Type in any 9x9 Sudoku, get the solution instantly.

- **Backtracking + MRV heuristic** solver — solves near-instantly, even hard
  puzzles
- Live **conflict detection** on the grid as you type
- Checks whether the puzzle has a **unique solution**, more than one, or none
- Paste an 81-character puzzle string, or click cells directly
- Shareable link (`?p=`); nothing is uploaded, works offline

## Develop

```
npm install
npm run dev
npm run build      # tsc --noEmit && vite build
node --experimental-strip-types --test src/sudoku.test.mjs
```

The engine (`solve`, `countSolutions`, `findConflicts`, `parseGrid`) is in
`src/sudoku.ts`. 11 Node tests in `src/sudoku.test.mjs`, including a
self-verifying round-trip (generate a solved grid, remove cells, confirm the
solver recovers it) rather than relying on a memorised "known-correct"
puzzle answer.

## Deploy

Static assets on Cloudflare Workers (`wrangler.jsonc`). Live at
<https://sudoku-solver.correia95.workers.dev/>.
