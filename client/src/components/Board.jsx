import React, { useState, useMemo, useEffect, useCallback } from 'react';
import useAutoWakeLock from '../hooks/useWakeLock';
import GameLogic from '../utils/GameLogic';
import RoomHeader from './RoomHeader';
import CenterStage from './CenterStage';
import ActionBar from './ActionBar';
import PlayerHand from './PlayerHand';
import GameOverModal from './GameOverModal';

export default function Board({ socket, room, user, myCards }) {
    useAutoWakeLock();

    // --- 1. STATES ---
    const isReady = room.matchPlayes.find(p => p.id == user.id)?.isReady
    const skipSam = room.matchPlayes.find(p => p.id == user.id)?.skipSam
    const isMyTurn = room.currentTurnId === user.id && room.status === 'PLAYING';
    const gameResults = room.results

    const [selectedCards, setSelectedCards] = useState([]);

    const isValidMove = useMemo(() => {
        if (!selectedCards || selectedCards.length === 0) return false;
        return GameLogic.canPlay(room.lastMove?.cards, selectedCards);
    }, [selectedCards, room.lastMove]);


    // --- 3. EVENT HANDLERS (TRUYỀN XUỐNG COMPONENT CON) ---
    const handleStartGame = useCallback(() => socket.emit('START_GAME', room.code), [socket, room.code]);
    const handleRequestSam = useCallback(() => socket.emit('REQUEST_SAM', room.code), [socket, room.code]);
    const handleSkipSam = useCallback(() => {
        socket.emit('SKIP_SAM', room.code);
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

    const handleReadyNext = useCallback(() => {
        socket.emit('READY_NEXT', room.code); // Báo cho Server
    }, [socket, room.code]);

    // --- 4. RENDER GIAO DIỆN CHÍNH ---
    return (
        <div className="w-full h-[100dvh] 
                        bg-[#0a0a0c] text-zinc-200 
                        overflow-hidden overscroll-none
                        pt-[env(safe-area-inset-top)]
                        pb-[env(safe-area-inset-bottom)]
                        pl-[env(safe-area-inset-left)]
                        pr-[env(safe-area-inset-right)]
                        flex flex-col"
        >

            <RoomHeader code={room.code} bet={room.settings.bet} />

            <div className="flex-1 min-h-0 pt-15 flex flex-col items-center justify-center z-10 pointer-events-none">
                <CenterStage
                    socket={socket}
                    room={room}
                    user={user}
                    skipSam={skipSam}
                    onStartGame={handleStartGame}
                />
            </div>

            <div className="shrink-0 w-full pt-5 pb-3 flex flex-col items-center justify-center pointer-events-none z-30 overflow-x-auto">
                <ActionBar
                    socket={socket}
                    roomStatus={room.status}
                    skipSam={skipSam}
                    onSkipSam={handleSkipSam}
                    onRequestSam={handleRequestSam}
                    isMyTurn={isMyTurn}
                    lastMove={room.lastMove}
                    isValidMove={isValidMove}
                    onPassTurn={handlePassTurn}
                    onPlayCards={handlePlayCards}
                />

                <div className="pointer-events-auto flex justify-center w-full px-4 max-w-xl">
                    <PlayerHand
                        myCards={myCards}
                        lastMove={room.lastMove}
                        roomStatus={room.status}
                        selectedCards={selectedCards}
                        setSelectedCards={setSelectedCards}
                        isValidMove={isValidMove}
                    />
                </div>
            </div>

            {/* MÀN HÌNH TỔNG KẾT (CHỈ HIỆN KHI CÓ KẾT QUẢ VÀ GAME ENDED) */}
            {room.status == 'ENDED' && !isReady &&
                <GameOverModal
                    user={user}
                    results={gameResults}
                    onReadyNext={handleReadyNext} // Thay onRestart bằng onReadyNext
                />
            }
        </div>
    );
}