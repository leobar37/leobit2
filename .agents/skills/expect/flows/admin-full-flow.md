name: Admin Full Flow
slug: admin-full-flow
description: Complete admin flow: login → products → sales
trigger: "admin flow"

steps:
  - name: Login
    url: /login
    actions:
      - fill: "[data-testid='login-email']"
        value: "admin@avileo.com"
      - fill: "[data-testid='login-password']"
        value: "admin123"
      - click: "[data-testid='login-submit']"
    expect:
      - url: /dashboard
      - visible: "[data-testid='dashboard-welcome']"

  - name: Navigate to Products
    url: /productos
    actions:
      - click: "[data-testid='nav-productos']"
    expect:
      - visible: "[data-testid='product-list']"

  - name: Create Product
    actions:
      - click: "[data-testid='product-create-button']"
      - fill: "[data-testid='product-name-input']"
        value: "Pollo Entero Premium"
      - fill: "[data-testid='product-price-input']"
        value: "25.00"
      - click: "[data-testid='product-save-button']"
    expect:
      - visible: "[data-testid='product-created-toast']"

  - name: Navigate to Sales
    url: /ventas
    actions:
      - click: "[data-testid='nav-ventas']"
    expect:
      - visible: "[data-testid='sales-list']"

  - name: New Sale
    url: /ventas/nueva
    actions:
      - click: "[data-testid='new-sale-button']"
      - click: "[data-testid='customer-select']"
      - fill: "[data-testid='customer-search']"
        value: "Juan"
      - click: "[data-testid='customer-option-1']"
      - click: "[data-testid='add-product']"
      - fill: "[data-testid='product-search']"
        value: "Pollo"
      - click: "[data-testid='product-option-1']"
      - fill: "[data-testid='quantity-input']"
        value: "2"
      - click: "[data-testid='add-to-sale']"
      - click: "[data-testid='finalize-sale']"
    expect:
      - visible: "[data-testid='sale-success']"
