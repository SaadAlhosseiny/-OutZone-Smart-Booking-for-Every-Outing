import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

const categoryOptions = [
  { id: 'family', label: 'Family' }, { id: 'youth', label: 'Youth' },
  { id: 'couples', label: 'Couples' }, { id: 'groups', label: 'Groups' },
];
const venueOptions = [
  { id: 'cinema', label: 'Cinema', icon: 'Clapperboard' },
  { id: 'vr', label: 'VR', icon: 'Glasses' },
  { id: 'art', label: 'Art', icon: 'Palette' },
  { id: 'escape', label: 'Escape', icon: 'KeyRound' },
  { id: 'karting', label: 'Karting', icon: 'Gauge' },
  { id: 'rooftop', label: 'Rooftop', icon: 'Sun' },
];
const budgetOptions = [
  { id: 'low', label: '$' }, { id: 'mid', label: '$$' }, { id: 'high', label: '$$$' },
];

export default function RecommendationFilterBar({ activeFilters = {}, onChange }) {
  const handleToggle = (group, value) => {
    const current = activeFilters?.[group] || [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    onChange?.({ ...activeFilters, [group]: next });
  };
  const isActive = (group, value) => (activeFilters?.[group] || []).includes(value);

  const pillBase = 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer select-none border';
  const pillInactive = 'bg-white dark:bg-white/5 text-[#282828] dark:text-white/70 border-[#e8e4df] dark:border-white/10 hover:border-[#f9a825] hover:shadow-sm';
  const pillActive = 'bg-[#f9a825] text-white border-[#f9a825] shadow-md';

  const containerVariants = {
    hidden: { opacity: 0, y: -12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, staggerChildren: 0.04 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      className="sticky top-[61px] z-20 w-full bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md border-b border-[#e8e4df] dark:border-white/5 shadow-sm transition-colors duration-300"
      initial="hidden" animate="visible" variants={containerVariants}
    >
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-3">
        <div className="flex flex-row flex-wrap items-center gap-3">
          <motion.div className="flex flex-row flex-wrap gap-2" variants={containerVariants}>
            {categoryOptions.map(opt => (
              <motion.button key={opt.id} type="button" onClick={() => handleToggle('category', opt.id)}
                className={`${pillBase} ${isActive('category', opt.id) ? pillActive : pillInactive}`}
                variants={itemVariants} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                {opt.label}
              </motion.button>
            ))}
          </motion.div>
          <div className="hidden md:block w-px h-8 bg-[#e8e4df] dark:bg-white/10" />
          <motion.div className="flex flex-row flex-wrap gap-2" variants={containerVariants}>
            {venueOptions.map(opt => {
              const IconComp = Icons[opt.icon] || Icons['HelpCircle'];
              return (
                <motion.button key={opt.id} type="button" onClick={() => handleToggle('venue', opt.id)}
                  className={`${pillBase} ${isActive('venue', opt.id) ? pillActive : pillInactive}`}
                  variants={itemVariants} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <IconComp className="w-4 h-4" />
                  {opt.label}
                </motion.button>
              );
            })}
          </motion.div>
          <div className="hidden md:block w-px h-8 bg-[#e8e4df] dark:bg-white/10" />
          <motion.div className="flex flex-row flex-wrap gap-2" variants={containerVariants}>
            {budgetOptions.map(opt => (
              <motion.button key={opt.id} type="button" onClick={() => handleToggle('budget', opt.id)}
                className={`${pillBase} ${isActive('budget', opt.id) ? pillActive : pillInactive}`}
                variants={itemVariants} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                {opt.label}
              </motion.button>
            ))}
          </motion.div>
          {Object.values(activeFilters || {}).some(arr => arr?.length > 0) && (
            <motion.button type="button" onClick={() => onChange?.({})}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#664613] dark:text-[#f9a825] bg-[#faf7f2] dark:bg-[#f9a825]/10 border border-[#e8e4df] dark:border-[#f9a825]/20 hover:bg-[#f5efe6] transition-colors"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.04 }}>
              <Icons.X className="w-3.5 h-3.5" />
              Clear
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
