import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

const StarIcon = Icons['Star'];
const DollarSignIcon = Icons['DollarSign'];
const UsersIcon = Icons['Users'];
const MapPinIcon = Icons['MapPin'];
const HeartIcon = Icons['Heart'];
const TrendingUpIcon = Icons['TrendingUp'];
const SparklesIcon = Icons['Sparkles'];
const TagIcon = Icons['Tag'];
const ChevronRightIcon = Icons['ChevronRight'];
const SearchIcon = Icons['Search'];

const typeColors = {
  'restaurants': 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700/30',
  'cafes': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/30',
  'cinemas': 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-700/30',
  'escape rooms': 'bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-700/30',
  'karting': 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700/30',
  'museums': 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700/30',
  'VR gaming': 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/30',
  'bowling': 'bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-700/30',
  'live music': 'bg-pink-50 dark:bg-pink-900/20 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-700/30',
  'arcade': 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700/30',
};

export default function VenueCardGrid({ venues = [] }) {
  const [favorites, setFavorites] = useState(new Set());
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();

  const toggleFavorite = (e, id) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderStars = (rating) => {
    const full = Math.floor(rating || 0);
    const half = (rating || 0) % 1 >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} size={14} className={
            i < full ? 'text-amber-400 fill-amber-400'
            : i === full && half ? 'text-amber-400 fill-amber-400/50'
            : 'text-stone-300 dark:text-white/20'
          } />
        ))}
      </div>
    );
  };

  const renderBudget = (level) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <DollarSignIcon key={i} size={12} className={i < level ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-300 dark:text-white/20'} />
      ))}
    </div>
  );

  if (venues.length === 0) {
    return (
      <section className="w-full bg-white dark:bg-[#111] min-h-[40vh] flex items-center justify-center transition-colors duration-300">
        <div className="text-center py-20">
          <SearchIcon size={48} className="mx-auto text-stone-300 dark:text-white/10 mb-4" />
          <h3 className="text-xl font-semibold text-stone-700 dark:text-white/50 mb-2">No venues found</h3>
          <p className="text-stone-500 dark:text-white/30">Try adjusting your filters or search query</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white dark:bg-[#111] min-h-screen transition-colors duration-300">
      <div className="max-w-screen-xl mx-auto px-6 md:px-8 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-2">
            <SparklesIcon size={20} className="text-amber-500" />
            <span className="text-xs font-semibold tracking-widest uppercase text-amber-600 dark:text-amber-400">
              Curated for You
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-stone-900 dark:text-white tracking-tight">
            Cairo's Finest Venues
          </h2>
          <p className="mt-2 text-stone-500 dark:text-white/40 text-base max-w-2xl">
            {venues.length} place{venues.length !== 1 ? 's' : ''} found
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {venues.map((venue) => (
            <motion.div
              key={venue.id}
              variants={{ hidden: { opacity: 0, y: 40, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } } }}
              onMouseEnter={() => setHoveredCard(venue.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="group cursor-pointer"
              onClick={() => navigate(`/place/${venue.id}`)}
            >
              <div className="bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm hover:shadow-xl dark:shadow-black/40 transition-all duration-500 border border-stone-100 dark:border-white/5 hover:-translate-y-1.5">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={venue.images?.[0]}
                    alt={venue.name}
                    onError={e => { e.target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Venue'; }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <button
                    onClick={e => toggleFavorite(e, venue.id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-sm shadow-md hover:scale-110 transition-all"
                  >
                    <HeartIcon size={16} className={favorites.has(venue.id) ? 'text-red-500 fill-red-500' : 'text-stone-400 dark:text-white/50'} />
                  </button>
                  {venue.isTrending && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f9a825] text-white text-xs font-semibold shadow-md">
                      <TrendingUpIcon size={12} />
                      Trending
                    </div>
                  )}
                  {venue.location && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-sm text-xs font-medium text-stone-700 dark:text-white">
                      <MapPinIcon size={12} className="text-stone-500 dark:text-white/60" />
                      {venue.location.split(',')[0]}
                    </div>
                  )}
                </div>

                <div className="px-4 pb-4 pt-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-stone-900 dark:text-white text-sm leading-tight group-hover:text-amber-600 dark:group-hover:text-[#f9a825] transition-colors line-clamp-2">
                      {venue.name}
                    </h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border ${typeColors[venue.type] || 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-white/60 border-stone-200 dark:border-white/10'}`}>
                      {venue.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    {renderStars(venue.rating)}
                    <span className="text-sm font-semibold text-stone-800 dark:text-white">{venue.rating}</span>
                  </div>

                  <p className="text-xs text-stone-500 dark:text-white/40 leading-relaxed mb-3 line-clamp-2">
                    {venue.description}
                  </p>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 dark:text-white/30">Budget</span>
                      {renderBudget(venue.budget)}
                      {venue.price_range && (
  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 ml-1">
    {venue.price_range}
  </span>
)}
                    </div>
                    <div className="flex items-center gap-1">
                      <UsersIcon size={13} className="text-stone-400 dark:text-white/30" />
                      <span className="text-xs text-stone-500 dark:text-white/40">{venue.audience}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {(venue.tags || []).slice(0, 3).map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/5 text-stone-500 dark:text-white/40 text-xs">
                        <TagIcon size={9} />
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className={`flex items-center gap-1 text-xs font-semibold transition-all duration-300 ${hoveredCard === venue.id ? 'text-amber-600 dark:text-[#f9a825] translate-x-1' : 'text-stone-400 dark:text-white/20'}`}>
                    View Details
                    <ChevronRightIcon size={14} className={`transition-transform duration-300 ${hoveredCard === venue.id ? 'translate-x-1' : ''}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
