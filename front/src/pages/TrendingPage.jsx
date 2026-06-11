import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { api } from '../api';

export default function TrendingPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPlaces().then(d => {
      const sorted = (d||[]).sort((a,b) => b.rating - a.rating);
      setVenues(sorted);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] transition-colors duration-300">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#111]/95 backdrop-blur-sm border-b border-stone-100 dark:border-white/5 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-white/10 transition-colors">
            <Icons.ArrowLeft size={18} className="text-stone-600 dark:text-white/60" />
          </button>
          <div className="flex items-center gap-2">
            <Icons.TrendingUp size={20} className="text-[#f9a825]" />
            <h1 className="text-xl font-bold text-stone-900 dark:text-white">Trending</h1>
          </div>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="h-8 w-8 border-2 border-[#f9a825]/30 border-t-[#f9a825] rounded-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {venues.map((venue, i) => (
              <motion.div key={venue.id} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.03 }}
                onClick={() => navigate(`/place/${venue.id}`)}
                className="flex items-center gap-4 bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-stone-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-[#f9a825]/30 transition-all cursor-pointer">
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${i===0?'bg-amber-400 text-white':i===1?'bg-stone-300 dark:bg-white/20 text-stone-700 dark:text-white':i===2?'bg-amber-700/20 text-amber-700':'bg-stone-100 dark:bg-white/5 text-stone-400 dark:text-white/30'}`}>
                  {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                </div>
                <div className="shrink-0 h-16 w-16 rounded-xl overflow-hidden">
                  <img src={venue.image_url} alt={venue.name} onError={e => { e.target.src='https://placehold.co/100x100/e2e8f0/64748b?text=V'; }} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-stone-900 dark:text-white text-sm line-clamp-1">{venue.name}</h3>
                  <p className="text-xs text-stone-400 dark:text-white/30 capitalize">{venue.category} · {venue.location?.split(',')[0]}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1"><Icons.Star size={11} className="text-amber-400 fill-amber-400" /><span className="text-xs font-bold text-stone-700 dark:text-white">{venue.rating}</span></div>
                    {venue.price_range && <span className="text-xs text-emerald-600 dark:text-emerald-400">{venue.price_range}</span>}
                  </div>
                </div>
                <Icons.ChevronRight size={16} className="text-stone-300 dark:text-white/20 shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
