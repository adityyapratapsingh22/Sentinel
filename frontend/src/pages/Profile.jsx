import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Api } from "../api.js";
import { FiUser, FiSave, FiLogOut, FiAlertTriangle, FiLock, FiCamera } from "react-icons/fi";

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [msg, setMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    refreshUser()
      .then((u) => {
        setName(u.name);
        setOrganization(u.organization || "");
      })
      .catch(console.error);
  }, [refreshUser]);

  async function handleSave() {
    try {
      await Api.updateProfile(name, organization);
      setMsg({ text: "Changes saved.", ok: true });
      refreshUser();
    } catch (err) {
      setMsg({ text: "Error: " + err.message, ok: false });
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg({ text: "New passwords do not match.", ok: false });
      return;
    }
    try {
      await Api.changePassword(currentPassword, newPassword);
      setPwdMsg({ text: "Password changed successfully.", ok: true });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdMsg({ text: "Error: " + err.message, ok: false });
    }
  }

  async function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      await Api.uploadPhoto(file);
      await refreshUser();
    } catch (err) {
      setMsg({ text: "Photo upload error: " + err.message, ok: false });
    } finally {
      setPhotoUploading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col w-full bg-[#F9F7F2] text-[#1A1A1A] min-h-screen">
      <div className="p-6 lg:p-10 border-b border-[#1A1A1A] bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto">
          <span className="text-[10px] uppercase tracking-[2.5px] font-bold text-[#8C8C8C] block font-mono">
            Workspace // Account
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl mt-1">Analyst Profile</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="border border-[#1A1A1A] bg-white p-6 text-center">
            <div
              className="relative w-20 h-20 mx-auto cursor-pointer group"
              onClick={() => fileInputRef.current.click()}
            >
              {user.photo ? (
                <img
                  src={user.photo}
                  alt="profile"
                  className="w-20 h-20 object-cover border-2 border-[#1A1A1A]"
                />
              ) : (
                <div className="w-20 h-20 flex items-center justify-center border-2 border-[#1A1A1A] font-serif text-2xl font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <FiCamera className="w-5 h-5 text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoSelect}
              />
            </div>
            <div className="text-[9px] uppercase text-[#8C8C8C] font-mono mt-1">
              {photoUploading ? "Uploading..." : "Click photo to change"}
            </div>
            <div className="font-serif text-xl mt-3">{user.name}</div>
            <div className="font-mono text-[10px] text-[#8C8C8C] mt-1">{user.email}</div>
            <div className="font-mono text-[10px] text-[#8C8C8C] mt-1">
              Member since {new Date(user.created_at * 1000).toLocaleDateString()}
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full mt-4 flex items-center justify-center gap-2 border border-[#9B2226] text-[#9B2226] py-3 text-[11px] uppercase tracking-[1.5px] font-mono font-bold hover:bg-[#9B2226] hover:text-white transition-colors"
          >
            <FiLogOut className="w-4 h-4" /> Log Out
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="border border-[#1A1A1A] bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiUser className="w-4 h-4" />
              <h3 className="font-serif text-xl">Account Credentials</h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">Email (read-only)</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 border border-[#1A1A1A]/40 bg-[#F1EFE9] font-mono text-xs text-[#8C8C8C]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">Organization</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. National Trust & Safety Unit"
                  className="w-full px-3 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
                />
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 border border-[#1A1A1A] bg-[#1A1A1A] text-white px-5 py-2.5 text-[11px] uppercase tracking-[1.5px] font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-colors"
              >
                <FiSave className="w-3.5 h-3.5" /> Save Changes
              </button>

              {msg && (
                <div style={{ color: msg.ok ? "#2D5A43" : "#9B2226" }} className="text-[11px] font-bold">
                  {msg.text}
                </div>
              )}
            </div>
          </div>

          <div className="border border-[#1A1A1A] bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiLock className="w-4 h-4" />
              <h3 className="font-serif text-xl">Change Password</h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-[#8C8C8C] mb-1">Confirm New</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#1A1A1A] bg-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 border border-[#1A1A1A] bg-[#1A1A1A] text-white px-5 py-2.5 text-[11px] uppercase tracking-[1.5px] font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-colors"
              >
                <FiLock className="w-3.5 h-3.5" /> Update Password
              </button>

              {pwdMsg && (
                <div style={{ color: pwdMsg.ok ? "#2D5A43" : "#9B2226" }} className="text-[11px] font-bold">
                  {pwdMsg.text}
                </div>
              )}
            </form>
          </div>

          <div className="border border-[#1A1A1A] bg-[#F1EFE9] p-5 flex items-start gap-3">
            <FiAlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#8C8C8C]" />
            <p className="text-[11px] text-[#4A4A4A] font-mono leading-relaxed">
              This is a local research/demo account stored in a SQLite database on your own machine. It is not
              connected to any external identity provider or cloud service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
