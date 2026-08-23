import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export default function WalletScreen() {
  const [karmaBalance, setKarmaBalance] = useState(100);
  const [cashBalance, setCashBalance] = useState(250);

  return (
    <ScrollView className="flex-1 bg-black">
      <View className="p-6">
        <Text className="text-white text-3xl font-bold mb-6">My Wallet</Text>

        {/* Karma Balance Card */}
        <View className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-4">
          <Text className="text-white/80 text-sm">Karma Points</Text>
          <Text className="text-white text-4xl font-bold mt-2">{karmaBalance}</Text>
          <View className="flex-row mt-4">
            <TouchableOpacity className="bg-white/20 px-4 py-2 rounded-full mr-2">
              <Text className="text-white text-sm font-semibold">Stake</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white text-sm font-semibold">History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cash Balance Card */}
        <View className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 mb-6">
          <Text className="text-white/80 text-sm">Cash Balance</Text>
          <Text className="text-white text-4xl font-bold mt-2">₹{cashBalance}</Text>
          <View className="flex-row mt-4">
            <TouchableOpacity className="bg-white/20 px-4 py-2 rounded-full mr-2">
              <Text className="text-white text-sm font-semibold">Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white text-sm font-semibold">Add Money</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <Text className="text-white text-xl font-bold mb-4">Recent Activity</Text>
        
        <View className="bg-gray-900 rounded-xl p-4 mb-3">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white font-semibold">Prediction Win</Text>
              <Text className="text-gray-400 text-xs">2 hours ago</Text>
            </View>
            <Text className="text-green-400 font-bold">+50 Karma</Text>
          </View>
        </View>

        <View className="bg-gray-900 rounded-xl p-4 mb-3">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white font-semibold">Drop Claim</Text>
              <Text className="text-gray-400 text-xs">5 hours ago</Text>
            </View>
            <Text className="text-green-400 font-bold">+₹40</Text>
          </View>
        </View>

        <View className="bg-gray-900 rounded-xl p-4 mb-3">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white font-semibold">Tip to Creator</Text>
              <Text className="text-gray-400 text-xs">Yesterday</Text>
            </View>
            <Text className="text-red-400 font-bold">-₹10</Text>
          </View>
        </View>

        <View className="bg-gray-900 rounded-xl p-4">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white font-semibold">Karma Stake</Text>
              <Text className="text-gray-400 text-xs">2 days ago</Text>
            </View>
            <Text className="text-orange-400 font-bold">-20 Karma</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
