"use client";

import { useState } from "react";

type Props = {
  value: string;
  onChange: (date: string) => void;
};

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function DatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseInt(value.split("-")[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(value.split("-")[1]));

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const selected = value;

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const handleSelect = (d: number) => {
    onChange(toDateStr(viewYear, viewMonth, d));
    setOpen(false);
  };

  const DAY_LABELS = ["일","월","화","수","목","금","토"];

  return (
    <div className="relative">
      {/* 날짜 텍스트 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
          {parseInt(value.split("-")[1])}월 {parseInt(value.split("-")[2])}일
          {" "}({["일","월","화","수","목","금","토"][new Date(viewYear, viewMonth-1, parseInt(value.split("-")[2])).getDay()]})
        </span>
        {value === todayStr && (
          <span className="bg-blue-100 text-blue-600 text-xs font-bold px-1.5 py-0.5 rounded-full">오늘</span>
        )}
      </button>

      {/* 캘린더 팝업 */}
      {open && (
        <>
          {/* 배경 클릭시 닫기 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-72">
            {/* 월 네비게이터 */}
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={prevMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all font-bold">
                ‹
              </button>
              <span className="text-sm font-bold text-slate-700">
                {viewYear}년 {viewMonth}월
              </span>
              <button type="button" onClick={nextMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all font-bold">
                ›
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className={`text-center text-xs font-bold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((d, di) => {
                  if (!d) return <div key={di} />;
                  const dateStr = toDateStr(viewYear, viewMonth, d);
                  const isSelected = dateStr === selected;
                  const isToday = dateStr === todayStr;
                  return (
                    <button
                      key={di}
                      type="button"
                      onClick={() => handleSelect(d)}
                      className={`w-full aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-all
                        ${isSelected ? "bg-blue-600 text-white font-bold" :
                          isToday ? "bg-blue-100 text-blue-600 font-bold" :
                          di === 0 ? "text-red-400 hover:bg-slate-100" :
                          di === 6 ? "text-blue-400 hover:bg-slate-100" :
                          "text-slate-700 hover:bg-slate-100"}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* 오늘 버튼 */}
            <button
              type="button"
              onClick={() => { onChange(todayStr); setOpen(false); }}
              className="w-full mt-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
              오늘로 이동
            </button>
          </div>
        </>
      )}
    </div>
  );
}