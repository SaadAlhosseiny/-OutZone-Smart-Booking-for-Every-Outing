import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function AuthModal({ mode: initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const XIcon = Icons['X'];
  const UserIcon = Icons['User'];
  const LockIcon = Icons['Lock'];
  const MailIcon = Icons['Mail'];
  const EyeIcon = Icons['Eye'];
  const EyeOffIcon = Icons['EyeOff'];
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!form.username || !form.password) return setError('Please fill all fields');
    if (mode === 'register' && !form.email) return setError('Email is required');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.username, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#282828]/5 dark:border-white/5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#282828]/5 dark:hover:bg-white/10 transition-colors"
          >
            <XIcon className="h-4 w-4 text-[#282828]/40 dark:text-white/40" />
          </button>
          <h2 className="text-2xl font-bold text-[#282828] dark:text-white">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="mt-1 text-sm text-[#282828]/50 dark:text-white/40">
            {mode === 'login' ? 'Sign in to your OutZone account' : 'Join OutZone and discover Cairo'}
          </p>
        </div>

        {/* Form */}
        <div className="px-8 py-6 space-y-4">
          {/* Username */}
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#282828]/30 dark:text-white/30" />
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#282828]/10 dark:border-white/10 bg-[#282828]/[0.02] dark:bg-white/5 text-[#282828] dark:text-white placeholder:text-[#282828]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#f9a825] focus:ring-2 focus:ring-[#f9a825]/20 transition-all text-sm"
            />
          </div>

          {/* Email — register only */}
          <AnimatePresence>
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative overflow-hidden"
              >
                <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#282828]/30 dark:text-white/30" />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#282828]/10 dark:border-white/10 bg-[#282828]/[0.02] dark:bg-white/5 text-[#282828] dark:text-white placeholder:text-[#282828]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#f9a825] focus:ring-2 focus:ring-[#f9a825]/20 transition-all text-sm"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password */}
          <div className="relative">
            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#282828]/30 dark:text-white/30" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full pl-11 pr-11 py-3 rounded-xl border border-[#282828]/10 dark:border-white/10 bg-[#282828]/[0.02] dark:bg-white/5 text-[#282828] dark:text-white placeholder:text-[#282828]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#f9a825] focus:ring-2 focus:ring-[#f9a825]/20 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#282828]/30 dark:text-white/30 hover:text-[#282828]/60 dark:hover:text-white/60 transition-colors"
            >
              {showPass ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-lg"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#f9a825] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="block h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </motion.button>

          {/* Switch mode */}
          <p className="text-center text-sm text-[#282828]/50 dark:text-white/40">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="font-semibold text-[#f9a825] hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
