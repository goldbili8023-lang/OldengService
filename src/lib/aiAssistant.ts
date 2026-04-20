import { supabaseAnonKey, supabaseUrl } from './supabase';
import type { AssistantServiceMatch } from './assistantContext';

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantRequest {
  message: string;
  history: AssistantChatMessage[];
  pagePath: string;
  serviceMatches: AssistantServiceMatch[];
}

function getFriendlyErrorMessage(message: string): string {
  if (!message) return 'AI help is unavailable right now. Please try again in a moment.';

  if (message.includes('not configured')) {
    return 'AI help is not configured yet.';
  }

  return message;
}

export async function fetchAssistantReply({
  message,
  history,
  pagePath,
  serviceMatches,
}: AssistantRequest): Promise<string> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('AI help is not configured yet.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      message,
      history,
      pagePath,
      serviceMatches,
    }),
  });

  const rawBody = await response.text();
  let payload: { answer?: string; error?: string } = {};

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as { answer?: string; error?: string };
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    const fallbackMessage = response.status === 404
      ? 'AI help is not configured yet.'
      : 'AI help is unavailable right now. Please try again in a moment.';

    throw new Error(getFriendlyErrorMessage(payload.error ?? fallbackMessage));
  }

  if (typeof payload.answer !== 'string' || !payload.answer.trim()) {
    throw new Error('AI help is unavailable right now. Please try again in a moment.');
  }

  return payload.answer.trim();
}
