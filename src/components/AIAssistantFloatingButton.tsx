import { Loader2, MessageCircleQuestion, SendHorizontal, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchAssistantReply, type AssistantChatMessage } from '../lib/aiAssistant';
import {
  getAssistantPageHint,
  getAssistantStarterQuestions,
  loadRelevantAssistantServices,
} from '../lib/assistantContext';

interface ChatMessage extends AssistantChatMessage {
  id: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'assistant-welcome',
  role: 'assistant',
  content: 'I can help with maps, entertainment, transport, and simple SafeConnect steps. Ask a question any time.',
};

function buildMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AIAssistantFloatingButton() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterQuestions = useMemo(() => getAssistantStarterQuestions(pathname), [pathname]);
  const pageHint = useMemo(() => getAssistantPageHint(pathname), [pathname]);

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, loading, open]);

  const sendMessage = async (draft?: string) => {
    const message = (draft ?? inputValue).trim();
    if (!message || loading) return;

    const nextUserMessage: ChatMessage = {
      id: buildMessageId('user'),
      role: 'user',
      content: message,
    };

    const history = messages
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));

    setMessages(prev => [...prev, nextUserMessage]);
    setInputValue('');
    setErrorMessage('');
    setLoading(true);

    try {
      const serviceMatches = await loadRelevantAssistantServices(message);
      const answer = await fetchAssistantReply({
        message,
        history,
        pagePath: pathname,
        serviceMatches,
      });

      setMessages(prev => [
        ...prev,
        {
          id: buildMessageId('assistant'),
          role: 'assistant',
          content: answer,
        },
      ]);
    } catch (error) {
      const nextErrorMessage =
        error instanceof Error ? error.message : 'AI help is unavailable right now. Please try again in a moment.';
      setErrorMessage(nextErrorMessage);
      setMessages(prev => [
        ...prev,
        {
          id: buildMessageId('assistant'),
          role: 'assistant',
          content: nextErrorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    await sendMessage();
  };

  return (
    <div className="fixed bottom-24 right-4 z-30 md:bottom-6 md:right-6">
      {open ? (
        <div className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Sparkles className="h-4 w-4 text-teal-600" />
                SafeConnect Help
              </div>
              <p className="mt-1 text-xs leading-5 text-gray-500">{pageHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close AI help"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto bg-gray-50 px-3 py-3">
            <div className="space-y-3">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${
                      message.role === 'assistant'
                        ? 'bg-white text-gray-700'
                        : 'bg-teal-600 text-white'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {messages.length <= 1 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Try asking</p>
                  <div className="flex flex-wrap gap-2">
                    {starterQuestions.map(question => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => {
                          setOpen(true);
                          void sendMessage(question);
                        }}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-teal-200 hover:text-teal-700"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                    Thinking through that now...
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-100 bg-white p-3">
            <label htmlFor="assistant-message" className="sr-only">
              Ask SafeConnect help
            </label>
            <div className="rounded-lg border border-gray-200 bg-white focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
              <textarea
                id="assistant-message"
                ref={inputRef}
                rows={2}
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about services, entertainment, the map, or transport..."
                className="block w-full resize-none rounded-lg border-0 px-3 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 text-xs leading-5 text-gray-500">
                Public service info only. For urgent danger, call emergency services.
              </p>
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                Send
              </button>
            </div>

            {errorMessage ? <p className="mt-2 text-xs text-amber-700">{errorMessage}</p> : null}
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-teal-700 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
          aria-label="Open AI help"
        >
          <MessageCircleQuestion className="h-5 w-5" />
          <span className="hidden sm:inline">Ask for help</span>
        </button>
      )}
    </div>
  );
}
