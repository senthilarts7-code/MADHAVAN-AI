import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, ExternalLink, Terminal } from 'lucide-react';
import { GroundingSource, ToolExecutionTrace } from '../types';

interface MarkdownRendererProps {
  content: string;
  isDark?: boolean;
  toolTraces?: ToolExecutionTrace[];
  groundingSources?: GroundingSource[];
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isDark = false,
  toolTraces,
  groundingSources,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(codeText);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="space-y-3">
      {/* Verified Server-Side Tool Executions */}
      {toolTraces && toolTraces.length > 0 && (
        <div className="space-y-1.5">
          {toolTraces.map((trace, idx) => (
            <div
              key={`${trace.toolName}_${idx}`}
              className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-mono tabular-nums ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]'
              }`}
            >
              <span className="font-medium">
                Verified Tool · {trace.toolName}({trace.input})
              </span>
              <span className="font-semibold">Result: {trace.output}</span>
            </div>
          ))}
        </div>
      )}

      {/* Markdown Prose Content */}
      <div
        className={`text-[15px] leading-[1.68] break-words space-y-3 ${
          isDark ? 'text-slate-100' : 'text-[#171717]'
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-bold tracking-tight mt-4 mb-2">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold tracking-tight mt-4 mb-2">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mt-3 mb-1.5">{children}</h3>
            ),
            p: ({ children }) => <p className="leading-[1.68] mb-2.5 last:mb-0">{children}</p>,
            ul: ({ children }) => (
              <ul className="list-disc pl-5 space-y-1.5 my-2">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 space-y-1.5 my-2">{children}</ol>
            ),
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote
                className={`px-4 py-2.5 my-3 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-slate-900/70 border-slate-800 text-slate-300'
                    : 'bg-[#FAFAFC] border-[#E5E7EB] text-[#525252]'
                }`}
              >
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-3 rounded-lg border border-[#E5E7EB] dark:border-slate-800">
                <table className="w-full text-left border-collapse text-sm tabular-nums">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead
                className={
                  isDark
                    ? 'bg-slate-900 text-slate-200 border-b border-slate-800'
                    : 'bg-[#FAFAFC] text-[#171717] border-b border-[#E5E7EB]'
                }
              >
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="px-3.5 py-2.5 font-semibold text-xs">{children}</th>
            ),
            td: ({ children }) => (
              <td
                className={`px-3.5 py-2 border-t text-xs ${
                  isDark ? 'border-slate-800 text-slate-300' : 'border-[#E5E7EB] text-[#171717]'
                }`}
              >
                {children}
              </td>
            ),
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              const codeText = String(children).replace(/\n$/, '');
              const isBlock = Boolean(match || codeText.includes('\n'));

              if (!isBlock) {
                return (
                  <code
                    className={`px-1.5 py-0.5 rounded text-[13px] font-mono ${
                      isDark
                        ? 'bg-slate-800 text-blue-300'
                        : 'bg-[#EFF6FF] text-[#1D4ED8]'
                    }`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              const languageLabel = match ? match[1].toUpperCase() : 'CODE';
              const isCopied = copiedCode === codeText;

              return (
                <div
                  className={`my-3 rounded-xl overflow-hidden border ${
                    isDark ? 'border-slate-800 bg-slate-950' : 'border-[#E5E7EB] bg-[#FAFAFC]'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between px-4 py-2 border-b text-xs ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400'
                        : 'bg-white border-[#E5E7EB] text-[#737373]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono">
                      <Terminal className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span className="font-semibold text-[#171717] dark:text-slate-200">
                        {languageLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Generated Code (Unexecuted)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(codeText)}
                      aria-label={`Copy ${languageLabel} code`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        isDark
                          ? 'hover:bg-slate-800 text-slate-200'
                          : 'hover:bg-[#EFF6FF] text-[#2563EB]'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-[#171717] dark:text-slate-100">
                    <code>{codeText}</code>
                  </pre>
                </div>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Verified Web Search Grounding Citations */}
      {groundingSources && groundingSources.length > 0 && (
        <div
          className={`pt-2.5 mt-2 border-t text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-[#E5E7EB] text-[#737373]'
          }`}
        >
          <div className="font-medium mb-1.5">Verified Web Sources:</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {groundingSources.map((src, i) => (
              <a
                key={`${src.uri}_${i}`}
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#2563EB] hover:underline"
              >
                <span>{src.title}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
