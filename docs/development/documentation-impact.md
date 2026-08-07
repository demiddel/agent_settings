# Documentation Impact Declaration

The repository uses `.docs-map.yml` to connect changed repository paths to the documentation that
may need review. Each mapping has a unique `id`, one or more source `paths`, and one or more
`docs`. Path ownership is many-to-many: overlapping mappings and shared documents are valid.

## Pull request declaration

The pull request template contains one `Documentation Impact Declaration`. Select exactly one
option:

- **Documentation updated** means at least one expected mapped document changed in the PR.
- **Existing documentation reviewed; no update required** means the expected documents were
  reviewed and remain accurate. This option requires a meaningful `Reason:` and still requires
  every expected document in `Affected documents:`.
- **No relevant documentation exists yet** is valid only when no mapped documentation is inferred.

`Affected documents:` is read as Markdown bullets. Both plain paths and backticked paths with an
annotation are supported, for example `- docs/development/implementation-discipline.md` and
`- \`docs/development/implementation-discipline.md\` — reviewed; no change required.`. Duplicate
paths are ignored, `- none` means an empty list, and additional reviewed documents may be listed.
The validator accepts the standard Markdown bullet markers `-`, `*`, and `+`; the examples here use
`-` for consistency with the pull request template.
Malformed non-bullet entries, empty bullets, missing whitespace after a bullet marker, and unclosed
backticked paths fail with a specific parser diagnostic instead of being silently ignored.

## CI and local checks

On a pull request, CI infers expected documents from the changed paths, requires those paths in
`Affected documents:`, and checks actual changes using the exact intersection of expected mapped
documents and changed paths. It does not require every expected document to change.

Without a pull request event, `pnpm run validate:docs-impact` prints inferred documents and exits
successfully so it can be used during local development. The PR declaration is validated only when
the GitHub event contains a `pull_request` object.

Common CI failures are fixed by selecting exactly one checkbox, listing every expected mapped
document with valid Markdown bullets, changing at least one expected document for **Documentation
updated**, or adding a meaningful reason for **Existing documentation reviewed; no update
required**.

To add a mapping, add a unique `id`, exact repository paths or existing glob patterns under
`paths`, and authoritative document paths under `docs`. Keep unrelated dependency files out of a
focused mapping unless those dependencies genuinely change the documented contract.
