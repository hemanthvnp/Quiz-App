import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import Podium from "../components/Podium";

/* ================================================================== */
/*  SHOOTING METEOR                                                    */
/* ================================================================== */
function Meteor({ delay }: { delay: number }) {
  const top = `${Math.random() * 40}%`;
  const left = `${Math.random() * 70 + 10}%`;
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ top, left, width: 2, height: 80, rotate: 215, transformOrigin: "top center" }}
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: [0, 1, 1, 0], scaleY: [0, 1, 1, 1], y: [0, 0, 300, 600], x: [0, 0, -150, -300] }}
      transition={{ duration: 1.5, delay, repeat: Infinity, repeatDelay: 8 + Math.random() * 12, ease: "easeIn" }}
    >
      <div className="w-full h-full bg-gradient-to-b from-white via-cyan-300 to-transparent rounded-full" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white"
        style={{ boxShadow: "0 0 6px 3px rgba(255,255,255,0.8), 0 0 20px 6px rgba(6,182,212,0.4)" }}
      />
    </motion.div>
  );
}

const meteors = Array.from({ length: 6 }, (_, i) => ({ id: i, delay: i * 3.5 + Math.random() * 2 }));

/* ================================================================== */
/*  AURORA BOREALIS                                                    */
/* ================================================================== */
function Aurora() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-[150%] h-[300px]"
          style={{
            top: `${10 + i * 15}%`,
            left: "-25%",
            background: `linear-gradient(90deg, transparent, ${
              i === 0 ? "rgba(6,182,212,0.3)" : i === 1 ? "rgba(244,63,94,0.2)" : "rgba(59,130,246,0.15)"
            }, transparent)`,
            filter: "blur(60px)",
            borderRadius: "50%",
          }}
          animate={{
            x: ["-10%", "10%", "-5%", "8%", "-10%"],
            y: [0, -30, 20, -15, 0],
            scaleX: [1, 1.2, 0.9, 1.1, 1],
            opacity: [0.3, 0.6, 0.4, 0.7, 0.3],
          }}
          transition={{ duration: 12 + i * 4, repeat: Infinity, ease: "easeInOut", delay: i * 2 }}
        />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  FLOATING ORB                                                       */
/* ================================================================== */
function FloatingOrb({ color, size, x, y, delay }: { color: string; size: number; x: string; y: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, left: x, top: y, background: color, filter: `blur(${size * 0.6}px)` }}
      animate={{ x: [0, 30, -20, 10, 0], y: [0, -25, 15, -10, 0], scale: [1, 1.15, 0.9, 1.05, 1] }}
      transition={{ duration: 15 + delay, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ================================================================== */
/*  SPARKLE                                                            */
/* ================================================================== */
function Sparkle({ delay, x }: { delay: number; x: string }) {
  const top = useRef(`${20 + Math.random() * 60}%`);
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-white pointer-events-none"
      style={{ left: x, top: top.current }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
      transition={{ duration: 2 + Math.random() * 2, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

const sparkles = Array.from({ length: 25 }, (_, i) => ({ id: i, delay: Math.random() * 5, x: `${Math.random() * 100}%` }));

/* ================================================================== */
/*  FLOATING PI SYMBOL                                                 */
/* ================================================================== */
const piDigits = ['3', '.', '1', '4', '1', '5', '9', '2', '6', '5', '3', '5', '8', '9', '7', '9', '3', '2', '3', '8'];

function FloatingPi({ delay, x, digit }: { delay: number; x: string; digit: string }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none text-cyan-400/20 font-bold text-lg"
      style={{ left: x, top: "-5%" }}
      animate={{ y: ["0vh", "105vh"], x: [0, 25, -15, 30, 0], rotate: [0, 30, -30, 0], opacity: [0, 0.4, 0.4, 0] }}
      transition={{ duration: 12 + Math.random() * 8, delay, repeat: Infinity, ease: "linear" }}
    >
      {digit}
    </motion.div>
  );
}

const floatingPis = Array.from({ length: 20 }, (_, i) => ({ id: i, delay: Math.random() * 6, x: `${Math.random() * 100}%`, digit: piDigits[i % piDigits.length] }));

/* ================================================================== */
/*  RUNNING MARQUEE                                                    */
/* ================================================================== */
const marqueeItems = [
  "Mathematics", "π", "Knowledge", "∞", "Discovery", "π", "Logic", "∞",
  "Innovation", "π", "Precision", "∞", "Curiosity", "π", "Wisdom", "∞",
];

function Marquee({ direction = 1, speed = 30 }: { direction?: number; speed?: number }) {
  return (
    <div className="overflow-hidden whitespace-nowrap select-none pointer-events-none">
      <motion.div
        className="inline-flex gap-8 text-sm font-semibold"
        animate={{ x: direction > 0 ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <span key={i} className={item.length > 2 ? "text-slate-600 uppercase tracking-[0.2em]" : "text-cyan-500/60"}>
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  TYPEWRITER TEXT                                                     */
/* ================================================================== */
function Typewriter({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) return;
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, 40);
    return () => clearTimeout(timer);
  }, [displayed, text, started]);

  return (
    <span className={className}>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block w-[2px] h-[1em] bg-cyan-400 ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

/* ================================================================== */
/*  3D TILT CARD                                                       */
/* ================================================================== */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);

  const springX = useSpring(rotateX, { stiffness: 150, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 150, damping: 20 });

  const handleMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateX.set((py - 0.5) * -20);
    rotateY.set((px - 0.5) * 20);
    glareX.set(px * 100);
    glareY.set(py * 100);
  }, [rotateX, rotateY, glareX, glareY]);

  const handleLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 800 }}
      className={className}
    >
      {/* Holographic glare overlay */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: useTransform(
            [glareX, glareY] as never,
            ([gx, gy]: number[]) => `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.08) 0%, transparent 60%)`
          ),
        }}
      />
      {children}
    </motion.div>
  );
}


