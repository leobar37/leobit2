# T-004 Timeline Tab

## Objective

Create a new "Timeline" tab in SyncDevToolsDrawer showing chronological sync events.

## Requirements Covered

- `FR-005` - Timeline View

## Dependencies

- `T-003` (shares event buffering approach)

## Files or Areas Involved

- `devtools/sync/tabs/timeline-tab.tsx` - Create - New tab component
- `devtools/sync/hooks/use-sync-timeline.ts` - Create - Event buffering hook
- `devtools/sync/drawer.tsx` - Modify - Add Timeline tab to OPERATION_TABS
- `devtools/sync/types.ts` - Modify - Add timeline event types

## Actions

1. Create `SyncTimelineEvent` type with id, timestamp, type, message, data, entityType
2. Create `useSyncTimeline` hook that:
   - Subscribes to syncEvents
   - Maintains in-memory ring buffer (max 500 events)
   - Supports filtering by event type
   - Provides search functionality
3. Create `TimelineTab` component with:
   - Vertical timeline layout (newest first)
   - Color-coded event types (success=green, warning=yellow, error=red, info=blue)
   - Expandable event details (show full data object)
   - Filter chips: All | Pull | Push | Conflict | Error | Other
   - Search input for entity IDs or messages
   - Auto-scroll to newest option
4. Add TimelineTab to drawer with icon (Clock or History)

## Completion Criteria

- [ ] Timeline shows events in chronological order
- [ ] Events have distinct colors by type
- [ ] Clicking event expands to show details
- [ ] Filter chips work for all event types
- [ ] Search finds events by entity ID or message
- [ ] Buffer limits to 500 events (oldest dropped)

## Validation

- Test: Trigger sync operations, verify events appear
- Test: Leave DevTools open for extended period, verify memory stable
- Test: Filter to only "Conflict" events

## Risks or Notes

- Event buffer is in-memory only (lost on reload) - acceptable for dev tools
- Consider adding "pause" button to stop auto-scroll for debugging
