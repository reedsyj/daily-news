import React, { useState, useEffect } from 'react';
import { Comment, User } from '../types';
import { mockDb } from '../services/mockBackend';
import { MessageCircle, Send, Reply, Trash2 } from 'lucide-react';

interface CommentsProps {
  newsId: string;
  currentUser: User | null;
  onLoginRequest: () => void;
  onCommentChange?: () => void;
}

const Comments: React.FC<CommentsProps> = ({ newsId, currentUser, onLoginRequest, onCommentChange }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, username: string } | null>(null);

  useEffect(() => {
    setComments(mockDb.getComments(newsId));
  }, [newsId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLoginRequest();
      return;
    }
    if (!newComment.trim()) return;

    let finalContent = newComment;
    
    // Note: Mentions like @username or @employeeID are parsed by backend automatically

    const added = mockDb.addComment({
      newsId,
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      content: finalContent,
      parentId: replyTo?.id
    });

    setComments(prev => [added, ...prev]);
    setNewComment('');
    setReplyTo(null);
    if (onCommentChange) onCommentChange();
  };

  const handleReply = (comment: Comment) => {
     setReplyTo({ id: comment.id, username: comment.username });
     setNewComment(`@${comment.username} `);
  };

  const handleDelete = (commentId: string) => {
    if (!currentUser) return;
    if (window.confirm("Are you sure you want to delete this comment?")) {
        const success = mockDb.deleteComment(commentId, currentUser.id);
        if (success) {
            setComments(prev => prev.filter(c => c.id !== commentId));
            if (onCommentChange) onCommentChange();
        }
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-800 relative">
      <h4 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
        <MessageCircle size={16} />
        评论 ({comments.length})
      </h4>

      {!currentUser ? (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-900/30 rounded-lg border border-gray-800 border-dashed animate-in fade-in duration-300">
           <p className="text-gray-400 text-sm mb-3">登录后查看评论和参与讨论</p>
           <button 
             onClick={onLoginRequest}
             className="text-blue-400 hover:text-blue-300 text-sm font-bold hover:underline transition-colors"
           >
             登录 / 注册
           </button>
        </div>
      ) : (
        <>
          {/* Input Area */}
          <form onSubmit={handleSubmit} className="mb-6 relative">
            {replyTo && (
               <div className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                 <Reply size={12}/> Replying to @{replyTo.username}
                 <button type="button" onClick={() => setReplyTo(null)} className="hover:text-red-400 ml-2">Cancel</button>
               </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="参与讨论或 @用户名 / @工号..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-600"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newComment.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </form>

          {/* List */}
          <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {comments.length === 0 ? (
               <p className="text-center text-gray-600 text-xs py-2">暂无评论，快来抢沙发！</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className={`flex gap-3 text-sm ${comment.parentId ? 'ml-8 pl-3 border-l-2 border-gray-800' : ''} group`}>
                  <img src={comment.userAvatar} alt={comment.username} className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                       <span className="font-bold text-gray-300">{comment.username}</span>
                       <span className="text-xs text-gray-600">{new Date(comment.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-400 mt-1 whitespace-pre-wrap">{comment.content}</p>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <button 
                        onClick={() => handleReply(comment)}
                        className="text-xs text-gray-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                      >
                        <Reply size={12} /> 回复
                      </button>

                      {/* Delete Button for Owner */}
                      {currentUser && currentUser.id === comment.userId && (
                        <button 
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-gray-600 hover:text-red-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
                          title="删除评论"
                        >
                          <Trash2 size={12} /> 删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Comments;