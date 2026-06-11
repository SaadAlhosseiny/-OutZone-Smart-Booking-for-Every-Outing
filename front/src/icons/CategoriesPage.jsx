import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { api } from '../api';

const CATEGORY_ICONS = {
  'restaurants': 'Utensils', 'cafes': 'Coffee', 'cinemas': 'Film',
  'karting': 'Gauge', 'escape rooms': 'KeyRound', 'museums': 'Landmark',
  'kids areas': 'Baby', 'VR gaming': 'Glasses', 'bowling': 'CircleDot',
  'art spaces': 'Palette', 'cultural centers': 'Theater', 'theme parks': 'Ferris',
  'live music': 'Music', 'arcade': 'Gamepad2', 'family entertainment': 'Users',
};

function mapPlace(p) {
  return { id: p.id, name: p.name, type: p.category, rating: p.rating,
    description: p.description, images: [p.image_url], price_range: p.price_range,
    location: p.location };
}

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [allVenues, setAllVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    api.getPlaces().then(d => setAllVenues((d||[]).map(mapPlace))).finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(allVenues.map(v => v.type))].sort();
  const filtered = activeCategory ? allVenues.filter(v => v.type === activeCategory) : allVenues;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] transition-colors duration-300">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#111]/95 backdrop-blur-sm border-b border-stone-100 dark:border-white/5 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-white/10 transition-colors">
            <Icons.ArrowLeft size={18} className="text-stone-600 dark:text-white/60" />
          </button>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white">Categories</h1>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setActiveCategory(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${!activeCategory ? 'bg-[#f9a825] border-[#f9a825] text-white' : 'bg-white dark:bg-white/5 border-stone-200 dark:border-white/10 text-stone-600 dark:text-white/60 hover:border-[#f9a825]'}`}>
            All
          </button>
          {categories.map(cat => {
            const iconName = CATEGORY_ICONS[cat] || 'MapPin';
            const Icon = Icons[iconName] || Icons['MapPin'];
            return (
              <button key={cat} onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border capitalize ${activeCategory === cat ? 'bg-[#f9a825] border-[#f9a825] text-white' : 'bg-white dark:bg-white/5 border-stone-200 dark:border-white/10 text-stone-600 dark:text-white/60 hover:border-[#f9a825]'}`}>
                <Icon size={14} />
                {cat}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="h-8 w-8 border-2 border-[#f9a825]/30 border-t-[#f9a825] rounded-full" />
          </div>
        ) : activeCategory ? (
          // Filtered view
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((venue, i) => (
              <VenueCard key={venue.id} venue={venue} index={i} onClick={() => navigate(`/place/${venue.id}`)} />
            ))}
          </motion.div>
        ) : (
          // Grouped view
          <div className="space-y-10">
            {categories.map(cat => {
              const catVenues = allVenues.filter(v => v.type === cat);
              const iconName = CATEGORY_ICONS[cat] || 'MapPin';
              const Icon = Icons[iconName] || Icons['MapPin'];
              return (
                <motion.div key={cat} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-[#f9a825]/10"><Icon size={18} className="text-[#f9a825]" /></div>
                      <h2 className="text-lg font-bold text-stone-900 dark:text-white capitalize">{cat}</h2>
                      <span className="text-sm text-stone-400 dark:text-white/30">({catVenues.length})</span>
                    </div>
                    <button onClick={() => setActiveCategory(cat)} className="text-sm text-[#f9a825] hover:underline flex items-center gap-1">
                      See all <Icons.ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {catVenues.slice(0, 4).map((venue, i) => (
                      <VenueCard key={venue.id} venue={venue} index={i} onClick={() => navigate(`/place/${venue.id}`)} />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function VenueCard({ venue, index, onClick }) {
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: index*0.04 }}
      onClick={onClick}
      className="bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden border border-stone-100 dark:border-white/5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
      <div className="relative h-40 overflow-hidden">
        <img src={venue.images[0]} alt={venue.name} onError={e => { e.target.src='https://placehold.co/400x300/e2e8f0/64748b?text=Venue'; }}
          className="w-full h-full object-cover" />
      </div>
      <div className="p-3">
        <h3 className="font-bold text-stone-900 dark:text-white text-sm line-clamp-1">{venue.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <Icons.Star size={11} className="text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-stone-600 dark:text-white/60">{venue.rating}</span>
          </div>
          {venue.price_range && <span className="text-xs text-emerald-600 dark:text-emerald-400">{venue.price_range}</span>}
        </div>
        {venue.location && <p className="text-xs text-stone-400 dark:text-white/30 mt-1 flex items-center gap-1"><Icons.MapPin size={10} />{venue.location.split(',')[0]}</p>}
      </div>
    </motion.div>
  );
}
