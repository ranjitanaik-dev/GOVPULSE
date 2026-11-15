"""
GovPulse — Scheme Seed Data & Indicator Configuration
"""

import re

SCHEMES_SEED = [
    {
        "id": "mgnrega",
        "name": "MGNREGA",
        "description": "Mahatma Gandhi National Rural Employment Guarantee Act — Provides guaranteed wage employment to rural households.",
        "ministry": "Ministry of Rural Development",
        "supported_indicators": [
            "persondays_central_liability", "person_days_generated", "person_days_target",
            "expenditure_lakh", "wages_lakh", "material_lakh", "admin_expenditure_lakh", "total_budget_lakh",
            "households_employed", "households_registered", "individuals_worked",
            "completed_works", "ongoing_works", "total_works_takenup",
            "women_persondays", "sc_persondays", "st_persondays",
            "month", "financial_year"
        ],
        "required_columns": ["state", "district"],
        "optional_columns": [
            "persondays_central_liability", "person_days_generated", "person_days_target",
            "expenditure_lakh", "wages_lakh", "material_lakh", "admin_expenditure_lakh", "total_budget_lakh",
            "households_employed", "households_registered", "individuals_worked",
            "completed_works", "ongoing_works", "total_works_takenup",
            "women_persondays", "sc_persondays", "st_persondays",
            "month", "financial_year"
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
        "description": "Pradhan Mantri Jan Arogya Yojana. Health protection scheme for vulnerable families.",
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
        "description": "Unified District Information System for Education. Tracks school infrastructure, enrolment and teachers.",
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

SCHEME_INDICATOR_METADATA = {
    "mgnrega": {
        "state": {
            "label": "State / UT",
            "type": "text",
            "required": True,
            "description": "State or Union Territory name (e.g., Andhra Pradesh, Rajasthan)",
        },
        "district": {
            "label": "District",
            "type": "text",
            "required": True,
            "description": "Administrative district name (e.g., Jaipur, Vellore)",
        },
        "households_registered": {
            "label": "Households Registered / Demanded",
            "type": "numeric",
            "required": False,
            "description": "Rural households registered or demanding work",
        },
        "households_employed": {
            "label": "Households Employed",
            "type": "numeric",
            "required": False,
            "description": "Households provided with wage employment",
        },
        "persondays_central_liability": {
            "label": "Central Liability Person-days",
            "type": "numeric",
            "required": False,
            "description": "Person-days of employment generated under Central Government liability",
        },
        "person_days_generated": {
            "label": "Overall Person-days (Total)",
            "type": "numeric",
            "required": False,
            "description": "Total person-days generated (if available separately from central liability)",
        },
        "person_days_target": {
            "label": "Person-days Target / Labour Budget",
            "type": "numeric",
            "required": False,
            "description": "Approved labour budget or target person-days",
        },
        "expenditure_lakh": {
            "label": "Total Expenditure (₹ Lakh)",
            "type": "numeric",
            "required": False,
            "description": "Total expenditure (wages, materials, administration) in ₹ Lakhs",
        },
        "wages_lakh": {
            "label": "Wages Expenditure (₹ Lakh)",
            "type": "numeric",
            "required": False,
            "description": "Wage expenditure disbursed to rural workers in ₹ Lakhs",
        },
        "material_lakh": {
            "label": "Material & Skilled Wages (₹ Lakh)",
            "type": "numeric",
            "required": False,
            "description": "Expenditure on materials and skilled/semi-skilled wages in ₹ Lakhs",
        },
        "admin_expenditure_lakh": {
            "label": "Administrative Expenditure (₹ Lakh)",
            "type": "numeric",
            "required": False,
            "description": "Administrative contingency and contingency expenses in ₹ Lakhs",
        },
        "total_budget_lakh": {
            "label": "Total Budget Allocated (₹ Lakh)",
            "type": "numeric",
            "required": False,
            "description": "Total financial budget allocated in ₹ Lakhs",
        },
        "completed_works": {
            "label": "Completed Works",
            "type": "numeric",
            "required": False,
            "description": "Number of rural asset works completed",
        },
        "ongoing_works": {
            "label": "Ongoing Works",
            "type": "numeric",
            "required": False,
            "description": "Number of works currently in progress",
        },
        "total_works_takenup": {
            "label": "Total Works Taken Up",
            "type": "numeric",
            "required": False,
            "description": "Total number of works taken up / sanctioned",
        },
        "women_persondays": {
            "label": "Women Person-days",
            "type": "numeric",
            "required": False,
            "description": "Person-days of employment generated by women workers",
        },
        "sc_persondays": {
            "label": "SC Person-days",
            "type": "numeric",
            "required": False,
            "description": "Person-days of employment generated by Scheduled Caste workers",
        },
        "st_persondays": {
            "label": "ST Person-days",
            "type": "numeric",
            "required": False,
            "description": "Person-days of employment generated by Scheduled Tribe workers",
        },
        "individuals_worked": {
            "label": "Total Individuals Worked",
            "type": "numeric",
            "required": False,
            "description": "Total rural individuals provided wage employment",
        },
        "month": {
            "label": "Reporting Month",
            "type": "text",
            "required": False,
            "description": "Monthly reporting period (e.g. April, May, ... March)",
        },
        "financial_year": {
            "label": "Financial Year",
            "type": "text",
            "required": False,
            "description": "Financial Year of reporting (e.g. 2025-2026)",
        },
    },
    "pmayg": {
        "state": {
            "label": "State / UT",
            "type": "text",
            "required": True,
            "description": "State or Union Territory name",
        },
        "district": {
            "label": "District",
            "type": "text",
            "required": True,
            "description": "Administrative district name",
        },
        "houses_target": {
            "label": "Houses Targeted",
            "type": "numeric",
            "required": False,
            "description": "Physical target assigned by Ministry",
        },
        "houses_sanctioned": {
            "label": "Houses Sanctioned",
            "type": "numeric",
            "required": False,
            "description": "Houses administratively sanctioned",
        },
        "houses_in_progress": {
            "label": "Houses In Progress",
            "type": "numeric",
            "required": False,
            "description": "Houses currently under active construction",
        },
        "houses_completed": {
            "label": "Houses Completed",
            "type": "numeric",
            "required": False,
            "description": "Houses fully constructed and verified",
        },
        "expenditure_cr": {
            "label": "Expenditure (₹ Crore)",
            "type": "numeric",
            "required": False,
            "description": "Total fund release/expenditure in ₹ Crores",
        },
    },
    "pmjay": {
        "state": {
            "label": "State / UT",
            "type": "text",
            "required": True,
            "description": "State or Union Territory name",
        },
        "beneficiaries_identified": {
            "label": "Beneficiaries Identified",
            "type": "numeric",
            "required": False,
            "description": "Eligible families/individuals verified",
        },
        "cards_issued": {
            "label": "Ayushman Cards Issued",
            "type": "numeric",
            "required": False,
            "description": "Total Golden/Ayushman cards issued",
        },
        "hospitalisations": {
            "label": "Hospital Admissions",
            "type": "numeric",
            "required": False,
            "description": "Authorized hospital admissions/pre-authorizations",
        },
        "claims_submitted": {
            "label": "Claims Submitted",
            "type": "numeric",
            "required": False,
            "description": "Insurance claim submissions by hospitals",
        },
        "claims_settled": {
            "label": "Claims Settled",
            "type": "numeric",
            "required": False,
            "description": "Claims processed and paid out",
        },
    },
    "udise": {
        "state": {
            "label": "State / UT",
            "type": "text",
            "required": True,
            "description": "State or Union Territory name",
        },
        "district": {
            "label": "District",
            "type": "text",
            "required": True,
            "description": "Administrative district name",
        },
        "total_schools": {
            "label": "Total Schools",
            "type": "numeric",
            "required": False,
            "description": "Total functional educational institutions",
        },
        "total_students": {
            "label": "Total Student Enrolment",
            "type": "numeric",
            "required": False,
            "description": "Students enrolled across all grades",
        },
        "total_teachers": {
            "label": "Total Teachers Available",
            "type": "numeric",
            "required": False,
            "description": "Total teaching staff available",
        },
        "gross_enrolment_ratio": {
            "label": "Gross Enrolment Ratio (%)",
            "type": "numeric",
            "required": False,
            "description": "Gross Enrolment Ratio (GER)",
        },
        "net_enrolment_ratio": {
            "label": "Net Enrolment Ratio (%)",
            "type": "numeric",
            "required": False,
            "description": "Net Enrolment Ratio (NER)",
        },
    },
}

SYNONYMS_MAP = {
    "state": [
        "state", "state_name", "statename", "state_ut", "state_ut_name",
        "state_name_english", "state_title", "state_desc", "st_name", "s_name"
    ],
    "district": [
        "district", "district_name", "districtname", "dist_name", "distname",
        "district_block", "district_title", "dt_name", "d_name"
    ],
    "persondays_central_liability": [
        "persondays_of_central_liability_so_far", "persondays_central_liability",
        "central_liability_persondays", "central_liability", "persondays_of_central_liability"
    ],
    "women_persondays": [
        "women_persondays", "women_person_days", "persondays_women", "women_days"
    ],
    "sc_persondays": [
        "sc_persondays", "sc_person_days", "persondays_sc", "sc_days"
    ],
    "st_persondays": [
        "st_persondays", "st_person_days", "persondays_st", "st_days"
    ],
    "completed_works": [
        "number_of_completed_works", "completed_works", "works_completed", "works_finished"
    ],
    "ongoing_works": [
        "number_of_ongoing_works", "ongoing_works", "works_ongoing", "works_in_progress"
    ],
    "total_works_takenup": [
        "total_no_of_works_takenup", "total_works_takenup", "works_takenup", "total_works"
    ],
    "wages_lakh": [
        "wages", "wages_lakh", "wage_expenditure", "total_wages", "wages_paid"
    ],
    "material_lakh": [
        "material_and_skilled_wages", "material_lakh", "material_expenditure", "skilled_wages"
    ],
    "admin_expenditure_lakh": [
        "total_adm_expenditure", "admin_expenditure", "adm_expenditure", "admin_exp_lakh"
    ],
    "individuals_worked": [
        "total_individuals_worked", "individuals_worked", "total_individuals"
    ],
    "month": [
        "month", "reporting_month", "month_name", "reporting_period_month"
    ],
    "financial_year": [
        "fin_year", "financial_year", "fy", "reporting_fin_year", "year"
    ],
    "households_registered": [
        "households_registered", "hh_registered", "registered_hh", "households_demanded",
        "households_demanded_employment", "no_of_households_demanded_employment",
        "demanded_hh", "reg_hh", "total_no_of_jobcards_issued", "jobcards_issued"
    ],
    "households_employed": [
        "households_employed", "hh_employed", "households_provided_employment",
        "employed_hh", "no_of_households_offered_employment", "provided_employment",
        "total_households_worked", "households_worked"
    ],
    "person_days_generated": [
        "person_days_generated", "persondays_generated", "total_person_days_generated",
        "person_days", "persondays", "total_persondays", "persondays_in_lakh",
        "total_person_days_in_lakh", "person_days_offered_as_of_date"
    ],
    "person_days_target": [
        "person_days_target", "persondays_target", "target_persondays",
        "approved_labour_budget", "labour_budget", "target_person_days"
    ],
    "expenditure_lakh": [
        "expenditure_lakh", "total_expenditure", "expenditure", "total_exp",
        "total_exp_lakh", "expenditure_incurred_lakh", "exp_lakh", "wage_expenditure"
    ],
    "total_budget_lakh": [
        "total_budget_lakh", "budget_lakh", "total_budget", "allocated_budget",
        "budget_allocated", "approved_budget", "financial_allocation"
    ],
    "houses_target": [
        "houses_target", "target_houses", "mord_target", "physical_target",
        "target", "target_allocated"
    ],
    "houses_sanctioned": [
        "houses_sanctioned", "sanctioned_houses", "sanctioned", "total_sanctioned"
    ],
    "houses_in_progress": [
        "houses_in_progress", "in_progress", "under_construction", "houses_under_construction"
    ],
    "houses_completed": [
        "houses_completed", "completed_houses", "completed", "total_completed"
    ],
    "expenditure_cr": [
        "expenditure_cr", "expenditure_in_cr", "total_expenditure_cr",
        "expenditure", "exp_cr", "financial_expenditure_cr"
    ],
    "beneficiaries_identified": [
        "beneficiaries_identified", "beneficiaries", "total_beneficiaries", "identified_families"
    ],
    "cards_issued": [
        "cards_issued", "ayushman_cards", "ayushman_cards_issued", "golden_cards", "cards"
    ],
    "hospitalisations": [
        "hospitalisations", "hospitalizations", "hospital_admissions", "admissions", "preauthorizations"
    ],
    "claims_submitted": [
        "claims_submitted", "submitted_claims", "claims"
    ],
    "claims_settled": [
        "claims_settled", "settled_claims", "paid_claims"
    ],
    "total_schools": [
        "total_schools", "schools", "number_of_schools", "total_number_of_schools"
    ],
    "total_students": [
        "total_students", "students", "student_enrolment", "enrolment", "total_enrolment"
    ],
    "total_teachers": [
        "total_teachers", "teachers", "total_teaching_staff", "number_of_teachers"
    ],
    "gross_enrolment_ratio": [
        "gross_enrolment_ratio", "ger", "gross_enrolment"
    ],
    "net_enrolment_ratio": [
        "net_enrolment_ratio", "ner", "net_enrolment"
    ],
}


def normalize_string(s: str) -> str:
    """Normalize a column name for comparison (lowercase, alphanumeric + underscore)."""
    if not s:
        return ""
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def suggest_mapping(detected_columns: list[str], scheme_id: str) -> dict[str, str]:
    """
    Intelligently suggest a mapping from canonical scheme indicators to actual dataset columns.
    Returns: { canonical_indicator: actual_dataset_column }
    """
    indicators = SCHEME_INDICATOR_METADATA.get(scheme_id.lower(), {})
    suggested = {}
    used_columns = set()

    normalized_cols = {col: normalize_string(col) for col in detected_columns}

    # Pass 1: Exact matches or exact synonym matches
    for canonical in indicators:
        synonyms = SYNONYMS_MAP.get(canonical, [canonical])
        for actual_col, norm_col in normalized_cols.items():
            if actual_col in used_columns:
                continue
            if norm_col in synonyms:
                suggested[canonical] = actual_col
                used_columns.add(actual_col)
                break

    # Pass 2: Substring matches for unmapped indicators
    for canonical in indicators:
        if canonical in suggested:
            continue
        synonyms = SYNONYMS_MAP.get(canonical, [canonical])
        for actual_col, norm_col in normalized_cols.items():
            if actual_col in used_columns:
                continue
            for syn in synonyms:
                if len(syn) > 3 and (syn in norm_col or norm_col in syn):
                    suggested[canonical] = actual_col
                    used_columns.add(actual_col)
                    break
            if canonical in suggested:
                break

    return suggested


def validate_column_mapping(
    scheme_id: str,
    mapping: dict,
    detected_columns: list[str],
    sample_rows: list[dict] = None
) -> dict:
    """
    Validate a user-selected column mapping against a scheme's requirements.
    
    mapping can be either:
      - { "canonical_indicator": "actual_column" }
      - or { "actual_column": "canonical_indicator" }
      
    Returns a dict with:
      - is_valid: bool
      - missing_mandatory: list[str]
      - mapped_indicators: dict[str, str] (canonical -> actual)
      - unmapped_optional: list[str]
      - errors: list[str]
      - warnings: list[str]
    """
    indicators_meta = SCHEME_INDICATOR_METADATA.get(scheme_id.lower(), {})
    if not indicators_meta:
        return {
            "is_valid": False,
            "missing_mandatory": [],
            "mapped_indicators": {},
            "unmapped_optional": [],
            "errors": [f"Unknown scheme '{scheme_id}'."],
            "warnings": [],
        }

    detected_set = set(detected_columns)
    detected_normalized = {normalize_string(c): c for c in detected_columns}

    # Normalize mapping to canonical -> actual
    canonical_to_actual = {}
    for k, v in (mapping or {}).items():
        if not k or not v:
            continue
        # Case 1: key is canonical indicator
        if k in indicators_meta:
            canonical_to_actual[k] = v
        # Case 2: value is canonical indicator
        elif v in indicators_meta:
            canonical_to_actual[v] = k

    errors = []
    warnings = []
    missing_mandatory = []
    unmapped_optional = []

    # Check for mandatory indicators
    for ind_name, meta in indicators_meta.items():
        actual_col = canonical_to_actual.get(ind_name)
        if meta.get("required"):
            if not actual_col or actual_col.strip() == "":
                missing_mandatory.append(ind_name)
                errors.append(f"Mandatory indicator '{meta['label']}' ({ind_name}) is not mapped.")
        else:
            if not actual_col or actual_col.strip() == "":
                unmapped_optional.append(ind_name)
                warnings.append(f"Optional indicator '{meta['label']}' is not mapped; related metrics will be unavailable.")

    # Check that mapped actual columns exist in dataset
    actual_col_counts = {}
    for ind_name, actual_col in canonical_to_actual.items():
        if not actual_col:
            continue
        # Check existence
        if actual_col not in detected_set and normalize_string(actual_col) not in detected_normalized:
            errors.append(f"Column '{actual_col}' mapped to '{ind_name}' does not exist in the uploaded dataset.")
        
        actual_col_counts[actual_col] = actual_col_counts.get(actual_col, 0) + 1

    # Check that no two distinct mandatory indicators map to the exact same dataset column
    for col, count in actual_col_counts.items():
        if count > 1:
            mapped_to = [ind for ind, c in canonical_to_actual.items() if c == col]
            has_mandatory = any(indicators_meta.get(ind, {}).get("required") for ind in mapped_to)
            if has_mandatory:
                errors.append(
                    f"Dataset column '{col}' cannot be mapped to multiple indicators ({', '.join(mapped_to)})."
                )
            else:
                warnings.append(
                    f"Dataset column '{col}' is mapped to multiple optional indicators ({', '.join(mapped_to)})."
                )

    # Type compatibility check on sample rows if provided
    if sample_rows and len(sample_rows) > 0:
        for ind_name, actual_col in canonical_to_actual.items():
            if not actual_col or actual_col not in detected_set:
                continue
            meta = indicators_meta.get(ind_name, {})
            if meta.get("type") == "numeric":
                # Sample the values
                non_empty = [
                    str(row.get(actual_col, "")).strip()
                    for row in sample_rows
                    if row.get(actual_col) is not None and str(row.get(actual_col, "")).strip() != ""
                ]
                if non_empty:
                    numeric_convertible = 0
                    for val in non_empty:
                        clean_val = re.sub(r"[,\s₹$€]", "", val)
                        try:
                            float(clean_val)
                            numeric_convertible += 1
                        except ValueError:
                            pass
                    
                    ratio = numeric_convertible / len(non_empty)
                    if ratio < 0.3:
                        errors.append(
                            f"Column '{actual_col}' contains non-numeric text data (e.g., '{non_empty[0]}') and is incompatible with numeric indicator '{meta['label']}'."
                        )

    is_valid = len(errors) == 0

    return {
        "is_valid": is_valid,
        "missing_mandatory": missing_mandatory,
        "mapped_indicators": canonical_to_actual,
        "unmapped_optional": unmapped_optional,
        "errors": errors,
        "warnings": warnings,
    }
