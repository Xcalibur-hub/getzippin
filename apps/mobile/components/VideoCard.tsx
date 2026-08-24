import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { supabase, Video as VideoType, Creator } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoCardProps {
  video: VideoType;
  isActive: boolean;
  onStakeKarma: (predictionId: string, option: string, amount: number) => void;
  onRevealDrop: () => void;
}

export default function VideoCard({ video, isActive, onStakeKarma, onRevealDrop }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(video.is_liked);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [showPrediction, setShowPrediction] = useState(false);
  const [showLootBox, setShowLootBox] = useState(false);
  const [stakeAmount, setStakeAmount] = useState(10);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [lootRevealed, setLootRevealed] = useState(false);
  const [lootAmount, setLootAmount] = useState(0);

  const likeScale = useSharedValue(1);
  const heartOpacity = useSharedValue(0);

  const creator = (video as any).creators as Creator | undefined;
  const campaign = video.campaign;

  // Auto play/pause based on active state
  useEffect(() => {
    setIsPlaying(isActive);
  }, [isActive]);

  // Double tap to like
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      handleLike();
      heartOpacity.value = withTiming(1, { duration: 300 });
      setTimeout(() => {
        heartOpacity.value = withTiming(0, { duration: 300 });
      }, 800);
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onStart(() => {
      setIsPlaying(!isPlaying);
    });

  const combinedGesture = Gesture.Exclusive(doubleTapGesture, singleTapGesture);

  const handleLike = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);
    setLikeCount(prev => newLikeState ? prev + 1 : prev - 1);
    
    try {
      await supabase.functions.invoke('toggle-like', {
        body: { video_id: video.id, is_liked: newLikeState }
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleTip = () => {
    if (!creator?.user_id) return;
    
    const upiLink = `upi://pay?pa=${creator.upi_id || 'creator@oksbi'}&pn=${creator.name}&am=10&cu=INR`;
    Linking.openURL(upiLink);
  };

  const handleStakeKarma = () => {
    if (selectedOption && campaign) {
      onStakeKarma(campaign.id, selectedOption, stakeAmount);
      setShowPrediction(false);
    }
  };

  const scratchLootBox = () => {
    setLootRevealed(true);
    const randomAmount = Math.floor(Math.random() * 100) + 10;
    setLootAmount(randomAmount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const heartScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const heartOverlayStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: interpolate(heartOpacity.value, [0, 1], [0.5, 1.5]) }],
  }));

  return (
    <View className="flex-1 bg-black">
      <GestureDetector gesture={combinedGesture}>
        <View className="flex-1">
          <Video
            source={{ uri: video.video_url }}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isPlaying}
            isLooping
            onTouchStart={() => {}}
          />

          {/* Heart animation overlay */}
          <Animated.View 
            style={heartOverlayStyle}
            className="absolute inset-0 items-center justify-center pointer-events-none"
          >
            <Animated.Text style={heartScaleStyle} className="text-8xl">❤️</Animated.Text>
          </Animated.View>

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            className="absolute bottom-0 left-0 right-0 h-1/2"
          />

          {/* Creator info overlay */}
          <View className="absolute bottom-24 left-4 right-20">
            <View className="flex-row items-center mb-3">
              <Image
                source={{ uri: creator?.avatar_url || 'https://via.placeholder.com/40' }}
                className="w-10 h-10 rounded-full mr-3"
              />
              <View className="flex-1">
                <Text className="text-white font-bold text-base">
                  {creator?.name || 'Unknown Creator'}
                </Text>
                {creator?.is_verified && (
                  <Text className="text-blue-400 text-xs">✓ Verified</Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => {}}
                className="bg-white px-4 py-2 rounded-full"
              >
                <Text className="font-semibold text-sm">Follow</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-white text-sm mb-2" numberOfLines={2}>
              {video.description}
            </Text>

            {/* Campaign/Drop info */}
            {campaign && (
              <View className="bg-yellow-500/90 p-3 rounded-lg mb-3">
                <Text className="text-black font-bold">🎁 {campaign.title}</Text>
                <Text className="text-black text-xs">
                  Get ₹{campaign.cashback_amount} on min. purchase of ₹{campaign.min_purchase}
                </Text>
                <TouchableOpacity 
                  onPress={onRevealDrop}
                  className="mt-2 bg-black py-2 px-4 rounded-full"
                >
                  <Text className="text-white font-semibold text-xs">Claim Drop</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Right side actions */}
          <View className="absolute bottom-24 right-4 items-center">
            {/* Like button */}
            <TouchableOpacity onPress={handleLike} className="items-center mb-4">
              <View className={`w-12 h-12 rounded-full ${isLiked ? 'bg-red-500' : 'bg-gray-800/80'} items-center justify-center`}>
                <Text className="text-2xl">{isLiked ? '❤️' : '🤍'}</Text>
              </View>
              <Text className="text-white text-xs mt-1">{likeCount}</Text>
            </TouchableOpacity>

            {/* Comment button */}
            <TouchableOpacity className="items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-gray-800/80 items-center justify-center">
                <Text className="text-2xl">💬</Text>
              </View>
              <Text className="text-white text-xs mt-1">{video.comment_count}</Text>
            </TouchableOpacity>

            {/* Share button */}
            <TouchableOpacity className="items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-gray-800/80 items-center justify-center">
                <Text className="text-2xl">↗️</Text>
              </View>
              <Text className="text-white text-xs mt-1">{video.share_count}</Text>
            </TouchableOpacity>

            {/* Tip button */}
            <TouchableOpacity onPress={handleTip} className="items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-green-600/80 items-center justify-center">
                <Text className="text-2xl">💰</Text>
              </View>
              <Text className="text-white text-xs mt-1">Tip</Text>
            </TouchableOpacity>

            {/* Loot box button */}
            <TouchableOpacity 
              onPress={() => setShowLootBox(true)}
              className="items-center mb-4"
            >
              <View className="w-12 h-12 rounded-full bg-purple-600/80 items-center justify-center">
                <Text className="text-2xl">🎁</Text>
              </View>
              <Text className="text-white text-xs mt-1">Loot</Text>
            </TouchableOpacity>

            {/* Prediction card button */}
            {campaign && (
              <TouchableOpacity 
                onPress={() => setShowPrediction(true)}
                className="items-center"
              >
                <View className="w-12 h-12 rounded-full bg-blue-600/80 items-center justify-center">
                  <Text className="text-2xl">🔮</Text>
                </View>
                <Text className="text-white text-xs mt-1">Predict</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Prediction Modal */}
          {showPrediction && campaign && (
            <View className="absolute inset-0 bg-black/80 items-center justify-center p-6">
              <View className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm">
                <Text className="text-white text-xl font-bold mb-4 text-center">
                  🔮 Predict & Win Karma
                </Text>
                <Text className="text-gray-400 text-sm mb-4 text-center">
                  {campaign.title}
                </Text>
                
                <View className="flex-row justify-around mb-4">
                  <TouchableOpacity
                    onPress={() => setSelectedOption('yes')}
                    className={`px-6 py-3 rounded-lg ${selectedOption === 'yes' ? 'bg-green-600' : 'bg-gray-700'}`}
                  >
                    <Text className="text-white font-semibold">Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedOption('no')}
                    className={`px-6 py-3 rounded-lg ${selectedOption === 'no' ? 'bg-red-600' : 'bg-gray-700'}`}
                  >
                    <Text className="text-white font-semibold">No</Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-gray-400 text-sm mb-2">Stake Amount: {stakeAmount} Karma</Text>
                <View className="flex-row items-center justify-between mb-4">
                  <TouchableOpacity
                    onPress={() => setStakeAmount(Math.max(10, stakeAmount - 10))}
                    className="bg-gray-700 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white text-xl">-</Text>
                  </TouchableOpacity>
                  <Text className="text-white text-2xl font-bold">{stakeAmount}</Text>
                  <TouchableOpacity
                    onPress={() => setStakeAmount(stakeAmount + 10)}
                    className="bg-gray-700 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white text-xl">+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleStakeKarma}
                  disabled={!selectedOption}
                  className={`py-3 rounded-lg ${selectedOption ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                  <Text className="text-white font-bold text-center">
                    Place Bet
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowPrediction(false)}
                  className="mt-3 py-2"
                >
                  <Text className="text-gray-400 text-center">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Loot Box Modal */}
          {showLootBox && (
            <View className="absolute inset-0 bg-black/80 items-center justify-center p-6">
              <View className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 items-center">
                {!lootRevealed ? (
                  <>
                    <Text className="text-white text-2xl font-bold mb-4">🎁 Mystery Box!</Text>
                    <Text className="text-white/80 text-sm mb-6 text-center">
                      Scratch to reveal your reward
                    </Text>
                    <TouchableOpacity
                      onPress={scratchLootBox}
                      className="bg-white px-8 py-4 rounded-full"
                    >
                      <Text className="text-purple-600 font-bold text-lg">Scratch Now!</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text className="text-white text-2xl font-bold mb-2">🎉 You Won!</Text>
                    <Text className="text-yellow-300 text-5xl font-bold mb-4">
                      ₹{lootAmount}
                    </Text>
                    <Text className="text-white/80 text-sm mb-6">
                      Added to your wallet
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowLootBox(false);
                        setLootRevealed(false);
                      }}
                      className="bg-white px-8 py-4 rounded-full"
                    >
                      <Text className="text-purple-600 font-bold text-lg">Awesome!</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      </GestureDetector>
    </View>
  );
}
