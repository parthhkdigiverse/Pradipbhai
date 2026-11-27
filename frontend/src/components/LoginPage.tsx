import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE_URL = '/api';


interface LoginPageProps {
  onLogin: (role: string, email: string, user?: any) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });
  const [email, setEmail] = useState<string>(() => {
    return localStorage.getItem('rememberedEmail') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // Persist or clear remembered email based on user choice
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberedEmail', cleanEmail);
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberedEmail');
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      if (res.ok) {
        const data = await res.json();
        const user = data.user;
        if (!data?.token) {
          setErrorMsg('Authentication failed: Server did not issue a valid session token.');
          return;
        }
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userRole', user.role);
        
        onLogin(user.role, user.email, user);
        return;
      } else {
        const errData = await res.json().catch(() => null);
        const msg = errData?.detail || 'Authentication failed. Access denied for non-staff members.';
        setErrorMsg(msg);
      }
    } catch (err) {
      console.warn("Backend authentication unreachable:", err);
      setErrorMsg('Unable to reach authentication server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center relative overflow-hidden">

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Logo Area */}
        <div className="flex flex-col items-center justify-center mb-6">
          <img 
            src="/alpha-logo.png" 
            alt="Alpha Creative Hub" 
            className="h-16 w-auto max-w-[280px] object-contain mb-3 drop-shadow-sm animate-in zoom-in duration-500" 
          />
          <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center">Staff Portal</h1>
          <p className="text-gray-500 mt-0.5 text-center text-sm font-medium">Sign in to your registered staff account</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 animate-in slide-in-from-bottom-8 duration-700">
          
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 ml-1">Staff Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-white/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/80 transition-all placeholder:text-gray-400 text-sm font-medium"
                  placeholder="name@alphacreative.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-white/50 border border-white/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/80 transition-all placeholder:text-gray-400 text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  title={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 transition-all cursor-pointer accent-primary"
                />
                <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
                  Remember me
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
