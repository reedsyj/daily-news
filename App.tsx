import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import NewsCard from './components/NewsCard';
import AuthModal from './components/AuthModal';
import { fetchAnalysedNews } from './services/geminiService';
import { authService, dbService } from './services/supabaseService';
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
    (process.env.ADMIN_EMPLOYEE_ID && currentUser.employeeId === process.env.ADMIN_EMPLOYEE_ID)
  );

  // Helper to sync local favorites state
  const refreshFavorites = useCallback(async () => {
    if (currentUser) {
      const favs = await dbService.getFavorites(currentUser.id);
      setFavorites(favs);
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
    const checkUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };
    checkUser();
    
    // Initial fetch (Only if logged in)
    // fetchData(); // Moved to below
  }, [fetchData]);

  // Fetch data only when user is logged in
  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

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

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
  };

  const tabs: { id: 'ALL' | Category; label: string; icon: React.ReactNode }[] = [
    { id: 'ALL', label: 'All Feeds', icon: null },
    { id: 'COCKPIT', label: 'Smart Cabin', icon: <Cpu size={16} /> },
    { id: 'DRIVING', label: 'Autonomous Driving', icon: <Radio size={16} /> },
    { id: 'AI', label: 'AI News', icon: <Zap size={16} /> },
  ];

  const handleToggleFavorite = async (item: NewsItem) => {
    if (!currentUser) return;
    
    const isFav = favorites.some(f => f.id === item.id);
    if (isFav) {
      await dbService.removeFavorite(currentUser.id, item.id);
    } else {
      await dbService.addFavorite(currentUser.id, item);
    }
    
    refreshFavorites();
  };

  const handleRefresh = async () => {
    if (!isAdmin || !currentUser) return;
    
    if (!confirm("Confirm to refresh news manually? This will trigger 3 separate updates to avoid timeouts.")) return;

    setLoading(true);
    try {
      // Parallelize 3 separate requests, one for each category
      // This avoids the single Vercel function timeout (10s)
      const categories = ['COCKPIT', 'DRIVING', 'AI'];
      const requests = categories.map(cat => 
        fetch(`/api/update-news?category=${cat}`, {
          method: 'POST',
          headers: {
            'X-Employee-ID': currentUser.employeeId
          }
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Failed to update ${cat}: ${err.error || res.statusText}`);
          }
          return res.json();
        })
      );

      const results = await Promise.allSettled(requests);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      alert(`Update Completed! Success: ${successCount}, Failed: ${failCount}. Reloading data...`);
      fetchData(); // Reload data after update
    } catch (error: any) {
      alert(`Critical Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Decide which list to render
  const sourceList = activeView === 'FAVORITES' ? favorites : news;

  const filteredNews = activeTab === 'ALL' 
    ? sourceList 
    : sourceList.filter(item => item.category === activeTab);

  // If not logged in, show Auth Screen directly
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        {/* We can reuse AuthModal's internal form or just use AuthModal forced open */}
        {/* However, AuthModal is designed as a modal. Let's create a dedicated login view or adapt AuthModal. */}
        {/* For simplicity and consistency, we render a background and the AuthModal without the close button/overlay behavior if we could, 
            but since AuthModal is a modal, let's just render it and maybe hide the close button via CSS or prop if needed.
            Actually, let's just render the AuthModal content directly or use the Modal in a way that it can't be closed.
        */}
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-4">
                    HMATC Insider Daily
                </h1>
                <p className="text-gray-400">Please log in to access the latest automotive intelligence.</p>
            </div>
            {/* We use the AuthModal component but we need to make sure it's visible. 
                Since AuthModal has a fixed overlay, we can just render it. 
                But better to modify AuthModal to be 'inline' or just render it 'always open' on top of this.
            */}
            <AuthModal 
                isOpen={true} 
                onClose={() => {}} // No-op, can't close
                onLoginSuccess={handleLoginSuccess}
                isStandalone={true} // New prop to hide close button and overlay styles if needed
            />
        </div>
      </div>
    );
  }

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
