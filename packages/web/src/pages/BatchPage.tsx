import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Question {
  id: string;
  question: string;
  context?: string;
  originalRow?: Record<string, string>;
  lineNumber?: number;
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
  startRow: number; // 1-indexed row to start from
}

type OutputFormat = 'excel' | 'word' | 'csv';
type FileType = 'spreadsheet' | 'document' | 'unknown';

export function BatchPage() {
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [colLetters, setColLetters] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ questionCol: null, contextCol: null, startRow: 1 });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('excel');
  const [fileType, setFileType] = useState<FileType>('unknown');
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseSpreadsheet = async (buffer: ArrayBuffer): Promise<{ allRows: string[][], colLetters: string[] }> => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get raw data as array of arrays (preserves all rows including headers)
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

    // Generate column letters (A, B, C, etc.)
    const maxCols = Math.max(...rows.map(row => row?.length || 0), 1);
    const letters = Array.from({ length: maxCols }, (_, i) =>
      String.fromCharCode(65 + i) // A=65
    );

    return { allRows: rows, colLetters: letters };
  };

  const parsePDF = async (buffer: ArrayBuffer): Promise<string[]> => {
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const lines: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      // Split by common question patterns
      const pageLines = pageText
        .split(/(?=\d+\.\s)|(?=Q\d+)|(?=Question\s*\d+)|(?=•)|(?=\n)/)
        .map(line => line.trim())
        .filter(line => line.length > 10); // Filter out short fragments

      lines.push(...pageLines);
    }

    return lines;
  };

  const parseWord = async (buffer: ArrayBuffer): Promise<string[]> => {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value;

    // Split by newlines and numbered items
    const lines = text
      .split(/\n/)
      .map(line => line.trim())
      .filter(line => line.length > 10);

    return lines;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResults([]);
    setQuestions([]);
    setShowMapping(false);
    setFileName(file.name);

    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      const buffer = await file.arrayBuffer();

      if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
        // Spreadsheet file
        setFileType('spreadsheet');
        const { allRows: rows, colLetters: letters } = await parseSpreadsheet(buffer);

        if (rows.length === 0) {
          setError('No data found in file');
          return;
        }

        setAllRows(rows);
        setColLetters(letters);

        // Always show column selector for spreadsheets so user can verify
        setShowMapping(true);
        // Default to column A, starting at row 1
        setMapping({ questionCol: 'A', contextCol: null, startRow: 1 });

      } else if (extension === 'pdf') {
        // PDF file
        setFileType('document');
        const lines = await parsePDF(buffer);

        if (lines.length === 0) {
          setError('No text content found in PDF');
          return;
        }

        const parsed: Question[] = lines.map((line, i) => ({
          id: `q_${i + 1}`,
          question: line,
          lineNumber: i + 1,
        }));

        setQuestions(parsed);

      } else if (['docx', 'doc'].includes(extension || '')) {
        // Word file
        setFileType('document');
        const lines = await parseWord(buffer);

        if (lines.length === 0) {
          setError('No text content found in document');
          return;
        }

        const parsed: Question[] = lines.map((line, i) => ({
          id: `q_${i + 1}`,
          question: line,
          lineNumber: i + 1,
        }));

        setQuestions(parsed);

      } else {
        setError(`Unsupported file type: .${extension}`);
      }

    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const applySpreadsheetMapping = (rows: string[][], columnMapping: ColumnMapping) => {
    if (!columnMapping.questionCol) {
      setError('Please select a question column');
      return;
    }

    // Convert column letter to index (A=0, B=1, etc.)
    const qColIndex = columnMapping.questionCol.charCodeAt(0) - 65;
    const ctxColIndex = columnMapping.contextCol
      ? columnMapping.contextCol.charCodeAt(0) - 65
      : -1;

    // Start from the specified row (1-indexed, so subtract 1)
    const startIndex = Math.max(0, columnMapping.startRow - 1);
    const dataRows = rows.slice(startIndex);

    const parsed: Question[] = dataRows
      .map((row, i) => {
        const question = row[qColIndex]?.toString().trim() || '';
        const context = ctxColIndex >= 0 ? row[ctxColIndex]?.toString().trim() : undefined;

        // Create originalRow object with column letters as keys
        const originalRow: Record<string, string> = {};
        row.forEach((cell, idx) => {
          const colLetter = String.fromCharCode(65 + idx);
          originalRow[colLetter] = cell?.toString() || '';
        });

        return {
          id: `q_${startIndex + i + 1}`,
          question,
          context,
          originalRow,
          lineNumber: startIndex + i + 1,
        };
      })
      .filter((q) => q.question && q.question.length > 5); // Filter out empty/tiny cells

    if (parsed.length === 0) {
      setError('No questions found in the selected column. Check your column and start row settings.');
      return;
    }

    setQuestions(parsed);
    setShowMapping(false);
  };

  const handleMappingConfirm = () => {
    applySpreadsheetMapping(allRows, mapping);
  };

  const processQuestions = async () => {
    if (questions.length === 0) return;

    setLoading(true);
    setProgress(0);
    setResults([]);
    setError(null);

    const batchSize = 1; // Process one at a time to avoid Netlify gateway timeout (30s hard limit)
    const allResults: Result[] = [];

    try {
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);

        // Include custom instructions in the request
        const res = await fetch('/api/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: batch,
            instructions: customInstructions || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const data = await res.json();

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

    const timestamp = Date.now();

    if (outputFormat === 'excel') {
      const data = results.map((r) => ({
        ...(r.originalRow || {}),
        Question: r.question,
        'AI Response': r.answer,
        'Citations': r.citations.join('; '),
        'Error': r.error || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');
      XLSX.writeFile(workbook, `rfi-responses-${timestamp}.xlsx`);

    } else if (outputFormat === 'csv') {
      const data = results.map((r) => ({
        ...(r.originalRow || {}),
        Question: r.question,
        'AI Response': r.answer,
        'Citations': r.citations.join('; '),
        'Error': r.error || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `rfi-responses-${timestamp}.csv`;
      link.click();

    } else if (outputFormat === 'word') {
      // Generate a simple HTML that Word can open
      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
        <head><meta charset="utf-8"><title>RFI Responses</title></head>
        <body style="font-family: Arial, sans-serif;">
        <h1>RFI Questionnaire Responses</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <hr/>
      `;

      results.forEach((r, i) => {
        html += `
          <div style="margin-bottom: 20px; page-break-inside: avoid;">
            <h3 style="color: #333;">Q${i + 1}: ${r.question}</h3>
            <p><strong>Response:</strong></p>
            <p style="background: #f5f5f5; padding: 10px; border-left: 3px solid #05fcdf;">${r.answer}</p>
            ${r.citations.length > 0 ? `<p style="font-size: 12px; color: #666;"><em>Citations: ${r.citations.join(', ')}</em></p>` : ''}
            ${r.error ? `<p style="color: red;"><strong>Error:</strong> ${r.error}</p>` : ''}
          </div>
        `;
      });

      html += '</body></html>';

      const blob = new Blob([html], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `rfi-responses-${timestamp}.doc`;
      link.click();
    }
  };

  const clearAll = () => {
    setAllRows([]);
    setColLetters([]);
    setMapping({ questionCol: null, contextCol: null, startRow: 1 });
    setQuestions([]);
    setResults([]);
    setError(null);
    setProgress(0);
    setShowMapping(false);
    setFileName('');
    setFileType('unknown');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Batch Processing</h1>
        <p className="text-gray-400 mt-1">
          Upload questionnaires in Excel, CSV, Word, or PDF format.
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
              accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zenlytic-green file:text-white hover:file:bg-opacity-90 cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500">
              Supports Excel (.xlsx, .xls), CSV, Word (.docx, .doc), and PDF files
            </p>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Instructions <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Keep responses concise. This is for a healthcare customer requiring HIPAA compliance details. Focus on data security aspects."
              className="w-full px-4 py-2 bg-zenlytic-dark-tertiary border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-zenlytic-cyan focus:border-transparent resize-none text-sm"
              rows={2}
            />
          </div>

          {/* Output Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Output Format
            </label>
            <div className="flex gap-4">
              {[
                { value: 'excel', label: 'Excel (.xlsx)', icon: '📊' },
                { value: 'word', label: 'Word (.doc)', icon: '📄' },
                { value: 'csv', label: 'CSV', icon: '📑' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    outputFormat === option.value
                      ? 'bg-zenlytic-cyan/20 border border-zenlytic-cyan text-white'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="outputFormat"
                    value={option.value}
                    checked={outputFormat === option.value}
                    onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                    className="sr-only"
                  />
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Column mapping UI for spreadsheets */}
          {showMapping && colLetters.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-4">
              <p className="text-sm text-zenlytic-cyan">
                Configure which column contains the questions and which row to start from:
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Question Column <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={mapping.questionCol || ''}
                    onChange={(e) => setMapping({ ...mapping, questionCol: e.target.value || null })}
                    className="w-full px-3 py-2 bg-zenlytic-dark-tertiary border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-zenlytic-cyan focus:border-transparent"
                  >
                    {colLetters.map((col) => (
                      <option key={col} value={col}>Column {col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Row
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={allRows.length}
                    value={mapping.startRow}
                    onChange={(e) => setMapping({ ...mapping, startRow: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-zenlytic-dark-tertiary border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-zenlytic-cyan focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Skip header rows</p>
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
                    {colLetters.map((col) => (
                      <option key={col} value={col}>Column {col}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview of selected data */}
              {mapping.questionCol && allRows.length > 0 && (
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">
                    Preview (rows {mapping.startRow}-{Math.min(mapping.startRow + 4, allRows.length)}):
                  </p>
                  <ul className="space-y-1">
                    {allRows
                      .slice(mapping.startRow - 1, mapping.startRow + 4)
                      .map((row, i) => {
                        const colIndex = mapping.questionCol!.charCodeAt(0) - 65;
                        const cellValue = row[colIndex]?.toString() || '(empty)';
                        return (
                          <li key={i} className="text-sm text-gray-300 truncate">
                            <span className="text-gray-500">Row {mapping.startRow + i}:</span>{' '}
                            {cellValue.slice(0, 80)}{cellValue.length > 80 ? '...' : ''}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}

              <button
                onClick={handleMappingConfirm}
                disabled={!mapping.questionCol}
                className="px-4 py-2 bg-zenlytic-green text-white text-sm font-medium rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
              >
                Load Questions
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
                  {fileName && (
                    <span className="text-xs text-gray-500 ml-2">
                      from {fileName}
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

              {/* Preview questions from document */}
              {fileType === 'document' && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg max-h-48 overflow-y-auto">
                  <p className="text-xs text-gray-400 mb-2">Detected questions (first 5):</p>
                  <ul className="space-y-1">
                    {questions.slice(0, 5).map((q, i) => (
                      <li key={i} className="text-sm text-gray-300 truncate">
                        {i + 1}. {q.question.slice(0, 100)}{q.question.length > 100 ? '...' : ''}
                      </li>
                    ))}
                    {questions.length > 5 && (
                      <li className="text-xs text-gray-500">...and {questions.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
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
              Download as {outputFormat === 'excel' ? 'Excel' : outputFormat === 'word' ? 'Word' : 'CSV'}
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
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
            <li>
              Upload your questionnaire file:
              <ul className="ml-6 mt-1 list-disc text-xs text-gray-500">
                <li><strong>Excel/CSV:</strong> Select which column has questions and which row to start from</li>
                <li><strong>Word/PDF:</strong> Extracts text and identifies questions line by line</li>
              </ul>
            </li>
            <li>
              For Excel files, configure the layout:
              <ul className="ml-6 mt-1 list-disc text-xs text-gray-500">
                <li>Select the column containing questions (A, B, C...)</li>
                <li>Set the start row to skip headers</li>
                <li>Preview shows what will be processed</li>
              </ul>
            </li>
            <li>
              Add custom instructions (optional):
              <ul className="ml-6 mt-1 list-disc text-xs text-gray-500">
                <li>Specify response style (concise, detailed, formal)</li>
                <li>Add context (healthcare customer, financial services, etc.)</li>
              </ul>
            </li>
            <li>Choose your preferred output format (Excel, Word, or CSV)</li>
            <li>Click "Process All" to generate AI responses</li>
            <li>Download the completed questionnaire</li>
          </ol>

          <div className="mt-4 p-3 bg-zenlytic-green/10 border border-zenlytic-green/30 rounded-lg">
            <p className="text-xs text-zenlytic-cyan">
              <strong>Tip:</strong> Upload your questionnaire as-is - no reformatting needed! The system handles various formats and layouts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
