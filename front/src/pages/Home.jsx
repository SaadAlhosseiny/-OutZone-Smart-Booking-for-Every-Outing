import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import RecommendationFilterBar from '../components/RecommendationFilterBar';
import VenueCardGrid from '../components/VenueCardGrid';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import UserHistoryModal from '../components/UserHistoryModal';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const venueTypeMap = {
  cinema: 'cinemas', vr: 'VR gaming', art: 'art spaces',
  escape: 'escape rooms', karting: 'karting', rooftop: 'cafes',
};
const categoryAudienceMap = {
  family: 'Families', youth: 'Young Adults',
  couples: 'Couples', groups: 'Groups',
};

function mapPlace(p) {
  return {
    id: p.id,
    name: p.name,
    type: p.category,
    rating: p.rating,
    reviewCount: Math.floor(p.rating * 40),
    description: p.description,
    budget: p.budget === 'Low' ? 1 : p.budget === 'Medium' ? 2 : 3,
    audience: p.audience,
    images: [p.image_url, p.image_url],
    isOpen: true,
    isTrending: p.rating >= 4.7,
    distance: '',
    tags: [p.category, p.audience, p.budget],
    location: p.location,
    city: p.city,
    price_range: p.price_range,
  };
}

export default function Home() {
  const [allVenues, setAllVenues] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroFilters, setHeroFilters] = useState({ budget: null, category: null, venueTypes: [] });
  const [stickyFilters, setStickyFilters] = useState({ category: [], venue: [], budget: [] });
  const [authModal, setAuthModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const { isLoggedIn } = useAuth();
  const debounceRef = useRef(null);

  // جيب كل الأماكن مرة واحدة
  useEffect(() => {
    api.getPlaces()
      .then(data => {
        const mapped = (data || []).map(mapPlace);
        setAllVenues(mapped);
        setVenues(mapped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Search بـ NLP
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const q = searchQuery.trim();

      if (!q) {
        setVenues(allVenues);
        return;
      }

      setLoading(true);
      try {
        const result = await api.recommend({ q, top_n: 20 });
        const recs = result?.recommendations || [];
        if (recs.length > 0) {
          setVenues(recs.map(r => mapPlace(r.place)));
        } else {
          const data = await api.getPlaces({ q });
          setVenues((data || []).map(mapPlace));
        }
      } catch {
        try {
          const data = await api.getPlaces({ q });
          setVenues((data || []).map(mapPlace));
        } catch {
          setVenues(allVenues);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, allVenues]);

  // Client-side filtering
  const filteredVenues = useMemo(() => {
    let result = [...venues];

    // Hero filters
    if (heroFilters.budget) {
      const max = heroFilters.budget === 'low' ? 1 : heroFilters.budget === 'medium' ? 2 : 3;
      result = result.filter(v => v.budget <= max);
    }
    if (heroFilters.category) {
      const audience = categoryAudienceMap[heroFilters.category];
      if (audience) result = result.filter(v => v.audience === audience);
    }
    if (heroFilters.venueTypes?.length > 0) {
      result = result.filter(v =>
        heroFilters.venueTypes.some(t => {
          const mapped = venueTypeMap[t] || t;
          return v.type?.toLowerCase().includes(mapped.toLowerCase());
        })
      );
    }

    // Sticky filters
    if (stickyFilters.category?.length > 0) {
      const allowed = stickyFilters.category.map(c => categoryAudienceMap[c]).filter(Boolean);
      result = result.filter(v => allowed.includes(v.audience));
    }
    if (stickyFilters.venue?.length > 0) {
      result = result.filter(v =>
        stickyFilters.venue.some(t => {
          const mapped = venueTypeMap[t] || t;
          return v.type?.toLowerCase().includes(mapped.toLowerCase());
        })
      );
    }
    if (stickyFilters.budget?.length > 0) {
      const max = Math.max(...stickyFilters.budget.map(b => b === 'low' ? 1 : b === 'mid' ? 2 : 3));
      result = result.filter(v => v.budget <= max);
    }

    return result;
  }, [venues, heroFilters, stickyFilters]);

  return (
    <motion.div
      className="min-h-screen w-full bg-white dark:bg-[#111] transition-colors duration-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Header
  onOpenAuth={mode => setAuthModal(mode)}
  onOpenHistory={tab => {
    if (!isLoggedIn) { setAuthModal('login'); return; }
    setHistoryModal(tab || 'activity');
  }}
/>

      <main className="w-full">
        <HeroSection
          onSearch={setSearchQuery}
          onFilterChange={setHeroFilters}
          searchQuery={searchQuery}
          filters={heroFilters}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <RecommendationFilterBar
            activeFilters={stickyFilters}
            onChange={setStickyFilters}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.6 }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="h-10 w-10 border-2 border-[#f9a825]/30 border-t-[#f9a825] rounded-full"
              />
              {searchQuery && (
                <p className="text-sm text-[#282828]/40 dark:text-white/30">
                  Finding best matches for "<span className="text-[#f9a825]">{searchQuery}</span>"...
                </p>
              )}
            </div>
          ) : (
            <VenueCardGrid venues={filteredVenues} />
          )}
        </motion.div>
      </main>

      <Footer />

      <AnimatePresence>
        {authModal && (
          <AuthModal key="auth" mode={authModal} onClose={() => setAuthModal(null)} />
        )}
        {historyModal && (
          <UserHistoryModal key="history" initialTab={historyModal} onClose={() => setHistoryModal(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
