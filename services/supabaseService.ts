import { supabase } from './supabaseClient';
import { User, NewsItem } from '../types';

// Auth Services
export const authService = {
  async signUp(employeeId: string, password: string, username: string) {
    // Hack: Construct a fake email from employee ID
    const email = `${employeeId}@qq.com`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          employee_id: employeeId,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        }
      }
    });

    if (error) throw error;

    // Create profile entry manually
    // We add a small delay and check for session to ensure RLS passes
    if (data.user && data.session) {
      // Small delay to allow auth state to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            username,
            employee_id: employeeId,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
          }
        ]);
      
      if (profileError) {
        // If 401/403 (RLS error) or duplicate, just log it. 
        // The user is created in Auth, so login will still work.
        console.warn('Profile creation warning (non-fatal):', profileError);
      }
    }

    return data;
  },

  async signIn(employeeId: string, password: string) {
    // Hack: Reconstruct the fake email
    const email = `${employeeId}@qq.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Fetch profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      username: profile?.username || user.user_metadata?.username || 'User',
      employeeId: profile?.employee_id || user.user_metadata?.employee_id || '',
      avatar: profile?.avatar_url || user.user_metadata?.avatar || ''
    };
  }
};

// Database Services (Favorites)
export const dbService = {
  async getFavorites(userId: string): Promise<NewsItem[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }

    return data.map(item => ({
      id: item.news_id, // Map back to original news ID
      category: item.category,
      title: item.title,
      summary: item.summary,
      valueAnalysis: item.value_analysis || '',
      url: item.url,
      source: item.source,
      publishedAt: item.published_at,
      rating: item.rating || 0
    }));
  },

  async addFavorite(userId: string, item: NewsItem) {
    const { error } = await supabase
      .from('favorites')
      .insert([
        {
          user_id: userId,
          news_id: item.id,
          category: item.category,
          title: item.title,
          summary: item.summary,
          value_analysis: item.valueAnalysis,
          rating: item.rating,
          url: item.url,
          source: item.source,
          published_at: item.publishedAt
        }
      ]);

    if (error) throw error;
  },

  async removeFavorite(userId: string, newsId: string) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('news_id', newsId);

    if (error) throw error;
  }
};
