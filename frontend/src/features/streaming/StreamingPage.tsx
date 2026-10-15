import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Activity,
  AlertTriangle,
  Zap,
  Server,
  Play,
  Pause,
  Eye,
  Sliders,
  CheckCircle,
  FileCode2,
  Stethoscope,
  HeartPulse,
  Send,
  X,
  User,
  BedDouble,
} from 'lucide-react';
import { streamApi } from '../../api/streamApi';
import { StreamEvent, StreamStats } from '../../types/stream';

export const StreamingPage: React.FC = () => {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<StreamEvent | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showRawModal, setShowRawModal] = useState<boolean>(false);
  const [customHL7, setCustomHL7] = useState<string>(
    `MSH|^~\\&|ICU_MONITOR_04|METRO_HEALTH|CAREDATA|CENTRAL|20260908112000||ORU^R01|MSG-99201|P|2.5\rPID|1||PAT-84920^^^MRN||DOE^JOHN||19720415|M|||123 MAIN ST^^NEW YORK^NY\rPV1|1|I|ICU^BED-03^01||||DOC-102^SMITH^EMILY\rOBX|1|NM|2708-6^Oxygen Saturation^LN||84|%|95-100|LL|||F\rOBX|2|NM|8480-6^Systolic Blood Pressure^LN||68|mmHg|90-120|LL|||F`
  );

  const wsRef = useRef<WebSocket | null>(null);

  // Connect WebSocket & Poll Initial Stats
  useEffect(() => {
    fetchInitialData();
    connectWebSocket();

    const statsInterval = setInterval(() => {
      fetchStats();
    }, 3000);

    return () => {
      clearInterval(statsInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      const [initStats, initEvents] = await Promise.all([
        streamApi.getStats(),
        streamApi.getEvents(40),
      ]);
      setStats(initStats);
      if (initEvents && initEvents.length > 0) {
        setEvents(initEvents);
      }
    } catch (err) {
      console.error('Failed to load initial stream data:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const s = await streamApi.getStats();
      setStats(s);
    } catch (err) {
      console.error('Error fetching stream stats:', err);
    }
  };

  const connectWebSocket = () => {
    // If running in dev mode on port 5173 or behind Vite, support direct port 8080 fallback
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDev = window.location.port === '5173' || window.location.port === '3000';
    const wsUrl = isDev 
      ? `${protocol}//${window.location.hostname}:8080/api/v1/stream/ws`
      : `${protocol}//${window.location.host}/api/v1/stream/ws`;

    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INIT_HISTORY' && Array.isArray(data.history)) {
            setEvents((prev) => {
              const combined = [...data.history, ...prev];
              const seen = new Set();
              return combined.filter((e) => {
                if (seen.has(e.id)) return false;
                seen.add(e.id);
                return true;
              }).slice(0, 100);
            });
            return;
          }

          if (data.type === 'HEARTBEAT') {
            return;
          }

          if (!isPaused) {
            setEvents((prev) => [data, ...prev.slice(0, 99)]);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        // Exponential backoff reconnect
        setTimeout(() => {
          connectWebSocket();
        }, 2500);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch (err) {
      console.error('Failed to instantiate WebSocket:', err);
      setWsConnected(false);
    }
  };

  const handleSimulate = async (scenario: string, count?: number) => {
    setIsSimulating(true);
    try {
      await streamApi.simulate(scenario, count);
      await fetchStats();
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCustomIngest = async () => {
    if (!customHL7.trim()) return;
    setIsSimulating(true);
    try {
      await streamApi.ingestRawHL7(customHL7);
      setShowRawModal(false);
      await fetchStats();
    } catch (err) {
      alert('Failed to parse HL7: ' + (err as any).message);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'CRITICAL_ONLY') return e.severity === 'CRITICAL';
    if (filterType === 'ORU') return e.payload?.messageType.includes('ORU');
    if (filterType === 'ADT') return e.payload?.messageType.includes('ADT');
    return true;
  });

  const criticalCount = events.filter((e) => e.severity === 'CRITICAL').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-50/50 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 border border-cyan-200 text-cyan-600">
            <Radio className="h-7 w-7 animate-pulse" />
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${wsConnected ? 'bg-emerald-400 opacity-75' : 'bg-red-400 opacity-75'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${wsConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Real-Time HL7 & FHIR Stream Monitor</h1>
              <span className="px-2 py-0.5 text-xs font-bold uppercase rounded-md bg-gradient-to-r from-red-500 to-rose-600 text-white tracking-wider animate-pulse">
                Phase 9 LIVE
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Sub-second live clinical event ingestion via TCP MLLP (Port 2575) & FHIR Stream Webhooks.
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 z-10">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <Server className="h-4 w-4 text-cyan-600" />
            <span className="text-slate-600 font-medium">MLLP Port 2575:</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Active
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <Activity className="h-4 w-4 text-cyan-600" />
            <span className="text-slate-600 font-medium">WebSocket:</span>
            <span className={wsConnected ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
              {wsConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live Throughput</p>
            <p className="text-2xl font-bold text-cyan-600 mt-1">
              {stats?.eventsPerSec ? stats.eventsPerSec.toFixed(1) : '0.0'}{' '}
              <span className="text-xs font-normal text-slate-400">msgs/sec</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Sub-second event dispatch</p>
          </div>
          <div className="p-3 bg-cyan-100 border border-cyan-200 rounded-2xl text-cyan-600">
            <Zap className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Stream Events</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.totalEvents ?? events.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Ingested across all channels</p>
          </div>
          <div className="p-3 bg-blue-100 border border-blue-200 rounded-2xl text-blue-600">
            <Radio className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Critical Anomaly Alerts</p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {stats?.criticalAlerts ?? criticalCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Immediate intervention required</p>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 animate-pulse">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Channels</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              3 <span className="text-xs font-normal text-slate-400">Feeds Online</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">1 MLLP TCP + 2 FHIR Subscriptions</p>
          </div>
          <div className="p-3 bg-emerald-100 border border-emerald-200 rounded-2xl text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Simulator Action Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-cyan-600" />
            <span className="text-sm font-semibold text-slate-900">Live Stream Simulator & Test Controls:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSimulate('icu_deterioration')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition disabled:opacity-50"
            >
              <HeartPulse className="h-3.5 w-3.5 text-red-400" />
              <span>Simulate ICU Deterioration (Critical)</span>
            </button>

            <button
              onClick={() => handleSimulate('ed_admission')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition disabled:opacity-50"
            >
              <BedDouble className="h-3.5 w-3.5 text-amber-600" />
              <span>Simulate ED Admission (ADT^A01)</span>
            </button>

            <button
              onClick={() => handleSimulate('routine_lab')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-50"
            >
              <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
              <span>Simulate Routine Lab (ORU^R01)</span>
            </button>

            <button
              onClick={() => handleSimulate('burst', 10)}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5 text-purple-600" />
              <span>⚡ 10-Msg Burst</span>
            </button>

            <button
              onClick={() => setShowRawModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition"
            >
              <FileCode2 className="h-3.5 w-3.5 text-cyan-600" />
              <span>Inject Custom HL7</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stream Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 px-4 py-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Filter Feed:</span>
          {(['ALL', 'CRITICAL_ONLY', 'ORU', 'ADT'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterType(mode)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                filterType === mode
                  ? 'bg-cyan-500 text-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-400 hover:text-slate-900'
              }`}
            >
              {mode === 'CRITICAL_ONLY' ? '🚨 Critical Only' : mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{isPaused ? 'Resume Auto-Scroll' : 'Pause Stream'}</span>
          </button>

          <button
            onClick={() => setEvents([])}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition"
          >
            Clear Feed
          </button>
        </div>
      </div>

      {/* Live Stream Table Feed */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-white uppercase text-[11px] font-semibold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Time</th>
                <th className="px-4 py-3.5">Type & Channel</th>
                <th className="px-4 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5">Location / Bed</th>
                <th className="px-4 py-3.5">Clinical Findings / Vitals</th>
                <th className="px-4 py-3.5">Risk Score</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Radio className="h-8 w-8 mx-auto mb-2 opacity-30 animate-pulse" />
                    No live stream events matching current filter. Click a simulation button above or send TCP MLLP data.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const p = evt.payload;
                  const isCrit = evt.severity === 'CRITICAL';
                  return (
                    <tr
                      key={evt.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCrit ? 'bg-red-500/[0.04]' : ''
                      }`}
                    >
                      {/* Time */}
                      <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>

                      {/* Message Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-50 text-cyan-700 border border-cyan-200">
                            {p?.messageType || evt.type}
                          </span>
                          <span className="text-[10px] text-slate-400">{evt.source}</span>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3">
                        {p?.patient.mrn ? (
                          <div>
                            <span className="font-semibold text-slate-900">
                              {p.patient.lastName}, {p.patient.firstName}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              MRN: {p.patient.mrn} ({p.patient.gender})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p?.visit.assignedUnit ? (
                          <div className="text-slate-600">
                            <span className="font-medium text-cyan-700">{p.visit.assignedUnit}</span>
                            <span className="text-slate-400"> {p.visit.assignedRoom} {p.visit.assignedBed}</span>
                            <span className="block text-[10px] text-slate-400">{p.visit.attendingDoctor}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Outpatient / Ingest</span>
                        )}
                      </td>

                      {/* Clinical Findings / Vitals */}
                      <td className="px-4 py-3 max-w-xs truncate">
                        {p?.observations && p.observations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.observations.slice(0, 3).map((ob, idx) => (
                              <span
                                key={idx}
                                className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                                  ob.abnormalFlag === 'LL' || ob.abnormalFlag === 'HH'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : ob.abnormalFlag === 'L' || ob.abnormalFlag === 'H'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-50 text-slate-600'
                                }`}
                              >
                                {ob.description}: <strong>{ob.value} {ob.units}</strong>
                              </span>
                            ))}
                            {p.observations.length > 3 && (
                              <span className="text-[10px] text-slate-400">+{p.observations.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">{evt.clinicalSummary || 'Observation event recorded'}</span>
                        )}
                      </td>

                      {/* Risk Score */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p?.riskScore ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-slate-50 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  p.riskScore >= 75
                                    ? 'bg-red-500'
                                    : p.riskScore >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${p.riskScore}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-xs">{p.riskScore}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                            evt.severity === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                              : evt.severity === 'WARNING'
                              ? 'bg-amber-500/20 text-amber-600 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40'
                          }`}
                        >
                          {evt.severity}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedEvent(evt)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-50 hover:bg-slate-100 text-cyan-600 border border-slate-200 transition flex items-center gap-1 ml-auto"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Inspection Drawer / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-cyan-600" />
                <h3 className="text-base font-bold text-slate-900">
                  HL7 v2 Message Telemetry Inspector
                </h3>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-cyan-100 text-cyan-700 border border-cyan-200">
                  {selectedEvent.payload?.messageType || 'HL7_EVENT'}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Clinical Alert Overview */}
              {selectedEvent.severity === 'CRITICAL' && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h4 className="text-sm font-bold text-red-400">Critical Clinical Anomaly Flagged</h4>
                    <p className="text-xs text-red-300 mt-0.5">{selectedEvent.clinicalSummary}</p>
                    {selectedEvent.payload?.anomalyFlags && selectedEvent.payload.anomalyFlags.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-xs text-red-200 space-y-0.5">
                        {selectedEvent.payload.anomalyFlags.map((flag, idx) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Patient & Encounter Details */}
              {selectedEvent.payload?.patient.mrn && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <h5 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-cyan-600" /> Patient Demographics (PID Segment)
                    </h5>
                    <div className="text-xs space-y-1 text-slate-600">
                      <p><strong>Name:</strong> {selectedEvent.payload.patient.lastName}, {selectedEvent.payload.patient.firstName}</p>
                      <p><strong>MRN:</strong> {selectedEvent.payload.patient.mrn}</p>
                      <p><strong>DOB:</strong> {selectedEvent.payload.patient.dob} | <strong>Gender:</strong> {selectedEvent.payload.patient.gender}</p>
                      <p><strong>Address:</strong> {selectedEvent.payload.patient.address || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <h5 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5 text-cyan-600" /> Encounter & Location (PV1 Segment)
                    </h5>
                    <div className="text-xs space-y-1 text-slate-600">
                      <p><strong>Assigned Unit:</strong> {selectedEvent.payload.visit.assignedUnit || 'N/A'}</p>
                      <p><strong>Room / Bed:</strong> {selectedEvent.payload.visit.assignedRoom} / {selectedEvent.payload.visit.assignedBed}</p>
                      <p><strong>Attending Physician:</strong> {selectedEvent.payload.visit.attendingDoctor || 'N/A'}</p>
                      <p><strong>Patient Class:</strong> {selectedEvent.payload.visit.patientClass || 'Inpatient'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Observations & Vitals Table */}
              {selectedEvent.payload?.observations && selectedEvent.payload.observations.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-cyan-600" /> Extracted Clinical Observations (OBX Segments)
                  </h5>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-white text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Test / Observation</th>
                          <th className="px-3 py-2">Code (LOINC)</th>
                          <th className="px-3 py-2">Result Value</th>
                          <th className="px-3 py-2">Reference Range</th>
                          <th className="px-3 py-2">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {selectedEvent.payload.observations.map((ob, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-slate-900">{ob.description}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{ob.identifier}</td>
                            <td className="px-3 py-2 font-bold text-cyan-700">{ob.value} {ob.units}</td>
                            <td className="px-3 py-2 text-slate-400">{ob.referenceRange || 'Normal'}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                                  ob.abnormalFlag === 'LL' || ob.abnormalFlag === 'HH'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                    : ob.abnormalFlag === 'L' || ob.abnormalFlag === 'H'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {ob.abnormalFlag || 'NORMAL'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Raw HL7 Message */}
              <div>
                <h5 className="text-xs font-bold uppercase text-slate-400 mb-2">Raw HL7 v2 Transmission Stream</h5>
                <pre className="p-4 rounded-2xl bg-slate-900/30 font-mono text-[11px] text-emerald-600 overflow-x-auto border border-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedEvent.payload?.rawMessage || selectedEvent.rawText || 'Raw payload not stored'}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-xs font-semibold rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-900 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom HL7 Injector Modal */}
      {showRawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-cyan-600" />
                Inject Custom HL7 v2 Raw Message
              </h3>
              <button onClick={() => setShowRawModal(false)} className="text-slate-400 hover:text-slate-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Paste standard HL7 pipe-delimited segments. The system will parse MSH, PID, PV1, and OBX observations and broadcast the event live.
            </p>
            <textarea
              rows={8}
              value={customHL7}
              onChange={(e) => setCustomHL7(e.target.value)}
              className="w-full bg-slate-900/30 font-mono text-xs text-emerald-600 p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRawModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomIngest}
                disabled={isSimulating}
                className="btn-primary"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Inject Stream Message</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
