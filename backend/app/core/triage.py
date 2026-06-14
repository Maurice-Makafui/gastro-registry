"""
Rule-based triage engine for gastroenterology/hepatology symptoms.
Returns HIGH / MEDIUM / LOW risk classification.
"""
from typing import List

HIGH_RISK_SYMPTOMS = [
    "vomiting_blood",
    "hematemesis",
    "jaundice",
    "black_stool",
    "melena",
    "severe_abdominal_pain",
    "signs_of_shock",
    "altered_consciousness",
    "severe_dehydration",
    "rectal_bleeding",
]

MEDIUM_RISK_SYMPTOMS = [
    "abdominal_pain",
    "persistent_vomiting",
    "dysphagia",
    "weight_loss",
    "chronic_diarrhea",
    "fever",
    "hepatomegaly",
    "ascites",
    "loss_of_appetite",
]

LOW_RISK_SYMPTOMS = [
    "mild_nausea",
    "bloating",
    "constipation",
    "heartburn",
    "acid_reflux",
    "mild_diarrhea",
    "flatulence",
    "mild_abdominal_discomfort",
]

# Vital sign thresholds
CRITICAL_VITALS = {
    "systolic_bp_low": 90,
    "heart_rate_high": 120,
    "oxygen_saturation_low": 94,
    "temperature_high": 39.5,
}


def calculate_risk_level(symptoms: List[str], vitals: dict = None) -> str:
    """
    Returns 'HIGH', 'MEDIUM', or 'LOW' based on symptom list and vitals.
    """
    if not symptoms:
        return "LOW"

    symptoms_lower = [s.lower().replace(" ", "_") for s in symptoms]

    # Check HIGH risk symptoms first
    for symptom in symptoms_lower:
        if symptom in HIGH_RISK_SYMPTOMS:
            return "HIGH"

    # Check critical vitals
    if vitals:
        systolic = vitals.get("systolic_bp")
        heart_rate = vitals.get("heart_rate")
        spo2 = vitals.get("oxygen_saturation")
        temp = vitals.get("temperature")

        if systolic and systolic < CRITICAL_VITALS["systolic_bp_low"]:
            return "HIGH"
        if heart_rate and heart_rate > CRITICAL_VITALS["heart_rate_high"]:
            return "HIGH"
        if spo2 and spo2 < CRITICAL_VITALS["oxygen_saturation_low"]:
            return "HIGH"

    # Check MEDIUM risk symptoms
    for symptom in symptoms_lower:
        if symptom in MEDIUM_RISK_SYMPTOMS:
            return "MEDIUM"

    return "LOW"


def get_triage_recommendations(risk_level: str, symptoms: List[str]) -> dict:
    """Returns recommended actions based on risk level."""
    recommendations = {
        "HIGH": {
            "urgency": "IMMEDIATE",
            "action": "Refer to gastroenterologist within 24 hours. Consider emergency admission.",
            "investigations": ["FBC", "LFT", "PT/INR", "Upper GI Endoscopy (urgent)", "Abdominal Ultrasound"],
            "color": "red",
        },
        "MEDIUM": {
            "urgency": "SEMI-URGENT",
            "action": "Schedule specialist consultation within 1 week.",
            "investigations": ["FBC", "LFT", "Abdominal Ultrasound", "Stool MCS"],
            "color": "amber",
        },
        "LOW": {
            "urgency": "ROUTINE",
            "action": "Schedule routine outpatient consultation within 2-4 weeks.",
            "investigations": ["Stool MCS", "Abdominal Ultrasound if symptoms persist"],
            "color": "green",
        },
    }
    return recommendations.get(risk_level, recommendations["LOW"])
