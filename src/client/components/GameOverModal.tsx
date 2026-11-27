import React, { useEffect } from 'react';
import { RoomState, ClientSession } from '../types.js';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, AlertCircle, Check } from 'lucide-react';

interface GameOverModalProps {
  roomState: RoomState;
  session: ClientSession;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  roomState,
  session,
  onRematch,
  onLeaveRoom,
}) => {
  const { status, winnerIndex, players, rematchVotes } = roomState;

  const isWon = status === 'FINISHED' && winnerIndex !== null;
  const isDraw = status === 'DRAW';
  const isAbandoned = status === 'ABANDONED';

  const winner = isWon && winnerIndex !== null ? players[winnerIndex] : null;
  const isWinnerSelf = winner?.id === session.playerId;
  const hasVotedRematch = rematchVotes.includes(session.playerId);

  useEffect(() => {
    if (isWon) {
      try {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Fallback for headless environments
      }
    }
  }, [isWon]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: 'clamp(20px, 5vw, 32px)',
          textAlign: 'center',
          border: '1px solid var(--border-medium)',
        }}
      >
        {isWon && winner ? (
          <div>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(245, 158, 11, 0.18)',
                border: '2px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 0 24px rgba(245, 158, 11, 0.45)',
              }}
            >
              <Trophy size={36} color="#f59e0b" />
            </div>

            <h2
              id="modal-title"
              style={{
                fontSize: 'clamp(1.4rem, 4vw, 1.75rem)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            >
              {isWinnerSelf ? 'Chúc mừng! Bạn đã chiến thắng!' : `${winner.name} đã chiến thắng!`}
            </h2>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: `${winner.color}20`,
                border: `1px solid ${winner.color}`,
                margin: '12px auto 16px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: winner.color,
                }}
              >
                {winner.symbol}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                Người chơi {winner.index + 1} ({winner.name})
              </span>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Đã tạo thành công 5 quân cờ liên tiếp trên bàn cờ Caro 30×30!
            </p>
          </div>
        ) : isDraw ? (
          <div>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(148, 163, 184, 0.18)',
                border: '2px solid #94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <RotateCcw size={32} color="#94a3b8" />
            </div>
            <h2
              id="modal-title"
              style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}
            >
              Ván cờ Hòa!
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Bàn cờ 900 ô đã đầy nhưng chưa có người chơi nào hoàn thành 5 quân liên tiếp.
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(239, 68, 68, 0.18)',
                border: '2px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertCircle size={32} color="#ef4444" />
            </div>
            <h2
              id="modal-title"
              style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', marginBottom: '8px' }}
            >
              Ván đấu đã bị hủy
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Một người chơi đã mất kết nối quá thời gian chờ (60s) hoặc đã rời khỏi phòng.
            </p>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!isAbandoned && (
            <button
              type="button"
              onClick={onRematch}
              className={`btn ${hasVotedRematch ? 'btn-success' : 'btn-primary'}`}
              style={{ width: '100%', minHeight: '46px' }}
            >
              {hasVotedRematch ? (
                <>
                  <Check size={18} /> Đã gửi yêu cầu đấu lại ({rematchVotes.length}/{players.length})
                </>
              ) : (
                <>
                  <RotateCcw size={18} /> Yêu cầu đấu lại ({rematchVotes.length}/{players.length})
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onLeaveRoom}
            className="btn btn-secondary"
            style={{ width: '100%', minHeight: '44px' }}
          >
            <Home size={16} /> Quay về sảnh chính
          </button>
        </div>
      </div>
    </div>
  );
};
