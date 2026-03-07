import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function Lobby({ socket, user }) {
    const [roomCode, setRoomCode] = useState('');
    const [name, setName] = useState('');

    const [localName, setLocalName] = useState(name);

    const handleUpdateName = (namVal) => {
        if (namVal.trim() !== '') {
            setName(namVal)
            socket.emit('UPDATE_NAME', namVal);
            localStorage.setItem('playerName', namVal);
        } else {
            toast.error('Tên không được để trống!');
        }
    };

    useEffect(() => {
        if (user?.name) {
            setName(user.name);
            setLocalName(user.name)
        }
    }, [user]);

    // 2. MA THUẬT DEBOUNCE NẰM Ở ĐÂY
    useEffect(() => {
        if (localName === name) return;

        // Đặt đồng hồ đếm ngược 500ms (Nửa giây)
        const timeoutId = setTimeout(() => {
            handleUpdateName(localName);
        }, 500);

        return () => clearTimeout(timeoutId);

    }, [localName, name, handleUpdateName]);

    const handleCreateRoom = () => {
        socket.emit('CREATE_ROOM', { bet: 1000 });
        toast.loading('Đang khởi tạo phòng VIP...', { id: 'CREATE_ROOM', duration: 1000 });
    };

    const handleJoinRoom = () => {
        if (roomCode.length === 5) {
            socket.emit('JOIN_ROOM', roomCode.toUpperCase());
        } else {
            toast.error('Mã phòng phải có đúng 5 ký tự!');
        }
    };

    return (
        <div className="w-full h-[100dvh] overflow-hidden overscroll-none
                        flex flex-col items-center justify-center bg-zinc-950 text-zinc-200 
                        relative"
        >

            {/* Hiệu ứng ánh sáng vàng đồng mờ ảo phía sau nền */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 bg-zinc-900/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl w-full max-w-sm text-center border border-zinc-800/80">

                {/* Avatar hiển thị tự động */}
                <div className="flex justify-center mb-6 relative">
                    {/* Vòng sáng quanh Avatar */}
                    <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
                    <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'default'}&backgroundColor=e4e4e7`}
                        alt="avatar"
                        className="w-28 h-28 rounded-full border border-amber-500/50 ring-4 ring-zinc-950 relative z-10 shadow-2xl transition-all"
                    />
                </div>

                {/* Tiêu đề dập nổi màu vàng kim */}
                <h1 className="text-4xl font-black tracking-widest mb-1 text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-600 drop-shadow-sm">
                    SÂM LỐC
                </h1>
                <p className="text-zinc-500 mb-12 text-xs uppercase tracking-[0.3em] font-semibold">
                    VIP Lounge
                </p>

                {/* Khung nhập tên tối giản */}
                <div className="flex mb-8 rounded-xl overflow-hidden border border-zinc-800 focus-within:border-amber-500/50 transition-colors shadow-inner">
                    <input
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        className="flex-1 p-3.5 bg-zinc-950 outline-none text-zinc-100 placeholder-zinc-700 font-medium"
                        placeholder="Tên người chơi"
                    />
                </div>

                {/* Đường kẻ chia cắt mờ */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-8"></div>

                {/* Cụm Nút Tạo / Vào phòng */}
                <div className="space-y-4">
                    <button
                        onClick={handleCreateRoom}
                        className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 rounded-xl font-bold text-zinc-950 text-lg shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all active:scale-95 tracking-wide"
                    >
                        MỞ BÀN MỚI
                    </button>

                    <div className="flex gap-2">
                        <input
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            maxLength={5}
                            placeholder="MÃ PHÒNG"
                            className="w-3/5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-bold text-xl tracking-[0.3em] outline-none focus:border-amber-500/50 transition-colors uppercase text-amber-100 placeholder-zinc-800 shadow-inner"
                        />
                        <button
                            onClick={handleJoinRoom}
                            className="w-2/5 border border-amber-600/40 hover:bg-amber-600/10 rounded-xl font-bold text-amber-500 shadow-lg transition-all active:scale-95 tracking-widest text-sm bg-zinc-900"
                        >
                            VÀO BÀN
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}