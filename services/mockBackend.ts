import { User, Comment, Notification, NewsItem } from '../types';

const STORAGE_KEYS = {
  USERS: 'hmatc_users_v2',
  CURRENT_USER: 'hmatc_current_user_v2',
  COMMENTS: 'hmatc_comments',
  NOTIFICATIONS: 'hmatc_notifications',
  FAVORITES: 'hmatc_favorites', // New key for favorites
};

// Internal type for storage including password
interface StoredUser extends User {
  password?: string;
}

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockAuth = {
  // Register with Employee ID, Username, Password
  register: async (employeeId: string, username: string, password: string): Promise<User> => {
    await delay(600);
    const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
    const users: StoredUser[] = usersRaw ? JSON.parse(usersRaw) : [];

    // Check duplicates
    if (users.find(u => u.employeeId === employeeId)) {
        throw new Error("Employee ID already registered");
    }
    if (users.find(u => u.username === username)) {
        throw new Error("Username already taken");
    }

    const newUser: StoredUser = {
      id: `user_${Date.now()}`,
      username,
      employeeId,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      password // Storing in localstorage for mock demo
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Auto login after register
    const { password: _, ...safeUser } = newUser;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser));
    return safeUser;
  },

  // Login with Username OR Employee ID + Password
  login: async (identifier: string, password: string): Promise<User> => {
    await delay(600);
    const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
    const users: StoredUser[] = usersRaw ? JSON.parse(usersRaw) : [];
    
    const user = users.find(u => 
      (u.username === identifier || u.employeeId === identifier) && u.password === password
    );

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const { password: _, ...safeUser } = user;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser));
    return safeUser;
  },

  logout: async () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  },
  
  getAllUsers: (): User[] => {
      const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!usersRaw) return [];
      const users: StoredUser[] = JSON.parse(usersRaw);
      // Return without passwords
      return users.map(({ password, ...u }) => u);
  }
};

export const mockDb = {
  getComments: (newsId: string): Comment[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const allComments: Comment[] = raw ? JSON.parse(raw) : [];
    return allComments.filter(c => c.newsId === newsId).sort((a, b) => b.timestamp - a.timestamp);
  },

  addComment: (comment: Omit<Comment, 'id' | 'timestamp'>): Comment => {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const allComments: Comment[] = raw ? JSON.parse(raw) : [];
    
    const newComment: Comment = {
      ...comment,
      id: `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    allComments.push(newComment);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(allComments));

    // Handle Notifications
    mockDb.processNotifications(newComment);

    return newComment;
  },

  deleteComment: (commentId: string, userId: string): boolean => {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const allComments: Comment[] = raw ? JSON.parse(raw) : [];
    
    const commentIndex = allComments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return false;

    // Only allow deletion if owner matches
    if (allComments[commentIndex].userId !== userId) return false;

    allComments.splice(commentIndex, 1);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(allComments));
    return true;
  },

  processNotifications: (comment: Comment) => {
    const notifications: Notification[] = mockDb.getNotificationsRaw();
    const currentUser = mockAuth.getCurrentUser();
    if (!currentUser) return;

    // 1. Check for Mentions (@username OR @employeeId)
    const mentionRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g; // Matches alphanum + chinese
    let match;
    const mentionedUsers = new Set<string>();
    
    while ((match = mentionRegex.exec(comment.content)) !== null) {
        const token = match[1]; // The text after @
        const allUsers = mockAuth.getAllUsers();
        
        // Find user by Username OR Employee ID
        const targetUser = allUsers.find(u => u.username === token || u.employeeId === token);
        
        if (targetUser && targetUser.id !== currentUser.id) {
            mentionedUsers.add(targetUser.id);
            notifications.push({
                id: `notif_${Date.now()}_m_${Math.random()}`,
                userId: targetUser.id,
                type: 'MENTION',
                fromUser: currentUser.username, // Display name in notif
                newsId: comment.newsId,
                read: false,
                timestamp: Date.now()
            });
        }
    }

    // 2. Check for Reply
    if (comment.parentId) {
        const rawComments = localStorage.getItem(STORAGE_KEYS.COMMENTS);
        const allComments: Comment[] = rawComments ? JSON.parse(rawComments) : [];
        const parentComment = allComments.find(c => c.id === comment.parentId);
        
        if (parentComment && parentComment.userId !== currentUser.id && !mentionedUsers.has(parentComment.userId)) {
             notifications.push({
                id: `notif_${Date.now()}_r_${Math.random()}`,
                userId: parentComment.userId,
                type: 'REPLY',
                fromUser: currentUser.username,
                newsId: comment.newsId,
                read: false,
                timestamp: Date.now()
            });
        }
    }

    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },

  getNotificationsRaw: (): Notification[] => {
     const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
     return raw ? JSON.parse(raw) : [];
  },

  getUserNotifications: (userId: string): Notification[] => {
    return mockDb.getNotificationsRaw().filter(n => n.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  },

  markNotificationRead: (notifId: string) => {
      const notifs = mockDb.getNotificationsRaw();
      const updated = notifs.map(n => n.id === notifId ? { ...n, read: true } : n);
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  },

  // --- Favorites Logic ---
  
  getUserFavorites: (userId: string): NewsItem[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    const db = raw ? JSON.parse(raw) : {};
    return db[userId] || [];
  },

  toggleFavorite: (userId: string, item: NewsItem): boolean => {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    const db = raw ? JSON.parse(raw) : {};
    let userFavs: NewsItem[] = db[userId] || [];
    
    const existsIndex = userFavs.findIndex(f => f.id === item.id);
    let isAdded = false;
    
    if (existsIndex >= 0) {
      // Remove
      userFavs.splice(existsIndex, 1);
      isAdded = false;
    } else {
      // Add
      userFavs.push(item);
      isAdded = true;
    }
    
    db[userId] = userFavs;
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(db));
    return isAdded;
  },

  isFavorited: (userId: string, newsId: string): boolean => {
     const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
     const db = raw ? JSON.parse(raw) : {};
     const userFavs: NewsItem[] = db[userId] || [];
     return userFavs.some(f => f.id === newsId);
  }
};