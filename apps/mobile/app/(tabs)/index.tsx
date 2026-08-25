import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  ViewToken,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import VideoCard from '../../components/VideoCard';
import ClaimModal from '../../components/ClaimModal';
import StakeModal from '../../components/StakeModal';
import { fetchVideos, Video as VideoType } from '../../lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoFeedScreen() {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  // Modal States
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
  const [claimVisible, setClaimVisible] = useState(false);
  const [stakeVisible, setStakeVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const loadVideos = async (pageNum: number, isRefresh: boolean = false) => {
    try {
      const newVideos = await fetchVideos(pageNum, 5);
      if (isRefresh) {
        setVideos(newVideos);
      } else {
        setVideos((prev) => [...prev, ...newVideos]);
      }
      setHasMore(newVideos.length > 0);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVideos(1, true);
    }, [])
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const handleOpenClaim = (video: VideoType) => {
    setSelectedVideo(video);
    setClaimVisible(true);
  };

  const handleOpenStake = (video: VideoType) => {
    setSelectedVideo(video);
    setStakeVisible(true);
  };

  const renderItem = ({ item, index }: { item: VideoType; index: number }) => {
    if (!item) return null;
    return (
      <View style={{ height: SCREEN_HEIGHT }}>
        <VideoCard
          video={item}
          isActive={index === activeIndex}
          onRevealDrop={() => handleOpenClaim(item)}
          onStakeKarma={() => handleOpenStake(item)}
        />
      </View>
    );
  };

  if (loading && videos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        onRefresh={() => {
          setRefreshing(true);
          loadVideos(1, true);
        }}
        refreshing={refreshing}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />

      <ClaimModal
        visible={claimVisible}
        video={selectedVideo}
        onClose={() => setClaimVisible(false)}
      />

      <StakeModal
        visible={stakeVisible}
        videoId={selectedVideo?.id || null}
        onClose={() => setStakeVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});