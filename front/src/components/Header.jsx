import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import { useLang } from '../LanguageContext';

const languages = [
  { code: 'EN', label: 'English' },
  { code: 'AR', label: 'العربية' },
  { code: 'Franco', label: 'Franco' },
];

export default function Header({ onOpenAuth, onOpenHistory }) {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const { toggle, isDark } = useTheme();
  const { user, logout, isLoggedIn } = useAuth();
  const { lang, setLang, t } = useLang();

  const navigate = useNavigate();

  const ChevronDownIcon = Icons['ChevronDown'];
  const GlobeIcon = Icons['Globe'];
  const SunIcon = Icons['Sun'];
  const MoonIcon = Icons['Moon'];
  const UserIcon = Icons['User'];
  const LogOutIcon = Icons['LogOut'];
  const HistoryIcon = Icons['History'];
  const BookmarkIcon = Icons['Bookmark'];

  const navItems = [
  { key: 'discover', label: t.discover, path: '/discover' },
  { key: 'categories', label: t.categories, path: '/categories' },
  { key: 'trending', label: t.trending, path: '/trending' },
  { key: 'saved', label: t.saved, path: '/saved' },
];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm shadow-sm border-b border-transparent dark:border-white/5 transition-colors duration-300"
      dir={t.dir}
    >
      <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3 gap-4">
        {/* Logo */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="flex items-center shrink-0">
          <span className="font-cairo text-2xl font-semibold tracking-tight text-[#282828] dark:text-white">
            Out<span className="text-[#f9a825]">Zone</span>
          </span>
        </motion.div>

        {/* Nav */}
        <nav className="hidden items-center gap-8 md:flex">
         {navItems.map((item, index) => (
  <motion.button
    key={item.key}
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 + index * 0.06, duration: 0.35 }}
    onClick={() => navigate(item.path)}
    className={`cursor-pointer text-sm font-medium text-[#282828]/60 dark:text-white/50 hover:text-[#282828] dark:hover:text-white transition-colors duration-200 ${t.fontClass}`}
  >
    {item.label}
  </motion.button>
))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Dark/Light toggle */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={toggle}
            className="p-2 rounded-full bg-[#282828]/[0.04] dark:bg-white/10 text-[#282828] dark:text-white transition-all hover:shadow-md"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={isDark ? 'moon' : 'sun'}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 30, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isDark ? <SunIcon className="h-4 w-4 text-[#f9a825]" /> : <MoonIcon className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {/* Language */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setIsLangOpen(!isLangOpen); setIsUserOpen(false); }}
              className="flex items-center gap-2 rounded-full bg-[#282828]/[0.04] dark:bg-white/10 px-4 py-2 text-sm font-medium text-[#282828] dark:text-white transition-all hover:shadow-md"
            >
              <GlobeIcon className="h-4 w-4 text-[#664613] dark:text-[#f9a825]" />
              <span className="min-w-[2.5rem] text-center">{lang}</span>
              <motion.span animate={{ rotate: isLangOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                <ChevronDownIcon className="h-3.5 w-3.5 text-[#282828]/40 dark:text-white/40" />
              </motion.span>
            </motion.button>
            <AnimatePresence>
              {isLangOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsLangOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl bg-white dark:bg-[#2a2a2a] shadow-lg ring-1 ring-[#282828]/5 dark:ring-white/10"
                  >
                    {languages.map((l, index) => (
                      <motion.button
                        key={l.code}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        onClick={() => { setLang(l.code); setIsLangOpen(false); }}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors duration-150 ${
                          lang === l.code
                            ? 'bg-[#f9a825]/10 font-semibold text-[#282828] dark:text-white'
                            : 'text-[#282828]/70 dark:text-white/60 hover:bg-[#282828]/[0.03] dark:hover:bg-white/5'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${lang === l.code ? 'bg-[#f9a825]' : 'bg-[#282828]/15 dark:bg-white/20'}`} />
                        {l.label}
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Auth */}
          {isLoggedIn ? (
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setIsUserOpen(!isUserOpen); setIsLangOpen(false); }}
                className="flex items-center gap-2 rounded-full bg-[#f9a825] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
              >
                <UserIcon className="h-4 w-4" />
                <span className="max-w-[80px] truncate">{user?.username}</span>
                <motion.span animate={{ rotate: isUserOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDownIcon className="h-3.5 w-3.5 text-white/70" />
                </motion.span>
              </motion.button>
              <AnimatePresence>
                {isUserOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsUserOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl bg-white dark:bg-[#2a2a2a] shadow-lg ring-1 ring-[#282828]/5 dark:ring-white/10"
                    >
                      <div className="px-4 py-3 border-b border-[#282828]/5 dark:border-white/10">
                        <p className={`text-xs text-[#282828]/40 dark:text-white/40 ${t.fontClass}`}>{t.signedInAs}</p>
                        <p className="text-sm font-semibold text-[#282828] dark:text-white truncate">{user?.username}</p>
                      </div>
                      <button
                        onClick={() => { setIsUserOpen(false); onOpenHistory?.(); }}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-sm text-[#282828]/70 dark:text-white/60 hover:bg-[#f9a825]/5 hover:text-[#282828] dark:hover:text-white transition-colors ${t.fontClass}`}
                      >
                        <HistoryIcon className="h-4 w-4 text-[#f9a825]" />
                        {t.myActivity}
                      </button>
                      <button
                        onClick={() => { setIsUserOpen(false); onOpenHistory?.('bookings'); }}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-sm text-[#282828]/70 dark:text-white/60 hover:bg-[#f9a825]/5 hover:text-[#282828] dark:hover:text-white transition-colors ${t.fontClass}`}
                      >
                        <BookmarkIcon className="h-4 w-4 text-[#f9a825]" />
                        {t.myBookings}
                      </button>
                      <div className="border-t border-[#282828]/5 dark:border-white/10">
                        <button
                          onClick={() => { setIsUserOpen(false); logout(); }}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${t.fontClass}`}
                        >
                          <LogOutIcon className="h-4 w-4" />
                          {t.signout}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenAuth?.('login')}
                className={`px-4 py-2 rounded-full text-sm font-medium text-[#282828] dark:text-white hover:bg-[#282828]/5 dark:hover:bg-white/10 transition-all ${t.fontClass}`}
              >
                {t.login}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenAuth?.('register')}
                className={`px-4 py-2 rounded-full text-sm font-semibold bg-[#f9a825] text-white shadow-sm hover:shadow-md transition-all ${t.fontClass}`}
              >
                {t.signup}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
