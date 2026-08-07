# Repository Instructions

This repository is a public example of reusable guidance for coding agents. It contains
small, generic fixtures so readers can see how the guidance is routed and validated without
depending on a real product codebase.

## Start here

1. Read this file for repository-wide rules and routing.
2. Read the relevant document under `docs/` before making a change that affects its topic.
3. Read `docs/development/implementation-discipline.md` for the default implementation loop.

## Implementation discipline

Use this adaptive loop for normal work:

1. Inspect relevant context and existing patterns.
2. Plan the smallest coherent diff, including intended behavior and affected files.
3. Implement incrementally, keeping changes easy to review.
4. Verify with the narrowest useful tests, checks, or build commands.
5. Self-review the final diff for regressions, omissions, and documentation impact.

Small tasks should stay small. The loop is a quality check, not a reason to create ceremony.
For larger work, the first two responsibilities can be split into independent Surveyor and
Architect agents, while implementation and verification remain explicit responsibilities.

## Documentation impact

Use `.docs-map.yml` to find authoritative documentation affected by a code or guidance change.
When a mapped path changes, update the relevant docs or explain in the pull request why the
existing docs remain accurate. Complete the `Documentation impact` section in the PR template.

## Scope and safety

- Keep examples generic; do not add customer data, credentials, internal URLs, or copied product rules.
- Prefer the smallest change that makes the intended guidance clearer.
- Do not treat the dummy `apps/client` files as a real application architecture.
- Run `pnpm run test:docs-impact` and `pnpm run validate:docs-impact` before finishing changes here.

## Routing

- Agent workflow: `docs/development/implementation-discipline.md`
- Documentation-impact example: `docs/development/documentation-impact.md`
- Workflow evolution article: `docs/development/implementation-workflow-evolution.md`
