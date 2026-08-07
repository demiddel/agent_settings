import YAML from 'yaml';

const DECLARATION_LABELS = {
  updated: 'Documentation updated',
  reviewed: 'Existing documentation reviewed; no update required',
  none: 'No relevant documentation exists yet',
};

const DECLARATIONS = Object.entries(DECLARATION_LABELS);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalidMap(message) {
  throw new Error(`Invalid .docs-map.yml: ${message}`);
}

function parseYaml(yamlText) {
  try {
    return YAML.parse(yamlText);
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`Invalid .docs-map.yml: malformed YAML.${detail}`, { cause: error });
  }
}

function parseStringArray(value, field, entryIndex) {
  if (!Array.isArray(value) || value.length === 0) {
    invalidMap(`expected "documentation[${entryIndex}].${field}" to be a non-empty array.`);
  }

  return value.map((item, itemIndex) => {
    if (typeof item !== 'string' || normalizeRepoPath(item) === '') {
      invalidMap(
        `expected "documentation[${entryIndex}].${field}[${itemIndex}]" to be a non-empty string.`
      );
    }
    return normalizeRepoPath(item);
  });
}

export function normalizeRepoPath(value) {
  if (typeof value !== 'string') return '';

  let normalized = value.trim();
  if (normalized.startsWith('`') && normalized.endsWith('`') && normalized.length >= 2) {
    normalized = normalized.slice(1, -1).trim();
  }
  while (normalized.startsWith('./')) normalized = normalized.slice(2);
  return normalized;
}

export function parseDocsMap(yamlText) {
  const parsed = parseYaml(yamlText);

  if (!isRecord(parsed)) invalidMap('expected the root value to be an object.');
  if (parsed.version !== 1) invalidMap('expected "version" to be 1.');
  if (!Array.isArray(parsed.documentation) || parsed.documentation.length === 0) {
    invalidMap('expected "documentation" to be a non-empty array.');
  }

  const ids = new Set();
  return parsed.documentation.map((item, entryIndex) => {
    if (!isRecord(item)) invalidMap(`expected "documentation[${entryIndex}]" to be an object.`);

    if (typeof item.id !== 'string' || item.id.trim() === '') {
      invalidMap(`expected "documentation[${entryIndex}].id" to be a non-empty string.`);
    }
    const id = item.id.trim();
    if (ids.has(id)) invalidMap(`duplicate documentation id "${id}".`);
    ids.add(id);

    return {
      id,
      paths: parseStringArray(item.paths, 'paths', entryIndex),
      docs: parseStringArray(item.docs, 'docs', entryIndex),
    };
  });
}

export function globToRegExp(pattern) {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    if (pattern[index] === '*' && pattern[index + 1] === '*') {
      source += '.*';
      index += 1;
    } else if (pattern[index] === '*') {
      source += '[^/]*';
    } else if (pattern[index] === '?') {
      source += '[^/]';
    } else {
      source += pattern[index].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`${source}$`);
}

export function inferExpectedDocs(changedPaths, mapping) {
  const expectedDocs = new Set();
  const normalizedChangedPaths = changedPaths.map(normalizeRepoPath);

  for (const entry of mapping) {
    const matches = normalizedChangedPaths.some((changedPath) =>
      entry.paths.some((pattern) => globToRegExp(pattern).test(changedPath))
    );
    if (matches) {
      for (const doc of entry.docs) expectedDocs.add(normalizeRepoPath(doc));
    }
  }

  return [...expectedDocs];
}

function stripHtmlComments(value) {
  return value.replace(/<!--[\s\S]*?-->/g, '').trim();
}

