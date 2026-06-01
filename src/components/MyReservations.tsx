"use client";

import { useState, useEffect } from "react";
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
};

type Props = {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
};

const SPACE_NAMES: Record<string, string> = {
  "108": "누리", "109": "가온", "126": "송림",
  "106": "클릭앤비트", "103": "테크스매시",
  "132": "AC", "131": "DC",
  "E207": "E207", "E208": "E208", "E209": "E209",
  "E206": "E206", "E204": "E204", "E205": "E205",
  "E214": "E214", "E215": "E215", "E201": "E201",
  "E202": "E202", "E216": "E216",
  "T207": "T207", "T208": "T208", "T209": "T209",
  "T206": "T206", "T204": "T204", "T205": "T205",
  "T214": "T214", "T215": "T215", "T201": "T201",
  "T202": "T202", "T216": "T216",
};

function formatDateKo(dateStr: string) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  const day = ["일","월","화","수","목","금","토"][dt.getDay()];
  return `${mo}월 ${d}일 (${day})`;
}

export default function MyReservations({ userId, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    supabase
      .from("reservations")
      .select("*")
      .eq("user_id", userId)
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .then(({ data }) => {
        setReservations((data as Reservation[]) ?? []);
        setLoading(false);
      });
  }, [userId]);

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
    setCancelling(true);
    await supabase.from("reservations").delete().in("id", Array.from(selected));
    setCancelling(false);
    onSuccess();
  };

  // 날짜별로 그룹핑
  const grouped = reservations.reduce<Record<string, Reservation[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-800">내 예약 관리</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {/* 전체 선택/해제 */}
        {reservations.length > 0 && (
          <div className="px-6 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500">총 {reservations.length}건</span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">전체 선택</button>
              <span className="text-slate-300">|</span>
              <button onClick={clearAll} className="text-xs text-slate-400 hover:underline">전체 해제</button>
            </div>
          </div>
        )}

        {/* 예약 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">예정된 예약이 없습니다</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([date, rsvs]) => (
                <div key={date}>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {formatDateKo(date)}
                    {date === today && <span className="ml-1.5 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full normal-case">오늘</span>}
                  </div>
                  <div className="space-y-1.5">
                    {rsvs.map(r => {
                      const isSelected = selected.has(r.id);
                      return (
                        <div key={r.id}
                          onClick={() => toggleSelect(r.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${isSelected ? "bg-red-50 border-red-200" : "hover:bg-slate-50 border-transparent"}`}>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "bg-red-500 border-red-500" : "border-slate-300"}`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-700">{SPACE_NAMES[r.space_id] ?? r.space_id}</span>
                              <span className="text-xs text-slate-400">{r.start_time} – {r.end_time}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            닫기
          </button>
          <button onClick={handleCancel} disabled={selected.size === 0 || cancelling}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${selected.size > 0 && !cancelling ? "bg-red-500 text-white hover:bg-red-600" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
            {cancelling ? "취소 중..." : `${selected.size > 0 ? `${selected.size}건 ` : ""}예약 취소`}
          </button>
        </div>
      </div>
    </div>
  );
}