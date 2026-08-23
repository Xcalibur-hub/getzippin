import React, { useState, useRef, useCallback } from 'react';
import { View, FlatList, Dimensions, ActivityIndicator, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import VideoCard from '../components/VideoCard';
import { fetchVideos, Video as VideoType } from '../lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoFeedScreen() {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const scrollOffset = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  // Load initial videos
  const loadVideos = async (pageNum: number, isRefresh: boolean = false) => {
    try {
      const newVideos = await fetchVideos(pageNum, 5);
      
      if (isRefresh) {
        setVideos(newVideos);
      } else {
        setVideos(prev => [...prev, ...newVideos]);
      }
      
      setHasMore(newVideos.length > 0);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading videos:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVideos(1, true);
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadVideos(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadVideos(nextPage);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const getActiveIndex = () => {
    return Math.round(scrollOffset.value / SCREEN_HEIGHT);
  };

  const handleStakeKarma = async (predictionId: string, option: string, amount: number) => {
    try {
      const { data, error } = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/place-karma-bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ prediction_id: predictionId, option, amount }),
      });

      if (error) throw error;
      
      console.log('Karma staked successfully!');
    } catch (error) {
      console.error('Error staking karma:', error);
    }
  };

  const handleRevealDrop = async () => {
    console.log('Reveal drop clicked');
  };

  const renderItem = ({ index }: { index: number }) => {
    const video = videos[index];
    if (!video) return null;

    const isActive = index === getActiveIndex();

    return (
      <View style={{ height: SCREEN_HEIGHT }}>
        <VideoCard
          video={video}
          isActive={isActive}
          onStakeKarma={handleStakeKarma}
          onRevealDrop={handleRevealDrop}
        />
      </View>
    );
  };

  if (loading && videos.length === 0) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4">Loading videos...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <Animated.FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        ListFooterComponent={() => {
          if (loading && !refreshing) {
            return (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#fff" />
              </View>
            );
          }
          return null;
        }}
      />
    </View>
  );
}
