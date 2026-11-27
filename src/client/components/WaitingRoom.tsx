import React, { useState } from 'react';
import { RoomState, ClientSession, PLAYER_CONFIGS } from '../types.js';
import { Copy, Check, Users, Play, Crown, CheckCircle2, CircleDashed, LogOut } from 'lucide-react';

interface WaitingRoomProps {
  roomState: RoomState;
  session: ClientSession;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  roomState,
  session,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const isHost = roomState.hostId === session.playerId;
  const myPlayer = roomState.players.find((p) => p.id === session.playerId);
  const isFull = roomState.players.length === roomState.maxPlayers;
  const allReady = roomState.players.every((p) => p.isReady);
  const canStart = isHost && isFull && allReady;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Room Header Card */}
      <div className="glass-card" style={{ padding: 'clamp(20px, 4vw, 24px)', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '12px',
          }}
        >
          <Users size={16} />
          Phòng {roomState.maxPlayers} người chơi
        </div>

        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Mã phòng thi đấu
        </h2>

        {/* Room Code Display with Copy Button */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#070d18',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-medium)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(1.6rem, 5vw, 2rem)',
              fontWeight: 800,
              letterSpacing: '4px',
              color: '#38bdf8',
            }}
          >
            {roomState.roomId}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className={`btn ${copied ? 'btn-success' : 'btn-secondary'}`}
            style={{ minHeight: '40px', padding: '6px 14px', fontSize: '0.85rem' }}
            title="Sao chép mã phòng"
            aria-label="Sao chép mã phòng"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Đã chép' : 'Sao chép'}
          </button>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '12px' }}>
          Chia sẻ mã phòng này để bạn bè cùng tham gia vào ván cờ!
        </p>
      </div>

      {/* Players Slots List */}
      <div className="glass-card" style={{ padding: 'clamp(16px, 4vw, 20px)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Danh sách thành viên
          </span>
          <span
            style={{
              fontSize: '0.85rem',
              color: isFull ? 'var(--accent-success)' : '#f59e0b',
              fontWeight: 700,
            }}
          >
            {roomState.players.length} / {roomState.maxPlayers}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Array.from({ length: roomState.maxPlayers }, (_, idx) => {
            const player = roomState.players[idx];
            const cfg = PLAYER_CONFIGS[idx];

            if (player) {
              const isSelf = player.id === session.playerId;
              const isPlayerHost = player.id === roomState.hostId;

              return (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelf ? 'rgba(30, 41, 59, 0.85)' : '#070d18',
                    border: `1px solid ${isSelf ? cfg.color : 'var(--border-subtle)'}`,
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: `${cfg.color}25`,
                        border: `2px solid ${cfg.color}`,
                        color: cfg.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        flexShrink: 0,
                      }}
                    >
                      {cfg.symbol}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {player.name}
                        </span>
                        {isPlayerHost && <Crown size={14} color="#f59e0b" title="Chủ phòng" style={{ flexShrink: 0 }} />}
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Quân cờ: <strong style={{ color: cfg.color }}>{cfg.symbol}</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    {player.isReady ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#10b981',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <CheckCircle2 size={14} />
                        Sẵn sàng
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#f59e0b',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <CircleDashed size={14} />
                        Chờ sẵn sàng
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // Empty Slot
            return (
              <div
                key={`empty-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-medium)',
                  backgroundColor: 'rgba(7, 13, 24, 0.4)',
                  color: 'var(--text-tertiary)',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-medium)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {cfg.symbol}
                </div>
                <span style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                  Đang chờ người chơi {idx + 1} tham gia...
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {myPlayer && (
          <button
            type="button"
            onClick={onToggleReady}
            className={`btn ${myPlayer.isReady ? 'btn-secondary' : 'btn-success'}`}
            style={{ width: '100%', minHeight: '48px' }}
          >
            {myPlayer.isReady ? (
              <>
                <CircleDashed size={18} /> Hủy sẵn sàng
              </>
            ) : (
              <>
                <CheckCircle2 size={18} /> Tôi đã sẵn sàng
              </>
            )}
          </button>
        )}

        {isHost && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              type="button"
              onClick={onStartGame}
              disabled={!canStart}
              className="btn btn-primary"
              style={{ width: '100%', minHeight: '50px', fontSize: '1.05rem' }}
            >
              <Play size={20} fill={canStart ? '#ffffff' : 'none'} />
              Bắt đầu ván đấu
            </button>
            {!canStart && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                {!isFull
                  ? `Cần đủ ${roomState.maxPlayers} người chơi để bắt đầu`
                  : 'Đang chờ tất cả người chơi bấm Sẵn sàng'}
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onLeaveRoom}
          className="btn btn-danger-ghost"
          style={{ width: '100%', minHeight: '42px', marginTop: '4px' }}
        >
          <LogOut size={16} /> Rời phòng
        </button>
      </div>
    </div>
  );
};
