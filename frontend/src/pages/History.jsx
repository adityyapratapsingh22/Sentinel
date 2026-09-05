import { useState, useEffect, useCallback } from "react";
import { Api } from "../api.js";
import { FiSearch, FiFileText, FiExternalLink } from "react-icons/fi";

const PAGE_SIZE = 8;

function timeAgo(unixTs) {
  const diff = Date.now() / 1000 - unixTs;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + " min ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hr ago";
  return Math.floor(diff / 86400) + " days ago";
}

export default function History() {
  const [page, setPage] = useState(1);
  const [verdict, setVerdict] = useState("all");
  const [mediaType, setMediaType] = useState("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await Api.history(page, PAGE_SIZE, verdict, mediaType);
      setRows(data.results);
      setTotal(data.total);
      if (data.results.length > 0 && !selected) setSelected(data.results[0]);
    } catch (err) {
      console.error(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, verdict, mediaType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Api.analytics().then(setAnalytics).catch(console.error);
  }, []);

  const filteredRows = search
    ? rows.filter((r) => r.filename.toLowerCase().includes(search.toLowerCase()) || r.sha256.includes(search))
    : rows;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col w-full bg-[#F9F7F2] text-[#1A1A1A] min-h-screen">
      <div className="p-6 lg:p-10 border-b border-[#1A1A1A] bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto">
          <span className="text-[10px] uppercase tracking-[2.5px] font-bold text-[#8C8C8C] block font-mono">
            Ledger // Detection History
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl mt-1">Audit Log</h1>
          <p className="mt-2 text-sm text-[#4A4A4A] max-w-xl font-sans">
            Every scan you've run, with a real SHA-256 buffer hash and verdict.
          </p>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#1A1A1A] bg-[#F1EFE9] divide-y lg:divide-y-0 lg:divide-x divide-[#1A1A1A] max-w-7xl mx-auto w-full">
          <MetricCell label="Total Audits" value={analytics.total_analyzed} />
          <MetricCell
            label="Synthetic Flagged"
            value={analytics.total_analyzed ? `${Math.round((analytics.fake_count / analytics.total_analyzed) * 100)}%` : "0%"}
            color="#9B2226"
          />
          <MetricCell label="Authentic Verified" value={analytics.real_count} color="#2D5A43" />
          <MetricCell label="Mean Confidence" value={`${(analytics.avg_confidence * 100).toFixed(1)}%`} />
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 xl:grid-cols-12 border-b border-[#1A1A1A]">
        {/* Table */}
        <div className="xl:col-span-8 border-b xl:border-b-0 xl:border-r border-[#1A1A1A] p-6 lg:p-10">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center pb-6 border-b border-[#1A1A1A]">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="w-4 h-4 text-[#8C8C8C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search filename or hash..."
                className="w-full pl-9 pr-4 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <select
                value={verdict}
                onChange={(e) => {
                  setPage(1);
                  setVerdict(e.target.value);
                }}
                className="border border-[#1A1A1A] bg-white px-3 py-2 text-xs font-mono focus:outline-none"
              >
                <option value="all">All Verdicts</option>
                <option value="fake">Synthetic Only</option>
                <option value="real">Authentic Only</option>
              </select>
              <select
                value={mediaType}
                onChange={(e) => {
                  setPage(1);
                  setMediaType(e.target.value);
                }}
                className="border border-[#1A1A1A] bg-white px-3 py-2 text-xs font-mono focus:outline-none"
              >
                <option value="all">All Media</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="p-12 text-center text-[#8C8C8C] font-mono text-xs uppercase tracking-wider">
              No records match your query
            </div>
          ) : (
            <div className="overflow-x-auto mt-6">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1A1A1A] text-[9px] uppercase tracking-wider text-[#8C8C8C]">
                    <th className="py-2 px-3">File</th>
                    <th className="py-2 px-3">Verdict</th>
                    <th className="py-2 px-3">Confidence</th>
                    <th className="py-2 px-3">Analyzed</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="border-b border-[#1A1A1A]/20 hover:bg-white cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#1A1A1A] font-sans">{r.filename}</div>
                        <div className="text-[10px] text-[#8C8C8C]">
                          {r.media_type}
                          {r.n_frames_analyzed ? ` · ${r.n_frames_analyzed} frames` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="inline-block px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider text-white"
                          style={{ background: r.verdict === "fake" ? "#9B2226" : "#2D5A43" }}
                        >
                          {r.verdict}
                        </span>
                      </td>
                      <td className="py-3 px-3">{(r.confidence * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3 text-[10px] text-[#8C8C8C]">{timeAgo(r.created_at)}</td>
                      <td className="py-3 px-3 text-right">
                        <FiExternalLink className="w-3.5 h-3.5 text-[#8C8C8C]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center mt-6 font-mono text-[11px] text-[#8C8C8C]">
                <span>
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="border border-[#1A1A1A] px-3 py-1 uppercase tracking-wider disabled:opacity-30"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="border border-[#1A1A1A] px-3 py-1 uppercase tracking-wider disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="xl:col-span-4 p-6 lg:p-8 bg-[#F1EFE9]">
          {selected ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-[#1A1A1A]">
                <span className="text-[10px] uppercase tracking-[2px] font-bold text-[#8C8C8C] block font-mono">
                  Record Inspector
                </span>
                <span
                  className="px-2 py-1 text-[9px] font-mono font-bold uppercase text-white"
                  style={{ background: selected.verdict === "fake" ? "#9B2226" : "#2D5A43" }}
                >
                  {selected.verdict}
                </span>
              </div>

              <div className="mt-6 flex items-center gap-2 font-mono text-xs">
                <FiFileText className="w-4 h-4 text-[#8C8C8C]" />
                <span className="font-bold">{selected.filename}</span>
              </div>

              <div className="mt-4 border border-[#1A1A1A] bg-white p-3 font-mono text-xs">
                <div className="text-[9px] text-[#8C8C8C] uppercase mb-1">SHA-256 Buffer Hash</div>
                <div className="text-[10px] break-all">{selected.sha256}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-[11px] font-mono">
                <div className="border border-[#1A1A1A] bg-white p-3">
                  <div className="text-[9px] text-[#8C8C8C]">MEDIA TYPE</div>
                  <div className="font-bold mt-1">{selected.media_type}</div>
                </div>
                <div className="border border-[#1A1A1A] bg-white p-3">
                  <div className="text-[9px] text-[#8C8C8C]">CONFIDENCE</div>
                  <div className="font-bold mt-1">{(selected.confidence * 100).toFixed(1)}%</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-[#8C8C8C] font-mono text-xs uppercase tracking-wider py-8 text-center">
              Select a record
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, value, color }) {
  return (
    <div className="p-6">
      <span className="text-[9px] uppercase tracking-[2px] font-bold text-[#8C8C8C] block font-mono">{label}</span>
      <div className="font-serif text-4xl font-normal mt-2" style={{ color: color || "#1A1A1A" }}>
        {value}
      </div>
    </div>
  );
}
