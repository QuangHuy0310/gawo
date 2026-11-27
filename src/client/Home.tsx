import { Gamepad2, Users } from 'lucide-react';

function CaroIcon() {
  const marks = [
    '', 'O', '',
    '', 'X', 'X',
    '▲', '', 'O',
  ];

  return (
    <div className="caro-icon" aria-hidden="true">
      {marks.map((mark, index) => (
        <span className="caro-icon-cell" data-mark={mark} key={index}>{mark}</span>
      ))}
    </div>
  );
}

function XiangqiIcon() {
  return <div className="caro-icon xiangqi-cover" aria-hidden="true"><span>將</span><span>帥</span><span>將</span></div>;
}

const games = [
  { id: 'caro', name: 'Cờ Caro', players: '3–4 người', description: 'Xếp 5 quân liên tiếp trên bàn cờ 30 × 30.', Icon: CaroIcon },
  { id: 'xiangqi', name: 'Cờ Tướng Tam Quốc', players: '3 người', description: 'Đấu cờ tướng trên bàn ba phía. Chiếu bí để thắng ván.', Icon: XiangqiIcon },
];

export function Home() {
  return (
    <div className="game-home">
      <header className="game-home-brand">
        <Gamepad2 size={24} aria-hidden="true" /> UrGame
      </header>
      <main className="game-home-main">
        <h1>Chọn game</h1>
        <ul className="game-catalog" aria-label="Danh sách game">
          {games.map((game) => (
            <li key={game.id}>
              <a className="game-card glass-card" href={`#${game.id}`}>
                <game.Icon />
                <div className="game-card-content">
                  <h2>{game.name}</h2>
                  <p>{game.description}</p>
                  <div className="game-card-footer">
                    <span><Users size={17} aria-hidden="true" /> {game.players}</span>
                    <span className="game-card-play">Chơi ngay</span>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
