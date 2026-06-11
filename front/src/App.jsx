import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import { LanguageProvider } from './LanguageContext';

import Home from './pages/Home';
import PlaceDetailsPage from './pages/PlaceDetailsPage';
import CategoriesPage from './pages/CategoriesPage';
import TrendingPage from './pages/TrendingPage';
import SavedPage from './pages/SavedPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/discover" element={<Home />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/trending" element={<TrendingPage />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/place/:id" element={<PlaceDetailsPage />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}