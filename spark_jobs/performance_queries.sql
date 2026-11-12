-- GovPulse Performance Queries
-- ================================
-- These SQL queries are designed to run against Spark temporary views.
-- Views are registered from processed DataFrames in each analysis module.
-- All queries prevent division-by-zero using CASE WHEN guards.


-- ============================================================
-- 1. Scheme-wise indicator aggregation (generic)
-- ============================================================
-- Replace <view>, <value_col>, <target_col> at runtime.
SELECT
    scheme_id,
    SUM(<value_col>)                                             AS total_value,
    SUM(<target_col>)                                            AS total_target,
    CASE
        WHEN SUM(<target_col>) > 0
        THEN ROUND(SUM(<value_col>) / SUM(<target_col>) * 100, 2)
        ELSE NULL
    END                                                          AS achievement_pct
FROM <view>
GROUP BY scheme_id;


-- ============================================================
-- 2. State-wise performance
-- ============================================================
SELECT
    state,
    SUM(person_days_generated)                                   AS person_days,
    SUM(person_days_target)                                      AS person_days_target,
    CASE
        WHEN SUM(person_days_target) > 0
        THEN ROUND(SUM(person_days_generated) / SUM(person_days_target) * 100, 2)
        ELSE NULL
    END                                                          AS achievement_pct,
    SUM(expenditure_lakh)                                        AS total_expenditure,
    SUM(total_budget_lakh)                                       AS total_budget,
    CASE
        WHEN SUM(total_budget_lakh) > 0
        THEN ROUND(SUM(expenditure_lakh) / SUM(total_budget_lakh) * 100, 2)
        ELSE NULL
    END                                                          AS budget_utilisation_pct
FROM mgnrega
WHERE state IS NOT NULL AND state != 'Unknown'
GROUP BY state
ORDER BY achievement_pct DESC NULLS LAST;


-- ============================================================
-- 3. District-wise rankings (MGNREGA)
-- ============================================================
SELECT
    state,
    district,
    SUM(person_days_generated)                                   AS person_days,
    SUM(person_days_target)                                      AS target,
    CASE
        WHEN SUM(person_days_target) > 0
        THEN ROUND(SUM(person_days_generated) / SUM(person_days_target) * 100, 2)
        ELSE NULL
    END                                                          AS achievement_pct
FROM mgnrega
WHERE district IS NOT NULL AND district != 'Unknown'
GROUP BY state, district
ORDER BY achievement_pct DESC NULLS LAST;


-- ============================================================
-- 4. Top 10 Performing Districts
-- ============================================================
SELECT
    state,
    district,
    SUM(person_days_generated)                                   AS person_days,
    ROUND(SUM(person_days_generated) / SUM(person_days_target) * 100, 2) AS achievement_pct
FROM mgnrega
WHERE person_days_target > 0 AND district IS NOT NULL
GROUP BY state, district
ORDER BY achievement_pct DESC NULLS LAST
LIMIT 10;


-- ============================================================
-- 5. Bottom 10 Performing Districts
-- ============================================================
SELECT
    state,
    district,
    SUM(person_days_generated)                                   AS person_days,
    ROUND(SUM(person_days_generated) / SUM(person_days_target) * 100, 2) AS achievement_pct
FROM mgnrega
WHERE person_days_target > 0 AND district IS NOT NULL
GROUP BY state, district
ORDER BY achievement_pct ASC NULLS LAST
LIMIT 10;


-- ============================================================
-- 6. PMAY-G Completion Status
-- ============================================================
SELECT
    state,
    SUM(houses_target)                                           AS target,
    SUM(houses_sanctioned)                                       AS sanctioned,
    SUM(houses_completed)                                        AS completed,
    SUM(houses_in_progress)                                      AS in_progress,
    CASE
        WHEN SUM(houses_target) > 0
        THEN ROUND(SUM(houses_completed) / SUM(houses_target) * 100, 2)
        ELSE NULL
    END                                                          AS completion_pct,
    CASE
        WHEN SUM(houses_target) > 0
        THEN ROUND(SUM(houses_sanctioned) / SUM(houses_target) * 100, 2)
        ELSE NULL
    END                                                          AS sanction_pct
FROM pmayg
WHERE state IS NOT NULL
GROUP BY state
ORDER BY completion_pct DESC NULLS LAST;


