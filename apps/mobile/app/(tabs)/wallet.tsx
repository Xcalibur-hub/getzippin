import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { 
  Flame, 
  IndianRupee, 
  ArrowUpRight, 
  Plus, 
  History, 
  ShieldCheck 
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface Transaction {
  id: string;
  title: string;
  amount_text: string;
  is_credit: boolean;
  time_label: string;
}

export default function WalletScreen() {
  const [karma, setKarma] = useState<number>(0);
  const [cash, setCash] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletData = async () => {
    try {
      // 1. Fetch balances
      const { data: walletData } = await supabase
        .from('wallets')
        .select('karma_balance, cash_balance')
        .limit(1)
        .single();

      if (walletData) {
        setKarma(walletData.karma_balance);
        setCash(walletData.cash_balance);
      }

      // 2. Fetch transaction logs
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txData) {
        setTransactions(txData);
      }
    } catch (err) {
      console.error('Error fetching wallet details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
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
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={styles.verifiedBadge}>
          <ShieldCheck size={14} color="#10b981" />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      </View>

      {/* Karma Points Card */}
      <View style={styles.karmaCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircleOrange}>
            <Flame size={20} color="#f59e0b" />
          </View>
          <Text style={styles.cardLabel}>Karma Points</Text>
        </View>
        <Text style={styles.karmaValue}>{karma}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtnSmallOrange}>
            <Text style={styles.actionBtnTextOrange}>Stake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSmallOutline}>
            <Text style={styles.actionBtnTextOutline}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cash Balance Card */}
      <View style={styles.cashCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircleGreen}>
            <IndianRupee size={20} color="#10b981" />
          </View>
          <Text style={styles.cardLabel}>Cash Balance</Text>
        </View>
        <Text style={styles.cashValue}>₹{cash.toFixed(2)}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtnSmallGreen}>
            <ArrowUpRight size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnTextGreen}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSmallOutline}>
            <Plus size={16} color="#38bdf8" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnTextCyan}>Add Money</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity List */}
      <View style={styles.activityHeader}>
        <History size={18} color="#94a3b8" />
        <Text style={styles.activityTitle}>Recent Activity</Text>
      </View>

      <View style={styles.txList}>
        {transactions.map((tx) => (
          <View key={tx.id} style={styles.txItem}>
            <View>
              <Text style={styles.txTitle}>{tx.title}</Text>
              <Text style={styles.txTime}>{tx.time_label}</Text>
            </View>
            <Text
              style={[
                styles.txAmount,
                tx.is_credit ? styles.txCredit : styles.txDebit,
              ]}
            >
              {tx.amount_text}
            </Text>
          </View>
        ))}
      </View>
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  verifiedText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  karmaCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    marginBottom: 16,
  },
  cashCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconCircleOrange: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 8,
    borderRadius: 12,
  },
  iconCircleGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 8,
    borderRadius: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  karmaValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 16,
  },
  cashValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnSmallOrange: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnTextOrange: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnSmallGreen: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnTextGreen: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnSmallOutline: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnTextOutline: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13,
  },
  actionBtnTextCyan: {
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: 13,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  txList: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 2,
  },
  txTime: {
    fontSize: 12,
    color: '#64748b',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  txCredit: {
    color: '#10b981',
  },
  txDebit: {
    color: '#ef4444',
  },
});