const GENERIC_ASSISTANT_ERROR = 'AI help is unavailable right now. Please try again in a moment.';

function cleanLine(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\s*(?:[-*•]+|\d+[.)])\s+/, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[`*]/g, '')
    .trimEnd();
}

export function normalizeAssistantReply(raw: string): string {
  const cleaned = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(cleanLine)
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned || GENERIC_ASSISTANT_ERROR;
}
