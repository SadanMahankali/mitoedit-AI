"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";

const CellViz = dynamic(() => import("./CellViz").then((m) => m.CellViz), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-[var(--fg-dim)] text-sm">
      Loading 3D cell…
    </div>
  ),
});

export function CellStage() {
  const { sim } = useApp();
  const [phase, setPhase] = useState(0);

  // Animate through the simulation timeline so the cell visually reflects state.
  useEffect(() => {
    if (!sim) return;
    let raf = 0;
    let start = performance.now();
    const loop = (now: number) => {
      const T = 12000; // 12s playback per loop
      const p = ((now - start) % T) / T;
      setPhase(p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sim]);

  const { induction, importRate, edited } = useMemo(() => {
    if (!sim) return { induction: 0.2, importRate: 0.2, edited: 0 };
    const i = Math.min(sim.t.length - 1, Math.floor(phase * sim.t.length));
    const maxMrna = Math.max(...sim.mrna, 1e-6);
    const maxImp = Math.max(...sim.rnp_mito, 1e-6);
    return {
      induction: sim.mrna[i] / maxMrna,
      importRate: sim.rnp_mito[i] / maxImp,
      edited: sim.edited_fraction[i],
    };
  }, [sim, phase]);

  return (
    <div className="panel relative overflow-hidden h-[460px]">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <CellViz induction={induction} importRate={importRate} editedFraction={edited} />
      <div className="absolute top-4 left-4 flex flex-col gap-1">
        <span className="chip">Live cellular response</span>
        <div className="text-[10px] mono text-[var(--fg-dim)]">
          t = {(phase * (sim?.t?.at(-1) ?? 0)).toFixed(1)}h
        </div>
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-3 right-3 panel-tight p-2 text-[10px] mono space-y-1">
      <Dot color="#818cf8" label="Nucleus (cassette)" />
      <Dot color="#5eead4" label="CRISPR/peg RNP cargo" />
      <Dot color="#fbbf24" label="PNPase channel" />
      <Dot color="#f472b6" label="Mitochondrion (unedited)" />
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="text-[var(--fg-dim)]">{label}</span>
    </div>
  );
}
