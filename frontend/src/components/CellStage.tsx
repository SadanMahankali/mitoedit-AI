"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Columns, Eye } from "lucide-react";
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
  const [split, setSplit] = useState(false);

  useEffect(() => {
    if (!sim) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const T = 12000;
      const p = ((now - start) % T) / T;
      setPhase(p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sim]);

  const { induction, importRate, edited, mosaic, untreatedMosaic } = useMemo(() => {
    if (!sim) {
      return {
        induction: 0.2,
        importRate: 0.2,
        edited: 0,
        mosaic: undefined,
        untreatedMosaic: undefined,
      };
    }
    const i = Math.min(sim.t.length - 1, Math.floor(phase * sim.t.length));
    const maxMrna = Math.max(...sim.mrna, 1e-6);
    const maxImp = Math.max(...sim.rnp_mito, 1e-6);
    const e = sim.edited_fraction[i];
    const N = 12;
    const m: number[] = [];
    const um: number[] = [];
    for (let k = 0; k < N; k++) {
      const rand = Math.sin(k * 99.13) * 0.5 + 0.5;
      const offset = (rand - 0.5) * 0.45;
      const speed = 0.7 + rand * 0.6;
      const ek = Math.max(0, Math.min(1, e * speed + offset * (1 - e)));
      m.push(ek);
      um.push(0); // untreated baseline = no editing
    }
    return {
      induction: sim.mrna[i] / maxMrna,
      importRate: sim.rnp_mito[i] / maxImp,
      edited: e,
      mosaic: m,
      untreatedMosaic: um,
    };
  }, [sim, phase]);

  return (
    <div className="panel relative overflow-hidden h-[460px]">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      {split ? (
        <div className="absolute inset-0 grid grid-cols-2 gap-px bg-[var(--panel-border)]">
          <div className="relative">
            <CellViz induction={0.05} importRate={0.05} editedFraction={0} mosaicEdits={untreatedMosaic} />
            <div className="absolute top-4 left-4 z-10">
              <span className="chip" style={{ background: "#fb718522", borderColor: "#fb718544", color: "#fb7185" }}>
                Untreated · no editing
              </span>
            </div>
          </div>
          <div className="relative">
            <CellViz induction={induction} importRate={importRate} editedFraction={edited} mosaicEdits={mosaic} />
            <div className="absolute top-4 left-4 z-10">
              <span className="chip" style={{ background: "#5eead422", borderColor: "#5eead444", color: "#5eead4" }}>
                CRISPR + dox · {(edited * 100).toFixed(0)}% edited
              </span>
            </div>
          </div>
        </div>
      ) : (
        <CellViz induction={induction} importRate={importRate} editedFraction={edited} mosaicEdits={mosaic} />
      )}

      <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none" style={{ display: split ? "none" : "flex" }}>
        <span className="chip">Live cellular response</span>
        <div className="text-[10px] mono text-[var(--fg-dim)]">
          t = {(phase * (sim?.t?.at(-1) ?? 0)).toFixed(1)}h
        </div>
      </div>

      <button
        onClick={() => setSplit(!split)}
        className="absolute top-4 right-4 btn ghost text-xs z-10"
      >
        {split ? <Eye className="w-3 h-3" /> : <Columns className="w-3 h-3" />}
        {split ? "Single view" : "Compare treated vs untreated"}
      </button>

      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-3 right-3 panel-tight p-2 text-[10px] mono space-y-1">
      <Dot color="#818cf8" label="Nucleus (cassette)" />
      <Dot color="#5eead4" label="CRISPR/peg RNP cargo" />
      <Dot color="#fbbf24" label="PNPase translocon" />
      <Dot color="#f472b6" label="Mito · pathogenic" />
      <Dot color="#22d3ee" label="Mito · edited" />
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
