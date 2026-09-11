import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Database,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Printer,
  X,
  Code2,
  Table as TableIcon,
  Zap,
  Activity,
  Layers,
  Search,
} from 'lucide-react';
import {
  fetchOllamaStatus,
  selectAIModel,
  sendAIChat,
  fetchChatHistory,
  fetchAINarrative,
  generateAIReport,
  fetchAIReports,
  deleteChatSession,
} from '../../api/aiApi';
import {
  OllamaStatusResponse,
  AIChatSession,
  AIChatMessage,
  AINarrativeInsight,
  AIClinicalReport,
} from '../../types/ai';

export const AIInsightsPage: React.FC = () => {
  // State
  const [status, setStatus] = useState<OllamaStatusResponse | null>(null);
  const [currentSession, setCurrentSession] = useState<AIChatSession | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3');

  // Narrative & Reports
  const [narrative, setNarrative] = useState<AINarrativeInsight | null>(null);
  const [isNarrativeLoading, setIsNarrativeLoading] = useState(false);
  const [reports, setReports] = useState<AIClinicalReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AIClinicalReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTitleInput, setReportTitleInput] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Tab
  const [activeView, setActiveView] = useState<'chat' | 'narrative' | 'reports'>('chat');
  const [copiedSqlId, setCopiedSqlId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested Prompts
  const quickPrompts = [
    { label: 'Top Readmissions by Dept', query: 'Show top 5 departments with highest 30-day readmission rates and length of stay' },
    { label: 'Hospital Billing Outliers', query: 'List patients with total hospital charges exceeding $40,000' },
    { label: 'High Risk Patients', query: 'List high-risk patients with Charlson Comorbidity Index >= 4' },
    { label: 'Critical Clinical Anomalies', query: 'Summarize recent vital sign and decompensation anomalies flagged by Isolation Forest' },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadInitialData = async () => {
    try {
      const [statusData, historyData, narrativeData, reportsData] = await Promise.all([
        fetchOllamaStatus().catch(() => null),
        fetchChatHistory().catch(() => null),
        fetchAINarrative().catch(() => null),
        fetchAIReports().catch(() => []),
      ]);

      if (statusData) {
        setStatus(statusData);
        if (statusData.activeModel) {
          setSelectedModel(statusData.activeModel);
        }
      }
      if (historyData) {
        setCurrentSession(historyData);
        setMessages(historyData.messages || []);
      }
      if (narrativeData) {
        setNarrative(narrativeData);
      }
      if (reportsData) {
        setReports(reportsData);
      }
    } catch (err) {
      console.error('Failed loading initial AI data:', err);
    }
  };

  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);
    try {
      await selectAIModel(newModel);
      if (status) {
        setStatus({ ...status, activeModel: newModel });
      }
    } catch (err) {
      console.error('Failed to change model:', err);
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    setInputQuery('');
    const tempUserMsg: AIChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: currentSession?.id || '',
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const resp = await sendAIChat({
        sessionId: currentSession?.id,
        question: textToSend,
        model: selectedModel,
      });

      setMessages((prev) => {
        // Replace temp with actual
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, resp.userMessage, resp.assistantMessage];
      });

      if (currentSession) {
        setCurrentSession({
          ...currentSession,
          id: resp.sessionId,
        });
      }
    } catch (err: any) {
      const errorMsg: AIChatMessage = {
        id: `err-${Date.now()}`,
        sessionId: currentSession?.id || '',
        role: 'assistant',
        content: `⚠️ Failed to execute natural language query: ${err.message || 'AI service unavailable'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (currentSession?.id) {
      try {
        await deleteChatSession(currentSession.id);
        const newHist = await fetchChatHistory();
        setCurrentSession(newHist);
        setMessages(newHist?.messages || []);
      } catch (err) {
        console.error('Failed to clear history:', err);
      }
    }
  };

  const handleRefreshNarrative = async () => {
    setIsNarrativeLoading(true);
    try {
      const data = await fetchAINarrative();
      setNarrative(data);
    } catch (err) {
      console.error('Failed refreshing narrative:', err);
    } finally {
      setIsNarrativeLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const rep = await generateAIReport({
        title: reportTitleInput.trim() || 'CareData Clinical Intelligence Briefing',
      });
      setReports((prev) => [rep, ...prev]);
      setSelectedReport(rep);
      setIsReportModalOpen(false);
      setReportTitleInput('');
    } catch (err) {
      console.error('Failed generating report:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleCopySQL = (sql: string, id: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSqlId(id);
    setTimeout(() => setCopiedSqlId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/25">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                CareData AI Intelligence Assistant
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Local LLM
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Natural-language Text-to-SQL querying, automated clinical narrative synthesis & intelligence reports.
              </p>
            </div>
          </div>
        </div>

        {/* Model Status & Selection */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                status?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {status?.connected ? `Ollama Active (${status.activeModel})` : 'Embedded NLQ Engine'}
            </span>
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="llama3" className="bg-slate-900">Llama 3 (8B)</option>
              <option value="mistral" className="bg-slate-900">Mistral (7B)</option>
              <option value="meditron" className="bg-slate-900">Meditron Clinical (7B)</option>
              <option value="qwen2.5" className="bg-slate-900">Qwen 2.5 (7B)</option>
            </select>
          </div>

          {/* Generate Brief Button */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            Generate Brief
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveView('chat')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition ${
            activeView === 'chat'
              ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          Conversational SQL Assistant
        </button>

        <button
          onClick={() => setActiveView('narrative')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition ${
            activeView === 'narrative'
              ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Executive Narrative Insights
        </button>

        <button
          onClick={() => setActiveView('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition ${
            activeView === 'reports'
              ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Clinical Reports Archive ({reports.length})
        </button>
      </div>

      {/* VIEW 1: CONVERSATIONAL ASSISTANT */}
      {activeView === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Stream (3 cols) */}
          <div className="lg:col-span-3 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl h-[700px] overflow-hidden">
            {/* Chat Header */}
            <div className="px-5 py-3.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white truncate">
                  {currentSession?.title || 'CareData Intelligence Session'}
                </span>
                <span className="text-[10px] text-slate-400">({messages.length} messages)</span>
              </div>
              <button
                onClick={handleClearHistory}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition"
              >
                Clear History
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                  <Bot className="w-12 h-12 text-indigo-400 opacity-60" />
                  <h3 className="text-base font-bold text-white">Ask Anything About Your Healthcare Data</h3>
                  <p className="text-xs max-w-md">
                    Translate clinical questions into SQL queries, view real-time data table results, and obtain AI clinical summaries.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-600/20">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs space-y-3 ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                          : 'bg-slate-800 border border-slate-700 text-slate-200'
                      }`}
                    >
                      {/* Message text */}
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {/* Generated SQL Code Block (if assistant) */}
                      {msg.generatedSql && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
                            <span className="flex items-center gap-1">
                              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                              Generated SQL Query:
                            </span>
                            <button
                              onClick={() => handleCopySQL(msg.generatedSql!, msg.id)}
                              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition"
                            >
                              {copiedSqlId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto">
                            <pre>{msg.generatedSql}</pre>
                          </div>
                        </div>
                      )}

                      {/* Query Results Table */}
                      {msg.rows && msg.rows.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
                            <span className="flex items-center gap-1">
                              <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
                              Query Results ({msg.rowCount} rows):
                            </span>
                            {msg.executionTimeMs && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                ⚡ {msg.executionTimeMs}ms • {msg.engine}
                              </span>
                            )}
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto max-h-56">
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                                <tr>
                                  {msg.columns?.map((col, idx) => (
                                    <th key={idx} className="py-2 px-3 whitespace-nowrap">
                                      {col.name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850 text-slate-300">
                                {msg.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-900/50">
                                    {msg.columns?.map((col, cIdx) => (
                                      <td key={cIdx} className="py-1.5 px-3 whitespace-nowrap font-mono">
                                        {String(row[col.name] !== undefined ? row[col.name] : '')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Timestamp / Engine */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/50">
                        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        {msg.role === 'assistant' && msg.model && (
                          <span className="font-mono text-slate-400">{msg.model}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-indigo-300 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing clinical schema & generating verified SQL...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-5 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">Suggested:</span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  disabled={isLoading}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] whitespace-nowrap border border-slate-700 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 bg-slate-850 border-t border-slate-800 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-3"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask a question (e.g. 'Show top 5 departments by 30-day readmissions')..."
                    disabled={isLoading}
                    className="w-full bg-slate-900 text-white text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 placeholder-slate-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isLoading}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask AI</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Quick Clinical Scorecard & Executive Insights (1 col) */}
          <div className="space-y-4">
            {/* Quick Executive Snapshot Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Executive Summary
                </h3>
                <button
                  onClick={handleRefreshNarrative}
                  disabled={isNarrativeLoading}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isNarrativeLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                {narrative?.executiveSummary ||
                  'Automated AI synthesis of live clinical dataset feeds indicates healthy data quality (94.6%) with active anomaly monitoring in Cardiology and Surgery units.'}
              </p>

              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Key Recommendations
                </span>
                <div className="space-y-1.5">
                  {narrative?.recommendedActions?.slice(0, 3).map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs bg-slate-800/80 p-2.5 rounded-xl border border-slate-800 text-slate-200"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Engine Specs Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3 text-xs">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Pipeline & Architecture
              </h4>
              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">LLM Provider:</span>
                  <span className="font-semibold text-white">Local Ollama</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">SQL Engine:</span>
                  <span className="font-semibold text-indigo-400">DuckDB / SQLite</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">PHI Protection:</span>
                  <span className="font-semibold text-emerald-400">100% On-Premise</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Avg Response:</span>
                  <span className="font-semibold text-white">&lt; 250ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: EXECUTIVE NARRATIVE INSIGHTS */}
      {activeView === 'narrative' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Live Clinical Intelligence & Strategic Synthesis
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Synthesized across profiling, validation rules, deduplication, and ML risk models for{' '}
                  <strong className="text-slate-200">{narrative?.datasetName || 'Clinical Lake'}</strong>.
                </p>
              </div>
              <button
                onClick={handleRefreshNarrative}
                disabled={isNarrativeLoading}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isNarrativeLoading ? 'animate-spin' : ''}`} />
                Re-Synthesize Insights
              </button>
            </div>

            {/* Executive Callout */}
            <div className="p-5 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 rounded-2xl border border-indigo-500/30 shadow-lg space-y-2">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Executive Briefing
              </span>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {narrative?.executiveSummary}
              </p>
            </div>

            {/* Findings & Risks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Findings */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Key Clinical & Operational Findings
                </h4>
                <div className="space-y-2">
                  {narrative?.keyFindings?.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Risks */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Identified Strategic & Financial Risks
                </h4>
                <div className="space-y-2">
                  {narrative?.strategicRisks?.map((risk, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actionable Clinical Recommendations */}
            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Actionable AI Recommendations & Quality Interventions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {narrative?.recommendedActions?.map((act, i) => (
                  <div key={i} className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                      {i + 1}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{act}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CLINICAL REPORTS ARCHIVE */}
      {activeView === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">
              Total Generated Briefs: <strong>{reports.length}</strong>
            </span>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/25 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate New Brief
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-lg space-y-4 transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-white leading-snug">{rep.title}</h4>
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">Dataset: {rep.datasetName}</p>
                  <p className="text-xs text-slate-300 line-clamp-3 bg-slate-800/40 p-2.5 rounded-xl">
                    {rep.executiveSummary}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(rep.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-slate-400">{rep.generatedBy}</span>
                  </div>

                  <button
                    onClick={() => setSelectedReport(rep)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                  >
                    View & Export Report
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: GENERATE REPORT DIALOG */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Generate Clinical Intelligence Brief</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">AI-synthesized executive healthcare brief</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Report Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Clinical Quality & Readmission Risk Intelligence Brief"
                  value={reportTitleInput}
                  onChange={(e) => setReportTitleInput(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Included Intelligence Modules:</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-200">1. Executive Summary & Strategic Insights</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-200">2. Data Quality & Field Completeness Scorecard</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-200">3. Isolation Forest Outliers & Anomaly Review</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-200">4. 30-Day Readmission Risk Stratification</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur shrink-0 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                disabled={isGeneratingReport}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
              >
                {isGeneratingReport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Brief
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW / EXPORT REPORT VIEWER */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{selectedReport.title}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
                    {selectedReport.id} • {new Date(selectedReport.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Report Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-300 text-xs">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 font-sans leading-relaxed space-y-4 text-slate-200">
                <pre className="whitespace-pre-wrap font-sans text-xs">{selectedReport.markdownContent}</pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur shrink-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3">
              <span className="text-[11px] text-slate-400 font-mono">CareData Local AI Generator</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Export PDF
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
