# Notebook Extraction Guidelines

## Scope

These rules apply to handwritten notebook images in `data-avileo/JUAVIK/`.

## Core Principles

- Preserve the original meaning of each notebook line before normalization.
- Keep `rawLineText` exactly as read.
- Treat one physical line as a container that may hold multiple business events.
- Ignore detached text outside the main line by default.
- Prefer explicit uncertainty flags over forced interpretation.

## Page and Block Rules

### Date detection

- Detect every explicit date header found in the image.
- A single image may contain more than one date block.
- If a new date appears mid-page, start a new block.
- If a block has no explicit date but clearly continues from the previous dated block, inherit the previous block date and mark `inheritedFromPreviousBlock: true`.

### Block segmentation

Split an image into blocks when any of the following happens:

- a new date header appears
- the page clearly starts a new section of customers under a new day
- the content changes from carry-over notes into a fresh day ledger

## Line Parsing Rules

### Main line extraction

For each visible notebook line:

1. capture `rawLineText`
2. assign `lineType`
3. detect customer, entries, items, operations, amounts, payment hints, and markers
4. add `reviewFlags` when meaning is ambiguous

### Allowed line types

- `single_entry_line`
- `multi_entry_line`
- `carry_over_line`
- `date_header_line`
- `note_only_line`
- `unknown_line`

### Entry splitting

A single physical line must remain one `rawLineText`, but split into multiple `entries[]` when it contains more than one business meaning.

Examples:

- sale + balance reference
- sale + pending Yape note
- previous payment reference + current balance
- multiple sale fragments in one handwritten line

Do not merge multiple amounts into one final total unless the handwriting clearly states a single result.

## Payment Semantics

Use only these statuses:

- `paid`
- `pending_yape`
- `no_pago`
- `partial`
- `unknown`

Interpretation rules:

- `yapeo` means payment was made by Yape
- `xyapear` or `x yapear` means payment is still pending by Yape
- `NP` means no payment
- `pago anterior` means previous payment reference
- `actual` may indicate carried balance or current amount and should usually trigger review unless fully clear

## Detached Text Rule

Text or marks outside the main business line should be ignored by default and stored only in `ignoredDetachedText` with a reason such as `outside-main-line`.

## Customer and Product Normalization

- Keep the raw customer or product text unchanged.
- Add `normalizedCandidate` only as a suggestion.
- Use `similarTo[]` for close variants.
- Never auto-merge customers or products only because they look similar.

Examples of likely similarity-only cases:

- `Blady` / `Glady`
- `hvs` / `huevos`
- `aceit` / `aceite`

## Ambiguity Rules

Add `reviewFlags` when any of these happen:

- customer name is unclear
- multiple totals compete in the same line
- circled amount meaning is unclear
- symbols like `P`, `H`, `CH`, `ND` are present without strong context
- block date is inherited rather than explicit
- pass outputs disagree structurally or semantically

## Reconciliation Rules

Two independent passes must be produced for every image using the same schema.

Treat as reconciliation conflicts when passes disagree on:

- number of blocks
- detected date for a block
- number of lines
- `lineType`
- number of `entries[]`
- customer identity
- amount or payment meaning

## Mapping Hints for Later Import

- `sale` maps to a sale candidate
- `payment_confirmed` maps to a payment candidate
- `pending_yape_payment` is not a confirmed payment
- `previous_payment_reference` is contextual evidence, not an automatic payment record
- `balance_reference` is contextual unless supported by clearer evidence
