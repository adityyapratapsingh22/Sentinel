import { useState, useRef } from "react";
import { Api } from "../api.js";
import {
  FiUploadCloud,
  FiShieldOff,
  FiShield,
  FiEye,
  FiActivity,
  FiFilm,
} from "react-icons/fi";

export default function Lab() {
  const [tab, setTab] = useState("image");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  function resetAll() {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function switchTab(t) {
    setTab(t);
    resetAll();
  }

  function handleFile(f) {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError("");
    setResult(null);
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = tab === "image" ? await Api.predictImage(file) : await Api.predictVideo(file);
      setResult({ type: tab, data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isFake = result?.data.verdict === "fake";

  return (
    <div className="flex flex-col w-full bg-[#F9F7F2] text-[#1A1A1A] min-h-screen">
      {/* Editorial Header */}
      <div className="p-6 lg:p-10 border-b border-[#1A1A1A] bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto">
          <span className="text-[10px] uppercase tracking-[2.5px] font-bold text-[#8C8C8C] block font-mono">
            Workspace // Live Ingestion
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#1A1A1A] mt-1">Forensic Analysis Lab</h1>
          <p className="mt-2 text-sm text-[#4A4A4A] max-w-xl font-sans">
            Dual-branch spatial and spectral inference on uploaded media buffers.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 border-b border-[#1A1A1A]">
        {/* LEFT: upload */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#1A1A1A] p-6 lg:p-10">
          <div className="flex border border-[#1A1A1A] font-mono text-xs mb-6">
            <button
              onClick={() => switchTab("image")}
              className={`flex-1 py-2 uppercase tracking-wider font-bold ${
                tab === "image" ? "bg-[#1A1A1A] text-white" : "bg-white text-[#4A4A4A]"
              }`}
            >
              Image Analysis
            </button>
            <button
              onClick={() => switchTab("video")}
              className={`flex-1 py-2 uppercase tracking-wider font-bold ${
                tab === "video" ? "bg-[#1A1A1A] text-white" : "bg-white text-[#4A4A4A]"
              }`}
            >
              Video Sequence
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
            }}
            className={`border-2 border-dashed p-10 text-center cursor-pointer transition-colors font-mono ${
              dragOver ? "border-[#C5A059] bg-[#F1EFE9]" : "border-[#1A1A1A]/40 hover:border-[#1A1A1A]"
            }`}
          >
            <FiUploadCloud className="w-8 h-8 mx-auto mb-3 text-[#8C8C8C]" />
            <div className="text-xs uppercase tracking-wider font-bold">Drop synthetic candidate media</div>
            <div className="text-[10px] text-[#8C8C8C] mt-2">
              {tab === "image" ? "JPG, PNG, WEBP" : "MP4, MOV"} — up to 250MB
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={tab === "image" ? "image/*" : "video/*"}
              hidden
              onChange={(e) => e.target.files.length && handleFile(e.target.files[0])}
            />
          </div>

          {previewUrl && tab === "image" && (
            <img
              src={previewUrl}
              className="mt-4 w-full max-h-64 object-cover border border-[#1A1A1A] grayscale contrast-110"
              alt="preview"
            />
          )}
          {previewUrl && tab === "video" && (
            <video src={previewUrl} controls className="mt-4 w-full max-h-64 border border-[#1A1A1A]" />
          )}

          {file && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-4 border border-[#1A1A1A] bg-[#1A1A1A] text-[#F9F7F2] py-3 text-[11px] uppercase tracking-[2px] font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze Media (Dual-Branch)"}
            </button>
          )}

          {error && (
            <div className="mt-4 border border-[#9B2226] bg-[#9B2226]/10 text-[#9B2226] px-3 py-2 text-xs font-mono">
              {error}
            </div>
          )}
        </div>

        {/* RIGHT: verdict */}
        <div className="lg:col-span-7 p-6 lg:p-10 bg-[#F1EFE9]">
          {!result ? (
            <div className="h-full flex items-center justify-center text-[#8C8C8C] font-mono text-xs uppercase tracking-wider py-16">
              Awaiting media ingestion
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3 mb-4">
                <span className="text-[10px] uppercase tracking-[2px] font-bold text-[#8C8C8C] font-mono">
                  {isFake ? "Critical Detection Risk" : "Verified Authentic"}
                </span>
                {isFake ? (
                  <FiShieldOff className="w-5 h-5 text-[#9B2226]" />
                ) : (
                  <FiShield className="w-5 h-5 text-[#2D5A43]" />
                )}
              </div>

              <h2 className="font-serif text-3xl mb-2" style={{ color: isFake ? "#9B2226" : "#2D5A43" }}>
                {isFake ? "Synthetic / Manipulated" : "Authentic Media"}
              </h2>

              <ResultBody result={result} />
            </>
          )}
        </div>
      </div>

      {/* Explainability */}
      <div className="max-w-7xl mx-auto w-full p-6 lg:p-10 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2 mb-1">
          <FiEye className="w-4 h-4" />
          <h3 className="font-serif text-2xl">Dual-Branch Explainability</h3>
        </div>
        <p className="text-xs text-[#8C8C8C] font-mono mb-4">
          Grad-CAM activations highlight regions that most influenced the classifier.
        </p>
        {result?.type === "image" && result.data.heatmap ? (
          <div className="grid grid-cols-2 gap-4">
            <figure>
              <img src={result.data.face_thumbnail} className="w-full border border-[#1A1A1A] grayscale contrast-110" />
              <figcaption className="text-[9px] uppercase tracking-wider text-center mt-1 font-mono text-[#8C8C8C]">
                Raw Sensor Capture
              </figcaption>
            </figure>
            <figure>
              <img src={result.data.heatmap} className="w-full border border-[#1A1A1A]" />
              <figcaption className="text-[9px] uppercase tracking-wider text-center mt-1 font-mono text-[#8C8C8C]">
                Grad-CAM Activation
              </figcaption>
            </figure>
          </div>
        ) : (
          <div className="text-[#8C8C8C] font-mono text-xs uppercase tracking-wider py-8 text-center border border-dashed border-[#1A1A1A]/30">
            No image analysis yet
          </div>
        )}
      </div>

      {/* FFT */}
      <div className="max-w-7xl mx-auto w-full p-6 lg:p-10 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2 mb-1">
          <FiActivity className="w-4 h-4" />
          <h3 className="font-serif text-2xl">Radial FFT Spectral Decomposition</h3>
        </div>
        <p className="text-xs text-[#8C8C8C] font-mono mb-4">
          Frequency-domain signature — GAN upsampling often leaves periodic artifacts here.
        </p>
        {result?.type === "image" && result.data.fft_profile ? (
          <FftChart profile={result.data.fft_profile} />
        ) : (
          <div className="text-[#8C8C8C] font-mono text-xs uppercase tracking-wider py-8 text-center border border-dashed border-[#1A1A1A]/30">
            No image analysis yet
          </div>
        )}
      </div>

      {/* Video timeline */}
      {result?.type === "video" && (
        <div className="max-w-7xl mx-auto w-full p-6 lg:p-10">
          <div className="flex items-center gap-2 mb-1">
            <FiFilm className="w-4 h-4" />
            <h3 className="font-serif text-2xl">Temporal Frame Decomposition</h3>
          </div>
          <p className="text-xs text-[#8C8C8C] font-mono mb-4">
            Per-frame fake probability across sampled frames.
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {result.data.per_frame_scores.map((f, i) => {
              const fFake = f.fake_probability > 0.5;
              return (
                <div key={i} className="flex-shrink-0 w-20 text-center">
                  <img
                    src={f.thumbnail || ""}
                    className="w-20 h-20 object-cover border-2 grayscale contrast-110"
                    style={{ borderColor: fFake ? "#9B2226" : "#2D5A43" }}
                  />
                  <div
                    className="text-[10px] font-mono mt-1 font-bold"
                    style={{ color: fFake ? "#9B2226" : "#2D5A43" }}
                  >
                    {(f.fake_probability * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultBody({ result }) {
  const { type, data } = result;
  const isFake = data.verdict === "fake";
  const pct =
    type === "image"
      ? Math.round(data.confidence * 100)
      : isFake
      ? Math.round(data.avg_fake_probability * 100)
      : Math.round((1 - data.avg_fake_probability) * 100);

  return (
    <div className="flex items-center gap-6 mt-4">
      <SemiGauge pct={pct} isFake={isFake} />
      <div className="font-mono text-xs text-[#4A4A4A]">
        {type === "image" ? (
          <>
            <div>FAKE PROBABILITY: {(data.fake_probability * 100).toFixed(1)}%</div>
            <div>REAL PROBABILITY: {(data.real_probability * 100).toFixed(1)}%</div>
          </>
        ) : (
          <div>ANALYZED {data.n_frames_analyzed} SAMPLED FRAMES</div>
        )}
        <div className="mt-1 text-[10px] text-[#8C8C8C]">SHA-256: {data.sha256?.slice(0, 24)}...</div>
      </div>
    </div>
  );
}

function SemiGauge({ pct, isFake }) {
  const color = isFake ? "#9B2226" : "#2D5A43";
  const total = 220;
  return (
    <div className="relative w-[160px] h-[90px] flex-shrink-0">
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="#E5E1DA" strokeWidth="12" />
        <path
          d="M 10 80 A 70 70 0 0 1 150 80"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${(total * pct) / 100} ${total}`}
        />
      </svg>
      <div
        className="absolute inset-x-0 bottom-0 text-center font-serif text-3xl font-bold"
        style={{ color }}
      >
        {pct}%
      </div>
    </div>
  );
}

function FftChart({ profile }) {
  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const range = max - min || 1;
  const w = 700,
    h = 160,
    pad = 12;
  const points = profile
    .map((v, i) => {
      const x = pad + (i / (profile.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full border border-[#1A1A1A] bg-white" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#9B2226" strokeWidth="2" />
      <polygon points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`} fill="#9B2226" opacity="0.06" />
    </svg>
  );
}
