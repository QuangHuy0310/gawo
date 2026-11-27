import React, { useEffect, useState } from 'react';
import { Player } from '../types.js';
import { Crown, WifiOff } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isCurrentTurn: boolean;
  isSelf: boolean;
  isHost: boolean;
  disconnectTimeoutSeconds?: number;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentTurn,
  isSelf,
  isHost,
  disconnectTimeoutSeconds = 60,
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(disconnectTimeoutSeconds);

  useEffect(() => {
    if (!player.isConnected && player.disconnectedAt) {
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - (player.disconnectedAt || Date.now())) / 1000);
        const left = Math.max(0, disconnectTimeoutSeconds - elapsed);
        setRemainingTime(left);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setRemainingTime(disconnectTimeoutSeconds);
    }
  }, [player.isConnected, player.disconnectedAt, disconnectTimeoutSeconds]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: isCurrentTurn ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.65)',
        border: `2px solid ${isCurrentTurn ? player.color : 'var(--border-subtle)'}`,
        boxShadow: isCurrentTurn
          ? `0 0 16px ${player.color}45, inset 0 0 10px ${player.color}20`
          : 'none',
        transition: 'all var(--transition-fast)',
        opacity: player.isConnected ? 1 : 0.55,
        minWidth: 0,
      }}
      className={isCurrentTurn ? 'turn-pulse' : ''}
    >
      {/* Symbol Badge */}
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: `${player.color}22`,
          border: `2px solid ${player.color}`,
          color: player.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}
        aria-label={`Ký hiệu ${player.symbol}`}
      >
        {player.symbol}
      </div>

      {/* Player Info */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={player.name}
          >
            {player.name}
          </span>

          {isHost && (
            <Crown size={14} color="#f59e0b" title="Chủ phòng" style={{ flexShrink: 0 }} />
          )}

          {isSelf && (
            <span
              style={{
                fontSize: '0.68rem',
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'rgba(59, 130, 246, 0.25)',
                color: '#60a5fa',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              Bạn
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          {isCurrentTurn ? (
            <span
              style={{
                fontSize: '0.78rem',
                color: player.color,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: player.color,
                  display: 'inline-block',
                }}
              />
              Đang đến lượt
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              P{player.index + 1}
            </span>
          )}

          {!player.isConnected && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--accent-danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 600,
              }}
            >
              <WifiOff size={11} />
              Mất mạng ({remainingTime}s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
