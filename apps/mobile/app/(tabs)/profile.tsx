import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';

export default function ProfileScreen() {
  return (
    <ScrollView className="flex-1 bg-black">
      <View className="p-6 items-center">
        {/* Profile Header */}
        <Image
          source={{ uri: 'https://via.placeholder.com/120' }}
          className="w-24 h-24 rounded-full mb-4"
        />
        <Text className="text-white text-2xl font-bold">John Doe</Text>
        <Text className="text-gray-400 text-sm">john@example.com</Text>
        
        {/* Stats */}
        <View className="flex-row justify-around w-full mt-6">
          <View className="items-center">
            <Text className="text-white text-xl font-bold">156</Text>
            <Text className="text-gray-400 text-xs">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-white text-xl font-bold">42</Text>
            <Text className="text-gray-400 text-xs">Following</Text>
          </View>
          <View className="items-center">
            <Text className="text-white text-xl font-bold">1,250</Text>
            <Text className="text-gray-400 text-xs">Karma</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="w-full mt-8">
          <TouchableOpacity className="bg-gray-900 p-4 rounded-xl mb-2 flex-row justify-between items-center">
            <Text className="text-white font-semibold">Edit Profile</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-900 p-4 rounded-xl mb-2 flex-row justify-between items-center">
            <Text className="text-white font-semibold">KYC Status</Text>
            <View className="flex-row items-center">
              <Text className="text-yellow-400 mr-2">Pending</Text>
              <Text className="text-gray-400">›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-900 p-4 rounded-xl mb-2 flex-row justify-between items-center">
            <Text className="text-white font-semibold">UPI ID</Text>
            <View className="flex-row items-center">
              <Text className="text-gray-400 mr-2">john@oksbi</Text>
              <Text className="text-gray-400">›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-900 p-4 rounded-xl mb-2 flex-row justify-between items-center">
            <Text className="text-white font-semibold">Neighborhood</Text>
            <View className="flex-row items-center">
              <Text className="text-gray-400 mr-2">Koramangala</Text>
              <Text className="text-gray-400">›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-900 p-4 rounded-xl mb-2 flex-row justify-between items-center">
            <Text className="text-white font-semibold">Leaderboard Rank</Text>
            <View className="flex-row items-center">
              <Text className="text-green-400 mr-2">#42</Text>
              <Text className="text-gray-400">›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-900 p-4 rounded-xl mb-2 flex-row justify-between items-center">
            <Text className="text-white font-semibold">Badges</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-900 p-4 rounded-xl mb-2 flex-row justify-between items-center">
            <Text className="text-white font-semibold">Settings</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-red-900/30 p-4 rounded-xl mt-4 flex-row justify-between items-center border border-red-900/50">
            <Text className="text-red-400 font-semibold">Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
