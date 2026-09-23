import React, { useState, useMemo } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  User,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { extractNameFromEmail, isKavipriyanEmail } from '../../logic/authUtils';

export function AuthScreen({ onAuthSuccess, onContinueOffline }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Live extracted name and role preview for Sign Up
  const extractedName = useMemo(() => extractNameFromEmail(email), [email]);
  const isAdminCandidate = useMemo(() => isKavipriyanEmail(email), [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'login') {
        const res = await supabaseService.signInWithEmail(cleanEmail, password);
        if (!res.success) {
          const err = res.error?.message || 'Login failed. Please check your email and password.';
          setErrorMsg(err);
        } else {
          // Sync member record to ensure email & role are linked
          const memberName = extractNameFromEmail(cleanEmail);
          const role = isKavipriyanEmail(cleanEmail) ? 'admin' : 'member';
          await supabaseService.syncAuthMember({
            email: cleanEmail,
            fullName: memberName,
            role,
          });

          if (onAuthSuccess) {
            onAuthSuccess(res.session);
          }
        }
      } else {
        // Sign Up
        const res = await supabaseService.signUpWithEmail(cleanEmail, password);
        if (!res.success) {
          const err = res.error?.message || 'Sign up failed. Please try again with another email.';
          setErrorMsg(err);
        } else {
          if (res.requiresEmailConfirmation) {
            setInfoMsg(
              'Account created! A confirmation email has been sent. Please verify your email before logging in.'
            );
          } else {
            setInfoMsg('Account created successfully!');
            if (res.session && onAuthSuccess) {
              onAuthSuccess(res.session);
            } else {
              // Switch to login tab
              setActiveTab('login');
              setInfoMsg('Account created! You can now log in with your credentials.');
            }
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
    } finally {
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

        {/* Segmented Tabs: Log In vs Sign Up */}
        <div className="flex p-1 bg-[#ECEEF0] rounded-full border border-neutral-border/60">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all select-none active-scale flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-[#1E1E1E] text-white shadow-xs'
                : 'text-neutral-textSecondary hover:text-[#1E1E1E]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all select-none active-scale flex items-center justify-center gap-1.5 ${
              activeTab === 'signup'
                ? 'bg-[#1E1E1E] text-white shadow-xs'
                : 'text-neutral-textSecondary hover:text-[#1E1E1E]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Success / Info Alert */}
        {infoMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{infoMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1E1E1E] block">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 pl-10 pr-4 text-xs font-semibold bg-[#ECEEF0]/60 rounded-xl border border-neutral-border text-[#1E1E1E] placeholder:text-neutral-textTertiary focus:outline-none focus:bg-white focus:border-[#A28EF9] focus:ring-2 focus:ring-[#A28EF9]/20 transition-all"
                autoComplete="email"
              />
              <Mail className="w-4 h-4 text-neutral-textTertiary absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1E1E1E] block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 6 chars)"
                className="w-full h-11 pl-10 pr-10 text-xs font-semibold bg-[#ECEEF0]/60 rounded-xl border border-neutral-border text-[#1E1E1E] placeholder:text-neutral-textTertiary focus:outline-none focus:bg-white focus:border-[#A28EF9] focus:ring-2 focus:ring-[#A28EF9]/20 transition-all"
                autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
              />
              <Lock className="w-4 h-4 text-neutral-textTertiary absolute left-3.5 top-3.5 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-neutral-textTertiary hover:text-[#1E1E1E] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign Up Name Preview Badge */}
          {activeTab === 'signup' && email.includes('@') && (
            <div className="p-3 rounded-2xl bg-violet-50/80 border border-violet-200/80 space-y-1.5 text-xs animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-violet-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-700" />
                  Detected Profile:
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    isAdminCandidate
                      ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                      : 'bg-white text-neutral-textSecondary border-neutral-border'
                  }`}
                >
                  {isAdminCandidate ? '👑 Admin' : 'Member'}
                </span>
              </div>
              <p className="text-[11px] text-violet-700">
                You will be registered in the roster as <strong>{extractedName}</strong>.
                {isAdminCandidate && ' Admin privileges will be assigned automatically.'}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-[#1E1E1E] hover:bg-black text-white text-xs font-bold shadow-md hover:shadow-lg active-scale transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{activeTab === 'login' ? 'Authenticating...' : 'Creating Account...'}</span>
              </>
            ) : (
              <>
                <span>{activeTab === 'login' ? 'Log In' : 'Create Account'}</span>
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
    </div>
  );
}
