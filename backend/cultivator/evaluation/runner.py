"""
Evaluation runner for the Groq explanation / question-generation layer.

Calls the **live** explanation and question-generation service functions,
captures outputs, applies the rubric via deterministic heuristic checks,
and writes both a machine-readable JSON report and a human-readable
Markdown report.

Usage (from the backend directory, with venv active)::

    python -m cultivator.evaluation.runner                    # defaults
    python -m cultivator.evaluation.runner --out-dir results  # custom output dir
    python -m cultivator.evaluation.runner --base-url http://localhost:8000  # via HTTP

The runner supports two modes:

1. **Direct** (default) — imports and calls the async service functions
   in-process.  Requires ``GROQ_API_KEY`` in ``.env`` but does NOT need
   the server running.
2. **HTTP** — sends requests to a running backend.  Pass ``--base-url``.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import httpx

# ---------------------------------------------------------------------------
# Rubric + fixtures
# ---------------------------------------------------------------------------

from cultivator.evaluation.rubric import (
    EXPLANATION_DIMENSIONS,
    QUESTION_DIMENSIONS,
    CaseScore,
    label_for,
)
from cultivator.evaluation.fixtures import (
    GATE1_EXPLANATION_CASES,
    GATE2_EXPLANATION_CASES,
    QUESTION_GENERATION_CASES,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _score_explanation(text: str, case: Dict[str, Any]) -> CaseScore:
    """Heuristic-score an explanation against the rubric."""
    cs = CaseScore(case_id=case["id"], flow=case["id"].split("_")[0] + "_explanation")
    inp = case["input"]
    red_flags = case.get("red_flags", [])
    lower = text.lower()

    # --- faithfulness ---
    faith = 5
    # Check the explanation doesn't invent specific numeric scores not in input
    for dim_name in ("trust_score", "deception_confidence"):
        if dim_name not in inp or inp[dim_name] is None:
            # value not supplied — if the explanation mentions a specific percentage
            # that looks like a trust/deception score, penalise
            if dim_name == "trust_score" and "trust score" in lower and "%" in lower:
                faith = max(faith - 2, 1)
            if dim_name == "deception_confidence" and "deception" in lower and re.search(r"\d+(\.\d+)?%", text):
                # only penalise if the number doesn't appear in any supplied input
                nums_in_input = set()
                for v in inp.get("scores", {}).values():
                    nums_in_input.add(f"{v:.1f}")
                conf = inp.get("confidence")
                if conf is not None:
                    nums_in_input.add(f"{conf:.1f}")
                for m in re.finditer(r"(\d+(?:\.\d+)?)%", text):
                    if m.group(1) not in nums_in_input:
                        faith = max(faith - 1, 1)
    cs.dimension_scores["faithfulness"] = faith

    # --- clarity ---
    word_count = len(text.split())
    clarity = 5
    if word_count > 250:
        clarity -= 1
    if word_count < 20:
        clarity -= 2
    # bullet points are explicitly disallowed by prompt
    if "•" in text or re.search(r"^\s*[-*]\s", text, re.MULTILINE):
        clarity -= 1
    cs.dimension_scores["clarity"] = max(clarity, 1)

    # --- decision_separation ---
    sep = 5
    decision_verbs = [
        "you should hire",
        "you must hire",
        "i recommend hiring",
        "i recommend rejecting",
        "the decision should be changed",
        "i would change the decision",
        "override",
        "reclassify",
        "upgrade the decision",
        "downgrade the decision",
    ]
    for phrase in decision_verbs:
        if phrase in lower:
            sep -= 2
    cs.dimension_scores["decision_separation"] = max(sep, 1)

    # --- uncertainty_handling ---
    unc = 4  # default decent
    conf = inp.get("confidence", 100)
    if conf < 65:
        # low confidence case — explanation should acknowledge uncertainty
        uncertainty_words = ["uncertain", "moderate", "limited", "mixed", "borderline", "lower", "less certain", "caution"]
        if any(w in lower for w in uncertainty_words):
            unc = 5
        else:
            unc = 3
    cs.dimension_scores["uncertainty_handling"] = unc

    # --- actionability ---
    act = 4
    action_phrases = ["explore further", "further review", "additional", "investigate", "worth noting", "closer look", "may wish"]
    if any(p in lower for p in action_phrases):
        act = 5
    cs.dimension_scores["actionability"] = act

    # --- red-flag notes ---
    for rf in red_flags:
        cs.notes[rf] = "manual-check-required"

    return cs


def _score_questions(questions: List[Dict[str, Any]], case: Dict[str, Any]) -> CaseScore:
    """Heuristic-score generated questions against the rubric."""
    cs = CaseScore(
        case_id=case["id"],
        flow=f"{case['input']['gate']}_questions",
    )
    inp = case["input"]
    red_flags = case.get("red_flags", [])

    # --- format_validity ---
    fmt = 5
    if not isinstance(questions, list):
        fmt = 1
    else:
        for q in questions:
            if not isinstance(q, dict):
                fmt = max(fmt - 2, 1)
            else:
                if "question" not in q or "purpose" not in q:
                    fmt = max(fmt - 2, 1)
        if len(questions) != inp.get("num_questions", 5):
            fmt = max(fmt - 1, 1)
    cs.dimension_scores["format_validity"] = fmt

    if not isinstance(questions, list) or not questions:
        for dim in QUESTION_DIMENSIONS:
            if dim.name != "format_validity":
                cs.dimension_scores[dim.name] = 1
        return cs

    all_text = " ".join(
        (q.get("question", "") + " " + q.get("purpose", "")).lower()
        for q in questions
    )

    # --- relevance ---
    rel = 4
    job_lower = inp["job_title"].lower()
    plant_lower = inp["plantation_type"].lower()
    plants = [p.strip().lower() for p in plant_lower.split(",")]
    if job_lower in all_text:
        rel = 5
    if any(p in all_text for p in plants):
        rel = min(rel + 1, 5)
    if job_lower not in all_text and all(p not in all_text for p in plants):
        rel = 2
    cs.dimension_scores["relevance"] = rel

    # --- specificity ---
    generic_phrases = [
        "tell me about yourself",
        "what are your strengths",
        "what is your greatest weakness",
        "where do you see yourself",
    ]
    spec = 5
    generic_count = sum(1 for gp in generic_phrases if gp in all_text)
    spec = max(5 - generic_count, 1)
    cs.dimension_scores["specificity"] = spec

    # --- purpose_quality ---
    purp = 5
    for q in questions:
        purpose = q.get("purpose", "")
        if not purpose or len(purpose.split()) < 3:
            purp = max(purp - 1, 1)
    cs.dimension_scores["purpose_quality"] = purp

    # --- followup_usefulness ---
    fu = 4
    hints_present = [q for q in questions if q.get("follow_up_hint")]
    if not hints_present:
        fu = 3  # acceptable but no hints at all
    else:
        for q in hints_present:
            hint = q["follow_up_hint"]
            if len(hint.split()) < 3:
                fu = max(fu - 1, 1)
    cs.dimension_scores["followup_usefulness"] = fu

    for rf in red_flags:
        cs.notes[rf] = "manual-check-required"

    return cs


# ---------------------------------------------------------------------------
# Execution modes
# ---------------------------------------------------------------------------


async def _run_direct() -> List[Dict[str, Any]]:
    """Call service functions in-process (no server needed)."""
    from cultivator.services.llm_service import (
        generate_gate1_insight,
        generate_gate2_insight,
        generate_questions,
        GATE1_EXPLANATION_PROMPT_VERSION,
        GATE2_EXPLANATION_PROMPT_VERSION,
        GATE1_QUESTIONS_PROMPT_VERSION,
        GATE2_QUESTIONS_PROMPT_VERSION,
        _PROVIDER,
    )
    from cultivator.core.config import get_settings

    settings = get_settings()
    meta = {
        "provider": _PROVIDER,
        "model": settings.groq_model,
    }

    results: List[Dict[str, Any]] = []

    # Gate-1 explanations
    for case in GATE1_EXPLANATION_CASES:
        inp = case["input"]
        t0 = time.monotonic()
        try:
            text = await generate_gate1_insight(**inp)
            latency = round((time.monotonic() - t0) * 1000, 1)
            score = _score_explanation(text, case)
            results.append({
                "case_id": case["id"],
                "flow": "gate1_explanation",
                "description": case["description"],
                "prompt_version": GATE1_EXPLANATION_PROMPT_VERSION,
                **meta,
                "latency_ms": latency,
                "success": True,
                "generated_text": text,
                "scores": score.dimension_scores,
                "mean_score": score.mean_score,
                "label": score.summary_label(),
                "notes": score.notes,
            })
        except Exception as exc:
            results.append({
                "case_id": case["id"],
                "flow": "gate1_explanation",
                "description": case["description"],
                "prompt_version": GATE1_EXPLANATION_PROMPT_VERSION,
                **meta,
                "latency_ms": round((time.monotonic() - t0) * 1000, 1),
                "success": False,
                "error": str(exc)[:300],
                "scores": {},
                "mean_score": 0,
                "label": "fail",
                "notes": {},
            })

    # Gate-2 explanations
    for case in GATE2_EXPLANATION_CASES:
        inp = case["input"]
        t0 = time.monotonic()
        try:
            text = await generate_gate2_insight(**inp)
            latency = round((time.monotonic() - t0) * 1000, 1)
            score = _score_explanation(text, case)
            results.append({
                "case_id": case["id"],
                "flow": "gate2_explanation",
                "description": case["description"],
                "prompt_version": GATE2_EXPLANATION_PROMPT_VERSION,
                **meta,
                "latency_ms": latency,
                "success": True,
                "generated_text": text,
                "scores": score.dimension_scores,
                "mean_score": score.mean_score,
                "label": score.summary_label(),
                "notes": score.notes,
            })
        except Exception as exc:
            results.append({
                "case_id": case["id"],
                "flow": "gate2_explanation",
                "description": case["description"],
                "prompt_version": GATE2_EXPLANATION_PROMPT_VERSION,
                **meta,
                "latency_ms": round((time.monotonic() - t0) * 1000, 1),
                "success": False,
                "error": str(exc)[:300],
                "scores": {},
                "mean_score": 0,
                "label": "fail",
                "notes": {},
            })

    # Question generation
    for case in QUESTION_GENERATION_CASES:
        inp = case["input"]
        gate = inp["gate"]
        pv = (
            GATE1_QUESTIONS_PROMPT_VERSION
            if gate == "gate1"
            else GATE2_QUESTIONS_PROMPT_VERSION
        )
        t0 = time.monotonic()
        try:
            questions = await generate_questions(**inp)
            latency = round((time.monotonic() - t0) * 1000, 1)
            score = _score_questions(questions, case)
            results.append({
                "case_id": case["id"],
                "flow": f"{gate}_questions",
                "description": case["description"],
                "prompt_version": pv,
                **meta,
                "latency_ms": latency,
                "success": True,
                "generated_questions": questions,
                "scores": score.dimension_scores,
                "mean_score": score.mean_score,
                "label": score.summary_label(),
                "notes": score.notes,
            })
        except Exception as exc:
            results.append({
                "case_id": case["id"],
                "flow": f"{gate}_questions",
                "description": case["description"],
                "prompt_version": pv,
                **meta,
                "latency_ms": round((time.monotonic() - t0) * 1000, 1),
                "success": False,
                "error": str(exc)[:300],
                "scores": {},
                "mean_score": 0,
                "label": "fail",
                "notes": {},
            })

    return results


async def _run_http(base_url: str) -> List[Dict[str, Any]]:
    """Call endpoints via HTTP against a running server."""
    results: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(base_url=base_url, timeout=60.0) as client:
        # Gate-1 explanations
        for case in GATE1_EXPLANATION_CASES:
            t0 = time.monotonic()
            try:
                resp = await client.post("/explain/gate1", json=case["input"])
                resp.raise_for_status()
                data = resp.json()
                latency = round((time.monotonic() - t0) * 1000, 1)
                text = data.get("insight", "")
                score = _score_explanation(text, case)
                results.append({
                    "case_id": case["id"],
                    "flow": "gate1_explanation",
                    "description": case["description"],
                    "prompt_version": "unknown-http",
                    "provider": "groq",
                    "model": "unknown-http",
                    "latency_ms": latency,
                    "success": data.get("success", False),
                    "generated_text": text,
                    "scores": score.dimension_scores,
                    "mean_score": score.mean_score,
                    "label": score.summary_label(),
                    "notes": score.notes,
                })
            except Exception as exc:
                results.append({
                    "case_id": case["id"],
                    "flow": "gate1_explanation",
                    "description": case["description"],
                    "prompt_version": "unknown-http",
                    "provider": "groq",
                    "model": "unknown-http",
                    "latency_ms": round((time.monotonic() - t0) * 1000, 1),
                    "success": False,
                    "error": str(exc)[:300],
                    "scores": {},
                    "mean_score": 0,
                    "label": "fail",
                    "notes": {},
                })

        # Gate-2 explanations
        for case in GATE2_EXPLANATION_CASES:
            t0 = time.monotonic()
            try:
                resp = await client.post("/explain/gate2", json=case["input"])
                resp.raise_for_status()
                data = resp.json()
                latency = round((time.monotonic() - t0) * 1000, 1)
                text = data.get("insight", "")
                score = _score_explanation(text, case)
                results.append({
                    "case_id": case["id"],
                    "flow": "gate2_explanation",
                    "description": case["description"],
                    "prompt_version": "unknown-http",
                    "provider": "groq",
                    "model": "unknown-http",
                    "latency_ms": latency,
                    "success": data.get("success", False),
                    "generated_text": text,
                    "scores": score.dimension_scores,
                    "mean_score": score.mean_score,
                    "label": score.summary_label(),
                    "notes": score.notes,
                })
            except Exception as exc:
                results.append({
                    "case_id": case["id"],
                    "flow": "gate2_explanation",
                    "description": case["description"],
                    "prompt_version": "unknown-http",
                    "provider": "groq",
                    "model": "unknown-http",
                    "latency_ms": round((time.monotonic() - t0) * 1000, 1),
                    "success": False,
                    "error": str(exc)[:300],
                    "scores": {},
                    "mean_score": 0,
                    "label": "fail",
                    "notes": {},
                })

        # Question generation
        for case in QUESTION_GENERATION_CASES:
            t0 = time.monotonic()
            try:
                resp = await client.post("/explain/questions", json=case["input"])
                resp.raise_for_status()
                data = resp.json()
                latency = round((time.monotonic() - t0) * 1000, 1)
                questions = [
                    {"question": q["question"], "purpose": q["purpose"], "follow_up_hint": q.get("follow_up_hint")}
                    for q in data.get("questions", [])
                ]
                score = _score_questions(questions, case)
                gate = case["input"]["gate"]
                results.append({
                    "case_id": case["id"],
                    "flow": f"{gate}_questions",
                    "description": case["description"],
                    "prompt_version": "unknown-http",
                    "provider": "groq",
                    "model": "unknown-http",
                    "latency_ms": latency,
                    "success": data.get("success", False),
                    "generated_questions": questions,
                    "scores": score.dimension_scores,
                    "mean_score": score.mean_score,
                    "label": score.summary_label(),
                    "notes": score.notes,
                })
            except Exception as exc:
                gate = case["input"]["gate"]
                results.append({
                    "case_id": case["id"],
                    "flow": f"{gate}_questions",
                    "description": case["description"],
                    "prompt_version": "unknown-http",
                    "provider": "groq",
                    "model": "unknown-http",
                    "latency_ms": round((time.monotonic() - t0) * 1000, 1),
                    "success": False,
                    "error": str(exc)[:300],
                    "scores": {},
                    "mean_score": 0,
                    "label": "fail",
                    "notes": {},
                })

    return results


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------


def _build_json_report(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build the top-level JSON evaluation report."""
    now = datetime.now(timezone.utc).isoformat()
    total = len(results)
    passed = sum(1 for r in results if r["success"])
    mean_all = round(
        sum(r["mean_score"] for r in results if r["success"])
        / max(passed, 1),
        2,
    )
    return {
        "evaluation_timestamp": now,
        "total_cases": total,
        "passed": passed,
        "failed": total - passed,
        "overall_mean_score": mean_all,
        "cases": results,
    }


