# Possible Duplicate/Redundant Documentation Files

This document lists groups of files in the docs folder (and subfolders, excluding archive/) that are potentially duplicates, redundant, or overlapping in content. Each group includes actionable recommendations for review, merging, archiving, or deletion. For specifications vs. guides, keep the most current and actionable version.

---

## Testing Documentation
- MANUAL_TESTING_GUIDE.md
- NOTIFICATION_SYSTEM_TESTING.md
- testing/

**Recommendation:**
- Review MANUAL_TESTING_GUIDE.md and NOTIFICATION_SYSTEM_TESTING.md for overlap. Merge notification-specific content into the main guide if possible. Archive or delete redundant sections. Retain testing/ folder for detailed test cases.

---

## Gap Analysis
- GAP_REMEDIATION_PLAN.md
- HOLISTIC_GAP_ANALYSIS.md
- WIND_FORECASTING_GAP_ANALYSIS.md
- SPRINT_19_IMPACT_ANALYSIS.md

**Recommendation:**
- Merge holistic and wind forecasting gap analyses into a single comprehensive gap analysis document. Keep SPRINT_19_IMPACT_ANALYSIS.md if it contains unique sprint-specific insights. Archive GAP_REMEDIATION_PLAN.md if its content is fully covered elsewhere.

---

## Data Dictionary & Retention
- DATA_DICTIONARY.md
- DATA_RETENTION_POLICY.md
- DATA_RETENTION_IMPLEMENTATION.md

**Recommendation:**
- Merge retention policy and implementation into a single document. Ensure DATA_DICTIONARY.md is up to date and not duplicating retention details.

---

## Security Documentation
- security/
- CRITICAL_SECURITY_FIXES.md (backend)

**Recommendation:**
- Consolidate security folder and CRITICAL_SECURITY_FIXES.md. Retain only the most current actionable security guidance.

---

## Deployment & DevOps
- deployment/
- devops/

**Recommendation:**
- Merge deployment and devops documentation if they overlap. Keep the most current and actionable version.

---

## Mobile Documentation
- mobile/

**Recommendation:**
- Review for overlap with user guides or training. Merge or archive as needed.

---

## Training Documentation
- training/

**Recommendation:**
- Ensure training docs are not duplicating user guides. Merge or archive as needed.

---

## User Guides
- user-guide/
- guides/

**Recommendation:**
- Merge guides and user-guide content. Keep the most current and actionable version.

---

## Design Documentation
- design/
- architecture/

**Recommendation:**
- Merge design and architecture documentation if overlapping. Retain the most current version.

---

## ML Model Cards
- DCMMS-158_Energy_Bias_Fix.md
- models_output.json (backend)
- models.json (backend)

**Recommendation:**
- Ensure model card markdown and JSON files are not duplicating information. Merge or archive as needed.

---

## Miscellaneous
- documentation-review-report.md
- TROUBLESHOOTING.md

**Recommendation:**
- Keep documentation-review-report.md for audit purposes. Retain TROUBLESHOOTING.md if it contains unique actionable guidance.

---

**Next Steps:**
- Review each group for content overlap.
- Merge, archive, or delete redundant documents.
- For specifications vs. guides, keep the most current and actionable version.
- Update this document as actions are completed.
