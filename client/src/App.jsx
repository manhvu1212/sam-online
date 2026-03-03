import React, { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import Board from './components/Board'; // Nhập Board vào
import { Toaster, toast } from 'react-hot-toast';

function App() {
  const { socket, user } = useSocket();
  const [room, setRoom] = useState(null);

  const [myCards, setMyCards] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('ROOM_CREATED', (code) => {
      socket.emit('JOIN_ROOM', code);
    });

    socket.on('ROOM_UPDATE', (roomData) => {
      setRoom(roomData); // Cập nhật toàn bộ State phòng
    });

    socket.on('GAME_DEAL_CARDS', (cards) => {
      // Sắp xếp bài từ bé đến lớn (3 -> 2) cho dễ nhìn
      const sortedCards = cards.sort((a, b) => a.rank - b.rank);
      setMyCards(sortedCards);
      toast.success('Đã chia bài xong!', { id: 'deal' });
    });

    socket.on('UPDATE_HAND', (newCards) => {
      // Nhận mảng bài mới từ Server, sắp xếp lại và hiển thị luôn. Chắc chắn mất lá bài đã đánh!
      const sortedCards = newCards.sort((a, b) => a.rank - b.rank);
      setMyCards(sortedCards);
    });

    socket.on('ERROR', (msg) => {
      toast.error(msg, { duration: 3000 });
    });

    return () => {
      socket.off('ROOM_CREATED'); socket.off('ROOM_UPDATE');
      socket.off('GAME_DEAL_CARDS'); socket.off('UPDATE_HAND');
      socket.off('ERROR');
    };
  }, [socket]);

  if (!user || !socket) {
    return <div className="h-screen flex items-center justify-center bg-zinc-950 text-amber-500 font-bold tracking-widest">ĐANG KẾT NỐI...</div>;
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />

      {/* Nếu có room thì render Board, nếu không thì render Lobby */}
      {room ? (
        <Board socket={socket} room={room} user={user} myCards={myCards} />
      ) : (
        <Lobby socket={socket} user={user} />
      )}
    </>
  );
}

export default App;