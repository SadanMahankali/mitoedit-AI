"use client";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Brain,
  Dna,
  FlaskConical,
  HeartPulse,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function Landing() {
  const { setView } = useApp();
  const [scrollY, setScrollY] = useState(0);
  const [logoHover, setLogoHover] = useState(false);

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <main className="relative min-h-screen">
      <AnimatedBackdrop />
      <FloatingMolecules />

      {/* HERO */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 relative cursor-pointer"
          onHoverStart={() => setLogoHover(true)}
          onHoverEnd={() => setLogoHover(false)}
        >
          {/* The animated GIF — uses mix-blend-mode: screen to drop the
             black background and blend with the page gradient. */}
          <motion.div
            className="w-44 h-44 md:w-56 md:h-56 relative z-10"
            animate={
              logoHover
                ? { scale: 1.06, rotate: -2 }
                : { scale: [1, 1.02, 1], rotate: 0 }
            }
            transition={
              logoHover
                ? { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
                : { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }
            style={{
              filter: "drop-shadow(0 0 40px rgba(94, 234, 212, 0.35)) drop-shadow(0 0 80px rgba(129, 140, 248, 0.25))",
            }}
          >
            <img
              src="/logo_clean.gif"
              alt="Revitalize AI logo"
              className="w-full h-full object-contain"
            />
          </motion.div>

          {/* Subtle baseline halo — always on */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: "radial-gradient(circle, rgba(94,234,212,0.12) 0%, transparent 65%)",
            }}
          />

          {/* Aggressive ripples — only on hover */}
          <AnimatePresence>
            {logoHover && (
              <>
                <motion.div
                  key="ring1"
                  className="absolute inset-0 rounded-full border-2 border-[var(--accent)] pointer-events-none"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: [0.9, 1.4, 0.9], opacity: [0.8, 0, 0.8] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                />
                <motion.div
                  key="ring2"
                  className="absolute inset-0 rounded-full border-2 border-[var(--accent-3)] pointer-events-none"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: [0.9, 1.7, 0.9], opacity: [0.6, 0, 0.6] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: 0.4 }}
                />
              </>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.span
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="chip mb-5"
        >
          Caltech Hackathon · 2026
        </motion.span>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="text-6xl md:text-8xl font-bold leading-[1.0] tracking-tight"
        >
          <span className="glow-text">Revitalize AI</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-6 text-lg md:text-xl text-[var(--fg-dim)] max-w-3xl leading-relaxed"
        >
          The first AI-driven simulation platform for{" "}
          <span className="text-[var(--accent)] font-semibold">doxycycline-inducible CRISPR prime editing</span>{" "}
          of mitochondrial DNA — delivered into the matrix through the{" "}
          <span className="text-[var(--accent-2)] font-semibold">PNPase</span> RNA-import channel.
        </motion.p>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="mt-3 text-sm text-[var(--fg-dim)] max-w-2xl"
        >
          Reverse mitochondrial disease. Slow biological aging. Design experiments in silico.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={5}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setView("dashboard")}
            className="btn text-base px-8 py-4 shadow-2xl shadow-indigo-500/40"
            style={{ borderRadius: 14 }}
          >
            <Zap className="w-5 h-5" />
            Get Started
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <a
            href="#how"
            className="btn ghost text-sm"
            style={{ borderRadius: 14 }}
          >
            How it works
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 text-[var(--fg-dim)]"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ opacity: Math.max(0, 1 - scrollY / 300) }}
        >
          <div className="text-[10px] uppercase tracking-widest mb-2">scroll to explore</div>
          <div className="w-px h-8 bg-gradient-to-b from-[var(--accent)] to-transparent mx-auto" />
        </motion.div>
      </section>

      {/* FEATURE GRID */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span className="chip mb-4">What it does</span>
          <h2 className="text-4xl md:text-5xl font-semibold mt-3">
            A complete platform for{" "}
            <span className="glow-text">mitochondrial gene therapy</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="panel p-6 group cursor-default"
              style={{ borderTop: `2px solid ${f.color}` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `${f.color}22`, color: f.color }}
              >
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--fg)] mb-2 group-hover:text-[var(--accent)] transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-[var(--fg-dim)] leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS — 4 step pipeline */}
      <section id="how" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span className="chip mb-4">The science</span>
          <h2 className="text-4xl md:text-5xl font-semibold mt-3">
            Four steps from <span className="glow-text">DNA to rescue</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--accent)] via-[var(--accent-2)] to-[var(--accent-3)] opacity-30 hidden md:block" />
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={`relative grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 md:mb-16 ${
                i % 2 === 0 ? "" : "md:[&>:first-child]:order-2"
              }`}
            >
              <div className="panel p-7">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: s.color, color: "#0a0f1f" }}
                  >
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--fg)]">{s.title}</h3>
                </div>
                <p className="text-sm text-[var(--fg-dim)] leading-relaxed">{s.body}</p>
              </div>
              <div className="hidden md:block" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="panel p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold glow-text">{s.value}</div>
              <div className="text-xs uppercase tracking-wider text-[var(--fg-dim)] mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <Sparkles className="w-10 h-10 mx-auto mb-5 text-[var(--accent)]" />
          <h2 className="text-4xl md:text-6xl font-semibold leading-tight">
            Ready to <span className="glow-text">edit mitochondria</span>?
          </h2>
          <p className="mt-5 text-[var(--fg-dim)] max-w-xl mx-auto">
            Pick a virtual patient. Design a guide. Optimise the dosing schedule. Watch the
            cell heal in real time.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setView("dashboard")}
            className="btn text-base px-10 py-5 mt-10 shadow-2xl shadow-indigo-500/40"
            style={{ borderRadius: 16 }}
          >
            <Zap className="w-5 h-5" />
            Launch Dashboard
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </section>

      <footer className="relative z-10 text-center text-xs text-[var(--fg-dim)] py-6">
        Caltech Hackathon · 2026 · Built with Next.js · FastAPI · PyTorch · Claude Opus 4.7
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    icon: Dna,
    title: "Auto guide & pegRNA design",
    body: "Pick a pathogenic mtDNA locus — MELAS, NARP, LHON — and we auto-design the spacer + pegRNA, then a PyTorch CNN predicts on-target efficiency and off-target risk.",
    color: "#5eead4",
  },
  {
    icon: Activity,
    title: "Full pipeline ODE simulator",
    body: "Six-variable SciPy ODE models doxycycline pharmacokinetics, Hill-induced transcription, PNPase import, and heteroplasmy shift over time.",
    color: "#818cf8",
  },
  {
    icon: Brain,
    title: "Bayesian dose optimizer",
    body: "Optuna's TPE sampler searches the dosing space to maximise editing while minimising toxicity. Typically drops residual pathogenic mtDNA from 50 % → 5 %.",
    color: "#f472b6",
  },
  {
    icon: Target,
    title: "Genome-wide off-target scan",
    body: "Scans the full 16,569 bp mtDNA for partial matches using CFD-style position-weighted scoring. Results shown on an interactive Circos plot.",
    color: "#fb7185",
  },
  {
    icon: HeartPulse,
    title: "Biological aging model",
    body: "Nine mitochondrial parameters — heteroplasmy, mitophagy, fission/fusion, membrane potential — drive a live bio-age trajectory vs. untreated baseline.",
    color: "#22d3ee",
  },
  {
    icon: Sparkles,
    title: "Claude AI co-scientist",
    body: "Streams biologist-style interpretations, generates day-by-day wet-lab protocols, and converts natural-language scenarios into structured experiments via tool use.",
    color: "#fbbf24",
  },
];

