# JUAVIK Canonical Schema Patterns

## Date Format Patterns
- "Sábado 7-2-26" → normalized "2026-02-07"
- "Martes 10-2-26" → normalized "2026-02-10"
- "Miércoles 11-2-26" → normalized "2026-02-11"
- "Jueves 12-2-26" → normalized "2026-02-12"
- "Lunes 13-2-26" → normalized "2026-02-13"

## Payment Marker Conventions
- **P** = Paid (pagado)
- **NP** = No payment (no pagado)
- **XY** = Pending Yape (x yapear)
- **yapeo** = Yape payment confirmed
- **RP** = Unclear variant, possibly P

## Line Type Patterns
- "single_entry_line" = One amount per line with customer
- "multi_entry_line" = Multiple amounts/operations per line
- "header_line" = Customer name only, no amounts
- "carry_over_line" = Reference to previous balance

## Common Product Patterns
- "x10.5", "x10.6", "x10.7", "x10.8", "x10.9" = Unit price multipliers
- "x11", "x11.3", "x11.5", "x12" = Unit price variations
- "H=13", "CH=35" = Abbreviated product codes (H=head, CH=chicken?)
- "1/6", "1/4" = Fractional quantities

## Review Flag Patterns
- "customer_name_unclear" - Handwriting ambiguous
- "marker_P_unclear" - P marker position/legibility unclear
- "amount_calculation_mismatch" - Arithmetic doesn't match
- "multiple_totals_unclear" - Multiple amounts on line
- "block_date_inherited" - Date carried from previous block
- "line_absent_in_pass2" - Not seen in second pass
- "yapeo_mark_tachado" - Yapeo appears crossed out
- "spelling_uncertain" - Name spelling ambiguous

## Confidence Scoring Guidelines
- 0.9+ = Clear handwriting, unambiguous
- 0.8-0.89 = Mostly clear, minor uncertainties
- 0.7-0.79 = Partially unclear, some interpretation needed
- 0.6-0.69 = Significant ambiguity
- 0.5-0.59 = Highly uncertain, best guess
- <0.5 = Unclear, placeholder data

## Schema Structure Reminders
- All numeric amounts as floats (not strings)
- ISO date format for normalizedDate (YYYY-MM-DD)
- Empty arrays [] for fields with no data
- null (not undefined) for missing optional values
- reviewFlags as array of strings
- operations array for multi-step calculations
