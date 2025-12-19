import { useState } from 'react';

interface ApiResponse {
  answer: string;
  citations: string[];
  searches: string[];
}

export function AskPage() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: context || undefined
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatAnswer = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Ask a Question</h1>
        <p className="text-gray-400 mt-1">
          Get instant, citation-backed answers to security and compliance questions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="question"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Does Zenlytic have SOC2 certification?"
            className="w-full px-4 py-3 bg-zenlytic-dark-tertiary border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-zenlytic-cyan focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        <div>
          <label
            htmlFor="context"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Additional Context{' '}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            id="context"
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g., This is for a healthcare customer"
            className="w-full px-4 py-2 bg-zenlytic-dark-tertiary border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-zenlytic-cyan focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-6 py-2.5 bg-zenlytic-green text-white font-medium rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing
            </span>
          ) : (
            'Get Answer'
          )}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {response && (
        <div className="p-6 card-dark rounded-xl space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
              Response
            </h3>
            <div
              className="prose prose-invert prose-sm max-w-none text-gray-200"
              dangerouslySetInnerHTML={{ __html: formatAnswer(response.answer) }}
            />
          </div>

          {response.citations.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-400 mb-2">
                Citations
              </h4>
              <ul className="space-y-1">
                {response.citations.map((citation, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-300 flex items-start gap-2"
                  >
                    <span className="text-zenlytic-cyan">•</span>
                    {citation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {response.searches.length > 0 && (
            <details className="pt-4 border-t border-white/10">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-300">
                Searches performed ({response.searches.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {response.searches.map((search, i) => (
                  <li key={i} className="text-xs font-mono text-gray-500">
                    {search}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Example questions */}
      <div className="pt-4">
        <p className="text-sm text-gray-500 mb-2">Example questions:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Does Zenlytic have SOC2 certification?',
            'How does Zenlytic encrypt data?',
            'Does Zenlytic perform background checks?',
            'What is the breach notification timeline?',
          ].map((q) => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="text-sm px-3 py-1.5 bg-white/5 text-gray-400 rounded-full hover:bg-white/10 hover:text-white transition-colors border border-white/10"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
