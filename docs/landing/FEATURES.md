# Landing Page - Feature Details

> Detailed feature descriptions for the Avileo landing page.

---

## 🎯 Core Features (Offline-First)

### 1. Sales Management

| Feature | Description | Offline |
|---------|-------------|---------|
| **New Sale** | Register sales with or without customer | ✅ 100% |
| **Smart Calculator** | Calculate total from weight × price/kg | ✅ 100% |
| **Tara Deduction** | Subtract container weight | ✅ 100% |
| **Cash/Credit** | Support for both payment types | ✅ 100% |
| **Sale History** | View all sales with filters | ✅ 100% |
| **Sale Details** | View individual sale information | ✅ 100% |
| **Edit Sales** | Modify recent sales | ✅ 100% |
| **Cancel Sales** | Cancel sales with reason | ✅ 100% |

**Example Flow:**
```
Input: 8.5kg (gross) - 1.5kg (tara) = 7kg (net)
Price: S/12.00/kg
Result: S/84.00 total
```

---

### 2. Customer Management

| Feature | Description | Offline |
|---------|-------------|---------|
| **Customer Database** | Full CRUD operations | ✅ 100% |
| **Search** | Find by name or DNI | ✅ 100% |
| **Filters** | All, with debt, up-to-date | ✅ 100% |
| **Account Receivable** | Track customer debts | ✅ 100% |
| **Tags** | Organize with custom tags | ✅ 100% |
| **Bulk Assign Tags** | Assign tags to multiple customers | ✅ 100% |

**Debt Indicators:**
- 🔴 Red badge = Customer has pending debt
- 🟢 Green badge = Customer is up-to-date

---

### 3. Payment Registration (Abonos)

| Feature | Description | Offline |
|---------|-------------|---------|
| **Register Payment** | Record partial/full payments | ✅ 100% |
| **Quick Amounts** | Buttons: All, S/50, S/100, S/200 | ✅ 100% |
| **Payment Methods** | Cash, Yape, Plin, Transfer | ✅ 100% |
| **Independent Payments** | Pay debt without new purchase | ✅ 100% |
| **Payment History** | View all payments per customer | ✅ 100% |

---

### 4. Inventory & Distribution

| Feature | Description | Offline |
|---------|-------------|---------|
| **Daily Assignment** | Assign inventory to vendors | ⚠️ Admin only |
| **Stock Control** | Track kilos assigned vs sold | ✅ 100% |
| **Return Tracking** | Track unsold inventory | ✅ 100% |
| **Vendor Status** | See who is active/inactive | ✅ 100% |
| **Multiple Modes** | Inventory, Free, Pre-order, Hybrid | ⚠️ Config |

**Operation Modes:**
- **Inventario Propio**: Full stock control
- **Modo Libre**: Sales only, no stock tracking
- **Pedidos**: Pre-order system
- **Mixto**: Combination of above

---

### 5. Calculator

| Feature | Description | Offline |
|---------|-------------|---------|
| **Smart Calculation** | Enter 2 of 3, get the 3rd | ✅ 100% |
| **Tara Support** | Container weight deduction | ✅ 100% |
| **Direct to Sale** | Use result in new sale | ✅ 100% |
| **History** | Recent calculations | ✅ 100% |

**Calculation Modes:**
1. Total + Price/kg → Calculates Weight
2. Total + Weight → Calculates Price/kg
3. Price/kg + Weight → Calculates Total

---

### 6. Admin Dashboard

| Feature | Description | Offline |
|---------|-------------|---------|
| **Today's Sales** | Total revenue today | ⚠️ Cached |
| **Transaction Count** | Number of sales | ⚠️ Cached |
| **Receivables** | Total debt from customers | ⚠️ Cached |
| **Active Sellers** | Vendors online/offline | ✅ Via sync |
| **Sales Chart** | Sales by hour | ⚠️ Cached |
| **Export Excel** | Download reports | ⚠️ Online |

---

### 7. Reports

| Feature | Description | Offline |
|---------|-------------|---------|
| **Date Range** | Filter by start/end date | ✅ 100% |
| **Total Sales** | Sum of sales in period | ✅ 100% |
| **Profit Calculation** | Sales - Purchases | ✅ 100% |
| **Top Customers** | Ranked by volume | ✅ 100% |
| **Sales vs Purchases** | Comparison chart | ✅ 100% |
| **Export Excel** | Download .xlsx file | ⚠️ Online |

---

### 8. User Management

| Feature | Description | Offline |
|---------|-------------|---------|
| **Create Users** | Add new vendors/admins | ⚠️ Online |
| **Roles** | Admin / Vendor | ⚠️ Online |
| **Permissions** | Role-based access | ⚠️ Online |
| **Auto Password** | System generates password | ⚠️ Online |
| **Email Credentials** | Send login info | ⚠️ Online |

---

### 9. Configuration

| Feature | Description | Offline |
|---------|-------------|---------|
| **Operation Mode** | Select business type | ⚠️ Online |
| **Default Price** | Set default price/kg | ⚠️ Online |
| **Currency** | PEN, USD, etc. | ⚠️ Online |
| **Timezone** | Set local timezone | ⚠️ Online |
| **Inventory Control** | Toggle stock tracking | ⚠️ Online |
| **Distribution** | Toggle daily assignments | ⚠️ Online |

