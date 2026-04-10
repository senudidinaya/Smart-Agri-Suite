"""
Evaluation rubric for Groq-generated explanations and questions.

Defines the quality dimensions and scoring levels used by the evaluation
runner to assess LLM outputs.  Scores use a 1-5 integer scale.

This module is intentionally kept free of I/O so it can be imported in
tests and scripts without side-effects.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


# ---------------------------------------------------------------------------
# Score levels
# ---------------------------------------------------------------------------

SCORE_LABELS: Dict[int, str] = {
    1: "fail",
    2: "poor",
    3: "acceptable",
    4: "good",
    5: "excellent",
}


def label_for(score: int) -> str:
    return SCORE_LABELS.get(score, "unknown")


# ---------------------------------------------------------------------------
# Rubric dimensions
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Dimension:
    """A single evaluation dimension."""
    name: str
    description: str
    applies_to: str  # "explanation" | "question" | "both"


EXPLANATION_DIMENSIONS: List[Dimension] = [
    Dimension(
        name="faithfulness",
        description=(
            "The explanation uses only evidence supplied in the input payload. "
            "No invented scores, signals, or facts."
        ),
        applies_to="explanation",
    ),
    Dimension(
        name="clarity",
        description=(
            "The explanation is understandable by an admin user without ML "
            "expertise. Concise, readable, free of jargon."
        ),
        applies_to="explanation",
    ),
    Dimension(
        name="decision_separation",
        description=(
            "The explanation does NOT act as the decision-maker, does not "
            "override, upgrade, or reclassify the ML decision."
        ),
        applies_to="explanation",
    ),
    Dimension(
        name="uncertainty_handling",
        description=(
            "Mixed or weak evidence is acknowledged where relevant. "
            "The explanation does not overstate certainty."
        ),
        applies_to="explanation",
    ),
    Dimension(
        name="actionability",
        description=(
            "The explanation helps the admin understand what to inspect "
            "further, without being a final recommender."
        ),
        applies_to="explanation",
    ),
]

QUESTION_DIMENSIONS: List[Dimension] = [
    Dimension(
        name="relevance",
        description="Questions match the job/work context and plantation type.",
        applies_to="question",
    ),
    Dimension(
        name="specificity",
        description="Questions are not overly generic — they target the role.",
        applies_to="question",
    ),
    Dimension(
        name="purpose_quality",
        description="The stated purpose of each question makes sense.",
        applies_to="question",
    ),
    Dimension(
        name="followup_usefulness",
        description="Follow-up hints are practical when present.",
        applies_to="question",
    ),
    Dimension(
        name="format_validity",
        description=(
            "Output preserves the expected JSON structure: each item has "
            "'question', 'purpose', and optional 'follow_up_hint'."
        ),
        applies_to="question",
    ),
]

ALL_DIMENSIONS = EXPLANATION_DIMENSIONS + QUESTION_DIMENSIONS


# ---------------------------------------------------------------------------
# Score container
# ---------------------------------------------------------------------------

@dataclass
class CaseScore:
    """Scores for a single evaluation case."""
    case_id: str
    flow: str  # gate1_explanation | gate2_explanation | gate1_questions | gate2_questions
    dimension_scores: Dict[str, int] = field(default_factory=dict)
    notes: Dict[str, str] = field(default_factory=dict)

    @property
    def mean_score(self) -> float:
        vals = list(self.dimension_scores.values())
        return round(sum(vals) / len(vals), 2) if vals else 0.0

    def summary_label(self) -> str:
        return label_for(round(self.mean_score))
