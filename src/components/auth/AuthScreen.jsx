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

export function AuthScreen({ onAuthSuccess, onContinueOffline, members = [] }) {
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
    <div className="min-h-screen w-full bg-[#ECEEF0] flex flex-col justify-center items-center p-4 selection:bg-[#A28EF9]/30">
      {/* Container matching mobile / tablet app frame */}
      <div className="w-full max-w-[420px] bg-white rounded-[28px] border border-neutral-border/80 shadow-2xl p-6 sm:p-7 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#A28EF9] text-[#1E1E1E] shadow-md mx-auto">
            <span className="text-xl font-black tracking-tight">VW</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#1E1E1E]">
              Vessel Wash Roster
            </h1>
            <p className="text-xs text-neutral-textSecondary mt-0.5">
              Automated rotation schedule &amp; daily attendance
            </p>
          </div>
        </div>

        {/* Informative Admin-Managed Notice Banner */}
        <div className="p-3 rounded-2xl bg-[#ECEEF0]/70 border border-neutral-border/70 text-xs text-neutral-textSecondary flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-[#7D64F6] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug">
            <strong>Admin-Managed Access:</strong> Member accounts are created by your Administrator. Log in using your assigned username or email.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
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
            <label htmlFor="login-identifier" className="text-xs font-bold text-[#1E1E1E] block">
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
                className="w-full h-11 pl-10 pr-4 text-xs font-semibold bg-white rounded-xl border border-neutral-border text-[#1E1E1E] placeholder:text-neutral-textTertiary focus:outline-none focus:border-[#7D64F6] focus:ring-2 focus:ring-[#7D64F6]/20 transition-all disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
                autoComplete="username"
                autoCapitalize="none"
              />
              <User className="w-4 h-4 text-neutral-textTertiary absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
            <span className="text-[10px] text-neutral-textTertiary block">
              Enter either your member username or registered email.
            </span>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-bold text-[#1E1E1E] block">
                Password
              </label>
              <button
                type="button"
                disabled={loading}
                onClick={() => setForgotModalOpen(true)}
                className="text-[11px] font-bold text-[#7D64F6] hover:underline cursor-pointer disabled:opacity-50"
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
                className="w-full h-11 pl-10 pr-10 text-xs font-semibold bg-white rounded-xl border border-neutral-border text-[#1E1E1E] placeholder:text-neutral-textTertiary focus:outline-none focus:border-[#7D64F6] focus:ring-2 focus:ring-[#7D64F6]/20 transition-all disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
                autoComplete="current-password"
              />
              <Lock className="w-4 h-4 text-neutral-textTertiary absolute left-3.5 top-3.5 pointer-events-none" />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-neutral-textTertiary hover:text-[#1E1E1E] transition-colors disabled:opacity-50"
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
            className="w-full h-11 rounded-full bg-[#1E1E1E] hover:bg-black text-white text-xs font-bold shadow-md hover:shadow-lg active-scale transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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

        {/* Offline / Guest Mode Fallback */}
        {onContinueOffline && (
          <div className="pt-2 border-t border-neutral-border/60 text-center">
            <button
              type="button"
              onClick={onContinueOffline}
              className="text-[11px] font-semibold text-neutral-textSecondary hover:text-[#1E1E1E] transition-colors"
            >
              Continue without signing in (Local Cache) &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center mt-4 text-[11px] text-neutral-textTertiary">
        Secured with Supabase Authentication &amp; PostgreSQL RLS
      </div>

      {/* Forgot Password Modal (Admin Controlled) */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1E1E]/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 border border-neutral-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-border/60">
              <div className="flex items-center gap-2 text-[#1E1E1E] font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-violet-600" />
                <span>Password Reset Notice</span>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-neutral-textSecondary leading-relaxed">
              <p>
                <strong>Password resets are managed directly by Administrators.</strong>
              </p>
              <p>
                To maintain roster integrity and prevent unauthorized changes, self-service password resets are disabled. Please request a temporary password or reset from:
              </p>
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-violet-900 font-semibold text-xs space-y-1">
                <div>👑 <strong>Kavipriyan</strong> (Primary Administrator)</div>
                <div className="text-[11px] font-normal text-violet-700">or any designated Co-Administrator in your group.</div>
              </div>
              <p className="text-[11px] text-neutral-textTertiary">
                Admins can generate a new temporary password for you immediately from the Member Management panel.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="w-full py-2 rounded-xl bg-[#1E1E1E] text-white text-xs font-bold hover:bg-black transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
