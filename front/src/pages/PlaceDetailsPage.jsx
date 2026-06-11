import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: 'CreditCard' },
  { id: 'vodafone', label: 'Vodafone Cash', icon: 'Smartphone' },
  { id: 'instapay', label: 'InstaPay', icon: 'Zap' },
  { id: 'cash', label: 'Cash on Arrival', icon: 'Banknote' },
];

const TIME_SLOTS = ['10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM'];

function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button" disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}>
          <Icons.Star size={readonly ? 14 : 24} className={`transition-colors ${star <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-stone-300 dark:text-white/20'}`} />
        </button>
      ))}
    </div>
  );
}

function getDatesForMonth(year, month) {
  const days = [];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

export default function PlaceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [place, setPlace] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [guests, setGuests] = useState(2);
  const [payment, setPayment] = useState('card');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  useEffect(() => {
    Promise.all([api.getPlace(id), api.getReviews(id)])
      .then(([p, r]) => { setPlace(p); setReviews(r || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleBooking = async () => {
    if (!isLoggedIn) { navigate('/'); return; }
    if (!selectedDate || !selectedTime || !endTime) { setBookingError('Please select date, start time, and end time'); return; }
    setBookingError('');
    setBookingLoading(true);
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(selectedDate).padStart(2,'0')}`;
    const toISO = (timeStr) => {
      const [time, ampm] = timeStr.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
    };
    try {
      await api.createBooking({ place_id: parseInt(id), start_datetime: toISO(selectedTime), end_datetime: toISO(endTime) });
      setBookingSuccess(true);
    } catch(e) { setBookingError(e.message); }
    finally { setBookingLoading(false); }
  };

  const handleReview = async () => {
    if (!isLoggedIn || myRating === 0) return;
    setReviewLoading(true);
    try {
      await api.createReview({ place_id: parseInt(id), rating: myRating, comment: myComment });
      const updated = await api.getReviews(id);
      setReviews(updated || []);
      setReviewSuccess(true);
      setMyRating(0); setMyComment('');
    } catch(e) { console.error(e); }
    finally { setReviewLoading(false); }
  };

  const calDays = getDatesForMonth(calYear, calMonth);
  const isPastDate = (day) => {
    if (!day) return true;
    const d = new Date(calYear, calMonth, day); d.setHours(0,0,0,0);
    const t2 = new Date(); t2.setHours(0,0,0,0);
    return d < t2;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#111]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="h-10 w-10 border-2 border-[#f9a825]/30 border-t-[#f9a825] rounded-full" />
    </div>
  );

  if (!place) return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#111]">
      <p className="text-stone-500">Place not found</p>
    </div>
  );

  const avgRating = reviews.length > 0 ? (reviews.reduce((s,r) => s+r.rating, 0)/reviews.length).toFixed(1) : place.rating;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] transition-colors duration-300">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#111]/95 backdrop-blur-sm border-b border-stone-100 dark:border-white/5 px-6 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-white/60 hover:text-[#f9a825] transition-colors">
          <Icons.ArrowLeft size={18} /> Back
        </button>
      </div>
      <div className="max-w-screen-xl mx-auto px-6 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="rounded-2xl overflow-hidden h-72 md:h-96 relative">
            <img src={place.image_url} alt={place.name} onError={e => { e.target.src='https://placehold.co/1200x600/e2e8f0/64748b?text=Venue'; }} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="px-3 py-1 rounded-full bg-[#f9a825] text-white text-xs font-semibold mb-2 inline-block">{place.category}</span>
              <h1 className="text-3xl font-bold text-white">{place.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <StarRating value={Math.round(avgRating)} readonly />
                <span className="text-white font-semibold text-sm">{avgRating}</span>
                <span className="text-white/60 text-xs">({reviews.length} reviews)</span>
                {place.price_range && <span className="text-emerald-300 font-semibold text-sm">{place.price_range}</span>}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{icon:'MapPin',label:'Location',value:place.location||place.city},{icon:'Users',label:'Audience',value:place.audience},{icon:'Wallet',label:'Budget',value:place.budget},{icon:'DollarSign',label:'Price',value:place.price_range||'N/A'}].map(item => {
              const Icon = Icons[item.icon];
              return (
                <div key={item.label} className="bg-stone-50 dark:bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1"><Icon size={14} className="text-[#f9a825]" /><span className="text-xs text-stone-400 dark:text-white/40">{item.label}</span></div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-white truncate">{item.value}</p>
                </div>
              );
            })}
          </motion.div>

          {place.description && (
            <div className="bg-stone-50 dark:bg-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-3">About</h2>
              <p className="text-stone-600 dark:text-white/60 leading-relaxed">{place.description}</p>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-900 dark:text-white">Reviews <span className="text-stone-400 font-normal text-base">({reviews.length})</span></h2>
            {isLoggedIn && (
              <div className="bg-stone-50 dark:bg-white/5 rounded-2xl p-5 space-y-3">
                <p className="text-sm font-semibold text-stone-700 dark:text-white">Share your experience</p>
                <StarRating value={myRating} onChange={setMyRating} />
                <textarea value={myComment} onChange={e => setMyComment(e.target.value)} placeholder="Write your review..." rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-white/5 text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-[#f9a825] text-sm resize-none" />
                <div className="flex items-center gap-3">
                  <button onClick={handleReview} disabled={myRating===0||reviewLoading} className="px-5 py-2.5 rounded-xl bg-[#f9a825] text-white text-sm font-semibold disabled:opacity-50">
                    {reviewLoading ? 'Submitting...' : 'Submit Review'}
                  </button>
                  {reviewSuccess && <span className="text-sm text-emerald-500 flex items-center gap-1"><Icons.CheckCircle size={14} /> Submitted!</span>}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-stone-400 dark:text-white/30">
                  <Icons.MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No reviews yet. Be the first!</p>
                </div>
              ) : reviews.map((review, i) => (
                <motion.div key={review.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }} className="bg-stone-50 dark:bg-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#f9a825]/20 flex items-center justify-center text-[#f9a825] font-semibold text-sm">{review.username?.[0]?.toUpperCase()||'U'}</div>
                      <div><p className="text-sm font-semibold text-stone-800 dark:text-white">{review.username}</p><StarRating value={review.rating} readonly /></div>
                    </div>
                    <span className="text-xs text-stone-400 dark:text-white/30 shrink-0">{new Date(review.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
                  </div>
                  {review.comment && <p className="text-sm text-stone-600 dark:text-white/50 mt-2 leading-relaxed">{review.comment}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }} className="sticky top-20 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-stone-100 dark:border-white/10 shadow-lg overflow-hidden">
            <div className="bg-[#f9a825] px-6 py-4">
              <h2 className="text-white font-bold text-lg">Book This Place</h2>
              {place.price_range && <p className="text-white/80 text-sm mt-0.5">{place.price_range} per person</p>}
            </div>
            <div className="p-5 space-y-5">
              {bookingSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto"><Icons.CheckCircle size={32} className="text-emerald-500" /></div>
                  <h3 className="font-bold text-stone-900 dark:text-white text-lg">Booking Confirmed!</h3>
                  <p className="text-stone-500 dark:text-white/40 text-sm">{place.name} — {selectedDate}/{calMonth+1}/{calYear} at {selectedTime}</p>
                  <button onClick={() => setBookingSuccess(false)} className="text-sm text-[#f9a825] hover:underline">Book another time</button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10"><Icons.ChevronLeft size={16} className="text-stone-500 dark:text-white/50" /></button>
                      <span className="text-sm font-semibold text-stone-800 dark:text-white">{monthNames[calMonth]} {calYear}</span>
                      <button onClick={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10"><Icons.ChevronRight size={16} className="text-stone-500 dark:text-white/50" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-xs text-stone-400 dark:text-white/30 py-1">{d}</div>)}
                      {calDays.map((day,i) => (
                        <button key={i} disabled={!day||isPastDate(day)} onClick={() => day&&!isPastDate(day)&&setSelectedDate(day)}
                          className={`text-xs py-1.5 rounded-lg transition-all ${!day?'invisible':isPastDate(day)?'text-stone-300 dark:text-white/20 cursor-not-allowed':selectedDate===day?'bg-[#f9a825] text-white font-bold':'text-stone-700 dark:text-white/70 hover:bg-[#f9a825]/10 hover:text-[#f9a825]'}`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-500 dark:text-white/40 uppercase tracking-wider">Start Time</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TIME_SLOTS.map(slot => (
                        <button key={slot} onClick={() => { setSelectedTime(slot); setEndTime(null); }}
                          className={`text-xs py-2 rounded-lg transition-all border ${selectedTime===slot?'bg-[#f9a825] border-[#f9a825] text-white font-semibold':'border-stone-200 dark:border-white/10 text-stone-600 dark:text-white/50 hover:border-[#f9a825] hover:text-[#f9a825]'}`}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedTime && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-stone-500 dark:text-white/40 uppercase tracking-wider">End Time</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {TIME_SLOTS.filter(s => TIME_SLOTS.indexOf(s)>TIME_SLOTS.indexOf(selectedTime)).map(slot => (
                          <button key={slot} onClick={() => setEndTime(slot)}
                            className={`text-xs py-2 rounded-lg transition-all border ${endTime===slot?'bg-stone-800 dark:bg-white border-stone-800 dark:border-white text-white dark:text-stone-900 font-semibold':'border-stone-200 dark:border-white/10 text-stone-600 dark:text-white/50 hover:border-stone-400'}`}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-stone-700 dark:text-white/70">Guests</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setGuests(g=>Math.max(1,g-1))} className="h-8 w-8 rounded-full border border-stone-200 dark:border-white/10 flex items-center justify-center hover:border-[#f9a825] hover:text-[#f9a825] transition-colors"><Icons.Minus size={14} /></button>
                      <span className="text-sm font-bold text-stone-800 dark:text-white w-4 text-center">{guests}</span>
                      <button onClick={() => setGuests(g=>Math.min(20,g+1))} className="h-8 w-8 rounded-full border border-stone-200 dark:border-white/10 flex items-center justify-center hover:border-[#f9a825] hover:text-[#f9a825] transition-colors"><Icons.Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-500 dark:text-white/40 uppercase tracking-wider">Payment Method</p>
                    <div className="space-y-2">
                      {PAYMENT_METHODS.map(method => {
                        const Icon = Icons[method.icon];
                        return (
                          <button key={method.id} onClick={() => setPayment(method.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${payment===method.id?'border-[#f9a825] bg-[#f9a825]/5':'border-stone-200 dark:border-white/10 hover:border-[#f9a825]/50'}`}>
                            <Icon size={16} className={payment===method.id?'text-[#f9a825]':'text-stone-400 dark:text-white/30'} />
                            <span className={`text-sm font-medium ${payment===method.id?'text-stone-800 dark:text-white':'text-stone-500 dark:text-white/40'}`}>{method.label}</span>
                            {payment===method.id && <Icons.CheckCircle size={14} className="text-[#f9a825] ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <AnimatePresence>
                    {bookingError && (
                      <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-lg">{bookingError}</motion.p>
                    )}
                  </AnimatePresence>
                  {selectedDate && selectedTime && endTime && (
                    <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} className="bg-stone-50 dark:bg-white/5 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex justify-between text-stone-500 dark:text-white/40"><span>Date</span><span className="font-semibold text-stone-700 dark:text-white">{selectedDate}/{calMonth+1}/{calYear}</span></div>
                      <div className="flex justify-between text-stone-500 dark:text-white/40"><span>Time</span><span className="font-semibold text-stone-700 dark:text-white">{selectedTime} → {endTime}</span></div>
                      <div className="flex justify-between text-stone-500 dark:text-white/40"><span>Guests</span><span className="font-semibold text-stone-700 dark:text-white">{guests} {guests===1?'person':'people'}</span></div>
                      <div className="flex justify-between text-stone-500 dark:text-white/40"><span>Payment</span><span className="font-semibold text-stone-700 dark:text-white">{PAYMENT_METHODS.find(m=>m.id===payment)?.label}</span></div>
                    </motion.div>
                  )}
                  <button onClick={isLoggedIn ? handleBooking : () => navigate('/')} disabled={bookingLoading}
                    className="w-full py-3.5 rounded-xl bg-[#f9a825] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60">
                    {bookingLoading ? 'Confirming...' : isLoggedIn ? 'Confirm Booking' : 'Log in to Book'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
