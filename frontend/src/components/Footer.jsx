import { navigate } from "../hooks/useHashRoute.jsx";

export default function Footer() {
  return (
    <footer className="border-t border-[#1A1A1A] bg-[#F9F7F2] text-[#1A1A1A] py-10 px-6 lg:px-10 font-mono text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="font-serif text-2xl font-bold tracking-tight">sentinel.</div>
          <p className="text-[10px] text-[#8C8C8C] uppercase tracking-[2px] mt-1">
            Forensic Defense Terminal — Research Build
          </p>
        </div>

        <div className="flex flex-wrap gap-8 text-[10px] uppercase tracking-[1.5px]">
          <button onClick={() => navigate("#/lab")} className="hover:text-[#C5A059] transition-colors">
            Forensic Lab
          </button>
          <button onClick={() => navigate("#/history")} className="hover:text-[#C5A059] transition-colors">
            Audit Ledger
          </button>
          <button onClick={() => navigate("#/analytics")} className="hover:text-[#C5A059] transition-colors">
            Threat Matrix
          </button>
          <button onClick={() => navigate("#/profile")} className="hover:text-[#C5A059] transition-colors">
            Workspace
          </button>
        </div>

        <div className="text-left md:text-right text-[10px] text-[#8C8C8C]">
          <div>DUAL-BRANCH ENGINE: EFFICIENTNET-B0 + FFT v2.4</div>
          <div>Local research / educational demo — not a legal forensic tool</div>
        </div>
      </div>
    </footer>
  );
}
