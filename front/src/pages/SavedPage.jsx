import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function SavedPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    api.getFavorites().then(d => setFavorites(d||[])).finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleRemove = async (placeId) => {
    try { await api.removeFavorite(placeId); setFavorites(f => f.filter(fav => fav.place?.id !== placeId)); } catch {}
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] transition-colors duration-300">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#111]/95 backdrop-blur-sm border-b border-stone-100 dark:border-white/5 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-white/10 transition-colors">
            <Icons.ArrowLeft size={18} className="text-stone-600 dark:text-white/60" />
          </button>
          <div className="flex items-center gap-2"><Icons.Heart size={20} className="text-red-400" /><h1 className="text-xl font-bold text-stone-900 dark:text-white">Saved Places</h1></div>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {!isLoggedIn ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-20 w-20 rounded-full bg-stone-100 dark:bg-white/5 flex items-center justify-center mb-4"><Icons.Heart size={36} className="text-stone-300 dark:text-white/20" /></div>
            <h2 className="text-xl font-bold text-stone-700 dark:text-white mb-2">Sign in to see your saved places</h2>
            <button onClick={() => navigate('/')} className="mt-4 px-6 py-3 rounded-xl bg-[#f9a825] text-white font-semibold text-sm">Go to Home</button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="h-8 w-8 border-2 border-[#f9a825]/30 border-t-[#f9a825] rounded-full" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-20 w-20 rounded-full bg-stone-100 dark:bg-white/5 flex items-center justify-center mb-4"><Icons.Heart size={36} className="text-stone-300 dark:text-white/20" /></div>
            <h2 className="text-xl font-bold text-stone-700 dark:text-white mb-2">No saved places yet</h2>
            <button onClick={() => navigate('/')} className="mt-4 px-6 py-3 rounded-xl bg-[#f9a825] text-white font-semibold text-sm">Discover Places</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-400 dark:text-white/30 mb-6">{favorites.length} saved place{favorites.length!==1?'s':''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <AnimatePresence>
                {favorites.map((fav, i) => (
                  <motion.div key={fav.id} initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }} transition={{ delay: i*0.04 }}
                    className="bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden border border-stone-100 dark:border-white/5 shadow-sm hover:shadow-lg transition-all group">
                    <div className="relative h-44 overflow-hidden cursor-pointer" onClick={() => navigate(`/place/${fav.place?.id}`)}>
                      <img src={fav.place?.image_url} alt={fav.place?.name} onError={e => { e.target.src='https://placehold.co/400x300/e2e8f0/64748b?text=Venue'; }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <button onClick={e => { e.stopPropagation(); handleRemove(fav.place?.id); }} className="absolute top-2 right-2 p-2 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-sm shadow-md hover:bg-red-50 transition-colors">
                        <Icons.Heart size={14} className="text-red-500 fill-red-500" />
                      </button>
                    </div>
                    <div className="p-4 cursor-pointer" onClick={() => navigate(`/place/${fav.place?.id}`)}>
                      <h3 className="font-bold text-stone-900 dark:text-white text-sm line-clamp-1">{fav.place?.name}</h3>
                      <p className="text-xs text-stone-400 dark:text-white/30 capitalize mt-0.5">{fav.place?.category}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1"><Icons.Star size={11} className="text-amber-400 fill-amber-400" /><span className="text-xs font-semibold text-stone-600 dark:text-white/60">{fav.place?.rating}</span></div>
                        {fav.place?.price_range && <span className="text-xs text-emerald-600 dark:text-emerald-400">{fav.place.price_range}</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
