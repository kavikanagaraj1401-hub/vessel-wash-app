import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Utensils,
  Share2,
  CheckCircle2,
  Clock,
  Settings,
  Search,
  Crown,
  Check,
} from 'lucide-react';

export function BillScreen({
  members = [],
  daysConfig = [],
  computedDays = [],
  attendanceLogs = [],
  isAdmin = false,
  todayDateStr = '',
  currentMember = null,
}) {
  // Billing Configuration State
  const [billingMode, setBillingMode] = useState(() => {
    try {
      return localStorage.getItem('vw_bill_mode') || 'per_meal'; // 'per_meal' | 'shared_total'
    } catch {
      return 'per_meal';
    }
  });

  const [mealRate, setMealRate] = useState(() => {
    try {
      const saved = localStorage.getItem('vw_bill_meal_rate');
      return saved ? Number(saved) : 50; // Default ₹50 per meal
    } catch {
      return 50;
    }
  });

  const [totalMessExpense, setTotalMessExpense] = useState(() => {
    try {
      const saved = localStorage.getItem('vw_bill_total_expense');
      return saved ? Number(saved) : 6000; // Default ₹6,000 shared pool
    } catch {
      return 6000;
    }
  });

  const [washDiscountRate, setWashDiscountRate] = useState(() => {
    try {
      const saved = localStorage.getItem('vw_bill_wash_discount');
      return saved ? Number(saved) : 0; // Default ₹0 deduction per wash
    } catch {
      return 0;
    }
  });

  // Payments map: { [memberId]: boolean (true = paid, false = pending) }
  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem('vw_bill_payments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending'
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Sync settings to localStorage
  const handleSaveSettings = (newMode, newRate, newTotal, newDiscount) => {
    setBillingMode(newMode);
    setMealRate(newRate);
    setTotalMessExpense(newTotal);
    setWashDiscountRate(newDiscount);
    try {
      localStorage.setItem('vw_bill_mode', newMode);
      localStorage.setItem('vw_bill_meal_rate', String(newRate));
      localStorage.setItem('vw_bill_total_expense', String(newTotal));
      localStorage.setItem('vw_bill_wash_discount', String(newDiscount));
    } catch {
      // ignore
    }
    setSettingsOpen(false);
  };

  // Toggle paid status for a member
  const handleTogglePayment = (memberId) => {
    if (!isAdmin) return;
    setPayments((prev) => {
      const next = { ...prev, [memberId]: !prev[memberId] };
      try {
        localStorage.setItem('vw_bill_payments', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Calculate meal consumption & wash duties per member
  const memberBillData = useMemo(() => {
    const list = Array.isArray(members) ? members : [];
    const days = Array.isArray(daysConfig) && daysConfig.length > 0 ? daysConfig : (computedDays || []);

    return list.map((m) => {
      let lunchCount = 0;
      let dinnerCount = 0;

      days.forEach((day) => {
        if (day.lunchProvided && Array.isArray(day.lunchEaters) && day.lunchEaters.includes(m.id)) {
          lunchCount++;
        }
        if (day.dinnerProvided && Array.isArray(day.dinnerEaters) && day.dinnerEaters.includes(m.id)) {
          dinnerCount++;
        }
      });

      // Verified washes from attendance logs
      const washes = (attendanceLogs || []).filter(
        (log) => log.memberId === m.id && log.status === 'present'
      ).length;

      const totalMeals = lunchCount + dinnerCount;
      const isPaid = Boolean(payments[m.id]);

      return {
        member: m,
        id: m.id,
        name: m.name,
        code: m.code,
        role: m.role,
        lunchCount,
        dinnerCount,
        totalMeals,
        washes,
        isPaid,
      };
    });
  }, [members, daysConfig, computedDays, attendanceLogs, payments]);

  // Aggregate totals
  const totalGroupMeals = useMemo(() => {
    return memberBillData.reduce((acc, curr) => acc + curr.totalMeals, 0);
  }, [memberBillData]);

  const totalGroupWashes = useMemo(() => {
    return memberBillData.reduce((acc, curr) => acc + curr.washes, 0);
  }, [memberBillData]);

  // Effective rate per meal
  const effectivePerMealRate = useMemo(() => {
    if (billingMode === 'shared_total') {
      return totalGroupMeals > 0 ? totalMessExpense / totalGroupMeals : 0;
    }
    return mealRate;
  }, [billingMode, totalGroupMeals, totalMessExpense, mealRate]);

  // Calculated overall bill
  const totalCalculatedBill = useMemo(() => {
    if (billingMode === 'shared_total') {
      return totalMessExpense;
    }
    return Math.round(totalGroupMeals * effectivePerMealRate);
  }, [billingMode, totalMessExpense, totalGroupMeals, effectivePerMealRate]);

  // Enriched member list with calculated billing amounts
  const enrichedMembers = useMemo(() => {
    return memberBillData.map((item) => {
      const gross = Math.round(item.totalMeals * effectivePerMealRate);
      const discount = Math.round(item.washes * washDiscountRate);
      const net = Math.max(0, gross - discount);
      return {
        ...item,
        grossAmount: gross,
        washDiscount: discount,
        netAmount: net,
      };
    });
  }, [memberBillData, effectivePerMealRate, washDiscountRate]);

  // Current logged in user's personal item
  const myItem = useMemo(() => {
    if (!currentMember) return enrichedMembers[0] || null;
    return (
      enrichedMembers.find(
        (item) =>
          item.id === currentMember.id ||
          (item.name && currentMember.name && item.name.toLowerCase() === currentMember.name.toLowerCase())
      ) || enrichedMembers[0]
    );
  }, [enrichedMembers, currentMember]);

  // Filtered members list for display
  const filteredList = useMemo(() => {
    return enrichedMembers.filter((item) => {
      if (statusFilter === 'paid' && !item.isPaid) return false;
      if (statusFilter === 'pending' && item.isPaid) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        return matchesName || matchesCode;
      }
      return true;
    });
  }, [enrichedMembers, statusFilter, searchQuery]);

  // Current month string formatted (e.g. September 2026)
  const currentMonthStr = useMemo(() => {
    if (todayDateStr) {
      const parts = todayDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    }
    return 'September 2026';
  }, [todayDateStr]);

  // Generate WhatsApp / Clipboard share text
  const generateShareSummary = () => {
    let text = `🍽️ *Vessel Wash & Mess Bill - ${currentMonthStr}*\n`;
    text += `📊 Total Meals: ${totalGroupMeals} | Effective Rate: ₹${effectivePerMealRate.toFixed(1)}/meal\n`;
    text += `💰 Total Mess Bill: ₹${totalCalculatedBill.toLocaleString('en-IN')}\n`;
    text += `-----------------------------------------\n`;

    enrichedMembers.forEach((item) => {
      const statusIcon = item.isPaid ? '✅ Paid' : '⏳ Pending';
      text += `👤 *${item.code} ${item.name}*: ${item.totalMeals} meals (${item.lunchCount}L + ${item.dinnerCount}D) • ${item.washes} washes → *₹${item.netAmount.toLocaleString('en-IN')}* [${statusIcon}]\n`;
    });

    text += `-----------------------------------------\n`;
    text += `Generated automatically via Vessel Wash App`;
    return text;
  };

  const handleCopyShare = async () => {
    try {
      const text = generateShareSummary();
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4 pb-28 px-4 pt-2 max-w-4xl mx-auto">
      {/* 1. Header & Summary Hero Banner */}
      <div className="bg-white dark:bg-[#171F2C] p-4 sm:p-5 rounded-2xl border border-[#DDD9D0] dark:border-[#2A364B] shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ECBD56]/15 dark:bg-[#ECBD56]/20 text-[#111216] dark:text-[#ECBD56] border border-[#ECBD56]/40 inline-flex items-center gap-1">
                <Receipt className="w-3 h-3 text-[#ECBD56]" />
                Mess &amp; Meal Billing
              </span>
              <span className="text-xs text-[#111216]/40 dark:text-[#F7F6F3]/40">&bull;</span>
              <span className="text-xs font-semibold text-[#111216]/70 dark:text-[#F7F6F3]/70">
                {currentMonthStr}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111216] dark:text-[#F7F6F3] mt-1">
              Monthly Bill &amp; Expenses
            </h2>
          </div>

          {/* Action Toolbar: Share & Admin Configuration */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShare}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] hover:bg-[#DDD9D0] dark:hover:bg-[#2A364B] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center gap-1.5 active-scale transition-colors shadow-2xs cursor-pointer"
              title="Copy bill summary to clipboard for WhatsApp"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#22AC77] dark:text-[#4ADE80]" />
                  <span className="text-[#22AC77] dark:text-[#4ADE80]">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#ECBD56]" />
                  <span>Share Bill</span>
                </>
              )}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] hover:bg-[#DDD9D0] dark:hover:bg-[#2A364B] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center gap-1.5 active-scale transition-colors cursor-pointer"
                title="Configure rates and expense pool"
              >
                <Settings className="w-3.5 h-3.5 text-[#ECBD56]" />
                <span>Configure Rates</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3.5">
          <div className="p-3 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] transition-colors">
            <span className="text-[10px] font-bold text-[#111216]/60 dark:text-[#F7F6F3]/60 uppercase tracking-wider block">
              Total Mess Bill
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-[#111216] dark:text-[#F7F6F3]">
                ₹{totalCalculatedBill.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-[10px] text-[#111216]/50 dark:text-[#F7F6F3]/50 font-medium">
              {billingMode === 'shared_total' ? 'Shared expense pool' : 'Calculated by rate'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] transition-colors">
            <span className="text-[10px] font-bold text-[#111216]/60 dark:text-[#F7F6F3]/60 uppercase tracking-wider block">
              Total Meals Eaten
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-[#ECBD56]">
                {totalGroupMeals}
              </span>
              <span className="text-xs text-[#111216]/60 dark:text-[#F7F6F3]/60 font-medium">meals</span>
            </div>
            <span className="text-[10px] text-[#111216]/50 dark:text-[#F7F6F3]/50 font-medium">
              Lunch &amp; dinner records
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] transition-colors">
            <span className="text-[10px] font-bold text-[#111216]/60 dark:text-[#F7F6F3]/60 uppercase tracking-wider block">
              Cost Per Meal
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-[#22AC77] dark:text-[#4ADE80]">
                ₹{effectivePerMealRate.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-[#111216]/50 dark:text-[#F7F6F3]/50 font-medium">
              {billingMode === 'shared_total' ? 'Pro-rated evenly' : 'Fixed per meal'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] transition-colors">
            <span className="text-[10px] font-bold text-[#111216]/60 dark:text-[#F7F6F3]/60 uppercase tracking-wider block">
              Verified Washes
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-[#111216] dark:text-[#F7F6F3]">
                {totalGroupWashes}
              </span>
              <span className="text-xs text-[#111216]/60 dark:text-[#F7F6F3]/60 font-medium">completed</span>
            </div>
            <span className="text-[10px] text-[#111216]/50 dark:text-[#F7F6F3]/50 font-medium">
              Clean duty records
            </span>
          </div>
        </div>
      </div>

      {/* 3. Logged-in User's Personal Bill Highlight Card */}
      {myItem && (
        <div className="p-4 rounded-2xl bg-[#111216] dark:bg-[#171F2C] text-[#F7F6F3] border border-[#ECBD56]/40 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#ECBD56] text-[#111216] flex items-center justify-center font-extrabold text-sm border border-[#ECBD56]/80 shadow-2xs">
                {myItem.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-[#F7F6F3]">
                    Your Share ({myItem.name})
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      myItem.isPaid
                        ? 'bg-[#22AC77]/20 text-[#4ADE80] border border-[#4ADE80]/40'
                        : 'bg-[#E0851A]/20 text-[#FF9F45] border border-[#FF9F45]/40'
                    }`}
                  >
                    {myItem.isPaid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-[#4ADE80]" />
                        <span>Paid</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-[#FF9F45]" />
                        <span>Pending</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="text-xs text-[#F7F6F3]/70 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{myItem.totalMeals} meals eaten ({myItem.lunchCount} lunch &bull; {myItem.dinnerCount} dinner)</span>
                  <span>&bull;</span>
                  <span>{myItem.washes} vessel washes done</span>
                </div>
              </div>
            </div>

            <div className="text-right flex items-center sm:flex-col sm:items-end justify-between border-t border-white/10 pt-2 sm:border-t-0 sm:pt-0">
              <span className="text-[10px] text-[#F7F6F3]/70 font-semibold uppercase tracking-wider block">
                Net Payable
              </span>
              <span className="text-2xl font-black text-[#ECBD56]">
                ₹{myItem.netAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Controls: Search & Paid / Pending Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#111216]/40 dark:text-[#F7F6F3]/40 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member by name or code (e.g. M1)..."
            className="w-full h-10 pl-9 pr-4 text-xs bg-white dark:bg-[#171F2C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] placeholder-[#111216]/40 dark:placeholder-[#F7F6F3]/40 focus:outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 shadow-2xs transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#F2F1ED] dark:bg-[#1F2A3C] p-1 rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#111216] dark:bg-[#ECBD56] text-[#F7F6F3] dark:text-[#111216] shadow-2xs'
                : 'text-[#111216]/70 dark:text-[#F7F6F3]/70 hover:text-[#111216] dark:hover:text-[#F7F6F3]'
            }`}
          >
            All ({enrichedMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-[#E0851A] dark:bg-[#FF9F45] text-white shadow-2xs'
                : 'text-[#111216]/70 dark:text-[#F7F6F3]/70 hover:text-[#111216] dark:hover:text-[#F7F6F3]'
            }`}
          >
            Pending ({enrichedMembers.filter((m) => !m.isPaid).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-[#22AC77] dark:bg-[#4ADE80] text-white dark:text-[#111216] shadow-2xs'
                : 'text-[#111216]/70 dark:text-[#F7F6F3]/70 hover:text-[#111216] dark:hover:text-[#F7F6F3]'
            }`}
          >
            Paid ({enrichedMembers.filter((m) => m.isPaid).length})
          </button>
        </div>
      </div>

      {/* 5. Member Breakdown List */}
      <div className="space-y-2.5">
        {filteredList.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all bg-white dark:bg-[#171F2C] shadow-xs ${
              item.isPaid
                ? 'border-[#DDD9D0] dark:border-[#2A364B]'
                : 'border-[#E0851A]/40 dark:border-[#FF9F45]/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs ${
                    item.role === 'admin'
                      ? 'admin-gradient text-white border border-[#ECBD56]/80'
                      : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B]'
                  }`}
                >
                  {item.role === 'admin' ? <Crown className="w-5 h-5 text-[#ECBD56]" /> : item.code}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[#111216] dark:text-[#F7F6F3] truncate">
                      {item.name}
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216]/70 dark:text-[#F7F6F3]/70 border border-[#DDD9D0] dark:border-[#2A364B]">
                      {item.code}
                    </span>

                    {/* Paid / Pending Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        item.isPaid
                          ? 'bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 text-[#22AC77] dark:text-[#4ADE80] border border-[#22AC77]/30 dark:border-[#4ADE80]/40'
                          : 'bg-[#E0851A]/10 dark:bg-[#FF9F45]/15 text-[#E0851A] dark:text-[#FF9F45] border border-[#E0851A]/30 dark:border-[#FF9F45]/40'
                      }`}
                    >
                      {item.isPaid ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-[#22AC77] dark:text-[#4ADE80]" />
                          <span>Paid</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-[#E0851A] dark:text-[#FF9F45]" />
                          <span>Pending</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Meals & Wash Breakdown */}
                  <div className="flex items-center gap-2 text-xs text-[#111216]/60 dark:text-[#F7F6F3]/60 mt-1 flex-wrap">
                    <span className="font-semibold text-[#111216]/80 dark:text-[#F7F6F3]/80 inline-flex items-center gap-1">
                      <Utensils className="w-3 h-3 text-[#ECBD56]" />
                      {item.totalMeals} meals ({item.lunchCount} lunch &bull; {item.dinnerCount} dinner)
                    </span>
                    <span className="text-[#DDD9D0] dark:text-[#2A364B]">&bull;</span>
                    <span className="text-[#111216]/70 dark:text-[#F7F6F3]/70">
                      {item.washes} washes done
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Amount & Payment Toggle */}
              <div className="text-right flex flex-col items-end shrink-0">
                <span className="text-[10px] font-bold text-[#111216]/40 dark:text-[#F7F6F3]/40 uppercase tracking-wider">
                  Amount
                </span>
                <span className="text-lg font-black text-[#111216] dark:text-[#F7F6F3] leading-tight">
                  ₹{item.netAmount.toLocaleString('en-IN')}
                </span>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleTogglePayment(item.id)}
                    className={`mt-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                      item.isPaid
                        ? 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] border-[#DDD9D0] dark:border-[#2A364B] hover:bg-[#DDD9D0] dark:hover:bg-[#2A364B]'
                        : 'bg-[#ECBD56] text-[#111216] border-[#ECBD56] hover:bg-[#DEAA3E]'
                    }`}
                  >
                    {item.isPaid ? 'Mark Pending' : 'Mark as Paid'}
                  </button>
                ) : (
                  <span className="text-[10px] text-[#111216]/40 dark:text-[#F7F6F3]/40 mt-1 italic">
                    {item.isPaid ? 'Settled' : 'Payment due'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredList.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-[#171F2C] rounded-2xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216]/50 dark:text-[#F7F6F3]/50 text-xs">
            No member billing records matching current filters.
          </div>
        )}
      </div>

      {/* 6. Admin Configuration Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#171F2C] rounded-2xl p-5 border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
              <div className="flex items-center gap-2 text-[#111216] dark:text-[#F7F6F3] font-bold text-sm">
                <Settings className="w-4 h-4 text-[#ECBD56]" />
                <span>Configure Billing Model</span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-[#111216]/40 dark:text-[#F7F6F3]/40 hover:text-[#111216] dark:hover:text-[#F7F6F3] text-sm font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Billing Mode Selection */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block mb-1.5">
                  Billing Calculation Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingMode('per_meal')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      billingMode === 'per_meal'
                        ? 'bg-[#ECBD56]/15 border-[#ECBD56] ring-2 ring-[#ECBD56]/20 text-[#111216] dark:text-[#ECBD56]'
                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] border-[#DDD9D0] dark:border-[#2A364B] text-[#111216]/70 dark:text-[#F7F6F3]/70'
                    }`}
                  >
                    <span className="text-xs font-bold block">Fixed Per-Meal</span>
                    <span className="text-[10px] text-[#111216]/50 dark:text-[#F7F6F3]/50 block mt-0.5">
                      Fixed ₹ per meal eaten
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingMode('shared_total')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      billingMode === 'shared_total'
                        ? 'bg-[#ECBD56]/15 border-[#ECBD56] ring-2 ring-[#ECBD56]/20 text-[#111216] dark:text-[#ECBD56]'
                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] border-[#DDD9D0] dark:border-[#2A364B] text-[#111216]/70 dark:text-[#F7F6F3]/70'
                    }`}
                  >
                    <span className="text-xs font-bold block">Shared Expense Pool</span>
                    <span className="text-[10px] text-[#111216]/50 dark:text-[#F7F6F3]/50 block mt-0.5">
                      Split total grocery cost
                    </span>
                  </button>
                </div>
              </div>

              {/* Mode Specific Inputs */}
              {billingMode === 'per_meal' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block">
                    Fixed Cost Per Meal (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={mealRate}
                    onChange={(e) => setMealRate(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] focus:outline-none focus:border-[#ECBD56]"
                    placeholder="e.g. 50"
                  />
                  <span className="text-[10px] text-[#111216]/40 dark:text-[#F7F6F3]/40 block">
                    Every recorded lunch or dinner costs ₹{mealRate}.
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block">
                    Total Monthly Mess Expense (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={totalMessExpense}
                    onChange={(e) => setTotalMessExpense(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] focus:outline-none focus:border-[#ECBD56]"
                    placeholder="e.g. 6000"
                  />
                  <span className="text-[10px] text-[#111216]/40 dark:text-[#F7F6F3]/40 block">
                    Divided across all {totalGroupMeals} recorded meals (₹{(totalGroupMeals > 0 ? totalMessExpense / totalGroupMeals : 0).toFixed(1)}/meal).
                  </span>
                </div>
              )}

              {/* Wash Allowance */}
              <div className="space-y-1 pt-1 border-t border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
                <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block">
                  Vessel Washer Credit / Rebate (₹ per wash)
                </label>
                <input
                  type="number"
                  min="0"
                  value={washDiscountRate}
                  onChange={(e) => setWashDiscountRate(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] focus:outline-none focus:border-[#ECBD56]"
                  placeholder="e.g. 0 or 20"
                />
                <span className="text-[10px] text-[#111216]/40 dark:text-[#F7F6F3]/40 block">
                  Optional rebate deducted from members who washed vessels. Set 0 for no deduction.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="px-3 py-2 text-xs font-bold text-[#111216]/70 dark:text-[#F7F6F3]/70 hover:bg-[#F2F1ED] dark:hover:bg-[#1F2A3C] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings(billingMode, mealRate, totalMessExpense, washDiscountRate)}
                className="px-4 py-2 text-xs font-bold text-[#111216] bg-[#ECBD56] hover:bg-[#DEAA3E] rounded-xl shadow-xs cursor-pointer active-scale"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
