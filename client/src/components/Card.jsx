import React, { useState } from 'react';

// Dùng Unicode hoặc SVG cho chất bài sắc nét (Khuyên dùng SVG)
const SUIT_ICONS = {
    heart: { char: '♥', color: 'text-red-600' }, // emerald-600
    diamond: { char: '♦', color: 'text-red-600' },
    club: { char: '♣', color: 'text-black' }, // zinc-900 (trông tối hơn #000)
    spade: { char: '♠', color: 'text-black' }
};

const RANK_LABELS = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
};

export default function Card({ rank, suit, style, className }) {
    const label = RANK_LABELS[rank];
    const suitInfo = SUIT_ICONS[suit] || SUIT_ICONS['spade']; // mặc định Bích nếu sai dữ liệu

    return (
        <div
            style={{ ...style }}
            className={`
                        relative 
                        bg-white rounded-lg border border-slate-300 
                        flex flex-col select-none transition-all duration-200
                        shadow-[0_2px_8px_rgba(0,0,0,0.5)] border-zinc-500
                        p-1
                        aspect-[2/3]
                        ${className}
                    `}
        >
            {/* 1. GÓC TRÊN BÊN TRÁI: Chữ đứng thẳng, to rõ */}
            <div className={`absolute flex flex-col items-center self-start leading-none ${suitInfo.color}`}>
                {/* Bỏ italic, dùng font-black chuẩn */}
                <span className={`text-[35%] font-black tracking-tight`}>
                    {label}
                </span>
                <span className={`text-[30%] -mt-0.5`}>
                    {suitInfo.char}
                </span>
            </div>

            {/* 2. PIP (KÝ HIỆU GIỮA): Luôn hiển thị, điều chỉnh cỡ cho mobile */}
            <div className={`
                                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                                text-[70%]
                                ${suitInfo.color} opacity-[0.15]
                            `}>
                {suitInfo.char}
            </div>

            {/* 3. GÓC DƯỚI BÊN PHẢI: Xoay ngược đối xứng */}
            <div className={`flex flex-col items-center self-end leading-none rotate-180 mt-auto ${suitInfo.color}`}>
                <span className={`text-[35%] font-black tracking-tight`}>
                    {label}
                </span>
                <span className={`text-[30%] -mt-0.5`}>
                    {suitInfo.char}
                </span>
            </div>
        </div>
    );
}