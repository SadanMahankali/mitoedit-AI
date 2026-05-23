"""Heteroplasmy dynamics simulator.

ODE state vector:
    D(t)  – intracellular doxycycline concentration (a.u.)
    M(t)  – mRNA encoding CRISPR/pegRNA cassette
    P(t)  – mature ribonucleoprotein in cytosol with MTS+PNPase tag
    I(t)  – RNP imported through PNPase channel into mitochondrial matrix
    H(t)  – heteroplasmy fraction = edited mtDNA / total mtDNA  ∈ [0,1]

Governing equations:
    dD/dt = u(t) - k_deg_d * D
    dM/dt = V_max * D^n / (K_d^n + D^n) - k_deg_m * M           (Hill-induced transcription)
    dP/dt = k_tl * M - k_imp * P                                (translation, then import)
    dI/dt = k_imp * P - k_deg_i * I
    dH/dt = k_edit * eff * I * (1 - H) - k_rev * H              (turnover + dilution by replication)

`u(t)` is the dox dosing waveform (programmable). `eff` is the ML-predicted
on-target efficiency from `predictor.py` and modulates the effective edit rate.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import numpy as np
from scipy.integrate import solve_ivp


@dataclass
class SimParams:
    # Pharmacokinetics
    k_deg_d: float = 0.35     # 1/h dox clearance (half-life ~2h intracellular)
    # Transcription (Hill induction by dox)
    V_max: float = 1.8        # max transcription rate
    K_d: float = 0.6          # dox half-max (µg/mL equivalent)
    hill_n: float = 2.0
    k_deg_m: float = 0.5      # mRNA decay
    # Translation / processing
    k_tl: float = 1.1
    # PNPase-mediated mitochondrial import
    k_imp: float = 0.7
    k_deg_i: float = 0.2
    # Editing kinetics
    k_edit: float = 0.45      # baseline edit rate constant
    k_rev: float = 0.02       # reversion / dilution by WT replication
    # Cell viability proxy
    tox_k: float = 0.04       # toxicity accumulates with dox AUC


@dataclass
class DoseEvent:
    time: float       # hours
    amount: float     # bolus magnitude (a.u.)


@dataclass
class SimRequest:
    duration_h: float = 96.0
    dt: float = 0.5
    doses: list[DoseEvent] = field(default_factory=list)
    efficiency: float = 0.6     # from ML predictor
    off_target: float = 0.1     # from ML predictor
    initial_heteroplasmy: float = 0.8
    params: SimParams = field(default_factory=SimParams)


def _dose_function(doses: list[DoseEvent]) -> Callable[[float], float]:
    """Sum of narrow Gaussian boluses — smooth so the ODE solver is happy."""
    times = np.array([d.time for d in doses])
    amps = np.array([d.amount for d in doses])
    sigma = 0.25

    def u(t: float) -> float:
        if len(times) == 0:
            return 0.0
        return float(np.sum(amps * np.exp(-((t - times) ** 2) / (2 * sigma ** 2)) / (sigma * np.sqrt(2 * np.pi))))

    return u


def simulate(req: SimRequest) -> dict:
    p = req.params
    u = _dose_function(req.doses)

    def rhs(t: float, y: np.ndarray) -> list[float]:
        D, M, P, I_, H, AUC = y
        dD = u(t) - p.k_deg_d * D
        induction = p.V_max * (D ** p.hill_n) / (p.K_d ** p.hill_n + D ** p.hill_n + 1e-9)
        dM = induction - p.k_deg_m * M
        dP = p.k_tl * M - p.k_imp * P
        dI = p.k_imp * P - p.k_deg_i * I_
        edit_drive = p.k_edit * req.efficiency * I_
        dH = edit_drive * (1 - H) - p.k_rev * H
        dAUC = D
        return [dD, dM, dP, dI, dH, dAUC]

    y0 = [0.0, 0.0, 0.0, 0.0, 1.0 - req.initial_heteroplasmy, 0.0]
    # We model H here as the *edited* fraction. initial_heteroplasmy is the WT-pathogenic
    # load that we want to reduce — so we start with edited fraction = 1 - heteroplasmy_wt.
    # Wait: the user's framing is "heteroplasmy = pathogenic fraction." Reset:
    y0[4] = 0.0  # start with zero edited fraction
    t_eval = np.arange(0.0, req.duration_h + req.dt, req.dt)
    sol = solve_ivp(rhs, (0.0, req.duration_h), y0, t_eval=t_eval, method="RK45",
                    rtol=1e-6, atol=1e-8, max_step=0.5)

    D, M, P, I_, H_edited, AUC = sol.y
    # Convert edited fraction → remaining pathogenic heteroplasmy
    H_path = req.initial_heteroplasmy * (1.0 - H_edited)
    toxicity = 1.0 - np.exp(-p.tox_k * AUC) * (1 - 0.1 * req.off_target)
    toxicity = np.clip(toxicity, 0.0, 1.0)

    return {
        "t": sol.t.tolist(),
        "dox": D.tolist(),
        "mrna": M.tolist(),
        "rnp_cyto": P.tolist(),
        "rnp_mito": I_.tolist(),
        "edited_fraction": H_edited.tolist(),
        "pathogenic_heteroplasmy": H_path.tolist(),
        "toxicity": toxicity.tolist(),
        "dox_auc": float(AUC[-1]),
        "final_edited": float(H_edited[-1]),
        "final_pathogenic": float(H_path[-1]),
        "therapeutic_threshold_h": _first_below(H_path, sol.t, 0.6 * req.initial_heteroplasmy),
    }


def _first_below(arr: np.ndarray, t: np.ndarray, target: float) -> float | None:
    """Time at which the trace first drops below `target` (the 60% rescue mark)."""
    below = np.where(arr <= target)[0]
    return float(t[below[0]]) if len(below) else None
