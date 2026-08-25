import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Creator {
  id: string;
  name: string;
  handle: string;
  avatar_url: string;
}

export interface Video {
  id: string;
  title: string;
  video_url: string;
  merchant_name?: string;
  cashback_amount?: number;
  creator_id?: string;
  creators?: Creator;
}

export async function fetchVideos(page = 1, limit = 5): Promise<Video[]> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('videos')
    .select(`
      id,
      title,
      video_url,
      merchant_name,
      cashback_amount,
      creator_id,
      creators (
        id,
        name,
        handle,
        avatar_url
      )
    `)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as Video[]) || [];
}