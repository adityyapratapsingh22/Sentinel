import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { navigate } from "../hooks/useHashRoute.jsx";
import { Api } from "../api.js";
import { FiShield, FiMail, FiKey, FiEye, FiEyeOff, FiUser, FiArrowLeft } from "react-icons/fi";

export default function Login() {
  const { login, signup, isLoggedIn } = useAuth();
  // mode: 'login' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (isLoggedIn) navigate("#/lab");
  }, [isLoggedIn]);

  function switchMode(m) {
    setMode(m);
    setError("");
    setInfo("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        navigate("#/lab");
      } else if (mode === "signup") {
        if (!name.trim()) throw new Error("Please enter your name");
        await signup(name, email, password);
        navigate("#/lab");
      } else if (mode === "forgot") {
        const result = await Api.forgotPassword(email);
        if (result.reset_token) {
          setResetToken(result.reset_token);
          setInfo(
            `Reset token issued (valid ${result.expires_in_minutes} minutes). ` +
              `In a real deployment this would be emailed — for this local demo, it's shown below.`
          );
          setMode("reset");
        } else {
          setInfo(result.message);
        }
      } else if (mode === "reset") {
        await Api.resetPassword(resetToken, newPassword);
        setInfo("Password reset successfully. You can now sign in.");
        setMode("login");
        setPassword("");
        setNewPassword("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    login: "Analyst Sign In",
    signup: "Request Access",
    forgot: "Recover Access",
    reset: "Set New Password",
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-3">
        <button
          type="button"
          onClick={() => navigate("#/")}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono font-bold text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors"
        >
          <FiArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </button>
      </div>
      <div className="relative w-full max-w-md bg-[#F9F7F2] border-2 border-[#1A1A1A] shadow-2xl p-6 sm:p-8 text-[#1A1A1A]">
        <div className="text-center mb-6">
          <FiShield className="w-10 h-10 mx-auto mb-2" />
          <div className="font-serif text-2xl font-bold text-[#1A1A1A]">sentinel.</div>
          <div className="text-[9px] uppercase tracking-[2px] font-mono text-[#8C8C8C] mt-1">
            Forensic Defense Terminal
          </div>
        </div>

        {(mode === "login" || mode === "signup") && (
          <div className="flex border border-[#1A1A1A] bg-[#F1EFE9] text-xs font-mono mb-6">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-2 text-center transition-colors ${
                mode === "login" ? "bg-[#1A1A1A] text-white font-bold" : "text-[#4A4A4A] hover:text-[#1A1A1A]"
              }`}
            >
              Analyst Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 text-center transition-colors ${
                mode === "signup" ? "bg-[#1A1A1A] text-white font-bold" : "text-[#4A4A4A] hover:text-[#1A1A1A]"
              }`}
            >
              Request Access
            </button>
          </div>
        )}

        {(mode === "forgot" || mode === "reset") && (
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono font-bold text-[#8C8C8C] hover:text-[#1A1A1A] mb-4"
          >
            <FiArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </button>
        )}

        <h2 className="font-mono text-[11px] uppercase tracking-[2px] font-bold text-[#8C8C8C] mb-4">
          {titles[mode]}
        </h2>

        {error && (
          <div className="mb-4 border border-[#9B2226] bg-[#9B2226]/10 text-[#9B2226] px-3 py-2 text-xs font-mono">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 border border-[#2D5A43] bg-[#2D5A43]/10 text-[#2D5A43] px-3 py-2 text-xs font-mono leading-relaxed">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {mode === "signup" && (
            <div>
              <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">Full Name</label>
              <div className="relative">
                <FiUser className="w-4 h-4 text-[#8C8C8C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full pl-9 pr-3 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>
          )}

          {(mode === "login" || mode === "signup" || mode === "forgot") && (
            <div>
              <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">
                Institutional Terminal Email
              </label>
              <div className="relative">
                <FiMail className="w-4 h-4 text-[#8C8C8C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@agency.gov"
                  className="w-full pl-9 pr-3 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>
          )}

          {(mode === "login" || mode === "signup") && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase text-[#8C8C8C]">Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-[10px] uppercase text-[#8C8C8C] hover:text-[#1A1A1A] underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <FiKey className="w-4 h-4 text-[#8C8C8C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] hover:text-[#1A1A1A]"
                >
                  {showPassword ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {mode === "reset" && (
            <>
              <div>
                <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">Reset Token</label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1A1A1A] bg-white font-mono text-[10px] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">New Password</label>
                <div className="relative">
                  <FiKey className="w-4 h-4 text-[#8C8C8C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-[#1A1A1A] bg-[#1A1A1A] text-[#F9F7F2] py-3 text-[11px] uppercase tracking-[2px] font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-colors cursor-pointer mt-2 disabled:opacity-50"
          >
            {loading
              ? "Working..."
              : mode === "login"
              ? "Authorize Terminal Session"
              : mode === "signup"
              ? "Create Account"
              : mode === "forgot"
              ? "Send Reset Token"
              : "Set New Password"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#1A1A1A]/15 text-center text-[10px] text-[#8C8C8C] font-mono">
          Local research demo — accounts stored on this machine only.
        </div>
      </div>
    </div>
  );
}