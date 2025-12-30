export type Category = 'COCKPIT' | 'DRIVING' | 'AI';

export interface NewsItem {
  id: string;
  category: Category;
  title: string;
  summary: string;
  valueAnalysis: string;
  rating?: number; // Added rating 1-5
  url: string;
  source: string;
  publishedAt: string;
}

export interface User {
  id: string;
  username: string;
  employeeId: string; // Added for login/mentions
  avatar: string;
}

export interface Comment {
  id: string;
  newsId: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  timestamp: number;
  parentId?: string; // For nested replies
  mentions?: string[]; // user IDs
}

export interface Notification {
  id: string;
  userId: string; // Recipient
  type: 'REPLY' | 'MENTION';
  fromUser: string;
  newsId: string; // Link to context
  read: boolean;
  timestamp: number;
}