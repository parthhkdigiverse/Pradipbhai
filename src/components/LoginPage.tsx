import React, { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center relative overflow-hidden">

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Logo Area */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white mb-6 shadow-xl shadow-primary/20 animate-in zoom-in duration-500">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
              <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
              <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-center">Welcome Back</h1>
          <p className="text-gray-500 mt-2 text-center">Sign in to Alpha Creative</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 animate-in slide-in-from-bottom-8 duration-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-white/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/80 transition-all placeholder:text-gray-400"
                  placeholder="admin@alphacreative.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-white/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/80 transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 mt-2"
            >
              Sign In
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
