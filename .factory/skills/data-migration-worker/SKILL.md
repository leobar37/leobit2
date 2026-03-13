---
name: data-migration-worker
description: Handles backup, validation, and migration of data from TanStack DB to PGlite
---

# Data Migration Worker

## When to Use This Skill

Use this worker for:
- Creating backups of TanStack DB collections
- Validating data integrity before migration
- Executing migration from TanStack to PGlite
- Testing rollback capabilities

## Work Procedure

### 1. Backup Phase
- Read all TanStack DB collections
- Export to JSON format
- Generate checksum
- Store in `backups/` directory

### 2. Validation Phase
- Check for orphaned records
- Validate foreign key references
- Check data type consistency
- Generate integrity report

### 3. Migration Phase
- Read from TanStack collections
- Transform data to PGlite schema
- Insert into PGlite tables
- Verify row counts match

### 4. Verification Phase
- Compare record counts
- Sample random records
- Validate relationships
- Generate migration report

## Example Handoff

```json
{
  "salientSummary": "Created backup of 6 TanStack collections (2,450 records), validated data integrity with 0 critical errors, migrated all data to PGlite successfully. Row counts match 100%.",
  "whatWasImplemented": "Complete data migration from TanStack DB to PGlite including backup creation, integrity validation, data transformation, and verification. All 6 collections migrated: sales (450), customers (320), products (85), suppliers (42), purchases (180), distribuciones (1,373).",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "ls -la backups/",
        "exitCode": 0,
        "observation": "backup file exists: pre-migration-2026-03-12.json (245KB)"
      },
      {
        "command": "cat reports/integrity-report.json | jq '.summary'",
        "exitCode": 0,
        "observation": "criticalErrors: 0, warnings: 3 (acceptable)"
      },
      {
        "command": "cat reports/migration-report.json | jq '.rowCounts'",
        "exitCode": 0,
        "observation": "All tables match: sales 450/450, customers 320/320, etc."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "tests/migration/integrity.test.ts",
        "cases": [
          {"name": "validates foreign keys", "verifies": "No orphaned records"},
          {"name": "checks data types", "verifies": "All fields have valid types"}
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Data integrity check fails with critical errors
- Migration fails mid-process
- Row counts don't match after migration
- Rollback test fails