/* ================================================================== */
/*  NPM INSTALL CREDITS                                                */
/* ================================================================== */
const packages = [
  { pkg: "hemanth-vasudev-np", version: "1.0.0", name: "Hemanth Vasudev N P" },
  { pkg: "nithiish-sd", version: "1.0.0", name: "Nithiish S D" },
];

function NpmInstallCredits() {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (step < 0 || step > packages.length) return;
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
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-cyan-500/5 font-mono text-sm">
        {/* Terminal title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-950/60 border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <span className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <span className="ml-2 text-xs text-slate-500">~/qfactor-challenge</span>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">$</span>
            <span className="text-slate-300">npm install</span>
            <span className="text-cyan-400">qfactor-team</span>
          </div>

          {packages.map((p, idx) => (
            <motion.div
              key={p.pkg}
              initial={{ opacity: 0, height: 0 }}
              animate={step > idx ? { opacity: 1, height: "auto" } : {}}
              transition={{ duration: 0.4 }}
              className="overflow-hidden"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">+</span>
                  <span className="text-white font-semibold">{p.pkg}</span>
                  <span className="text-slate-600">@{p.version}</span>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-linear-to-r from-cyan-500 to-pink-500"
                      initial={{ width: "0%" }}
                      animate={step > idx ? { width: "100%" } : {}}
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
                <motion.div
                  className="ml-4 flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={step > idx ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.7, duration: 0.3 }}
                >
                  <span className="text-slate-600 text-xs">-&gt;</span>
                  <span className="text-amber-300 text-xs">{p.name}</span>
                  <span className="text-slate-700 text-xs">// Developer</span>
                </motion.div>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={step > packages.length - 1 ? { opacity: 1 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="pt-2 border-t border-white/6"
          >
            <span className="text-slate-500 text-xs">
              added <span className="text-white font-semibold">{packages.length} contributors</span> in <span className="text-white">0.3s</span>
            </span>
          </motion.div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-emerald-400">$</span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
              className="inline-block w-2 h-4 bg-slate-500"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}



/* ================================================================== */
/*  ANIMATED BORDER BUTTON                                             */
/* ================================================================== */
function GlowButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="relative group w-full py-4 rounded-xl font-bold text-white overflow-hidden cursor-pointer"
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 rounded-xl p-[2px]"
        style={{ background: "conic-gradient(from 0deg, #06b6d4, #f43f5e, #3b82f6, #06b6d4)" }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      {/* Inner fill */}
      <div className="absolute inset-[2px] rounded-[10px] bg-gradient-to-r from-cyan-600 via-cyan-500 to-rose-600" />
      {/* Running shimmer */}
      <motion.div
        className="absolute inset-[2px] rounded-[10px] pointer-events-none"
        style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)" }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
        <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          &rarr;
        </motion.span>
      </span>
    </motion.button>
  );
}

