"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import { useState } from "react";
import { AIPanel } from "@/components/AIPanel";
import { AgingPanel } from "@/components/AgingPanel";
import { CellStage } from "@/components/CellStage";
import { CircosPlot } from "@/components/CircosPlot";
import { DesignPanel } from "@/components/DesignPanel";
import { DosingPanel } from "@/components/DosingPanel";
import { Landing } from "@/components/Landing";
import { OptimizerPanel } from "@/components/OptimizerPanel";
import { PatientCards } from "@/components/PatientCards";
import { ReportExport } from "@/components/ReportExport";
import { ResultsPanel } from "@/components/ResultsPanel";
import { TreatmentBanner } from "@/components/TreatmentBanner";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";

export default function Home() {
  const { view } = useApp();
  return (
    <AnimatePresence mode="wait">
      {view === "landing" ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Landing />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Dashboard />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Dashboard() {
  const { doses, duration, heteroplasmy, prediction, setSim, setError, error } = useApp();
  const [busy, setBusy] = useState(false);

  async function runSimulation() {
    if (!prediction) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.simulate({
        duration_h: duration,
        doses,
        efficiency: prediction.on_target,
        off_target: prediction.off_target_risk,
        initial_heteroplasmy: heteroplasmy,
      });
      setSim(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DashboardHeader />
      <main
        id="report-root"
        className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-8 scroll-smooth"
      >
        <Section id="patients" title="Patient cohort" subtitle="One-click virtual patients">
          <PatientCards />
        </Section>

        <Section id="overview" title="Treatment overview" subtitle="Live narrative of the simulation">
          <TreatmentBanner />
        </Section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Section id="design" title="Target & guide design" subtitle="ML-predicted editing efficiency">
              <DesignPanel />
            </Section>

            <Section id="dosing" title="Doxycycline schedule" subtitle="Manual dosing plan">
              <DosingPanel />
              <div className="panel p-5 flex items-center justify-between mt-4">
                <div className="text-xs text-[var(--fg-dim)]">
                  {prediction ? (
                    <>
                      Using ML-predicted efficiency{" "}
                      <span className="mono text-[var(--accent)]">
                        {(prediction.on_target * 100).toFixed(1)}%
                      </span>{" "}
                      for ODE simulator.
                    </>
                  ) : (
                    "Loading prediction…"
                  )}
                </div>
                <button className="btn" onClick={runSimulation} disabled={busy || !prediction}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {busy ? "Simulating" : "Run Simulation"}
                </button>
              </div>
            </Section>

            <Section id="optimizer" title="Bayesian dose optimizer" subtitle="Optuna TPE">
              <OptimizerPanel />
            </Section>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Section id="cell" title="Live cellular response" subtitle="Animated CRISPR → PNPase → mtDNA">
              <CellStage />
            </Section>

            <Section id="results" title="Simulation results" subtitle="Heteroplasmy · pathway · toxicity">
              <ResultsPanel />
            </Section>

            <Section id="offtargets" title="Off-target landscape" subtitle="Whole-mtDNA Circos scan">
              <CircosPlot />
            </Section>

            <Section id="aging" title="Biological aging" subtitle="9-parameter mitochondrial model">
              <AgingPanel />
            </Section>

            <Section id="ai" title="Claude AI co-scientist" subtitle="Interpret · protocol · NL scenario">
              <AIPanel />
            </Section>
          </div>
        </section>

        <Section id="export" title="Clinical report" subtitle="Multi-page PDF with charts">
          <div className="panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-sm text-[var(--fg-dim)] max-w-xl">
              Capture the entire dashboard — guide design, ML predictions, simulation
              trajectories, optimised schedule, and aging model — into a single
              multi-page PDF.
            </p>
            <ReportExport />
          </div>
        </Section>

        {error && (
          <div className="panel p-4 border-[var(--danger)]/40 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}
      </main>
    </>
  );
}

function DashboardHeader() {
  const { setView } = useApp();
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative z-20 max-w-7xl mx-auto px-6 pt-6 flex items-center justify-between"
    >
      <button
        onClick={() => setView("landing")}
        className="flex items-center gap-2 group"
      >
        <div className="text-left group-hover:translate-x-0.5 transition-transform">
          <div className="text-base font-semibold glow-text leading-tight">Revitalize AI</div>
          <div className="text-[9px] uppercase tracking-widest text-[var(--fg-dim)]">click to return to landing</div>
        </div>
      </button>
      <span className="chip">Dashboard</span>
    </motion.header>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-6"
    >
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-[var(--accent-2)]">{title}</div>
        {subtitle && <div className="text-[11px] text-[var(--fg-dim)]">{subtitle}</div>}
      </div>
      {children}
    </motion.section>
  );
}
