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

function getFetchErrorMessage(): string {
  if (import.meta.env.DEV) {
    return 'AI help server is not reachable. Restart npm run dev so the local AI proxy can load your .env settings.';
  }

  return 'AI help is unavailable right now. Please try again in a moment.';
}

export async function fetchAssistantReply({
  message,
  history,
  pagePath,
  serviceMatches,
}: AssistantRequest): Promise<string> {
  const useLocalDevProxy = import.meta.env.DEV;

  if (!useLocalDevProxy && (!supabaseUrl || !supabaseAnonKey)) {
    throw new Error('AI help is not configured yet.');
  }

  const endpoint = useLocalDevProxy
    ? '/api/ai-assistant'
    : `${supabaseUrl}/functions/v1/ai-assistant`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!useLocalDevProxy) {
    headers.Authorization = `Bearer ${supabaseAnonKey}`;
    headers.apikey = supabaseAnonKey;
  }

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        history,
        pagePath,
        serviceMatches,
      }),
    });
  } catch {
    throw new Error(getFetchErrorMessage());
  }

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
