# ShareLyze MVP: Audit and acceptance record

Date: 2026-11-02. This is a record of the local implementation and tests, not a third-party security certification or approval for public production use. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the complete requirements and current status.

## Audit findings and fixes

| Finding | Response | Evidence and limit |
| --- | --- | --- |
| Unbounded parallel file streams | Cap at 32, return HTTP 503 when busy; ZIPs have a separate limit of three | `tests/container_concurrency.py`: 32 paused streams, rejection of the 33rd and capacity release after disconnect. Does not determine NAS performance limits. |
| Setup, login and unlock previously shared a rate-limit bucket | Separate buckets; explicitly trusted proxy addresses only | API tests check 429, isolation between login and unlock, trusted and forged forwarded addresses. Without configured trusted proxies, clients behind the proxy still share the appropriate bucket. |
| File mutation during a transfer could be counted as completed | Compare file identity, size and timestamps around reading; terminate on observed mismatch and do not record completion | `tests/container_integrity.py` changes an in-container test file during file and ZIP streams. Metadata comparisons cannot guarantee atomic contents or retract bytes already delivered. |
| Daily per-link analytics were missing | Add link/date/event aggregation to API and dashboard | API test covers per-link daily redirect aggregation; event counts are requests or server observations, not unique visitors or proof of saved files. |
| Very large directories were fully materialized before the previous limit | Incremental directory reading, 10,000-entry cap and public browsing rate limit | Linux storage test exercises the bounded reader with a smaller test threshold. Larger directories are rejected; pagination remains open. |
| Editing could replace a share with an unrelated global selection | Display the actual replacement list and clear the replacement checkbox if selection changes or save succeeds | Implemented, but this latest interaction still needs an actual browser UX/accessibility test. |
| Malformed session expiry and cookie name handling | Reject invalid expirations and require exact session cookie name | API regression test for malformed expiry; session and authorization tests passed. |

Independent read-only reviews found no further demonstrable authorization or traversal bypass in the examined code after the fixes. Their scope did not include a comprehensive penetration test, native NAS operation or every browser state.

## Verification performed

- macOS: TypeScript/Vite build, npm tests (Linux-only tests skipped), production dependency audit and release-metadata validation.
- Linux ARM64 container: real storage, symlink and FIFO tests; a concurrent symlink-swap test; API and download tests. Linux AMD64 tests also passed under emulation using the current backend mounted into the test image.
- Isolated browser against a Linux container: setup, protected share, wrong and correct password, mobile-size viewport, file and ZIP downloads, link creation/search/edit and statistics. The downloaded file and ZIP were checked. The test predates the most recent small UI corrections; no full visual/accessibility audit is claimed.
- Isolated Compose startup; Nginx HTTPS proxy flow; live SQLite backup restored into a separate volume, then admin login and restored link verified. Nginx is not a Zoraxy test.
- Four parallel 64-MiB downloads and a Range request against a sparse file larger than 4 GiB were checked on an earlier image. Neither is a full 4-GiB transfer or a target-NAS benchmark.
- The UGREEN host was queried read-only and reports `x86_64`. Docker API access was denied for the existing SSH user; no container, proxy, file or service was changed on that NAS.

## Remaining acceptance gaps

1. Full security review and broader long-duration tests for ZIP errors, metadata races, resource exhaustion and deployment-specific proxy trust. Directory pagination above 10,000 entries is not implemented.
2. Full visual, keyboard and accessibility review of the current frontend and of the changed selection editor; Windows script not run.
3. Actual UGREEN NAS and Zoraxy integration and performance tests. The NAS SSH skill currently restricts this connection to read-only access; its current user also lacks Docker API permission. No NAS deployment has been performed.
4. GitHub-hosted CI, multi-architecture manifest publication and version-tag release execution are configured but not run or published in this work. `CHANGELOG.md` is still Unreleased, so the tag-release gate requires an explicit versioned section.
5. An agreed performance target, including maximum file sizes and concurrency on the real NAS, remains to be measured.

These gaps prevent declaring points 1–5 completely accepted. No commit, push, GitHub release or deployment was made as part of this audit.
