import { useState, useEffect } from 'react';

interface QAPair {
  id: string;
  q: string;
  a: string;
  keywords: string[];
}

export function AdminPage() {
  const [pairs, setPairs] = useState<QAPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New pair form
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPairs();
  }, []);

  const fetchPairs = async () => {
    try {
      const res = await fetch('/api/qa-pairs');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPairs(data.pairs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Q&A pairs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/qa-pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion,
          answer: newAnswer,
          keywords: newKeywords.split(',').map((k) => k.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      const data = await res.json();
      setPairs([...pairs, data.pair]);
      setNewQuestion('');
      setNewAnswer('');
      setNewKeywords('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Q&A pair');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        <p className="text-gray-600 mt-1">
          Manage approved Q&A pairs and knowledge base.
        </p>
      </div>

      {/* Add new pair */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add Approved Q&A Pair
        </h2>
        <form onSubmit={handleAddPair} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question
            </label>
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="e.g., Does Zenlytic have ISO 27001 certification?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zenlytic-500 focus:border-zenlytic-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approved Answer
            </label>
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="**No** - Zenlytic does not currently hold ISO 27001 certification. Our SOC2 Type II certification covers comparable controls. [Security Homepage]"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zenlytic-500 focus:border-zenlytic-500 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords{' '}
              <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              placeholder="ISO, ISO 27001, certification"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zenlytic-500 focus:border-zenlytic-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
            className="px-4 py-2 bg-zenlytic-600 text-white font-medium rounded-lg hover:bg-zenlytic-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Q&A Pair'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Existing pairs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Approved Q&A Pairs ({pairs.length})
        </h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : pairs.length === 0 ? (
          <p className="text-gray-500">No Q&A pairs yet.</p>
        ) : (
          <div className="space-y-3">
            {pairs.map((pair) => (
              <div
                key={pair.id}
                className="p-4 bg-white border border-gray-200 rounded-lg"
              >
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Q: {pair.q}
                </p>
                <p className="text-sm text-gray-700 mb-2">A: {pair.a}</p>
                {pair.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pair.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Knowledge base info */}
      <div className="p-6 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Knowledge Sources</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <strong>Notion (Live)</strong> - Employee Handbook, Security
            Homepage, Engineering Wiki
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            <strong>Q&A Pairs</strong> - {pairs.length} approved responses
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full" />
            <strong>docs.zenlytic.com</strong> - Product documentation (manual
            reference)
          </li>
        </ul>
      </div>
    </div>
  );
}
