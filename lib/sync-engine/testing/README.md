# Sync Engine Intelligence Testing

This folder is a deterministic testing harness for `processSyncMessage()`.

It is not product behavior. It exists to make Sync's current judgment visible:

- what it remembers
- what it ignores
- what consequences it detects
- when it asks follow-up questions
- whether it updates or duplicates memory
- where it mishandles sensitive information

## How To Run

```bash
npm run test:sync-engine:intelligence
```

You can also inspect the hidden lab page:

```txt
/sync-lab/tests
```

## How To Add A Test

1. Pick the closest fixture file in `fixtures/`.
2. Add a `SyncEngineTestCase`.
3. Include either `input` for one message or `sequence` for multi-step context.
4. Fill only the expected fields that matter for the behavior being tested.
5. Add the relevant philosophy rule IDs.
6. If the current engine is known to fail, add `knownGap.reason`.

Known gaps return `known_gap`, not `fail`. The point is visibility, not fake perfection.
Real failures (`fail`) must make `npm run test:sync-engine:intelligence` and `npm run test:all` exit nonzero.

## Philosophy Rules

The editable rules live in `philosophy.ts`. Tests reference those rule IDs so failures can be read as product-intelligence failures, not just code failures.

## Security Notes

Security fixtures live in `security.ts`. They intentionally include sensitive and prompt-injection style inputs. The runner should expose whether the engine would store or echo unsafe material.
