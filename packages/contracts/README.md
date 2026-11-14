# WEAVE domain constants (WP-0 contracts prerequisite)

Canonical runtime enum values (`ENUMS`), matching TypeScript unions
(`DomainEnumValue<'task_status'>`), and policy defaults (`POL`) come from specification
v0.3 §7.2 and Appendix B. They have no runtime dependencies and can be imported
by the API, engine and mobile code. Database enums must match their ordered
values. D-15 uses eight AI calls and three probes per incident.

This slice was explicitly authorized by lh6104 to unblock DB work; it requires
Mingpham's contracts review before dependent schema changes merge. It does not
provide request/response Zod schemas, event types (§9.7), or the full WP-0-API
package. No product FR or acceptance test is completed by constants alone.

Implementation plan: add spec-parity tests, observe failure before constants
exist, transcribe the exact canonical values, then run tests and source typecheck.
Tests read the authoritative spec to catch missing/extra/changed enum values and
policy defaults. Consumers import the constants rather than maintaining copies.

From this package directory, after installing dev dependencies:

```sh
npm test
npm run typecheck
```

Vitest and TypeScript are development tools only. npm was used for isolated
validation because the API-owned pnpm workspace does not exist yet. No npm lock
or root workspace configuration is introduced; the integrator should install
this package through the canonical pnpm workspace when it lands.

Validation: two Vitest spec-parity tests passed (49 enum groups, 28 policies),
source and consumer-type checks passed, and `git diff --check` passed. Both
parity tests were first observed failing against empty exports. Vitest's default
pool exited 135 in this environment; a single fork runs successfully and is
specified in the test script. The source package has no runtime dependencies.
No Supabase deployment or device acceptance test was performed for this slice.
