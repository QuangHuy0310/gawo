import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ClientSession } from '../types.js';
import { Send, X, MessageSquare, ArrowDown } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  session: ClientSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  isConnected: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  session,
  isOpen,
  onClose,
  onSendMessage,
  isConnected,
}) => {
  const [inputText, setInputText] = useState('');
  const [showScrollBottomPill, setShowScrollBottomPill] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Check scroll position to determine if user is near bottom
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 70;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottomPill(!nearBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowScrollBottomPill(false);
    isNearBottomRef.current = true;
  }, []);

  // When new messages arrive, auto-scroll only if user was already at bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages, scrollToBottom]);

  // When chat opens, scroll to bottom immediately
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom('auto'), 50);
    }
  }, [isOpen, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean || clean.length > 300 || !isConnected) return;
    onSendMessage(clean);
    setInputText('');
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="glass-card chat-panel-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(11, 15, 25, 0.94)',
        border: '1px solid var(--border-medium)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.75)',
        zIndex: 45,
      }}
      role="region"
      aria-label="Khung trò chuyện trong phòng"
    >
      {/* Chat Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderTopLeftRadius: 'inherit',
          borderTopRightRadius: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={17} color="#38bdf8" />
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            Trò chuyện trong phòng
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            ({messages.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-icon"
          style={{ minHeight: '34px', minWidth: '34px', padding: '6px' }}
          title="Đóng khung chat"
          aria-label="Đóng khung chat"
        >
          <X size={16} />
        </button>
      </div>

      {/* Message List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minHeight: '220px',
          maxHeight: '360px',
          position: 'relative',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '0.82rem',
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            <MessageSquare size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <span>Chưa có tin nhắn nào trong phòng.</span>
            <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Hãy gửi lời chào tới mọi người!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.playerId === session?.playerId;

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isSelf ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  alignSelf: isSelf ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Sender Tag */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '3px',
                    fontSize: '0.72rem',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      color: msg.playerColor,
                      backgroundColor: `${msg.playerColor}20`,
                      padding: '1px 4px',
                      borderRadius: '3px',
                    }}
                  >
                    {msg.playerSymbol}
                  </span>
                  <span style={{ fontWeight: 600, color: isSelf ? '#93c5fd' : 'var(--text-secondary)' }}>
                    {isSelf ? 'Bạn' : msg.playerName}
                  </span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: isSelf ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    lineHeight: '1.45',
                    wordBreak: 'break-word',
                    border: isSelf
                      ? '1px solid rgba(255, 255, 255, 0.15)'
                      : '1px solid var(--border-subtle)',
                    borderBottomRightRadius: isSelf ? '2px' : '12px',
                    borderBottomLeftRadius: isSelf ? '12px' : '2px',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottomPill && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            style={{
              position: 'sticky',
              bottom: '8px',
              alignSelf: 'center',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: '#38bdf8',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <ArrowDown size={12} /> Tin nhắn mới
          </button>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(7, 13, 24, 0.7)',
          borderBottomLeftRadius: 'inherit',
          borderBottomRightRadius: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            placeholder={isConnected ? 'Nhập tin nhắn (Enter để gửi)...' : 'Đang mất kết nối...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={300}
            disabled={!isConnected}
            className="input-control"
            style={{
              minHeight: '40px',
              padding: '8px 12px',
              fontSize: '0.88rem',
            }}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected}
            className="btn btn-primary"
            style={{
              minHeight: '40px',
              minWidth: '40px',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
            }}
            title="Gửi tin nhắn"
            aria-label="Gửi tin nhắn"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Character Counter & Helper */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.68rem',
            color: 'var(--text-tertiary)',
            padding: '0 4px',
          }}
        >
          <span>Tối đa 5 tin / 10s</span>
          <span>{inputText.length} / 300</span>
        </div>
      </form>
    </div>
  );
};
