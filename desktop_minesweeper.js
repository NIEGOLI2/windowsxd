export const MINE_COUNT = 10;
export const GRID_SIZE = 10;

export function initMinesweeper() {
  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[r][c] = { mine: false, revealed: false, flagged: false, count: 0 };
    }
  }
  let placed = 0;
  while (placed < MINE_COUNT) {
    const r = Math.floor(Math.random() * GRID_SIZE);
    const c = Math.floor(Math.random() * GRID_SIZE);
    if (!grid[r][c].mine) {
      grid[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c].mine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && grid[nr][nc].mine) count++;
          }
        }
        grid[r][c].count = count;
      }
    }
  }
  return grid;
}

export function revealMine(win, r, c) {
  if (win.gameOver || win.mineGrid[r][c].revealed || win.mineGrid[r][c].flagged) return false;
  win.mineGrid[r][c].revealed = true;
  if (win.mineGrid[r][c].mine) {
    win.gameOver = true;
    return true;
  }
  if (win.mineGrid[r][c].count === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) revealMine(win, nr, nc);
      }
    }
  }
}