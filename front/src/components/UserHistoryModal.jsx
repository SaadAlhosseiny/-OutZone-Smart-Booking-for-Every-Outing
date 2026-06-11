import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const TABS = [
  { id: 'activity', label: 'Activity', icon: 'History' },
  { id: 'bookings', label: 'Bookings', icon: 'CalendarCheck' },
  { id: 'favorites', label: 'Favorites', icon: 'Heart' },
];

const ACTION_LABELS = {
  login: { label: 'Signed in', icon: 'LogIn', color: 'text-green-500' },
  register: { label: 'Created account', icon: 'UserPlus', color: 'text-blue-500' },
  view_place: { label: 'Viewed', icon: 'Eye', color: 'text-[#f9a825]' },
  favorite: { label: 'Saved to favorites', icon: 'Heart', color: 'text-red-400' },
  review: { label: 'Left a review', icon: 'Star', color: 'text-amber-500' },
  booking: { label: 'Booked', icon: 'CalendarCheck', color: 'text-emerald-500' },
  cancel_booking: { label: 'Cancelled booking', icon: 'CalendarX', color: 'text-red-400' },
  search_recommend: { label: 'Searched', icon: 'Search', color: 'text-violet-500' },
  update_profile: { label: 'Updated profile', icon: 'Settings', color: 'text-stone-400' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function UserHistoryModal({ initialTab = 'activity', onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [activity, setActivity] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getActivity().catch(() => []),
      api.getBookings().catch(() => []),
      api.getFavorites().catch(() => []),
    ]).then(([a, b, f]) => {
      setActivity(a || []);
      setBookings(b || []);
      setFavorites(f || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleCancelBooking = async (id) => {
    try {
      await api.cancelBooking(id);
      setBookings(b => b.map(bk => bk.id === id ? { ...bk, status: 'cancelled' } : bk));
    } catch {}
  };

  const handleRemoveFavorite = async (placeId) => {
    try {
      await api.removeFavorite(placeId);
      setFavorites(f => f.filter(fav => fav.place?.id !== placeId));
    } catch {}
  };

  const XIcon = Icons['X'];

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
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#282828]/5 dark:border-white/5 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#282828]/5 dark:hover:bg-white/10 transition-colors"
          >
            <XIcon className="h-4 w-4 text-[#282828]/40 dark:text-white/40" />
          </button>
          <h2 className="text-xl font-bold text-[#282828] dark:text-white">
            {user?.username}'s Dashboard
          </h2>
          <p className="mt-0.5 text-sm text-[#282828]/50 dark:text-white/40">
            Your activity, bookings & saved places
          </p>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {TABS.map(t => {
              const Icon = Icons[t.icon];
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    tab === t.id
                      ? 'bg-[#f9a825] text-white shadow-sm'
                      : 'text-[#282828]/50 dark:text-white/40 hover:bg-[#282828]/5 dark:hover:bg-white/10'
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {t.label}
                  {t.id === 'bookings' && bookings.filter(b => b.status === 'confirmed').length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                      {bookings.filter(b => b.status === 'confirmed').length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="h-8 w-8 border-2 border-[#f9a825]/30 border-t-[#f9a825] rounded-full"
              />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* Activity Tab */}
              {tab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-2"
                >
                  {activity.length === 0 ? (
                    <EmptyState icon="History" text="No activity yet" />
                  ) : (
                    activity.map((item, i) => {
                      const def = ACTION_LABELS[item.action] || { label: item.action, icon: 'Activity', color: 'text-stone-400' };
                      const Icon = Icons[def.icon] || Icons['Activity'];
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#282828]/[0.02] dark:hover:bg-white/5 transition-colors"
                        >
                          <div className={`mt-0.5 p-2 rounded-full bg-[#282828]/[0.04] dark:bg-white/10 ${def.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#282828] dark:text-white">
                              {def.label}
                              {item.metadata?.name && (
                                <span className="font-normal text-[#282828]/60 dark:text-white/50"> — {item.metadata.name}</span>
                              )}
                              {item.metadata?.query && (
                                <span className="font-normal text-[#282828]/60 dark:text-white/50"> "{item.metadata.query}"</span>
                              )}
                            </p>
                            {item.metadata?.rating && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {[...Array(5)].map((_, si) => (
                                  <Icons.Star key={si} className={`h-3 w-3 ${si < item.metadata.rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-[#282828]/30 dark:text-white/30 shrink-0">
                            {timeAgo(item.created_at)}
                          </span>
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}

              {/* Bookings Tab */}
              {tab === 'bookings' && (
                <motion.div
                  key="bookings"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-3"
                >
                  {bookings.length === 0 ? (
                    <EmptyState icon="CalendarCheck" text="No bookings yet" />
                  ) : (
                    bookings.map((bk, i) => {
                      const isConfirmed = bk.status === 'confirmed';
                      const isPast = new Date(bk.end_datetime) < new Date();
                      return (
                        <motion.div
                          key={bk.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className={`p-4 rounded-xl border transition-colors ${
                            isConfirmed && !isPast
                              ? 'border-[#f9a825]/30 bg-[#f9a825]/[0.03] dark:bg-[#f9a825]/[0.05]'
                              : 'border-[#282828]/5 dark:border-white/10 bg-[#282828]/[0.02] dark:bg-white/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#282828] dark:text-white text-sm truncate">
                                {bk.place_name}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-[#282828]/50 dark:text-white/40 flex items-center gap-1">
                                  <Icons.Calendar className="h-3 w-3" />
                                  {new Date(bk.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-xs text-[#282828]/50 dark:text-white/40 flex items-center gap-1">
                                  <Icons.Clock className="h-3 w-3" />
                                  {new Date(bk.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  {' – '}
                                  {new Date(bk.end_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                bk.status === 'cancelled'
                                  ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                                  : isPast
                                  ? 'bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-white/50'
                                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                              }`}>
                                {bk.status === 'cancelled' ? 'Cancelled' : isPast ? 'Past' : 'Confirmed'}
                              </span>
                              {isConfirmed && !isPast && (
                                <button
                                  onClick={() => handleCancelBooking(bk.id)}
                                  className="p-1.5 rounded-lg text-[#282828]/30 dark:text-white/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  title="Cancel booking"
                                >
                                  <Icons.X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}

              {/* Favorites Tab */}
              {tab === 'favorites' && (
                <motion.div
                  key="favorites"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {favorites.length === 0 ? (
                    <div className="col-span-2">
                      <EmptyState icon="Heart" text="No saved places yet" />
                    </div>
                  ) : (
                    favorites.map((fav, i) => (
                      <motion.div
                        key={fav.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[#282828]/5 dark:border-white/10 bg-[#282828]/[0.02] dark:bg-white/5 group"
                      >
                        <img
                          src={fav.place?.image_url}
                          alt={fav.place?.name}
                          onError={e => { e.target.src = 'https://placehold.co/80x80/e2e8f0/64748b?text=?'; }}
                          className="h-12 w-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#282828] dark:text-white truncate">{fav.place?.name}</p>
                          <p className="text-xs text-[#282828]/40 dark:text-white/40 truncate">{fav.place?.category} · {fav.place?.location}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFavorite(fav.place?.id)}
                          className="p-1.5 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          title="Remove"
                        >
                          <Icons.Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  const Icon = Icons[icon] || Icons['Inbox'];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-[#282828]/[0.04] dark:bg-white/5 mb-4">
        <Icon className="h-8 w-8 text-[#282828]/20 dark:text-white/20" />
      </div>
      <p className="text-sm font-medium text-[#282828]/40 dark:text-white/40">{text}</p>
    </div>
  );
}
