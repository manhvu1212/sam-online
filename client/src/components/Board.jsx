import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Card from './Card';
import TimerDisplay from './TimerDisplay';
import GameLogic from '../utils/GameLogic';

export default function Board({ socket, room, user, myCards }) {
    const [selectedCards, setSelectedCards] = useState([]);
    const [hasSkippedSam, setHasSkippedSam] = useState(false);

    const myIndex = room.players.findIndex((p) => p.id === user.id);
    const rotatedPlayers = [
        ...room.players.slice(myIndex),
        ...room.players.slice(0, myIndex)
    ];

    const isMyTurn = room.currentTurn === user.id && room.status === 'PLAYING';

    const getPositions = (total) => {
        const bottomPos = "bottom-[320px] left-1/2 -translate-x-1/2";
        const layouts = {
            1: [bottomPos],
            2: [bottomPos, "top-16 left-1/2 -translate-x-1/2"],
            3: [bottomPos, "top-24 left-[25%] -translate-x-1/2", "top-24 right-[25%] translate-x-1/2"],
            4: [bottomPos, "top-[45%] left-4 -translate-y-1/2", "top-16 left-1/2 -translate-x-1/2", "top-[45%] right-4 -translate-y-1/2"],
            5: [bottomPos, "top-[45%] left-4 -translate-y-1/2", "top-16 left-[30%] -translate-x-1/2", "top-16 right-[30%] translate-x-1/2", "top-[45%] right-4 -translate-y-1/2"]
        };
        return layouts[total] || layouts[1];
    };
    const currentLayout = getPositions(rotatedPlayers.length);

    const handleStartGame = () => {
        if (room.players.length < 2) return toast.error('Cần ít nhất 2 người!');
        socket.emit('START_GAME', room.code);
    };

    const handleRequestSam = () => socket.emit('REQUEST_SAM', room.code);

    useEffect(() => {
        if (room.status !== 'SAM_WAITING') {
            setHasSkippedSam(false);
        }
    }, [room.status]);

    const handleSkipSam = () => {
        socket.emit('SKIP_SAM', room.code);
        setHasSkippedSam(true); // Cập nhật giao diện cá nhân
    };

    const handlePassTurn = () => {
        socket.emit('PASS_TURN', room.code);
        setSelectedCards([]);
    };

    const handlePlayCards = () => {
        if (selectedCards.length === 0) return toast.error('Vui lòng chọn bài để đánh!');
        socket.emit('PLAY_CARDS', { code: room.code, cards: selectedCards });
        setSelectedCards([]);
    };

    const toggleCardSelection = (clickedCard) => {
        // 1. Nếu lá này đang được chọn -> Bấm lại để cụp nó xuống
        const isSelected = selectedCards.some(c => c.rank === clickedCard.rank && c.suit === clickedCard.suit);
        if (isSelected) {
            setSelectedCards(prev => prev.filter(c => !(c.rank === clickedCard.rank && c.suit === clickedCard.suit)));
            return;
        }

        // --- 2. THUẬT TOÁN SMART SELECT (GỢI Ý CHỌN BÀI) ---
        const lastCardsOnBoard = room.lastMove ? room.lastMove.cards : null;
        const lastCombo = GameLogic.getCombo(lastCardsOnBoard);

        if (lastCombo) {

            // TRƯỜNG HỢP A: Đối thủ đánh 1 LÁ LẺ
            if (lastCombo.type === 'SINGLE') {
                // Đặc biệt: Nếu đối thủ đánh Heo (rank 15), quét xem mình có Tứ Quý không
                if (lastCombo.highestRank === 15) {
                    const myQuads = myCards.filter(c => c.rank === clickedCard.rank);
                    if (myQuads.length === 4) {
                        setSelectedCards(myQuads); // Nhấc luôn Tứ quý lên
                        return;
                    }
                }
                // Nếu không, tự động cụp lá cũ xuống, chỉ nhấc đúng 1 lá mới lên (Auto-Swap)
                setSelectedCards([clickedCard]);
                return;
            }

            // TRƯỜNG HỢP B: Đối thủ đánh ĐÔI, BA, hoặc TỨ QUÝ
            if (['PAIR', 'TRIPLE', 'QUAD'].includes(lastCombo.type)) {
                const requiredLength = lastCombo.length; // Số lá cần thiết (Ví dụ đôi là cần 2)
                const sameRankCards = myCards.filter(c => c.rank === clickedCard.rank); // Tìm tất cả bài đồng cấp trên tay

                // Nếu mình có đủ bài để đỡ -> Tự động nhấc ĐÚNG số lượng cần thiết
                if (sameRankCards.length >= requiredLength) {
                    setSelectedCards(sameRankCards.slice(0, requiredLength));
                    return;
                } else {
                    // Nếu không đủ bộ để đè, xóa sạch các lá đang nhô, chỉ nhấc lá này lên cho gọn
                    setSelectedCards([clickedCard]);
                    return;
                }
            }
        }

        // TRƯỜNG HỢP C: Mình đang cầm cái MỞ VÒNG, hoặc đối thủ đánh SẢNH
        // -> Bắt buộc cho phép nhấc bài tự do để tự do xếp Sảnh
        setSelectedCards(prev => [...prev, clickedCard]);
    };

    const isValidMove = GameLogic.canPlay(room.lastMove?.cards, selectedCards);

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
                <button onClick={() => window.location.reload()} className="bg-zinc-800 border border-red-900/50 text-red-500 rounded px-3 py-1 text-[10px] font-bold shadow-md hover:bg-zinc-700 transition-colors">
                    THOÁT
                </button>
            </div>

            {/* 2. RENDER NGƯỜI CHƠI */}
            {rotatedPlayers.map((player, index) => {
                const isMe = index === 0;
                const isTurn = room.currentTurn === player.id && room.status === 'PLAYING';

                // KIỂM TRA XEM NGƯỜI NÀY ĐÃ BỎ LƯỢT CHƯA
                const isPassed = room.passPlayers?.includes(player.id);

                return (
                    <div key={player.id} className={`absolute ${currentLayout[index]} flex flex-col items-center z-20`}>
                        <div className="relative">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}&backgroundColor=e4e4e7`}
                                className={`
                  ${isMe ? 'w-16 h-16' : 'w-12 h-12'} rounded-full border-[1.5px] bg-zinc-800 object-cover
                  ${isTurn ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'border-zinc-700'} 
                  ${isPassed ? 'opacity-40 grayscale' : 'opacity-100'} /* LÀM MỜ NẾU BỎ LƯỢT */
                  transition-all duration-300
                `} alt={player.name}
                            />
                            {player.isBao && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] px-1 py-0.5 rounded font-black animate-pulse border border-red-400 z-40">BÁO</span>
                            )}
                            {/* HIỂN THỊ CHỮ BỎ LƯỢT ĐÈ LÊN AVATAR */}
                            {isPassed && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                    <span className="text-[8px] sm:text-[10px] font-black text-zinc-300 rotate-12 drop-shadow-md">BỎ LƯỢT</span>
                                </div>
                            )}
                        </div>
                        <div className={`mt-1.5 bg-zinc-900/90 backdrop-blur border ${isMe ? 'border-amber-600/50' : 'border-zinc-700/50'} px-2 py-0.5 rounded text-center shadow-lg ${isPassed ? 'opacity-50' : ''}`}>
                            <p className={`text-[10px] font-bold truncate max-w-[70px] ${isMe ? 'text-amber-400' : 'text-zinc-300'}`}>{player.name}</p>
                            {!isMe && <p className="text-[9px] text-amber-500/80 font-bold leading-none mt-0.5">{player.cardCount} lá</p>}
                        </div>
                    </div>
                );
            })}

            {/* 3. KHU VỰC TRUNG TÂM */}
            <div className="absolute top-[15%] bottom-[380px] left-4 right-4 flex flex-col items-center justify-center rounded-3xl z-10">

                {/* Phase: Chờ Bắt Đầu */}
                {room.status === 'WAITING' && room.hostId === user.id && (
                    <button onClick={handleStartGame} className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 font-black text-lg rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:brightness-110 transition-all z-50">
                        BẮT ĐẦU CHIA BÀI
                    </button>
                )}
                {room.status === 'WAITING' && room.hostId !== user.id && (
                    <p className="text-zinc-500 text-sm font-bold tracking-widest">CHỜ CHỦ PHÒNG...</p>
                )}

                {/* Phase: Xin Sâm (Đếm ngược 45s) */}
                {room.status === 'SAM_WAITING' && (
                    <div className="flex flex-col items-center">
                        {hasSkippedSam ? (
                            // NẾU MÌNH ĐÃ BẤM BỎ QUA -> HIỆN CHỮ CHỜ
                            <p className="text-zinc-500 text-sm font-bold tracking-widest animate-pulse">
                                ĐANG CHỜ NGƯỜI KHÁC QUYẾT ĐỊNH...
                            </p>
                        ) : (
                            // NẾU CHƯA BẤM -> HIỆN 2 NÚT VÀ ĐỒNG HỒ
                            <>
                                <p className="text-amber-500 text-lg font-black tracking-widest uppercase mb-4 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">XIN SÂM KHÔNG?</p>

                                <TimerDisplay socket={socket} type="circle" />

                                {/* 2 NÚT LỰA CHỌN */}
                                <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8 z-50">
                                    <button onClick={handleSkipSam} className="px-6 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold text-sm rounded-lg shadow-lg transition-colors">
                                        BỎ QUA
                                    </button>
                                    <button onClick={handleRequestSam} className="px-8 py-2.5 sm:py-3 bg-zinc-900 border border-red-900/50 hover:bg-red-950/40 text-red-500 font-black text-base sm:text-lg rounded-lg shadow-lg transition-colors">
                                        XIN SÂM
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Phase: Đang Chơi (Hiện bài vừa đánh ra) */}
                {room.status === 'PLAYING' && room.lastMove && (
                    <div className="relative flex flex-col items-center">
                        <p className="text-zinc-500 text-xs font-bold tracking-widest mb-3 uppercase opacity-80">
                            {room.players.find(p => p.id === room.lastMove.playerId)?.name || 'Ai đó'} ĐÁNH
                        </p>
                        <div className="flex justify-center -space-x-8 sm:-space-x-12">
                            {room.lastMove.cards.map((card) => (
                                <Card
                                    key={`${card.rank}_${card.suit}_last`}
                                    rank={card.rank} suit={card.suit}
                                    className={`w-16 sm:w-24 shadow-[0_4px_20px_rgba(0,0,0,0.8)]`}
                                />
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* 4. KHU VỰC HÀNH ĐỘNG & BÀI TRÊN TAY */}
            <div className="absolute bottom-0 left-0 w-full pb-20 sm:pb-28 flex flex-col items-center justify-end pointer-events-none z-30 overflow-x-auto">

                {/* Cụm Nút Hành Động */}
                {room.status === 'PLAYING' && isMyTurn && (
                    <div className="pointer-events-auto flex gap-3 mb-10 sm:mb-12">
                        <TimerDisplay socket={socket} type="badge" />

                        {/* CHỈ HIỆN NÚT BỎ LƯỢT KHI ĐÃ CÓ NGƯỜI ĐÁNH TRƯỚC ĐÓ (NỐI VÒNG) */}
                        {room.lastMove && (
                            <button
                                onClick={handlePassTurn}
                                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 px-6 py-2.5 rounded font-bold text-sm tracking-wider shadow-lg transition-colors">
                                BỎ LƯỢT
                            </button>
                        )}

                        <button
                            onClick={handlePlayCards}
                            className={`px-8 py-2.5 rounded font-black text-sm tracking-wider transition-colors ${isValidMove
                                ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                                }`}
                            disabled={!isValidMove}
                        >
                            ĐÁNH BÀI
                        </button>
                    </div>
                )}

                {/* Dãy bài trên tay */}
                <div className="pointer-events-auto flex justify-center w-full px-4 max-w-xl">
                    {myCards && myCards.length > 0 ? (
                        <div className="flex justify-center -space-x-8 sm:-space-x-10">
                            {myCards.map((card) => {
                                const isSelected = selectedCards.some(c => c.rank === card.rank && c.suit === card.suit);

                                return (
                                    <div
                                        key={`${card.rank}_${card.suit}`}
                                        onClick={() => toggleCardSelection(card)}
                                        // Đã loại bỏ các hiệu ứng hover nhấp nhô, chỉ tịnh tiến mượt mà khi được chọn
                                        className={`
                      cursor-pointer transition-transform duration-200 ease-out
                      ${isSelected ? '-translate-y-6 z-40' : 'z-10'}
                    `}
                                    >
                                        <Card
                                            rank={card.rank}
                                            suit={card.suit}
                                            className={`
                        w-16 sm:w-20 transition-colors duration-200
                        ${isSelected ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'border-zinc-400 shadow-[0_4px_10px_rgba(0,0,0,0.5)]'}
                      `}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-zinc-600 text-xs font-bold tracking-widest mb-2">CHƯA CÓ BÀI</p>
                    )}
                </div>
            </div>

        </div>
    );
}