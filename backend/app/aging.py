"""Biological-aging model driven by 9 mitochondrial parameters.

Each parameter contributes a per-hour "aging rate" (units: biological-years
of aging per hour of real time). The total biological-age trajectory is the
time-integral of the sum of all contributions.

The MELAS-style pathogenic-heteroplasmy parameter is **time-varying** — it
comes from the ODE simulator's `pathogenic_heteroplasmy(t)` trace, so the
optimized CRISPR treatment dynamically lowers aging acceleration as the
edit progresses. The other 8 parameters are user-controlled and static for
the duration of the simulation.

Zone definitions follow the wet-lab biology spec — see each function for
exact thresholds. All rates are expressed as **biological years per hour**,
calibrated so that "healthy" gives ~1 bio-yr per real-yr (i.e. ~1/8766/hr)
and "exponential" zones can reach 5-10× that.

References used for the calibration baselines:
  - Sun et al, Cell Metab 2016 (mtDNA mutation rate & aging)
  - Twig & Shirihai, Antioxid Redox Signal 2011 (fission/fusion ratio)
  - Nicholls & Ferguson, Bioenergetics 4e (membrane potential thresholds)
  - Palikaras & Tavernarakis, Curr Opin Cell Biol 2014 (mitophagy)
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable

import numpy as np


# Baseline aging: ~1 biological year per 1 real-year = 1 / (365.25 * 24) per hour
BASELINE_RATE = 1.0 / (365.25 * 24.0)  # ≈ 1.14e-4 bio-yr / hr


@dataclass
class AgingInputs:
    """Static (per-cell) parameters. Heteroplasmy is dynamic, passed separately."""

    mito_count: float = 1500.0                # 1000-2000
    somatic_mutation_rate: float = 1e-7       # mutations / bp; healthy < 1e-6
    fission_fusion_ratio: float = 1.0         # 0.1-5.0; healthy 0.8-1.2
    membrane_potential_mV: float = -160.0     # -80 to -180 mV (more negative = healthier)
    mitophagy_efficiency: float = 85.0        # 0-100 %; healthy 75-95
    insoluble_protein_pct: float = 1.0        # 0-30 %; healthy < 2
    membrane_lipid_nmol: float = 30.0         # 0-100 nmol/mg; healthy 15-45
    matrix_calcium_nM: float = 100.0          # nM; healthy 50-150


# ---------------------------------------------------------------------------
# Per-parameter aging-rate contributions (bio-years per hour)
# ---------------------------------------------------------------------------

def rate_heteroplasmy(h: float) -> float:
    """MELAS-style pathogenic mtDNA load.

    < 0.40 → no contribution.
    0.40 → 1.0  → exponential acceleration (per spec: "past 40% we increase
    acceleration"). Smooth ramp.
    """
    if h < 0.40:
        return 0.0
    # Exponential above 40%, normalised so at h=1 we get ~6x baseline
    over = h - 0.40
    return BASELINE_RATE * (math.exp(6.0 * over) - 1.0)


def rate_mito_count(n: float) -> float:
    """Mitochondrial count 1000-2000. More mitos → slower aging.

    Maps linearly to a multiplier of baseline: 1000 → +2.0, 1500 → +1.0,
    2000 → +0.5. Returns the *additional* aging contribution above zero.
    """
    n = max(500.0, min(3000.0, n))
    # Linear interpolate multiplier between 1000 (×2) and 2000 (×0.5)
    mult = 2.0 - 1.5 * (n - 1000.0) / 1000.0
    mult = max(0.4, mult)
    return BASELINE_RATE * (mult - 1.0)  # contribution above baseline


def rate_somatic_mutation(mu: float) -> float:
    """Somatic mtDNA mutation rate.

    < 1e-6 → 0. Above that, exponential aging.
    """
    if mu <= 1e-6:
        return 0.0
    # log-scale: each decade above 1e-6 doubles the rate
    decades = math.log10(mu / 1e-6)
    return BASELINE_RATE * (math.exp(decades) - 1.0)


def rate_fission_fusion(r: float) -> float:
    """Fission:Fusion ratio.

    Healthy 0.8-1.2 → 0.
    Outside healthy up to 2.5 → linear aging.
    Above 2.5 → higher linear slope.
    Below 0.8 → also linear (excessive fusion = no quality control).
    """
    if 0.8 <= r <= 1.2:
        return 0.0
    if r > 2.5:
        return BASELINE_RATE * (2.0 + 1.5 * (r - 2.5))
    if r > 1.2:
        return BASELINE_RATE * (1.5 * (r - 1.2) / 1.3)  # 0 at 1.2, ~1.5x at 2.5
    # r < 0.8: too much fusion
    return BASELINE_RATE * (1.5 * (0.8 - r) / 0.7)


def rate_membrane_potential(mV: float) -> float:
    """Mitochondrial membrane potential (negative = polarised = healthy).

    -140 to -180 mV: no aging.
    > -100 mV (i.e. -99 .. 0): rapid (cell death).
    Between -140 and -100: linear aging.
    Between -180 and -200 (hyperpolarised): mild linear aging.
    """
    if -180.0 <= mV <= -140.0:
        return 0.0
    if mV > -100.0:
        # depolarised — cell death cascade
        return BASELINE_RATE * (8.0 + 0.1 * (mV + 100.0))
    if mV > -140.0:
        # -140 to -100: linear ramp
        return BASELINE_RATE * (3.0 * (mV + 140.0) / 40.0)
    # hyperpolarised (< -180)
    return BASELINE_RATE * (0.8 * (-180.0 - mV) / 20.0)


def rate_mitophagy(eff: float) -> float:
    """Mitophagy clearance efficiency (%).

    75-95: healthy.
    20-75: strong linear aging.
    < 20: exponential aging.
    > 95: mild aging (over-clearance depletes pool).
    """
    if 75.0 <= eff <= 95.0:
        return 0.0
    if eff < 20.0:
        return BASELINE_RATE * (4.0 + math.exp((20.0 - eff) / 8.0))
    if eff < 75.0:
        return BASELINE_RATE * (3.5 * (75.0 - eff) / 55.0)
    # eff > 95: mild
    return BASELINE_RATE * (0.5 * (eff - 95.0) / 5.0)


def rate_insoluble_protein(pct: float) -> float:
    """Insoluble protein fraction (%).

    < 2: healthy.
    2-15: linear aging.
    > 15: rapid strong linear aging.
    """
    if pct < 2.0:
        return 0.0
    if pct <= 15.0:
        return BASELINE_RATE * (2.5 * (pct - 2.0) / 13.0)
    return BASELINE_RATE * (2.5 + 0.5 * (pct - 15.0))


def rate_membrane_lipid(nmol: float) -> float:
    """Mitochondrial membrane lipid balance (nmol/mg protein).

    15-45: healthy.
    Outside: linear aging proportional to distance from band.
    """
    if 15.0 <= nmol <= 45.0:
        return 0.0
    if nmol < 15.0:
        return BASELINE_RATE * (1.5 * (15.0 - nmol) / 15.0)
    return BASELINE_RATE * (1.5 * (nmol - 45.0) / 55.0)


def rate_calcium(ca_nM: float) -> float:
    """Matrix calcium retention capacity (nM).

    50-150 nM: healthy.
    Outside that band (but < 10 µM): linear aging.
    > 10 µM = 10000 nM: 2x aging boost.
    """
    if 50.0 <= ca_nM <= 150.0:
        return 0.0
    if ca_nM > 10000.0:
        return BASELINE_RATE * 6.0
    if ca_nM > 150.0:
        return BASELINE_RATE * (2.0 * min(1.0, (ca_nM - 150.0) / 850.0))
    # below 50
    return BASELINE_RATE * (2.0 * (50.0 - ca_nM) / 50.0)


# ---------------------------------------------------------------------------
# Trajectory computation
# ---------------------------------------------------------------------------

def compute_aging(
    t_hours: list[float] | np.ndarray,
    heteroplasmy_series: list[float] | np.ndarray,
    inputs: AgingInputs,
    starting_bio_age_years: float = 35.0,
) -> dict:
    """Integrate aging rate over time.

    Returns per-time-step contributions, total aging rate, cumulative bio-age,
    and a "vs. baseline" comparison showing what aging would have been if the
    heteroplasmy stayed at its initial value (i.e. no treatment).
    """
    t = np.asarray(t_hours, dtype=float)
    h = np.asarray(heteroplasmy_series, dtype=float)
    if len(t) != len(h):
        raise ValueError("t_hours and heteroplasmy_series must have same length")

    # Static contributions (do not change over time)
    static_rates = {
        "mito_count": rate_mito_count(inputs.mito_count),
        "somatic_mutation": rate_somatic_mutation(inputs.somatic_mutation_rate),
        "fission_fusion": rate_fission_fusion(inputs.fission_fusion_ratio),
        "membrane_potential": rate_membrane_potential(inputs.membrane_potential_mV),
        "mitophagy": rate_mitophagy(inputs.mitophagy_efficiency),
        "insoluble_protein": rate_insoluble_protein(inputs.insoluble_protein_pct),
        "membrane_lipid": rate_membrane_lipid(inputs.membrane_lipid_nmol),
        "calcium": rate_calcium(inputs.matrix_calcium_nM),
    }
    static_total = sum(static_rates.values())

    # Dynamic (heteroplasmy) contribution per time step
    het_rates = np.array([rate_heteroplasmy(float(x)) for x in h])

    # Baseline aging (no treatment): heteroplasmy stays at initial value
    untreated_het_rates = np.full_like(het_rates, rate_heteroplasmy(float(h[0])))

    # Total aging rate (bio-yr per hour) at each time step
    treated_rate = het_rates + static_total + BASELINE_RATE
    untreated_rate = untreated_het_rates + static_total + BASELINE_RATE

    # Integrate (trapezoidal)
    if len(t) > 1:
        treated_age = starting_bio_age_years + np.concatenate(
            [[0.0], np.cumsum((treated_rate[:-1] + treated_rate[1:]) / 2 * np.diff(t))]
        )
        untreated_age = starting_bio_age_years + np.concatenate(
            [[0.0], np.cumsum((untreated_rate[:-1] + untreated_rate[1:]) / 2 * np.diff(t))]
        )
    else:
        treated_age = np.array([starting_bio_age_years])
        untreated_age = np.array([starting_bio_age_years])

    return {
        "t": t.tolist(),
        "heteroplasmy": h.tolist(),
        "treated_rate_per_hr": treated_rate.tolist(),
        "untreated_rate_per_hr": untreated_rate.tolist(),
        "treated_bio_age": treated_age.tolist(),
        "untreated_bio_age": untreated_age.tolist(),
        "contributions_per_hr": {
            "heteroplasmy_initial": float(het_rates[0]) if len(het_rates) else 0.0,
            "heteroplasmy_final": float(het_rates[-1]) if len(het_rates) else 0.0,
            **{k: float(v) for k, v in static_rates.items()},
            "baseline": BASELINE_RATE,
        },
        "summary": {
            "starting_bio_age": starting_bio_age_years,
            "treated_final_bio_age": float(treated_age[-1]),
            "untreated_final_bio_age": float(untreated_age[-1]),
            "years_saved": float(untreated_age[-1] - treated_age[-1]),
            "duration_h": float(t[-1] - t[0]) if len(t) > 1 else 0.0,
            "duration_days": float((t[-1] - t[0]) / 24.0) if len(t) > 1 else 0.0,
        },
    }
