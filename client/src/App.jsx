import React, { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import Board from './components/Board'; // Nhập Board vào
import { Toaster, toast } from 'react-hot-toast';

function App() {
  const { socket, user } = useSocket();
  const [room, setRoom] = useState(null);

  const [myCards, setMyCards] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

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

    // HỨNG SỰ KIỆN ĐÁNH BÀI THÀNH CÔNG
    socket.on('MOVE_ACCEPTED', (data) => {
      // Nếu là mình đánh, thì xóa các lá bài vừa đánh khỏi myCards
      if (user && data.playerId === user.id) {
        setMyCards(prev => prev.filter(c =>
          !data.cards.find(sc => sc.rank === c.rank && sc.suit === c.suit)
        ));
      }
    });

    // HỨNG SỰ KIỆN THỜI GIAN VÀ CHUYỂN LƯỢT
    socket.on('SAM_TIMER', (time) => setTimeLeft(time));
    socket.on('SAM_ENDED', (data) => {
      setTimeLeft(0);
      toast(data.msg, { icon: '⏳' });
    });
    socket.on('SAM_CONFIRMED', (data) => {
      setTimeLeft(0);
      toast.success('Có người đã Báo Sâm!', { icon: '🔥' });
    });
    socket.on('TURN_UPDATE', (data) => {
      setTimeLeft(data.timeout);
      if (user && data.playerId === user.id) {
        toast('Đến lượt bạn!', { icon: '👉', duration: 2000, position: 'bottom-center' });
      }
    });

    socket.on('ERROR', (msg) => {
      toast.error(msg, { duration: 3000 });
    });

    return () => {
      socket.off('ROOM_CREATED'); socket.off('ROOM_UPDATE');
      socket.off('GAME_DEAL_CARDS'); socket.off('MOVE_ACCEPTED');
      socket.off('SAM_TIMER'); socket.off('SAM_ENDED');
      socket.off('SAM_CONFIRMED'); socket.off('TURN_UPDATE');
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
        <Board socket={socket} room={room} user={user} myCards={myCards} timeLeft={timeLeft} />
      ) : (
        <Lobby socket={socket} user={user} />
      )}
    </>
  );
}

export default App;