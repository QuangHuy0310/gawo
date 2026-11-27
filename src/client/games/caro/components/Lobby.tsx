import React, { useState } from 'react';
import { Users, Swords, ArrowRight, ShieldCheck, Sparkles, Shuffle } from 'lucide-react';
import { PLAYER_CONFIGS } from '../types.js';

interface LobbyProps {
  onCreateRoom: (playerName: string, maxPlayers: 3 | 4) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState<string>('');
  const [maxPlayers, setMaxPlayers] = useState<3 | 4>(4);
  const [roomId, setRoomId] = useState<string>('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(playerName.trim(), maxPlayers);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    onJoinRoom(roomId.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '520px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Title & Hero */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            color: '#60a5fa',
            fontWeight: 700,
            marginBottom: '12px',
          }}
        >
          <Sparkles size={16} />
          Cờ Caro Realtime 3 - 4 Người Chơi
        </div>
        <h1
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.3rem)',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 30%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
            marginBottom: '8px',
          }}
        >
          Đại Chiến Cờ Caro 30×30
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5' }}>
          Bàn cờ mở rộng 900 ô dành cho 3 hoặc 4 người so tài cùng lúc.
          <br />Ai xếp đủ <strong style={{ color: 'var(--text-primary)' }}>5 quân liên tiếp</strong> trước sẽ giành chiến thắng!
        </p>
      </div>

      {/* Main Form Glass Card */}
      <div className="glass-card" style={{ padding: 'clamp(20px, 4vw, 28px)' }}>
        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#070d18',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            border: '1px solid var(--border-subtle)',
          }}
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'create'}
            onClick={() => setActiveTab('create')}
            className="btn"
            style={{
              flex: 1,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeTab === 'create' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'create' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.92rem',
              boxShadow: activeTab === 'create' ? '0 2px 8px var(--accent-primary-glow)' : 'none',
            }}
          >
            <Users size={17} /> Tạo phòng mới
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'join'}
            onClick={() => setActiveTab('join')}
            className="btn"
            style={{
              flex: 1,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeTab === 'join' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'join' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.92rem',
              boxShadow: activeTab === 'join' ? '0 2px 8px var(--accent-primary-glow)' : 'none',
            }}
          >
            <Swords size={17} /> Vào phòng có sẵn
          </button>
        </div>

        {/* Tab 1: Create Room */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label
                htmlFor="create-name"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Tên hiển thị của bạn
              </label>
              <input
                id="create-name"
                type="text"
                placeholder="Nhập tên hiển thị (hoặc để trống)..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                className="input-control"
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Số lượng người chơi
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMaxPlayers(3)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: maxPlayers === 3 ? 'rgba(37, 99, 235, 0.18)' : '#070d18',
                    border: `2px solid ${maxPlayers === 3 ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    color: maxPlayers === 3 ? '#60a5fa' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    minHeight: '68px',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>3 Người chơi</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.8 }}>
                    X vs O vs ▲
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMaxPlayers(4)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: maxPlayers === 4 ? 'rgba(37, 99, 235, 0.18)' : '#070d18',
                    border: `2px solid ${maxPlayers === 4 ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    color: maxPlayers === 4 ? '#60a5fa' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    minHeight: '68px',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>4 Người chơi</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.8 }}>
                    X vs O vs ▲ vs ■
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '6px' }}
            >
              Tạo phòng và lấy mã <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* Tab 2: Join Room */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label
                htmlFor="join-code"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Mã phòng (5 ký tự)
              </label>
              <input
                id="join-code"
                type="text"
                placeholder="VD: A3K9B"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                maxLength={5}
                required
                className="input-control"
                style={{
                  color: '#38bdf8',
                  fontSize: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  letterSpacing: '4px',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="join-name"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Tên hiển thị của bạn
              </label>
              <input
                id="join-name"
                type="text"
                placeholder="Nhập tên hiển thị (hoặc để trống)..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                className="input-control"
              />
            </div>

            <button
              type="submit"
              disabled={!roomId.trim()}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '6px' }}
            >
              Tham gia ván đấu <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>

      {/* Game Rules Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h2
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldCheck size={18} color="#10b981" />
          Ký hiệu và luật thi đấu
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {PLAYER_CONFIGS.map((cfg, idx) => (
            <div
              key={idx}
              style={{
                padding: '8px 4px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#070d18',
                border: `1px solid ${cfg.color}35`,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: cfg.color,
                }}
              >
                {cfg.symbol}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px', fontWeight: 600 }}>
                P{idx + 1}
              </div>
            </div>
          ))}
        </div>

        <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '18px' }}>
          <li>
            <strong>Bàn cờ:</strong> Kích thước mở rộng 30 × 30 ô (900 ô cờ).
          </li>
          <li>
            <strong>Người đi trước:</strong> Hệ thống tự động random ngẫu nhiên người đi đầu ở mỗi ván đấu.
          </li>
          <li>
            <strong>Lượt chơi:</strong> Xoay vòng cố định theo thứ tự kể từ người được chọn.
          </li>
          <li>
            <strong>Điều kiện thắng:</strong> Tạo được chuỗi từ 5 quân liên tiếp trở lên (ngang, dọc hoặc đường chéo).
          </li>
          <li>
            <strong>Tự động khôi phục:</strong> Giữ phiên kết nối khi tải lại trang hoặc ngắt mạng ngắn hạn.
          </li>
        </ul>
      </div>
    </div>
  );
};
