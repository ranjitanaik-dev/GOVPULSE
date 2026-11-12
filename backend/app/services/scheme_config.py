"""
GovPulse — Scheme Seed Data & Helper
"""

SCHEMES_SEED = [
    {
        "id": "mgnrega",
        "name": "MGNREGA",
        "description": "Mahatma Gandhi National Rural Employment Guarantee Act — Provides 100 days of guaranteed wage employment per year to rural households.",
        "ministry": "Ministry of Rural Development",
        "supported_indicators": [
            "households_registered", "households_employed",
            "person_days_generated", "person_days_target",
            "expenditure_lakh", "total_budget_lakh"
        ],
        "required_columns": ["state", "district"],
        "optional_columns": [
            "households_registered", "households_employed",
            "person_days_generated", "person_days_target",
            "expenditure_lakh", "total_budget_lakh"
        ],
        "is_active": True,
    },
    {
        "id": "pmayg",
        "name": "PMAY-G",
        "description": "Pradhan Mantri Awaas Yojana — Gramin. Provides financial assistance for rural housing.",
        "ministry": "Ministry of Rural Development",
        "supported_indicators": [
            "houses_target", "houses_sanctioned",
            "houses_completed", "houses_in_progress", "expenditure_cr"
        ],
        "required_columns": ["state", "district"],
        "optional_columns": [
            "houses_target", "houses_sanctioned",
            "houses_completed", "houses_in_progress", "expenditure_cr"
        ],
        "is_active": True,
    },
    {
        "id": "pmjay",
        "name": "PM-JAY",
        "description": "Pradhan Mantri Jan Arogya Yojana. Health insurance scheme for economically vulnerable families.",
        "ministry": "Ministry of Health and Family Welfare",
        "supported_indicators": [
            "beneficiaries_identified", "cards_issued",
            "hospitalisations", "claims_submitted", "claims_settled"
        ],
        "required_columns": ["state"],
        "optional_columns": [
            "beneficiaries_identified", "cards_issued",
            "hospitalisations", "claims_submitted", "claims_settled"
        ],
        "is_active": True,
    },
    {
        "id": "udise",
        "name": "UDISE+",
        "description": "Unified District Information System for Education. Tracks school infrastructure, enrolment and teacher data.",
        "ministry": "Ministry of Education",
        "supported_indicators": [
            "total_schools", "total_students",
            "total_teachers", "gross_enrolment_ratio", "net_enrolment_ratio"
        ],
        "required_columns": ["state", "district"],
        "optional_columns": [
            "total_schools", "total_students",
            "total_teachers", "gross_enrolment_ratio", "net_enrolment_ratio"
        ],
        "is_active": True,
    },
]
