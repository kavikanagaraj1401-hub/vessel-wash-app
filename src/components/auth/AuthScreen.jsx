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
  Phone,
  KeyRound,
  MessageCircle,
  MessageSquare,
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { notificationService } from '../../services/notificationService';

export function AuthScreen({ onAuthSuccess, members = [] }) {
  const [loginMode, setLoginMode] = useState('password'); // 'password' | 'otp'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSentInfo, setOtpSentInfo] = useState(null); // { otp, member, expiresAt }
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

  const handleSendOtp = async () => {
    if (loading) return;
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await supabaseService.sendFreePhoneOtp(phoneInput, members);
      if (!res.success) {
        setErrorMsg(res.error?.message || 'Could not send OTP.');
      } else {
        setOtpSentInfo({ otp: res.otp, member: res.member, expiresAt: res.expiresAt });
        notificationService.sendPush('🔐 Vessel Wash Login OTP', {
          body: `Your 6-digit OTP is ${res.otp} (valid 5 mins)`,
          tag: 'vw-login-otp',
          renotify: true,
        });
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to generate OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await supabaseService.verifyFreePhoneOtp(phoneInput, otpInput, members);
      if (!res.success) {
        setErrorMsg(res.error?.message || 'Invalid OTP.');
      } else if (onAuthSuccess) {
        onAuthSuccess(res.session);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
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

        {/* Login Mode Switcher: Password vs Free Phone + OTP */}
        <div className="flex p-1 bg-[#F2F1ED] dark:bg-[#1F2A3C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] gap-1">
          <button
            type="button"
            onClick={() => { setLoginMode('password'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              loginMode === 'password'
                ? 'bg-[#111216] dark:bg-[#ECBD56] text-white dark:text-[#111216] shadow-xs'
                : 'text-[#4E525D] dark:text-[#9BA5B7]'
            }`}
          >
            Password Login
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('otp'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              loginMode === 'otp'
                ? 'bg-[#111216] dark:bg-[#ECBD56] text-white dark:text-[#111216] shadow-xs'
                : 'text-[#4E525D] dark:text-[#9BA5B7]'
            }`}
          >
            Phone + OTP (Free)
          </button>
        </div>

        {/* Form */}
        {loginMode === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-phone" className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block">
                Registered Phone Number
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="login-phone"
                    type="tel"
                    required
                    disabled={loading}
                    value={phoneInput}
                    onChange={(e) => { setPhoneInput(e.target.value); if (errorMsg) setErrorMsg(''); }}
                    placeholder="e.g. 9876543210"
                    className="w-full h-11 pl-10 pr-3 text-xs font-semibold bg-white dark:bg-[#171F2C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] placeholder-[#848A96] dark:placeholder-[#64748B] focus:outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 transition-all"
                  />
                  <Phone className="w-4 h-4 text-[#848A96] dark:text-[#64748B] absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendOtp}
                  className="px-3.5 h-11 rounded-xl bg-[#ECBD56] hover:bg-[#DEAA3E] text-[#111216] font-extrabold text-xs shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {otpSentInfo ? 'Resend' : 'Send OTP'}
                </button>
              </div>
              <span className="text-[10px] text-[#848A96] dark:text-[#64748B] block">
                100% free OTP — uses your phone number registered by Admin.
              </span>
            </div>

            {otpSentInfo && (
              <div className="p-3 rounded-2xl bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 border border-[#22AC77]/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#15803D] dark:text-[#4ADE80]">
                    OTP Ready for {otpSentInfo.member?.name}:
                  </span>
                  <span className="font-mono font-black text-sm tracking-widest px-2 py-0.5 rounded-lg bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#F7F6F3] border border-[#22AC77]/40">
                    {otpSentInfo.otp}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => notificationService.sendViaWhatsApp(`🔐 Vessel Wash Login OTP for ${otpSentInfo.member?.name}: *${otpSentInfo.otp}* (valid 5 mins)`)}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-[#25D366]/15 text-[#15803D] dark:text-[#4ADE80] border border-[#25D366]/30 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => notificationService.sendViaSMS(`Vessel Wash Login OTP for ${otpSentInfo.member?.name}: ${otpSentInfo.otp} (valid 5 mins)`, phoneInput)}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-[#3B82F6]/15 text-[#1D4ED8] dark:text-[#60A5FA] border border-[#3B82F6]/30 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>SMS OTP</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-otp" className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block">
                6-Digit OTP
              </label>
              <div className="relative">
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  disabled={loading}
                  value={otpInput}
                  onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, '')); if (errorMsg) setErrorMsg(''); }}
                  placeholder="Enter 6-digit OTP"
                  className="w-full h-11 pl-10 pr-4 text-xs font-bold tracking-widest bg-white dark:bg-[#171F2C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] placeholder-[#848A96] dark:placeholder-[#64748B] focus:outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 transition-all"
                />
                <KeyRound className="w-4 h-4 text-[#848A96] dark:text-[#64748B] absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpInput.length !== 6}
              className="w-full h-11 bg-[#111216] dark:bg-[#ECBD56] hover:bg-[#23252C] dark:hover:bg-[#DEAA3E] text-white dark:text-[#111216] font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span>Verifying OTP...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Verify &amp; Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
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
        )}

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
