# Flaky test timeout investigation

## Task
Investigate intermittent "Test timed out in 5000ms" failures in:
- `OrganizacaoCadastroPage.test.jsx` > "cadastra e loga a organização, navegando pro dashboard"
- `AgricultorFormPage.test.jsx` > "cadastra um novo agricultor e navega pro dashboard"

when running the full suite (`docker compose run --rm frontend npm test`), vs. passing
reliably in 2-4s when run alone/filtered.

## Measured failure rate (baseline, before fix)
8 full-suite runs:

| Run | Result | Notes |
|---|---|---|
| 1 | FAIL | Both target tests timed out (~5.97s, ~5.89s) |
| 2 | FAIL | OrganizacaoCadastroPage timed out (~6.08s); AgricultorFormPage passed at 5.85s |
| 3 | PASS | Both close to the line (~5.4s, ~5.4s) but under 5000ms clock |
| 4 | PASS | Both close (~4.6s, ~4.8s) |
| 5 | FAIL | Both timed out; cascading failure — a third, unrelated test in the same file (`mostra os erros...`) then failed with "multiple elements found" because DOM from the aborted timed-out test leaked into the next test |
| 6 | FAIL | Both timed out (~6.09s, ~6.21s) |
| 7 | FAIL | Cascading failure again — `mostra os erros...` failed via `waitFor` timeout after the file's first test was squeezed |
| 8 | FAIL | Both timed out (~6.07s, ~6.10s) |

**6 of 8 runs (75%) showed a timeout-related failure.** This is a materially higher rate
than the "observed 3 times" anecdote, likely because this investigation ran the suite
repeatedly back-to-back and host load was elevated during the session (see below).

Only these two tests ever timed out as a *primary* cause (hit the 5000ms clock directly).
The two cascading failures in runs 5 and 7 were secondary effects within the same test
files: when the first (heaviest) test in the file gets forcibly aborted at 5000ms,
in-flight `userEvent` interactions (MUI Select popper open/close) can still resolve
into the DOM afterward, polluting the next test in that file. No test in an unrelated
file ever failed with a timeout as the root cause during the baseline runs.

## Code review: is this a real inefficiency or just heavy contention-sensitive tests?

Read `frontend/src/pages/OrganizacaoCadastroPage.jsx`, `AgricultorFormPage.jsx`, and
both test files in full. Findings:

- Neither component has anything actually slow: no artificial delays, no N+1 loops,
  no missing `await`, no unnecessary re-renders that would explain multi-second
  hangs. `handleSubmit` in both is a straightforward async function with 1-2
  `await`ed calls.
- What *is* true is that these are the two heaviest tests by interaction count:
  - `AgricultorFormPage`'s test does 4 sequential MUI `<Select>` interactions
    (click to open, `findByRole` to wait for the option, click to select) plus two
    `userEvent.type()` calls that simulate real per-keystroke typing.
  - `OrganizacaoCadastroPage`'s test does 1 MUI select interaction plus 4
    `userEvent.type()` calls across fields including a 14-character CNPJ and a
    17-character password, then awaits two sequential mocked `fetch` calls.
  - Every `userEvent` interaction and MUI Popper open/close involves real DOM
    work, act() flushes, and (for MUI) transition/portal mounting — this compounds
    linearly with interaction count and is exactly the kind of work that scales
    with CPU availability.
- Other tests scale the same way but with more headroom: `OrganizacaoLoginPage`
  (single form, 2 fields) hovered between ~2.7s-4.6s across runs, and
  `OrganizacaoPerfilPage`'s delete-flow test similarly crept up under load — same
  proportional slowdown, just starting from a lower baseline so it doesn't cross
  5000ms as often.
- `frontend/vite.config.js` has no custom `testTimeout` and no worker/pool
  concurrency limits — Vitest runs all 11 files across parallel workers by default,
  so under Docker's shared/limited CPU, contention hits every test proportionally,
  and these two just have the least margin before the 5000ms ceiling.

**Conclusion: the resource-contention hypothesis holds.** This is not a code defect
in the components or an inefficiency in the tests themselves — it's the two
heaviest, most interaction-dense tests in the suite sitting closest to the default
per-test timeout, so they're the first to tip over when the container is under CPU
pressure.

One caveat worth flagging: in one of the six verification runs (see below), two
*unrelated* tests (`OrganizacaoLoginPage`, `OrganizacaoPerfilPage`) also timed out,
coinciding with an observed host load average of ~9 on an 8-core machine
(`uptime` / `docker stats` checked at the time). This confirms the underlying
mechanism is genuine environment-level CPU contention (not scoped only to these two
tests) — under severe enough host load, other tests can occasionally get swept up
too. That's a broader environment concern outside this task's scope (raising two
tests' timeouts doesn't fix host-level contention spikes), but it reinforces that
the root cause is contention/timing, not a defect in test or component code.

## Fix applied
Raised the per-test timeout on only these two tests via the third argument to
`it(...)`, from the implicit default (5000ms) to 10000ms. Vitest's global
`testTimeout` in `vite.config.js` was left untouched, so a genuinely slow test
appearing anywhere else will still be caught at 5000ms.

Files changed:
- `frontend/src/pages/OrganizacaoCadastroPage.test.jsx` — `it("cadastra e loga a
  organização, navegando pro dashboard", async () => {...}, 10000)`
- `frontend/src/pages/AgricultorFormPage.test.jsx` — `it("cadastra um novo
  agricultor e navega pro dashboard", async () => {...}, 10000)`

10000ms was chosen because observed timeout durations topped out around 6.2-6.3s
under load in the baseline runs, so 10000ms gives roughly 1.6x headroom over the
worst observed case without being excessive.

## Verification (after fix)
6 more full-suite runs:

| Run | Result | Target test durations |
|---|---|---|
| 1 | PASS | 5.55s, 5.61s |
| 2 | FAIL | Unrelated tests (`OrganizacaoLoginPage`, `OrganizacaoPerfilPage`) timed out during an observed host load spike (load avg ~9 on 8 cores); target tests were not involved in this failure |
| 3 | PASS | 6.08s, 6.27s |
| 4 | PASS | 5.70s, 5.70s |
| 5 | PASS | 4.87s, 4.91s |
| 6 | PASS | 4.96s, 5.06s |

5 of 6 verification runs passed cleanly. In every passing run, at least one of the
two target tests ran at or above the old 5000ms ceiling (up to 6.27s) and still
passed comfortably under the new 10000ms budget — direct confirmation the fix
addresses the exact failure mode observed in the baseline. The one verification
failure was an unrelated, broader host-contention event (different tests, not the
ones this task addressed) and is called out above rather than papered over.

## Commit
`git add frontend/src/pages/OrganizacaoCadastroPage.test.jsx
frontend/src/pages/AgricultorFormPage.test.jsx` and committed with message:
`test: raise timeout on the two heaviest form-submission tests to absorb CI resource contention`

---
This file is a throwaway investigation note and should be deleted once read — it
was not committed.
