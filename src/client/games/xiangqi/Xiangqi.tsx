import { useEffect, useRef, useState } from 'react';
import './xiangqi.css';
import type { FormEvent, MouseEvent } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { boardEdges, centerEntrances, givesXiangqiCheck, intersections, kingdoms, legalDestinations, newXiangqiGame, palaceDiagonals, pieceNames, playXiangqiMove, symbols } from '../../../shared/xiangqi/threeXiangqi.js';
import type { XiangqiGame } from '../../../shared/xiangqi/threeXiangqi.js';
import type { XiangqiClientEvents, XiangqiRoom, XiangqiServerEvents } from '../../../shared/xiangqi/xiangqiRoom.js';
import { playCheckChime, playPieceSound, playTurnChime, playWaitingTick, unlockGameAudio } from '../../utils/sound.js';

const storageKey = 'urgame-xiangqi-session';
const soundKey = 'urgame-xiangqi-sound';
const colors = ['#314d74', '#fb7185', '#4ade80'];
const labelColors = ['#a6bde0', '#fb7185', '#4ade80'];
const pieceInk = ['#172943', '#9e2635', '#146047'];
const piecePaper = ['#e2e8f1', '#fff0ef', '#edf9e9'];
const frameVertices = [0, 8, 45, 53, 90, 98]
  .map((id) => intersections[id])
  .sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
const framePoints = (scale: number) => frameVertices.map(({ x, y }) => `${x * scale},${y * scale}`).join(' ');
const centerCorners = centerEntrances.map((id) => {
  const { x, y } = intersections[id];
  return { x: x * .34, y: y * .34 };
});
const centerTriangle = centerCorners.map(({ x, y }) => `${x},${y}`).join(' ');
type Entry = { code: string; token: string };

function readEntry(): Entry | null {
  try {
    const entry = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    return typeof entry?.code === 'string' && typeof entry?.token === 'string' ? entry : null;
  } catch {
    return null;
  }
}

function saveEntry(entry: Entry | null) {
  try {
    if (entry) sessionStorage.setItem(storageKey, JSON.stringify(entry));
    else sessionStorage.removeItem(storageKey);
  } catch {
    // The live room remains available when browser storage is disabled.
  }
}

