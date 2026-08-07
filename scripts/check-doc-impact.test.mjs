import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  evaluateDocumentationImpact,
  formatDocumentationImpactResult,
  inferExpectedDocs,
  normalizeRepoPath,
  parseDocumentationImpact,
  parseDocsMap,
} from './lib/doc-impact.mjs';

const currentMap = fs.readFileSync('.docs-map.yml', 'utf8');

function documentationBody({ checks = [], affected = [], reason = '' } = {}) {
  return [
    '## Documentation impact',
    '',
    '- [ ] Documentation updated',
    '- [ ] Existing documentation reviewed; no update required',
    '- [ ] No relevant documentation exists yet',
    ...checks.map((value) => `- [x] ${value}`),
    '',
    'Affected documents:',
    '',
    ...affected.map((document) => `- ${document}`),
    '',
    'Reason:',
    '',
    reason,
  ].join('\n');
}

function declaration({ checks = [], affected = [], reason = '' } = {}) {
  return parseDocumentationImpact(documentationBody({ checks, affected, reason }));
}

function evaluate({ expectedDocs = [], changedPaths = [], checks, affected, reason = '' }) {
  return evaluateDocumentationImpact({
    expectedDocs,
    changedPaths,
    declaration: declaration({ checks, affected, reason }),
  });
}

test('normalizes only equivalent repository path syntax', () => {
  assert.equal(normalizeRepoPath(' apps/client/README.md '), 'apps/client/README.md');
  assert.equal(normalizeRepoPath('./apps/client/README.md'), 'apps/client/README.md');
  assert.equal(normalizeRepoPath('`apps/client/README.md`'), 'apps/client/README.md');
  assert.equal(normalizeRepoPath('../apps/client/README.md'), '../apps/client/README.md');
});

test('parses the current documentation map', () => {
  const mapping = parseDocsMap(currentMap);
  assert.equal(mapping.length, 3);
  assert.deepEqual(mapping.find((entry) => entry.id === 'client-demo'), {
    id: 'client-demo',
    paths: ['apps/client/src/**', 'apps/client/scripts/**'],
    docs: ['apps/client/README.md', 'apps/client/docs/content-workflow.md'],
  });
});

test('infers one and multiple documents from mapped paths', () => {
  const mapping = parseDocsMap(`
    version: 1
    documentation:
      - id: one
        paths: [src/one.js]
        docs: [docs/one.md, docs/shared.md]
      - id: two
        paths: [src/two.js]
        docs: [docs/two.md, docs/shared.md]
  `);

  assert.deepEqual(inferExpectedDocs(['src/one.js'], mapping), ['docs/one.md', 'docs/shared.md']);
  assert.deepEqual(inferExpectedDocs(['src/one.js', 'src/two.js'], mapping), [
    'docs/one.md',
    'docs/shared.md',
    'docs/two.md',
  ]);
  assert.deepEqual(inferExpectedDocs(['src/unrelated.js'], mapping), []);
});

test('preserves overlapping path ownership and deduplicates documents', () => {
  const mapping = parseDocsMap(`
    version: 1
    documentation:
      - id: broad
        paths:
          - src/**
        docs:
          - docs/shared.md
      - id: narrow
        paths:
          - src/specific.js
        docs:
          - docs/shared.md
          - docs/specific.md
  `);

  assert.deepEqual(inferExpectedDocs(['src/specific.js'], mapping), [
    'docs/shared.md',
    'docs/specific.md',
  ]);
});

test('parses quoted values and indentation variations', () => {
  const mapping = parseDocsMap(`version: 1
documentation:
  - id: quoted
    paths:
      - "./src/**"
    docs:
      - '\`docs/quoted.md\`'
  `);
  assert.deepEqual(mapping[0], {
    id: 'quoted',
    paths: ['src/**'],
    docs: ['docs/quoted.md'],
  });
});

test('reports malformed YAML separately from invalid schema', () => {
  assert.throws(() => parseDocsMap('version: [1\ndocumentation: []'), /malformed YAML/);
  assert.throws(() => parseDocsMap('version: 2\ndocumentation: []'), /expected "version" to be 1/);
  assert.throws(
    () => parseDocsMap('version: 1'),
    /expected "documentation" to be a non-empty array/
  );
  assert.throws(
    () => parseDocsMap('version: 1\ndocumentation: []'),
    /expected "documentation" to be a non-empty array/
  );
});

