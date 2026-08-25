import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Settings,
  Flame,
  Gift,
  Ticket,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface Voucher {
  id: string;
  title: string;
  merchant_name: string;
  discount_text: string;
  status: 'valid' | 'used' | 'expired';
  expires_in: string;
}

interface ProfileData {
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  staked_count: number;
  claims_count: number;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileData = async () => {
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // 2. Fetch Vouchers
      const { data: voucherData } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (voucherData) {
        setVouchers(voucherData);
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
      }
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Settings size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <Image
          source={{
            uri:
              profile?.avatar_url ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
          }}
          style={styles.avatar}
        />
        <Text style={styles.displayName}>{profile?.display_name || 'Rohan Sharma'}</Text>
        <Text style={styles.username}>@{profile?.username || 'rohan_s'}</Text>
        <Text style={styles.bio}>
          {profile?.bio || 'Foodie & Deal Hunter in Bandra 🍕 | Top 5% Predictor'}
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconBadgeOrange}>
              <Flame size={16} color="#f59e0b" />
            </View>
            <Text style={styles.statNumber}>{profile?.staked_count || 0}</Text>
            <Text style={styles.statLabel}>Predictions</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <View style={styles.statIconBadgeGreen}>
              <Gift size={16} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>{profile?.claims_count || 0}</Text>
            <Text style={styles.statLabel}>Drops Claimed</Text>
          </View>
        </View>
      </View>

      {/* Claimed Vouchers Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ticket size={18} color="#38bdf8" />
          <Text style={styles.sectionTitle}>My Vouchers</Text>
        </View>
        <Text style={styles.voucherCountBadge}>{vouchers.length} Active</Text>
      </View>

      <View style={styles.voucherList}>
        {vouchers.map((item) => (
          <View key={item.id} style={styles.voucherCard}>
            <View style={styles.voucherLeft}>
              <Text style={styles.voucherTitle}>{item.title}</Text>
              <Text style={styles.voucherMerchant}>{item.merchant_name}</Text>
              <Text
                style={[
                  styles.voucherExpiry,
                  item.status === 'used' && styles.voucherUsed,
                ]}
              >
                {item.expires_in}
              </Text>
            </View>

            <View style={styles.voucherRight}>
              <Text style={styles.discountTag}>{item.discount_text}</Text>
              <TouchableOpacity style={styles.useButton}>
                <Text style={styles.useButtonText}>
                  {item.status === 'used' ? 'Used' : 'View'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Creator Channel Promotion Banner */}
      <TouchableOpacity style={styles.creatorBanner}>
        <View style={styles.bannerIcon}>
          <Sparkles size={20} color="#38bdf8" />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Become a Local Creator</Text>
          <Text style={styles.bannerSubtitle}>Post video drops & earn ₹ on predictions</Text>
        </View>
        <ChevronRight size={18} color="#64748b" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  settingsBtn: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  profileCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 28,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#38bdf8',
    marginBottom: 12,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  username: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
  },
  bio: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#020617',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#1e293b',
  },
  statIconBadgeOrange: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 6,
    borderRadius: 10,
    marginBottom: 4,
  },
  statIconBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 6,
    borderRadius: 10,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  voucherCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  voucherList: {
    gap: 12,
    marginBottom: 24,
  },
  voucherCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  voucherLeft: {
    flex: 1,
  },
  voucherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  voucherMerchant: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
  },
  voucherExpiry: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
  },
  voucherUsed: {
    color: '#64748b',
  },
  voucherRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  discountTag: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
  },
  useButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  useButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38bdf8',
  },
  creatorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  bannerIcon: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    padding: 10,
    borderRadius: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});