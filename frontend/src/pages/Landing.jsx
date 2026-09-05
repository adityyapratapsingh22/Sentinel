import { navigate } from "../hooks/useHashRoute.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  FiArrowRight,
  FiCpu,
  FiEye,
  FiActivity,
  FiCheckCircle,
  FiShield,
} from "react-icons/fi";

const REAL_RESULTS = [
  { scenario: "In-distribution (StyleGAN images, held-out test set)", metric: "92.0% accuracy · 0.974 AUC", status: "STRONG" },
  { scenario: "Out-of-distribution (Stable Diffusion images, unseen)", metric: "2.3% fake recall (before fix)", status: "FAILED" },
  { scenario: "Out-of-distribution (face-swap video, unseen)", metric: "50% accuracy / 0% fake recall (before fix)", status: "FAILED" },
  { scenario: "Face-swap video, after targeted fine-tuning", metric: "77% accuracy · 82% fake recall", status: "IMPROVED" },
];

export default function Landing() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="flex flex-col w-full bg-[#F9F7F2] text-[#1A1A1A]">
      {/* Hero — 3 column editorial layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#1A1A1A]">
        <aside className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#1A1A1A] p-6 sm:p-10 flex flex-col justify-between bg-[#F9F7F2]">
          <div>
            <span className="text-[10px] uppercase tracking-[2.5px] font-bold text-[#8C8C8C] mb-4 block font-mono">
              Research Build // Dual-Branch Detection
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl xl:text-7xl font-normal leading-[0.88] tracking-tight text-[#1A1A1A] mt-2">
              Truth <br />
              <span className="italic font-light text-[#C5A059]">&amp;</span> <br />
              Synthesis.
            </h1>
            <p className="mt-8 text-[15px] leading-[1.75] text-[#333333] max-w-sm">
              A dual-branch spatial and frequency-domain classifier for detecting AI-generated and
              manipulated faces in images and video — built and evaluated with a deliberate focus on
              where it works, and where it honestly doesn't.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(isLoggedIn ? "#/lab" : "#/login")}
                className="border border-[#1A1A1A] bg-[#1A1A1A] text-[#F9F7F2] px-6 py-3.5 text-[11px] uppercase tracking-[1.5px] font-medium hover:bg-transparent hover:text-[#1A1A1A] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enter Forensic Lab</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => navigate(isLoggedIn ? "#/history" : "#/login")}
                className="border border-[#1A1A1A] px-6 py-3.5 text-[11px] uppercase tracking-[1.5px] font-medium hover:bg-[#F1EFE9] transition-all cursor-pointer"
              >
                Audit Ledger
              </button>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-[#1A1A1A]/15 font-mono text-[10px] text-[#8C8C8C] leading-relaxed">
            <div>ENGINE: EFFICIENTNET-B0 + 2D FFT DUAL-BRANCH v2.4</div>
            <div>DEPLOYMENT: LOCAL / SINGLE-MACHINE RESEARCH BUILD</div>
          </div>
        </aside>

        <main className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#1A1A1A] p-6 sm:p-10 bg-[#FDFBF7]">
          <span className="text-[10px] uppercase tracking-[2px] font-bold text-[#C5A059] mb-2 block font-mono">
            Findings // Honest Evaluation
          </span>
          <h2 className="font-serif text-3xl leading-[1.05] tracking-tight text-[#1A1A1A]">
            The anatomy of <br />a generalization gap.
          </h2>
          <p className="mt-3 text-sm text-[#4A4A4A] leading-relaxed">
            A classifier trained only on StyleGAN faces achieved 92% in-distribution accuracy — then
            collapsed to near-zero recall on diffusion-generated images and face-swap video it had
            never seen. That failure, and the targeted fix that partly recovered it, is the real
            story of this project.
          </p>
          <div className="mt-6 border border-[#1A1A1A] bg-white p-4">
            <div className="flex items-center gap-2 text-[#9B2226] font-mono text-xs font-bold uppercase tracking-wider">
              <FiActivity className="w-4 h-4" /> Cross-domain fake recall
            </div>
            <div className="font-serif text-4xl mt-2">90% → 2.3%</div>
            <div className="text-[10px] text-[#8C8C8C] font-mono mt-1">
              StyleGAN (trained) vs. Stable Diffusion (unseen), confidently wrong — not uncertain.
            </div>
          </div>
        </main>

        <aside className="lg:col-span-3 p-6 sm:p-10 bg-[#F1EFE9]">
          <span className="text-[10px] uppercase tracking-[2px] font-bold text-[#8C8C8C] mb-4 block font-mono">
            Core Capabilities
          </span>
          <ul className="space-y-4 font-mono text-xs">
            <Capability icon={<FiCpu className="w-4 h-4" />} title="Dual-Branch Fusion" desc="Spatial CNN + 2D FFT residual features" />
            <Capability icon={<FiEye className="w-4 h-4" />} title="Grad-CAM Explainability" desc="Visual heatmap of decisive regions" />
            <Capability icon={<FiCheckCircle className="w-4 h-4" />} title="Honest Benchmarking" desc="Cross-generator generalization testing" />
            <Capability icon={<FiShield className="w-4 h-4" />} title="Local & Private" desc="Runs entirely on your own machine" />
          </ul>
        </aside>
      </div>

      {/* Real results table */}
      <div className="p-6 sm:p-10 border-b border-[#1A1A1A]">
        <span className="text-[10px] uppercase tracking-[2.5px] font-bold text-[#8C8C8C] mb-2 block font-mono">
          Evaluated Without Overclaiming
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl mb-6">Actual measured results</h2>
        <div className="overflow-x-auto border border-[#1A1A1A]">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-[#1A1A1A] text-[#F9F7F2] text-[9px] uppercase tracking-wider">
                <th className="py-3 px-4">Scenario</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {REAL_RESULTS.map((r, i) => (
                <tr key={i} className="border-t border-[#1A1A1A]/20 bg-white">
                  <td className="py-3 px-4">{r.scenario}</td>
                  <td className="py-3 px-4 font-bold">{r.metric}</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2 py-0.5 text-[9px] font-bold uppercase text-white"
                      style={{
                        background:
                          r.status === "STRONG" ? "#2D5A43" : r.status === "FAILED" ? "#9B2226" : "#C5A059",
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#8C8C8C] font-mono mt-3 max-w-2xl">
          These numbers come directly from evaluation runs on held-out test sets, not marketing estimates.
          The "FAILED" rows are included deliberately — they're the most useful finding in this project.
        </p>
      </div>

      {/* CTA */}
      <div className="p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#1A1A1A] text-[#F9F7F2]">
        <div>
          <h3 className="font-serif text-2xl sm:text-3xl">Try it on your own media.</h3>
          <p className="text-sm text-[#C7C4D7] mt-1">Local, private, and transparent about what it can and can't detect.</p>
        </div>
        <button
          onClick={() => navigate(isLoggedIn ? "#/lab" : "#/login")}
          className="border border-[#F9F7F2] px-6 py-3.5 text-[11px] uppercase tracking-[1.5px] font-medium hover:bg-[#F9F7F2] hover:text-[#1A1A1A] transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
        >
          Enter Forensic Lab <FiArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function Capability({ icon, title, desc }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="font-bold uppercase text-[11px] tracking-wide">{title}</div>
        <div className="text-[#8C8C8C] text-[10px] mt-0.5">{desc}</div>
      </div>
    </li>
  );
}
