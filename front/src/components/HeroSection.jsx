import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useLang } from '../LanguageContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const venueTypeOptions = [
  { key: 'cinema', tKey: 'cinema', icon: 'Film' },
  { key: 'art', tKey: 'art', icon: 'Palette' },
  { key: 'cafe', tKey: 'rooftop', icon: 'Coffee' },
  { key: 'gaming', tKey: 'vr', icon: 'Gamepad2' },
  { key: 'music', tKey: 'cinema', icon: 'Music' },
  { key: 'sports', tKey: 'karting', icon: 'Trophy' },
];

export default function HeroSection({ onSearch, onFilterChange, searchQuery = '', filters = {} }) {
  const { t } = useLang();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localFilters, setLocalFilters] = useState({
    budget: filters?.budget || null,
    category: filters?.category || null,
    venueTypes: filters?.venueTypes || [],
  });

  const budgetOptions = [
    { key: 'low', label: t.low },
    { key: 'medium', label: t.medium },
    { key: 'high', label: t.high },
  ];

  const categoryOptions = [
    { key: 'family', label: t.family },
    { key: 'youth', label: t.youth },
  ];

  const venueTypesTranslated = [
    { key: 'cinema', label: t.cinema, icon: 'Film' },
    { key: 'art', label: t.art, icon: 'Palette' },
    { key: 'cafe', label: t.rooftop, icon: 'Coffee' },
    { key: 'gaming', label: t.vr, icon: 'Gamepad2' },
    { key: 'music', label: t.karting, icon: 'Music' },
    { key: 'sports', label: t.escape, icon: 'Trophy' },
  ];

  const handleSearchChange = useCallback((e) => {
    const value = e.currentTarget.value;
    setLocalSearch(value);
    onSearch?.(value);
  }, [onSearch]);

  const handleBudgetToggle = useCallback((key) => {
    setLocalFilters(prev => {
      const next = { ...prev, budget: prev?.budget === key ? null : key };
      onFilterChange?.(next);
      return next;
    });
  }, [onFilterChange]);

  const handleCategoryToggle = useCallback((key) => {
    setLocalFilters(prev => {
      const next = { ...prev, category: prev?.category === key ? null : key };
      onFilterChange?.(next);
      return next;
    });
  }, [onFilterChange]);

  const handleVenueTypeToggle = useCallback((key) => {
    setLocalFilters(prev => {
      const current = prev?.venueTypes || [];
      const next = { ...prev, venueTypes: current.includes(key) ? current.filter(k => k !== key) : [...current, key] };
      onFilterChange?.(next);
      return next;
    });
  }, [onFilterChange]);

  const SearchIcon = Icons['Search'];
  const pillBase = 'px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border-2';
  const pillActive = 'bg-[#f9a825] border-[#f9a825] text-white shadow-md shadow-[#f9a825]/25';
  const pillInactive = 'bg-white dark:bg-white/5 border-[#282828]/10 dark:border-white/10 text-[#282828]/70 dark:text-white/60 hover:border-[#f9a825]/40';

  return (
    <section className="relative w-full min-h-[50vh] flex items-center justify-center overflow-hidden bg-white dark:bg-[#111] transition-colors duration-300" dir={t.dir}>
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f9a825]/5 via-transparent to-[#664613]/5 dark:from-[#f9a825]/10 dark:to-transparent" />
      </div>
      <motion.div
        className="relative z-10 w-full max-w-screen-xl mx-auto px-6 md:px-8 py-16 md:py-20 flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className={`text-4xl md:text-5xl lg:text-6xl font-semibold text-[#282828] dark:text-white tracking-tight leading-tight max-w-3xl ${t.fontClass}`}
          variants={itemVariants}
        >
          {t.heroTitle} <span className="text-[#f9a825]">{t.heroTitleHighlight}</span>
        </motion.h1>

        <motion.p className={`mt-5 text-lg md:text-xl font-medium text-[#664613] dark:text-[#f9a825]/80 max-w-xl ${t.fontClass}`} variants={itemVariants}>
          {t.heroSubtitle}
        </motion.p>

        <motion.div className="mt-10 w-full max-w-2xl" variants={itemVariants}>
          <div className="relative group">
            <input
              type="text"
              value={localSearch}
              onChange={handleSearchChange}
              placeholder={t.searchPlaceholder}
              className={`w-full py-4 px-6 pr-14 text-base text-[#282828] dark:text-white bg-white dark:bg-white/5 rounded-2xl border-2 border-[#282828]/10 dark:border-white/10 shadow-md outline-none transition-all duration-300 focus:border-[#f9a825] focus:shadow-lg focus:shadow-[#f9a825]/10 placeholder:text-[#282828]/40 dark:placeholder:text-white/30 ${t.fontClass}`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#282828]/40 dark:text-white/30 group-focus-within:text-[#f9a825] transition-colors duration-300">
              <SearchIcon size={22} />
            </div>
          </div>
        </motion.div>

        <motion.div className="mt-8 w-full max-w-3xl flex flex-col items-center gap-5" variants={itemVariants}>
          {/* Budget */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className={`text-sm font-medium text-[#282828]/50 dark:text-white/40 ${t.fontClass}`}>{t.budget}</span>
            {budgetOptions.map(opt => (
              <button key={opt.key} onClick={() => handleBudgetToggle(opt.key)}
                className={`${pillBase} ${localFilters?.budget === opt.key ? pillActive : pillInactive} ${t.fontClass}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className={`text-sm font-medium text-[#282828]/50 dark:text-white/40 ${t.fontClass}`}>{t.category}</span>
            {categoryOptions.map(opt => (
              <button key={opt.key} onClick={() => handleCategoryToggle(opt.key)}
                className={`${pillBase} ${localFilters?.category === opt.key ? pillActive : pillInactive} ${t.fontClass}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Venue Type */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className={`text-sm font-medium text-[#282828]/50 dark:text-white/40 ${t.fontClass}`}>{t.venueType}</span>
            {venueTypesTranslated.map(opt => {
              const isActive = (localFilters?.venueTypes || []).includes(opt.key);
              const IconComponent = Icons[opt.icon] || Icons['HelpCircle'];
              return (
                <button key={opt.key} onClick={() => handleVenueTypeToggle(opt.key)}
                  className={`inline-flex items-center gap-2 ${pillBase} ${isActive ? pillActive : pillInactive} ${t.fontClass}`}>
                  <IconComponent size={16} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
