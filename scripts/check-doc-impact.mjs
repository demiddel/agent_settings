import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  evaluateDocumentationImpact,
  formatDocumentationImpactResult,
  inferExpectedDocs,
  parseDocumentationImpact,
  parseDocsMap,
} from './lib/doc-impact.mjs';

const root = process.cwd();

function readEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`Invalid GitHub event payload.${detail}`, { cause: error });
  }
}

function changedPathsFor(event) {
  const base = event?.pull_request?.base?.sha;
  const head = event?.pull_request?.head?.sha;
  const diffArgs =
    base && head ? ['diff', '--name-only', `${base}...${head}`] : ['diff', '--name-only', 'HEAD'];
  const trackedChanged = execFileSync('git', diffArgs, { cwd: root, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  const untracked =
    base && head
      ? []
      : execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
          cwd: root,
          encoding: 'utf8',
        })
          .trim()
          .split('\n')
          .filter(Boolean);

  return [...new Set([...trackedChanged, ...untracked])];
}

function printLocalSummary(expectedDocs) {
  if (expectedDocs.length === 0) {
    console.log('Documentation impact: no mapped code paths changed.');
  } else {
    console.log('Mapped documentation impact:');
    for (const doc of expectedDocs) console.log(`- ${doc}`);
  }
  console.log('\nLocal review: add the Documentation impact declaration when opening the PR.');
}

function main() {
  const mapping = parseDocsMap(fs.readFileSync(path.join(root, '.docs-map.yml'), 'utf8'));
  const event = readEvent();
  const changedPaths = changedPathsFor(event);
  const expectedDocs = inferExpectedDocs(changedPaths, mapping);

  if (!event?.pull_request) {
    printLocalSummary(expectedDocs);
    return 0;
  }

  const declaration = parseDocumentationImpact(event.pull_request.body ?? '');
  const result = evaluateDocumentationImpact({ expectedDocs, changedPaths, declaration });
  console.log(formatDocumentationImpactResult(result));
  return result.ok ? 0 : 1;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
