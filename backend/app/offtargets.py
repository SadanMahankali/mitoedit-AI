"""Genome-wide off-target prediction for the human mitochondrial genome.

For a given pegRNA spacer, we scan the full 16,569 bp mtDNA (rCRS) for
sequences with ≤4 mismatches against the spacer, and score each hit using
a position-weighted CFD-style penalty (mismatches closer to the PAM are
weighted more heavily — based on Hsu et al, Nat Biotech 2013).

For the hackathon we use a synthetic but realistic mtDNA scaffold built
by repeating the embedded loci with random buffer. In a production deploy
this would load NC_012920.1.

Returns a list of `{position, score, mismatches, gene, strand}` entries
suitable for plotting on a circular Circos-style genome map.
"""
from __future__ import annotations

import random
from dataclasses import dataclass

from .sequences import MT_REGIONS, reverse_complement


MITO_GENOME_LEN = 16569

# Major mtDNA gene boundaries (rCRS positions, 1-indexed, simplified)
MT_GENES = [
    ("D-loop",    1,     576,  "#64748b"),
    ("MT-TF",     577,   647,  "#fda4af"),
    ("MT-RNR1",   648,   1601, "#fdba74"),
    ("MT-TV",     1602,  1670, "#fde047"),
    ("MT-RNR2",   1671,  3229, "#bef264"),
    ("MT-TL1",    3230,  3304, "#5eead4"),
    ("MT-ND1",    3307,  4262, "#67e8f9"),
    ("MT-TI",     4263,  4331, "#a78bfa"),
    ("MT-TQ",     4329,  4400, "#a78bfa"),
    ("MT-TM",     4402,  4469, "#a78bfa"),
    ("MT-ND2",    4470,  5511, "#67e8f9"),
    ("MT-TW",     5512,  5579, "#f0abfc"),
    ("MT-CO1",    5904,  7445, "#22d3ee"),
    ("MT-CO2",    7586,  8269, "#22d3ee"),
    ("MT-ATP8",   8366,  8572, "#f472b6"),
    ("MT-ATP6",   8527,  9207, "#f472b6"),
    ("MT-CO3",    9207,  9990, "#22d3ee"),
    ("MT-TG",     9991,  10058, "#a78bfa"),
    ("MT-ND3",    10059, 10404, "#67e8f9"),
    ("MT-ND4L",   10470, 10766, "#67e8f9"),
    ("MT-ND4",    10760, 12137, "#67e8f9"),
    ("MT-ND5",    12337, 14148, "#67e8f9"),
    ("MT-ND6",    14149, 14673, "#67e8f9"),
    ("MT-TE",     14674, 14742, "#a78bfa"),
    ("MT-CYB",    14747, 15887, "#fb7185"),
    ("MT-TT",     15888, 15953, "#a78bfa"),
    ("MT-TP",     15956, 16023, "#a78bfa"),
    ("D-loop (end)", 16024, 16569, "#64748b"),
]


@dataclass
class OffTargetHit:
    position: int
    strand: str             # '+' or '-'
    mismatches: int
    score: float            # 0..1, higher = more concerning
    gene: str               # gene name at this position
    on_target: bool


def gene_at(pos: int) -> str:
    for name, lo, hi, _ in MT_GENES:
        if lo <= pos <= hi:
            return name
    return "intergenic"


def _build_genome(seed: int = 17) -> str:
    """Synthetic but stable mtDNA scaffold; embeds the known pathogenic loci
    in the correct positions so on-target hits land where they should.
    """
    rng = random.Random(seed)
    BASES = "ACGT"
    seq = [rng.choice(BASES) for _ in range(MITO_GENOME_LEN)]
    for name, region in MT_REGIONS.items():
        start = region["start"]
        ref = region["ref"]
        for i, b in enumerate(ref):
            if 0 <= start - 1 + i < MITO_GENOME_LEN:
                seq[start - 1 + i] = b
    return "".join(seq)


_GENOME: str | None = None
def get_genome() -> str:
    global _GENOME
    if _GENOME is None:
        _GENOME = _build_genome()
    return _GENOME


def _mismatch_score(spacer: str, candidate: str) -> tuple[int, float]:
    """CFD-style position-weighted mismatch score.

    Spacer is oriented 5'→3'. PAM-proximal positions (the 3' end / seed)
    are weighted ~3× more than distal positions, following Doench/Hsu.
    Returns (mismatch_count, score in 0..1 where higher = more concerning).
    """
    if len(spacer) != len(candidate):
        return (len(spacer), 0.0)
    L = len(spacer)
    total_weight = 0.0
    matched_weight = 0.0
    mm = 0
    for i, (a, b) in enumerate(zip(spacer.upper(), candidate.upper())):
        # Weight ramps from 0.3 (distal) to 1.0 (PAM-proximal)
        w = 0.3 + 0.7 * (i / max(1, L - 1))
        total_weight += w
        if a == b:
            matched_weight += w
        else:
            mm += 1
    # Higher score = more match = bigger off-target concern
    return mm, matched_weight / total_weight


def scan_offtargets(spacer: str, max_mismatches: int = 4, top_n: int = 60) -> list[OffTargetHit]:
    """Scan whole mtDNA for partial matches to the spacer."""
    genome = get_genome()
    L = len(spacer)
    spacer_u = spacer.upper()
    spacer_rc = reverse_complement(spacer_u)
    hits: list[OffTargetHit] = []
    for strand, query in [("+", spacer_u), ("-", spacer_rc)]:
        for i in range(MITO_GENOME_LEN - L + 1):
            window = genome[i : i + L]
            mm, score = _mismatch_score(query, window)
            if mm <= max_mismatches and score > 0.45:
                hits.append(OffTargetHit(
                    position=i + 1,
                    strand=strand,
                    mismatches=mm,
                    score=score,
                    gene=gene_at(i + 1),
                    on_target=(mm == 0),
                ))
    # Sort by score descending and trim
    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[:top_n]


def genome_summary() -> dict:
    return {
        "length_bp": MITO_GENOME_LEN,
        "genes": [
            {"name": n, "start": lo, "end": hi, "color": col}
            for n, lo, hi, col in MT_GENES
        ],
    }
