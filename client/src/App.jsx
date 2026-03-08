import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import Board from './components/Board';

function App() {
  const { socket, user } = useSocket();
  const [room, setRoom] = useState(null);

  const [myCards, setMyCards] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('ROOM_CREATED', (code) => {
      toast.success('Phòng chơi đã sẵn sàng!', { id: "CREATE_ROOM", duration: 1000 });
    });

    socket.on('ROOM_UPDATE', (roomData) => {
      setRoom(roomData); // Cập nhật toàn bộ State phòng
    });

    socket.on('GAME_DEAL_CARDS', (cards) => {
      // Sắp xếp bài từ bé đến lớn (3 -> 2) cho dễ nhìn
      const sortedCards = cards.sort((a, b) => a.rank - b.rank);
      setMyCards(sortedCards);
    });

    socket.on('UPDATE_HAND', (newCards) => {
      // Nhận mảng bài mới từ Server, sắp xếp lại và hiển thị luôn. Chắc chắn mất lá bài đã đánh!
      const sortedCards = newCards.sort((a, b) => a.rank - b.rank);
      setMyCards(sortedCards);
    });

    socket.on('NOTIFICATION', (data) => {
      if (data.type === 'success') {
        toast.success(data.message, { ...data.config, duration: 2000 });
      } else if (data.type == 'loading') {
        toast.loading(data.message, { ...data.config, duration: 2000 });
      } else if (data.type == 'error') {
        toast.error(data.message, { ...data.config, duration: 2000 });
      } else {
        toast.custom(data.message, { ...data.config, duration: 2000 });
      }
    });

    return () => {
      socket.off('ROOM_CREATED'); socket.off('ROOM_UPDATE');
      socket.off('GAME_DEAL_CARDS'); socket.off('UPDATE_HAND');
      socket.off('NOTIFICATION');
    };
  }, [socket]);

  if (!user || !socket) {
    return <div className="h-screen flex items-center justify-center bg-zinc-950 text-amber-500 font-bold tracking-widest">ĐANG KẾT NỐI...</div>;
  }

  return (
    <div className="w-[100dvw] h-[100dvh] overflow-hidden overscroll-none
                        [@media(display-mode:standalone)]:pt-[50px]
                        [@media(display-mode:standalone)]:pb-[16px]"
    >
      <div className="relative w-full h-full">
        <Toaster position="top-center" reverseOrder={false}
          containerClassName="[@media(display-mode:standalone)]:!top-[50px]"
        />

        {/* Nếu có room thì render Board, nếu không thì render Lobby */}
        {room ? (
          <Board socket={socket} room={room} user={user} myCards={myCards} />
        ) : (
          <Lobby socket={socket} user={user} />
        )}
      </div>
    </div >
  );
}

export default App;