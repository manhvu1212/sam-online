import React, { memo } from 'react'; // 1. Import memo
import TimerDisplay from './TimerDisplay';
import Card from './Card';

const CenterStage = memo(function CenterStage({
    socket,
    room,
    user,
    hasSkippedSam,
    onStartGame,
    onSkipSam,
    onRequestSam
}) {
    return (
        <div className="absolute top-[15%] bottom-[380px] left-4 right-4 flex flex-col items-center justify-center rounded-3xl z-10 pointer-events-none">

            {/* PHA 1: CHỜ BẮT ĐẦU */}
            {room.status === 'WAITING' && room.hostId === user.id && (
                <button onClick={onStartGame} className="pointer-events-auto px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 font-black text-lg rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:brightness-110 transition-all z-50">
                    BẮT ĐẦU CHIA BÀI
                </button>
            )}
            {room.status === 'WAITING' && room.hostId !== user.id && (
                <p className="text-zinc-500 text-sm font-bold tracking-widest">CHỜ CHỦ PHÒNG...</p>
            )}

            {/* PHA 2: XIN SÂM */}
            {room.status === 'SAM_WAITING' && (
                <div className="flex flex-col items-center z-50 pointer-events-auto">
                    {hasSkippedSam ? (
                        <p className="text-zinc-500 text-sm font-bold tracking-widest animate-pulse">ĐANG CHỜ NGƯỜI KHÁC QUYẾT ĐỊNH...</p>
                    ) : (
                        <>
                            <p className="text-amber-500 text-lg font-black tracking-widest uppercase mb-4 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">XIN SÂM KHÔNG?</p>
                            <TimerDisplay socket={socket} type="circle" />
                            <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8">
                                <button onClick={onSkipSam} className="px-6 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold text-sm rounded-lg shadow-lg transition-colors">BỎ QUA</button>
                                <button onClick={onRequestSam} className="px-8 py-2.5 bg-zinc-900 border border-red-900/50 hover:bg-red-950/40 text-red-500 font-black text-base rounded-lg shadow-lg transition-colors">XIN SÂM</button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* PHA 3: ĐÁNH BÀI (HIỆN BÀI GIỮA BÀN) */}
            {room.status === 'PLAYING' && room.lastMove && (
                <div className="relative flex flex-col items-center">
                    <p className="text-zinc-500 text-xs font-bold tracking-widest mb-3 uppercase opacity-80">
                        {room.players.find(p => p.id === room.lastMove.playerId)?.name || 'Ai đó'} ĐÁNH
                    </p>
                    <div className="flex justify-center -space-x-8 sm:-space-x-12">
                        {room.lastMove.cards.map((card) => (
                            <Card key={`${card.rank}_${card.suit}_last`} rank={card.rank} suit={card.suit} className="w-16 sm:w-24 shadow-[0_4px_20px_rgba(0,0,0,0.8)]" />
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
})

export default CenterStage;