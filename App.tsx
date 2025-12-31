import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import NewsCard from './components/NewsCard';
import AuthModal from './components/AuthModal';
import { fetchAnalysedNews } from './services/geminiService';
import { mockAuth, mockDb } from './services/mockBackend';
import { User, Category, NewsItem } from './types';
import { Cpu, Radio, Zap, Star } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [favorites, setFavorites] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // View State
  const [activeTab, setActiveTab] = useState<'ALL' | Category>('ALL');
  const [activeView, setActiveView] = useState<'FEED' | 'FAVORITES'>('FEED');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAdmin = !!currentUser && (
    (process.env.ADMIN_EMPLOYEE_ID && currentUser.employeeId === process.env.ADMIN_EMPLOYEE_ID) ||
    (process.env.ADMIN_USERNAME && currentUser.username === process.env.ADMIN_USERNAME)
  );

  // Helper to sync local favorites state
  const refreshFavorites = useCallback(() => {
    if (currentUser) {
      setFavorites(mockDb.getUserFavorites(currentUser.id));
    } else {
      setFavorites([]);
    }
  }, [currentUser]);

  // Initial Data Fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch categories in parallel
    const [cockpit, driving, ai] = await Promise.all([
      fetchAnalysedNews('COCKPIT'),
      fetchAnalysedNews('DRIVING'),
      fetchAnalysedNews('AI')
    ]);

    const combined = [...cockpit, ...driving, ...ai];
    
    // Sorting Logic:
    // 1. Value/Rating (High to Low)
    // 2. Publication Time (New to Old)
    const sorted = combined.sort((a, b) => {
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      
      // Primary Sort: Rating Descending
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      
      // Secondary Sort: Time Descending
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    
    setNews(sorted);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    // Check for logged in user
    const savedUser = mockAuth.getCurrentUser();
    if (savedUser) {
      setCurrentUser(savedUser);
    }
    // Initial fetch
    fetchData();
  }, [fetchData]);

  // Sync favorites when user changes
  useEffect(() => {
    refreshFavorites();
    if (!currentUser && activeView === 'FAVORITES') {
      setActiveView('FEED');
    }
  }, [currentUser, refreshFavorites, activeView]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    mockAuth.logout();
    setCurrentUser(null);
  };

  const handleToggleFavorite = (item: NewsItem) => {
    if (!currentUser) return;
    mockDb.toggleFavorite(currentUser.id, item);
    refreshFavorites();
  };

  const handleRefresh = () => {
    if (!isAdmin) return;
    fetchData();
  };

  // Decide which list to render
  const sourceList = activeView === 'FAVORITES' ? favorites : news;

  const filteredNews = activeTab === 'ALL' 
    ? sourceList 
    : sourceList.filter(item => item.category === activeTab);

  const tabs: { id: 'ALL' | Category; label: string; icon: React.ReactNode }[] = [
    { id: 'ALL', label: 'All Feeds', icon: null },
    { id: 'COCKPIT', label: 'Smart Cabin', icon: <Cpu size={16} /> },
    { id: 'DRIVING', label: 'Autonomous Driving', icon: <Radio size={16} /> },
    { id: 'AI', label: 'AI News', icon: <Zap size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
      <Navbar 
        currentUser={currentUser} 
        onLoginClick={() => setIsAuthOpen(true)} 
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        isRefreshing={loading}
        lastUpdated={lastUpdated}
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        canRefresh={isAdmin}
      />

      <main className="container mx-auto px-4 py-8">
        
        {/* Hero / Header Section */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-4 pb-2">
            {activeView === 'FAVORITES' ? 'My Favorites' : 'HMATC Insider Daily'}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            {activeView === 'FAVORITES' 
              ? 'Your curated collection of high-value insights.'
              : 'AI-curated insights on Smart Cabin, Autonomous Driving, and latest AI News.'}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border ${
                activeTab === tab.id
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        {loading && news.length === 0 && activeView === 'FEED' ? (
          // Loading Skeletons
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-gray-900/50 border border-gray-800 h-80 rounded-xl p-5 animate-pulse flex flex-col gap-4">
                 <div className="h-4 w-20 bg-gray-800 rounded"></div>
                 <div className="h-6 w-3/4 bg-gray-800 rounded"></div>
                 <div className="flex-1 bg-gray-800/50 rounded"></div>
                 <div className="h-12 w-full bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((item) => (
              <NewsCard 
                key={item.id} 
                item={item} 
                currentUser={currentUser} 
                onLoginRequest={() => setIsAuthOpen(true)}
                isFavorited={favorites.some(f => f.id === item.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredNews.length === 0 && (
          <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed">
            {activeView === 'FAVORITES' ? (
                <>
                    <Star size={48} className="mx-auto text-gray-700 mb-4" />
                    <p className="text-gray-500 text-xl">You haven't bookmarked any news yet.</p>
                    <button 
                        onClick={() => setActiveView('FEED')}
                        className="mt-4 text-blue-400 hover:text-blue-300 underline"
                    >
                        Browse Feed
                    </button>
                </>
            ) : (
                <>
                    <p className="text-gray-500 text-xl">No insights found. Try refreshing the feed.</p>
                    <button 
                        onClick={fetchData}
                        className="mt-4 text-blue-400 hover:text-blue-300 underline"
                    >
                        Refresh Data
                    </button>
                </>
            )}
          </div>
        )}
      </main>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLoginSuccess={handleLoginSuccess} 
      />
      
      <footer className="border-t border-gray-900 py-8 mt-12 text-center text-gray-600 text-sm">
        <p>© {new Date().getFullYear()} HMATC Insider Daily. Powered by Gemini 2.5.</p>
        <p className="mt-2 text-xs">Content aggregated from public sources for informational purposes.</p>
      </footer>
    </div>
  );
};

export default App;
