import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { api } from '../api';

function mapPlace(p) {
  return {
    id: p.id, name: p.name, type: p.category, rating: p.rating,
    description: p.description,
    budget: p.budget === 'Low' ? 1 : p.budget === 'Medium' ? 2 : 3,
    audience: p.audience, images: [p.image_url],
    isTrending: p.rating >= 4.7, tags: [p.category, p.audience, p.budget],
    location: p.location, price_range: p.price_range,
  };
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    api.getPlaces().then(d => setVenues((d||[]).map(mapPlace))).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!search.trim()) {
        api.getPlaces().then(d => setVenues((d||[]).map(mapPlace)));
        return;
      }
      setLoading(true);
      try {
        const result = await api.recommend({ q: search.trim(), top_n: 20 });
        const recs = result?.recommendations || [];
        if (recs.length > 0) setVenues(recs.map(r => mapPlace(r.place)));
        else {
          const data = await api.getPlaces({ q: search.trim() });
          setVenues((data||[]).map(mapPlace));
        }
      } catch {
        const data = await api.getPlaces({ q: search.trim() }).catch(() => []);
        setVenues((data||[]).map(mapPlace));
      } finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] transition-colors duration-300">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#111]/95 backdrop-blur-sm border-b border-stone-100 dark:border-white/5 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-white/10 transition-colors">
            <Icons.ArrowLeft size={18} className="text-stone-600 dark:text-white/60" />
          </button>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white">Discover</h1>
          <div className="relative flex-1 max-w-md ml-auto">
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search venues..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/5 text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-[#f9a825] text-sm" />
          </div>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="h-8 w-8 border-2 border-[#f9a825]/30 border-t-[#f9a825] rounded-full" />
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-400 dark:text-white/30 mb-6">{venues.length} venues found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {venues.map((venue, i) => (
                <motion.div key={venue.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.03 }}
                  onClick={() => navigate(`/place/${venue.id}`)}
                  className="bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden border border-stone-100 dark:border-white/5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="relative h-44 overflow-hidden">
                    <img src={venue.images[0]} alt={venue.name} onError={e => { e.target.src='https://placehold.co/400x300/e2e8f0/64748b?text=Venue'; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {venue.isTrending && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-[#f9a825] text-white text-xs font-semibold">
                        <Icons.TrendingUp size={10} /> Trending
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-stone-900 dark:text-white text-sm leading-tight line-clamp-1">{venue.name}</h3>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#f9a825]/10 text-[#f9a825] text-xs font-semibold">{venue.type}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Icons.Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-semibold text-stone-700 dark:text-white">{venue.rating}</span>
                      {venue.price_range && <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-auto">{venue.price_range}</span>}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-white/40 line-clamp-2">{venue.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
