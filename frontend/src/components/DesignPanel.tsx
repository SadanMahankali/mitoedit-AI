"use client";
import { useEffect } from "react";
import { Beaker, Dna, Sparkles, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";

export function DesignPanel() {
  const {
    regions,
    selectedRegion,
    design,
    prediction,
    setRegions,
    setSelectedRegion,
    setDesign,
    setPrediction,
    setError,
  } = useApp();

  useEffect(() => {
    api
      .regions()
      .then((r) => {
        setRegions(r.regions);
        if (!selectedRegion && r.regions[0]) {
          setSelectedRegion(r.regions[0].name);
        }
      })
      .catch((e) => setError(String(e)));
  }, [setRegions, setSelectedRegion, setError, selectedRegion]);

  useEffect(() => {
    if (!selectedRegion) return;
    api
      .design(selectedRegion)
      .then((d) => {
        setDesign(d);
        return api.predict(d.spacer, d.pegrna_3p);
      })
      .then((p) => setPrediction(p))
      .catch((e) => setError(String(e)));
  }, [selectedRegion, setDesign, setPrediction, setError]);

  const currentRegion = regions.find((r) => r.name === selectedRegion);

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--accent)]">
            Target & Guide Design
          </h2>
        </div>
        <span className="chip">
          <Sparkles className="w-3 h-3" />
          ML Predicted
        </span>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-[var(--fg-dim)]">
          Pathogenic mtDNA locus
        </label>
        <select
          value={selectedRegion ?? ""}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="mt-1"
        >
          {regions.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name} — {r.disease}
            </option>
          ))}
        </select>
        {currentRegion && (
          <p className="text-xs text-[var(--fg-dim)] mt-2">
            Target edit:{" "}
            <span className="mono text-[var(--accent-2)]">
              m.{currentRegion.position}
              {currentRegion.wt}&gt;{currentRegion.edit}
            </span>{" "}
            — auto-designs pegRNA + spacer for prime editing.
          </p>
        )}
      </div>

      {design && (
        <div className="panel-tight p-3 space-y-2">
          <Row label="Spacer (gRNA)" value={design.spacer} />
          <Row label="PAM" value={design.pam} />
          <Row label="pegRNA 3′ extension" value={design.pegrna_3p} />
          <Row label="Edit position" value={`m.${design.edit_position}`} mono />
        </div>
      )}

      {prediction && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Stat
            icon={<Zap className="w-4 h-4" />}
            label="On-target efficiency"
            value={`${(prediction.on_target * 100).toFixed(1)}%`}
            accent="text-[var(--accent)]"
            bar={prediction.on_target}
            barColor="var(--accent)"
          />
          <Stat
            icon={<Beaker className="w-4 h-4" />}
            label="Off-target risk"
            value={`${(prediction.off_target_risk * 100).toFixed(1)}%`}
            accent="text-[var(--accent-3)]"
            bar={prediction.off_target_risk}
            barColor="var(--accent-3)"
          />
          <Stat
            label="GC content"
            value={`${(prediction.gc_content * 100).toFixed(0)}%`}
          />
          <Stat label="PBS Tm" value={`${prediction.pbs_tm.toFixed(0)} °C`} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-[var(--fg-dim)]">{label}</span>
      <span className={`text-xs ${mono ? "mono text-[var(--accent-2)]" : "mono text-[var(--fg)]"} truncate`}>
        {value}
      </span>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
  bar,
  barColor,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  bar?: number;
  barColor?: string;
}) {
  return (
    <div className="panel-tight p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
        {icon}
        {label}
      </div>
      <div className={`text-lg font-semibold mt-1 ${accent ?? ""}`}>{value}</div>
      {bar !== undefined && (
        <div className="h-1 mt-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${bar * 100}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  );
}
