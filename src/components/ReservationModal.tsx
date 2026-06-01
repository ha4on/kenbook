"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

type Friend = { id: string; name: string; student_id: string };

type Props = {
  spaceId: string;
  spaceName: string;
  startSlot: number;
  endSlot: number;
  date: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  slotToTime: (slot: number) => string;
};

export default function ReservationModal({
  spaceId, spaceName, startSlot, endSlot, date, userId,
  onClose, onSuccess, slotToTime,
}: Props) {
  const supabase = createClient();
  const [purpose, setPurpose] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [myProfile, setMyProfile] = useState<Friend | null>(null);

  useEffect(() => {
    // 내 프로필 로드
    supabase.from("profiles").select("id, name, student_id").eq("id", userId).single()
      .then(({ data }) => setMyProfile(data));

    // 친구 목록 로드
    supabase.from("friendships")
      .select("friend_id, profiles!friendships_friend_id_fkey(id, name, student_id)")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFriends(data.map((f: any) => f.profiles).filter(Boolean));
        }
      });
  }, [userId]);

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!purpose.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("reservations").insert({
      space_id: spaceId,
      user_id: userId,
      date,
      start_time: slotToTime(startSlot),
      end_time: slotToTime(endSlot + 1),
      purpose: purpose.trim(),
      members: [userId, ...Array.from(selectedFriends)],
    });
    setLoading(false);
    if (!error) onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">공간 예약</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* 공간 + 시간 */}
          <div className="bg-blue-50 rounded-xl px-4 py-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-blue-800">{spaceName}</span>
              <span className="text-sm text-blue-600 font-medium">
                {slotToTime(startSlot)} – {slotToTime(endSlot + 1)}
              </span>
            </div>
            <div className="text-xs text-blue-500 mt-1">{date}</div>
          </div>

          {/* 이용목적 */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              이용목적 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="예: 스터디, 팀 미팅, 개인 공부..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition"
            />
          </div>

          {/* 예약자 */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">예약자</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
                {myProfile?.name?.[0]}
              </div>
              <span className="text-sm font-medium text-slate-700">{myProfile?.name}</span>
              <span className="text-xs text-slate-400">{myProfile?.student_id}</span>
              <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">나</span>
            </div>
          </div>

          {/* 친구 추가 */}
          {friends.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                멤버 추가 <span className="text-slate-300 font-normal">(선택)</span>
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {friends.map(f => {
                  const selected = selectedFriends.has(f.id);
                  return (
                    <div key={f.id}
                      onClick={() => toggleFriend(f.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all ${selected ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${selected ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                        {selected ? "✓" : f.name[0]}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{f.name}</span>
                      <span className="text-xs text-slate-400">{f.student_id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            닫기
          </button>
          <button onClick={handleSubmit} disabled={!purpose.trim() || loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${purpose.trim() && !loading ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}