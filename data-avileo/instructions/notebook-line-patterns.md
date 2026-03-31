# Notebook Line Patterns

## Observed Patterns to Support

### 1. Date header

Example patterns:

- `Martes 10-2-26`
- standalone weekday + date at top of page
- date appearing in the middle of the image

Interpretation:

- create or switch to a new block
- normalize date when possible

### 2. Customer line with one sale fragment

Example pattern:

- customer name + amount or simple product notation + amount

Interpretation:

- likely `single_entry_line`
- one `sale` entry if meaning is clear

### 3. Customer line with multiple fragments

Example pattern:

- `17.6 + 19.8 + 10.5`
- product fragments plus trailing marked amount

Interpretation:

- `multi_entry_line`
- keep one `rawLineText`
- split into multiple `entries[]` and preserve `operations[]`

### 4. Pending Yape note

Example pattern:

- `xyapear`
- `x yapear`

Interpretation:

- pending Yape payment
- not a confirmed payment
- usually `payment.pendingYape = true`

### 5. Confirmed Yape payment

Example pattern:

- `yapeo`
- similar handwriting variants such as `yapco` when visually equivalent

Interpretation:

- confirmed Yape payment
- `payment.paymentMethod = yape`
- `payment.paymentStatus = paid`

### 6. No payment marker

Example pattern:

- `NP`

Interpretation:

- `payment.noPago = true`
- use `paymentStatus = no_pago`

### 7. Previous payment or carry-over note

Example pattern:

- `pago anterior`
- `actual 88.2`

Interpretation:

- contextual note, not automatically a new sale
- likely `previous_payment_reference` or `balance_reference`
- usually requires review

### 8. Circled amount

Example pattern:

- amount enclosed in a circle or strongly highlighted

Interpretation:

- preserve as `highlightedAmount`
- do not assume it is the final debt or a payment without stronger evidence

### 9. Unknown trailing markers

Example pattern:

- `P`
- `H`
- `CH`
- `ND`

Interpretation:

- keep marker evidence
- add review flag
- do not force a product or payment meaning yet

### 10. Detached text outside main line

Example pattern:

- annotations floating away from the line body
- marks in margins without clear linkage

Interpretation:

- ignore by default
- store only in `ignoredDetachedText` if intentionally discarded