-- ============================================================
-- 7. Budget Utilisation
-- ============================================================
SELECT
    state,
    SUM(expenditure_lakh)                                        AS expenditure,
    SUM(total_budget_lakh)                                       AS budget,
    CASE
        WHEN SUM(total_budget_lakh) > 0
        THEN ROUND(SUM(expenditure_lakh) / SUM(total_budget_lakh) * 100, 2)
        ELSE NULL
    END                                                          AS utilisation_pct
FROM mgnrega
WHERE state IS NOT NULL
GROUP BY state
ORDER BY utilisation_pct DESC NULLS LAST;


-- ============================================================
-- 8. Year-wise Trend Analysis
-- ============================================================
SELECT
    reporting_year,
    SUM(person_days_generated)                                   AS person_days,
    SUM(person_days_target)                                      AS target,
    CASE
        WHEN SUM(person_days_target) > 0
        THEN ROUND(SUM(person_days_generated) / SUM(person_days_target) * 100, 2)
        ELSE NULL
    END                                                          AS achievement_pct
FROM mgnrega
WHERE reporting_year IS NOT NULL
GROUP BY reporting_year
ORDER BY reporting_year;


-- ============================================================
-- 9. Underperformance Detection
-- ============================================================
SELECT
    state,
    district,
    ROUND(SUM(person_days_generated) / SUM(person_days_target) * 100, 2) AS achievement_pct,
    CASE
        WHEN SUM(person_days_target) <= 0 THEN 'No Target Data'
        WHEN SUM(person_days_generated) / SUM(person_days_target) * 100 >= 80 THEN 'On Track'
        WHEN SUM(person_days_generated) / SUM(person_days_target) * 100 >= 50 THEN 'Needs Attention'
        ELSE 'Low Achievement'
    END                                                          AS performance_band
FROM mgnrega
WHERE district IS NOT NULL AND person_days_target > 0
GROUP BY state, district
HAVING achievement_pct < 80
ORDER BY achievement_pct ASC;


-- ============================================================
-- 10. Data Quality Summary
-- ============================================================
SELECT
    'mgnrega'                                                    AS scheme,
    COUNT(*)                                                     AS total_records,
    SUM(CASE WHEN state IS NULL THEN 1 ELSE 0 END)               AS null_state,
    SUM(CASE WHEN district IS NULL THEN 1 ELSE 0 END)            AS null_district,
    SUM(CASE WHEN person_days_generated IS NULL THEN 1 ELSE 0 END) AS null_person_days,
    SUM(CASE WHEN person_days_target IS NULL THEN 1 ELSE 0 END)  AS null_target
FROM mgnrega;


-- ============================================================
-- 11. UDISE Pupil-Teacher Ratio by State
-- ============================================================
SELECT
    state,
    SUM(total_schools)                                           AS schools,
    SUM(total_students)                                          AS students,
    SUM(total_teachers)                                          AS teachers,
    CASE
        WHEN SUM(total_teachers) > 0
        THEN ROUND(SUM(total_students) / SUM(total_teachers), 2)
        ELSE NULL
    END                                                          AS pupil_teacher_ratio
FROM udise
WHERE state IS NOT NULL
GROUP BY state
ORDER BY pupil_teacher_ratio ASC;


-- ============================================================
-- 12. PM-JAY Hospitalisation Coverage
-- ============================================================
SELECT
    state,
    SUM(beneficiaries_identified)                                AS beneficiaries,
    SUM(cards_issued)                                            AS cards,
    SUM(hospitalisations)                                        AS hospitalisations,
    CASE
        WHEN SUM(beneficiaries_identified) > 0
        THEN ROUND(SUM(cards_issued) / SUM(beneficiaries_identified) * 100, 2)
        ELSE NULL
    END                                                          AS card_coverage_pct,
    SUM(claims_submitted)                                        AS claims_submitted,
    SUM(claims_settled)                                          AS claims_settled,
    CASE
        WHEN SUM(claims_submitted) > 0
        THEN ROUND(SUM(claims_settled) / SUM(claims_submitted) * 100, 2)
        ELSE NULL
    END                                                          AS claims_settlement_pct
FROM pmjay
WHERE state IS NOT NULL
GROUP BY state
ORDER BY hospitalisations DESC;
