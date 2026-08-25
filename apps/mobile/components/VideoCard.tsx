import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Sparkles, Gift, Flame } from 'lucide-react-native';
import { Video as VideoType } from '../lib/supabase';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoCardProps {
  video: VideoType;
  isActive: boolean;
  onStakeKarma?: (predictionId: string, option: string, amount: number) => void;
  onRevealDrop?: () => void;
}

export default function VideoCard({
  video,
  isActive,
  onStakeKarma,
  onRevealDrop,
}: VideoCardProps) {
  const player = useVideoPlayer(video.video_url, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (!player) return;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  const togglePlayback = () => {
    if (!player) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <Pressable style={StyleSheet.absoluteFill} onPress={togglePlayback}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </Pressable>

      {/* Dark Gradient Overlay for Readability */}
      <View style={styles.overlayBottom} pointerEvents="box-none">
        {/* Creator and Merchant Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.creatorName}>
            {video.creators?.name || 'Local Creator'}
          </Text>
          <Text style={styles.creatorHandle}>
            {video.creators?.handle || '@creator'}
          </Text>
          <Text style={styles.title}>{video.title}</Text>
          <Text style={styles.merchantBadge}>📍 {video.merchant_name || 'Verified Merchant'}</Text>
        </View>

        {/* Action Buttons Bar */}
        <View style={styles.actionRow}>
          {/* Claim Drop Button */}
          <TouchableOpacity
            style={styles.claimButton}
            onPress={onRevealDrop}
            activeOpacity={0.85}
          >
            <Gift size={18} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.claimButtonText}>
              Claim ₹{video.cashback_amount || 0} Drop
            </Text>
          </TouchableOpacity>

          {/* Stake Karma / Prediction Trigger */}
          <TouchableOpacity
            style={styles.stakeButton}
            onPress={() => onStakeKarma?.(video.id, 'yes', 10)}
            activeOpacity={0.85}
          >
            <Flame size={18} color="#f59e0b" style={styles.buttonIcon} />
            <Text style={styles.stakeButtonText}>Stake 10 Karma</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    position: 'relative',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'flex-end',
  },
  infoContainer: {
    marginBottom: 16,
  },
  creatorName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  creatorHandle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
  },
  title: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 20,
  },
  merchantBadge: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  claimButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 4,
  },
  claimButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  stakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 12,
  },
  stakeButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: 6,
  },
});