function extractAffectedDocument(bullet) {
  const withoutComments = stripHtmlComments(bullet);
  if (!withoutComments) return '';

  const backticked = withoutComments.match(/^`([^`]+)`/);
  if (backticked) return normalizeRepoPath(backticked[1]);

  return normalizeRepoPath(withoutComments.split(/\s+[—–]\s+/)[0]);
}

function parseAffectedDocuments(section) {
  const affectedMatch = section.match(
    /(?:^|\n)\s*Affected documents:\s*\n?([\s\S]*?)(?=\n\s*Reason\s*:|$)/i
  );
  if (!affectedMatch) return [];

  const documents = new Set();
  for (const line of affectedMatch[1].split('\n')) {
    const bullet = line.match(/^\s*-\s+(.+)$/);
    if (!bullet) continue;
    const document = extractAffectedDocument(bullet[1]);
    if (document.toLowerCase() === 'none' || document === '') continue;
    documents.add(document);
  }
  return [...documents];
}

function parseReason(section) {
  const reasonMatch = section.match(/(?:^|\n)\s*Reason\s*:\s*([\s\S]*)$/i);
  return reasonMatch ? stripHtmlComments(reasonMatch[1]) : '';
}

function declarationCheckboxes(section) {
  return DECLARATIONS.flatMap(([value, label]) => {
    const pattern = new RegExp(
      `^\\s*-\\s*\\[[xX]\\]\\s+${label.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*$`,
      'im'
    );
    return pattern.test(section) ? [value] : [];
  });
}

export function parseDocumentationImpact(body) {
  const sectionMatch = String(body ?? '').match(
    /(?:^|\n)##\s+Documentation impact\s*\n?([\s\S]*?)(?=\n##\s|$)/i
  );
  const section = sectionMatch?.[1] ?? '';
  const selected = declarationCheckboxes(section);

  return {
    declaration: selected.length === 1 ? selected[0] : null,
    selectedCount: selected.length,
    affectedDocuments: parseAffectedDocuments(section),
    reason: parseReason(section),
  };
}

function uniqueNormalizedPaths(paths = []) {
  return [...new Set(paths.map(normalizeRepoPath).filter(Boolean))];
}

export function evaluateDocumentationImpact({ expectedDocs = [], changedPaths = [], declaration }) {
  const normalizedExpectedDocs = uniqueNormalizedPaths(expectedDocs);
  const normalizedChangedPaths = new Set(uniqueNormalizedPaths(changedPaths));
  const declaredDocs = uniqueNormalizedPaths(declaration?.affectedDocuments);
  const changedExpectedDocs = normalizedExpectedDocs.filter((doc) =>
    normalizedChangedPaths.has(doc)
  );
  const errors = [];

  if (!declaration || declaration.selectedCount !== 1) {
    errors.push({
      code: 'invalid-declaration',
      message: 'Select exactly one Documentation impact option in the PR body.',
      paths: [],
    });
  }

  const missingAffectedDocuments = normalizedExpectedDocs.filter(
    (doc) => !declaredDocs.includes(doc)
  );
  if (missingAffectedDocuments.length > 0) {
    errors.push({
      code: 'missing-affected-document',
      message: 'Affected documents is missing expected mapped documentation.',
      paths: missingAffectedDocuments,
    });
  }

  if (declaration?.declaration === 'updated' && normalizedExpectedDocs.length > 0) {
    if (changedExpectedDocs.length === 0) {
      errors.push({
        code: 'updated-document-unchanged',
        message:
          'Documentation updated requires at least one expected mapped document to actually change.',
        paths: [],
      });
    }
  }

  if (declaration?.declaration === 'reviewed') {
    if (!declaration.reason?.trim()) {
      errors.push({
        code: 'reviewed-reason-required',
        message:
          'Existing documentation reviewed; no update required requires a meaningful Reason.',
        paths: [],
      });
    }
  }

  if (declaration?.declaration === 'none' && normalizedExpectedDocs.length > 0) {
    errors.push({
      code: 'documentation-declaration-contradiction',
      message:
        'No relevant documentation exists yet contradicts the mapped documentation expected by .docs-map.yml.',
      paths: normalizedExpectedDocs,
    });
  }

  return {
    ok: errors.length === 0,
    declaration: declaration?.declaration ?? null,
    expectedDocs: normalizedExpectedDocs,
    declaredDocs,
    changedExpectedDocs,
    errors,
  };
}

function formatPaths(paths) {
  return paths.length > 0 ? paths.map((path) => `- ${path}`) : ['- none'];
}

function formatError(error) {
  return [`- ${error.message}`, ...error.paths.map((path) => `  - ${path}`)];
}

export function formatDocumentationImpactResult(result) {
  const declaration = result.declaration ? DECLARATION_LABELS[result.declaration] : 'none selected';
  const lines = [
    result.ok
      ? 'Documentation impact declaration is consistent.'
      : 'Documentation impact declaration is inconsistent.',
    '',
    `Declaration: ${declaration}`,
    '',
    'Expected mapped documents:',
    ...formatPaths(result.expectedDocs),
    '',
    'Affected documents:',
    ...formatPaths(result.declaredDocs),
    '',
    'Expected mapped documents actually changed:',
    ...formatPaths(result.changedExpectedDocs),
  ];

  if (result.errors.length > 0) {
    lines.push('', 'Problems:', ...result.errors.flatMap(formatError));
  }

  return lines.join('\n');
}