def _build_markdown_report(report: Dict[str, Any]) -> str:
    """Build a human-readable Markdown summary from the JSON report."""
    lines: List[str] = []
    w = lines.append

    w("# Phase 4 — Evaluation Results\n")
    w(f"**Timestamp:** {report['evaluation_timestamp']}  ")
    w(f"**Total cases:** {report['total_cases']}  ")
    w(f"**Passed:** {report['passed']}  ")
    w(f"**Failed:** {report['failed']}  ")
    w(f"**Overall mean score:** {report['overall_mean_score']} / 5\n")

    # Group by flow
    flows: Dict[str, List[Dict[str, Any]]] = {}
    for c in report["cases"]:
        flows.setdefault(c["flow"], []).append(c)

    for flow, cases in flows.items():
        w(f"\n## {flow}\n")
        for c in cases:
            status = "✅" if c["success"] else "❌"
            w(f"### {status} `{c['case_id']}` — {c['description']}\n")
            w(f"- **Provider:** {c.get('provider', 'N/A')}  ")
            w(f"- **Model:** {c.get('model', 'N/A')}  ")
            w(f"- **Prompt version:** {c.get('prompt_version', 'N/A')}  ")
            w(f"- **Latency:** {c.get('latency_ms', 'N/A')} ms  ")
            w(f"- **Mean score:** {c['mean_score']} / 5 ({c['label']})\n")

            if c.get("scores"):
                w("| Dimension | Score | Label |")
                w("|---|---|---|")
                for dim, sc in c["scores"].items():
                    w(f"| {dim} | {sc} | {label_for(sc)} |")
                w("")

            if c.get("generated_text"):
                w("<details><summary>Generated text</summary>\n")
                w(f"```\n{c['generated_text']}\n```\n")
                w("</details>\n")

            if c.get("generated_questions"):
                w("<details><summary>Generated questions</summary>\n")
                w("```json")
                w(json.dumps(c["generated_questions"], indent=2))
                w("```\n")
                w("</details>\n")

            if c.get("error"):
                w(f"**Error:** `{c['error']}`\n")

            if c.get("notes"):
                w("**Manual-check notes:**")
                for note, val in c["notes"].items():
                    w(f"- {note}: _{val}_")
                w("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run Phase-4 evaluation of the Groq explanation layer.",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="If set, run evaluation via HTTP against a running server (e.g. http://localhost:8000).",
    )
    parser.add_argument(
        "--out-dir",
        default=".",
        help="Directory to write result artifacts into (default: cwd).",
    )
    args = parser.parse_args()

    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    print("Running Phase-4 evaluation …")

    if args.base_url:
        results = asyncio.run(_run_http(args.base_url))
    else:
        results = asyncio.run(_run_direct())

    report = _build_json_report(results)

    json_path = out / "deepseek-to-groq-phase4-evaluation-results.json"
    json_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"  ✓ JSON results → {json_path}")

    md = _build_markdown_report(report)
    md_path = out / "deepseek-to-groq-phase4-evaluation-report.md"
    md_path.write_text(md, encoding="utf-8")
    print(f"  ✓ Markdown report → {md_path}")

    print(f"\nDone — {report['passed']}/{report['total_cases']} cases passed, "
          f"overall mean {report['overall_mean_score']}/5")


if __name__ == "__main__":
    main()
