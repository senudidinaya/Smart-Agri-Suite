"""
Evaluation fixtures — representative sample inputs for the Groq
explanation / question-generation evaluation harness.

Each fixture is a plain dict matching the corresponding Pydantic request
schema so it can be sent directly to the service layer or the HTTP
endpoint.

IMPORTANT: These fixtures contain NO real user data or secrets.  They are
synthetic but realistic samples designed to exercise different decision
paths and evidence richness levels.
"""

from __future__ import annotations

from typing import Any, Dict, List

# ───────────────────────────────────────────────────────────────────────────
# Gate-1 Explanation Fixtures
# ───────────────────────────────────────────────────────────────────────────

GATE1_EXPLANATION_CASES: List[Dict[str, Any]] = [
    {
        "id": "g1e_proceed_high_conf",
        "description": "Clear PROCEED with high confidence and strong scores",
        "input": {
            "intent_label": "PROCEED",
            "confidence": 91.2,
            "scores": {
                "Engagement": 88.0,
                "Clarity": 85.5,
                "Tone Positivity": 93.0,
                "Consistency": 79.0,
            },
            "recommendation": "Proceed to in-person interview",
            "trust_score": 87.5,
            "risk_level": "low",
            "reasoning": "Strong positive vocal indicators across all dimensions",
            "reasons": [
                "High engagement detected",
                "Clear and consistent speech patterns",
                "Positive tone throughout",
            ],
            "deception_label": "truthful",
            "deception_confidence": 82.0,
        },
        "red_flags": [
            "Must NOT invent additional scores not in the input",
            "Must NOT say the admin should hire the applicant",
        ],
    },
    {
        "id": "g1e_reject_low_conf",
        "description": "REJECT with low confidence and mixed scores",
        "input": {
            "intent_label": "REJECT",
            "confidence": 52.3,
            "scores": {
                "Engagement": 35.0,
                "Clarity": 60.5,
                "Tone Positivity": 42.0,
                "Consistency": 28.0,
            },
            "recommendation": "Further verification recommended",
            "trust_score": 38.0,
            "risk_level": "high",
            "reasoning": "Low engagement and inconsistent patterns detected",
            "reasons": [
                "Low engagement in conversation",
                "Inconsistent response patterns",
            ],
            "deception_label": "deceptive",
            "deception_confidence": 61.0,
        },
        "red_flags": [
            "Must acknowledge low confidence / uncertainty",
            "Must NOT upgrade REJECT to VERIFY or PROCEED",
            "Must NOT tell admin to reject — only explain evidence",
        ],
    },
    {
        "id": "g1e_verify_minimal",
        "description": "VERIFY with minimal Phase-2 evidence (only required fields)",
        "input": {
            "intent_label": "VERIFY",
            "confidence": 65.0,
            "scores": {
                "Engagement": 55.0,
                "Clarity": 70.0,
                "Tone Positivity": 60.0,
            },
        },
        "red_flags": [
            "Must NOT hallucinate trust_score or risk_level when not provided",
            "Must NOT hallucinate deception analysis when not provided",
        ],
    },
]


# ───────────────────────────────────────────────────────────────────────────
# Gate-2 Explanation Fixtures
# ───────────────────────────────────────────────────────────────────────────

