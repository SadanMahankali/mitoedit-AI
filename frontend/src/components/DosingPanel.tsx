"use client";
import { Plus, Pill, Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";

export function DosingPanel() {
  const { doses, addDose, removeDose, setDoses, duration, setDuration, heteroplasmy, setHeteroplasmy } =
    useApp();

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-[var(--accent-3)]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--accent-3)]">
            Doxycycline Dosing Schedule
          </h2>
        </div>
        <button
          className="btn ghost text-xs"
          onClick={() => addDose({ time: duration / 2, amount: 1.5 })}
        >
          <Plus className="w-3 h-3" /> Add dose
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
            Simulation duration: <span className="text-[var(--fg)]">{duration} h</span>
          </label>
          <input
            type="range"
            min={24}
            max={240}
            step={12}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
            Initial heteroplasmy: <span className="text-[var(--fg)]">{(heteroplasmy * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min={0.1}
            max={0.99}
            step={0.01}
            value={heteroplasmy}
            onChange={(e) => setHeteroplasmy(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
        {doses.length === 0 && (
          <p className="text-xs text-[var(--fg-dim)] italic">No doses scheduled — try adding one or run optimizer.</p>
        )}
        {doses.map((d, idx) => (
          <div key={idx} className="panel-tight p-3 flex items-center gap-3">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
                  Time (h)
                </div>
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  value={d.time}
                  onChange={(e) => {
                    const next = [...doses];
                    next[idx] = { ...d, time: Number(e.target.value) };
                    setDoses(next.sort((a, b) => a.time - b.time));
                  }}
                />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
                  Bolus
                </div>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  value={d.amount}
                  onChange={(e) => {
                    const next = [...doses];
                    next[idx] = { ...d, amount: Number(e.target.value) };
                    setDoses(next);
                  }}
                />
              </div>
            </div>
            <button
              className="text-[var(--danger)]/70 hover:text-[var(--danger)] p-1"
              onClick={() => removeDose(idx)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
