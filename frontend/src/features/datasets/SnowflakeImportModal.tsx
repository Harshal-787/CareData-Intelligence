import React, { useEffect, useState } from "react";
import { X, Database, CloudUpload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchSnowflakeStatus, triggerSnowflakeSync, fetchSnowflakeTables } from "../../api/analyticsApi";
import { SnowflakeConfig } from "../../types/analytics";

interface SnowflakeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  datasetId?: string;
}

export const SnowflakeImportModal: React.FC<SnowflakeImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  datasetId,
}) => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [tableName, setTableName] = useState("clinical_encounters");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<SnowflakeConfig | null>(null);
  const [tables, setTables] = useState<Array<{name: string; rows: string; size: string}>>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setChecking(true);
      setError(null);
      setSuccess(false);
      setTableName("clinical_encounters");
      setTables([]);
      
      fetchSnowflakeStatus()
        .then((res) => {
          setConnected(res.config?.isConnected || false);
          setConfig(res.config || null);
          if (!res.config?.isConnected) {
            setError("Snowflake is not connected. Please update your settings.");
          } else {
            // Fetch tables
            setLoadingTables(true);
            fetchSnowflakeTables()
              .then(data => {
                setTables(data || []);
                if (data && data.length > 0) {
                  setTableName(data[0].name);
                }
              })
              .catch(err => {
                console.error("Failed to fetch tables", err);
              })
              .finally(() => setLoadingTables(false));
          }
        })
        .catch((err) => {
          console.error(err);
          setError("Failed to check Snowflake status.");
        })
        .finally(() => setChecking(false));
    }
  }, [isOpen]);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      await triggerSnowflakeSync(datasetId, tableName);
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Sync failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-600">
              <CloudUpload className="size-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Extract from Snowflake
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          {checking ? (
            <div className="py-8 text-slate-500">
              <Loader2 className="size-6 animate-spin mx-auto mb-3 text-blue-600" />
              <p>Checking enterprise connection...</p>
            </div>
          ) : success ? (
            <div className="py-8 space-y-3">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">Extraction Successful</h3>
              <p className="text-sm text-slate-500">Your Snowflake data is now in the Lakehouse.</p>
            </div>
          ) : error ? (
            <div className="py-6 space-y-3">
              <AlertCircle className="size-10 text-rose-500 mx-auto" />
              <p className="text-rose-600 font-medium">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <Database className="size-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Ready to Extract
                </h3>
                {config && (
                  <div className="mt-2 mb-4 bg-slate-50 rounded-lg p-3 text-left border border-slate-100 flex flex-col gap-1">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Connected Environment</div>
                    <div className="text-sm text-slate-800"><span className="font-semibold text-slate-600">Warehouse:</span> {config.warehouse}</div>
                    <div className="text-sm text-slate-800"><span className="font-semibold text-slate-600">Database:</span> {config.database}</div>
                    <div className="text-sm text-slate-800"><span className="font-semibold text-slate-600">Schema:</span> {config.schema}</div>
                  </div>
                )}
                <p className="text-sm text-slate-500 mt-1">
                  Select the table you wish to extract from your configured schema.
                </p>
                <div className="mt-4 text-left">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700">Target Table Name</label>
                    {loadingTables && <Loader2 className="size-3 animate-spin text-slate-400" />}
                  </div>
                  
                  {tables.length > 0 ? (
                    <select
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-white"
                      disabled={loading}
                    >
                      {tables.map(t => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.rows} rows, {t.size})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      placeholder="e.g. patients, labs, claims"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      disabled={loading || loadingTables}
                    />
                  )}
                  {tables.length === 0 && !loadingTables && connected && (
                    <p className="text-xs text-amber-600 mt-1">No tables found in this schema. You can type one manually.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSync}
                  disabled={loading || !connected}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>Start Sync</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
