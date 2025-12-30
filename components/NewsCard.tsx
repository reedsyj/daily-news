import React, { useState, useEffect } from 'react';
import { NewsItem, User } from '../types';
import { ExternalLink, ChevronDown, ChevronUp, Zap, Radio, Cpu, Star, MessageCircle, Bookmark } from 'lucide-react';
import Comments from './Comments';
import { mockDb } from '../services/mockBackend';

interface NewsCardProps {
  item: NewsItem;
  currentUser: User | null;
  onLoginRequest: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: (item: NewsItem) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, currentUser, onLoginRequest, isFavorited, onToggleFavorite }) => {
  const [expanded, setExpanded] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    // Initial fetch of comment count
    const comments = mockDb.getComments(item.id);
    setCommentCount(comments.length);
  }, [item.id]);

  const handleCommentChange = () => {
    const comments = mockDb.getComments(item.id);
    setCommentCount(comments.length);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      onLoginRequest();
      return;
    }
    if (onToggleFavorite) {
      onToggleFavorite(item);
    }
  };

  const getIcon = () => {
    switch(item.category) {
      case 'AI': return <Zap className="text-yellow-400" size={18} />;
      case 'DRIVING': return <Radio className="text-green-400" size={18} />;
      case 'COCKPIT': return <Cpu className="text-purple-400" size={18} />;
    }
  };

  const getCategoryLabel = () => {
      switch(item.category) {
      case 'AI': return 'AI News';
      case 'DRIVING': return 'Smart Driving';
      case 'COCKPIT': return 'Smart Cabin';
    }
  }

  // Truncate source to max 10 chars + ...
  const displaySource = item.source.length > 10 
    ? item.source.substring(0, 10) + '...' 
    : item.source;

  // Render stars based on rating
  const renderStars = (rating: number = 0) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={12} 
            className={`${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-700'}`} 
          />
        ))}
      </div>
    );
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    
    // Determine if the string is simple "YYYY-MM-DD" or ISO string
    // Simple format needs local parsing to avoid UTC shifting
    const isSimpleDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    
    let date: Date;
    if (isSimpleDate) {
        const parts = dateStr.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        date = new Date(year, month, day); // Local midnight
    } else {
        date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) return dateStr;

    const now = new Date();
    
    // Check if same calendar day
    const isSameDay = now.getFullYear() === date.getFullYear() &&
                      now.getMonth() === date.getMonth() &&
                      now.getDate() === date.getDate();

    if (isSameDay) {
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 60) {
            // Ensure at least 1 min if extremely recent
            return `${Math.max(1, diffMins)}分钟前`;
        }
        
        const diffHours = Math.floor(diffMs / 3600000);
        return `${diffHours}小时前`;
    }

    // Check yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.getFullYear() === date.getFullYear() &&
                        yesterday.getMonth() === date.getMonth() &&
                        yesterday.getDate() === date.getDate();

    if (isYesterday) {
        return '昨天';
    }
    
    // Default: MM-DD
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-300 flex flex-col h-full group relative">
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-gray-500">
             {getIcon()}
             <span>{getCategoryLabel()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500" title="Published Date">
               {formatTime(item.publishedAt)}
            </span>
            <span className="text-gray-600">|</span>
            <span 
              className="text-xs text-gray-600 bg-gray-900 px-2 py-1 rounded"
              title={item.source} // Show full source on hover
            >
              {displaySource}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-100 mb-3 leading-snug group-hover:text-blue-400 transition-colors">
          {item.title}
        </h3>

        <p className="text-gray-400 text-sm mb-4 line-clamp-3">
          {item.summary}
        </p>
        
        {/* Value Analysis Block */}
        <div className="bg-gray-950/50 rounded-lg p-3 border border-gray-800/50 mb-4 mt-auto">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-blue-400">Value Analysis:</p>
            {renderStars(item.rating)}
          </div>
          <p className="text-xs text-gray-500 italic">{item.valueAnalysis}</p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
           <a 
             href={item.url} 
             target="_blank" 
             rel="noreferrer"
             className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400 hover:underline font-medium"
           >
             Read Source <ExternalLink size={14} />
           </a>
           
           <div className="flex items-center gap-4">
               <button 
                 onClick={handleFavoriteClick}
                 className={`flex items-center gap-1 text-xs transition-colors ${isFavorited ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                 title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
               >
                  <Bookmark size={16} fill={isFavorited ? "currentColor" : "none"} />
                  {/* <span className="hidden sm:inline">收藏</span> */}
               </button>

               <button 
                 onClick={() => setExpanded(!expanded)}
                 className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
               >
                 <MessageCircle size={16} />
                 评论 ({commentCount})
                 {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
               </button>
           </div>
        </div>
      </div>

      {expanded && (
        <div className="bg-gray-950 p-5 border-t border-gray-800 animate-in slide-in-from-top-2 duration-200">
           <Comments 
             newsId={item.id} 
             currentUser={currentUser} 
             onLoginRequest={onLoginRequest} 
             onCommentChange={handleCommentChange}
           />
        </div>
      )}
    </div>
  );
};

export default NewsCard;