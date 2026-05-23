"""Sequence utilities for guide RNA / pegRNA / mtDNA analysis.

We work with the human mitochondrial genome (rCRS, NC_012920.1) — 16,569 bp circular.
We expose a synthetic reference and a few well-known pathogenic loci so the demo
can highlight a real therapeutic target (e.g. MELAS m.3243A>G).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


BASES = "ACGT"


# A small representative window of the mtDNA reference for the demo.
# In a production build we'd ship the full 16,569bp rCRS — for the hackathon we
# embed several well-characterised loci surrounding common pathogenic variants.
MT_REGIONS: dict[str, dict] = {
    "MT-TL1 (MELAS m.3243A>G)": {
        "start": 3230,
        "ref": "AACCAACCTGGTACCCTAACTGGGGGGGGTTTTGCAGCCCTAGGTAGAGGTTAAAATTCGAGCC",
        "pathogenic_pos": 13,  # zero-indexed within window (m.3243)
        "wt": "A",
        "edit": "G",
        "disease": "MELAS syndrome",
    },
    "MT-ATP6 (NARP m.8993T>G)": {
        "start": 8980,
        "ref": "ATGAACGAAAATCTGTTCGCTTCATTCATTGCCCCCACAATCCTAGGCCTACCCGCCGCAGTACTG",
        "pathogenic_pos": 13,
        "wt": "T",
        "edit": "G",
        "disease": "NARP / Leigh syndrome",
    },
    "MT-ND1 (LHON m.3460G>A)": {
        "start": 3450,
        "ref": "GACATCTGGACCAACCTGCCCCCTACTAGTCAACATACTACGCAAAGGCCCCAACGTTGTAGGCC",
        "pathogenic_pos": 10,
        "wt": "G",
        "edit": "A",
        "disease": "Leber's hereditary optic neuropathy",
    },
    "MT-ND4 (LHON m.11778G>A)": {
        "start": 11770,
        "ref": "TCCCCTTAGGAATAACTCGCCTGCATAATAACCTACTACTACTAACAGGTTCAGAACGAATCCT",
        "pathogenic_pos": 8,
        "wt": "G",
        "edit": "A",
        "disease": "Leber's hereditary optic neuropathy",
    },
}


@dataclass
class GuideDesign:
    spacer: str          # 20nt guide RNA spacer
    pam: str             # 3nt PAM (NGG for SpCas9; we allow generic NNN for prime editor)
    pegrna_3p: str       # 3' extension of pegRNA: PBS + RT template encoding the edit
    target_locus: str
    edit_position: int   # absolute mtDNA position (1-indexed for display)


def one_hot(seq: str) -> list[list[int]]:
    """One-hot encode A/C/G/T → 4-channel matrix (unknown bases zeroed)."""
    table = {b: i for i, b in enumerate(BASES)}
    out = []
    for ch in seq.upper():
        row = [0, 0, 0, 0]
        idx = table.get(ch)
        if idx is not None:
            row[idx] = 1
        out.append(row)
    return out


def gc_content(seq: str) -> float:
    s = seq.upper()
    if not s:
        return 0.0
    return (s.count("G") + s.count("C")) / len(s)


def reverse_complement(seq: str) -> str:
    comp = {"A": "T", "T": "A", "C": "G", "G": "C", "N": "N"}
    return "".join(comp.get(b, "N") for b in reversed(seq.upper()))


def kmer_counts(seq: str, k: int = 3) -> dict[str, int]:
    counts: dict[str, int] = {}
    s = seq.upper()
    for i in range(len(s) - k + 1):
        kmer = s[i : i + k]
        if all(c in BASES for c in kmer):
            counts[kmer] = counts.get(kmer, 0) + 1
    return counts


def design_pegrna(region_name: str) -> GuideDesign:
    """Auto-design a pegRNA targeting the pathogenic site in a region."""
    region = MT_REGIONS[region_name]
    ref = region["ref"]
    p = region["pathogenic_pos"]
    spacer = ref[max(0, p - 17) : p + 3]  # 20nt around the site
    pam = ref[p + 3 : p + 6] if p + 6 <= len(ref) else "NGG"
    # Construct a simple 3' pegRNA extension: 13nt PBS + 17nt RT template carrying the edit
    pbs = reverse_complement(ref[max(0, p - 13) : p])
    rt_template_ref = ref[p : p + 17]
    rt_template_edit = region["edit"] + rt_template_ref[1:]
    pegrna_3p = reverse_complement(pbs + rt_template_edit)
    return GuideDesign(
        spacer=spacer,
        pam=pam,
        pegrna_3p=pegrna_3p,
        target_locus=region_name,
        edit_position=region["start"] + p,
    )


def list_regions() -> list[dict]:
    return [
        {
            "name": name,
            "disease": data["disease"],
            "position": data["start"] + data["pathogenic_pos"],
            "wt": data["wt"],
            "edit": data["edit"],
        }
        for name, data in MT_REGIONS.items()
    ]