test('validates documentation map entries and duplicate ids', () => {
  assert.throws(
    () =>
      parseDocsMap('version: 1\ndocumentation:\n  - id: one\n    paths: []\n    docs: [docs/a.md]'),
    /documentation\[0\]\.paths.*non-empty array/
  );
  assert.throws(
    () =>
      parseDocsMap('version: 1\ndocumentation:\n  - id: one\n    paths: [src/a.js]\n    docs: []'),
    /documentation\[0\]\.docs.*non-empty array/
  );
  assert.throws(
    () =>
      parseDocsMap(
        'version: 1\ndocumentation:\n  - id: ""\n    paths: [src/a.js]\n    docs: [docs/a.md]'
      ),
    /documentation\[0\]\.id.*non-empty string/
  );
  assert.throws(
    () =>
      parseDocsMap(`version: 1
documentation:
  - id: duplicate
    paths: [src/a.js]
    docs: [docs/a.md]
  - id: duplicate
    paths: [src/b.js]
    docs: [docs/b.md]`),
    /duplicate documentation id/
  );
});

test('parses all declaration options and established annotated document bullets', () => {
  const parsed = parseDocumentationImpact(`## Documentation impact

- [ ] Documentation updated
- [x] Existing documentation reviewed; no update required
- [ ] No relevant documentation exists yet

Affected documents:

- apps/client/README.md
- \`apps/client/docs/content-workflow.md\` — reviewed for the content workflow.
- \`apps/client/README.md\` — duplicate annotation.
- none
- <!-- List paths from .docs-map.yml, or write “none”. -->

Reason:

Checked the current content workflow and its contract.
It remains accurate.

## Testing
`);

  assert.equal(parsed.declaration, 'reviewed');
  assert.equal(parsed.selectedCount, 1);
  assert.deepEqual(parsed.affectedDocuments, [
    'apps/client/README.md',
    'apps/client/docs/content-workflow.md',
  ]);
  assert.equal(
    parsed.reason,
    'Checked the current content workflow and its contract.\nIt remains accurate.'
  );
});

test('parses naked, backticked, duplicate, and none affected-document forms', () => {
  const parsed = parseDocumentationImpact(`## Documentation impact
- [x] Documentation updated

Affected documents:
- ./docs/a.md
- \`docs/b.md\`
- \`docs/a.md\` — updated
- none

Reason:
optional
`);
  assert.deepEqual(parsed.affectedDocuments, ['docs/a.md', 'docs/b.md']);
});

test('requires exactly one checked checkbox', () => {
  assert.equal(parseDocumentationImpact(documentationBody()).selectedCount, 0);
  assert.equal(
    parseDocumentationImpact(
      documentationBody({
        checks: ['Documentation updated', 'No relevant documentation exists yet'],
      })
    ).selectedCount,
    2
  );
  assert.equal(
    parseDocumentationImpact(
      documentationBody({
        checks: [
          'Documentation updated',
          'Existing documentation reviewed; no update required',
          'No relevant documentation exists yet',
        ],
      })
    ).selectedCount,
    3
  );
});

test('strips template comments when evaluating reason', () => {
  const parsed = parseDocumentationImpact(`## Documentation impact
- [x] Existing documentation reviewed; no update required

Affected documents:
- docs/a.md

Reason:
<!-- Explain why no update is needed. -->
`);
  assert.equal(parsed.reason, '');
});

test('accepts updated documentation when at least one expected document changed', () => {
  const result = evaluate({
    expectedDocs: ['docs/a.md'],
    changedPaths: ['docs/a.md'],
    checks: ['Documentation updated'],
    affected: ['docs/a.md'],
  });
  assert.equal(result.ok, true);
});

test('accepts a mixed update and review when one expected document changed', () => {
  const result = evaluate({
    expectedDocs: ['docs/a.md', 'docs/b.md'],
    changedPaths: ['docs/a.md'],
    checks: ['Documentation updated'],
    affected: ['docs/a.md', 'docs/b.md'],
    reason: 'A changed; B was reviewed and remains correct.',
  });
  assert.equal(result.ok, true);
});

