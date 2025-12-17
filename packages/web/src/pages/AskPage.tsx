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
        <h1 className="text-2xl font-bold text-gray-900">Ask a Question</h1>
        <p className="text-gray-600 mt-1">
          Get instant, citation-backed answers to security and compliance questions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="question"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Does Zenlytic have SOC2 certification?"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zenlytic-500 focus:border-zenlytic-500 resize-none"
            rows={3}
          />
        </div>

        <div>
          <label
            htmlFor="context"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Additional Context{' '}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="context"
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g., This is for a healthcare customer"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zenlytic-500 focus:border-zenlytic-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-6 py-2.5 bg-zenlytic-600 text-white font-medium rounded-lg hover:bg-zenlytic-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="loading-dot w-1.5 h-1.5 bg-white rounded-full" />
              <span className="loading-dot w-1.5 h-1.5 bg-white rounded-full" />
              <span className="loading-dot w-1.5 h-1.5 bg-white rounded-full" />
              <span className="ml-2">Processing</span>
            </span>
          ) : (
            'Get Answer'
          )}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {response && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Response
            </h3>
            <div
              className="prose prose-sm max-w-none text-gray-800"
              dangerouslySetInnerHTML={{ __html: formatAnswer(response.answer) }}
            />
          </div>

          {response.citations.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Citations
              </h4>
              <ul className="space-y-1">
                {response.citations.map((citation, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 flex items-start gap-2"
                  >
                    <span className="text-zenlytic-600">•</span>
                    {citation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {response.searches.length > 0 && (
            <details className="pt-4 border-t border-gray-100">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
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
              className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
