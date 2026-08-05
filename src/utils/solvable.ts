/**
 * Sliding-puzzle solvability check.
 *
 * A flat board is represented as an array of length n*n where `0` marks the
 * empty slot and every other cell holds the tile's *home* index (1..n*n-1).
 *
 * Classic (n-puzzle) solvability rule:
 *  - Count inversions: pairs (i, j) with i < j where board[i] and board[j]
 *    are both non-empty and board[i] > board[j].
 *  - If the grid width is odd, the puzzle is solvable iff the inversion
 *    count is even.
 *  - If the grid width is even, the puzzle is solvable iff
 *    (inversions + rowOfBlankFromBottom) is odd.
 *
 * This module exists independently of the shuffle strategy so it can be
 * unit-tested on its own and reused if puzzles are ever generated another
 * way (e.g. server-side, or from a saved/edited board).
 */
export function countInversions(board: number[]): number {
  const values = board.filter((v) => v !== 0);
  let inversions = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] > values[j]) inversions++;
    }
  }
  return inversions;
}

export function isSolvable(board: number[], gridSize: number): boolean {
  const inversions = countInversions(board);
  const blankIndex = board.indexOf(0);
  const blankRowFromTop = Math.floor(blankIndex / gridSize);
  const blankRowFromBottom = gridSize - blankRowFromTop;

  if (gridSize % 2 === 1) {
    return inversions % 2 === 0;
  }
  return (inversions + blankRowFromBottom) % 2 === 1;
}
