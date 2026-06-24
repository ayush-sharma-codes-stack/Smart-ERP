'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useApp } from '@/context/AppContext';
import { Lock, Mail, User, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

// Form validation schemas
const loginSchema = zod.object({
  email: zod.string().email('Please enter a valid email address'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = zod.object({
  fullName: zod.string().min(2, 'Name must be at least 2 characters'),
  email: zod.string().email('Please enter a valid email address'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const { login, register } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (isLogin) {
        const res = await login(data.email, data.password);
        if (res.error) {
          setErrorMsg(res.error);
        }
      } else {
        const res = await register(data.email, data.password, data.fullName);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg('Account registered successfully! You can now log in.');
          setIsLogin(true);
          reset();
        }
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrorMsg('');
    setSuccessMsg('');
    reset();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden font-sans">
      {/* Custom Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px) scale(1); opacity: 0.2; }
          50% { transform: translateY(-20px) scale(1.05); opacity: 0.3; }
          100% { transform: translateY(0px) scale(1); opacity: 0.2; }
        }
        @keyframes typing {
          from { width: 0 }
          to { width: 100% }
        }
        @keyframes blink-caret {
          from, to { border-color: transparent }
          50% { border-color: #34d399 } /* emerald-400 */
        }
        .animate-float-1 { animation: float 6s ease-in-out infinite; }
        .animate-float-2 { animation: float 8s ease-in-out infinite reverse; }
        
        .typing-container {
          display: inline-block;
        }
        .typing-text {
          overflow: hidden;
          white-space: nowrap;
          border-right: .15em solid #34d399;
          animation: 
            typing 3.5s steps(40, end),
            blink-caret .75s step-end infinite;
          margin: 0 auto;
        }
      `}} />

      {/* Decorative background grid and animated gradients */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
      
      {/* Floating Animated Orbs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-[100px] animate-float-1 mix-blend-screen" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px] animate-float-2 mix-blend-screen" />

      <div className="w-full max-w-md z-10">
        {/* Logo/Brand Area */}
        <div className="flex flex-col items-center mb-8 text-center group">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-zinc-900 border border-emerald-500/30 text-emerald-400 font-bold text-2xl tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
            SE
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight mb-2">Smart<span className="text-emerald-400">ERP</span></h1>
          
          {/* Typing Effect Subtitle */}
          <div className="typing-container max-w-full">
            <p className="text-sm text-zinc-400 font-mono typing-text inline-block">Keyboard-first Billing & Double-Entry Accounting</p>
          </div>
        </div>

        {/* Auth Card with Heavy Glassmorphism */}
        <div className="rounded-3xl border border-white/[0.05] bg-zinc-900/40 backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-zinc-100">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <div className="h-1 w-12 rounded-full bg-gradient-to-r from-emerald-400 to-transparent"></div>
          </div>

          {errorMsg && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 flex items-center gap-2">
              <span className="block w-1.5 h-1.5 rounded-full bg-red-400"></span>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-400">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    {...registerField('fullName')}
                    className="w-full rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:bg-black/80 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 shadow-inner shadow-black/50 transition-all duration-300"
                    placeholder="John Doe"
                    disabled={submitting}
                  />
                </div>
                {errors.fullName && <p className="text-xs text-red-400 mt-1">{errors.fullName.message}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  {...registerField('email')}
                  className="w-full rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:bg-black/80 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 shadow-inner shadow-black/50 transition-all duration-300"
                  placeholder="name@company.com"
                  disabled={submitting}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...registerField('password')}
                  className="w-full rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md py-3 pl-10 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:bg-black/80 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 shadow-inner shadow-black/50 transition-all duration-300"
                  placeholder="••••••••"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:from-emerald-600 active:to-teal-700 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Get Started'} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
            <button
              onClick={toggleMode}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition duration-150"
            >
              {isLogin ? (
                <>New to SmartERP? <span className="text-emerald-400 font-medium">Create an account</span></>
              ) : (
                <>Already have an account? <span className="text-emerald-400 font-medium">Sign in instead</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
