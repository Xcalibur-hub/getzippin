'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Plus, TrendingUp, Users, DollarSign, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  cashback_amount: number;
  min_purchase: number;
  total_budget: number;
  spent_budget: number;
  status: string;
  start_date: string;
  end_date: string;
  verified_visits?: number;
}

interface Transaction {
  id: string;
  amount: number;
  user_credit: number;
  creator_credit: number;
  platform_revenue: number;
  status: string;
  created_at: string;
  claim?: {
    drop?: {
      campaign_id: string;
    };
  };
}

export default function DashboardContent({ merchantId }: { merchantId: string }) {
