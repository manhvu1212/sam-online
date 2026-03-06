import React, { useState, useEffect } from 'react';

export default function TimerDisplay({ socket, type = 'badge' }) {
    const [timeLeft, setTimeLeft] = useState(type == 'circle' ? 45 : 30);

    useEffect(() => {
        if (!socket) return;

        // Chỉ Component này lắng nghe sự kiện thời gian
        const handleTimer = (time) => setTimeLeft(time);
        const handleTurnUpdate = (data) => setTimeLeft(data.timeout);
        const handleReset = () => setTimeLeft(0);

        socket.on('SAM_TIMER', handleTimer);
        socket.on('TURN_UPDATE', handleTurnUpdate);
        socket.on('SAM_ENDED', handleReset);
        socket.on('SAM_CONFIRMED', handleReset);

        return () => {
            socket.off('SAM_TIMER', handleTimer);
            socket.off('TURN_UPDATE', handleTurnUpdate);
            socket.off('SAM_ENDED', handleReset);
            socket.off('SAM_CONFIRMED', handleReset);
        };
    }, [socket]);

    // Nếu là đồng hồ bự ở pha Xin Sâm
    if (type === 'circle') {
        return (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-amber-600/20 flex items-center justify-center relative shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]">
                <span className="text-3xl sm:text-4xl text-amber-500 font-black absolute">{timeLeft}s</span>
                <svg className="absolute w-full h-full -rotate-90">
                    <circle cx="50%" cy="50%" r="44%" stroke="transparent" strokeWidth="4" fill="none" />
                    <circle cx="50%" cy="50%" r="44%" stroke="#f59e0b" strokeWidth="4" fill="none"
                        strokeDasharray="276"
                        strokeDashoffset={`${276 * (1 - (timeLeft || 45) / 45)}`}
                        className="transition-all duration-1000 ease-linear"
                    />
                </svg>
            </div>
        );
    }

    // Nếu là đồng hồ nhỏ ở pha Đánh Bài
    return (
        <div className="bg-zinc-900 border border-zinc-700/50 px-4 py-2.5 rounded flex items-center justify-center font-black text-sm text-amber-500 mr-2 shadow-inner min-w-[60px]">
            {timeLeft}s
        </div>
    );
}