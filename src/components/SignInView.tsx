import React, { useState, useEffect, useRef } from 'react';
import { useStudy } from '../context/StudyContext';
import { Bot, Mail, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

const testimonials = [
  { q: 'My Physics marks jumped from 61 to 88 in one term!', n: 'Aarav · Class 10' },
  { q: 'Cleared my NEET Botany doubts in 2 minutes flat.', n: 'Priya · Class 12' },
  { q: 'Best tool for NCERT exercise solutions before school tests.', n: 'Rohan · Class 9' },
  { q: 'The mock test analysis helped me fix my negative marking mistakes.', n: 'Ananya · JEE Aspirant' },
];

export const SignInView: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithLovable,
    loginWithEmailOtp,
    verifyEmailOtp,
    currentUser,
  } = useStudy();

  const [step, setStep] = useState<'email' | 'otp' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [otpError, setOtpError] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (step === 'otp' && timerSeconds > 0) {
      const t = setTimeout(() => setTimerSeconds((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [step, timerSeconds]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLovableSignIn = async () => {
    setLoading(true);
    try {
      await loginWithLovable();
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      console.warn('Lovable sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail || loading) return;

    setLoading(true);
    try {
      await loginWithEmailOtp(email);
      setStep('otp');
      setTimerSeconds(60);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch (err: any) {
      alert(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setOtpError(null);

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    if (updated.every((d) => d !== '')) {
      handleVerifyOtp(updated.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setLoading(true);
    setOtpError(null);
    try {
      await verifyEmailOtp(email, code);
      setStep('done');
      try {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
      } catch {}
    } catch (err: any) {
      setOtpError("That code didn't work. Try again.");
      setOtpDigits(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const circumference = 2 * Math.PI * 16;

  return (
    <div className="grid min-h-[100dvh] w-screen bg-[#07090e] md:grid-cols-2 text-foreground select-none">
      {/* 1. Left Hero Showcase (matching Image 1) */}
      <section
        className="relative hidden flex-col justify-between overflow-hidden p-8 md:p-12 md:flex"
        style={{
          background:
            'radial-gradient(circle at 40% 30%, rgba(18, 38, 84, 0.7), transparent 60%), linear-gradient(175deg, #090e1c 0%, #060810 100%)',
        }}
      >
        {/* Top Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-[0_0_20px_rgba(37,99,235,0.6)]">
            <Bot className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">
            StudyBot <span className="text-[#3b82f6]">AI</span>
          </span>
        </div>

        {/* Center Floating Graphic */}
        <div className="relative mx-auto my-12 flex h-72 w-72 items-center justify-center">
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-[3rem] bg-blue-600/25 blur-3xl" />

          {/* Center Dark Rounded Square Card */}
          <div className="relative flex h-52 w-52 items-center justify-center rounded-3xl border border-white/10 bg-[#0d1326] shadow-2xl">
            {/* Stacked colorful notebook icon */}
            <div className="flex items-center justify-center transform -rotate-6">
              <svg
                width="84"
                height="84"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Blue book */}
                <rect x="18" y="22" width="34" height="26" rx="4" fill="#38bdf8" />
                <rect x="22" y="24" width="4" height="22" rx="1.5" fill="#0284c7" />
                {/* Pink book */}
                <rect x="14" y="16" width="34" height="26" rx="4" fill="#ec4899" />
                <rect x="18" y="18" width="4" height="22" rx="1.5" fill="#be185d" />
                {/* Green book */}
                <rect x="10" y="10" width="34" height="26" rx="4" fill="#4ade80" />
                <rect x="14" y="12" width="4" height="22" rx="1.5" fill="#16a34a" />
              </svg>
            </div>

            {/* Floating Badge: Smart AI (top-left) */}
            <div className="absolute -top-3 -left-4 flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-[#1e142e]/90 px-3 py-1 text-xs font-bold text-pink-300 shadow-lg backdrop-blur-md">
              <span>🧠</span>
              <span>Smart AI</span>
            </div>

            {/* Floating Badge: 7 day streak (right) */}
            <div className="absolute -right-6 bottom-12 flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-[#261814]/90 px-3 py-1 text-xs font-bold text-orange-300 shadow-lg backdrop-blur-md">
              <span>🔥</span>
              <span>7 day streak</span>
            </div>

            {/* Floating Badge: NCERT 2026-27 (bottom) */}
            <div className="absolute -bottom-3 left-4 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-[#10241e]/90 px-3 py-1 text-xs font-bold text-emerald-300 shadow-lg backdrop-blur-md">
              <span>✅</span>
              <span>NCERT 2026–27</span>
            </div>
          </div>
        </div>

        {/* Bottom Testimonial Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1222]/80 p-5 backdrop-blur-md">
          <p className="text-base font-bold text-white transition-all">
            “{testimonials[activeTestimonial].q}”
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            {testimonials[activeTestimonial].n}
          </p>
        </div>
      </section>

      {/* 2. Right Auth Panel (matching Image 1) */}
      <section className="flex items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1222] p-8 shadow-2xl">
          {step === 'email' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Header */}
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                  Welcome to <span className="text-[#3b82f6]">StudyBot AI</span>
                </h1>
                <p className="mt-1.5 text-xs md:text-sm text-slate-400">
                  Sign in or create an account — no password needed.
                </p>
              </div>

              {/* OAuth Action Buttons */}
              <div className="space-y-3">
                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#161c30] px-4 py-3.5 text-sm font-bold text-white hover:border-[#3b82f6] hover:bg-[#1a233d] transition-all disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 20.4 7.5 23 12 23z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Continue with Lovable */}
                <button
                  type="button"
                  onClick={handleLovableSignIn}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-slate-900 shadow-md hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  {/* Lovable heart icon */}
                  <span className="flex h-5 w-5 items-center justify-center text-rose-500 text-base">
                    ❤️
                  </span>
                  <span>Continue with Lovable</span>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="h-px flex-1 bg-white/10" />
                <span>or with email</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              {/* Email Form */}
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5" htmlFor="email-input">
                    Email address
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/10 bg-[#070a14] px-3.5 py-3 focus-within:border-[#3b82f6] transition-all">
                    <Mail className="h-4 w-4 text-slate-500 mr-2.5" />
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.trim())}
                      placeholder="you@school.com"
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
                    />
                    {isValidEmail && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isValidEmail || loading}
                  className="w-full rounded-xl bg-[#2563eb] py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-[#1d4ed8] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending code…' : 'Send 6-digit code'}
                </button>
              </form>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-6 animate-in fade-in">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>

              <div>
                <h2 className="text-2xl font-extrabold text-white">Enter your code</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Sent to <b className="text-white">{email}</b> ·{' '}
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-blue-400 underline font-semibold"
                  >
                    Change email
                  </button>
                </p>
              </div>

              {/* 6 Digit Inputs */}
              <div className="flex justify-between gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={loading}
                    className="h-13 w-11 sm:w-12 rounded-xl border border-white/20 bg-[#161c30] text-center text-xl font-bold text-white focus:border-[#3b82f6] focus:outline-none shadow-md"
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-xs text-rose-400 text-center font-medium">{otpError}</p>
              )}

              {/* Countdown and Resend */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <div className="flex items-center gap-2">
                  <svg width="28" height="28" viewBox="0 0 40 40" className="-rotate-90">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#1f293d" strokeWidth="3" />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - timerSeconds / 60)}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <span>{timerSeconds > 0 ? `Resend in ${timerSeconds}s` : "Didn't get it?"}</span>
                </div>

                <button
                  type="button"
                  disabled={timerSeconds > 0}
                  onClick={() => setTimerSeconds(60)}
                  className="text-blue-400 font-bold hover:underline disabled:opacity-40"
                >
                  Resend OTP
                </button>
              </div>

              {/* Quick bypass helper button */}
              <button
                type="button"
                onClick={() => handleVerifyOtp('123456')}
                className="w-full text-center text-[0.7rem] text-slate-500 hover:text-blue-300"
              >
                (Demo mode: tap here to auto-verify 123456)
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 py-8 text-center animate-in zoom-in-95">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Verified successfully!</h2>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                Setting up your personalized study space…
              </p>
            </div>
          )}
        </div>

        {/* Edit with Lovable badge in bottom right (as seen in Image 1) */}
        <div className="fixed bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#161616] px-2.5 py-1 text-[0.7rem] text-slate-400">
          <span>Edit with</span>
          <span className="font-bold text-white flex items-center gap-0.5">❤️ Lovable</span>
          <span className="text-slate-500 text-xs ml-1 cursor-pointer">✕</span>
        </div>
      </section>
    </div>
  );
};
