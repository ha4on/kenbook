"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import CancelModal from "@/components/CancelModal";
import DatePicker from "@/components/DatePicker";

type Space = { id: string; name: string; capacity: number | null; building: string | null };
type Reservation = {
  id: string; space_id: string; user_id: string;
  date: string; start_time: string; end_time: string;
  purpose: string; members: string[];
  profiles: { name: string; student_id: string } | null;
};
type DragState = { spaceId: string; startSlot: number; endSlot: number } | null;

const FLOOR_DATA: Record<string, Space[]> = {
  "1층": [
    { id: "108", name: "누리",       capacity: null, building: null },
    { id: "109", name: "가온",       capacity: null, building: null },
    { id: "126", name: "송림",       capacity: null, building: null },
    { id: "106", name: "클릭앤비트", capacity: null, building: null },
    { id: "103", name: "테크스매시", capacity: null, building: null },
    { id: "132", name: "AC",         capacity: null, building: null },
    { id: "131", name: "DC",         capacity: null, building: null },
  ],
  "2층 에디슨": [
    { id: "E207", name: "E207", capacity: 7,  building: "E" },
    { id: "E208", name: "E208", capacity: 7,  building: "E" },
    { id: "E209", name: "E209", capacity: 7,  building: "E" },
    { id: "E206", name: "E206", capacity: 9,  building: "E" },
    { id: "E204", name: "E204", capacity: 12, building: "E" },
    { id: "E205", name: "E205", capacity: 12, building: "E" },
    { id: "E214", name: "E214", capacity: 12, building: "E" },
    { id: "E215", name: "E215", capacity: 18, building: "E" },
    { id: "E201", name: "E201", capacity: 26, building: "E" },
    { id: "E202", name: "E202", capacity: 26, building: "E" },
    { id: "E216", name: "E216", capacity: 26, building: "E" },
  ],
  "2층 테슬라": [
    { id: "T207", name: "T207", capacity: 7,  building: "T" },
    { id: "T208", name: "T208", capacity: 7,  building: "T" },
    { id: "T209", name: "T209", capacity: 7,  building: "T" },
    { id: "T206", name: "T206", capacity: 9,  building: "T" },
    { id: "T204", name: "T204", capacity: 12, building: "T" },
    { id: "T205", name: "T205", capacity: 12, building: "T" },
    { id: "T214", name: "T214", capacity: 12, building: "T" },
    { id: "T215", name: "T215", capacity: 18, building: "T" },
    { id: "T201", name: "T201", capacity: 26, building: "T" },
    { id: "T202", name: "T202", capacity: 26, building: "T" },
    { id: "T216", name: "T216", capacity: 26, building: "T" },
  ],
};

const SLOT_COUNT = 30;
const MAX_SLOTS  = 6;
const MIN_SLOT_W = 44;
const ROW_H      = 48;
const LEFT_W     = 120;
const HEADER_H   = 52;
const COLORS     = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-400","bg-pink-500","bg-teal-500","bg-indigo-500","bg-rose-500"];

function slotToTime(slot: number): string {
  const totalMin = 9 * 60 + slot * 30;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timeToSlot(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h * 60 + m - 9 * 60) / 30;
}
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(dateStr: string, n: number) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + n);
  return toDateStr(dt);
}
function formatDateKo(dateStr: string) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  const day = ["일","월","화","수","목","금","토"][dt.getDay()];
  return `${mo}월 ${d}일 (${day})`;
}

