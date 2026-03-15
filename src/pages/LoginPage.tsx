import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(username, password)) {
      navigate('/dashboard');
    } else {
      setError('Invalid username or password.');
    }
  };

  return (

<div className="min-h-screen flex items-center justify-center px-4 bg-slate-950 relative">
  {/* Close button */}
  <motion.button
    className="fixed top-8 right-8 p-3 rounded-2xl bg-slate-900/80 border border-slate-700/50 hover:bg-slate-800/80 transition-all backdrop-blur-xl z-50"
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => navigate('/')}
    title="Exit to Landing"
  >
    <X className="w-5 h-5 text-slate-400 hover:text-white" />
  </motion.button>

  {/* Soft glow */}

      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10 mb-4">
              <span className="text-xl font-bold text-violet-400">Q</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">QFactor</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Enter username"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-white text-sm placeholder-slate-500 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter password"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-white text-sm placeholder-slate-500 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400">
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full cursor-pointer rounded-xl py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-lg shadow-violet-600/20"
            >
              Sign In
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
