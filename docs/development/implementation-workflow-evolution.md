# From four roles to one adaptive loop

This repository demonstrates an evolution in implementation discipline. An earlier workflow
made four agent roles explicit: Surveyor, Architect, Implementer, and Sheriff. That made the
responsibilities visible, but it also made small tasks carry a fixed choreography.

The lighter workflow keeps the responsibilities and removes the mandatory ceremony:

| Earlier explicit role | Responsibility retained in the adaptive loop |
| --- | --- |
| Surveyor | Inspect relevant context and existing patterns |
| Architect | Plan the intended behavior, affected files, and expected diff |
| Implementer | Make the smallest coherent change incrementally |
| Sheriff | Verify the result and self-review the final diff |
| Learning and context | Preserve useful discoveries so the next ticket or engineer doesn't start from zero, and promote durable ones |

Sheriff is self-review by the implementer. It is distinct from an independent reviewer without
write access.

The resulting loop is:

**Inspect → Plan the diff → Implement incrementally → Verify → Self-review**

Learn sits alongside that loop and stays light for a small task. Larger epics keep a living
plan under `docs/plans/<epic>/` and promote durable discoveries into authoritative repository
documentation, as described in `docs/development/implementation-discipline.md`.

The important part is preserving the responsibilities, not requiring four agents every time.
That describes in-repo coding discipline. It does not by itself define or forbid a larger staged
Ticket-to-PR pipeline that wraps the loop, such as separate ticket, design, architect, builder,
PR, and reviewer stages with human gates. For larger work, it can still be valuable to split
inspection and planning into independent Surveyor and Architect agents. For small work, one
agent can carry the same loop without turning the task into ceremony.

## Repository routing

`AGENTS.md` is the canonical repository guide. `CLAUDE.md` is a short entry point that tells
Claude to read it, so Claude and Codex consume the same engineering guidance. The canonical
implementation workflow lives in `docs/development/implementation-discipline.md`.

Documentation impact closes the loop: the diff is compared with `.docs-map.yml`, authoritative
docs are updated when behavior or guidance changes, and the pull request explains which docs
were updated or reviewed unchanged.

## Why this is a useful example

The evolution is more useful than a rule that always says “run four agents.” It shows that a
workflow can become lighter through use while keeping the quality responsibilities that made the
original workflow valuable.
