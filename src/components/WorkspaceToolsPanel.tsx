import React, { useState } from 'react';
import {
  Calculator,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { WorkspaceToolMode, parseCsvDataset, ParsedDataset } from '../utils/aiLogic';
import { GeneratedImageRecord } from '../types';

interface WorkspaceToolsPanelProps {
  toolMode: WorkspaceToolMode;
  language: 'en' | 'ta';
  isDark: boolean;
  codingLanguage: string;
  onChangeCodingLanguage: (lang: string) => void;
  studyDepth: 'beginner' | 'intermediate' | 'advanced';
  onChangeStudyDepth: (depth: 'beginner' | 'intermediate' | 'advanced') => void;
  writingTone: string;
  onChangeWritingTone: (tone: string) => void;
  onSendPrompt: (promptText: string, extraAttachmentText?: { name: string; content: string }) => void;
  isSpeaking: boolean;
  onSpeakText: (text: string) => void;
  onStopSpeaking: () => void;
}

const SAMPLE_CSV_DATA = `City,Q3_Revenue_INR,Q4_Revenue_INR,YoY_Growth_Pct,Active_Accounts
Chennai,4850000,5620000,22.4,410
Coimbatore,2940000,3480000,18.9,265
Madurai,1850000,2190000,16.2,178
Tiruchirappalli,1620000,1940000,15.8,154
Bengaluru,6120000,7250000,24.6,530
Hyderabad,5340000,6190000,20.1,465`;

export const WorkspaceToolsPanel: React.FC<WorkspaceToolsPanelProps> = ({
  toolMode,
  language,
  isDark,
  codingLanguage,
  onChangeCodingLanguage,
  studyDepth,
  onChangeStudyDepth,
  writingTone,
  onChangeWritingTone,
  onSendPrompt,
  isSpeaking,
  onSpeakText,
  onStopSpeaking,
}) => {
  // Image Generation Studio State
  const [imagePrompt, setImagePrompt] = useState(
    'Minimalist white technology research campus in Chennai with lush courtyard, natural morning light, architectural photography'
  );
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageRecord[]>([]);

  // Data & Spreadsheet Assistant State
  const [csvText, setCsvText] = useState(SAMPLE_CSV_DATA);
  const [parsedData, setParsedData] = useState<ParsedDataset>(() =>
    parseCsvDataset(SAMPLE_CSV_DATA)
  );

  // Quick Calculator State
  const [calcExpr, setCalcExpr] = useState('(4850000 * 1.18) + sqrt(14400)');
  const [calcOutput, setCalcOutput] = useState<string | null>(null);

  const handleRunCalculator = async () => {
    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'calculator', input: calcExpr }),
      });
      const data = await res.json();
      if (data.ok) {
        setCalcOutput(String(data.result));
      } else {
        setCalcOutput(`Error: ${data.error}`);
      }
    } catch {
      setCalcOutput('Calculation service unavailable');
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;
    setIsGeneratingImage(true);
    setImageError(null);

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, aspectRatio }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.imageUrl) {
        setGeneratedImages((prev) => [
          {
            id: `img_${Date.now()}`,
            prompt: imagePrompt,
            aspectRatio,
            imageUrl: data.imageUrl,
            createdAt: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
      } else {
        setImageError(
          data.error ||
            'Image generation requires a paid Gemini API key with Gemini 3.1 Flash Lite Image access.'
        );
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to connect to image service.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCsvChange = (val: string) => {
    setCsvText(val);
    setParsedData(parseCsvDataset(val));
  };

  if (toolMode === 'chat') {
    return null;
  }

  return (
    <div
      className={`mb-4 rounded-xl border p-4 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#FAFAFC] border-[#E5E7EB]'
      }`}
    >
      {/* CODING STUDIO CONTROLS */}
      {toolMode === 'coding' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label
              htmlFor="coding-lang-select"
              className="text-xs font-semibold text-[#171717] dark:text-slate-200"
            >
              {language === 'ta' ? 'நிரலாக்க மொழி:' : 'Target Language:'}
            </label>
            <select
              id="coding-lang-select"
              value={codingLanguage}
              onChange={(e) => onChangeCodingLanguage(e.target.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-white border-[#E5E7EB] text-[#171717]'
              }`}
            >
              {['TypeScript', 'Python', 'Rust', 'Go', 'Kotlin (Android)', 'SQL', 'React / TSX'].map(
                (lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                )
              )}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onSendPrompt(
                  `Write a clean, production-grade ${codingLanguage} implementation of an LRU Cache with O(1) get/put operations and unit tests.`
                )
              }
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#171717] dark:text-slate-200 hover:border-[#2563EB] transition-colors cursor-pointer"
            >
              Generate LRU Cache
            </button>
            <button
              type="button"
              onClick={() =>
                onSendPrompt(
                  `Provide a security & performance code review checklist for a ${codingLanguage} backend microservice.`
                )
              }
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#171717] dark:text-slate-200 hover:border-[#2563EB] transition-colors cursor-pointer"
            >
              Security Audit Template
            </button>
          </div>
        </div>
      )}

      {/* STUDY ASSISTANT & DETERMINISTIC CALCULATOR */}
      {toolMode === 'study' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#171717] dark:text-slate-200">
                {language === 'ta' ? 'விளக்க ஆழம்:' : 'Explanation Depth:'}
              </span>
              {(['beginner', 'intermediate', 'advanced'] as const).map((depth) => (
                <button
                  key={depth}
                  type="button"
                  onClick={() => onChangeStudyDepth(depth)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors cursor-pointer ${
                    studyDepth === depth
                      ? 'bg-[#2563EB] text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-white border border-[#E5E7EB] text-[#737373]'
                  }`}
                >
                  {depth}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                onSendPrompt(
                  'Create a 3-question interactive STEM quiz (Mathematics, Physics, Chemistry) with step-by-step solutions in English and Tamil.'
                )
              }
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#EFF6FF] text-[#2563EB] hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Generate Practice Quiz
            </button>
          </div>

          {/* Connected Deterministic Math Calculator */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E7EB] dark:border-slate-800">
            <Calculator className="w-4 h-4 text-[#2563EB]" />
            <input
              type="text"
              aria-label="Mathematical expression to evaluate"
              value={calcExpr}
              onChange={(e) => setCalcExpr(e.target.value)}
              placeholder="e.g. (125 * 4) + sqrt(625)"
              className={`flex-1 min-w-[200px] px-3 py-1.5 text-xs font-mono rounded-lg border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-white border-[#E5E7EB] text-[#171717]'
              }`}
            />
            <button
              type="button"
              onClick={handleRunCalculator}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Verify Math
            </button>
            {calcOutput && (
              <span className="text-xs font-mono font-semibold text-[#16A34A] tabular-nums px-2">
                = {calcOutput}
              </span>
            )}
          </div>
        </div>
      )}

      {/* WRITING STUDIO CONTROLS */}
      {toolMode === 'writing' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#171717] dark:text-slate-200">
              {language === 'ta' ? 'எழுத்து நடை:' : 'Writing Tone:'}
            </span>
            {['Professional', 'Executive Concise', 'Academic', 'Persuasive', 'Bilingual Tamil'].map(
              (tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => onChangeWritingTone(tone)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    writingTone === tone
                      ? 'bg-[#2563EB] text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-white border border-[#E5E7EB] text-[#737373]'
                  }`}
                >
                  {tone}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* IMAGE STUDIO (GENERATION) */}
      {toolMode === 'image_gen' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              aria-label="Image generation prompt"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe the image to generate..."
              className={`flex-1 px-3 py-2 text-xs rounded-lg border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-white border-[#E5E7EB] text-[#171717]'
              }`}
            />
            <select
              aria-label="Image aspect ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-white border-[#E5E7EB] text-[#171717]'
              }`}
            >
              <option value="1:1">1:1 Square</option>
              <option value="16:9">16:9 Landscape</option>
              <option value="4:3">4:3 Standard</option>
              <option value="9:16">9:16 Portrait</option>
            </select>
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Generate Image</span>
                </>
              )}
            </button>
          </div>

          {imageError && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
              <span>{imageError}</span>
              <button
                type="button"
                onClick={() =>
                  onSendPrompt(
                    `Create a detailed visual art direction specification and SVG architectural layout for: "${imagePrompt}"`
                  )
                }
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-amber-300 text-amber-900 dark:text-amber-200 font-medium shrink-0 cursor-pointer"
              >
                Generate Spec in Chat
              </button>
            </div>
          )}

          {generatedImages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {generatedImages.map((img) => (
                <div
                  key={img.id}
                  className="rounded-lg overflow-hidden border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-950 p-2 space-y-2"
                >
                  <img
                    src={img.imageUrl}
                    alt={img.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-44 object-cover rounded"
                  />
                  <div className="flex items-center justify-between text-xs text-[#737373]">
                    <span className="truncate max-w-[220px]">{img.prompt}</span>
                    <a
                      href={img.imageUrl}
                      download={`madhavan-ai-${img.id}.png`}
                      className="inline-flex items-center gap-1 text-[#2563EB] hover:underline font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VOICE ASSISTANT PANEL */}
      {toolMode === 'voice' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#737373] dark:text-slate-300">
            {language === 'ta'
              ? 'மைக்ரோஃபோன் பயனர் அனுமதியுடன் மட்டுமே செயல்படும். தமிழ் மற்றும் ஆங்கில ஒலி வெளியீடு தயார்.'
              : 'Microphone activates only on explicit click. Supports Gemini 3.8 Flash Lite TTS & browser voice synthesis.'}
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking ? (
              <button
                type="button"
                onClick={onStopSpeaking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stop Audio</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onSpeakText(
                    language === 'ta'
                      ? 'வணக்கம், நான் மாதவன் ஏஐ. உங்களுக்கு இன்று எப்படி உதவலாம்?'
                      : 'Welcome to Madhavan AI. Intelligence without limits. How can I assist you today?'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-medium cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Voice Output</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* DATA & SPREADSHEET ASSISTANT */}
      {toolMode === 'data' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
              <span>Interactive Dataset & Chart Studio</span>
            </div>
            <button
              type="button"
              onClick={() =>
                onSendPrompt(
                  'Analyze this CSV dataset, explain the regional growth calculations, and recommend top investment priorities.',
                  { name: 'regional_metrics.csv', content: csvText }
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Analyze Dataset with AI</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="csv-dataset-input"
                className="block text-[11px] font-medium text-[#737373] mb-1"
              >
                CSV / Tabular Data Input (Editable):
              </label>
              <textarea
                id="csv-dataset-input"
                rows={4}
                value={csvText}
                onChange={(e) => handleCsvChange(e.target.value)}
                className={`w-full p-2.5 text-xs font-mono rounded-lg border ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-200'
                    : 'bg-white border-[#E5E7EB] text-[#171717]'
                }`}
              />
            </div>

            {/* Deterministic Column Statistics & Bar Visualization */}
            <div
              className={`p-3 rounded-lg border flex flex-col justify-between ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-[#E5E7EB]'
              }`}
            >
              <div className="text-xs font-semibold mb-2">
                Verified Column Statistics ({parsedData.rows.length} rows)
              </div>
              {parsedData.numericStats.length > 0 ? (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] tabular-nums">
                      <thead>
                        <tr className="text-[#737373] border-b border-[#E5E7EB] dark:border-slate-800">
                          <th className="pb-1">Column</th>
                          <th className="pb-1 text-right">Sum</th>
                          <th className="pb-1 text-right">Mean</th>
                          <th className="pb-1 text-right">Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.numericStats.slice(0, 3).map((st) => (
                          <tr
                            key={st.column}
                            className="border-b last:border-b-0 border-[#E5E7EB] dark:border-slate-800"
                          >
                            <td className="py-1 font-medium">{st.column}</td>
                            <td className="py-1 text-right font-mono">
                              {st.sum.toLocaleString()}
                            </td>
                            <td className="py-1 text-right font-mono">
                              {st.mean.toLocaleString()}
                            </td>
                            <td className="py-1 text-right font-mono">
                              {st.max.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mini Bar Chart from Actual Data */}
                  {parsedData.chartSeries.length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-end gap-2 h-14 pt-2">
                        {(() => {
                          const maxVal = Math.max(
                            ...parsedData.chartSeries.map((c) => c.value),
                            1
                          );
                          return parsedData.chartSeries.slice(0, 6).map((item) => {
                            const heightPct = Math.max(
                              12,
                              Math.round((item.value / maxVal) * 100)
                            );
                            return (
                              <div
                                key={item.label}
                                className="flex-1 flex flex-col items-center gap-1"
                              >
                                <div className="w-full bg-[#EFF6FF] dark:bg-slate-800 rounded-t h-10 flex items-end">
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className="w-full bg-[#2563EB] rounded-t transition-all"
                                    title={`${item.label}: ${item.value.toLocaleString()}`}
                                  />
                                </div>
                                <span className="text-[10px] text-[#737373] truncate max-w-[60px]">
                                  {item.label}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[#737373]">
                  Paste CSV rows with numeric columns to compute automatic statistics.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISION / DOCUMENT / RESEARCH QUICK INFO */}
      {(toolMode === 'vision' || toolMode === 'document' || toolMode === 'research') && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#737373] dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            <span>
              {toolMode === 'vision' &&
                'Attach PNG, JPEG, or WEBP diagrams/photos using the paperclip button below for multimodal visual analysis.'}
              {toolMode === 'document' &&
                'Attach .txt, .md, .csv, or .json documents below. Contents are isolated inside untrusted-data boundaries.'}
              {toolMode === 'research' &&
                'Queries in Research Assistant activate Google Search grounding when supported and separate verified facts from inference.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
