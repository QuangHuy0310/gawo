import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { RoomState, PLAYER_CONFIGS, PlayerConfig } from '../types.js';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Target } from 'lucide-react';

// Generates column label: A-Z, AA-AD for 30 columns
export function getColumnLabel(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  return 'A' + String.fromCharCode(65 + (index - 26));
}

interface CaroCellProps {
  r: number;
  c: number;
  cellValue: number | null;
  isLastMove: boolean;
  isWinningCell: boolean;
  isMyTurn: boolean;
  colLabel: string;
  myConfig: PlayerConfig | null;
  onCellClick: (row: number, col: number) => void;
}

// Memoized Cell component to prevent re-rendering 900 cells on hover/unrelated state changes
const CaroCell = React.memo<CaroCellProps>(({
  r,
  c,
  cellValue,
  isLastMove,
  isWinningCell,
  isMyTurn,
  colLabel,
  myConfig,
  onCellClick,
}) => {
  const isOccupied = cellValue !== null;
  const playerCfg = isOccupied ? PLAYER_CONFIGS[cellValue] : null;

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={`Ô ${colLabel}${r + 1}, ${
        isOccupied ? `quân ${playerCfg?.symbol}` : 'ô trống'
      }`}
      disabled={!isMyTurn || isOccupied}
      className={`caro-cell ${isOccupied ? 'occupied' : ''} ${
        isLastMove ? 'last-move' : ''
      } ${isWinningCell ? 'winning-cell' : ''} ${!isMyTurn ? 'disabled' : ''}`}
      onClick={() => onCellClick(r, c)}
      style={{
        color: playerCfg?.color || 'transparent',
      }}
    >
      {isOccupied && playerCfg && <span>{playerCfg.symbol}</span>}
    </button>
  );
});

CaroCell.displayName = 'CaroCell';

