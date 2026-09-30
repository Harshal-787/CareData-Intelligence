import React, { useEffect, useState } from "react";
import {
  X,
  Database,
  Table,
  Search,
  DownloadCloud,
  Loader2,
} from "lucide-react";
import { fetchSnowflakeTables } from "../../api/analyticsApi";

interface SnowflakeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnowflakeImportModal: React.FC<SnowflakeImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");


  const [tables, setTables] = useState<
    Array<{ name: string; rows: string; size: string }>
  >([]);
  const [fetchingTables, setFetchingTables] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFetchingTables(true);
      setError(null);
      fetchSnowflakeTables()
        .then((res) => setTables(res))
        .catch((err) => {
          console.error(err);
          setError("Snowflake is not connected or configuration is invalid. Please update your settings.");
        })
        .finally(() => setFetchingTables(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;


  const handleSimulateImport = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-600">
              <Database className="size-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Import from Snowflake
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Select Table or View
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose a dataset from CARE_DATA_DB.PUBLIC
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tables..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none w-64"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Rows</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fetchingTables ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                          Fetching available tables...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          <div className="mx-auto w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-3">
                            <Database className="size-6" />
                          </div>
                          <p className="text-red-600 font-medium mb-1">Connection Error</p>
                          <p className="text-sm">{error}</p>
                        </td>
                      </tr>
                    ) : tables.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No tables found. Ensure your Snowflake configuration
                          is correct.
                        </td>
                      </tr>
                    ) : (
                      tables
                        .filter((t) =>
                          t.name.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((table) => (
                          <tr
                            key={table.name}
                            className="hover:bg-slate-50 transition"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                              <Table className="size-4 text-slate-400" />
                              {table.name}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {table.rows}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {table.size}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setStep(2)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition"
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center py-8">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <DownloadCloud className="size-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Ready to Import
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  You are about to import{" "}
                  <span className="font-semibold text-slate-700">
                    PATIENT_ENCOUNTERS_V
                  </span>{" "}
                  into your Lakehouse. This data will be automatically profiled.
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSimulateImport}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>Start Import</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
