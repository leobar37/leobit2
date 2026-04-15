# Offline Sales Performance Hardening Context

## Overview

This plan improves perceived and actual performance of the offline sales flow (especially draft sale creation and edit operations) without sacrificing sync durability. The goal is to keep offline as a first-class capability in both browser and installed PWA modes, while removing hot-path latency caused by redundant local queries, broad invalidations, and main-thread database work.

## Background

Production usage with ~7000 local sales shows that creating/editing sales can feel slower than remote writes. Investigation identified a combination of factors:

- PGlite currently runs on the main thread with `idb://` storage.
- The create-draft flow triggers multiple sequential local operations and repeated reads.
- The editor uses broad query invalidation patterns for small writes.
- Sales listing/search query shapes do not scale well for large local datasets.

Offline support is mandatory for the product and must not require forcing app installation.

## Goal

Deliver a resilient local-first write path that feels instant on Android Chrome (web and installed PWA), preserves durable sync semantics, and scales to multi-thousand sales datasets with predictable latency.

## Key Decisions

- Offline remains available in both browser and installed PWA modes.
- Installation is recommended for UX robustness, not required for core offline functionality.
- Durable outbox remains mandatory; only hot-path queue behavior is optimized.
- Background sync APIs are treated as best-effort enhancements, not correctness foundations.
- Performance work is phased: hot-path reductions first, infra migration second, read-model optimization third.

## Scope Boundaries

- In scope: sales create/edit hot path, sync enqueue path, PGlite execution model, sales list/search scalability, performance instrumentation and validation.
- Out of scope: backend sync protocol redesign, non-sales domain refactors, full UI redesign, migration to a different local database engine.