interface GameBoardProps {
  roomState: RoomState;
  myIndex: number | null;
  onCellClick: (row: number, col: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  roomState,
  myIndex,
  onCellClick,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasAutoCentered = useRef<boolean>(false);

  const { board, boardSize, currentTurnIndex, status, winningLine, lastMove, moveCount } = roomState;

  const isMyTurn = status === 'PLAYING' && myIndex !== null && myIndex === currentTurnIndex;
  const myConfig = myIndex !== null ? PLAYER_CONFIGS[myIndex] : null;

  // Set of winning coordinates for O(1) lookup
  const winningCoordinatesSet = useMemo(() => {
    const set = new Set<string>();
    if (winningLine) {
      for (const [r, c] of winningLine) {
        set.add(`${r},${c}`);
      }
    }
    return set;
  }, [winningLine]);

  // Column letters: A-Z, AA-AD for 30 columns
  const colLetters = useMemo(() => {
    return Array.from({ length: boardSize }, (_, i) => getColumnLabel(i));
  }, [boardSize]);

  // Handle cell click callback
  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (!isMyTurn || board[r][c] !== null) return;
      onCellClick(r, c);
    },
    [isMyTurn, board, onCellClick]
  );

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(1.5, Math.max(0.65, +(prev + delta).toFixed(2))));
  };

  const resetZoom = () => setZoomLevel(1);

  // Scroll to center helper (e.g. coordinates [14, 14])
  const scrollToCenter = useCallback(() => {
    if (!viewportRef.current) return;
    const vp = viewportRef.current;
    vp.scrollTo({
      left: Math.max(0, (vp.scrollWidth - vp.clientWidth) / 2),
      top: Math.max(0, (vp.scrollHeight - vp.clientHeight) / 2),
      behavior: 'smooth',
    });
  }, []);

  // Scroll to last move helper
  const scrollToLastMove = useCallback(() => {
    if (!viewportRef.current || !lastMove) return;
    const vp = viewportRef.current;
    // Estimate target scroll position based on row and col ratio
    const targetX = (lastMove.col / boardSize) * vp.scrollWidth - vp.clientWidth / 2;
    const targetY = (lastMove.row / boardSize) * vp.scrollHeight - vp.clientHeight / 2;
    vp.scrollTo({
      left: Math.max(0, targetX),
      top: Math.max(0, targetY),
      behavior: 'smooth',
    });
  }, [lastMove, boardSize]);

  // Auto-center once when game starts
  useEffect(() => {
    if (status === 'PLAYING' && !hasAutoCentered.current) {
      hasAutoCentered.current = true;
      // Slight delay to ensure DOM dimensions are ready
      const t = setTimeout(() => scrollToCenter(), 100);
      return () => clearTimeout(t);
    }
  }, [status, scrollToCenter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Board Controls Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '820px',
          marginBottom: '10px',
          padding: '0 8px',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Bàn cờ: <strong style={{ color: 'var(--text-primary)' }}>{boardSize} × {boardSize}</strong>
          {lastMove && (
            <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
              (Nước #{lastMove.moveNumber}: <strong style={{ color: '#38bdf8' }}>{colLetters[lastMove.col]}{lastMove.row + 1}</strong>)
            </span>
          )}
        </div>

        {/* Viewport Navigators & Zoom Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} role="toolbar" aria-label="Điều khiển bàn cờ">
          {/* Scroll to last move */}
          {lastMove && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={scrollToLastMove}
              style={{ minHeight: '36px', padding: '6px 10px', fontSize: '0.78rem' }}
              title="Cuộn tới nước đi mới nhất"
              aria-label="Cuộn tới nước đi mới nhất"
            >
              <Target size={14} color="#38bdf8" /> Nước mới nhất
            </button>
          )}

          {/* Scroll to center */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={scrollToCenter}
            style={{ minHeight: '36px', padding: '6px 10px', fontSize: '0.78rem' }}
            title="Cuộn về giữa bàn cờ"
            aria-label="Cuộn về giữa bàn cờ"
          >
            <Crosshair size={14} /> Giữa bàn cờ
          </button>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
            <button
              type="button"
              className="btn-icon"
              onClick={() => handleZoom(-0.1)}
              style={{ minHeight: '36px', minWidth: '36px', padding: '6px' }}
              title="Thu nhỏ bàn cờ"
              aria-label="Thu nhỏ bàn cờ"
            >
              <ZoomOut size={15} />
            </button>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                minWidth: '38px',
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              className="btn-icon"
              onClick={() => handleZoom(0.1)}
              style={{ minHeight: '36px', minWidth: '36px', padding: '6px' }}
              title="Phóng to bàn cờ"
              aria-label="Phóng to bàn cờ"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={resetZoom}
              style={{ minHeight: '36px', minWidth: '36px', padding: '6px' }}
              title="Đặt lại mức thu phóng"
              aria-label="Đặt lại mức thu phóng"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Viewport (Pan 2D) */}
      <div className="board-viewport" ref={viewportRef}>
        <div
          className="caro-grid-container"
          style={{
            transform: `scale(${zoomLevel})`,
          }}
        >
          {/* Header Column Letters (A-Z, AA-AD) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `24px repeat(${boardSize}, var(--cell-size))`,
              gap: '1px',
              marginBottom: '3px',
            }}
          >
            <div />
            {colLetters.map((letter) => (
              <div
                key={letter}
                style={{
                  fontSize: letter.length > 1 ? '0.6rem' : '0.68rem',
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          <div style={{ display: 'flex' }}>
            {/* Row Numbers 1-30 */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${boardSize}, var(--cell-size))`,
                gap: '1px',
                marginRight: '3px',
              }}
            >
              {Array.from({ length: boardSize }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    color: 'var(--text-tertiary)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Main 30x30 Cells Grid (900 Cells) */}
            <div
              className="caro-grid"
              role="grid"
              aria-label={`Bàn cờ Caro ${boardSize} nhân ${boardSize}`}
              style={{
                gridTemplateColumns: `repeat(${boardSize}, var(--cell-size))`,
                gridTemplateRows: `repeat(${boardSize}, var(--cell-size))`,
              }}
            >
              {board.map((row, r) =>
                row.map((cellValue, c) => (
                  <CaroCell
                    key={`${r}-${c}`}
                    r={r}
                    c={c}
                    cellValue={cellValue}
                    isLastMove={lastMove?.row === r && lastMove?.col === c}
                    isWinningCell={winningCoordinatesSet.has(`${r},${c}`)}
                    isMyTurn={isMyTurn}
                    colLabel={colLetters[c]}
                    myConfig={myConfig}
                    onCellClick={handleCellClick}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
