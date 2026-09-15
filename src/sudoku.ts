// A general 9x9 Sudoku solver: backtracking search with a minimum-remaining-
// values (MRV) heuristic — always branch on the empty cell with the fewest
// legal digits, which prunes the search dramatically and solves ordinary
// puzzles (and even very hard ones) in well under a millisecond.

export type Grid = number[]; // length 81, row-major, 0 = empty

export const EMPTY_GRID: Grid = new Array(81).fill(0);

function rowOf(i: number): number {
  return Math.floor(i / 9);
}
function colOf(i: number): number {
  return i % 9;
}
function boxOf(i: number): number {
  return Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
}

const ROW_CELLS: number[][] = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c));
const COL_CELLS: number[][] = Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c));
const BOX_CELLS: number[][] = Array.from({ length: 9 }, (_, b) => {
  const br = Math.floor(b / 3) * 3;
  const bc = (b % 3) * 3;
  const cells: number[] = [];
  for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) cells.push(r * 9 + c);
  return cells;
});

function unitsFor(i: number): number[][] {
  return [ROW_CELLS[rowOf(i)], COL_CELLS[colOf(i)], BOX_CELLS[boxOf(i)]];
}

function usedMask(grid: Grid, idx: number): number {
  let mask = 0;
  for (const unit of unitsFor(idx)) {
    for (const i of unit) if (grid[i]) mask |= 1 << (grid[i] - 1);
  }
  return mask;
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}

/** Every cell that currently duplicates a value within its row, column or box. */
export function findConflicts(grid: Grid): Set<number> {
  const bad = new Set<number>();
  for (const unit of [...ROW_CELLS, ...COL_CELLS, ...BOX_CELLS]) {
    const seen = new Map<number, number[]>();
    for (const idx of unit) {
      const v = grid[idx];
      if (!v) continue;
      (seen.get(v) ?? seen.set(v, []).get(v)!).push(idx);
    }
    for (const idxs of seen.values()) if (idxs.length > 1) idxs.forEach((i) => bad.add(i));
  }
  return bad;
}

/** Pick the empty cell with the fewest legal digits. Returns null if the grid is full. */
function pickCell(g: Grid): { index: number; mask: number } | null {
  let best = -1;
  let bestCount = 10;
  let bestMask = 0;
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue;
    const avail = 0x1ff & ~usedMask(g, i);
    const count = popcount(avail);
    if (count === 0) return { index: i, mask: 0 }; // dead end, signalled via mask 0
    if (count < bestCount) {
      best = i;
      bestCount = count;
      bestMask = avail;
      if (count === 1) break;
    }
  }
  return best === -1 ? null : { index: best, mask: bestMask };
}

/** Solve in place, mutating `g`. Returns true if solved. */
function backtrack(g: Grid): boolean {
  const cell = pickCell(g);
  if (cell === null) return true; // no empty cells left
  if (cell.mask === 0) return false; // a cell has no legal digit
  for (let d = 1; d <= 9; d++) {
    if (cell.mask & (1 << (d - 1))) {
      g[cell.index] = d;
      if (backtrack(g)) return true;
      g[cell.index] = 0;
    }
  }
  return false;
}

/** Solve a puzzle. Returns the completed grid, or null if it has no solution. */
export function solve(grid: Grid): Grid | null {
  if (grid.length !== 81) return null;
  if (findConflicts(grid).size > 0) return null;
  const g = grid.slice();
  return backtrack(g) ? g : null;
}

/** Count solutions up to `cap` (default 2, enough to tell "unique" from "not"). */
export function countSolutions(grid: Grid, cap = 2): number {
  if (grid.length !== 81 || findConflicts(grid).size > 0) return 0;
  const g = grid.slice();
  let count = 0;
  function rec(): boolean {
    const cell = pickCell(g);
    if (cell === null) {
      count++;
      return count >= cap;
    }
    if (cell.mask === 0) return false;
    for (let d = 1; d <= 9; d++) {
      if (cell.mask & (1 << (d - 1))) {
        g[cell.index] = d;
        if (rec()) return true;
        g[cell.index] = 0;
      }
    }
    return false;
  }
  rec();
  return count;
}

export type ParseResult = { ok: true; grid: Grid } | { ok: false; error: string };

/** Read any text containing exactly 81 digit/blank characters (0 or '.' = blank); everything else (whitespace, |, -, newlines) is ignored as formatting. */
export function parseGrid(text: string): ParseResult {
  const chars = [...text].filter((ch) => /[0-9.]/.test(ch));
  if (chars.length !== 81) {
    return { ok: false, error: `Expected 81 cells (1-9 or . for blank), found ${chars.length}.` };
  }
  return { ok: true, grid: chars.map((ch) => (ch === '.' ? 0 : Number(ch))) };
}

export function formatGrid(grid: Grid): string {
  return grid.map((n) => (n ? String(n) : '.')).join('');
}

export function isFull(grid: Grid): boolean {
  return grid.every((n) => n !== 0);
}

export function isSolved(grid: Grid): boolean {
  return isFull(grid) && findConflicts(grid).size === 0;
}

// A well-known example puzzle, useful as a "try a sample" button.
export const SAMPLE_PUZZLE =
  '530070000' + '600195000' + '098000060' + '800060003' + '400803001' + '700020006' + '060000280' + '000419005' + '000080079';
