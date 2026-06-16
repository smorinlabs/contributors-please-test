# CLAUDE.md — contributors-please-test

Downstream end-to-end test harness for
[`contributors-please-action`](https://github.com/smorinlabs/contributors-please-action).
A `repository_dispatch` (`contributors-please-action-updated`) triggers
`action-downstream-suite.yml`, which dispatches and watches the `CP-GHA-*`
suite workflows against a given action ref.

## CI policy

### `live-adoption` is a BLOCKING gate — do not make it non-blocking

`live-adoption.yml` is the only suite that exercises the action against **real**
GitHub APIs against a live scratch repository. It is intentionally watched with
`gh run watch --exit-status` in `action-downstream-suite.yml`, so a
`live-adoption` failure **fails the downstream suite** (and, upstream, the
action repo's `Downstream E2E`).

**Do not** downgrade it to a warning / report-only / `continue-on-error`. A
real-API end-to-end failure — including persistent rate-limit or auth problems —
is a signal that must block, not be ignored. If `live-adoption` flakes on
GitHub GraphQL rate limits at its setup step, fix the **root cause** instead of
the gate:

- reduce GraphQL calls in the suite's setup, and/or add bounded retry/backoff
  on rate-limit responses;
- if contention with other automation on the shared bot account persists,
  provision a dedicated token/account for the live suite;
- do not weaken the blocking gate to paper over the flake.

The 8 deterministic fake-API suites also gate with `--exit-status`; they and the
live canary are all required to pass.
