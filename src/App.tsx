import { useEffect, useMemo, useState } from 'react';
import {
  countSolutions,
  EMPTY_GRID,
  findConflicts,
  formatGrid,
  type Grid,
  parseGrid,
  SAMPLE_PUZZLE,
  solve,
} from './sudoku.ts';

function loadFromUrl(): Grid | null {
  const p = new URLSearchParams(location.search).get('p');
  if (!p) return null;
  const r = parseGrid(p);
  return r.ok ? r.grid : null;
}

const MIN_CLUES = 17; // the proven minimum for a uniquely-solvable Sudoku

export default function App() {
  const [given, setGiven] = useState<Grid>(() => loadFromUrl() ?? EMPTY_GRID.slice());
  const [pasteText, setPasteText] = useState('');
  const [copied, setCopied] = useState(false);

  const clueCount = useMemo(() => given.filter((n) => n !== 0).length, [given]);
  const conflicts = useMemo(() => findConflicts(given), [given]);

  const solution = useMemo(() => {
    if (conflicts.size > 0 || clueCount < MIN_CLUES) return null;
    return solve(given);
  }, [given, conflicts, clueCount]);

  const solutionCount = useMemo(() => {
    if (conflicts.size > 0 || clueCount < MIN_CLUES) return null;
    return countSolutions(given, 2);
  }, [given, conflicts, clueCount]);

  useEffect(() => {
    const qs = clueCount > 0 ? `?p=${formatGrid(given)}` : location.pathname;
    window.history.replaceState(null, '', qs);
  }, [given, clueCount]);

  const setCell = (i: number, v: number) => setGiven((g) => g.map((x, j) => (j === i ? v : x)));

  const applyPaste = () => {
    const r = parseGrid(pasteText);
    if (r.ok) setGiven(r.grid);
  };

  const clear = () => {
    setGiven(EMPTY_GRID.slice());
    setPasteText('');
  };
  const loadSample = () => setGiven([...SAMPLE_PUZZLE].map(Number));

  const share = () => {
    navigator.clipboard?.writeText(`${location.origin}${location.pathname}?p=${formatGrid(given)}`).then(
      () => setCopied(true),
      () => {},
    );
  };
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  let status: { kind: 'ok' | 'warn' | 'bad'; text: string } | null = null;
  if (conflicts.size > 0) {
    status = { kind: 'bad', text: 'Two of the same digit share a row, column or box — fix the highlighted cells.' };
  } else if (clueCount < MIN_CLUES) {
    status = { kind: 'warn', text: `Add at least ${MIN_CLUES} clues to solve (a Sudoku can't be uniquely solved with fewer) — ${clueCount} so far.` };
  } else if (solution === null) {
    status = { kind: 'bad', text: 'No solution exists for this puzzle — it contradicts itself somewhere.' };
  } else if (solutionCount === 2) {
    status = { kind: 'warn', text: 'This puzzle has more than one solution — showing one of them.' };
  } else {
    status = { kind: 'ok', text: 'Solved — this is the only solution.' };
  }

  const display = solution ?? given;

  return (
    <div className="app">
      <header>
        <h1>Sudoku Solver</h1>
        <p className="tag">
          Type in any 9×9 Sudoku and get the solution instantly — with conflict detection and a
          check for whether the puzzle has a unique answer.
        </p>
      </header>

      <div className="board-wrap">
        <div className="board">
          {display.map((v, i) => {
            const isGiven = given[i] !== 0;
            const isConflict = conflicts.has(i);
            const isFilled = solution != null && !isGiven;
            return (
              <input
                key={i}
                className={`cell ${isGiven ? 'given' : ''} ${isConflict ? 'conflict' : ''} ${isFilled ? 'filled' : ''}`}
                inputMode="numeric"
                maxLength={1}
                value={v || ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^1-9]/g, '');
                  setCell(i, raw ? Number(raw[raw.length - 1]) : 0);
                }}
                disabled={isFilled}
              />
            );
          })}
        </div>
      </div>

      {status && <p className={`status ${status.kind}`}>{status.text}</p>}

      <div className="actions">
        <button onClick={clear}>Clear</button>
        <button onClick={loadSample}>Load sample</button>
        <button onClick={share}>{copied ? 'Link copied' : 'Copy link'}</button>
      </div>

      <section className="card">
        <h2>Paste a puzzle</h2>
        <p className="muted">
          81 characters, 1–9 for a given digit and 0 or . for blank. Line breaks and other
          punctuation are ignored, so a nicely formatted grid pastes in fine.
        </p>
        <textarea
          rows={3}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="530070000600195000098000060800060003400803001700020006060000280000419005000080"
        />
        <button onClick={applyPaste}>Load</button>
      </section>

      <section className="explainer">
        <h2>How the solver works</h2>
        <p>
          It's a backtracking search: pick the empty square with the fewest legal digits left (a
          strategy called minimum-remaining-values), try each one, and recurse — backing up
          whenever a choice leads to a dead end. This heuristic is enough to solve almost any
          Sudoku, including deliberately hard ones, in well under a millisecond.
        </p>
        <h3>Why 17 clues?</h3>
        <p>
          It's been proven by exhaustive computer search that no 9×9 Sudoku with fewer than 17
          starting clues has exactly one solution — so this tool won't attempt to solve a puzzle
          with fewer, since the "solution" it found would just be one of many equally valid ones.
        </p>
        <footer>Runs entirely in your browser · nothing is uploaded · works offline</footer>
      </section>
    </div>
  );
}