/* ================================================================== */
/*  ANIMATION VARIANTS                                                 */
/* ================================================================== */
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } } };

/* ================================================================== */
/*  LANDING PAGE                                                       */
/* ================================================================== */
export default function LandingPage() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.18], [1, 0.92]);
  const heroBgY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);

  // Mouse glow
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <div ref={ref} className="relative min-h-screen w-full overflow-x-hidden bg-[#0a0a0f] text-white" onMouseMove={handleMouseMove}>
      {/* ── BACKGROUND LAYERS ── */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0c1222] to-[#0a0a0f]" />

      {/* Aurora */}
      <div className="fixed inset-0 pointer-events-none">
        <Aurora />
      </div>

      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <FloatingOrb color="rgba(139, 92, 246, 0.15)" size={500} x="-5%" y="-10%" delay={0} />
        <FloatingOrb color="rgba(236, 72, 153, 0.12)" size={400} x="65%" y="5%" delay={3} />
        <FloatingOrb color="rgba(59, 130, 246, 0.08)" size={350} x="80%" y="60%" delay={5} />
        <FloatingOrb color="rgba(244, 114, 182, 0.1)" size={300} x="10%" y="70%" delay={9} />
      </div>

      {/* Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.4) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Meteors */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-1">
        {meteors.map((m) => <Meteor key={m.id} delay={m.delay} />)}
      </div>

      {/* Floating Pi Digits */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-1">
        {floatingPis.map((p) => <FloatingPi key={p.id} delay={p.delay} x={p.x} digit={p.digit} />)}
      </div>

      {/* Sparkles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
        {sparkles.map((s) => <Sparkle key={s.id} delay={s.delay} x={s.x} />)}
      </div>

      {/* Mouse tracking glow */}
      <motion.div
        className="fixed pointer-events-none z-[2]"
        style={{
          x: smoothX, y: smoothY,
          width: 600, height: 600, marginLeft: -300, marginTop: -300,
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, rgba(236,72,153,0.03) 40%, transparent 70%)",
        }}
      />

      {/* ── HERO SECTION ── */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale, y: heroBgY }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center"
      >
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-6 max-w-3xl">
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.05] backdrop-blur-md border border-white/[0.1] shadow-lg shadow-cyan-500/5"
          >
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="text-cyan-400 text-lg font-bold">
              π
            </motion.span>
            <span className="text-xs font-semibold text-cyan-300/90 tracking-wider uppercase">March 14th Celebration</span>
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="text-cyan-400 text-lg font-bold">
              π
            </motion.span>
          </motion.div>

          {/* Title */}
          <motion.h1 variants={fadeUp} className="text-5xl sm:text-7xl md:text-8xl font-extrabold leading-[1.05] tracking-tight">
            <span className="landing-gradient-text">PI DAY Quiz</span>
          </motion.h1>

          {/* Glowing line */}
          <motion.div
            variants={fadeUp}
            className="h-px w-40 mx-auto"
            style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.6), rgba(59,130,246,0.6), transparent)" }}
          />

          {/* Typewriter subtitle */}
          <motion.div variants={fadeUp} className="text-base sm:text-lg text-slate-200 max-w-lg leading-relaxed">
            <Typewriter
              text="Hosted by CSA & Department of AMCS PSG CT"
              delay={1500}
              className="text-slate-400"
            />
          </motion.div>

          {/* Podium Section with Side Credits */}
          {/* <motion.div variants={fadeUp} className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-center justify-center gap-8 lg:gap-12"> */}
            {/* Left Side - Quiz Masters */}
            {/* <div className="text-center lg:flex-1 flex flex-col items-center justify-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Quiz Masters</p>
              <p className="text-sm font-semibold text-white">Dinesh Veluswamy</p>
              <p className="text-sm font-semibold text-white">Anu Varshini</p>
            </div> */}

            {/* Center - Podium */}
            {/* <div className="flex-shrink-0">
              <Podium
                entries={[
                  { teamName: "Team3", totalScore: 145, rank: 1, members: ["Prasharadha K", "Dhishaa S"] },
                  { teamName: "Team1", totalScore: 135, rank: 2, members: ["Narain Surya R S", "Sachin K"] },
                  { teamName: "Team6", totalScore: 85, rank: 3, members: ["Ajay H", "Arul Kevin J"] },
                ]}
              />
            </div> */}

            {/* Right Side - Developed by */}
            {/* <div className="text-center lg:flex-1 flex flex-col items-center justify-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Developed by</p>
              <p className="text-sm font-semibold text-white">Hemanth Vasudev N P</p>
              <p className="text-sm font-semibold text-white">Nithiish S D</p>
              <p className="text-sm font-semibold text-white">Jithendra U</p>
            </div>
          </motion.div> */}

          {/* Tech Team & Organization
          <motion.div variants={fadeUp} className="text-center space-y-3">
            <p className="text-xs text-cyan-400 uppercase tracking-widest font-semibold">Tech Team</p>
            <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            <p className="text-sm font-semibold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              CSA & Department of Applied Mathematics and Computational Sciences
            </p>
            <p className="text-sm font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
              PSG College of Technology
            </p>
          </motion.div> */}

            {/* Podium Section with Side Credits */}
{/* <motion.div variants={fadeUp} className="flex flex-col items-center justify-center isolate"> */}
  
  {/* Left - Quiz Masters */}
  {/* <div className="flex items-center justify-center" style={{ zIndex: 10, position: 'relative' }}>
    <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Quiz Masters</p>
    <p className="text-sm font-semibold text-white">Dinesh Veluswamy</p>
    <p className="text-sm font-semibold text-white">Anu Varshini</p>
  </div> */}

  {/* Center - Podium */}
  {/* <div className="flex items-center justify-center" style={{ zIndex: 10, position: 'relative' }}>
    <Podium
      entries={[
        { teamName: "Team3", totalScore: 145, rank: 1, members: ["Prasharadha K", "Dhishaa S"] },
        { teamName: "Team1", totalScore: 135, rank: 2, members: ["Carol White", "David Brown"] },
        { teamName: "Team6", totalScore: 85, rank: 3, members: ["Eva Green", "Frank Miller"] },
      ]}
    />
  </div> */}

  {/* Right - Developed by */}
  {/* <div className="flex flex-col items-center justify-center isolate">
    <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Developed by</p>
    <p className="text-sm font-semibold text-white">Hemanth Vasudev N P</p>
    <p className="text-sm font-semibold text-white">Nithiish S D</p>
    <p className="text-sm font-semibold text-white">Jithendra U</p>
  </div>

</motion.div> */}

