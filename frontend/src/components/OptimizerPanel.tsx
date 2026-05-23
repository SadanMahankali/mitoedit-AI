"use client";
import { Brain, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { OptHistoryChart } from "./Charts";

export function OptimizerPanel() {
  const {
    prediction,
    heteroplasmy,
    duration,
    setDoses,
    setSim,
    setError,
    opt,
    setOpt,
  } = useApp();
  const [busy, setBusy] = useState(false);
  const [trials, setTrials] = useState(60);

  async function run() {
    if (!prediction) return;
    setBusy(true);
    try {
      const r = await api.optimize({
        duration_h: duration,
        efficiency: prediction.on_target,
        off_target: prediction.off_target_risk,
        initial_heteroplasmy: heteroplasmy,
        n_trials: trials,
      });
      setOpt(r);
      setDoses(r.best_doses);
      setSim(r.best_simulation);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[var(--accent-2)]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--accent-2)]">
            Bayesian Dose Optimizer
          </h2>
        </div>
        <span className="chip">Optuna TPE</span>
      </div>

      <p className="text-xs text-[var(--fg-dim)] leading-relaxed">
        Searches over dose count, interval, and bolus magnitude to minimise residual
        pathogenic heteroplasmy while penalising dox exposure (toxicity) and
        time-to-rescue.
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
            Trials: <span className="text-[var(--fg)]">{trials}</span>
          </label>
          <input
            type="range"
            min={20}
            max={200}
            step={10}
            value={trials}
            onChange={(e) => setTrials(Number(e.target.value))}
          />
        </div>
        <button className="btn" onClick={run} disabled={busy || !prediction}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          {busy ? "Searching" : "Optimize"}
        </button>
      </div>

      {opt && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="panel-tight p-2">
              <div className="text-[10px] text-[var(--fg-dim)] uppercase">N doses</div>
              <div className="mono text-[var(--accent)] text-base">{opt.best_params.n_doses}</div>
            </div>
            <div className="panel-tight p-2">
              <div className="text-[10px] text-[var(--fg-dim)] uppercase">Interval</div>
              <div className="mono text-[var(--accent)] text-base">
                {opt.best_params.interval_h.toFixed(1)}h
              </div>
            </div>
            <div className="panel-tight p-2">
              <div className="text-[10px] text-[var(--fg-dim)] uppercase">Bolus</div>
              <div className="mono text-[var(--accent)] text-base">
                {opt.best_params.bolus_amount.toFixed(2)}
              </div>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)] mb-1">
              Trial landscape — toxicity vs. residual disease
            </div>
            <OptHistoryChart opt={opt} />
          </div>
        </div>
      )}
    </div>
  );
}
