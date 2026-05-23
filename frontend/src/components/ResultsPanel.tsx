"use client";
import { Activity, FlaskConical, ShieldAlert, Timer } from "lucide-react";
import { useApp } from "@/lib/store";
import { HeteroplasmyChart, PathwayChart, ToxicityChart } from "./Charts";

export function ResultsPanel() {
  const { sim } = useApp();
  if (!sim) {
    return (
      <div className="panel p-8 text-center text-[var(--fg-dim)] text-sm">
        Run a simulation to see heteroplasmy dynamics, pathway intermediates,
        and predicted toxicity.
      </div>
    );
  }
  const rescuePct = (1 - sim.final_pathogenic / Math.max(1e-6, sim.pathogenic_heteroplasmy[0])) * 100;
  return (
    <div className="panel p-5 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          icon={<Activity className="w-4 h-4" />}
          label="Final edited mtDNA"
          value={`${(sim.final_edited * 100).toFixed(1)}%`}
          accent="text-[var(--accent)]"
        />
        <Tile
          icon={<FlaskConical className="w-4 h-4" />}
          label="Residual pathogenic"
          value={`${(sim.final_pathogenic * 100).toFixed(1)}%`}
          accent="text-[var(--accent-3)]"
        />
        <Tile
          icon={<Timer className="w-4 h-4" />}
          label="Time to 60% rescue"
          value={
            sim.therapeutic_threshold_h != null
              ? `${sim.therapeutic_threshold_h.toFixed(1)} h`
              : "—"
          }
          accent="text-[var(--accent-2)]"
        />
        <Tile
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Dox AUC"
          value={sim.dox_auc.toFixed(1)}
          accent="text-[var(--warn)]"
          sub={rescuePct > 0 ? `${rescuePct.toFixed(0)}% rescue` : undefined}
        />
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--fg-dim)] mb-1">
          Heteroplasmy dynamics
        </div>
        <HeteroplasmyChart sim={sim} />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--fg-dim)] mb-1">
          Pathway intermediates — dox → mRNA → cytosolic RNP → mitochondrial RNP
        </div>
        <PathwayChart sim={sim} />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--fg-dim)] mb-1">
          Predicted toxicity (dox AUC + off-target)
        </div>
        <ToxicityChart sim={sim} />
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="panel-tight p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
        {icon}
        {label}
      </div>
      <div className={`text-xl font-semibold mt-1 ${accent ?? ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--fg-dim)] mt-0.5">{sub}</div>}
    </div>
  );
}
