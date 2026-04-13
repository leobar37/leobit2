name: Vendor Sale Flow
slug: vendor-sale-flow
description: Vendor flow: login → new sale → payment
trigger: "vendor sale"

steps:
  - name: Login as Vendor
    url: /login
    actions:
      - fill: "[data-testid='login-email']"
        value: "vendedor@avileo.com"
      - fill: "[data-testid='login-password']"
        value: "vendor123"
      - click: "[data-testid='login-submit']"
    expect:
      - url: /dashboard

  - name: Navigate to New Sale
    url: /ventas/nueva
    actions:
      - click: "[data-testid='nav-ventas']"
      - click: "[data-testid='fab-new-sale']"
    expect:
      - visible: "[data-testid='sale-form']"

  - name: Select Customer
    actions:
      - click: "[data-testid='customer-select-button']"
      - fill: "[data-testid='customer-search-input']"
        value: "Maria"
      - click: "[data-testid='customer-list-item']"
    expect:
      - visible: "[data-testid='selected-customer']"

  - name: Add Product
    actions:
      - click: "[data-testid='product-selector-button']"
      - fill: "[data-testid='product-search']"
        value: "Pollo"
      - click: "[data-testid='product-option']"
      - fill: "[data-testid='quantity']"
        value: "3"
      - click: "[data-testid='add-to-cart']"
    expect:
      - visible: "[data-testid='cart-item']"

  - name: Finalize Credit Sale
    actions:
      - click: "[data-testid='payment-type-credit']"
      - click: "[data-testid='finalize-sale-button']"
    expect:
      - visible: "[data-testid='sale-confirmation']"
      - visible: "[data-testid='deuda-badge']"

  - name: Register Abono
    actions:
      - click: "[data-testid='register-abono-button']"
      - fill: "[data-testid='abono-amount']"
        value: "50"
      - click: "[data-testid='abono-submit']"
    expect:
      - visible: "[data-testid='saldo-actualizado']"
