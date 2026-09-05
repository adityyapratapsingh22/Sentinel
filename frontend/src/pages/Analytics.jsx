import { useState, useEffect } from "react";
import { Api } from "../api.js";
import { FiActivity, FiTrendingUp, FiPieChart, FiBarChart2 } from "react-icons/fi";

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Api.analytics().then(setData).catch(console.error);
  }, []);

  const hasData = data && data.total_analyzed > 0;
  const fakePct = hasData ? data.fake_count / data.total_analyzed : 0;
  const realPct = hasData ? data.real_count / data.total_analyzed : 0;

  return (
    <div className="flex flex-col w-full bg-[#F9F7F2] text-[#1A1A1A] min-h-screen">
      <div className="p-6 lg:p-10 border-b border-[#1A1A1A] bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto">
          <span className="text-[10px] uppercase tracking-[2.5px] font-bold text-[#8C8C8C] block font-mono">
            Telemetry // Model Analytics
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl mt-1">Threat Attribution Matrix</h1>
          <p className="mt-2 text-sm text-[#4A4A4A] max-w-xl font-sans">
            Computed entirely from your own detection history — no simulated figures.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 lg:p-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#1A1A1A] divide-y lg:divide-y-0 lg:divide-x divide-[#1A1A1A] bg-[#F1EFE9]">
          <Metric label="Total Analyzed" value={data ? data.total_analyzed : "—"} />
          <Metric label="Synthetic Detected" value={data ? data.fake_count : "—"} color="#9B2226" />
          <Metric label="Authentic Verified" value={data ? data.real_count : "—"} color="#2D5A43" />
          <Metric label="Mean Confidence" value={data ? `${(data.avg_confidence * 100).toFixed(1)}%` : "—"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Panel icon={<FiPieChart className="w-4 h-4" />} title="Verdict Breakdown">
            {!hasData ? (
              <EmptyState />
            ) : (
              <div className="flex items-center gap-8">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="55" fill="none" stroke="#E5E1DA" strokeWidth="20" />
                  <circle
                    cx="70"
                    cy="70"
                    r="55"
                    fill="none"
                    stroke="#9B2226"
                    strokeWidth="20"
                    strokeDasharray={`${2 * Math.PI * 55 * fakePct} ${2 * Math.PI * 55}`}
                    transform="rotate(-90 70 70)"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="55"
                    fill="none"
                    stroke="#2D5A43"
                    strokeWidth="20"
                    strokeDasharray={`${2 * Math.PI * 55 * realPct} ${2 * Math.PI * 55}`}
                    transform={`rotate(${-90 + 360 * fakePct} 70 70)`}
                  />
                </svg>
                <div className="font-mono text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3" style={{ background: "#9B2226" }}></span>
                    Synthetic — {Math.round(fakePct * 100)}%
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3" style={{ background: "#2D5A43" }}></span>
                    Authentic — {Math.round(realPct * 100)}%
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel icon={<FiBarChart2 className="w-4 h-4" />} title="Detection by Media Type">
            {!hasData ? (
              <EmptyState />
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {data.by_media_type.map((m) => {
                  const maxCnt = Math.max(...data.by_media_type.map((x) => x.cnt), 1);
                  return (
                    <div key={m.media_type} className="flex items-center gap-3">
                      <div className="w-16 uppercase text-[#8C8C8C]">{m.media_type}</div>
                      <div className="flex-1 h-2 bg-[#E5E1DA]">
                        <div
                          className="h-full bg-[#1A1A1A]"
                          style={{ width: `${(m.cnt / maxCnt) * 100}%` }}
                        ></div>
                      </div>
                      <div className="w-10 text-right font-bold">{m.cnt}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <Panel icon={<FiTrendingUp className="w-4 h-4" />} title="Scans Over Time" className="mt-6">
          {!hasData || data.timeseries.length === 0 ? (
            <EmptyState />
          ) : (
            <TimelineChart timeseries={data.timeseries} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="p-6">
      <span className="text-[9px] uppercase tracking-[2px] font-bold text-[#8C8C8C] block font-mono">{label}</span>
      <div className="font-serif text-4xl font-normal mt-2" style={{ color: color || "#1A1A1A" }}>
        {value}
      </div>
    </div>
  );
}

function Panel({ icon, title, children, className = "" }) {
  return (
    <div className={`border border-[#1A1A1A] bg-white p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-serif text-xl">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-[#8C8C8C] font-mono text-xs uppercase tracking-wider py-10 text-center border border-dashed border-[#1A1A1A]/20">
      No data yet — analyze media in the Forensic Lab
    </div>
  );
}

function TimelineChart({ timeseries }) {
  const maxCnt = Math.max(...timeseries.map((d) => d.cnt), 1);
  const w = 900,
    h = 160,
    pad = 20;
  const points = timeseries
    .map((d, i) => {
      const x = pad + (i / Math.max(timeseries.length - 1, 1)) * (w - 2 * pad);
      const y = h - pad - (d.cnt / maxCnt) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#1A1A1A" strokeWidth="2.5" />
      <polygon points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`} fill="#1A1A1A" opacity="0.06" />
    </svg>
  );
}
