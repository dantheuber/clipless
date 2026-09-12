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

Clipless reports optional active-installation counts through PostHog's capture API from the main process. The only event is `app_active`, with a random UUIDv4 and fixed properties disabling person profiles and GeoIP and overriding `$ip`. No SDK, session replay, remote configuration, error reporting, clipboard data or configured-tool data is captured. The no-argument activity interface never accepts application data.[^implementation]

Consent defaults off. Settings → General → Privacy → Share usage counts controls `<userData>/usage-analytics.json`, a separate local file excluded from [Secure Storage](secure-storage.md) backup/import. Opt-out aborts requests and removes the ID; re-enabling creates a new ID. Development builds never send. The US public project token is compiled into main only; environment overrides can disable or change the project.[^contract]

Window focus/input and successful quick-clip hotkey copies count as activity. Input arguments are ignored. Attempts are limited to once per UTC day per process, with no background clipboard heartbeat, retries or offline queues. Use PostHog unique users for daily/weekly/monthly opted-in active installations, not event totals or exact people. Direct requests expose the network IP to PostHog regardless of event properties; discard client IP data in project settings.[^wiring]

See the [privacy contract](../../src/main/analytics/README.md) for the exact payload, failure semantics and release verification. Privacy tests use mocked fetch and send nothing to production.

The Privacy panel sits beneath Window in General's right column so its full disclosure stays visible without scrolling at 900 × 600. Keep paragraph spacing compact and retain the responsive E2E assertions when changing disclosure copy.
