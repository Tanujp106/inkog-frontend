# Frontend Code Review Plan

> **For agentic workers:** This is a review plan, not an implementation request. Keep findings evidence-based, avoid drive-by refactors, and use `superpowers:verification-before-completion` before claiming the review is complete.

**Goal:** Complete a fast, evidence-backed frontend review and safely remove clearly unused code, files, imports, scripts, and dependencies without drifting into a deep refactor.

**Architecture:** Review the nested `/Users/tanuj/Desktop/Incog/inkog-frontend` repository directly. Start with a cheap static and test baseline, then inspect the route boundaries and high-risk shared modules, and use the existing `127.0.0.1:3000` listener for only the browser checks that cannot be established from code or tests.

**Tech Stack:** Next.js 15, React 19, TypeScript strict mode, Socket.IO client, Motion, Paper shaders, Tailwind v4/PostCSS, Node's built-in test runner, and the existing local frontend/backend listeners.

## Global Constraints

- Review the nested frontend repository, not the parent wrapper repository, as the source of truth.
- Preserve the current clean working tree; do not edit production code during the audit.
- Reuse `127.0.0.1:3000` and `127.0.0.1:3001` when runtime checks are needed; create a listener only if the required app is not running.
- Keep the homepage as the designed public front face and retain the existing privacy boundary for room/playground routes.
- Treat visual polish, terminal authenticity, keyboard behavior, and real route behavior as first-class review criteria.
- Every finding must include severity, exact file/line, evidence, impact, and a concrete recommendation.

## Review Scope and Deliverables

- Review scope: `/`, `/about`, `/room/[id]`, `/playground`, `/not-found`, shared layout/providers/components, `lib/`, styling, metadata/crawl controls, and frontend package/tooling.
- Deliverable 1: baseline report of branch, working tree, scripts, test/build status, and known constraints.
- Deliverable 2: inventory of unused imports, unreachable helpers, orphaned components/assets, stale test fixtures, dead scripts, and dependencies with evidence for each candidate.
- Deliverable 3: safe cleanup changes limited to candidates confirmed by repository search, import/reference tracing, and tests/build.
- Deliverable 4: short prioritized findings grouped as P0/P1/P2/P3, with no speculative findings presented as defects.
- Deliverable 5: follow-up list for deeper architecture, accessibility, performance, or visual review that does not fit the 2–3 hour window.

## Efficient Execution Plan

### Phase 1: Establish the baseline (15–20 minutes)

- Confirm `git status`, current branch, recent commits, package scripts, Node/npm versions, and whether ports 3000/3001 are already listening.
- Run the existing frontend test suite and build/type validation using the repository's own scripts and test files.
- Record failures before inspection so pre-existing issues are not misattributed to later findings.

### Phase 2: Map the application and cleanup candidates (25–35 minutes)

- Build a route/component/data-flow map for landing, room, playground, about, and not-found.
- Identify client components, server components, providers, shared terminal primitives, socket lifecycle code, API calls, localStorage usage, and metadata/crawl controls.
- Use the existing focused tests as a map of intended behavior, especially the landing/room terminal helpers, Direction 2 shell, route transition, SEO, room chat, polls, password, and notification modules.
- Search every candidate before deletion: imports/re-exports, dynamic imports, route conventions, package scripts, test references, documentation references, and asset URLs.
- Classify candidates as `safe now`, `needs runtime confirmation`, or `keep`; only the first category is eligible for deletion during this pass.

### Phase 3: Perform safe cleanup (35–50 minutes)

- Remove unused imports, variables, and local helpers where TypeScript/tests confirm no behavior change.
- Remove orphaned files only when no source, route, config, test, documentation, or asset reference exists.
- Remove unused dependencies only after checking package imports and scripts; update the lockfile through the package manager if required.
- Do not delete route files, generated files, public assets, design references, or `.d.ts` files solely because they look unused.
- Do not combine cleanup with component extraction, CSS redesign, naming changes, or behavior changes.

