import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Petal particle                                                     */
/* ------------------------------------------------------------------ */
function Petal({ delay, x }: { delay: number; x: string }) {
  return (
    <motion.div
      className="absolute text-rose-300/40 pointer-events-none select-none"
      style={{ left: x, top: "-5%" }}
      animate={{
        y: ["0vh", "105vh"],
        x: [0, 30, -20, 40, 0],
        rotate: [0, 180, 360],
        opacity: [0, 0.7, 0.7, 0],
      }}
      transition={{
        duration: 10 + Math.random() * 6,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <ellipse cx="8" cy="8" rx="4" ry="8" />
      </svg>
    </motion.div>
  );
}

const petals = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  delay: Math.random() * 8,
  x: `${Math.random() * 100}%`,
}));

/* ------------------------------------------------------------------ */
/*  NPM Install Credits                                                */
/* ------------------------------------------------------------------ */

const packages = [
  { pkg: "hemanth-vasudev-np", version: "1.0.0", name: "Hemanth Vasudev N P" },
  { pkg: "nithiish-sd", version: "1.0.0", name: "Nithiish S D" },
];

function NpmInstallCredits() {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (step < 0) return;
    if (step > packages.length) return;
    const timer = setTimeout(() => setStep((s) => s + 1), 1200);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8 }}
      onViewportEnter={() => setStep(0)}
      className="w-full max-w-lg mx-auto"
    >
      <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 bg-[#1a1b26] shadow-2xl font-mono text-sm">
        {/* Terminal title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#16161e] border-b border-slate-700/40">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <span className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <span className="ml-2 text-xs text-slate-400">~/qfactor-challenge</span>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Command line */}
          <div className="flex items-center gap-2">
            <span className="text-green-400">$</span>
            <span className="text-slate-300">npm install</span>
            <span className="text-pink-400">qfactor-team</span>
          </div>

          {/* Package installations */}
          {packages.map((p, idx) => (
            <motion.div
              key={p.pkg}
              initial={{ opacity: 0, height: 0 }}
              animate={step > idx ? { opacity: 1, height: 'auto' } : {}}
              transition={{ duration: 0.4 }}
              className="overflow-hidden"
            >
              <div className="space-y-2">
                {/* Package name + version */}
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">+</span>
                  <span className="text-white font-semibold">{p.pkg}</span>
                  <span className="text-slate-500">@{p.version}</span>
                </div>

                {/* Progress bar */}
                <div className="ml-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400"
                      initial={{ width: '0%' }}
                      animate={step > idx ? { width: '100%' } : {}}
                      transition={{ duration: 0.8, delay: 0.1 }}
                    />
                  </div>
                  <motion.span
                    className="text-[11px] text-emerald-400 font-medium"
                    initial={{ opacity: 0 }}
                    animate={step > idx ? { opacity: 1 } : {}}
                    transition={{ delay: 0.9 }}
                  >
                    done
                  </motion.span>
                </div>

                {/* Real name reveal */}
                <motion.div
                  className="ml-4 flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={step > idx ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.7, duration: 0.3 }}
                >
                  <span className="text-slate-500 text-xs">-&gt;</span>
                  <span className="text-amber-300 text-xs">{p.name}</span>
                  <span className="text-slate-600 text-xs">// Developer</span>
                </motion.div>
              </div>
            </motion.div>
          ))}

          {/* Summary line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={step > packages.length - 1 ? { opacity: 1 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="pt-2 border-t border-slate-700/30"
          >
            <span className="text-slate-400 text-xs">
              added <span className="text-white font-semibold">{packages.length} contributors</span> in <span className="text-white">0.3s</span>
            </span>
          </motion.div>

          {/* Blinking cursor */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-green-400">$</span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
              className="inline-block w-2 h-4 bg-slate-400"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Countdown Timer                                                    */
/* ------------------------------------------------------------------ */
const EVENT_DATE = new Date("2026-03-16T09:00:00+05:30");

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  function getTimeLeft() {
    const diff = Math.max(0, EVENT_DATE.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      ended: diff <= 0,
    };
  }

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ rotateX: -60, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/80 backdrop-blur border border-rose-200/60 shadow-lg shadow-rose-100/30 flex items-center justify-center"
      >
        <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-rose-500 to-pink-600 bg-clip-text text-transparent">
          {String(value).padStart(2, "0")}
        </span>
      </motion.div>
      <span className="mt-2 text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Women's Day SVG icons                                              */
/* ------------------------------------------------------------------ */
function VenusSymbol({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="6" />
      <line x1="12" y1="15" x2="12" y2="23" />
      <line x1="9" y1="19" x2="15" y2="19" />
    </svg>
  );
}

function RaisedFist({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C10.34 2 9 3.34 9 5v3.26c-.6-.17-1.28-.26-2-.26-1.66 0-3 1.34-3 3v4c0 3.87 3.13 7 7 7h2c3.87 0 7-3.13 7-7v-4c0-1.66-1.34-3-3-3-.72 0-1.4.09-2 .26V5c0-1.66-1.34-3-3-3zm0 2c.55 0 1 .45 1 1v5h2V8c.55 0 1 .45 1 1v4c0 2.76-2.24 5-5 5h-2c-2.76 0-5-2.24-5-5v-4c0-.55.45-1 1-1h1v2h2V5c0-.55.45-1 1-1z" />
    </svg>
  );
}

function FloatingWomensIcon({ delay, x, icon }: { delay: number; x: string; icon: "venus" | "fist" | "flower" }) {
  const icons = {
    venus: <VenusSymbol className="w-5 h-5" />,
    fist: <RaisedFist className="w-4 h-4" />,
    flower: <span className="text-base">✿</span>,
  };
  return (
    <motion.div
      className="absolute text-rose-300/25 pointer-events-none select-none"
      style={{ left: x, top: "-5%" }}
      animate={{
        y: ["0vh", "105vh"],
        x: [0, -20, 30, -10, 0],
        rotate: [0, -90, -180],
        opacity: [0, 0.5, 0.5, 0],
      }}
      transition={{
        duration: 14 + Math.random() * 6,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {icons[icon]}
    </motion.div>
  );
}

const womensIcons = [
  { id: "v1", delay: 1, x: "8%", icon: "venus" as const },
  { id: "f1", delay: 4, x: "22%", icon: "flower" as const },
  { id: "v2", delay: 7, x: "42%", icon: "venus" as const },
  { id: "r1", delay: 2.5, x: "58%", icon: "fist" as const },
  { id: "f2", delay: 9, x: "75%", icon: "flower" as const },
  { id: "v3", delay: 5.5, x: "90%", icon: "venus" as const },
  { id: "r2", delay: 11, x: "35%", icon: "fist" as const },
  { id: "f3", delay: 6.5, x: "65%", icon: "flower" as const },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.97]);
  const countdown = useCountdown();

  return (
    <div ref={ref} className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-orange-50/30 text-slate-800">
      {/* Falling petals + Women's Day icons */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {petals.map((p) => <Petal key={p.id} {...p} />)}
        {womensIcons.map((w) => <FloatingWomensIcon key={w.id} delay={w.delay} x={w.x} icon={w.icon} />)}
      </div>

      {/* Soft gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-200/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-100/40 rounded-full blur-[100px]" />
      </div>

      {/* ── HERO ── */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center"
      >
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-5 max-w-2xl">
          {/* Badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100/70 backdrop-blur border border-rose-200/60">
            <span className="text-rose-400 text-sm">✿</span>
            <span className="text-xs font-medium text-rose-500 tracking-wide uppercase">International Women&apos;s Day</span>
            <span className="text-rose-400 text-sm">✿</span>
          </motion.div>

          {/* Title with Venus symbols */}
          <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.1] tracking-tight">
            <span className="inline-flex items-center gap-3 sm:gap-4 justify-center">
              <VenusSymbol className="w-8 h-8 sm:w-10 sm:h-10 text-rose-300/60 -mt-1" />
              <span className="text-slate-800">Celebrating</span>
              <VenusSymbol className="w-8 h-8 sm:w-10 sm:h-10 text-rose-300/60 -mt-1" />
            </span>
            <br />
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
              Women&apos;s Day
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={fadeUp} className="text-lg text-slate-500 max-w-md leading-relaxed">
            Hosted by <span className="text-rose-500 font-semibold">CSA</span> &amp; the <span className="text-rose-500 font-semibold">Department of AMCS</span>, PSG College of Technology
          </motion.p>

          {/* Date */}
          <motion.div variants={fadeUp} className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white/70 border border-slate-200/60 backdrop-blur shadow-sm">
            <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-slate-600">16 March 2026</span>
          </motion.div>

          {/* Countdown Timer */}
          <motion.div variants={fadeUp} className="mt-2">
            {countdown.ended ? (
              <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-lg shadow-lg shadow-rose-200/50">
                Event is Live!
              </div>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4">
                <CountdownUnit value={countdown.days} label="Days" />
                <span className="text-2xl font-bold text-rose-300 mt-[-20px]">:</span>
                <CountdownUnit value={countdown.hours} label="Hours" />
                <span className="text-2xl font-bold text-rose-300 mt-[-20px]">:</span>
                <CountdownUnit value={countdown.minutes} label="Mins" />
                <span className="text-2xl font-bold text-rose-300 mt-[-20px]">:</span>
                <CountdownUnit value={countdown.seconds} label="Secs" />
              </div>
            )}
          </motion.div>

          {/* Scroll hint */}
          <motion.div variants={fadeUp} className="mt-10" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ── EVENTS SECTION ── */}
      <section className="relative z-10 px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">Featured Event</h2>
          <div className="mt-3 mx-auto h-1 w-16 rounded-full bg-gradient-to-r from-rose-400 to-amber-400" />
        </motion.div>

        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            whileHover={{ y: -4 }}
            className="group relative rounded-3xl bg-white/70 backdrop-blur-lg border border-rose-100 p-8 shadow-lg shadow-rose-100/40 transition-shadow hover:shadow-xl hover:shadow-rose-200/40"
          >
            <div className="absolute top-0 left-8 right-8 h-1 rounded-b-full bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400" />

            <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <span className="inline-block px-3 py-1 mb-3 rounded-full bg-rose-50 text-rose-500 text-xs font-semibold tracking-wide uppercase">Live Quiz</span>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">Quiz Event</h3>
            <p className="text-slate-500 text-sm mb-1">Test your knowledge in our exciting quiz!</p>
            <p className="text-rose-400 text-sm font-medium mb-6">
              Quiz Master — <span className="text-slate-700 font-semibold">Dinesh Veluswamy</span>
            </p>

            <motion.button
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 shadow-md shadow-rose-200/50 hover:shadow-lg hover:shadow-rose-300/50 transition-shadow cursor-pointer"
            >
              Enter Quiz App
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="relative z-10 flex items-center justify-center py-4">
        <div className="h-px w-20 bg-gradient-to-r from-transparent to-rose-200" />
        <VenusSymbol className="mx-3 w-5 h-5 text-rose-300" />
        <div className="h-px w-20 bg-gradient-to-l from-transparent to-rose-200" />
      </div>

      {/* ── INSPIRATIONAL QUOTE ── */}
      <section className="relative z-10 px-6 py-16">
        <motion.blockquote
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-xl mx-auto text-center"
        >
          <div className="flex justify-center gap-2 mb-4">
            <span className="text-rose-300/50 text-2xl">✿</span>
            <VenusSymbol className="w-6 h-6 text-rose-400/40" />
            <span className="text-rose-300/50 text-2xl">✿</span>
          </div>
          <p className="text-xl sm:text-2xl font-medium text-slate-600 italic leading-relaxed">
            &ldquo;There is no limit to what we, as women, can accomplish.&rdquo;
          </p>
          <p className="mt-3 text-sm font-semibold text-rose-400">— Michelle Obama</p>
          <div className="mt-4 mx-auto h-0.5 w-12 rounded-full bg-gradient-to-r from-rose-300 to-pink-300" />
        </motion.blockquote>
      </section>

      {/* ── CREDITS (NPM Install) ── */}
      <footer className="relative z-10 px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-700">Behind the Scenes</h2>
          <p className="mt-1 text-sm text-slate-400">The developers behind this project</p>
        </motion.div>

        <NpmInstallCredits />

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.5 }} className="mt-14 text-center space-y-1">
          <p className="text-xs text-slate-400">&copy; 2026 QFactor — PSG College of Technology</p>
          <p className="text-xs text-rose-300">Happy International Women&apos;s Day ✿</p>
        </motion.div>
      </footer>
    </div>
  );
}
