# OrderByTokenPage Component - Learnings

## Component Structure

Created a public-facing order page component that allows customers to view and confirm their orders via a secure token link.

### States Implemented
1. **Loading**: Shows spinner while fetching order data
2. **Invalid**: Displays error when token is invalid/expired  
3. **Valid**: Shows order details with editable items (if status=draft)
4. **Submitted**: Success confirmation after order is confirmed

### API Integration
- Extended `use-public-order.ts` hook with mutations:
  - `useAddOrderItem` - POST /public/pedido/:token/items
  - `useDeleteOrderItem` - DELETE /public/pedido/:token/items/:itemId
  - `useConfirmPublicOrder` - POST /public/pedido/:token/confirmar

### Design Patterns Used
- Orange gradient theme (from-orange-50 to-stone-100)
- Card-based layout with rounded-2xl/rounded-3xl
- Mobile-first responsive design
- Sticky header with backdrop blur
- Fixed footer with confirm button

### File Locations
- Component: `packages/app/app/components/orders/order-by-token-page.tsx`
- Hook: `packages/app/app/hooks/use-public-order.ts`

### Key Features
- Editable only when order status is "draft"
- Shows customer info form for name, phone, delivery date, notes
- Item deletion with optimistic UI updates
- Proper error handling for API failures