export function Xiangqi() {
  const socket = useRef<Socket<XiangqiServerEvents, XiangqiClientEvents> | null>(null);
  const entry = useRef<Entry | null>(readEntry());
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  const [room, setRoom] = useState<XiangqiRoom | null>(null);
  const [seat, setSeat] = useState(0);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [selection, setSelection] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);
  const [offlineGame, setOfflineGame] = useState<XiangqiGame | null>(null);
  const [viewOffset, setViewOffset] = useState(0);
  const boardLayer = useRef<SVGGElement>(null);
  const previousGame = useRef<XiangqiGame | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem(soundKey) !== 'off'; }
    catch { return true; }
  });
  const isOffline = offlineGame !== null;

  useEffect(() => {
    if (isOffline) return;
    const serverUrl = import.meta.env.VITE_SERVER_URL || (
      import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:3001` : window.location.origin
    );
    const connection: Socket<XiangqiServerEvents, XiangqiClientEvents> = io(new URL('/xiangqi', new URL(serverUrl, window.location.href)).href);
    socket.current = connection;
    connection.on('connect', () => {
      setConnected(true);
      if (entry.current) {
        setPending(true);
        connection.timeout(5000).emit('enter', entry.current, (failure, reply) => {
          setPending(false);
          if (failure) {
            connection.disconnect().connect();
          } else if ('error' in reply) {
            entry.current = null;
            saveEntry(null);
            setRoom(null);
            setError(reply.error);
          }
        });
      }
    });
    connection.on('disconnect', () => {
      setConnected(false);
      setPending(false);
    });
    connection.on('room', (state, playerSeat) => {
      setRoom(state);
      setSeat(playerSeat);
      setError('');
      setSelection(null);
      if (!state.game?.result) setVoted(false);
    });
    connection.on('closed', (reason) => {
      entry.current = null;
      saveEntry(null);
      setRoom(null);
      setError(reason);
    });
    return () => {
      connection.disconnect();
      socket.current = null;
    };
  }, [isOffline]);

  function enter(event: FormEvent, roomCode?: string) {
    event.preventDefault();
    if (!socket.current?.connected || pending) return;
    setError('');
    setPending(true);
    socket.current.timeout(5000).emit('enter', { code: roomCode, name }, (failure, reply) => {
      setPending(false);
      if (failure) setError('Máy chủ phản hồi quá chậm. Hãy thử lại.');
      else if ('error' in reply) setError(reply.error);
      else {
        entry.current = reply;
        saveEntry(reply);
      }
    });
  }

  function leave() {
    socket.current?.emit('leave');
    entry.current = null;
    saveEntry(null);
    setRoom(null);
    setSelection(null);
    setVoted(false);
    setViewOffset(0);
  }

  function resetOffline() {
    setError('');
    setSelection(null);
    setOfflineGame(newXiangqiGame());
    setViewOffset(0);
  }

  const game = offlineGame ?? room?.game;
  const controlledSide = offlineGame?.turn ?? seat;
  const bottomSide = (controlledSide + viewOffset) % kingdoms.length;
  const boardRotation = -120 * bottomSide;
  const paused = !isOffline && (!connected || pending || room?.players.some((player) => !player.connected));
  const myTurn = !!game && !game.result && !paused && game.turn === controlledSide;
  const targets = myTurn && selection !== null ? legalDestinations(game, selection) : [];

  useEffect(() => {
    if (paused) return;
    const previous = previousGame.current;
    previousGame.current = game ?? null;
    if (!game || game === previous) return;
    const afterMove = previous && previous.turn !== game.turn && game.lastMove;
    if (previous && afterMove) playPieceSound(soundEnabled, previous.board[afterMove.to] !== null);
    if (afterMove && (game.checkedBy.length > 0 || givesXiangqiCheck(game, previous.turn))) {
      playCheckChime(soundEnabled, 0.15);
    } else if (myTurn && (!game.lastMove || afterMove)) {
      playTurnChime(soundEnabled, afterMove ? 0.15 : 0);
    }
  }, [game, myTurn, paused, soundEnabled]);

  const turn = game?.turn;
  const lastMove = game?.lastMove;
  const lastFrom = lastMove?.from;
  const lastTo = lastMove?.to;
  useEffect(() => {
    if (!myTurn || !soundEnabled) return;
    const tick = () => {
      if (!document.hidden) playWaitingTick();
    };
    let interval: number | undefined;
    const delay = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 1000);
    }, 4000);
    return () => {
      window.clearTimeout(delay);
      window.clearInterval(interval);
    };
  }, [myTurn, soundEnabled, turn, lastFrom, lastTo]);

  function toggleSound() {
    const enabled = !soundEnabled;
    setSoundEnabled(enabled);
    try { localStorage.setItem(soundKey, enabled ? 'on' : 'off'); }
    catch { /* The setting still applies to this page. */ }
  }
  function choose(id: number) {
    if (!game || !myTurn) return;
    if (selection !== null && targets.includes(id)) {
      if (offlineGame) {
        const updated = playXiangqiMove(offlineGame, selection, id);
        if (updated) setOfflineGame(updated);
      } else {
        socket.current?.emit('move', selection, id);
      }
      setSelection(null);
    } else {
      setSelection(game.board[id]?.side === controlledSide && selection !== id ? id : null);
    }
  }

  function chooseBoardPoint(event: MouseEvent<SVGSVGElement>) {
    if (!myTurn) return;
    const screenMatrix = boardLayer.current?.getScreenCTM();
    if (!screenMatrix) return;
    const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(screenMatrix.inverse());
    let closestId = -1;
    let closestDistance = 0.5 ** 2;
    intersections.forEach(({ x, y }, id) => {
      const distance = (cursor.x - x) ** 2 + (cursor.y - y) ** 2;
      if (distance < closestDistance) {
        closestId = id;
        closestDistance = distance;
      }
    });
    if (closestId !== -1) choose(closestId);
    else setSelection(null);
  }

  return (
    <div className="xiangqi-page" onPointerDownCapture={soundEnabled ? unlockGameAudio : undefined}
      onKeyDownCapture={soundEnabled ? unlockGameAudio : undefined}>
      <header className="game-home-brand xiangqi-header">
        <a className="game-home-link" href="#home">Trang chủ</a>
        <h1>Cờ Tướng Tam Quốc</h1>
        <button type="button" className="btn btn-secondary" aria-pressed={soundEnabled} onClick={toggleSound}>
          Âm thanh {soundEnabled ? 'bật' : 'tắt'}
        </button>
        {game && (
          <button type="button" className="btn btn-secondary"
            title={`Đang nhìn từ phía ${kingdoms[bottomSide]}`}
            onClick={() => setViewOffset((offset) => (offset + 1) % kingdoms.length)}>
            Xoay bàn
          </button>
        )}
        {isOffline ? (
          <button type="button" className="btn btn-secondary" onClick={() => {
            setOfflineGame(null);
            setSelection(null);
          }}>Về sảnh</button>
        ) : room && <button type="button" className="btn btn-secondary" onClick={leave}>Rời phòng</button>}
      </header>
      <main className="xiangqi-main">
        {error && <p role="alert" className="xiangqi-error">{error}</p>}
        {!room && !isOffline && (
          <section className="glass-card xiangqi-lobby" aria-label="Chơi trực tuyến">
            <button type="button" className="btn btn-primary" onClick={resetOffline} disabled={pending}>Chơi thử offline</button>
            <h2>Chơi trực tuyến</h2>
            <p>Tạo phòng rồi gửi mã để mời hai người bạn.</p>
            <label htmlFor="xiangqi-name">Tên hiển thị</label>
            <input id="xiangqi-name" className="input-control" value={name} maxLength={20} onChange={(event) => setName(event.target.value)} />
            <form onSubmit={enter}><button className="btn btn-primary" disabled={!connected || pending}>Tạo phòng</button></form>
            <form onSubmit={(event) => enter(event, code.trim())}>
              <label htmlFor="xiangqi-code">Mã phòng</label>
              <input id="xiangqi-code" className="input-control" value={code} required maxLength={6} onChange={(event) => setCode(event.target.value.toUpperCase())} />
              <button className="btn btn-secondary" disabled={!connected || pending || code.trim().length !== 6}>Vào phòng</button>
            </form>
            {!connected && <p role="status">Đang kết nối máy chủ…</p>}
          </section>
        )}
        {(room || isOffline) && (
          <>
            <div className="xiangqi-room">
              {isOffline ? <p><strong>Chơi thử offline</strong> · Lần lượt điều khiển cả ba phe</p>
                : <p>Mã phòng <strong>{room?.code}</strong></p>}
              <ul aria-label="Người chơi">
                {kingdoms.map((kingdom, index) => (
                  <li key={kingdom} data-active={game?.turn === index && !game.result} style={{ borderLeftColor: colors[index] }}>
                    <strong style={{ color: labelColors[index] }}><span className="xiangqi-seat">P{index + 1}</span> {kingdom}</strong>
                    {!isOffline && <span>{room?.players[index]?.name ?? 'Đang chờ'}{seat === index ? ' (Bạn)' : ''}</span>}
                  </li>
                ))}
              </ul>
            </div>
            <p className="xiangqi-status" role="status">
              {paused ? 'Ván tạm dừng để người chơi kết nối lại.'
                : !game ? `Đang chờ đủ 3 người (${room?.players.length ?? 0}/3).`
                : game.result ? (game.result.winner !== null ? `${kingdoms[game.result.winner]} thắng bằng chiếu bí!`
                  : game.result.reason === 'joint-mate' ? 'Hòa vì hai phe cùng chiếu bí.' : 'Hòa vì hết nước đi hợp lệ.')
                : `${myTurn && !isOffline ? 'Đến lượt bạn' : `Lượt của ${kingdoms[game.turn]}`}${game.checkedBy.length ? ` · Bị ${game.checkedBy.map((side) => kingdoms[side]).join(' và ')} chiếu` : ''}`}
            </p>
          </>
        )}
        {game && (
          <svg className="xiangqi-board" viewBox="-9.3 -8.15 18.6 16.3" role="group" aria-label="Bàn cờ tướng ba phía" onClick={chooseBoardPoint}>
            <defs>
              <linearGradient id="xiangqi-wood" x2="1" y2="1">
                <stop stopColor="#f8e4ba" />
                <stop offset=".55" stopColor="#e7bd83" />
                <stop offset="1" stopColor="#cb985d" />
              </linearGradient>
              <linearGradient id="xiangqi-rim" x2="0" y2="1">
                <stop stopColor="#88543d" />
                <stop offset="1" stopColor="#38201e" />
              </linearGradient>
              <pattern id="xiangqi-grain" patternUnits="userSpaceOnUse" width="5" height="1.1">
                <path d="M0 .26 Q1.8 .12 3 .24 T5 .26 M0 .75 Q1.4 .56 3 .73 T5 .75" fill="none" stroke="#72442c" strokeWidth=".025" opacity=".19" />
              </pattern>
            </defs>
            <g ref={boardLayer} transform={`rotate(${boardRotation})`}>
            <polygon points={framePoints(1.15)} fill="url(#xiangqi-rim)" stroke="#b68558" strokeWidth=".06" strokeLinejoin="round" />
            <polygon points={framePoints(1.105)} fill="url(#xiangqi-wood)" stroke="#fbe4af" strokeWidth=".07" strokeLinejoin="round" />
            <polygon points={framePoints(1.105)} fill="url(#xiangqi-grain)" />
            <polygon points={framePoints(1.067)} fill="none" stroke="#784b31" strokeWidth=".045" />
            <polygon points={centerTriangle} fill="#f7dfac" stroke="#754825" strokeWidth=".055" strokeLinejoin="round" />
            {centerEntrances.map((id, index) => (
              <line key={id} x1={intersections[id].x} y1={intersections[id].y}
                x2={centerCorners[index].x} y2={centerCorners[index].y} stroke="#754825" strokeWidth=".055" />
            ))}
            {[...boardEdges, ...palaceDiagonals].map(([from, to]) => (
              <line key={`${from}-${to}`} x1={intersections[from].x} y1={intersections[from].y}
                x2={intersections[to].x} y2={intersections[to].y}
                stroke={Math.floor(from / 45) !== Math.floor(to / 45) ? '#8a4e22' : '#66442e'} strokeWidth=".044" />
            ))}
            {intersections.map(({ x, y }, id) => {
              const piece = game.board[id];
              const isTarget = targets.includes(id);
              const interactive = myTurn && (piece?.side === controlledSide || isTarget);
              const selected = selection === id;
              const movedFrom = game.lastMove?.from === id;
              const movedTo = game.lastMove?.to === id;
              return (
                <g key={id} transform={`translate(${x} ${y}) rotate(${-boardRotation})`} role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined} aria-label={interactive ? (piece ? `${pieceNames[piece.kind]} ${kingdoms[piece.side]}, điểm ${id + 1}` : `Đi đến điểm ${id + 1}`) : undefined}
                  className={interactive ? 'xiangqi-point' : undefined}
                  onPointerDown={(event) => {
                    if (interactive && event.pointerType === 'mouse' && event.button === 0) event.preventDefault();
                  }}
                  onKeyDown={(event) => { if (interactive && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(id); } }}>
                  <circle r=".48" fill="transparent" pointerEvents="all" />
                  <g pointerEvents="none" aria-hidden="true">
                    {movedFrom && <circle r=".24" fill="none" stroke="#78500e" strokeWidth=".065" strokeDasharray=".13 .07" />}
                    {piece && <>
                      <circle cy=".055" r=".425" fill="#422c29" opacity=".35" />
                      <circle r=".425" fill={piecePaper[piece.side]} stroke={pieceInk[piece.side]} strokeWidth=".055" />
                      <circle r=".352" fill="none" stroke={pieceInk[piece.side]} strokeWidth=".025" opacity=".45" />
                      <text fill={pieceInk[piece.side]} fontSize=".54" fontWeight="bold" textAnchor="middle" y=".19">{symbols[piece.kind]}</text>
                    </>}
                    {movedTo && <circle r=".48" fill="none" stroke="#a36b08" strokeWidth=".073" />}
                    {selected && <circle r=".46" fill="none" stroke="#54300e" strokeWidth=".065" />}
                    {isTarget && <circle r={piece ? '.46' : '.14'} fill={piece ? 'none' : '#234b36'} stroke={piece ? '#a02233' : '#fff1c9'} strokeWidth=".065" />}
                    {interactive && <circle className="xiangqi-focus-ring" r=".49" fill="none" stroke="#172b54" strokeWidth=".045" strokeDasharray=".085 .045" />}
                  </g>
                </g>
              );
            })}
            </g>
          </svg>
        )}
        {isOffline ? (
          <button type="button" className="btn btn-secondary" onClick={resetOffline}>Chơi lại từ đầu</button>
        ) : game?.result && (
          <button className="btn btn-primary" disabled={!!paused || voted} onClick={() => {
            socket.current?.emit('rematch');
            setVoted(true);
          }}>{voted ? 'Đang chờ hai người còn lại' : 'Đồng ý chơi lại'}</button>
        )}
        <details className="xiangqi-rules">
          <summary>Luật chơi</summary>
          <p>Mỗi ván bốc ngẫu nhiên phe đi đầu, rồi đi theo vòng P1 Ngụy, P2 Thục, P3 Ngô. Chọn quân để xem các nước hợp lệ. Từ cột giữa, Xe, Pháo và Tốt có thể qua một cạnh tam giác để sang một trong hai phe đối diện. Quân chỉ dừng ở giao điểm của lưới cờ.</p>
          <p>Khi đến lượt một phe bị chiếu và không có nước thoát, phe chiếu thắng. Nếu cả hai phe cùng chiếu bí, hoặc phe tới lượt hết nước mà không bị chiếu, ván hòa.</p>
        </details>
      </main>
    </div>
  );
}
