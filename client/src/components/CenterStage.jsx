import React, { memo, useMemo } from 'react'; // 1. Import memo
import TimerDisplay from './TimerDisplay';
import Card from './Card';
import PlayerAvatar from './PlayerAvatar';

const CenterStage = memo(function CenterStage({
    socket,
    room,
    user,
    skipSam,
    onStartGame,
}) {

    const isMobile = window.innerWidth < 768;
    const scale = isMobile ? 0.8 : 1

    // --- 2. LOGIC TÍNH TOÁN ---
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

    const playerPosition = useMemo(() => {

        const positionClass = {
            1: ['-translate-x-1/2 -translate-y-full'],
            2: ['-translate-x-1/2 -translate-y-full', '-translate-x-1/2'],
            3: ['-translate-x-1/2 -translate-y-full', '-translate-x-1/2 -translate-y-full', '-translate-x-1/2 -translate-y-full'],
            4: ['-translate-x-1/2 -translate-y-full', '-translate-x-full -translate-y-1/2', '-translate-x-1/2', '-translate-y-1/2'],
            5: ['-translate-x-1/2 -translate-y-full', '-translate-x-full -translate-y-full', '-translate-x-1/2 -translate-y-1/2', '-translate-x-1/2 -translate-y-1/2', '-translate-y-full'],
        }

        const totalPlayers = rotatedPlayers.length; // Tránh chia cho 0

        let layouts = []
        for (let index = 0; index < totalPlayers; index++) {
            let layout = {}
            // 1. Tính góc cho từng người (Tính bằng Radian)
            // - Math.PI / 2 (90 độ) là để người đầu tiên (index 0) luôn nằm ở Dưới Cùng (Bottom).
            // - Nếu muốn quay theo chiều kim đồng hồ, dùng dấu TRỪ (-). Ngược kim dùng dấu CỘNG (+).
            const angle = (Math.PI / 2) - (index * (2 * Math.PI) / totalPlayers);

            // 2. Định nghĩa bán kính (Radius) của hình Oval (Tính bằng %)
            // Tâm màn hình là 50%.
            // rx = 40 nghĩa là chiều ngang trải dài từ 10% đến 90%.
            const rx = 50; // Bán kính ngang (Tùy chỉnh độ bè của Oval)
            const ry = 48; // Bán kính dọc (Tùy chỉnh độ dẹt của Oval)

            // 3. Tính toán vị trí Tương đối (X, Y)
            const leftPercent = 50 + rx * Math.cos(angle);
            const topPercent = 50 + ry * Math.sin(angle);
            layout.style = { left: `${leftPercent}%`, top: `${topPercent}%` }
            layout.class = positionClass[totalPlayers][index]

            layouts[index] = layout
        }
        return layouts

    }, [rotatedPlayers.length])

    return (
        <div className="
                        w-full h-full max-w-6xl
                        bg-[#1a5c38] /* Màu nỉ xanh cổ điển của bàn bài */
                        border-[8px] sm:border-[16px] border-[#5c3a21] /* Viền bàn màu gỗ dày */
                        rounded-[40px] sm:rounded-[80px] /* Bo góc cực gắt để thành hình Oval cong */
                        shadow-[inset_0_0_40px_rgba(0,0,0,0.5),_0_10px_20px_rgba(0,0,0,0.5)] /* Combo đổ bóng 3D: Bóng chìm bên trong và Bóng nổi bên ngoài */
                        flex flex-col items-center justify-center relative
                        overflow-hidden
        ">

            <div className='absolute w-[95%] h-[95%]'>
                {rotatedPlayers.map((player, index) => (
                    <PlayerAvatar
                        key={player.id}
                        player={player}
                        matchPlayer={room.matchPlayes.find(p => p.id == player.id)}
                        isMe={index === 0}
                        isTurn={room.currentTurnId === player.id && room.status === 'PLAYING'}
                        positionStyle={playerPosition[index].style}
                        positionClass={playerPosition[index].class}
                        isSamPlayer={room.samPlayerId === player.id}
                        balance={room.ledger[player.id]}
                    />
                ))}
            </div>

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
                    {skipSam ? (
                        <p className="text-zinc-500 text-sm font-bold tracking-widest animate-pulse">CHỜ CHÚT...</p>
                    ) : (
                        <>
                            <p className="text-amber-500 text-lg font-black tracking-widest uppercase mb-4 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">XIN SÂM KHÔNG?</p>
                            <TimerDisplay socket={socket} type="circle" />
                        </>
                    )}
                </div>
            )}

            <div className="absolute w-[75%] h-[75%] border-2 border-white/10 rounded-[20px] sm:rounded-[40px] pointer-events-none"></div>

            {/* PHA 3: ĐÁNH BÀI (HIỆN BÀI GIỮA BÀN) */}
            {room.status === 'PLAYING' && room.lastMove && (
                <div className="relative flex flex-col items-center z-500">
                    <p className="text-zinc-500 text-xs font-bold tracking-widest mb-3 uppercase opacity-80">
                        {room.players.find(p => p.id === room.lastMove.playerId)?.name || 'Ai đó'} ĐÁNH
                    </p>
                    <div className="flex justify-center w-full max-w-full mb-10">
                        {[...room.lastMove.cards].sort((a, b) => a.rank - b.rank).map((c, i) => {
                            // Kiểm tra xem đây có phải lá cuối cùng không
                            const isLast = i === room.lastMove.cards.length - 1;

                            return (
                                <div
                                    key={`${c.rank}-${c.suit}`}
                                    // KHI KHUNG BỊ CHẬT: Các lá trước sẽ tự động bị bóp nhỏ lại nhờ class 'shrink'
                                    className={`relative  ${isLast ? `shrink-0` : `shrink min-w-0`}`}
                                    style={{ zIndex: i, width: `${isLast ? `${Math.round(scale * 80)}px` : `${Math.round(scale * 40)}px`}` }}
                                >
                                    <Card
                                        rank={c.rank}
                                        suit={c.suit}
                                        scale={scale}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* PHA 4: MÀN HÌNH CHỜ VÁN MỚI (Sau khi bấm nút Chơi Tiếp) */}
            {room.status === 'ENDED' && room.matchPlayes.find(p => p.id == user.id)?.isReady && (
                <div className="flex flex-col items-center z-50 pointer-events-auto transition-all animate-fade-in">
                    <div className="bg-zinc-900/80 backdrop-blur border border-zinc-700/50 px-6 py-2.5 rounded-full shadow-inner">
                        <span className="text-zinc-400 font-bold tracking-widest text-sm">
                            <span className="text-emerald-500 text-xl">{room.matchPlayes.filter(p => p.isReady).length || 0}</span> / {room.players.length} SẴN SÀNG
                        </span>
                    </div>
                </div>
            )}

        </div>
    );
})

export default CenterStage;