{/* Podium Section with Side Credits */}
<motion.div variants={fadeUp} className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-32 mt-12 px-6">

  {/* Left - Quiz Masters */}
  <div className="flex flex-col items-center justify-center min-w-[260px]">
    <p className="text-lg landing-gradient-text uppercase tracking-[0.25em] font-extrabold mb-4 whitespace-nowrap">Quiz Masters</p>
    <div className="space-y-2 text-center">
      <p className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] whitespace-nowrap">Dinesh Veluswamy</p>
      <p className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] whitespace-nowrap">Anu Varshini</p>
    </div>
  </div>

  {/* Center - Podium */}
  <div className="flex items-center justify-center order-first md:order-none" style={{ position: 'relative', zIndex: 10 }}>
    <Podium
      entries={[
        { teamName: "Team3", totalScore: 145, rank: 1, members: ["Prasharadha K", "Dhishaa S"] },
        { teamName: "Team1", totalScore: 135, rank: 2, members: ["Narain Surya R S", "Sachin K"] },
        { teamName: "Team6", totalScore: 85, rank: 3, members: ["Ajay H", "Arun Kevin J"] },
      ]}
    />
  </div>

  {/* Right - Developed by */}
  <div className="flex flex-col items-center justify-center min-w-[260px]">
    <p className="text-lg landing-gradient-text uppercase tracking-[0.25em] font-extrabold mb-4 whitespace-nowrap">Developed by</p>
    <div className="space-y-2 text-center">
      <p className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] whitespace-nowrap">Hemanth Vasudev N P</p>
      <p className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] whitespace-nowrap">Nithiish S D</p>
      <p className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] whitespace-nowrap">Jithendra U</p>
    </div>
  </div>

