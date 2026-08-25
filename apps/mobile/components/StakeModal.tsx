import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Flame, TrendingUp, Check } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface StakeModalProps {
  visible: boolean;
  videoId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const AMOUNTS = [10, 25, 50, 100];

export default function StakeModal({ visible, videoId, onClose, onSuccess }: StakeModalProps) {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B'>('A');
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmStake = async () => {
    if (!videoId) return;
    setSubmitting(true);

    try {
      // 1. Fetch prediction for this video
      const { data: prediction } = await supabase
        .from('predictions')
        .select('id')
        .eq('video_id', videoId)
        .limit(1)
        .single();

      const predictionId = prediction?.id || '00000000-0000-0000-0000-000000000001';
      const userId = '00000000-0000-0000-0000-000000000001';

      // 2. Call the atomic database RPC function
      const { data, error } = await supabase.rpc('place_karma_stake', {
        p_prediction_id: predictionId,
        p_user_id: userId,
        p_option: selectedOption === 'A' ? 'option_a' : 'option_b',
        p_amount: selectedAmount,
      });

      if (error) throw error;

      Alert.alert('Stake Confirmed! 🔥', `You staked ${selectedAmount} Karma.`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Staking error:', err);
      Alert.alert('Staking Failed', err.message || 'Unable to place stake.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Flame size={20} color="#f59e0b" />
              <Text style={styles.title}>Predict & Stake Karma</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Prediction Question */}
          <Text style={styles.question}>
            Will Mumbai Melt Cafe cross 200 orders this Saturday?
          </Text>

          {/* Option Selector */}
          <View style={styles.optionRow}>
            <TouchableOpacity
              style={[
                styles.optionBox,
                selectedOption === 'A' && styles.optionSelectedA,
              ]}
              onPress={() => setSelectedOption('A')}
            >
              <Text style={styles.optionTitle}>Yes</Text>
              <Text style={styles.oddsText}>1.8x Return</Text>
              <Text style={styles.poolShare}>62% Pool</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionBox,
                selectedOption === 'B' && styles.optionSelectedB,
              ]}
              onPress={() => setSelectedOption('B')}
            >
              <Text style={styles.optionTitle}>No</Text>
              <Text style={styles.oddsText}>2.4x Return</Text>
              <Text style={styles.poolShare}>38% Pool</Text>
            </TouchableOpacity>
          </View>

          {/* Amount Selector Chips */}
          <Text style={styles.amountLabel}>Choose Stake Amount (Karma)</Text>
          <View style={styles.chipRow}>
            {AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.amountChip,
                  selectedAmount === amt && styles.amountChipActive,
                ]}
                onPress={() => setSelectedAmount(amt)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedAmount === amt && styles.chipTextActive,
                  ]}
                >
                  {amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Potential Payout Info */}
          <View style={styles.payoutInfo}>
            <TrendingUp size={16} color="#10b981" />
            <Text style={styles.payoutText}>
              Estimated win:{' '}
              <Text style={styles.payoutHighlight}>
                +{Math.round(selectedAmount * (selectedOption === 'A' ? 1.8 : 2.4))} Karma
              </Text>
            </Text>
          </View>

          {/* Submit Action */}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirmStake}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.confirmBtnText}>
                Stake {selectedAmount} Karma
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 22,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  optionBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelectedA: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  optionSelectedB: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  oddsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
  },
  poolShare: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  amountChip: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  amountChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  chipText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#000000',
  },
  payoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  payoutText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  payoutHighlight: {
    color: '#10b981',
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
});