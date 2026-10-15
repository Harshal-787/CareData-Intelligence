import React, { useState } from 'react';
import {
  Sparkles,
  Database,
  Activity,
  Users,
  ShieldCheck,
  Check,
  Copy,
  Code2,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  Building2,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';

interface ClinicalMessageRendererProps {
  content: string;
  isUser?: boolean;
}

// Helper to parse bold formatting (**text**) and code formatting (`code`)
export const renderInlineFormatted = (text: string): React.ReactNode => {
  // Split on bold (**...**) and inline code (`...`)
  const parts = text.split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const clean = part.slice(2, -2).trim();
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {clean}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const clean = part.slice(1, -1).trim();
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold bg-slate-100 text-cyan-800 border border-slate-200"
        >
          {clean}
        </code>
      );
    }
    // Clean any stray lone asterisks like "**" or "*"
    const sanitized = part.replace(/\*\*/g, '');
    return <span key={index}>{sanitized}</span>;
  });
};

// Formats table cells with badges when matching key clinical status indicators
const renderTableCell = (rawCell: string): React.ReactNode => {
  const trimmed = rawCell.trim();
  const lower = trimmed.toLowerCase();

  // Status badges
  if (lower === 'high priority' || lower === 'high acuity' || lower === 'critical' || lower === 'p1') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
        {trimmed}
      </span>
    );
  }
  if (
    lower === 'favorable' ||
    lower === 'enterprise grade' ||
    lower.includes('100% compliant') ||
    lower.includes('100.0% compliant')
  ) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
        {trimmed}
      </span>
    );
  }
  if (lower === 'monitored' || lower === 'controlled' || lower === 'moderate' || lower === 'p2') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        {trimmed}
      </span>
    );
  }
  if (lower === 'stable' || lower === 'p3') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        {trimmed}
      </span>
    );
  }

  return renderInlineFormatted(trimmed);
};

