"use client";
import { Activity, Calendar, RotateCcw, TrendingDown, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";

/**
 * Sticky narrative banner: animates through the simulation timeline showing
 * which "treatment day" we're at, current rescue %, and projected outcome.
 */
export function TreatmentBanner() {
  const { sim, heteroplasmy } = useApp();
  const [phase, setPhase] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sim) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    setPhase(0);
    const T = 12000; // 12s single playthrough, then freeze
    const loop = (now: number) => {
      const p = Math.min(1, (now - start) / T);
      setPhase(p);
      if (p < 1) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sim, replayKey]);

  if (!sim || !sim.t || sim.t.length === 0) return null;

  const i = Math.max(0, Math.min(sim.t.length - 1, Math.floor(phase * sim.t.length)));
  const tNow = sim.t[i] ?? 0;
  const totalDays = Math.max(1, Math.ceil((sim.t.at(-1) ?? 24) / 24));
  // Clamp day to the simulation window so 96h doesn't show "Day 5 of 4".
  const day = Math.min(totalDays, Math.floor(tNow / 24) + 1);
  const currentPath = sim.pathogenic_heteroplasmy?.[i] ?? heteroplasmy;
  const initialPath = heteroplasmy || 1e-6;
  const rescuePct = Math.max(0, ((initialPath - currentPath) / initialPath) * 100);
  const rescued = sim.therapeutic_threshold_h != null;
  const projectedH = sim.therapeutic_threshold_h;

  return (
    <div
      className="panel p-3 flex items-center gap-4 sticky top-2 z-20 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(90deg, rgba(94,234,212,0.10) 0%, rgba(129,140,248,0.10) 50%, rgba(244,114,182,0.10) 100%)",
        borderColor: "rgba(94,234,212,0.30)",
      }}
    >
      <div className="flex items-center gap-2 min-w-[160px]">
        <Calendar className="w-4 h-4 text-[var(--accent-2)]" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">Treatment</div>
          <div className="text-sm font-semibold text-[var(--fg)]">
            Day {day} <span className="text-[var(--fg-dim)] font-normal">of {totalDays}</span>{" "}
            <span className="text-[var(--accent)] mono">· t={tNow.toFixed(1)}h</span>
          </div>
        </div>
      </div>

      <div className="h-8 w-px bg-white/10" />

      <div className="flex items-center gap-2 min-w-[170px]">
        <TrendingDown className="w-4 h-4 text-[var(--accent)]" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">Pathogenic load</div>
          <div className="text-sm font-semibold mono">
            <span className="text-[var(--accent-3)]">{(currentPath * 100).toFixed(1)}%</span>
            <span className="text-[var(--fg-dim)] text-xs"> ← {(initialPath * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="h-8 w-px bg-white/10" />

      <div className="flex items-center gap-2 min-w-[140px]">
        <Activity className="w-4 h-4 text-[var(--accent)]" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">Rescue</div>
          <div className="text-sm font-semibold mono text-[var(--accent)]">
            {rescuePct.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="h-8 w-px bg-white/10" />

      <div className="flex items-center gap-2 flex-1">
        <Zap className="w-4 h-4 text-[var(--warn)]" />
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">Projection</div>
          <div className="text-sm font-semibold text-[var(--fg)]">
            {rescued && projectedH != null ? (
              <>
                60% rescue at <span className="mono text-[var(--accent)]">t={projectedH.toFixed(1)}h</span>{" "}
                <span className="text-[var(--fg-dim)]">(day {Math.ceil(projectedH / 24)})</span>
              </>
            ) : (
              <span className="text-[var(--warn)]">
                threshold not reached — try optimizer
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setReplayKey((k) => k + 1)}
        className="btn ghost text-[10px] px-2 py-1"
        title="Replay treatment timeline"
      >
        <RotateCcw className="w-3 h-3" />
        Replay
      </button>

      {/* Progress bar (timeline scrubber) */}
      <div className="absolute left-0 bottom-0 h-[2px] bg-gradient-to-r from-[var(--accent)] via-[var(--accent-2)] to-[var(--accent-3)]"
        style={{ width: `${phase * 100}%`, transition: "width 0.1s linear" }} />
    </div>
  );
}
