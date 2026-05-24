"use client";
import { Activity, User } from "lucide-react";
import { useApp } from "@/lib/store";

type Patient = {
  id: string;
  name: string;
  age: number;
  region: string;
  heteroplasmy: number;
  duration: number;
  doses: { time: number; amount: number }[];
  vitals: string;
  accent: string;
};

const PATIENTS: Patient[] = [
  {
    id: "A",
    name: "Patient A · Maria, 34",
    age: 34,
    region: "MT-TL1 (MELAS m.3243A>G)",
    heteroplasmy: 0.78,
    duration: 120,
    doses: [
      { time: 0, amount: 1.5 },
      { time: 24, amount: 1.5 },
      { time: 48, amount: 1.5 },
      { time: 72, amount: 1.5 },
      { time: 96, amount: 1.5 },
    ],
    vitals: "Recurrent stroke-like episodes · elevated lactate",
    accent: "#fb7185",
  },
  {
    id: "B",
    name: "Patient B · Devon, 22",
    age: 22,
    region: "MT-ND4 (LHON m.11778G>A)",
    heteroplasmy: 0.92,
    duration: 168,
    doses: [
      { time: 0, amount: 2.0 },
      { time: 36, amount: 2.0 },
      { time: 72, amount: 2.0 },
      { time: 108, amount: 1.5 },
    ],
    vitals: "Bilateral optic neuropathy · 6 mo onset",
    accent: "#fbbf24",
  },
  {
    id: "C",
    name: "Patient C · Lena, 51",
    age: 51,
    region: "MT-ATP6 (NARP m.8993T>G)",
    heteroplasmy: 0.65,
    duration: 96,
    doses: [
      { time: 0, amount: 1.2 },
      { time: 24, amount: 1.2 },
      { time: 48, amount: 1.2 },
    ],
    vitals: "Peripheral neuropathy · ataxia · retinitis pigmentosa",
    accent: "#a78bfa",
  },
];

export function PatientCards() {
  const { setSelectedRegion, setHeteroplasmy, setDuration, setDoses } = useApp();

  function apply(p: Patient) {
    setSelectedRegion(p.region);
    setHeteroplasmy(p.heteroplasmy);
    setDuration(p.duration);
    setDoses(p.doses);
  }

  return (
    <section className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-[var(--accent-2)]" />
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--accent-2)]">
          Virtual patient cohort
        </h2>
        <span className="text-[10px] text-[var(--fg-dim)]">— one click loads region, heteroplasmy, dosing</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PATIENTS.map((p) => (
          <button
            key={p.id}
            onClick={() => apply(p)}
            className="panel-tight p-3 text-left transition-all hover:scale-[1.02] hover:shadow-lg hover:border-[var(--accent-2)]/60 cursor-pointer"
            style={{ borderTop: `2px solid ${p.accent}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs mono text-[var(--fg-dim)]">{p.id}</span>
              <span className="chip" style={{ background: `${p.accent}22`, borderColor: `${p.accent}44`, color: p.accent }}>
                <Activity className="w-3 h-3" />
                {(p.heteroplasmy * 100).toFixed(0)}% het
              </span>
            </div>
            <div className="text-sm font-semibold mt-1 text-[var(--fg)]">{p.name}</div>
            <div className="text-[11px] mono text-[var(--accent)] mt-0.5">{p.region}</div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1 leading-relaxed">{p.vitals}</div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-2">
              {p.doses.length} doses · {p.duration}h sim
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
