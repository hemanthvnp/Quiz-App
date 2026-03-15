import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */
interface DateTimePickerProps {
  value: string;           // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void;
  className?: string;
  hasError?: boolean;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [datePart, timePart] = dateStr.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = (timePart || '00:00').split(':').map(Number);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${d} ${MONTHS[m - 1]?.slice(0, 3)} ${y}, ${h12}:${pad(mm)} ${ampm}`;
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function DateTimePicker({ value, onChange, className, hasError }: DateTimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'date' | 'time'>('date');

  // Parse value or use today
  const now = new Date();
  const parsed = value ? new Date(value) : null;

  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? now.getMonth());
  const [selectedDay, setSelectedDay] = useState(parsed?.getDate() ?? 0);
  const [selectedMonth, setSelectedMonth] = useState(parsed ? parsed.getMonth() : -1);
  const [selectedYear, setSelectedYear] = useState(parsed?.getFullYear() ?? 0);
  const [hour, setHour] = useState(parsed ? parsed.getHours() : 9);
  const [minute, setMinute] = useState(parsed ? parsed.getMinutes() : 0);

  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');

  // Sync when value changes externally
  useEffect(() => {
    if (!value) return;
    const d = new Date(value);
    if (isNaN(d.getTime())) return;
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setSelectedDay(d.getDate());
    setHour(d.getHours());
    setMinute(d.getMinutes());
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const emitChange = useCallback((y: number, m: number, d: number, h: number, min: number) => {
    onChange(`${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(min)}`);
  }, [onChange]);

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setSelectedMonth(viewMonth);
    setSelectedYear(viewYear);
    emitChange(viewYear, viewMonth, day, hour, minute);
    // Auto-switch to time tab after picking a date
    setTab('time');
  };

  const handlePrevMonth = () => {
    setSlideDir('left');
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    setSlideDir('right');
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleHourChange = (h: number) => {
    setHour(h);
    if (selectedDay > 0) emitChange(selectedYear, selectedMonth, selectedDay, h, minute);
  };

  const handleMinuteChange = (m: number) => {
    setMinute(m);
    if (selectedDay > 0) emitChange(selectedYear, selectedMonth, selectedDay, hour, m);
  };

  const isToday = (day: number) => {
    return viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate();
  };

  const isSelected = (day: number) => {
    return viewYear === selectedYear && viewMonth === selectedMonth && day === selectedDay;
  };

  /* Calendar grid */
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
  const calendarCells: { day: number; current: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarCells.push({ day: prevMonthDays - i, current: false });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d, current: true });
  }
  // Next month leading days
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    calendarCells.push({ day: d, current: false });
  }

  const borderCls = hasError
    ? 'border-red-500/40 bg-red-500/5'
    : 'border-white/[0.08] bg-white/[0.03] focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30';

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 rounded-xl border ${borderCls} px-4 py-2.5 text-sm transition-all cursor-pointer`}
      >
        <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
        <span className={value ? 'text-white' : 'text-slate-500'}>
          {value ? formatDisplay(value) : 'Pick date & time...'}
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute z-50 mt-2 left-0 right-0 sm:w-[340px] rounded-2xl border border-white/[0.1] bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {(['date', 'time'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    tab === t ? 'text-cyan-400 bg-cyan-500/5' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t === 'date' ? <Calendar className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {t}
                </button>
              ))}
              {/* Active tab indicator */}
              <motion.div
                className="absolute bottom-0 h-[2px] bg-cyan-500 rounded-full"
                style={{ width: '50%' }}
                animate={{ left: tab === 'date' ? '0%' : '50%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            </div>

            <AnimatePresence mode="wait">
              {tab === 'date' ? (
                <motion.div
                  key="date"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="p-4"
                >
                  {/* Month / Year header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-sm font-semibold text-white">
                      {MONTHS[viewMonth]} {viewYear}
                    </div>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAYS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-semibold text-slate-600 uppercase py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid with slide animation */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${viewYear}-${viewMonth}`}
                      initial={{ opacity: 0, x: slideDir === 'right' ? 40 : -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: slideDir === 'right' ? -40 : 40 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-7 gap-0.5"
                    >
                      {calendarCells.map((cell, idx) => {
                        const selected = cell.current && isSelected(cell.day);
                        const today = cell.current && isToday(cell.day);
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!cell.current}
                            onClick={() => cell.current && handleDayClick(cell.day)}
                            className={`relative w-full aspect-square flex items-center justify-center rounded-xl text-xs font-medium transition-all cursor-pointer ${
                              !cell.current
                                ? 'text-slate-700 cursor-default'
                                : selected
                                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                                  : today
                                    ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                                    : 'text-slate-300 hover:bg-white/[0.06]'
                            }`}
                          >
                            {cell.day}
                            {today && !selected && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="time"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-5"
                >
                  {/* Time display */}
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="text-4xl font-bold text-white tabular-nums">
                      {pad(hour)}
                    </div>
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-3xl font-bold text-cyan-400"
                    >
                      :
                    </motion.span>
                    <div className="text-4xl font-bold text-white tabular-nums">
                      {pad(minute)}
                    </div>
                  </div>

                  {/* Hour selector */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Hour</span>
                      <span className="text-xs text-slate-600">{pad(hour)}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={0}
                        max={23}
                        value={hour}
                        onChange={(e) => handleHourChange(+e.target.value)}
                        className="slider-input w-full"
                      />
                      {/* Track fill */}
                      <div
                        className="absolute top-1/2 left-0 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 pointer-events-none"
                        style={{ width: `${(hour / 23) * 100}%` }}
                      />
                    </div>
                    {/* Hour quick-picks */}
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {[6, 9, 12, 14, 17, 20].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleHourChange(h)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                            hour === h
                              ? 'bg-cyan-600 text-white shadow shadow-cyan-600/30'
                              : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          {h > 12 ? `${h - 12}PM` : h === 12 ? '12PM' : `${h}AM`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Minute selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Minute</span>
                      <span className="text-xs text-slate-600">{pad(minute)}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={0}
                        max={59}
                        value={minute}
                        onChange={(e) => handleMinuteChange(+e.target.value)}
                        className="slider-input w-full"
                      />
                      <div
                        className="absolute top-1/2 left-0 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-pink-600 to-pink-400 pointer-events-none"
                        style={{ width: `${(minute / 59) * 100}%` }}
                      />
                    </div>
                    {/* Minute quick-picks */}
                    <div className="mt-2 flex gap-1.5">
                      {[0, 15, 30, 45].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMinuteChange(m)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                            minute === m
                              ? 'bg-pink-600 text-white shadow shadow-pink-600/30'
                              : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          :{pad(m)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Done button */}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-5 w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-cyan-600/20 cursor-pointer"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Range slider styles */}
      <style>{`
        .slider-input {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          outline: none;
          position: relative;
          z-index: 2;
        }
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 3px rgba(6,182,212,0.3);
          cursor: pointer;
          transition: box-shadow 0.2s;
        }
        .slider-input::-webkit-slider-thumb:hover {
          box-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 0 0 5px rgba(6,182,212,0.4);
        }
        .slider-input::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border: none;
          border-radius: 50%;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 3px rgba(6,182,212,0.3);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
