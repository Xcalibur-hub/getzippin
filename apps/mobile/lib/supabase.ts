import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Video {
  id: string;
  creator_id: string;
  video_url: string;
  thumbnail_url: string;
  title: string;
  description: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  is_liked: boolean;
  drop_id?: string;
  campaign?: {
    id: string;
    title: string;
    cashback_amount: number;
    min_purchase: number;
  };
}

export interface Creator {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string;
  bio: string;
  follower_count: number;
  is_verified: boolean;
}

export async function fetchVideos(page: number = 1, limit: number = 10): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select(`
      *,
      creators (
        id,
        user_id,
        name,
        avatar_url,
        bio,
        follower_count,
        is_verified
      ),
      campaigns (
        id,
        title,
        cashback_amount,
        min_purchase
      )
    `)
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function toggleLike(videoId: string, isLiked: boolean): Promise<void> {
  const { error } = await supabase
    .from('video_likes')
    .upsert({ video_id: videoId, is_liked: isLiked });
  
  if (error) throw error;
}

export async function stakeKarma(predictionId: string, option: string, amount: number): Promise<void> {
  // This would call the place-karma-bet edge function
  const { error } = await supabase.functions.invoke('place-karma-bet', {
    body: { prediction_id: predictionId, option, amount }
  });
  
  if (error) throw error;
}

export async function sendTip(creatorId: string, amount: number, upiId: string): Promise<void> {
  const upiLink = `upi://pay?pa=${upiId}&pn=Creator&am=${amount}&cu=INR`;
  // In a real app, you'd use Linking.openURL(upiLink)
  console.log('Opening UPI link:', upiLink);
}