test('rejects updated documentation when no expected mapped document changed', () => {
  const unchanged = evaluate({
    expectedDocs: ['docs/a.md'],
    changedPaths: [],
    checks: ['Documentation updated'],
    affected: ['docs/a.md'],
  });
  assert.equal(unchanged.ok, false);
  assert.ok(unchanged.errors.some((error) => error.code === 'updated-document-unchanged'));

  const unrelated = evaluate({
    expectedDocs: ['docs/a.md'],
    changedPaths: ['docs/unrelated.md'],
    checks: ['Documentation updated'],
    affected: ['docs/a.md'],
  });
  assert.equal(unrelated.ok, false);
  assert.deepEqual(unrelated.changedExpectedDocs, []);
});

test('requires every expected document to be listed', () => {
  const result = evaluate({
    expectedDocs: ['docs/a.md', 'docs/b.md'],
    changedPaths: ['docs/a.md'],
    checks: ['Documentation updated'],
    affected: ['docs/a.md'],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.find((error) => error.code === 'missing-affected-document').paths,
    ['docs/b.md']
  );
});

test('requires a reason for reviewed documentation', () => {
  const valid = evaluate({
    expectedDocs: ['docs/a.md'],
    checks: ['Existing documentation reviewed; no update required'],
    affected: ['docs/a.md'],
    reason: 'The existing contract remains accurate.',
  });
  assert.equal(valid.ok, true);

  for (const reason of ['', '   ', '<!-- comment only -->']) {
    const invalid = evaluate({
      expectedDocs: ['docs/a.md'],
      checks: ['Existing documentation reviewed; no update required'],
      affected: ['docs/a.md'],
      reason,
    });
    assert.equal(invalid.ok, false);
    assert.ok(invalid.errors.some((error) => error.code === 'reviewed-reason-required'));
  }

  const missingDocument = evaluate({
    expectedDocs: ['docs/a.md'],
    checks: ['Existing documentation reviewed; no update required'],
    affected: [],
    reason: 'The existing contract remains accurate.',
  });
  assert.equal(missingDocument.ok, false);
});

test('rejects no-relevant-documentation when mapping expects documents', () => {
  const contradictory = evaluate({
    expectedDocs: ['docs/a.md'],
    checks: ['No relevant documentation exists yet'],
    affected: [],
  });
  assert.equal(contradictory.ok, false);
  assert.ok(
    contradictory.errors.some((error) => error.code === 'documentation-declaration-contradiction')
  );

  const valid = evaluate({
    expectedDocs: [],
    checks: ['No relevant documentation exists yet'],
    affected: [],
  });
  assert.equal(valid.ok, true);
});

test('requires a declaration on PR events even with no expected mapped documents', () => {
  const missing = evaluate({
    expectedDocs: [],
    changedPaths: [],
    declaration: parseDocumentationImpact(''),
  });
  assert.equal(missing.ok, false);

  const docsOnly = evaluate({
    expectedDocs: [],
    changedPaths: ['docs/unmapped.md'],
    checks: ['Documentation updated'],
    affected: [],
  });
  assert.equal(docsOnly.ok, true);
});

test('formats all relevant state and problems for CI diagnostics', () => {
  const result = evaluate({
    expectedDocs: ['docs/a.md', 'docs/b.md'],
    changedPaths: [],
    checks: ['Documentation updated'],
    affected: ['docs/a.md'],
  });
  const output = formatDocumentationImpactResult(result);
  assert.match(output, /Expected mapped documents:/);
  assert.match(output, /docs\/b\.md/);
  assert.match(output, /Expected mapped documents actually changed:\n- none/);
  assert.match(output, /Problems:/);
});

test('uses the current PR template shape as a parser fixture', () => {
  const template = fs.readFileSync('.github/pull_request_template.md', 'utf8');
  const parsed = parseDocumentationImpact(template);
  assert.equal(parsed.selectedCount, 0);
  assert.deepEqual(parsed.affectedDocuments, []);
  assert.equal(parsed.reason, '');
});
