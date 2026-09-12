---
type: system
title: Opt-in Usage Analytics
tags:
  - main-process
  - settings
status: stable
generated:
  by: okf-mcp/2.0.0
  at: 2026-09-11T23:04:56.418Z
sources:
  - id: implementation
    resource: src/main/analytics/client.ts
  - id: wiring
    resource: src/main/analytics/index.ts
  - id: contract
    resource: src/main/analytics/README.md
---

Clipless reports optional active-installation counts through PostHog's capture API from the main process. Events are `app_active` and `feature_used`, with a random UUIDv4 and fixed properties disabling person profiles and GeoIP and overriding `$ip`. No SDK, session replay, remote configuration, error reporting, clipboard data or configured-tool data is captured. The activity interface has no arguments; feature capture accepts only runtime-validated categories from `src/shared/analytics.ts`, with no custom properties.[^implementation]

Consent defaults off. Settings → General → Privacy → Send analytics controls `<userData>/usage-analytics.json`, a separate local file excluded from [Secure Storage](secure-storage.md) backup/import. Opt-out aborts requests and removes the ID; re-enabling creates a new ID. Development builds never send. The US public project token is compiled into main only; environment overrides can disable or change the project.[^contract]

Window focus/input and successful quick-clip hotkey copies count as activity. Input arguments are ignored. Activity is limited to once per UTC day per process; each feature action sends one event, with no background clipboard heartbeat, retries or offline queues. Use PostHog unique users for daily/weekly/monthly opted-in active installations, not event totals or exact people. Direct requests expose the network IP to PostHog regardless of event properties; discard client IP data in project settings.[^wiring]

See the [privacy contract](../../src/main/analytics/README.md) for the exact payload, failure semantics and release verification. Privacy tests use mocked fetch and send nothing to production.

The Privacy panel sits beneath Window in General's right column so its short usage explanation stays visible without scrolling at 900 × 600. Keep paragraph spacing compact and retain the responsive E2E assertions when changing explanatory copy.

The first main-window load of a configured packaged build prompts for opt-in. Accept, decline or Escape saves the decision; existing saved consent suppresses the prompt. Failed writes keep reporting off and allow retry or continuing without analytics. The native dialog keeps background controls inert and initially focuses No thanks.

Feature categories are quick_look (open action), history_search (first query input per search-bar opening), clip_copy (successful window copy), quick_clip_hotkey (successful hotkey copy), template_copy (successful output copy) and tool_launch (one successful launch action, not one per tab). No names, queries, URLs, clip data or configuration are sent. Use feature_used broken down by feature with unique users for adoption and total events for frequency. Feature usage also contributes to the daily activity count.

The main-window consent prompt keeps the opt-in explanation and sensitive-data exclusions visible. Recording specifics sit inside the collapsed What is sent? disclosure. Send analytics uses the shared primary/info confirmation styling; No thanks remains available and initially focused.
