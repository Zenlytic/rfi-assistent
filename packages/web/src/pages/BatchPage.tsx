import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface Question {
  id: string;
  question: string;
  context?: string;
}

interface Result {
  id: string;
  question: string;
  answer: string;
  citations: string[];
  error?: string;
}

export function BatchPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResults([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];

      if (data.length === 0) {
        setError('No data found in file');
        return;
      }

      // Find question column (case-insensitive)
      const columns = Object.keys(data[0]);
      const questionCol = columns.find(
        (col) =>
          col.toLowerCase().includes('question') ||
          col.toLowerCase() === 'q' ||
          col.toLowerCase() === 'query'
      );

      if (!questionCol) {
        setError(
          `Could not find question column. Found columns: ${columns.join(', ')}`
        );
        return;
      }

      const contextCol = columns.find(
        (col) =>
          col.toLowerCase().includes('context') ||
          col.toLowerCase().includes('additional')
      );

      const parsed: Question[] = data
        .map((row, i) => ({
          id: `q_${i + 1}`,
          question: row[questionCol]?.trim() || '',
          context: contextCol ? row[contextCol]?.trim() : undefined,
        }))
        .filter((q) => q.question);

      setQuestions(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const processQuestions = async () => {
    if (questions.length === 0) return;

    setLoading(true);
    setProgress(0);
    setResults([]);
    setError(null);

    const batchSize = 10;
    const allResults: Result[] = [];

    try {
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);

        const res = await fetch('/api/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: batch }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        allResults.push(...data.results);

        setResults([...allResults]);
        setProgress(Math.min(100, Math.round(((i + batch.length) / questions.length) * 100)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (results.length === 0) return;

    const data = results.map((r) => ({
      Question: r.question,
      Response: r.answer,
      Citations: r.citations.join('; '),
      Error: r.error || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');
    XLSX.writeFile(workbook, `rfi-responses-${Date.now()}.xlsx`);
  };

  const clearAll = () => {
    setQuestions([]);
    setResults([]);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Batch Processing</h1>
        <p className="text-gray-400 mt-1">
          Upload a questionnaire spreadsheet and process all questions at once.
        </p>
      </div>

      {/* Upload section */}
      <div className="p-6 card-dark rounded-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Upload Questionnaire
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zenlytic-green file:text-white hover:file:bg-opacity-90 cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500">
              Excel or CSV file with a "Question" column
            </p>
          </div>

          {questions.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-sm text-gray-400">
                {questions.length} questions loaded
              </span>
              <div className="flex gap-2">
                <button
                  onClick={clearAll}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={processQuestions}
                  disabled={loading}
                  className="px-4 py-2 bg-zenlytic-green text-white text-sm font-medium rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
                >
                  {loading ? `Processing (${progress}%)` : 'Process All'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Progress bar */}
      {loading && (
        <div className="w-full bg-zenlytic-dark-tertiary rounded-full h-2">
          <div
            className="bg-zenlytic-cyan h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white font-heading">
              Results ({results.length}/{questions.length})
            </h2>
            <button
              onClick={downloadResults}
              className="px-4 py-2 bg-zenlytic-cyan text-zenlytic-dark text-sm font-medium rounded-lg hover:bg-opacity-90 transition-all"
            >
              Download Excel
            </button>
          </div>

          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                className={`p-4 rounded-lg border ${
                  result.error
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'card-dark'
                }`}
              >
                <p className="text-sm font-medium text-white mb-2">
                  {result.question}
                </p>
                {result.error ? (
                  <p className="text-sm text-red-400">{result.error}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-300">{result.answer}</p>
                    {result.citations.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Sources: {result.citations.join(', ')}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {questions.length === 0 && results.length === 0 && (
        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <h3 className="font-medium text-white mb-2">How to use</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
            <li>Upload an Excel (.xlsx) or CSV file</li>
            <li>File should have a column named "Question" (or similar)</li>
            <li>Optionally include a "Context" column for additional info</li>
            <li>Click "Process All" to generate responses</li>
            <li>Download results as Excel when complete</li>
          </ol>
        </div>
      )}
    </div>
  );
}
