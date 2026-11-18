# Implementation Discipline

Preserve the responsibilities of disciplined delivery without requiring a fixed multi-agent
choreography for every task. This describes in-repo coding discipline. It does not by itself
define or forbid a larger staged Ticket-to-PR pipeline that wraps the loop, such as separate
ticket, design, architect, builder, PR, and reviewer stages with human gates.

## Default loop

1. **Inspect:** Read the relevant files, tests, documentation, and existing patterns. Identify
   the source of truth and the boundaries the change must respect.
2. **Plan the diff:** State the intended behavior, affected files, risks, and verification
   commands. Keep the plan proportional to the task.
3. **Implement incrementally:** Make the smallest coherent change and avoid unrelated cleanup.
4. **Verify:** Run the narrowest useful tests, lint, typecheck, build, or content validation.
5. **Self-review:** Inspect the final diff for edge cases, accidental scope expansion, stale docs,
   and security-sensitive content.

## Autonomy follows evidence

Autonomy should follow evidence. Routine work with strong verification can run more
independently; novel or risky work needs stronger gates.

L3 autonomy doesn't mean giving an agent the repository and asking it to ship everything. It
means having enough: context + constraints + verification that we know where additional autonomy
is safe.

## Learn

Learn sits alongside the loop: preserve useful discoveries so the next ticket or engineer
doesn't start from zero, and promote durable discoveries into the authoritative repository
documentation. For a smaller task this can happen inside one session. For a larger epic, keep a
living plan.

The living plan carries working context during the epic. It records things such as:

- current epic state and dependencies;
- decisions already made;
- implementation conventions;
- failed approaches/gotchas worth avoiding;
- how the change should be verified;
- discoveries that affect later tickets.

This means a later implementation doesn't need to rediscover everything that happened earlier. It
also makes interruptions, handovers and context resets much less expensive.

The conversation is temporary. The useful knowledge shouldn't be.

```text
docs/plans/<epic>/
├── README.md          # current state + ticket/dependency map
├── architecture.md    # relevant architecture/decisions
└── implementation.md  # gotchas, verification, learnings
```

Durable discoveries, architecture, contracts, operational rules or implementation conventions,
should then be promoted into the authoritative repository documentation.

## Responsibilities, not choreography

| Responsibility | Explicit-role example |
| --- | --- |
| Inspect context | Surveyor |
| Plan the diff | Architect |
| Implement incrementally | Implementer |
| Verify and self-review | Sheriff |
| Learn | Living knowledge |

Sheriff is self-review by the implementer. It is distinct from an independent reviewer without
write access.

For larger work, independent Surveyor and Architect agents can still provide fresh context and
challenge assumptions. For small work, one agent can carry the same responsibilities inside the
adaptive loop without creating unnecessary ceremony.

Before handing off, compare the diff with `.docs-map.yml`, update authoritative documentation
when needed, and complete the PR's Documentation impact declaration.
