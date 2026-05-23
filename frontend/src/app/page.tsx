"use client";
import { ChevronRight, FlaskConical, Loader2, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { CellStage } from "@/components/CellStage";
import { DesignPanel } from "@/components/DesignPanel";
import { DosingPanel } from "@/components/DosingPanel";
import { OptimizerPanel } from "@/components/OptimizerPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";

export default function Home() {
  const {
    doses,
    duration,
    heteroplasmy,
    prediction,
    setSim,
    setError,
    error,
  } = useApp();
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
    <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-8">
      <Hero />

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DesignPanel />
          <DosingPanel />
          <div className="panel p-5 flex items-center justify-between">
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
          <OptimizerPanel />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <CellStage />
          <ResultsPanel />
        </div>
      </section>

      {error && (
        <div className="panel p-4 border-[var(--danger)]/40 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <ScienceFooter />
    </main>
  );
}

function Hero() {
  return (
    <header className="relative">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-2)] to-[var(--accent-3)] flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <FlaskConical className="w-5 h-5 text-[#0a0f1f]" />
            </div>
            <span className="chip">Caltech Hackathon · 2026</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-tight">
            <span className="glow-text">MitoEdit AI</span>
          </h1>
          <p className="mt-3 text-[var(--fg-dim)] max-w-2xl leading-relaxed">
            An AI-driven simulation platform for{" "}
            <span className="text-[var(--fg)]">doxycycline-inducible CRISPR prime editing</span>{" "}
            of mitochondrial DNA — delivered into the matrix through the{" "}
            <span className="text-[var(--accent)]">PNPase</span> RNA-import channel.
            We model the full pipeline end-to-end: induction kinetics, RNP biogenesis,
            mitochondrial import, and heteroplasmy shift over time — and use Bayesian
            optimisation to find the dosing schedule that maximises therapeutic rescue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a className="btn ghost text-xs" href="#science">
            How it works <ChevronRight className="w-3 h-3" />
          </a>
          <a className="btn ghost text-xs" href="#science">
            Read the science
          </a>
        </div>
      </div>
    </header>
  );
}

function ScienceFooter() {
  return (
    <section id="science" className="panel p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--accent)]">
          The Science Behind MitoEdit
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm leading-relaxed">
        <Step
          n={1}
          title="Safe-harbor integration"
          body="A doxycycline-inducible cassette encoding our modified CRISPR/peg-RNA machinery is integrated into a genomic safe-harbor locus."
        />
        <Step
          n={2}
          title="Dox induction"
          body="Doxycycline triggers Hill-kinetics transcription of the cassette. The resulting transcripts are translated and assembled into ribonucleoprotein complexes carrying an MTS tag."
        />
        <Step
          n={3}
          title="PNPase import"
          body="The PNPase channel on the mitochondrial membrane imports the tagged RNP into the matrix — bypassing the otherwise impermeable mitochondrial barrier."
        />
        <Step
          n={4}
          title="mtDNA edit"
          body="Inside the matrix, the prime editor installs the corrective base swap (e.g. m.3243A>G reversion) and the heteroplasmy load shifts towards WT over hours-to-days."
        />
      </div>
      <div className="text-xs text-[var(--fg-dim)] pt-3 border-t border-white/5 leading-relaxed">
        Model variables, default rate constants, and the ML predictor architecture are documented in{" "}
        <span className="mono text-[var(--accent-2)]">backend/app/simulator.py</span> and{" "}
        <span className="mono text-[var(--accent-2)]">backend/app/predictor.py</span>. Pegging guide
        designs to known pathogenic loci (MELAS, NARP, LHON) lets us tie the demo to real
        therapeutic targets.
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="panel-tight p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--accent-2)]">
        Step {n}
      </div>
      <div className="text-[var(--fg)] font-semibold mt-1">{title}</div>
      <div className="text-xs text-[var(--fg-dim)] mt-1 leading-relaxed">{body}</div>
    </div>
  );
}
