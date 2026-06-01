"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

type Reservation = {
  id: string;
  space_id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  members: string[];
  profiles: { name: string; student_id: string } | null;
};

type Props = {
  reservations: Reservation[];
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CancelModal({ reservations, userId, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(reservations.map(r => r.id)));
  const clearAll = () => setSelected(new Set());

  const handleCancel = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    await supabase.from("reservations").delete().in("id", Array.from(selected));
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">내 예약 취소</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              예약 목록 ({reservations.length}건)
            </span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">전체 선택</button>
              <span className="text-slate-300">|</span>
              <button onClick={clearAll} className="text-xs text-slate-400 hover:underline">전체 해제</button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {reservations.map(r => {
              const isSelected = selected.has(r.id);
              return (
                <div key={r.id}
                  onClick={() => toggleSelect(r.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${isSelected ? "bg-red-50 border-red-200" : "hover:bg-slate-50 border-transparent"}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "bg-red-500 border-red-500" : "border-slate-300"}`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700">{r.start_time} – {r.end_time}</div>
                    <div className="text-xs text-slate-400 truncate">{r.purpose}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            닫기
          </button>
          <button onClick={handleCancel} disabled={selected.size === 0 || loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${selected.size > 0 && !loading ? "bg-red-500 text-white hover:bg-red-600" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
            {loading ? "취소 중..." : `${selected.size > 0 ? `${selected.size}건 ` : ""}예약 취소`}
          </button>
        </div>
      </div>
    </div>
  );
}