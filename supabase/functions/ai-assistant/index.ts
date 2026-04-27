const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
}

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

function getPageContext(pagePath: string): string {
  if (pagePath.startsWith('/senior/map')) {
    return 'The map page helps older adults search community services, use Near Me, filter categories, and check transport options.';
  }

  if (pagePath.startsWith('/senior/help')) {
    return 'The help page offers short step-by-step guides for common tasks inside SafeConnect.';
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

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'AI help is not configured yet.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const geminiModel = Deno.env.get('GEMINI_MODEL')?.trim() || DEFAULT_GEMINI_MODEL;

    const body = await req.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const pagePath = typeof body?.pagePath === 'string' ? body.pagePath : '/senior';
    const history = Array.isArray(body?.history) ? (body.history as AssistantHistoryItem[]) : [];
    const serviceMatches = Array.isArray(body?.serviceMatches)
      ? (body.serviceMatches as AssistantServiceMatch[]).slice(0, 8)
      : [];

    if (!message) {
      return new Response(JSON.stringify({ error: 'Please enter a question first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
            maxOutputTokens: 420,
          },
        }),
      },
    );

    const geminiPayload = (await geminiResponse.json().catch(() => ({}))) as GeminiResponsePayload;

    if (!geminiResponse.ok) {
      console.error('Gemini API error', geminiPayload);

      return new Response(
        JSON.stringify({ error: 'AI help is unavailable right now. Please try again in a moment.' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const answer = getTextFromGeminiResponse(geminiPayload);
    if (!answer) {
      console.error('Gemini returned no answer', geminiPayload);

      return new Response(
        JSON.stringify({ error: 'AI help is unavailable right now. Please try again in a moment.' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-assistant error', error);

    return new Response(
      JSON.stringify({ error: 'AI help is unavailable right now. Please try again in a moment.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
