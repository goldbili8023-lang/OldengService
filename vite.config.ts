import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantServiceMatch {
  name: string;
  category: string;
  suburb: string;
  address: string;
  status: string;
  openingHours: string;
  description: string;
}

interface GeminiResponsePart {
  text?: string;
}

interface GeminiResponsePayload {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[];
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const ASSISTANT_REPLY_FORMAT_INSTRUCTIONS = [
  'Reply in English unless the user clearly asks for another language.',
  'Use compact plain-text sections only.',
  'Prefer this template: Answer: one short direct answer. Next step: tap "Button name" or open "Page name". Note: one safety or limitation note when needed.',
  'You may omit Next step or Note when they are not useful.',
  'Only use these section headings: Answer:, Next step:, Note:, Places to check:.',
  'Do not use Markdown, asterisks, bold text, bullet markers, numbered Markdown lists, # headings, backticks, Markdown links, emoji, or decorative formatting.',
  'Use double quotes for app buttons, page names, and clickable text, for example Tap "Map" or Press "Send".',
  'Keep each section to 1 or 2 short sentences. Aim for 45 to 90 words total.',
  'If steps are needed, use at most 3 short plain-text lines.',
].join(' ');

function getGeminiErrorMessage(statusCode: number, payload: GeminiResponsePayload): string {
  const errorStatus = payload.error?.status ?? '';

  if (statusCode === 429 || errorStatus === 'RESOURCE_EXHAUSTED') {
    return 'AI usage limit has been reached for now. Please try again later.';
  }

  if (statusCode === 401 || statusCode === 403 || errorStatus === 'PERMISSION_DENIED') {
    return 'AI help is not authorized. Please check the Gemini API key.';
  }

  if (statusCode === 400 || statusCode === 404 || errorStatus === 'INVALID_ARGUMENT' || errorStatus === 'NOT_FOUND') {
    return 'The selected AI model is not available. Please check the Gemini model setting.';
  }

  return 'AI help is unavailable right now. Please try again in a moment.';
}

function getPageContext(pagePath: string): string {
  if (pagePath.startsWith('/senior/map')) {
    return 'The map page helps older adults search community services, use Near Me, filter categories, and check transport options.';
  }

  if (pagePath.startsWith('/senior/help')) {
    return 'The help page offers short step-by-step guides for common tasks inside SafeConnect.';
  }

  if (pagePath.startsWith('/senior/clothing-advice')) {
    return 'The clothing advice page gives practical clothing suggestions based on current temperature and weather.';
  }

  if (pagePath.startsWith('/senior/contacts')) {
    return 'The contacts page is for trusted contacts and emergency contacts.';
  }

  return 'The home page gives quick access to key actions, weather, and community support summaries.';
}

function buildServiceContext(serviceMatches: AssistantServiceMatch[]): string {
  if (serviceMatches.length === 0) {
    return 'No closely matched public services were found for this question.';
  }

  return serviceMatches
    .map(
      (service, index) =>
        `${index + 1}. ${service.name} | ${service.category} | ${service.suburb} | ${service.address} | ${service.status} | ${service.openingHours} | ${service.description}`,
    )
    .join('\n');
}

function getTextFromGeminiResponse(payload: GeminiResponsePayload): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map(part => part.text ?? '')
    .join('')
    .trim();
}

async function readJsonRequest(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > 1_000_000) {
      throw new Error('Request body is too large.');
    }

    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {};
}

function sendJson(res: ServerResponse, statusCode: number, payload: Record<string, unknown>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function createAiAssistantDevProxy(env: Record<string, string>): Plugin {
  return {
    name: 'safeconnect-ai-assistant-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai-assistant', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed.' });
          return;
        }

        try {
          const geminiApiKey = env.GEMINI_API_KEY;
          if (!geminiApiKey) {
            sendJson(res, 500, { error: 'AI help is not configured yet.' });
            return;
          }

          const geminiModel = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
          const body = await readJsonRequest(req);
          const message = typeof body.message === 'string' ? body.message.trim() : '';
          const pagePath = typeof body.pagePath === 'string' ? body.pagePath : '/senior';
          const history = Array.isArray(body.history) ? body.history as AssistantHistoryItem[] : [];
          const serviceMatches = Array.isArray(body.serviceMatches)
            ? (body.serviceMatches as AssistantServiceMatch[]).slice(0, 8)
            : [];

          if (!message) {
            sendJson(res, 400, { error: 'Please enter a question first.' });
            return;
          }

          const contents = [
            ...history
              .slice(-8)
              .filter(item => item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'assistant'))
              .map(item => ({
                role: item.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: item.content }],
              })),
            {
              role: 'user',
              parts: [
                {
                  text: [
                    `Current page: ${pagePath}`,
                    `Page context: ${getPageContext(pagePath)}`,
                    `Relevant public services:\n${buildServiceContext(serviceMatches)}`,
                    `User question: ${message}`,
                  ].join('\n\n'),
                },
              ],
            },
          ];

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiApiKey,
              },
              body: JSON.stringify({
                system_instruction: {
                  parts: [
                    {
                      text: [
                        'You are SafeConnect Help, a gentle assistant for older adults using a community support app.',
                        'Keep answers short, calm, and practical.',
                        'Use simple language and short steps.',
                        'You may help with app usage, map search, public service information, and transport guidance inside SafeConnect.',
                        'Use only the public service context provided in the prompt when naming services.',
                        ASSISTANT_REPLY_FORMAT_INSTRUCTIONS,
                        'Do not claim to see private contacts, medications, profiles, or any hidden data.',
                        'Do not give medical diagnosis, legal advice, or emergency judgement.',
                        'If the user sounds unsafe or in urgent danger, tell them to contact emergency services or a trusted person right away.',
                      ].join(' '),
                    },
                  ],
                },
                contents,
                generationConfig: {
                  temperature: 0.4,
                  maxOutputTokens: 900,
                },
              }),
            },
          );

          const geminiPayload = await geminiResponse.json().catch(() => ({})) as GeminiResponsePayload;

          if (!geminiResponse.ok) {
            console.error('Gemini API error', geminiResponse.status, geminiPayload);
            sendJson(res, 502, { error: getGeminiErrorMessage(geminiResponse.status, geminiPayload) });
            return;
          }

          const answer = getTextFromGeminiResponse(geminiPayload);
          if (!answer) {
            console.error('Gemini returned no answer', geminiPayload);
            sendJson(res, 502, { error: 'AI help is unavailable right now. Please try again in a moment.' });
            return;
          }

          sendJson(res, 200, { answer });
        } catch (error) {
          console.error('Local AI assistant proxy error', error);
          sendJson(res, 500, { error: 'AI help is unavailable right now. Please try again in a moment.' });
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), createAiAssistantDevProxy(env)],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
