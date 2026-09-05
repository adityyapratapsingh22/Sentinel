import { useAuth } from "../context/AuthContext.jsx";
import { navigate } from "../hooks/useHashRoute.jsx";
import { FiShield, FiLogOut } from "react-icons/fi";

const NAV_ITEMS = [
  { key: "landing", href: "#/", label: "Home" },
  { key: "lab", href: "#/lab", label: "Forensic Lab" },
  { key: "history", href: "#/history", label: "Audit Ledger" },
  { key: "analytics", href: "#/analytics", label: "Threat Matrix" },
  { key: "profile", href: "#/profile", label: "Workspace" },
];

export default function Header({ active }) {
  const { user, isLoggedIn, logout } = useAuth();

  return (
    <header className="border-b border-[#1A1A1A] bg-[#F9F7F2] text-[#1A1A1A] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 py-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("#/")}>
          <FiShield className="w-6 h-6" />
          <div>
            <div className="font-serif text-2xl font-bold tracking-tight leading-none">sentinel.</div>
            <div className="text-[9px] uppercase tracking-[2px] font-mono text-[#8C8C8C]">
              Forensic Defense Terminal
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[1.5px] font-mono font-bold">
          {NAV_ITEMS.filter((item) => isLoggedIn || item.key === "landing").map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`pb-1 border-b-2 transition-colors ${
                active === item.key
                  ? "border-[#C5A059] text-[#1A1A1A]"
                  : "border-transparent text-[#8C8C8C] hover:text-[#1A1A1A]"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <span className="hidden sm:block text-[10px] font-mono text-[#8C8C8C] uppercase tracking-[1.5px]">
                {user?.name}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 border border-[#1A1A1A] px-3 py-1.5 text-[10px] uppercase tracking-[1.5px] font-mono font-bold hover:bg-[#1A1A1A] hover:text-white transition-colors"
              >
                <FiLogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("#/login")}
              className="border border-[#1A1A1A] bg-[#1A1A1A] text-[#F9F7F2] px-4 py-2 text-[10px] uppercase tracking-[1.5px] font-mono font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-colors"
            >
              Analyst Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