---

### 10. WhatsApp Integration

| Feature | Description | Offline |
|---------|-------------|---------|
| **Share Sale Receipt** | Send sale receipt via WhatsApp | ✅ (opens app) |
| **Share Payment Receipt** | Send payment receipt via WhatsApp | ✅ (opens app) |
| **QR Code Generation** | Generate QR for customer to view receipt | ✅ |
| **Custom Templates** | Business can customize message templates | ⚠️ Online |
| **Message History** | View sent WhatsApp messages | ⚠️ Online |

**How it works:**
1. Complete a sale or payment
2. Tap "Share" or "Enviar"
3. Choose WhatsApp
4. Pre-filled message with receipt details
5. Customer receives instantly

---

### 11. Daily Distribution (Inventario)

| Feature | Description | Offline |
|---------|-------------|---------|
| **Create Distribution** | Assign inventory to vendors | ⚠️ Admin only |
| **Daily Assignment** | Kilos per vendor per day | ⚠️ Admin only |
| **Track Sold** | Monitor kilos sold vs assigned | ✅ 100% |
| **Track Returns** | Track unsold inventory | ✅ 100% |
| **Close Distribution** | End of day reconciliation | ✅ 100% |
| **Vendor Status** | See who is active/inactive | ✅ Via sync |

**Flow:**
```
Admin assigns 50kg to Juan
          ↓
Juan receives on his mobile (sync)
          ↓
Juan sells throughout the day
          ↓
System tracks: 50kg assigned → 35kg sold → 15kg returned
          ↓
Close of day → Final inventory reconciliation
```

---

### 12. Collections (Cobros)

| Feature | Description | Offline |
|---------|-------------|---------|
| **Register Payment** | Record partial/full payments | ✅ 100% |
| **Quick Amounts** | Buttons: All, S/50, S/100, S/200 | ✅ 100% |
| **Payment Methods** | Cash, Yape, Plin, Transfer | ✅ 100% |
| **Photo Proof** | Attach photo of payment | ✅ 100% |
| **Debt Classification** | Color-coded by age | ✅ 100% |
| **Debtors Report** | List all debtors with amounts | ✅ 100% |

**Debt Status Indicators:**
- 🟢 Green: Up to date (no debt)
- 🟡 Yellow: 7-15 days old
- 🔴 Red: More than 15 days old

---

### 10. Sync & Connectivity

| Feature | Description | Offline |
|---------|-------------|---------|
| **Auto Sync** | Background sync every 30s | ✅ |
| **Manual Sync** | Force sync button | ✅ |
| **Sync Status** | Real-time indicators | ✅ |
| **Offline Indicator** | Always visible | ✅ |
| **Pending Queue** | View pending operations | ✅ |
| **Error Handling** | Retry failed syncs | ✅ |
| **WiFi Only** | Optional sync restriction | ✅ |

**Status Indicators:**
- 🟢 Green = Synced
- 🟡 Yellow = Pending
- 🔴 Red = Sync error

---

## 🔧 Technical Features

### Authentication
- JWT-based authentication
- Token valid for 24-48 hours
- Secure session management

### Multi-Tenancy
- Support for multiple businesses
- Isolated data per business
- Admin per business

### WhatsApp Integration
- Share sale receipts via WhatsApp
- Quick customer notification

---

## 📱 Mobile Features

All vendor screens are designed for:
- **Viewport**: 320px - 428px
- **Touch targets**: Minimum 44x44px
- **Bottom navigation**: 4 items (Home, Calculator, Customers, History)
- **Offline-first**: All operations work without internet

---

## 🖥️ Desktop Features

Admin screens designed for:
- **Viewport**: 1024px+
- **Sidebar navigation**: Fixed left sidebar
- **Real-time data**: When online
- **Responsive**: Works on tablet (768px+)

---

## 🚀 Additional Features

### File & Asset Management
- Image uploads for customers/products
- File queue for offline uploads

### Notifications
- Push notifications for sync events
- Alert for pending operations

### Analytics
- Seller performance tracking
- Sales trends
- Customer behavior

---

## 📋 Feature Comparison by Plan

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Users | 1 | 5 | Unlimited |
| Offline Sales | ✅ | ✅ | ✅ |
| Offline Customers | ✅ | ✅ | ✅ |
| Inventory Control | ❌ | ✅ | ✅ |
| Distribution | ❌ | ✅ | ✅ |
| Reports | Basic | Full | Full |
| Export Excel | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |
| Custom Domain | ❌ | ❌ | ✅ |

---

## 🔄 Sync Capabilities

| Operation | Local Storage | Auto Sync | Manual Sync |
|-----------|--------------|-----------|-------------|
| New Sale | ✅ Immediate | ✅ 30s | ✅ Button |
| New Customer | ✅ Immediate | ✅ 30s | ✅ Button |
| Payment | ✅ Immediate | ✅ 30s | ✅ Button |
| Inventory Update | ✅ Immediate | ✅ 30s | ✅ Button |

---

*Last updated: 2026-03-13*
