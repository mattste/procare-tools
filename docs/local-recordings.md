# Local Procare Recordings

This project stores Procare HTTP recordings **only on your machine**.

- Default local path: `.procare-recordings/procare`
- This path is git-ignored in `/Users/mattste/.codex/worktrees/1181/procare-tools/.gitignore`
- No scrubbed/sanitized HAR files are committed to the repo

## Environment variables

- `PROCARE_AUTHENTICATION_EMAIL`: Procare login email (for recording mode)
- `PROCARE_AUTHENTICATION_PASSWORD`: Procare login password (for recording mode)
- `PROCARE_FIXTURE_MODE`: `record` or `replay`
- `PROCARE_REQUIRE_RECORDING`: if `1`, replay fails when no local recording exists
- `PROCARE_RECORDINGS_DIR`: optional override for local recordings directory

## Record locally

Run one low-volume recording flow (auth + kids + one daily activities page):

```bash
bun run fixtures:record
```

This writes to `.procare-recordings/procare` by default.

## Replay locally

Replay from local recording:

```bash
bun run test:fixtures
```

`test:fixtures` sets `PROCARE_REQUIRE_RECORDING=1`, so it fails fast if no local recording is present.

## Normal test behavior

`bun test` does not require local recordings. The recorded integration test exits early when replay data is missing.

## CI behavior

CI runs typecheck + unit/integration tests only. It does not require Procare credentials and does not run network recording/replay flows.

## Security notes

- Treat `.procare-recordings/` as sensitive.
- Never move recording files under tracked repo paths.
- Do not share local HAR files in commits, PRs, or tickets.
