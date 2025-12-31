import React, { useState, useEffect } from 'react';
import { User, Notification } from '../types';
import { mockAuth, mockDb } from '../services/mockBackend';
import { Bell, RefreshCw, User as UserIcon, LogOut, MessageSquare, Star, LayoutGrid } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  activeView: 'FEED' | 'FAVORITES';
  onViewChange: (view: 'FEED' | 'FAVORITES') => void;
  canRefresh?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  currentUser, 
  onLoginClick, 
  onLogout, 
  onRefresh, 
  isRefreshing,
  lastUpdated,
  activeView,
  onViewChange,
  canRefresh = false
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const fetchNotifs = () => {
        const notifs = mockDb.getUserNotifications(currentUser.id);
        setNotifications(notifs);
      };
      
      fetchNotifs();
      // Poll for notifications every 10 seconds (simulated socket)
      const interval = setInterval(fetchNotifs, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    mockDb.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange('FEED')}>
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
             <span className="font-bold text-white text-lg">H</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 hidden sm:block">
            HMATC Insider Daily
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-xs text-gray-500 hidden lg:block">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </div>

          <button 
            onClick={onRefresh}
            disabled={!canRefresh || isRefreshing}
            className={`p-2 rounded-full transition-colors ${canRefresh ? 'hover:bg-gray-800' : ''} ${isRefreshing ? 'animate-spin text-blue-400' : canRefresh ? 'text-gray-400' : 'text-gray-700 cursor-not-allowed'}`}
            title={canRefresh ? "Refresh Content" : "Refresh restricted"}
          >
            <RefreshCw size={20} />
          </button>

          {currentUser ? (
            <>
               {/* View Switcher: Feed vs Favorites */}
               <div className="flex items-center bg-gray-900 rounded-full p-1 border border-gray-800">
                  <button
                    onClick={() => onViewChange('FEED')}
                    className={`p-1.5 rounded-full transition-all ${activeView === 'FEED' ? 'bg-gray-800 text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    title="News Feed"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    onClick={() => onViewChange('FAVORITES')}
                    className={`p-1.5 rounded-full transition-all ${activeView === 'FAVORITES' ? 'bg-gray-800 text-yellow-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    title="My Favorites"
                  >
                    <Star size={18} fill={activeView === 'FAVORITES' ? "currentColor" : "none"} />
                  </button>
               </div>

              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors relative"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-950"></span>
                  )}
                </button>

                {/* Dropdown */}
                {showNotifDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-800 font-semibold text-sm text-gray-300">
                      Notifications
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => handleMarkRead(n.id)}
                            className={`p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${!n.read ? 'bg-gray-800/50' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                <MessageSquare size={14} className="text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-300">
                                  <span className="font-bold text-white">{n.fromUser}</span>
                                  {n.type === 'MENTION' ? ' mentioned you.' : ' replied to you.'}
                                </p>
                                <span className="text-xs text-gray-500">{new Date(n.timestamp).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-2 border-l border-gray-800">
                <img src={currentUser.avatar} alt={currentUser.username} className="w-8 h-8 rounded-full bg-gray-800" />
                <span className="text-sm font-medium text-gray-200 hidden sm:block">{currentUser.username}</span>
                <button onClick={onLogout} className="text-gray-400 hover:text-red-400 ml-1" title="Logout">
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={onLoginClick}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <UserIcon size={16} />
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
