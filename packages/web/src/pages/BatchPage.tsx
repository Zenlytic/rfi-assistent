import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface Question {
  id: string;
  question: string;
  context?: string;
  originalRow: Record<string, string>;
}

interface Result {
  id: string;
  question: string;
  answer: string;
  citations: string[];
  error?: string;
  originalRow?: Record<string, string>;
}

interface ColumnMapping {
  questionCol: string | null;
  contextCol: string | null;
}

export function BatchPage() {
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ questionCol: null, contextCol: null });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResults([]);
    setQuestions([]);
    setShowMapping(false);

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

      const cols = Object.keys(data[0]);
      setColumns(cols);
      setRawData(data);

      // Try to auto-detect question column
      const questionCol = cols.find(
        (col) =>
          col.toLowerCase().includes('question') ||
          col.toLowerCase() === 'q' ||
          col.toLowerCase() === 'query' ||
          col.toLowerCase().includes('requirement') ||
          col.toLowerCase().includes('request')
      );

      const contextCol = cols.find(
        (col) =>
          col.toLowerCase().includes('context') ||
          col.toLowerCase().includes('additional') ||
          col.toLowerCase().includes('note') ||
          col.toLowerCase().includes('comment')
      );

      if (questionCol) {
        // Auto-detected, apply mapping
        const newMapping = { questionCol, contextCol: contextCol || null };
        setMapping(newMapping);
        applyMapping(data, newMapping);
      } else {
        // Show column selector
        setShowMapping(true);
        setMapping({ questionCol: null, contextCol: null });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const applyMapping = (data: Record<string, string>[], columnMapping: ColumnMapping) => {
    if (!columnMapping.questionCol) {
      setError('Please select a question column');
      return;
    }

    const parsed: Question[] = data
      .map((row, i) => ({
        id: `q_${i + 1}`,
        question: row[columnMapping.questionCol!]?.toString().trim() || '',
        context: columnMapping.contextCol ? row[columnMapping.contextCol]?.toString().trim() : undefined,
        originalRow: row,
      }))
      .filter((q) => q.question);

    setQuestions(parsed);
    setShowMapping(false);
  };

  const handleMappingConfirm = () => {
    applyMapping(rawData, mapping);
  };

  const processQuestions = async () => {
    if (questions.length === 0) return;

    setLoading(true);
    setProgress(0);
    setResults([]);
    setError(null);

    const batchSize = 5; // Smaller batches for better progress feedback
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

        // Merge results with original row data
        const resultsWithRows = data.results.map((r: Result, idx: number) => ({
          ...r,
          originalRow: batch[idx]?.originalRow,
        }));

        allResults.push(...resultsWithRows);
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

    // Include original columns plus responses
    const data = results.map((r) => ({
      ...r.originalRow,
      'AI Response': r.answer,
      'Citations': r.citations.join('; '),
      'Error': r.error || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');
    XLSX.writeFile(workbook, `rfi-responses-${Date.now()}.xlsx`);
  };

  const clearAll = () => {
    setRawData([]);
    setColumns([]);
    setMapping({ questionCol: null, contextCol: null });
    setQuestions([]);
    setResults([]);
    setError(null);
    setProgress(0);
    setShowMapping(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Batch Processing</h1>
        <p className="text-gray-400 mt-1">
          Upload any questionnaire spreadsheet and process all questions at once.
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
              Supports Excel (.xlsx, .xls) and CSV files
            </p>
          </div>

          {/* Column mapping UI */}
          {showMapping && columns.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-4">
              <p className="text-sm text-yellow-400">
                Could not auto-detect question column. Please select the columns:
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Question Column <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={mapping.questionCol || ''}
                    onChange={(e) => setMapping({ ...mapping, questionCol: e.target.value || null })}
                    className="w-full px-3 py-2 bg-zenlytic-dark-tertiary border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-zenlytic-cyan focus:border-transparent"
                  >
                    <option value="">Select column...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Context Column <span className="text-gray-500">(optional)</span>
                  </label>
                  <select
                    value={mapping.contextCol || ''}
                    onChange={(e) => setMapping({ ...mapping, contextCol: e.target.value || null })}
                    className="w-full px-3 py-2 bg-zenlytic-dark-tertiary border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-zenlytic-cyan focus:border-transparent"
                  >
                    <option value="">None</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              {mapping.questionCol && rawData.length > 0 && (
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">Preview (first 3 rows):</p>
                  <ul className="space-y-1">
                    {rawData.slice(0, 3).map((row, i) => (
                      <li key={i} className="text-sm text-gray-300 truncate">
                        {i + 1}. {row[mapping.questionCol!]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleMappingConfirm}
                disabled={!mapping.questionCol}
                className="px-4 py-2 bg-zenlytic-green text-white text-sm font-medium rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
              >
                Confirm Columns
              </button>
            </div>
          )}

          {/* Questions loaded */}
          {questions.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-400">
                    {questions.length} questions loaded
                  </span>
                  {mapping.questionCol && (
                    <span className="text-xs text-gray-500 ml-2">
                      (from "{mapping.questionCol}" column)
                    </span>
                  )}
                </div>
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
      {questions.length === 0 && results.length === 0 && !showMapping && (
        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <h3 className="font-medium text-white mb-3">How to use</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
            <li>Upload your existing questionnaire Excel or CSV file</li>
            <li>
              The system will auto-detect the question column, or you can select it manually
              <ul className="ml-6 mt-1 list-disc text-xs text-gray-500">
                <li>Auto-detects columns named: Question, Query, Requirement, Request, Q</li>
                <li>Optionally select a Context/Notes column for additional info</li>
              </ul>
            </li>
            <li>Click "Process All" to generate AI responses</li>
            <li>Download results - includes all original columns plus AI responses</li>
          </ol>

          <div className="mt-4 p-3 bg-zenlytic-green/10 border border-zenlytic-green/30 rounded-lg">
            <p className="text-xs text-zenlytic-cyan">
              <strong>Tip:</strong> No need to reformat your spreadsheet! Upload it as-is and select which column contains the questions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