const STEPS = [
  {
    title: "Safe-harbor integration",
    body: "A doxycycline-inducible cassette encoding the modified CRISPR/peg-RNA machinery is integrated into a genomic safe-harbor locus (e.g. AAVS1) via CRISPR/Cas9.",
    color: "#5eead4",
  },
  {
    title: "Dox induction & RNP assembly",
    body: "Doxycycline triggers Hill-kinetics transcription. Translation yields a Cas9-pegRNA ribonucleoprotein carrying a mitochondrial targeting signal and a PNPase recognition tag.",
    color: "#818cf8",
  },
  {
    title: "PNPase import into matrix",
    body: "The PNPase translocon on the outer mitochondrial membrane imports the tagged RNP into the matrix — bypassing the otherwise impermeable mitochondrial barrier.",
    color: "#f472b6",
  },
  {
    title: "mtDNA edit & rescue",
    body: "Inside the matrix, the prime editor installs the corrective base swap (e.g. m.3243A>G reversion for MELAS). Heteroplasmy shifts toward WT over hours-to-days. Crossing the 60 % threshold triggers clinical rescue.",
    color: "#fbbf24",
  },
];

const STATS = [
  { value: "16,569", label: "bp scanned per run" },
  { value: "4", label: "pathogenic loci" },
  { value: "9", label: "aging parameters" },
  { value: "5×", label: "rescue acceleration" },
];

// ---------------------------------------------------------------------------
// Decorative background animations
// ---------------------------------------------------------------------------
function AnimatedBackdrop() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(94,234,212,0.18), transparent 70%)" }}
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(129,140,248,0.18), transparent 70%)" }}
        animate={{ x: [0, -50, 20, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(244,114,182,0.14), transparent 70%)" }}
        animate={{ x: [0, 30, -30, 0], y: [0, -40, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function FloatingMolecules() {
  // Pre-computed positions so SSR matches client
  const dots = Array.from({ length: 36 }).map((_, i) => ({
    x: (Math.sin(i * 12.9) * 0.5 + 0.5) * 100,
    y: (Math.cos(i * 17.3) * 0.5 + 0.5) * 100,
    s: 4 + (Math.sin(i * 3.7) * 0.5 + 0.5) * 8,
    d: 8 + (Math.sin(i * 5.1) * 0.5 + 0.5) * 10,
    c: i % 3 === 0 ? "#5eead4" : i % 3 === 1 ? "#818cf8" : "#f472b6",
  }));
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {dots.map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.s,
            height: d.s,
            background: d.c,
            opacity: 0.35,
            boxShadow: `0 0 ${d.s * 2}px ${d.c}`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{ duration: d.d, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
