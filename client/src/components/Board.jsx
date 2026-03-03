import React, { useState, useMemo, useEffect, useCallback } from 'react';
import GameLogic from '../utils/GameLogic';
import RoomHeader from './RoomHeader';
import PlayerAvatar from './PlayerAvatar';
import CenterStage from './CenterStage';
import ActionBar from './ActionBar';
import PlayerHand from './PlayerHand';
import GameOverModal from './GameOverModal';

export default function Board({ socket, room, user, myCards }) {
    // --- 1. STATES ---
    const [selectedCards, setSelectedCards] = useState([]);
    const [hasSkippedSam, setHasSkippedSam] = useState(false);
    const [gameResults, setGameResults] = useState(null);

    // Reset xin sâm khi chuyển pha
    useEffect(() => {
        if (room.status !== 'SAM_WAITING') setHasSkippedSam(false);
    }, [room.status]);

    useEffect(() => {
        // Nếu ván đấu chưa kết thúc (hoặc vừa Reset ván mới), xóa bảng kết quả
        if (room.status !== 'ENDED') setGameResults(null);

        // Hứng dữ liệu từ Server
        const handleGameOver = (data) => setGameResults(data.results);
        socket.on('GAME_OVER', handleGameOver);

        return () => socket.off('GAME_OVER', handleGameOver);
    }, [socket, room.status]);

    // --- 2. LOGIC TÍNH TOÁN (ĐÃ ĐƯỢC CACHING) ---
    const rotatedPlayers = useMemo(() => {
        const myIndex = room.players.findIndex((p) => p.id === user.id);
        if (myIndex === -1) return room.players;
        return [...room.players.slice(myIndex), ...room.players.slice(0, myIndex)];
    }, [room.players, user.id]);

    const currentLayout = useMemo(() => {
        const bottomPos = "bottom-[320px] left-1/2 -translate-x-1/2";
        const layouts = {
            1: [bottomPos],
            2: [bottomPos, "top-16 left-1/2 -translate-x-1/2"],
            3: [bottomPos, "top-24 left-[25%] -translate-x-1/2", "top-24 right-[25%] translate-x-1/2"],
            4: [bottomPos, "top-[45%] left-4 -translate-y-1/2", "top-16 left-1/2 -translate-x-1/2", "top-[45%] right-4 -translate-y-1/2"],
            5: [bottomPos, "top-[45%] left-4 -translate-y-1/2", "top-16 left-[30%] -translate-x-1/2", "top-16 right-[30%] translate-x-1/2", "top-[45%] right-4 -translate-y-1/2"]
        };
        return layouts[rotatedPlayers.length] || layouts[1];
    }, [rotatedPlayers.length]);

    const isValidMove = useMemo(() => {
        if (!selectedCards || selectedCards.length === 0) return false;
        return GameLogic.canPlay(room.lastMove?.cards, selectedCards);
    }, [selectedCards, room.lastMove]);

    const isMyTurn = room.currentTurn === user.id && room.status === 'PLAYING';

    // --- 3. EVENT HANDLERS (TRUYỀN XUỐNG COMPONENT CON) ---
    const handleStartGame = useCallback(() => socket.emit('START_GAME', room.code), [socket, room.code]);
    const handleRequestSam = useCallback(() => socket.emit('REQUEST_SAM', room.code), [socket, room.code]);
    const handleSkipSam = useCallback(() => {
        socket.emit('SKIP_SAM', room.code);
        setHasSkippedSam(true);
    }, [socket, room.code]);

    const handlePassTurn = useCallback(() => {
        socket.emit('PASS_TURN', room.code);
        setSelectedCards([]);
    }, [socket, room.code]);

    const handlePlayCards = useCallback(() => {
        if (!isValidMove) return;
        socket.emit('PLAY_CARDS', { code: room.code, cards: selectedCards });
        setSelectedCards([]);
    }, [isValidMove, socket, room.code, selectedCards]);

    // --- THUẬT TOÁN CHỌN BÀI THÔNG MINH ---
    const toggleCardSelection = (clickedCard) => {
        // 1. Cụp lá bài xuống nếu đang được chọn
        const isSelected = selectedCards.some(c => c.rank === clickedCard.rank && c.suit === clickedCard.suit);
        if (isSelected) {
            setSelectedCards(prev => prev.filter(c => !(c.rank === clickedCard.rank && c.suit === clickedCard.suit)));
            return;
        }

        const lastCardsOnBoard = room.lastMove ? room.lastMove.cards : null;
        const lastCombo = GameLogic.getCombo(lastCardsOnBoard);

        if (lastCombo) {
            // TRƯỜNG HỢP A: Đối thủ đánh 1 LÁ LẺ (Gợi ý chặt Heo)
            if (lastCombo.type === 'SINGLE') {
                if (lastCombo.highestRank === 15) {
                    const myQuads = myCards.filter(c => c.rank === clickedCard.rank);
                    if (myQuads.length === 4) return setSelectedCards(myQuads);
                }
                return setSelectedCards([clickedCard]);
            }

            // TRƯỜNG HỢP B: Đối thủ đánh ĐÔI, BA, TỨ QUÝ (Gợi ý nhấc cả bộ)
            if (['PAIR', 'TRIPLE', 'QUAD'].includes(lastCombo.type)) {
                const requiredLength = lastCombo.length;
                const sameRankCards = myCards.filter(c => c.rank === clickedCard.rank);

                if (sameRankCards.length >= requiredLength) return setSelectedCards(sameRankCards.slice(0, requiredLength));
                return setSelectedCards([clickedCard]);
            }

            // TRƯỜNG HỢP C: Đối thủ đánh SẢNH (Gợi ý tự động nhấc sảnh)
            if (lastCombo.type === 'STRAIGHT') {
                const requiredLength = lastCombo.length;
                const clickedRank = clickedCard.rank; // Lấy trực tiếp rank (số)

                // Dò sảnh: Cộng dần rank lên để tìm các lá tiếp theo
                let autoStraight = [];
                for (let i = 0; i < requiredLength; i++) {
                    // sảng không có 2
                    const nextCard = myCards.find(c => c.rank != 15 && c.rank === clickedRank + i);
                    if (nextCard) {
                        autoStraight.push(nextCard);
                    } else {
                        break; // Đứt sảnh
                    }
                }

                if (autoStraight.length === requiredLength) return setSelectedCards(autoStraight);

                if (selectedCards.length >= requiredLength) return setSelectedCards([clickedCard]);

                return setSelectedCards(prev => [...prev, clickedCard]);
            }
        }

        // TRƯỜNG HỢP D: Mở vòng (Tự do nhặt bài)
        setSelectedCards(prev => [...prev, clickedCard]);
    };

    // --- 4. RENDER GIAO DIỆN CHÍNH ---
    return (
        <div className="relative w-full h-screen bg-[#0a0a0c] text-zinc-200 overflow-hidden flex flex-col">

            <RoomHeader code={room.code} bet={room.settings.bet} />

            {rotatedPlayers.map((player, index) => (
                <PlayerAvatar
                    key={player.id}
                    player={player}
                    isMe={index === 0}
                    isTurn={room.currentTurn === player.id && room.status === 'PLAYING'}
                    isPassed={room.passPlayers?.includes(player.id)}
                    positionClass={currentLayout[index]}
                />
            ))}

            <CenterStage
                socket={socket}
                room={room}
                user={user}
                hasSkippedSam={hasSkippedSam}
                onStartGame={handleStartGame}
                onSkipSam={handleSkipSam}
                onRequestSam={handleRequestSam}
            />

            <div className="absolute bottom-0 left-0 w-full pb-20 sm:pb-28 flex flex-col items-center justify-end pointer-events-none z-30 overflow-x-auto">
                <ActionBar
                    socket={socket}
                    room={room}
                    isMyTurn={isMyTurn}
                    isValidMove={isValidMove}
                    onPassTurn={handlePassTurn}
                    onPlayCards={handlePlayCards}
                />

                <div className="pointer-events-auto flex justify-center w-full px-4 max-w-xl">
                    <PlayerHand
                        myCards={myCards}
                        selectedCards={selectedCards}
                        toggleCardSelection={toggleCardSelection}
                        isValidMove={isValidMove}
                    />
                </div>
            </div>

            {/* MÀN HÌNH TỔNG KẾT (CHỈ HIỆN KHI CÓ KẾT QUẢ VÀ GAME ENDED) */}
            <GameOverModal
                room={room}
                user={user}
                results={gameResults}
                onRestart={handleStartGame}
            />
        </div>
    );
}