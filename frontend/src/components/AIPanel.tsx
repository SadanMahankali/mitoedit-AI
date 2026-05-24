"use client";
import {
  BookOpen,
  Brain,
  Download,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";

type Tab = "interpret" | "protocol" | "scenario";

export function AIPanel() {
  const {
    sim,
    opt,
    design,
    prediction,
    regions,
    selectedRegion,
    setSelectedRegion,
    setDuration,
    setHeteroplasmy,
    setDoses,
    setError,
  } = useApp();
  const [tab, setTab] = useState<Tab>("interpret");
  const [busy, setBusy] = useState(false);
  const [interpretText, setInterpretText] = useState("");
  const [protocolText, setProtocolText] = useState("");
  const text = tab === "interpret" ? interpretText : tab === "protocol" ? protocolText : "";
  const setText = tab === "interpret" ? setInterpretText : setProtocolText;
  const [scenarioInput, setScenarioInput] = useState(
    "Simulate a 45-year-old MELAS patient with 78% pathogenic heteroplasmy on a 5-day course.",
  );
  const [scenarioInfo, setScenarioInfo] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentRegion = regions.find((r) => r.name === selectedRegion);

  async function runInterpret() {
    if (!sim || !design || !prediction || !currentRegion) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setInterpretText("");
    try {
      await api.streamInterpret(
        { region: currentRegion, design, prediction, simulation: sim },
        (chunk) => setInterpretText((t) => t + chunk),
        ctrl.signal,
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runProtocol() {
    if (!opt || !design || !prediction || !currentRegion) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setProtocolText("");
    try {
      await api.streamProtocol(
        {
          region: currentRegion,
          design,
          prediction,
          best_doses: opt.best_doses,
          best_simulation: opt.best_simulation,
        },
        (chunk) => setProtocolText((t) => t + chunk),
        ctrl.signal,
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runScenario() {
    if (!scenarioInput.trim()) return;
    setBusy(true);
    setScenarioInfo(null);
    try {
      const r = await api.scenario(scenarioInput);
      setSelectedRegion(r.region);
      setDuration(r.duration_h);
      setHeteroplasmy(r.initial_heteroplasmy);
      setDoses(r.doses);
      setScenarioInfo(
        `Loaded "${r.region}" · ${(r.initial_heteroplasmy * 100).toFixed(0)}% het · ${r.duration_h}h · ${r.doses.length} doses\n→ ${r.rationale}`,
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revitalize-${tab}-${currentRegion?.name.replace(/\W+/g, "_") ?? "result"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent-3)]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--accent-3)]">
            Claude AI Co-Scientist
          </h2>
        </div>
        <span className="chip">claude-opus-4-7</span>
      </div>

      <div className="flex gap-2 text-xs">
        <TabBtn active={tab === "interpret"} onClick={() => setTab("interpret")}>
          <Brain className="w-3 h-3" /> Interpret
        </TabBtn>
        <TabBtn active={tab === "protocol"} onClick={() => setTab("protocol")}>
          <BookOpen className="w-3 h-3" /> Wet-lab Protocol
        </TabBtn>
        <TabBtn active={tab === "scenario"} onClick={() => setTab("scenario")}>
          <Wand2 className="w-3 h-3" /> NL Scenario
        </TabBtn>
      </div>

      {tab === "interpret" && (
        <Section
          help="Streams a biologist-style explanation of the current simulation — mechanism, rate-limiting step, clinical relevance, caveats."
          actionLabel={busy ? "Streaming…" : "Interpret current simulation"}
          actionIcon={busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          onAction={runInterpret}
          disabled={busy || !sim || !design || !prediction}
          disabledHint={!sim ? "Run a simulation first." : undefined}
        />
      )}

      {tab === "protocol" && (
        <Section
          help="Generates a day-by-day wet-lab protocol for validating the optimized dosing schedule, with materials, controls, and readouts."
          actionLabel={busy ? "Streaming…" : "Generate protocol from optimizer result"}
          actionIcon={busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          onAction={runProtocol}
          disabled={busy || !opt || !design || !prediction}
          disabledHint={!opt ? "Run the optimizer first." : undefined}
        />
      )}

      {tab === "scenario" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--fg-dim)] leading-relaxed">
            Describe a scenario in plain English — Claude uses tool-use to extract
            structured simulator parameters (region, heteroplasmy, dosing) and
            applies them to the dashboard.
          </p>
          <textarea
            value={scenarioInput}
            onChange={(e) => setScenarioInput(e.target.value)}
            rows={3}
            className="w-full"
            style={{
              background: "rgba(8, 12, 28, 0.7)",
              border: "1px solid var(--panel-border)",
              color: "var(--fg)",
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
              fontSize: "0.85rem",
              resize: "vertical",
            }}
          />
          <button
            className="btn"
            onClick={runScenario}
            disabled={busy || !scenarioInput.trim()}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {busy ? "Parsing…" : "Apply scenario"}
          </button>
          {scenarioInfo && (
            <pre className="panel-tight p-3 text-[11px] mono text-[var(--accent)] whitespace-pre-wrap leading-relaxed">
              {scenarioInfo}
            </pre>
          )}
        </div>
      )}

      {tab !== "scenario" && text && (
        <div className="panel-tight p-4 max-h-[420px] overflow-y-auto scrollbar-thin">
          <pre className="text-xs text-[var(--fg)] whitespace-pre-wrap leading-relaxed font-sans">
            {text}
          </pre>
          {!busy && (
            <button className="btn ghost text-xs mt-3" onClick={download}>
              <Download className="w-3 h-3" /> Download .md
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${
        active
          ? "bg-gradient-to-r from-[var(--accent-2)]/30 to-[var(--accent-3)]/30 text-[var(--fg)] border border-[var(--accent-2)]/40"
          : "bg-white/5 text-[var(--fg-dim)] border border-transparent hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  help,
  actionLabel,
  actionIcon,
  onAction,
  disabled,
  disabledHint,
}: {
  help: string;
  actionLabel: string;
  actionIcon: React.ReactNode;
  onAction: () => void;
  disabled: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--fg-dim)] leading-relaxed">{help}</p>
      <button className="btn" onClick={onAction} disabled={disabled}>
        {actionIcon}
        {actionLabel}
      </button>
      {disabled && disabledHint && (
        <p className="text-[11px] text-[var(--warn)]/80">{disabledHint}</p>
      )}
    </div>
  );
}