### Phase 4: Fast correctness and lifecycle review (30–45 minutes)

- Trace room join/reconnect/disconnect, token persistence, message/poll loading, optimistic updates, cleanup, race conditions, and error states.
- Trace landing command parsing and landing-to-room transition state, including cancellation, direct entry, `/help`, and keyboard behavior.
- Review playground state transitions, route transitions, theme changes, and dev-only InterfaceKit/Agentation integration.
- Check server/client boundaries for hydration mismatch, browser-only APIs, stale closures, effect dependencies, event listener cleanup, and repeated socket/fetch work.

### Phase 5: Targeted risk sweep (20–30 minutes)

- Verify all `dangerouslySetInnerHTML` uses are constrained and intentional; confirm generated JSON-LD and transition snapshots cannot accept untrusted room/user content.
- Check localStorage token/password handling, URL-derived room IDs, API error exposure, private-route metadata, and noindex/robots/sitemap behavior.
- Review semantic structure, focus management, keyboard-only operation, visible focus, live-region/status semantics, reduced-motion handling, contrast, and touch targets.

### Phase 6: Verification and handoff (20–30 minutes)

- Run focused tests covering changed cleanup areas, then the complete frontend test suite and production build.
- Perform a targeted browser pass only if cleanup affects route behavior or tests are inconclusive: landing command flow, fresh room join/chat, playground interaction, and 404 recovery. Use the existing running port.
- Confirm the final diff contains only intentional cleanup and review changes.
- Consolidate duplicates and separate defects from maintainability opportunities.
- Rank by user impact, data/privacy risk, reproducibility, blast radius, and implementation cost.
- For each finding, include: `Severity`, `Location`, `Evidence`, `Why it matters`, `Recommended fix`, and `Verification test`.
- End with a 1–2 sprint remediation sequence and a “not worth changing now” section to protect scope.

## Review Best Practices

- Prefer one representative trace over broad pattern-matching: follow a message, room token, theme transition, or command from input to rendered result.
- Use tests and type/build output as evidence, not as proof that runtime UX is correct.
- Review diffs and recent commits first when investigating regressions; review the current tree separately for accumulated design debt.
- Do not recommend a rewrite merely because a file is large. Identify a concrete defect or a low-risk extraction seam first.
- Treat security findings conservatively: distinguish exploitable data flow from merely unusual code.
- Make accessibility findings reproducible with a keyboard sequence, DOM/ARIA observation, or browser behavior.
- Keep recommendations small enough to verify independently; batch related fixes only when they share the same regression test.

## Time and Token Estimates

| Review depth | Human/agent time | Approx. model tokens | Output |
|---|---:|---:|---|
| Quick cleanup review | 2–3 hours | 12k–20k | Safe cleanup diff, validation results, top risks, follow-up list |
| Deeper review | 4–6 hours | 25k–40k | Full lifecycle, accessibility, performance, and browser evidence |

Token use depends heavily on whether large files are read in compressed/signature/task-focused slices. The efficient default is the quick cleanup review; browser checks add roughly 2k–4k tokens when needed. Larger fixes should be estimated separately after findings are accepted.

## Recommended Default

Start with the quick cleanup review. The success criterion is a smaller, verified diff—not a perfect frontend audit. Stop cleanup if a candidate requires runtime archaeology or behavior changes; document it as a follow-up instead. If a P0/P1 issue appears, report it separately rather than expanding the cleanup scope.

## Self-Review Checklist

- [ ] Baseline failures are separated from review findings.
- [ ] All five public/interactive route surfaces are covered.
- [ ] Room lifecycle and client/server boundaries are traced end to end.
- [ ] `dangerouslySetInnerHTML`, localStorage, metadata, and privacy controls are reviewed explicitly.
- [ ] Findings have exact evidence and verification steps.
- [ ] Every deletion was confirmed unused by references plus tests/build where relevant.
- [ ] No code was changed as part of the review plan.
- [ ] The final report distinguishes cleanup from must-fix defects and deeper follow-up work.
