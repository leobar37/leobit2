name: Mobile Purchase Flow
slug: mobile-purchase-flow
description: Mobile test: login → ventas → customer search
trigger: "mobile purchase"

viewport:
  width: 375
  height: 812
  isMobile: true

steps:
  - name: Login on Mobile
    url: /login
    actions:
      - fill: "[data-testid='login-email']"
        value: "vendedor@avileo.com"
      - fill: "[data-testid='login-password']"
        value: "vendor123"
      - click: "[data-testid='login-submit']"
    expect:
      - visible: "[data-testid='bottom-nav']"
      - url: /dashboard

  - name: Navigate to Ventas
    actions:
      - click: "[data-testid='nav-ventas']"
    expect:
      - visible: "[data-testid='ventas-list']"
      - visible: "[data-testid='fab-new-sale']"

  - name: Open New Sale
    actions:
      - click: "[data-testid='fab-new-sale']"
    expect:
      - visible: "[data-testid='sale-form']"
      - visible: "[data-testid='customer-select-button']"

  - name: Search Customer
    actions:
      - click: "[data-testid='customer-select-button']"
      - fill: "[data-testid='customer-search-input']"
        value: "Carlos"
      - wait: 500
    expect:
      - visible: "[data-testid='customer-list']"

  - name: Select Customer and Product
    actions:
      - click: "[data-testid='customer-list-item']"
      - click: "[data-testid='product-selector-button']"
      - fill: "[data-testid='product-search']"
        value: "Huevo"
      - wait: 300
      - click: "[data-testid='product-option']"
      - fill: "[data-testid='quantity']"
        value: "5"
      - click: "[data-testid='add-to-cart']"
    expect:
      - visible: "[data-testid='cart-item']"

  - name: Verify Cart Total
    expect:
      - visible: "[data-testid='cart-total']"
      - visible: "[data-testid='payment-type-contado']"

  - name: Complete Contado Sale
    actions:
      - click: "[data-testid='payment-type-contado']"
      - click: "[data-testid='finalize-sale-button']"
    expect:
      - visible: "[data-testid='sale-success']"
