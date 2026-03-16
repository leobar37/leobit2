# Validation Contract: Visitas + Grupos de Clientes

## Area: Customer Groups (Backend)

### VAL-GROUP-001: Create customer group
A user creates a new customer group with a name and the group is saved in the database.
Evidence: API POST /api/groups returns 201 with created group

### VAL-GROUP-002: List customer groups
A user fetches all customer groups for their business and receives an array of groups.
Evidence: API GET /api/groups returns 200 with array

### VAL-GROUP-003: Add customers to group
A user adds multiple customers to a group and the relationships are persisted.
Evidence: API POST /api/groups/:id/members returns 200

### VAL-GROUP-004: Remove customer from group
A user removes a customer from a group and the relationship is deleted.
Evidence: API DELETE /api/groups/:id/members/:customerId returns 204

### VAL-GROUP-005: Delete customer group
A user deletes a group and all its member relationships are cascade deleted.
Evidence: API DELETE /api/groups/:id returns 204

## Area: Visits (Backend)

### VAL-VISIT-001: Create visit for single customer
A user creates a visit linked to a distribution and customer, visit is saved with pending status.
Evidence: API POST /api/visitas returns 201 with visita data

### VAL-VISIT-002: Create multiple visits from group
A user creates visits for all customers in a group for a distribution, all visits are created.
Evidence: API POST /api/visitas/bulk returns 201 with multiple visits created

### VAL-VISIT-003: List visits by distribution
A user fetches all visits for a distribution and receives them ordered by status.
Evidence: API GET /api/visitas?distribucionId=:id returns 200

### VAL-VISIT-004: Mark visit as purchased
A user updates a visit status to "compro" and optionally links a sale.
Evidence: API PATCH /api/visitas/:id returns 200 with updated status

### VAL-VISIT-005: Mark visit as not purchased with reason
A user updates a visit status to "no_compra" with a predefined or custom reason.
Evidence: API PATCH /api/visitas/:id with motivo returns 200

### VAL-VISIT-006: Visit status enum validation
API rejects invalid status values for visits.
Evidence: API PATCH /api/visitas/:id with invalid status returns 400

## Area: Customer Groups (Frontend)

### VAL-GROUP-FE-001: Group list page renders
User navigates to /grupos and sees list of groups with member counts.
Evidence: Page loads without errors, shows group cards

### VAL-GROUP-FE-002: Create group form works
User fills form, submits, and new group appears in list.
Evidence: Form submits, success toast, group in list

### VAL-GROUP-FE-003: Add customers to group UI
User can select customers from list and add them to group.
Evidence: Multi-select works, selected customers shown

### VAL-GROUP-FE-004: Group detail shows members
User clicks group and sees list of member customers.
Evidence: Members list renders correctly

## Area: Visits (Frontend)

### VAL-VISIT-FE-001: Visits page linked to active distribution
User with active distribution sees visits page with distribution context.
Evidence: Page loads with distribution info

### VAL-VISIT-FE-002: Visit selector shows customers and groups
User can choose between individual customers or group selection.
Evidence: Both selection modes work

### VAL-VISIT-FE-003: Visit list shows status indicators
Visits are displayed with color-coded status (pendiente/compro/no_compra).
Evidence: Visual status indicators visible

### VAL-VISIT-FE-004: Quick action - generate sale
User clicks "Generar venta" on a visit and sale modal opens.
Evidence: Sale form opens with customer pre-filled

### VAL-VISIT-FE-005: Quick action - mark no purchase
User clicks "No compró" and can select reason.
Evidence: Reason selector appears, submit works

## Area: Toolbar Integration

### VAL-TOOLBAR-001: Visits quick access in toolbar
Toolbar shows visits button for quick access.
Evidence: Toolbar renders visits icon/button

### VAL-TOOLBAR-002: Toolbar visits opens correct page
Clicking toolbar visits button navigates to visits page.
Evidence: Navigation to /visitas works

## Cross-Area Flows

### VAL-CROSS-001: Create visits from group selection
User selects a group in visits page, confirms, and visits are created for all group members.
Evidence: Visits created for each group member

### VAL-CROSS-002: Sale generated from visit preserves relationship
User creates a sale from a visit, the sale is linked in the visit record.
Evidence: Visit.saleId points to created sale

### VAL-CROSS-003: Offline visit creation syncs when online
User creates visits while offline, they sync when connection is restored.
Evidence: Pending visits appear in backend after sync
