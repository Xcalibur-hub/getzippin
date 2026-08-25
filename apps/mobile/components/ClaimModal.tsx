import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { X, Clock, CheckCircle2 } from 'lucide-react-native';
import { Video as VideoType } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ClaimModalProps {
  visible: boolean;
  video: VideoType | null;
  onClose: () => void;
}

export default function ClaimModal({ visible, video, onClose }: ClaimModalProps) {
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds

  useEffect(() => {
    if (!visible) {
      setTimeLeft(900);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  if (!video) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // Payload structure verified by the merchant scanner
  const qrPayload = JSON.stringify({
    drop_id: video.id,
    merchant: video.merchant_name,
    amount: video.cashback_amount,
    ts: Date.now(),
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Claim ₹{video.cashback_amount} Drop</Text>
              <Text style={styles.merchantSubtitle}>{video.merchant_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* QR Container */}
          <View style={styles.qrWrapper}>
            <QRCode
              value={qrPayload}
              size={SCREEN_WIDTH * 0.55}
              color="#020617"
              backgroundColor="#ffffff"
            />
          </View>

          {/* Expiration Timer */}
          <View style={styles.timerBadge}>
            <Clock size={16} color="#f59e0b" />
            <Text style={styles.timerText}>Expires in {formattedTime}</Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionBox}>
            <CheckCircle2 size={16} color="#10b981" />
            <Text style={styles.instructionText}>
              Show this QR to the cashier at the counter to redeem.
            </Text>
          </View>
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  merchantSubtitle: {
    fontSize: 14,
    color: '#38bdf8',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  timerText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  instructionText: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
  },
});