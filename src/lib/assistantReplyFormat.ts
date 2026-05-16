const GENERIC_ASSISTANT_ERROR = 'AI help is unavailable right now. Please try again in a moment.';
const ALLOWED_SECTION_HEADING_PATTERN = /^(Answer|Next step|Note|Places to check):(?:\n|$)/;
const ACTION_LINE_PATTERN = /^(Tap|Open|Press|Choose|Select|Click|Use|Enter|Type|Search|Ask|Call|Check|Go to)\b/i;
const INCOMPLETE_ENDING_PATTERN = /\b(?:the|a|an|to|for|with|and|or|on|in|at|by|of|this|that)\.?$/i;

function trimDanglingFragment(value: string): string {
  const lines = value.split('\n');
  const lastIndex = lines.length - 1;
  const lastLine = lines[lastIndex].trimEnd();
  const sentenceEndIndex = Math.max(lastLine.lastIndexOf('.'), lastLine.lastIndexOf('!'), lastLine.lastIndexOf('?'));

  if (sentenceEndIndex >= 0 && sentenceEndIndex < lastLine.length - 1) {
    const trailingFragment = lastLine.slice(sentenceEndIndex + 1).trim();
    if (trailingFragment && trailingFragment.split(/\s+/).length <= 4) {
      lines[lastIndex] = lastLine.slice(0, sentenceEndIndex + 1);
      return lines.join('\n').trim();
    }
  }

  if (INCOMPLETE_ENDING_PATTERN.test(lastLine) && lines.length > 1) {
    lines.pop();
    return lines.join('\n').trim();
  }

  return value;
}

function cleanLine(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\s*(?:[-*\u2022]+|\d+[.)])\s+/, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[`*]/g, '')
    .trimEnd();
}

export function normalizeAssistantReply(raw: string): string {
  const cleaned = trimDanglingFragment(raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(cleanLine)
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim());

  if (!cleaned) return GENERIC_ASSISTANT_ERROR;

  if (ALLOWED_SECTION_HEADING_PATTERN.test(cleaned)) {
    return cleaned;
  }

  const sections = cleaned
    .split(/\n{2,}/)
    .map(section => section.trim())
    .filter(Boolean);

  if (sections.length <= 1) {
    const lines = cleaned
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    const actionStartIndex = lines.findIndex((line, index) => index > 0 && ACTION_LINE_PATTERN.test(line));

    if (actionStartIndex > 0) {
      return [
        `Answer:\n${lines.slice(0, actionStartIndex).join('\n')}`,
        `Next step:\n${lines.slice(actionStartIndex).join('\n')}`,
      ].join('\n\n');
    }

    return `Answer:\n${cleaned}`;
  }

  return [
    `Answer:\n${sections[0]}`,
    `Next step:\n${sections.slice(1).join('\n')}`,
  ].join('\n\n');
}
