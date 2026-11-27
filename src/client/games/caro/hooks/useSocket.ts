import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomState,
  ClientSession,
  ChatMessage,
} from '../types.js';
import { playTurnChime, flashTabTitle } from '../../../utils/sound.js';

const SESSION_STORAGE_KEY = 'caro_session_data';
const SOUND_STORAGE_KEY = 'caro_sound_enabled';

export function useSocket() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [session, setSession] = useState<ClientSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [abandonNotice, setAbandonNotice] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const isChatOpenRef = useRef<boolean>(false);
  isChatOpenRef.current = isChatOpen;

  // Sound State (default true)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Turn tracking to prevent false turn sound on reload/reconnect
  const prevTurnRef = useRef<number | null>(null);
  const isHydratedRef = useRef<boolean>(false);

  // Clear toast error after 5s
  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorMessage((curr) => (curr === msg ? null : curr));
    }, 5000);
  }, []);

  // Save session to localStorage
  const saveSession = useCallback((sess: ClientSession | null) => {
    setSession(sess);
    if (sess) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sess));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setChatMessages([]);
      setUnreadChatCount(0);
    }
  }, []);

  // Sound toggle
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  // Check and trigger turn sound
  const checkTurnSound = useCallback(
    (newState: RoomState, currentSession: ClientSession | null) => {
      if (!currentSession || newState.status !== 'PLAYING') {
        prevTurnRef.current = newState.status === 'PLAYING' ? newState.currentTurnIndex : null;
        return;
      }

      const myPlayer = newState.players.find((p) => p.id === currentSession.playerId);
      const myIndex = myPlayer ? myPlayer.index : null;

      // Only chime if:
      // 1. Initial hydration has already completed (not fresh page load / reconnect)
      // 2. Turn transitioned from someone else to me
      if (
        isHydratedRef.current &&
        prevTurnRef.current !== null &&
        prevTurnRef.current !== newState.currentTurnIndex &&
        myIndex !== null &&
        newState.currentTurnIndex === myIndex
      ) {
        playTurnChime(soundEnabledRef.current);
        flashTabTitle('🔔 Đến lượt bạn! - Caro 30×30');
      }

      prevTurnRef.current = newState.currentTurnIndex;
      isHydratedRef.current = true;
    },
    []
  );

  useEffect(() => {
    const serverUrl =
      import.meta.env.VITE_SERVER_URL ||
      (import.meta.env.DEV
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : '/');

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);

      // Auto-reconnect if session exists
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        try {
          const parsedSession: ClientSession = JSON.parse(stored);
          if (parsedSession.roomId && parsedSession.playerId && parsedSession.sessionToken) {
            socket.emit(
              'room:reconnect',
              {
                roomId: parsedSession.roomId,
                playerId: parsedSession.playerId,
                sessionToken: parsedSession.sessionToken,
              },
              (res) => {
                if (res.success && res.roomState && res.session) {
                  setRoomState(res.roomState);
                  setSession(res.session);
                  // Mark as hydrated without playing sound on reconnect
                  prevTurnRef.current = res.roomState.currentTurnIndex;
                  isHydratedRef.current = true;
                } else {
                  localStorage.removeItem(SESSION_STORAGE_KEY);
                  setSession(null);
                  setRoomState(null);
                }
              }
            );
          }
        } catch (e) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room:updated', (updatedState) => {
      setRoomState((prevState) => {
        setSession((currSession) => {
          checkTurnSound(updatedState, currSession);
          return currSession;
        });
        return updatedState;
      });
    });

    socket.on('game:started', (updatedState) => {
      setRoomState((prevState) => {
        setSession((currSession) => {
          checkTurnSound(updatedState, currSession);
          return currSession;
        });
        return updatedState;
      });
      setAbandonNotice(null);
    });

    socket.on('game:moveMade', ({ roomState: updatedState }) => {
      setRoomState((prevState) => {
        setSession((currSession) => {
          checkTurnSound(updatedState, currSession);
          return currSession;
        });
        return updatedState;
      });
    });

    socket.on('game:won', ({ roomState: updatedState }) => {
      setRoomState(updatedState);
      prevTurnRef.current = null;
    });

    socket.on('game:draw', (updatedState) => {
      setRoomState(updatedState);
      prevTurnRef.current = null;
    });

    socket.on('player:disconnected', ({ roomState: updatedState }) => {
      setRoomState(updatedState);
    });

    socket.on('player:reconnected', ({ roomState: updatedState }) => {
      setRoomState(updatedState);
    });

    socket.on('room:abandoned', ({ reason, roomState: updatedState }) => {
      setRoomState(updatedState);
      setAbandonNotice(reason);
      prevTurnRef.current = null;
    });

    socket.on('error:message', (msg) => {
      showError(msg);
    });

    // Chat Events
    socket.on('chat:history', (history) => {
      setChatMessages(history);
    });

    socket.on('chat:message', (message) => {
      setChatMessages((prev) => {
        // Prevent duplicate IDs
        if (prev.some((m) => m.id === message.id)) return prev;
        const updated = [...prev, message];
        if (updated.length > 100) updated.shift();
        return updated;
      });

      // Increment unread count if chat panel is currently closed
      if (!isChatOpenRef.current) {
        setUnreadChatCount((c) => c + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [checkTurnSound, showError]);

  // Actions
  const createRoom = useCallback(
    (playerName: string, maxPlayers: 3 | 4) => {
      if (!socketRef.current) return;
      socketRef.current.emit('room:create', { playerName, maxPlayers }, (res) => {
        if (res.success && res.session && res.roomState) {
          saveSession(res.session);
          setRoomState(res.roomState);
          setAbandonNotice(null);
          prevTurnRef.current = res.roomState.currentTurnIndex;
          isHydratedRef.current = true;
        } else {
          showError(res.error || 'Không thể tạo phòng.');
        }
      });
    },
    [saveSession, showError]
  );

  const joinRoom = useCallback(
    (roomId: string, playerName: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit(
        'room:join',
        { roomId: roomId.toUpperCase().trim(), playerName },
        (res) => {
          if (res.success && res.session && res.roomState) {
            saveSession(res.session);
            setRoomState(res.roomState);
            setAbandonNotice(null);
            prevTurnRef.current = res.roomState.currentTurnIndex;
            isHydratedRef.current = true;
          } else {
            showError(res.error || 'Không thể tham gia phòng.');
          }
        }
      );
    },
    [saveSession, showError]
  );

  const toggleReady = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('player:ready', (res) => {
      if (res && !res.success) {
        showError(res.error || 'Không thể đổi trạng thái.');
      }
    });
  }, [showError]);

  const startGame = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:start', (res) => {
      if (res && !res.success) {
        showError(res.error || 'Không thể bắt đầu ván đấu.');
      }
    });
  }, [showError]);

  const makeMove = useCallback(
    (row: number, col: number) => {
      if (!socketRef.current) return;
      socketRef.current.emit('game:move', { row, col }, (res) => {
        if (res && !res.success) {
          showError(res.error || 'Nước đi không hợp lệ.');
        }
      });
    },
    [showError]
  );

  const voteRematch = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:rematch', (res) => {
      if (res && !res.success) {
        showError(res.error || 'Không thể gửi yêu cầu chơi lại.');
      }
    });
  }, [showError]);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:leave', () => {
      saveSession(null);
      setRoomState(null);
      setAbandonNotice(null);
      prevTurnRef.current = null;
      isHydratedRef.current = false;
    });
  }, [saveSession]);

  const sendChatMessage = useCallback(
    (text: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit('chat:send', { text }, (res) => {
        if (res && !res.success) {
          showError(res.error || 'Không thể gửi tin nhắn.');
        }
      });
    },
    [showError]
  );

  const markChatAsRead = useCallback(() => {
    setUnreadChatCount(0);
  }, []);

  return {
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
    dismissError: () => setErrorMessage(null),
  };
}
