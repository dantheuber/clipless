# Usage analytics privacy contract

Clipless uses PostHog's [capture API](https://posthog.com/docs/api/capture) directly from
the Electron main process. There is no PostHog SDK, remote configuration, renderer
tracker, session replay, autocapture, exception capture, survey or feature flag client.
Changing a PostHog dashboard setting cannot add collection capabilities to the app.

## What leaves the app

The sole event is `app_active`. Its complete payload is constructed in `client.ts`:

- Public project token and fixed event name.
- A locally generated random UUIDv4 as `distinct_id`.
- `$process_person_profile: false`, `$geoip_disable: true`, `$ip: '0.0.0.0'`.

There are no user-supplied properties or event names. No clipboard contents, hashes,
lengths, types, titles, URLs, tool identities, commands, configuration, searches,
filenames, OS usernames, screen data, keystrokes or error messages are collected.
Input event arguments are ignored; the analytics method takes no arguments.
Node's fetch adds standard transport headers, and PostHog records receipt time.

**This is pseudonymous measurement, not a promise of zero personal data.** A stable
installation ID links days of activity. PostHog sees the originating network IP on
a direct connection even though the payload overrides `$ip` and disables GeoIP.
In PostHog, set **Settings → Project → General → IP data capture** to discard client
IP data as an additional server-side control. See
[PostHog's collection controls](https://posthog.com/docs/privacy/data-collection).
Preventing PostHog from seeing the originating IP would require a separately operated relay.

## Consent and lifecycle

Settings → General → Privacy → **Share usage counts** is off by default for new
and existing installations. Consent is saved with the random ID in
`<userData>/usage-analytics.json`, separate from encrypted clipboard storage and
excluded from all backup export/import paths. Neither importing a backup nor
clearing clipboard history changes consent. Unreadable/invalid state fails closed.

Opt-out aborts any in-flight request and discards the local ID. An already transmitted
request cannot be recalled; opt-out does not delete previous events in PostHog.
Re-enabling generates a new ID. Disk failures are shown in the consent UI; a failed
opt-out stops sending in that process, but must be saved successfully to survive restart.
Development/unpackaged builds and builds with invalid/missing configuration never send.

The main process records activity when a window gains focus, on window keyboard/mouse
input, or after a successful quick-clip hotkey copy. The initial focused window and
opting in also count. There is no clipboard-monitor heartbeat: a hidden app that merely
monitors the clipboard does not count as active. Only one request is attempted per UTC
day per process. Restarting can send another event with the same ID on the same day.
Network failures are dropped without retries, queues, logging, or blocking clipboard work.

## Build and dashboard setup

The public US project token is compiled into **main only** by `electron.vite.config.ts`.
It is meant to be shipped in the app and does not grant access to project data. Never
substitute a personal API key. Build-time environment overrides are
`CLIPLESS_POSTHOG_TOKEN` and `CLIPLESS_POSTHOG_REGION` (`us` or `eu`). Set the token to
an empty string to make a build without reporting.

For a release smoke test, use a packaged build and a fresh app profile. Check that no
PostHog request occurs before consent. Opt in and inspect the first event's complete
properties in PostHog; then opt out and verify no further activity requests occur.
Automated tests mock fetch and never send test data to the production project.

In PostHog create a Trends insight for `app_active`, aggregated as **unique users**:
daily intervals for DAU, weekly for WAU, monthly for MAU. Set the project's reporting
timezone to UTC to match the client's day boundary. Use the same event for retention.
These are **opted-in active installations**, not exact people or all Clipless users.
Multiple devices, resets, opt-in selection, offline days and dropped requests affect
the counts. Do not use total event counts as active-user counts.

Future analytics changes must preserve the fixed payload boundary and extend the
privacy tests. Do not run the automatic PostHog wizard over this integration.
