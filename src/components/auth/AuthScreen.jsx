import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  X,
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';

export function AuthScreen({ onAuthSuccess, members = [] }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (errorMsg) setErrorMsg('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errorMsg) setErrorMsg('');
  };

  const handleResetForm = () => {
    setLoading(false);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg('');

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMsg('Please enter your username or email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    // Safety timeout: Ensure inputs are never permanently locked even if network hangs
    let safetyTimer = setTimeout(() => {
      setLoading(false);
      setErrorMsg('Sign-in request timed out. Please verify your connection and try again.');
    }, 12000);

    try {
      const res = await supabaseService.signInWithUsernameOrEmail(cleanIdentifier, password, members);
      if (safetyTimer) clearTimeout(safetyTimer);

      if (!res.success) {
        const err = res.error?.message || 'Login failed. Please verify your credentials.';
        setErrorMsg(err);
        setLoading(false);
      } else {
        // Successful login
        if (onAuthSuccess) {
          onAuthSuccess(res.session);
        }
        setLoading(false);
      }
    } catch (err) {
      if (safetyTimer) clearTimeout(safetyTimer);
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
      setLoading(false);
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F2F1ED] dark:bg-[#0B0C0E] flex flex-col justify-center items-center p-4 selection:bg-[#ECBD56]/30">
      {/* Container matching mobile / tablet app frame */}
      <div className="w-full max-w-[420px] bg-white dark:bg-[#171F2C] rounded-[28px] border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xl p-6 sm:p-7 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo.png"
            alt="Vessel Wash Logo"
            className="w-16 h-16 rounded-2xl shadow-lg mx-auto object-cover border border-[#ECBD56]/40"
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#111216] dark:text-[#F7F6F3]">
              Vessel Wash Roster
            </h1>
            <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] mt-0.5">
              Automated rotation schedule &amp; daily attendance
            </p>
          </div>
        </div>

        {/* Informative Admin-Managed Notice Banner */}
        <div className="p-3 rounded-2xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] text-xs text-[#4E525D] dark:text-[#9BA5B7] flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-[#ECBD56] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug">
            <strong>Admin-Managed Access:</strong> Member accounts are created by your Administrator. Log in using your assigned username or email.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-[#D9483B]/10 dark:bg-[#FF5A4E]/15 border border-[#D9483B]/30 dark:border-[#FF5A4E]/40 text-[#D9483B] dark:text-[#FF5A4E] text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-[#D9483B] dark:text-[#FF5A4E] flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">
              <span>{errorMsg}</span>
              {loading && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="block mt-1 font-bold underline cursor-pointer"
                >
                  Unlock &amp; retry now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username or Email Field */}
          <div className="space-y-1.5">
            <label htmlFor="login-identifier" className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block">
              Username or Email
            </label>
            <div className="relative">
              <input
                id="login-identifier"
                type="text"
                required
                disabled={loading}
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="e.g. arun or member@example.com"
                className="w-full h-11 pl-10 pr-4 text-xs font-semibold bg-white dark:bg-[#171F2C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] placeholder-[#848A96] dark:placeholder-[#64748B] focus:outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 transition-all disabled:bg-[#F2F1ED] dark:disabled:bg-[#1F2A3C] disabled:text-[#848A96] disabled:cursor-not-allowed"
                autoComplete="username"
                autoCapitalize="none"
              />
              <User className="w-4 h-4 text-[#848A96] dark:text-[#64748B] absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
            <span className="text-[10px] text-[#848A96] dark:text-[#64748B] block">
              Enter either your member username or registered email.
            </span>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block">
                Password
              </label>
              <button
                type="button"
                disabled={loading}
                onClick={() => setForgotModalOpen(true)}
                className="text-[11px] font-bold text-[#ECBD56] hover:underline cursor-pointer disabled:opacity-50"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                disabled={loading}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter password"
                className="w-full h-11 pl-10 pr-10 text-xs font-semibold bg-white dark:bg-[#171F2C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] placeholder-[#848A96] dark:placeholder-[#64748B] focus:outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 transition-all disabled:bg-[#F2F1ED] dark:disabled:bg-[#1F2A3C] disabled:text-[#848A96] disabled:cursor-not-allowed"
                autoComplete="current-password"
              />
              <Lock className="w-4 h-4 text-[#848A96] dark:text-[#64748B] absolute left-3.5 top-3.5 pointer-events-none" />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#848A96] dark:text-[#64748B] hover:text-[#111216] dark:hover:text-[#F7F6F3] transition-colors disabled:opacity-50"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-[#111216] dark:bg-[#ECBD56] hover:bg-black dark:hover:bg-[#DEAA3E] text-white dark:text-[#111216] text-xs font-bold shadow-md hover:shadow-lg active-scale transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>

      {/* Footer Info */}
      <div className="text-center mt-4 text-[11px] text-[#848A96] dark:text-[#64748B]">
        Secured with Supabase Authentication &amp; PostgreSQL RLS
      </div>

      {/* Forgot Password Modal (Admin Controlled) */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#171F2C] rounded-2xl p-5 border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
              <div className="flex items-center gap-2 text-[#111216] dark:text-[#F7F6F3] font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-[#ECBD56]" />
                <span>Password Reset Notice</span>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="p-1 rounded-full hover:bg-[#F2F1ED] dark:hover:bg-[#1F2A3C] text-[#848A96] dark:text-[#64748B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#4E525D] dark:text-[#9BA5B7] leading-relaxed">
              <p>
                <strong>Password resets are managed directly by Administrators.</strong>
              </p>
              <p>
                To maintain roster integrity and prevent unauthorized changes, self-service password resets are disabled. Please request a temporary password or reset from:
              </p>
              <div className="p-3 rounded-xl bg-[#FCF7ED] dark:bg-[#272115] border border-[#ECBD56]/40 text-[#845D08] dark:text-[#FBE6AB] font-semibold text-xs space-y-1">
                <div>👑 <strong>Kavipriyan</strong> (Primary Administrator)</div>
                <div className="text-[11px] font-normal text-[#845D08]/80 dark:text-[#FBE6AB]/80">or any designated Co-Administrator in your group.</div>
              </div>
              <p className="text-[11px] text-[#848A96] dark:text-[#64748B]">
                Admins can generate a new temporary password for you immediately from the Member Management panel.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="w-full py-2 rounded-xl bg-[#111216] dark:bg-[#ECBD56] text-white dark:text-[#111216] text-xs font-bold hover:bg-black dark:hover:bg-[#DEAA3E] transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
