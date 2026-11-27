import { useEffect, useState } from 'react';
import { Home } from './Home.js';
import { Caro } from './games/caro/Caro.js';
import { Xiangqi } from './games/xiangqi/Xiangqi.js';

export function App() {
  const [page, setPage] = useState(() => window.location.hash);

  useEffect(() => {
    const updatePage = () => setPage(window.location.hash);
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);

  return (
    <>
      <Caro active={page === '#caro'} />
      {page === '#xiangqi' && <Xiangqi />}
      {page !== '#caro' && page !== '#xiangqi' && <Home />}
    </>
  );
}