</motion.div>

          {/* Scroll hint */}
          <motion.div variants={fadeUp} className="mt-14" animate={{ y: [0, 12, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-600 uppercase tracking-[0.25em]">Scroll</span>
              <div className="w-5 h-8 rounded-full border border-slate-700 flex items-start justify-center p-1">
                <motion.div
                  className="w-1 h-2 rounded-full bg-cyan-400"
                  animate={{ y: [0, 10, 0], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ── MARQUEE STRIP ── */}
      <div className="relative z-10 py-6 border-y border-white/[0.04] bg-white/[0.01] backdrop-blur-sm space-y-3 overflow-hidden">
        <Marquee direction={1} speed={35} />
        <Marquee direction={-1} speed={28} />
      </div>

      {/* ── FEATURED EVENT ── */}
      <section className="relative z-10 px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Featured Event</h2>
          <div className="mt-4 mx-auto h-1 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500" />
        </motion.div>

        <div className="max-w-md mx-auto" style={{ perspective: 800 }}>
          <TiltCard className="group relative rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-8 shadow-2xl shadow-cyan-500/5 transition-colors hover:border-cyan-500/20">
            {/* Top gradient bar */}
            <div className="absolute top-0 left-8 right-8 h-px rounded-b-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

            {/* Animated icon */}
            <motion.div
              className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>

            {/* Badge */}
            <motion.span
              animate={{ boxShadow: ["0 0 0 rgba(16,185,129,0)", "0 0 12px rgba(16,185,129,0.3)", "0 0 0 rgba(16,185,129,0)"] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block px-3 py-1 mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase absolute right-0 mr-3"
            >
              Live Quiz
            </motion.span>

            <h3 className="text-2xl font-bold text-white mb-2">Quiz Event</h3>
            <p className="text-slate-400 text-sm mb-1">Test your knowledge in our exciting quiz!</p>
            <p className="text-sm mb-7">
              <span className="text-slate-500">Quiz Master — </span>
              <span className="text-cyan-300 font-semibold">Dinesh Veluswamy</span>
            </p>

            <GlowButton onClick={() => navigate("/login")}>Enter Quiz App</GlowButton>
          </TiltCard>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="relative z-10 flex items-center justify-center py-4">
        <motion.div className="h-px w-24" animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
          style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.5))" }}
        />
        <motion.span
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="mx-4 text-xl font-bold text-cyan-400/30"
        >
          π
        </motion.span>
        <motion.div className="h-px w-24" animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          style={{ background: "linear-gradient(270deg, transparent, rgba(6,182,212,0.5))" }}
        />
      </div>

      {/* ── INSPIRATIONAL QUOTE ── */}
      <section className="relative z-10 px-6 py-20">
        <motion.blockquote
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-xl mx-auto text-center"
        >
          <div className="flex justify-center gap-3 mb-5">
            {[0, 0.8, 1.6].map((d, i) => (
              <motion.span
                key={i}
                animate={{ scale: [1, 1.3, 1], rotate: [0, 20, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: d }}
                className="text-cyan-500/50 text-2xl font-bold"
              >
                π
              </motion.span>
            ))}
          </div>

          <motion.p
            className="text-xl sm:text-2xl font-medium text-slate-300 italic leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.3 }}
          >
            &ldquo;Mathematics is not about numbers, equations, or algorithms; it is about understanding.&rdquo;
          </motion.p>
          <motion.p
            className="mt-4 text-sm font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            — William Paul Thurston
          </motion.p>
          <div className="mt-5 mx-auto h-px w-16 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        </motion.blockquote>
      </section>

      {/* ── CREDITS ── */}
      <footer className="relative z-10 px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl font-bold text-white">Behind the Scenes</h2>
          <p className="mt-2 text-sm text-slate-500">The developers behind this project</p>
        </motion.div>

        <NpmInstallCredits />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-16 text-center space-y-2"
        >
          <p className="text-xs text-slate-600">&copy; 2026 QFactor — PSG College of Technology</p>
          <p className="text-xs bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent font-medium">
            Happy Pi Day! 🥧 3.14159...
          </p>
        </motion.div>
      </footer>

      {/* Custom CSS */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .landing-gradient-text {
          background: linear-gradient(90deg, #06b6d4, #f43f5e, #22d3ee, #06b6d4);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 4s ease infinite;
        }
      `}</style>
    </div>
  );
}
