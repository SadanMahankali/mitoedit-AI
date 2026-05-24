"use client";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Brain,
  Dna,
  FileDown,
  FlaskConical,
  HeartPulse,
  Pill,
  Sparkles,
  Target,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

const SECTIONS = [
  { id: "patients",   label: "Patients",        icon: User },
  { id: "overview",   label: "Treatment",       icon: Activity },
  { id: "design",     label: "Guide design",    icon: Dna },
  { id: "dosing",     label: "Dosing",          icon: Pill },
  { id: "optimizer",  label: "Optimizer",       icon: Brain },
  { id: "cell",       label: "Live cell",       icon: Sparkles },
  { id: "results",    label: "Results",         icon: Activity },
  { id: "offtargets", label: "Off-targets",     icon: Target },
  { id: "aging",      label: "Aging model",     icon: HeartPulse },
  { id: "ai",         label: "AI co-scientist", icon: Zap },
  { id: "export",     label: "Export report",   icon: FileDown },
];

export function Sidebar() {
  const { setView } = useApp();
  const [active, setActive] = useState<string>("patients");

  // Scroll-spy: highlight section in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  }

  return (
    <motion.aside
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-30 px-4 py-6 border-r border-white/5"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,16,36,0.95) 0%, rgba(5,8,16,0.95) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Brand */}
      <button
        onClick={() => setView("landing")}
        className="flex items-center gap-2 mb-8 group"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] via-[var(--accent-2)] to-[var(--accent-3)] flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
          <FlaskConical className="w-4 h-4 text-[#0a0f1f]" />
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold glow-text leading-tight">Revitalize AI</div>
          <div className="text-[9px] uppercase tracking-widest text-[var(--fg-dim)]">v0.2 · dashboard</div>
        </div>
      </button>

      {/* Section nav */}
      <nav className="space-y-0.5 flex-1 overflow-y-auto scrollbar-thin -mx-1 px-1">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <motion.button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.03, duration: 0.3 }}
              whileHover={{ x: 3 }}
              className={`group flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-all relative ${
                isActive
                  ? "text-[var(--fg)] bg-gradient-to-r from-[var(--accent-2)]/15 to-transparent"
                  : "text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-white/[0.03]"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-3)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className="w-3.5 h-3.5"
                style={isActive ? { color: "var(--accent)" } : undefined}
              />
              <span className="font-medium tracking-wide">{s.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Back to landing */}
      <button
        onClick={() => setView("landing")}
        className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-white/[0.04] transition-all"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to landing
      </button>

      <div className="text-[9px] text-[var(--fg-dim)]/60 mt-2 px-3 leading-relaxed">
        Caltech Hackathon · 2026<br />
        FastAPI + Next.js + Claude
      </div>
    </motion.aside>
  );
}
