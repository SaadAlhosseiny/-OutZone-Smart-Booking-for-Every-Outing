const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json.data;
}

export const api = {
  getPlaces: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/api/places${qs ? `?${qs}` : ''}`);
  },
  getPlace: (id) => request(`/api/places/${id}`),
  getCategories: () => request('/api/categories'),
  recommend: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/api/recommend?${qs}`);
  },
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request('/api/auth/profile'),
  updateProfile: (data) => request('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  getFavorites: () => request('/api/favorites'),
  addFavorite: (place_id) => request('/api/favorites', { method: 'POST', body: JSON.stringify({ place_id }) }),
  removeFavorite: (place_id) => request(`/api/favorites/${place_id}`, { method: 'DELETE' }),
  getReviews: (place_id) => request(`/api/places/${place_id}/reviews`),
  createReview: (data) => request('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
  getBookings: () => request('/api/bookings'),
  createBooking: (data) => request('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id) => request(`/api/bookings/${id}`, { method: 'DELETE' }),
  getActivity: () => request('/api/activity'),
};
