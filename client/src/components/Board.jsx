import React from 'react';
import { toast } from 'react-hot-toast';
import Card from './Card';

export default function Board({ socket, room, user, myCards }) {
    // 1. XOAY MẢNG: Bạn luôn ở index 0
    const myIndex = room.players.findIndex((p) => p.id === user.id);
    const rotatedPlayers = [
        ...room.players.slice(myIndex),
        ...room.players.slice(0, myIndex)
    ];
    const me = rotatedPlayers[0];

    // 2. THUẬT TOÁN CHIA ĐỀU TRÊN VÒNG TRÒN (Tự động co giãn theo kích thước bàn)
    const getPlayerPosition = (index, total) => {
        // Góc bắt đầu 90 độ (6h chiều)
        const angleDeg = 90 + index * (360 / total);
        const angleRad = angleDeg * (Math.PI / 180);

        // Tọa độ tâm (50%, 50%), bán kính 50%
        const x = 50 + 50 * Math.cos(angleRad);
        const y = 50 + 50 * Math.sin(angleRad);

        return { left: `${x}%`, top: `${y}%` };
    };

    const handleStartGame = () => {
        if (room.players.length < 2) {
            toast.error('Cần ít nhất 2 người để bắt đầu!');
            return;
        }
        socket.emit('START_GAME', room.code);
    };

    return (
        <div className="relative w-full h-screen bg-[#0a0a0c] text-zinc-200 overflow-hidden flex flex-col">

            {/* 1. HEADER */}
            <div className="absolute top-3 left-3 z-50 pointer-events-auto">
                <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800/50 rounded p-1.5 shadow-md flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Bàn VIP</span>
                    <span className="text-sm text-amber-500 font-black tracking-widest">{room.code}</span>
                </div>
            </div>

            <div className="absolute top-3 right-3 z-50 pointer-events-auto flex items-center gap-2">
                <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800/50 rounded px-2 py-1 shadow-md">
                    <span className="text-[10px] text-zinc-400">Cược: <span className="text-amber-500 font-bold">{room.settings.bet / 1000}k</span></span>
                </div>
                <button onClick={() => window.location.reload()} className="bg-red-900/80 border border-red-700 text-white rounded px-3 py-1 text-[10px] font-bold shadow-md active:scale-95 transition-transform">
                    THOÁT
                </button>
            </div>

            {/* 2. KHU VỰC BÀN TRÒN CHÍNH (ĐÃ ĐƯỢC PHÓNG TO & TỐI ƯU) */}
            {/* Dùng pb-[200px] để đẩy bàn nhích lên trên một chút, né dãy bài cầm tay */}
            <div className="flex-1 w-full flex items-center justify-center pb-[200px] sm:pb-[240px] pt-16">

                {/* Kích thước bàn: Rộng 92% màn hình mobile, tối đa 450px. */}
                <div className="relative w-[92%] max-w-[450px] sm:max-w-[600px] aspect-square bg-zinc-900/40 border-[1.5px] border-zinc-700/50 rounded-full shadow-[inset_0_0_80px_rgba(0,0,0,0.6)] flex items-center justify-center">

                    {/* Logo giữa bàn */}
                    <div className="w-24 h-24 rounded-full border border-zinc-800 flex items-center justify-center opacity-30 pointer-events-none">
                        <span className="text-2xl font-black text-amber-500 tracking-widest -rotate-12">VIP</span>
                    </div>

                    {/* RENDER NGƯỜI CHƠI BÁM TRÊN VÀNH BÀN */}
                    {rotatedPlayers.map((player, index) => {
                        const isMe = index === 0;
                        const isMyTurn = room.currentTurn === player.id;
                        const pos = getPlayerPosition(index, rotatedPlayers.length);

                        return (
                            <div
                                key={player.id}
                                className="absolute flex flex-col items-center z-20 transition-all duration-700 ease-in-out -translate-x-1/2 -translate-y-1/2"
                                style={{ left: pos.left, top: pos.top }}
                            >
                                <div className="relative">
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}&backgroundColor=e4e4e7`}
                                        className={`
                      ${isMe ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-14 sm:h-14'} 
                      rounded-full border-2 bg-zinc-800 object-cover
                      ${isMyTurn ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-110' : 'border-zinc-700'} 
                      transition-all duration-300
                    `}
                                        alt={player.name}
                                    />
                                    {player.isBao && (
                                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black animate-pulse border border-red-400 z-40">BÁO</span>
                                    )}
                                </div>

                                <div className={`mt-1.5 bg-zinc-900/90 backdrop-blur border ${isMe ? 'border-amber-600/50' : 'border-zinc-700/50'} px-2.5 py-0.5 rounded text-center shadow-lg`}>
                                    <p className={`text-[10px] sm:text-xs font-bold truncate max-w-[70px] sm:max-w-[90px] ${isMe ? 'text-amber-400' : 'text-zinc-300'}`}>
                                        {player.name}
                                    </p>
                                    {!isMe && (
                                        <p className="text-[9px] sm:text-[10px] text-amber-500/80 font-bold leading-none mt-0.5">{player.cardCount} lá</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* NÚT CHIA BÀI TRUNG TÂM */}
                    <div className="absolute z-10 flex items-center justify-center">
                        {room.status === 'WAITING' && room.hostId === user.id && (
                            <button
                                onClick={handleStartGame}
                                className="px-8 py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 font-black text-sm sm:text-base rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all z-50"
                            >
                                CHIA BÀI
                            </button>
                        )}
                        {room.status === 'WAITING' && room.hostId !== user.id && (
                            <p className="text-zinc-500 text-xs sm:text-sm font-bold tracking-widest animate-pulse">CHỜ CHỦ PHÒNG...</p>
                        )}
                    </div>

                </div>
            </div>

            {/* 4. KHU VỰC BÀI TRÊN TAY - CẬP NHẬT DÀN NGANG TUYỆT ĐỐI */}
            <div className="absolute bottom-0 left-0 w-full pb-20 sm:pb-28 flex flex-col items-center justify-end pointer-events-none z-30 overflow-x-auto">

                {/* Cụm Nút Hành Động (Giữ nguyên) */}
                <div className="pointer-events-auto flex gap-3 mb-10 sm:mb-12">
                    <button className="bg-zinc-800 border border-zinc-600 text-zinc-300 px-6 py-3 rounded-full font-bold text-sm tracking-wider shadow-lg active:scale-95 transition-all">
                        BỎ LƯỢT
                    </button>
                    <button className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-zinc-950 px-8 py-3 rounded-full font-black text-sm tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition-all">
                        ĐÁNH BÀI
                    </button>
                </div>

                {/* --- DẠY BÀI TRÊN TAY: ĐÃ DÀN NGANG KHÔNG XOAY --- */}
                <div className="pointer-events-auto flex justify-center w-full px-4 max-w-xl">
                    {myCards && myCards.length > 0 ? (
                        <div className="flex justify-center -space-x-8 sm:-space-x-10">
                            {myCards.map((card, i) => (
                                <Card
                                    key={`${card.rank}_${card.suit}`}
                                    rank={card.rank}
                                    suit={card.suit}
                                    className={`
                    w-16 sm:w-20 
                    hover:-translate-y-10 hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:border-amber-500 cursor-pointer 
                    transition-all duration-200
                  `}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-zinc-600 text-xs font-bold tracking-widest mb-2">CHƯA CÓ BÀI</p>
                    )}
                </div>
            </div>

        </div>
    );
}