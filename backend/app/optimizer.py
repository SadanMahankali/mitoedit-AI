"""Bayesian dosing optimizer.

Optuna TPE search over (n_doses, interval_h, bolus_amount) to minimise

    J = α * (final_pathogenic_heteroplasmy) + β * (toxicity_AUC) + γ * (time_to_threshold)

Returns the best schedule plus the full Pareto-ish trial history so the UI can
draw a search-progress chart.
"""
from __future__ import annotations

from dataclasses import dataclass

import optuna

from .simulator import DoseEvent, SimParams, SimRequest, simulate

optuna.logging.set_verbosity(optuna.logging.WARNING)


@dataclass
class OptRequest:
    duration_h: float = 96.0
    efficiency: float = 0.6
    off_target: float = 0.1
    initial_heteroplasmy: float = 0.8
    n_trials: int = 60
    alpha: float = 1.0   # weight on residual pathogenic load
    beta: float = 0.03   # weight on dox AUC (toxicity proxy)
    gamma: float = 0.005 # weight on time-to-rescue


def optimize(req: OptRequest) -> dict:
    history: list[dict] = []

    def objective(trial: optuna.Trial) -> float:
        n_doses = trial.suggest_int("n_doses", 1, 6)
        interval = trial.suggest_float("interval_h", 4.0, 24.0)
        amount = trial.suggest_float("bolus_amount", 0.4, 3.0)
        start = trial.suggest_float("start_h", 0.0, 6.0)
        doses = [DoseEvent(time=start + i * interval, amount=amount) for i in range(n_doses)]
        sim = simulate(SimRequest(
            duration_h=req.duration_h,
            doses=doses,
            efficiency=req.efficiency,
            off_target=req.off_target,
            initial_heteroplasmy=req.initial_heteroplasmy,
            params=SimParams(),
        ))
        rescue_t = sim["therapeutic_threshold_h"] or req.duration_h
        j = (
            req.alpha * sim["final_pathogenic"]
            + req.beta * sim["dox_auc"]
            + req.gamma * rescue_t
        )
        history.append({
            "trial": trial.number,
            "n_doses": n_doses,
            "interval_h": interval,
            "bolus": amount,
            "start_h": start,
            "final_pathogenic": sim["final_pathogenic"],
            "dox_auc": sim["dox_auc"],
            "rescue_h": rescue_t,
            "objective": j,
        })
        return j

    sampler = optuna.samplers.TPESampler(seed=42)
    study = optuna.create_study(direction="minimize", sampler=sampler)
    study.optimize(objective, n_trials=req.n_trials, show_progress_bar=False)

    best = study.best_params
    best_doses = [
        DoseEvent(time=best["start_h"] + i * best["interval_h"], amount=best["bolus_amount"])
        for i in range(best["n_doses"])
    ]
    best_sim = simulate(SimRequest(
        duration_h=req.duration_h,
        doses=best_doses,
        efficiency=req.efficiency,
        off_target=req.off_target,
        initial_heteroplasmy=req.initial_heteroplasmy,
    ))
    return {
        "best_params": best,
        "best_value": float(study.best_value),
        "best_simulation": best_sim,
        "best_doses": [{"time": d.time, "amount": d.amount} for d in best_doses],
        "history": history,
    }