export const ClinicalMessageRenderer: React.FC<ClinicalMessageRendererProps> = ({
  content,
  isUser = false,
}) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  if (isUser) {
    return (
      <div className="leading-relaxed text-sm font-medium whitespace-pre-wrap">
        {content.replace(/\*\*/g, '')}
      </div>
    );
  }

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // 1. Separate code blocks from normal text
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const segments: { type: 'text' | 'code'; language?: string; code?: string; text?: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        text: content.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: 'code',
      language: match[1] || 'sql',
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      text: content.slice(lastIndex),
    });
  }

  return (
    <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
      {segments.map((segment, segIdx) => {
        if (segment.type === 'code' && segment.code) {
          return (
            <div key={segIdx} className="rounded-xl border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden shadow-sm my-3">
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-cyan-400">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  {segment.language ? segment.language.toUpperCase() : 'SQL'} Query
                </span>
                <button
                  onClick={() => handleCopyCode(segment.code!, segIdx)}
                  className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition text-[11px]"
                >
                  {copiedCodeIdx === segIdx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 text-[11px] sm:text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed bg-slate-900/90">
                <code>{segment.code}</code>
              </pre>
            </div>
          );
        }

        // Render structured text
        const textContent = segment.text || '';
        const rawLines = textContent.split('\n');

        const blocks: React.ReactNode[] = [];
        let currentPatientCard: { idName: string; metrics: string; diagnosis: string } | null = null;

        const flushPatientCard = (idx: number) => {
          if (currentPatientCard) {
            const card = { ...currentPatientCard };
            currentPatientCard = null;
            blocks.push(
              <div
                key={`pt-${idx}`}
                className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl p-3 my-2 shadow-xs transition-all"
              >
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                    {renderInlineFormatted(card.idName)}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                    High Acuity
                  </span>
                </div>
                {card.metrics && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                    {card.metrics.split('|').map((m, mIdx) => {
                      const trimmed = m.trim();
                      const isBP = trimmed.toLowerCase().includes('bp:');
                      const isHR = trimmed.toLowerCase().includes('hr:');
                      return (
                        <span
                          key={mIdx}
                          className={`px-2 py-0.5 rounded-md font-mono text-[11px] border ${
                            isBP
                              ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                              : isHR
                              ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {trimmed}
                        </span>
                      );
                    })}
                  </div>
                )}
                {card.diagnosis && (
                  <div className="text-[11px] text-slate-600 mt-2 flex items-start gap-1 font-medium">
                    <span className="text-slate-400 font-normal">Diagnosis:</span>
                    <span className="text-slate-900 font-medium">{renderInlineFormatted(card.diagnosis)}</span>
                  </div>
                )}
              </div>
            );
          }
        };

        // Iterate line by line with lookahead for markdown tables
        let i = 0;
        while (i < rawLines.length) {
          const line = rawLines[i];
          const trimmed = line.trim();

          if (!trimmed) {
            flushPatientCard(i);
            i++;
            continue;
          }

          // 1. Markdown Table Detection: line starts and ends with '|'
          if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < rawLines.length) {
            const nextTrimmed = rawLines[i + 1].trim();
            // Check if next line is a separator row (e.g. | :--- | :---: |)
            if (nextTrimmed.startsWith('|') && nextTrimmed.includes('---')) {
              flushPatientCard(i);

              const parseCells = (rowStr: string): string[] => {
                const inner = rowStr.replace(/^\|/, '').replace(/\|$/, '');
                return inner.split('|').map((c) => c.trim());
              };

              const headers = parseCells(trimmed);
              const alignments = parseCells(nextTrimmed).map((sep) => {
                const s = sep.trim();
                if (s.startsWith(':') && s.endsWith(':')) return 'text-center';
                if (s.endsWith(':')) return 'text-right';
                return 'text-left';
              });

              i += 2; // skip header and separator
              const tableRows: string[][] = [];

              while (i < rawLines.length) {
                const rLine = rawLines[i].trim();
                if (rLine.startsWith('|') && rLine.endsWith('|')) {
                  tableRows.push(parseCells(rLine));
                  i++;
                } else {
                  break;
                }
              }

              blocks.push(
                <div
                  key={`tbl-${i}`}
                  className="overflow-x-auto my-3 rounded-xl border border-slate-200/90 shadow-xs bg-white"
                >
                  <table className="w-full text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-50/90 text-slate-700 font-semibold tracking-wider text-[11px] uppercase border-b border-slate-200">
                      <tr>
                        {headers.map((h, hIdx) => (
                          <th
                            key={hIdx}
                            className={`px-3 py-2.5 font-bold ${alignments[hIdx] || 'text-left'}`}
                          >
                            {renderInlineFormatted(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {tableRows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-slate-50/80 transition-colors odd:bg-white even:bg-slate-50/30"
                        >
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={`px-3 py-2.5 text-slate-700 leading-normal ${
                                alignments[cIdx] || 'text-left'
                              }`}
                            >
                              {renderTableCell(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
              continue;
            }
          }

          // 2. Horizontal Divider (--- or ***)
          if (trimmed === '---' || trimmed === '***') {
            flushPatientCard(i);
            blocks.push(<hr key={`hr-${i}`} className="my-4 border-slate-200/80" />);
            i++;
            continue;
          }

          // 3. Document H1 Header: "# Title"
          if (trimmed.startsWith('# ')) {
            flushPatientCard(i);
            const titleText = trimmed.replace(/^#\s+/, '').trim();
            blocks.push(
              <div
                key={`h1-${i}`}
                className="flex items-center justify-between pb-3 mb-2 border-b-2 border-slate-200/90 pt-1"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-cyan-100 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      {titleText}
                    </h2>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Verified Lakehouse
                </span>
              </div>
            );
            i++;
            continue;
          }

          // 4. Subtitle: "## Subtitle"
          if (trimmed.startsWith('## ')) {
            flushPatientCard(i);
            const subText = trimmed.replace(/^##\s+/, '').trim();
            blocks.push(
              <p key={`h2-${i}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {subText}
              </p>
            );
            i++;
            continue;
          }

          // 5. Metadata Banner: e.g. "**Dataset Target:** ... | **Audited System:** ..."
          if (trimmed.includes('Dataset Target:') || (trimmed.startsWith('**Dataset Target:') && trimmed.includes('|'))) {
            flushPatientCard(i);
            blocks.push(
              <div
                key={`meta-${i}`}
                className="bg-slate-50/90 border border-slate-200 rounded-xl px-3.5 py-2.5 my-2.5 flex flex-wrap items-center gap-2 text-xs text-slate-700"
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Database className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Lakehouse Audit Context:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {trimmed.split('|').map((part, pIdx) => {
                    const cleanPart = part.trim();
                    const isConfidential = cleanPart.toLowerCase().includes('confidential') || cleanPart.toLowerCase().includes('hipaa');
                    return (
                      <span
                        key={pIdx}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          isConfidential
                            ? 'bg-cyan-50 text-cyan-800 border-cyan-200 font-semibold'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {renderInlineFormatted(cleanPart)}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
            i++;
            continue;
          }

          // 6. Section H3 Headings: "### 1. Executive Summary" or "### ..."
          if (trimmed.startsWith('### ')) {
            flushPatientCard(i);
            const rawHeading = trimmed.replace(/^###\s+/, '').trim();

            let sectionNum = '';
            let headingLabel = rawHeading;
            const matchNum = rawHeading.match(/^(\d+)\.\s+(.*)$/);
            if (matchNum) {
              sectionNum = matchNum[1];
              headingLabel = matchNum[2];
            }

            let IconComp = Activity;
            let iconColor = 'text-cyan-700 bg-cyan-50 border-cyan-200';

            const lowerHeading = headingLabel.toLowerCase();
            if (lowerHeading.includes('executive') || lowerHeading.includes('summary')) {
              IconComp = Sparkles;
              iconColor = 'text-cyan-700 bg-cyan-50 border-cyan-200';
            } else if (lowerHeading.includes('metric') || lowerHeading.includes('benchmark')) {
              IconComp = TrendingUp;
              iconColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
            } else if (lowerHeading.includes('department') || lowerHeading.includes('flow')) {
              IconComp = Building2;
              iconColor = 'text-blue-700 bg-blue-50 border-blue-200';
            } else if (lowerHeading.includes('diagnos') || lowerHeading.includes('icd')) {
              IconComp = Stethoscope;
              iconColor = 'text-teal-700 bg-teal-50 border-teal-200';
            } else if (lowerHeading.includes('anomaly') || lowerHeading.includes('surveillance')) {
              IconComp = AlertTriangle;
              iconColor = 'text-amber-700 bg-amber-50 border-amber-200';
            } else if (lowerHeading.includes('recommend') || lowerHeading.includes('intervention')) {
              IconComp = ShieldCheck;
              iconColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
            } else if (lowerHeading.includes('governance') || lowerHeading.includes('attestation')) {
              IconComp = CheckCircle2;
              iconColor = 'text-purple-700 bg-purple-50 border-purple-200';
            }

            blocks.push(
              <div
                key={`sec-h3-${i}`}
                className="pt-3.5 pb-1 flex items-center justify-between border-b border-slate-200/70 mb-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center font-bold text-[11px] shrink-0 ${iconColor}`}
                  >
                    {sectionNum ? sectionNum : <IconComp className="w-3 h-3" />}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    {renderInlineFormatted(headingLabel)}
                  </h3>
                </div>
              </div>
            );
            i++;
            continue;
          }

          // 7. Section Bullet Headings (e.g. • Clinical Query Objective:)
          const isSectionHeading =
            trimmed.startsWith('• ') &&
            (trimmed.endsWith(':') ||
              trimmed.includes('Objective:') ||
              trimmed.includes('Telemetry:') ||
              trimmed.includes('Observations') ||
              trimmed.includes('Encounters') ||
              trimmed.includes('Protocols:'));

          if (isSectionHeading) {
            flushPatientCard(i);
            const headingText = trimmed.replace(/^[•*#-]\s*/, '').replace(/:$/, '').trim();
            blocks.push(
              <div key={`sec-${i}`} className="pt-2 pb-1 flex items-center gap-2">
                <div className="w-5 h-5 rounded-md border border-cyan-200 bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                  <Activity className="w-3 h-3" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  {headingText}
                </h4>
              </div>
            );
            i++;
            continue;
          }

          // 8. Patient Encounter Cards: "  • Patient PAT-..." or "  • Encounter ..."
          if (line.includes('• Patient ') || line.includes('• Encounter ')) {
            flushPatientCard(i);
            currentPatientCard = {
              idName: trimmed.replace(/^[•*#-]\s*/, ''),
              metrics: '',
              diagnosis: '',
            };
            i++;
            continue;
          }

          if (currentPatientCard) {
            if (trimmed.startsWith('Metrics:')) {
              currentPatientCard.metrics = trimmed.replace(/^Metrics:\s*/, '');
              i++;
              continue;
            }
            if (trimmed.startsWith('Diagnosis:')) {
              currentPatientCard.diagnosis = trimmed.replace(/^Diagnosis:\s*/, '');
              flushPatientCard(i);
              i++;
              continue;
            }
          }

          // 9. Numbered List Items: "1. Establish ...", "2. Monitor ..."
          const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numListMatch) {
            flushPatientCard(i);
            const itemNum = numListMatch[1];
            const itemBody = numListMatch[2];
            blocks.push(
              <div key={`num-${i}`} className="flex items-start gap-2.5 pl-2 py-1 text-xs text-slate-700">
                <span className="w-4 h-4 rounded-full bg-cyan-100 text-cyan-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {itemNum}
                </span>
                <div className="flex-1 leading-relaxed">
                  {renderInlineFormatted(itemBody)}
                </div>
              </div>
            );
            i++;
            continue;
          }

          // 10. Sub-bullets ("• ...", "- ...", "* ...", "➤ ...")
          const isBullet =
            trimmed.startsWith('• ') ||
            trimmed.startsWith('- ') ||
            trimmed.startsWith('* ') ||
            trimmed.startsWith('➤ ');

          if (isBullet) {
            flushPatientCard(i);
            const bulletContent = trimmed.replace(/^[•*\-➤]\s*/, '');
            const colonIdx = bulletContent.indexOf(':');
            let label = '';
            let val = bulletContent;
            if (colonIdx > 0 && colonIdx < 45) {
              label = bulletContent.slice(0, colonIdx).trim();
              val = bulletContent.slice(colonIdx + 1).trim();
            }

            blocks.push(
              <div key={`blt-${i}`} className="flex items-start gap-2.5 pl-3 py-1 text-xs text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 mt-1.5 shrink-0" />
                <div>
                  {label ? (
                    <>
                      <span className="font-semibold text-slate-900 mr-1.5">
                        {renderInlineFormatted(label)}:
                      </span>
                      <span>{renderInlineFormatted(val)}</span>
                    </>
                  ) : (
                    <span>{renderInlineFormatted(bulletContent)}</span>
                  )}
                </div>
              </div>
            );
            i++;
            continue;
          }

          // 11. Regular paragraph line
          flushPatientCard(i);
          blocks.push(
            <p key={`p-${i}`} className="text-xs sm:text-sm text-slate-700 pl-1 my-1 leading-relaxed">
              {renderInlineFormatted(trimmed)}
            </p>
          );
          i++;
        }

        flushPatientCard(rawLines.length);

        return (
          <div key={segIdx} className="space-y-1">
            {blocks}
          </div>
        );
      })}
    </div>
  );
};