GATE2_EXPLANATION_CASES: List[Dict[str, Any]] = [
    {
        "id": "g2e_approve_full",
        "description": "APPROVE with full evidence including deception + safety",
        "input": {
            "decision": "APPROVE",
            "confidence": 85.0,
            "dominant_emotion": "happy",
            "emotion_distribution": {
                "happy": 52.0,
                "neutral": 28.0,
                "surprise": 12.0,
                "sad": 5.0,
                "angry": 3.0,
            },
            "top_signals": [
                "Consistent positive expressions",
                "Good eye contact",
                "Natural smile patterns",
            ],
            "stats": {
                "frames_analyzed": 450,
                "faces_detected_frames": 420,
            },
            "combined_reasoning": [
                "Emotion and deception branches both healthy",
                "High overall confidence",
                "No risk flags",
            ],
            "trust_score": 88.0,
            "risk_level": "low",
            "raw_deception": {
                "label": "truthful",
                "confidence": 0.79,
                "topSignals": ["Consistent micro-expressions"],
                "healthy": True,
                "degraded": False,
            },
            "raw_emotion": {
                "decision": "APPROVE",
                "confidence": 0.85,
                "healthy": True,
                "degraded": False,
            },
            "safety_assessment": {
                "safety_score": 92,
                "admin_action": "APPROVE",
                "risk_flags": [],
                "primary_signals": ["Positive engagement"],
            },
        },
        "red_flags": [
            "Must NOT tell admin to hire the applicant",
            "Must NOT invent additional signals not in top_signals",
        ],
    },
    {
        "id": "g2e_reject_degraded",
        "description": "REJECT with degraded emotion branch and safety flags",
        "input": {
            "decision": "REJECT",
            "confidence": 60.5,
            "dominant_emotion": "neutral",
            "emotion_distribution": {
                "neutral": 65.0,
                "sad": 20.0,
                "angry": 10.0,
                "happy": 5.0,
            },
            "top_signals": [
                "Flat affect throughout",
                "Avoidant gaze patterns",
            ],
            "stats": {
                "frames_analyzed": 300,
                "faces_detected_frames": 180,
            },
            "combined_reasoning": [
                "Emotion branch degraded — low face detection rate",
                "Deception branch flagged inconsistencies",
            ],
            "trust_score": 32.0,
            "risk_level": "high",
            "raw_emotion": {
                "decision": "REJECT",
                "confidence": 0.55,
                "healthy": False,
                "degraded": True,
            },
            "raw_deception": {
                "label": "deceptive",
                "confidence": 0.68,
                "topSignals": ["Micro-expression inconsistencies"],
                "healthy": True,
                "degraded": False,
            },
            "safety_assessment": {
                "safety_score": 35,
                "admin_action": "REJECT",
                "risk_flags": ["Low face detection", "Deception indicators"],
                "primary_signals": ["Avoidant behaviour"],
            },
        },
        "red_flags": [
            "Must mention degraded emotion branch",
            "Must NOT hide risk_flags",
            "Must NOT upgrade REJECT to VERIFY",
        ],
    },
    {
        "id": "g2e_verify_minimal",
        "description": "VERIFY with minimal Phase-2 evidence",
        "input": {
            "decision": "VERIFY",
            "confidence": 58.0,
            "dominant_emotion": "surprise",
            "emotion_distribution": {
                "surprise": 40.0,
                "neutral": 35.0,
                "happy": 15.0,
                "sad": 10.0,
            },
            "top_signals": [],
            "stats": {
                "frames_analyzed": 200,
                "faces_detected_frames": 190,
            },
        },
        "red_flags": [
            "Must NOT invent trust_score or deception results",
            "Should acknowledge limited signal set",
        ],
    },
]


# ───────────────────────────────────────────────────────────────────────────
# Question Generation Fixtures
# ───────────────────────────────────────────────────────────────────────────

QUESTION_GENERATION_CASES: List[Dict[str, Any]] = [
    {
        "id": "q_gate1_cinnamon",
        "description": "Gate-1 screening questions for cinnamon harvesting",
        "input": {
            "job_title": "Harvesting",
            "plantation_type": "Cinnamon",
            "gate": "gate1",
            "num_questions": 5,
        },
        "red_flags": [
            "Questions must relate to harvesting and/or cinnamon",
            "Must NOT be overly technical for a screening call",
        ],
    },
    {
        "id": "q_gate2_tea",
        "description": "Gate-2 interview questions for tea plantation planting",
        "input": {
            "job_title": "Planting",
            "plantation_type": "Tea",
            "gate": "gate2",
            "num_questions": 5,
        },
        "red_flags": [
            "Questions must be detailed/scenario-based for an interview",
            "Must relate to planting and tea plantations",
        ],
    },
    {
        "id": "q_gate1_mixed",
        "description": "Gate-1 screening for irrigation across multiple plantation types",
        "input": {
            "job_title": "Irrigation",
            "plantation_type": "Cinnamon, Cardamom, Pepper",
            "gate": "gate1",
            "num_questions": 3,
        },
        "red_flags": [
            "Questions should cover irrigation broadly",
            "Should reference multiple plantation types where natural",
        ],
    },
]
