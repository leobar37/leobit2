# Water Vertical Customer Profiles Context

## Overview

Avileo now supports selecting a business mode during business creation, including `polleria` and `agua`. The current architecture can identify the active vertical through `businessMode` and mode flags, but the operational data model is still centered on polleria. This plan defines how to make the water delivery vertical useful for bidon sellers without polluting the generic `customers` table with fields that only apply to one business type.

The guiding rule is: `customers` stores the universal customer identity, while vertical-specific operational data lives in typed profile tables and workflow tables owned by the vertical.

## Background

The water business documentation describes delivery frequency, customer subscriptions, container tracking, deposits, and recurring routes as core requirements. The current codebase already has customers, sales, distributions, visits, payments, and business-mode flags, but those screens mostly assume polleria language and polleria workflows.

The existing `customCustomerFields` flag can help conditionally render UI, but it should not become the persistence model. Persisted data that drives routes, reports, deposits, or container balances must be typed, validated, tenant-scoped, sync-aware, and testable.

## Goal

Implement a durable architecture and first water vertical workflow where water businesses can create customers with delivery profile data, generate and operate daily delivery routes, record bidon delivery/exchange outcomes, and view water-specific customer, route, container, deposit, and dashboard information.

## Key Decisions

- Keep `customers` generic and avoid adding water-only columns to it.
- Use a 1:1 `water_customer_profiles` table for water-specific customer configuration.
- Use dedicated water operational tables for recurring delivery data, container ledger entries, and deposit ledger entries when the data has lifecycle behavior beyond a static customer field.
- Treat `BusinessModeField` and `customCustomerFields` as UI affordances, not as the source of truth for persisted vertical data.
- Implement water mode as a real workflow, not only labels over the polleria workflow.
- Use aggregate container tracking for the first implementation; serializing every bidon is out of scope for this plan.

## Scope Boundaries

- In scope: customer water profiles, water-aware customer forms and details, water route generation, daily delivery execution, aggregate container ledger, deposit ledger, water-specific dashboard and QA.
- In scope: backend/shared contracts, API validation, sync/schema updates, and mobile-first UI.
- Out of scope: serial-number tracking for individual bidones, route optimization algorithms, GPS tracking, automated WhatsApp campaigns, billing/invoicing integrations, and custom form-builder infrastructure.