export default function Home() {
  const supabase = createClient();
  const [user, setUser]                 = useState<User | null>(null);
  const [profile, setProfile]           = useState<{ name: string; student_id: string } | null>(null);
  const [floor, setFloor]               = useState("1층");
  const [date, setDate]                 = useState(toDateStr(new Date()));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [drag, setDrag]                 = useState<DragState>(null);
  const [toast, setToast]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [cancelData, setCancelData]     = useState<Reservation[] | null>(null);
  const [slotW, setSlotW]               = useState(52);

  const isDragging = useRef(false);
  const dragRef    = useRef<DragState>(null);

  const today  = toDateStr(new Date());
  const floors = Object.keys(FLOOR_DATA);
  const spaces = FLOOR_DATA[floor];
  const gridW  = SLOT_COUNT * slotW;

  useEffect(() => {
    const calc = () => {
      const avail = window.innerWidth - LEFT_W;
      setSlotW(Math.max(MIN_SLOT_W, Math.floor(avail / SLOT_COUNT)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, student_id").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (["t","T","ㅅ","ㅆ"].includes(e.key)) setDate(toDateStr(new Date()));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const TIMEOUT = 3 * 60 * 60 * 1000;
    let timer = setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = "/login";
    }, TIMEOUT);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }, TIMEOUT);
    };
    const events = ["mousedown","keydown","scroll","touchstart"];
    events.forEach(ev => window.addEventListener(ev, reset));
    return () => { clearTimeout(timer); events.forEach(ev => window.removeEventListener(ev, reset)); };
  }, [supabase]);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*, profiles(name, student_id)")
      .eq("date", date);
    setReservations((data as Reservation[]) ?? []);
    setLoading(false);
  }, [date, supabase]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadReservations(); }, [loadReservations]);

  useEffect(() => {
    const channel = supabase.channel("reservations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        loadReservations();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadReservations, supabase]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const isReserved = (spaceId: string, slot: number) =>
    reservations.some(r => {
      if (r.space_id !== spaceId) return false;
      const s = timeToSlot(r.start_time);
      const e = timeToSlot(r.end_time) - 1;
      return slot >= s && slot <= e;
    });

  const inDrag = (spaceId: string, slot: number) => {
    if (!drag || drag.spaceId !== spaceId) return false;
    const s = Math.min(drag.startSlot, drag.endSlot);
    const e = Math.max(drag.startSlot, drag.endSlot);
    return slot >= s && slot <= e;
  };

  const onCellDown = (spaceId: string, slot: number) => {
    if (isReserved(spaceId, slot)) return;
    isDragging.current = true;
    setDrag({ spaceId, startSlot: slot, endSlot: slot });
  };

  const onCellEnter = (spaceId: string, slot: number) => {
    if (!isDragging.current || !drag || drag.spaceId !== spaceId) return;
    const clamped = slot >= drag.startSlot
      ? Math.min(slot, drag.startSlot + MAX_SLOTS - 1)
      : Math.max(slot, drag.startSlot - MAX_SLOTS + 1);
    setDrag(prev => prev ? { ...prev, endSlot: clamped } : null);
  };

  useEffect(() => { dragRef.current = drag; }, [drag]);

  const commitDrag = useCallback(async () => {
    if (!isDragging.current || !dragRef.current) {
      isDragging.current = false;
      setDrag(null);
      return;
    }
    isDragging.current = false;
    const { spaceId, startSlot, endSlot } = dragRef.current;
    const s = Math.min(startSlot, endSlot);
    const e = Math.max(startSlot, endSlot);
    setDrag(null);
    if (!user) return;
    const { error } = await supabase.from("reservations").insert({
      space_id: spaceId,
      user_id: user.id,
      date,
      start_time: slotToTime(s),
      end_time: slotToTime(e + 1),
      purpose: "",
      members: [user.id],
    });
    if (!error) {
      triggerToast("✅ 예약이 완료되었습니다");
      loadReservations();
    }
  }, [user, date, supabase, loadReservations]);

  useEffect(() => {
    const handler = () => {
      if (isDragging.current) commitDrag();
    };
    window.addEventListener("mouseup", handler);
    return () => window.removeEventListener("mouseup", handler);
  }, [commitDrag]);

  const handleBlockClick = (spaceId: string) => {
    const myReservations = reservations.filter(
      r => r.space_id === spaceId && r.date === date && r.user_id === user?.id
    );
    if (myReservations.length === 0) return;
    setCancelData(myReservations);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const displayName = profile?.name?.split("/")?.[0] ?? "";

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100">

      {/* Header */}
      <header className="bg-white border-b border-slate-300 shadow-sm shrink-0 z-50 select-none">
        <div className="flex items-center justify-between px-5 py-3 gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-black">K</span>
            </div>
            <span className="text-base font-black text-slate-800 tracking-tight hidden sm:block">KENTECH Space</span>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setDate(addDays(date, -1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold text-slate-500 hover:bg-white hover:text-blue-600 transition-all">
              ‹
            </button>
            <DatePicker value={date} onChange={setDate} />
            <button
              type="button"
              onClick={() => setDate(addDays(date, 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold text-slate-500 hover:bg-white hover:text-blue-600 transition-all">
              ›
            </button>
          </div>

          {/* User */}
          <div className="flex items-center gap-3 shrink-0">
            {loading && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-700 leading-tight">{displayName}</p>
              <p className="text-xs text-slate-400 leading-tight">{profile?.student_id}</p>
            </div>
            <button
              type="button"
              onPointerUp={handleLogout}
              className="text-xs font-medium text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors">
              로그아웃
            </button>
          </div>
        </div>

        {/* Floor Tabs */}
        <div className="flex px-5 border-t border-slate-200">
          {floors.map(f => (
            <button
              key={f}
              type="button"
              onPointerUp={() => setFloor(f)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${floor === f ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {f}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 pr-1 pb-1">
            <span className="text-xs text-slate-400 hidden sm:block">T = 오늘</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded bg-blue-200 border border-blue-400 inline-block" />드래그 예약
            </span>
          </div>
        </div>
      </header>

      {/* Gantt */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="overflow-x-auto">
          <div style={{ width: LEFT_W + gridW }}>

            {/* Time Header */}
            <div className="flex sticky top-0 z-30 bg-white border-b-2 border-slate-300 select-none" style={{ height: HEADER_H }}>
              <div className="shrink-0 sticky left-0 z-40 bg-slate-50 border-r-2 border-slate-300 flex items-end justify-center pb-2" style={{ width: LEFT_W }}>
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">공간</span>
              </div>
              {Array.from({ length: SLOT_COUNT }, (_, i) => (
                <div key={i}
                  className={`shrink-0 flex flex-col items-center justify-end pb-1.5 border-r ${i % 2 === 1 ? "border-slate-400" : "border-slate-200 border-dashed"}`}
                  style={{ width: slotW }}>
                  {i % 2 === 0
                    ? <span className="text-xs font-black text-slate-600">{slotToTime(i).split(":")[0]}</span>
                    : <span className="text-[10px] text-slate-400">30</span>}
                </div>
              ))}
            </div>

            {/* Space Rows */}
            {spaces.map((space, rowIdx) => {
              const spRes  = reservations.filter(r => r.space_id === space.id);
              const isEven = rowIdx % 2 === 0;
              return (
                <div key={space.id} className={`flex border-b ${isEven ? "border-slate-200" : "border-slate-100"}`} style={{ height: ROW_H }}>
                  <div className={`shrink-0 sticky left-0 z-20 border-r-2 border-slate-300 flex flex-col justify-center px-3 select-none ${isEven ? "bg-white" : "bg-slate-50"}`} style={{ width: LEFT_W }}>
                    <span className="text-sm font-bold text-slate-700 truncate">{space.name}</span>
                    {space.capacity && <span className="text-xs text-slate-400">최대 {space.capacity}인</span>}
                  </div>

                  <div className="relative shrink-0" style={{ width: gridW, height: ROW_H }}>
                    {/* 배경 격자 */}
                    <div className="flex h-full pointer-events-none absolute inset-0">
                      {Array.from({ length: SLOT_COUNT }, (_, i) => (
                        <div key={i}
                          className={`shrink-0 h-full border-r ${i % 2 === 1 ? "border-slate-300" : "border-slate-200 border-dashed"} ${isEven ? "bg-white" : "bg-slate-50"}`}
                          style={{ width: slotW }} />
                      ))}
                    </div>

                    {/* 인터랙션 셀 */}
                    <div className="flex h-full absolute inset-0">
                      {Array.from({ length: SLOT_COUNT }, (_, i) => {
                        const booked  = isReserved(space.id, i);
                        const dragged = inDrag(space.id, i);
                        return (
                          <div key={i}
                            data-slot={i}
                            data-sid={space.id}
                            className={`shrink-0 h-full transition-colors touch-none ${dragged ? "bg-blue-200/70" : booked ? "cursor-default" : "hover:bg-blue-50 cursor-crosshair"}`}
                            style={{ width: slotW }}
                            onPointerDown={() => onCellDown(space.id, i)}
                            onPointerEnter={() => onCellEnter(space.id, i)}
                            onTouchStart={(e) => { e.preventDefault(); onCellDown(space.id, i); }}
                            onTouchMove={(e) => {
                              e.preventDefault();
                              const touch = e.touches[0];
                              const el = document.elementFromPoint(touch.clientX, touch.clientY);
                              const slot = el?.getAttribute("data-slot");
                              const sid = el?.getAttribute("data-sid");
                              if (slot && sid === space.id) onCellEnter(space.id, parseInt(slot));
                            }}
                            onTouchEnd={() => { if (isDragging.current) commitDrag(); }}
                          />
                        );
                      })}
                    </div>

                    {/* 드래그 미리보기 */}
                    {drag?.spaceId === space.id && (() => {
                      const s = Math.min(drag.startSlot, drag.endSlot);
                      const e = Math.max(drag.startSlot, drag.endSlot);
                      return (
                        <div className="absolute inset-y-1.5 rounded-xl bg-blue-300/80 border-2 border-blue-500 pointer-events-none z-10 flex items-center px-2 shadow-md"
                          style={{ left: s * slotW + 1, width: (e - s + 1) * slotW - 2 }}>
                          <span className="text-blue-800 text-xs font-black whitespace-nowrap">{slotToTime(s)} – {slotToTime(e + 1)}</span>
                        </div>
                      );
                    })()}

                    {/* 예약 블록 */}
                    {spRes.map((r, idx) => {
                      const s = timeToSlot(r.start_time);
                      const e = timeToSlot(r.end_time) - 1;
                      const isOwn = r.user_id === user?.id;
                      return (
                        <div key={r.id}
                          className={`absolute inset-y-1.5 rounded-xl ${COLORS[idx % COLORS.length]} z-10 cursor-pointer shadow-md overflow-hidden flex items-center px-2.5 gap-1.5 hover:brightness-90 transition-all ${isOwn ? "ring-2 ring-white ring-offset-1" : ""}`}
                          style={{ left: s * slotW + 1, width: (e - s + 1) * slotW - 2 }}
                          onPointerDown={ev => ev.stopPropagation()}
                          onTouchStart={ev => ev.stopPropagation()}
                          onPointerUp={() => handleBlockClick(space.id)}>
                          <span className="text-white text-xs font-bold truncate">{r.profiles?.name?.split("/")?.[0]}</span>
                          {isOwn && <span className="ml-auto text-white/90 text-xs bg-black/20 px-1.5 py-0.5 rounded-md shrink-0">내 예약</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {cancelData && (
        <CancelModal
          reservations={cancelData}
          userId={user?.id ?? ""}
          onClose={() => setCancelData(null)}
          onSuccess={() => { setCancelData(null); triggerToast("🗑️ 예약이 취소되었습니다"); loadReservations(); }}
        />
      )}

      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <div className="bg-slate-800 text-white text-sm font-semibold px-5 py-3.5 rounded-2xl shadow-2xl whitespace-nowrap">{toast}</div>
      </div>
    </div>
  );
}