# Implementation Discipline

Preserve the responsibilities of disciplined delivery without requiring a fixed multi-agent
choreography for every task.

## Default loop

1. **Inspect:** Read the relevant files, tests, documentation, and existing patterns. Identify
   the source of truth and the boundaries the change must respect.
2. **Plan the diff:** State the intended behavior, affected files, risks, and verification
   commands. Keep the plan proportional to the task.
3. **Implement incrementally:** Make the smallest coherent change and avoid unrelated cleanup.
4. **Verify:** Run the narrowest useful tests, lint, typecheck, build, or content validation.
5. **Self-review:** Inspect the final diff for edge cases, accidental scope expansion, stale docs,
   and security-sensitive content.

## Responsibilities, not choreography

| Responsibility | Explicit-role example |
| --- | --- |
| Inspect context | Surveyor |
| Plan the diff | Architect |
| Implement incrementally | Implementer |
| Verify and self-review | Sheriff |

For larger work, independent Surveyor and Architect agents can still provide fresh context and
challenge assumptions. For small work, one agent can carry the same responsibilities inside the
adaptive loop without creating unnecessary ceremony.

Before handing off, compare the diff with `.docs-map.yml`, update authoritative documentation
when needed, and complete the PR's Documentation impact declaration.
