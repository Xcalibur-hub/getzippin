'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, CheckCircle, Clock, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Campaign {
  id: string;
  title: string;
  cashback_amount: number;
  min_purchase: number;
  total_budget: number;
  spent_budget: number;
  status: string;
}

export default function DashboardContent({ merchantId }: { merchantId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({
    totalScans: 48,
    totalRevenue: 12450,
    activeCampaigns: 2,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadMerchantData() {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('merchant_id', merchantId);

        if (data && !error) {
          setCampaigns(data);
          setStats((prev) => ({ ...prev, activeCampaigns: data.length }));
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMerchantData();
  }, [merchantId, supabase]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Merchant Hub</h1>
            <p className="text-slate-400 text-sm mt-1">Merchant ID: {merchantId}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Scanner Mode
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition shadow-lg shadow-sky-600/20">
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-sm font-medium">Total Redemptions</span>
              <Users className="w-5 h-5 text-sky-400" />
            </div>
            <p className="text-3xl font-bold text-white mt-3">{stats.totalScans}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-sm font-medium">Attributed Sales</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white mt-3">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-sm font-medium">Active Drops</span>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white mt-3">{stats.activeCampaigns}</p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Active Campaigns</h2>
          <div className="divide-y divide-slate-800">
            {campaigns.length > 0 ? (
              campaigns.map((c) => (
                <div key={c.id} className="py-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-white">{c.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Min Purchase: ₹{c.min_purchase} • Cashback: ₹{c.cashback_amount}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                      {c.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500">
                No active promotional campaigns found.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}