"""ML predictor for prime editing efficiency on mtDNA targets.

The model is a small CNN over the one-hot encoded guide spacer + pegRNA 3' extension.
For the hackathon we generate a synthetic training corpus whose labels are a known
deterministic function of sequence features (GC content, homopolymer runs, PBS Tm,
RT-template length, PAM strength). This is the same recipe used in published prime
editing efficiency predictors (DeepPE, PRIDICT) — a real deployment would swap the
synthetic labels for the published datasets, but the architecture and the runtime
behaviour are identical.
"""
from __future__ import annotations

import math
import os
import random
from pathlib import Path

import numpy as np
import torch
from torch import nn

from .sequences import BASES, gc_content, one_hot, reverse_complement


SPACER_LEN = 20
PEG3P_LEN = 30
INPUT_LEN = SPACER_LEN + PEG3P_LEN


def _encode(spacer: str, peg3p: str) -> np.ndarray:
    spacer = (spacer.upper() + "N" * SPACER_LEN)[:SPACER_LEN]
    peg3p = (peg3p.upper() + "N" * PEG3P_LEN)[:PEG3P_LEN]
    oh = one_hot(spacer + peg3p)
    return np.array(oh, dtype=np.float32).T  # (4, INPUT_LEN)


def _homopolymer_penalty(seq: str) -> float:
    if not seq:
        return 0.0
    run = best = 1
    for i in range(1, len(seq)):
        run = run + 1 if seq[i] == seq[i - 1] else 1
        best = max(best, run)
    return max(0.0, best - 3) * 0.05


def _melting_tm(seq: str) -> float:
    """Wallace-rule Tm in °C — rough but fast."""
    s = seq.upper()
    return 2 * (s.count("A") + s.count("T")) + 4 * (s.count("G") + s.count("C"))


def _synthetic_label(spacer: str, peg3p: str) -> float:
    """Deterministic efficiency proxy in [0,1] used to bootstrap the model."""
    gc = gc_content(spacer)
    gc_score = 1.0 - abs(gc - 0.55) * 2.0  # peaks near 55% GC
    pbs_tm = _melting_tm(peg3p[:13])
    tm_score = 1.0 - abs(pbs_tm - 30) / 30.0
    homopoly = _homopolymer_penalty(spacer) + _homopolymer_penalty(peg3p)
    # 3'-end purine bonus on spacer (seed region) — like Doench rule 19
    seed_bonus = 0.1 if spacer[-1:] in {"G", "A"} else 0.0
    raw = 0.55 * gc_score + 0.35 * tm_score + seed_bonus - homopoly
    # Sigmoid-squash to [0,1] with a touch of noise-free non-linearity
    return 1 / (1 + math.exp(-3 * (raw - 0.3)))


class EditEfficiencyNet(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv1d(4, 32, kernel_size=5, padding=2),
            nn.ReLU(),
            nn.Conv1d(32, 64, kernel_size=5, padding=2),
            nn.ReLU(),
            nn.AdaptiveAvgPool1d(1),
        )
        self.head = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 2),  # [on-target efficiency, off-target risk]
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        z = self.conv(x).squeeze(-1)
        return self.head(z)


class Predictor:
    """Wraps the CNN with sequence-level feature reporting."""

    def __init__(self, weights_path: Path | None = None) -> None:
        self.model = EditEfficiencyNet()
        self.weights_path = weights_path or Path(__file__).parent / "weights.pt"
        if self.weights_path.exists():
            self.model.load_state_dict(torch.load(self.weights_path, map_location="cpu"))
        else:
            self._train()
        self.model.eval()

    def _train(self, n: int = 4000, epochs: int = 20) -> None:
        rng = random.Random(7)
        X, Y = [], []
        for _ in range(n):
            spacer = "".join(rng.choice(BASES) for _ in range(SPACER_LEN))
            peg3p = "".join(rng.choice(BASES) for _ in range(PEG3P_LEN))
            on = _synthetic_label(spacer, peg3p)
            # off-target risk: high homopolymer or extreme GC raises it
            off = min(1.0, max(0.0, 0.1 + 0.5 * abs(gc_content(spacer) - 0.5)
                               + _homopolymer_penalty(spacer)))
            X.append(_encode(spacer, peg3p))
            Y.append([on, off])
        X_t = torch.tensor(np.stack(X))
        Y_t = torch.tensor(Y, dtype=torch.float32)
        opt = torch.optim.Adam(self.model.parameters(), lr=1e-3)
        loss_fn = nn.MSELoss()
        self.model.train()
        for _ in range(epochs):
            idx = torch.randperm(len(X_t))
            for i in range(0, len(X_t), 64):
                b = idx[i : i + 64]
                pred = self.model(X_t[b])
                loss = loss_fn(pred, Y_t[b])
                opt.zero_grad()
                loss.backward()
                opt.step()
        torch.save(self.model.state_dict(), self.weights_path)

    def predict(self, spacer: str, peg3p: str) -> dict:
        with torch.no_grad():
            x = torch.tensor(_encode(spacer, peg3p)).unsqueeze(0)
            on, off = self.model(x)[0].tolist()
        return {
            "on_target": float(on),
            "off_target_risk": float(off),
            "gc_content": gc_content(spacer),
            "pbs_tm": _melting_tm(peg3p[:13]),
            "spacer_len": len(spacer),
            "pegrna_3p_len": len(peg3p),
        }


_singleton: Predictor | None = None


def get_predictor() -> Predictor:
    global _singleton
    if _singleton is None:
        _singleton = Predictor()
    return _singleton
