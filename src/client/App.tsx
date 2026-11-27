import React from 'react';
import { useSocket } from './hooks/useSocket.js';
import { Lobby } from './components/Lobby.js';
import { WaitingRoom } from './components/WaitingRoom.js';
import { GameBoard } from './components/GameBoard.js';
import { PlayerCard } from './components/PlayerCard.js';
import { GameOverModal } from './components/GameOverModal.js';
import { ChatPanel } from './components/ChatPanel.js';
import { Home } from './components/Home.js';
import { Xiangqi } from './components/Xiangqi.js';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  Swords,
  LogOut,
  Volume2,
  VolumeX,
  MessageSquare,
} from 'lucide-react';

export const App: React.FC = () => {
  const [page, setPage] = React.useState(() => window.location.hash);

  React.useEffect(() => {
    const updatePage = () => setPage(window.location.hash);
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);

  const {
    isConnected,
    isConnecting,
    roomState,
    session,
    errorMessage,
    abandonNotice,
    chatMessages,
    unreadChatCount,
    isChatOpen,
    setIsChatOpen,
    soundEnabled,
    toggleSound,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    makeMove,
    voteRematch,
    leaveRoom,
    sendChatMessage,
    markChatAsRead,
    dismissError,
  } = useSocket();

  const myPlayer = roomState && session
    ? roomState.players.find((p) => p.id === session.playerId) || null
    : null;

  const myIndex = myPlayer ? myPlayer.index : null;

  const isGameOver =
    roomState &&
    (roomState.status === 'FINISHED' ||
      roomState.status === 'DRAW' ||
      roomState.status === 'ABANDONED');

  const currentActivePlayer = roomState ? roomState.players[roomState.currentTurnIndex] : null;

  const handleOpenChat = () => {
    setIsChatOpen(true);
    markChatAsRead();
  };

  const handleToggleChat = () => {
    if (!isChatOpen) {
      markChatAsRead();
    }
    setIsChatOpen((prev) => !prev);
  };

  if (page === '#xiangqi') return <Xiangqi />;
  if (page !== '#caro') return <Home />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(8, 12, 20, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '10px 16px',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(37, 99, 235, 0.45)',
                flexShrink: 0,
              }}
            >
              <Swords size={20} color="#ffffff" />
            </div>
            <div>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.3px',
                  color: 'var(--text-primary)',
                }}
              >
                Caro 30×30 (3-4P)
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  marginLeft: '6px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                }}
              >
                REALTIME
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {!roomState && (
              <a className="game-home-link" href="#home">Trang chủ</a>
            )}
            {/* Sound Mute/Unmute Toggle Button */}
            <button
              type="button"
              onClick={toggleSound}
              className="btn-icon"
              style={{ minHeight: '34px', minWidth: '34px', padding: '6px' }}
              title={soundEnabled ? 'Tắt âm thanh báo lượt' : 'Bật âm thanh báo lượt'}
              aria-label={soundEnabled ? 'Tắt âm thanh báo lượt' : 'Bật âm thanh báo lượt'}
            >
              {soundEnabled ? <Volume2 size={16} color="#38bdf8" /> : <VolumeX size={16} color="#94a3b8" />}
            </button>

            {/* Chat Header Button (when in room) */}
            {roomState && (
              <button
                type="button"
                onClick={handleToggleChat}
                className="btn-icon"
                style={{ minHeight: '34px', minWidth: '34px', padding: '6px', position: 'relative' }}
                title="Mở trò chuyện trong phòng"
                aria-label="Mở trò chuyện trong phòng"
              >
                <MessageSquare size={16} color="#38bdf8" />
                {unreadChatCount > 0 && !isChatOpen && (
                  <span className="chat-badge">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span>
                )}
              </button>
            )}

            {roomState && (
              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-surface)',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Phòng: <strong style={{ color: '#38bdf8' }}>{roomState.roomId}</strong>
              </div>
            )}

            {/* Connection Status Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '5px 9px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: isConnected ? 'var(--accent-success)' : 'var(--accent-danger)',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span className="hide-on-mobile">{isConnected ? 'Trực tuyến' : isConnecting ? 'Đang kết nối...' : 'Mất mạng'}</span>
            </div>

            {roomState && (
              <button
                type="button"
                onClick={leaveRoom}
                className="btn-secondary"
                style={{
                  padding: '5px 9px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  minHeight: '34px',
                }}
                title="Rời khỏi phòng hiện tại"
              >
                <LogOut size={13} /> Thoát
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Toast Alert Notification */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '64px',
            right: '16px',
            zIndex: 60,
            backgroundColor: '#7f1d1d',
            color: '#fecaca',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 25px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 600,
            border: '1px solid #dc2626',
            maxWidth: '380px',
          }}
          onClick={dismissError}
        >
          <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Abandon Warning Notice */}
      {abandonNotice && (
        <div
          role="status"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid #ef4444',
            color: '#fca5a5',
            textAlign: 'center',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {abandonNotice}
        </div>
      )}

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          padding: 'clamp(14px, 3vw, 24px) 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* State 1: Lobby */}
        {!roomState && (
          <Lobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />
        )}

        {/* State 2: Waiting Room */}
        {roomState && roomState.status === 'WAITING' && session && (
          <WaitingRoom
            roomState={roomState}
            session={session}
            onToggleReady={toggleReady}
            onStartGame={startGame}
            onLeaveRoom={leaveRoom}
          />
        )}

        {/* State 3: Active Game Screen */}
        {roomState && roomState.status !== 'WAITING' && session && (
          <div
            style={{
              width: '100%',
              maxWidth: '1100px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Responsive Players Status Row / Grid */}
            <div
              className="player-cards-grid"
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: `repeat(${roomState.players.length}, 1fr)`,
                gap: '8px',
              }}
            >
              {roomState.players.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isCurrentTurn={roomState.status === 'PLAYING' && roomState.currentTurnIndex === p.index}
                  isSelf={p.id === session.playerId}
                  isHost={p.id === roomState.hostId}
                  disconnectTimeoutSeconds={roomState.disconnectTimeoutSeconds}
                />
              ))}
            </div>

            {/* Current Turn Notification Bar */}
            {roomState.status === 'PLAYING' && currentActivePlayer && (
              <div
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor:
                    myIndex === roomState.currentTurnIndex
                      ? 'rgba(37, 99, 235, 0.18)'
                      : 'var(--bg-surface)',
                  border: `1px solid ${
                    myIndex === roomState.currentTurnIndex
                      ? 'var(--accent-primary)'
                      : 'var(--border-subtle)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: currentActivePlayer.color,
                      display: 'inline-block',
                      boxShadow: `0 0 10px ${currentActivePlayer.color}`,
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {myIndex === roomState.currentTurnIndex ? (
                      <span style={{ color: '#60a5fa' }}>
                        {roomState.moveCount === 0
                          ? '🎲 Bạn được chọn đi trước! Hãy nhấp chọn 1 ô trên bàn cờ.'
                          : 'Lượt của bạn! Hãy nhấp chọn 1 ô trên bàn cờ.'}
                      </span>
                    ) : (
                      <span>
                        {roomState.moveCount === 0 ? (
                          <>
                            🎲 <strong style={{ color: currentActivePlayer.color }}>
                              {currentActivePlayer.name} ({currentActivePlayer.symbol})
                            </strong> được hệ thống chọn đi trước...
                          </>
                        ) : (
                          <>
                            Đang đợi lượt của{' '}
                            <strong style={{ color: currentActivePlayer.color }}>
                              {currentActivePlayer.name} ({currentActivePlayer.symbol})
                            </strong>...
                          </>
                        )}
                      </span>
                    )}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Nước đi: <strong style={{ color: 'var(--text-primary)' }}>#{roomState.moveCount}</strong>
                </div>
              </div>
            )}

            {/* Game Board (30x30) */}
            <GameBoard
              roomState={roomState}
              myIndex={myIndex}
              onCellClick={makeMove}
            />

            {/* Game Over Modal */}
            {isGameOver && (
              <GameOverModal
                roomState={roomState}
                session={session}
                onRematch={voteRematch}
                onLeaveRoom={leaveRoom}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Chat Button (Bottom Right, visible whenever in a room and chat closed) */}
      {roomState && !isChatOpen && (
        <button
          type="button"
          onClick={handleOpenChat}
          className="chat-toggle-btn"
          title="Mở trò chuyện trong phòng"
          aria-label="Mở trò chuyện trong phòng"
        >
          <MessageSquare size={24} />
          {unreadChatCount > 0 && (
            <span className="chat-badge">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span>
          )}
        </button>
      )}

      {/* Realtime In-Room Chat Panel */}
      {roomState && (
        <ChatPanel
          messages={chatMessages}
          session={session}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onSendMessage={sendChatMessage}
          isConnected={isConnected}
        />
      )}
    </div>
  );
};
