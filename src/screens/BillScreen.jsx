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
      <div className="bg-gradient-to-br from-white via-white to-violet-50/50 p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200/60 inline-flex items-center gap-1">
                <Receipt className="w-3 h-3 text-violet-700" />
                Mess &amp; Meal Billing
              </span>
              <span className="text-xs text-neutral-400">&bull;</span>
              <span className="text-xs font-semibold text-neutral-500">
                {currentMonthStr}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 mt-1">
              Monthly Bill &amp; Expenses
            </h2>
          </div>

          {/* Action Toolbar: Share & Admin Configuration */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShare}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 active-scale transition-colors shadow-2xs cursor-pointer"
              title="Copy bill summary to clipboard for WhatsApp"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Share Bill</span>
                </>
              )}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 flex items-center gap-1.5 active-scale transition-colors cursor-pointer"
                title="Configure rates and expense pool"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-600" />
                <span>Configure Rates</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3.5">
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Total Mess Bill
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-neutral-900">
                ₹{totalCalculatedBill.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 font-medium">
              {billingMode === 'shared_total' ? 'Shared expense pool' : 'Calculated by rate'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Total Meals Eaten
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-violet-900">
                {totalGroupMeals}
              </span>
              <span className="text-xs text-neutral-500 font-medium">meals</span>
            </div>
            <span className="text-[10px] text-neutral-500 font-medium">
              Lunch &amp; dinner records
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Cost Per Meal
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-emerald-800">
                ₹{effectivePerMealRate.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 font-medium">
              {billingMode === 'shared_total' ? 'Pro-rated evenly' : 'Fixed per meal'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Verified Washes
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-neutral-900">
                {totalGroupWashes}
              </span>
              <span className="text-xs text-neutral-500 font-medium">completed</span>
            </div>
            <span className="text-[10px] text-neutral-500 font-medium">
              Clean duty records
            </span>
          </div>
        </div>
      </div>

      {/* 3. Logged-in User's Personal Bill Highlight Card */}
      {myItem && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-900 to-indigo-900 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center font-extrabold text-white text-sm border border-white/20 shadow-2xs">
                {myItem.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white">
                    Your Share ({myItem.name})
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      myItem.isPaid
                        ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                        : 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                    }`}
                  >
                    {myItem.isPaid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                        <span>Paid</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-300" />
                        <span>Pending</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="text-xs text-violet-200/90 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{myItem.totalMeals} meals eaten ({myItem.lunchCount} lunch &bull; {myItem.dinnerCount} dinner)</span>
                  <span>&bull;</span>
                  <span>{myItem.washes} vessel washes done</span>
                </div>
              </div>
            </div>

            <div className="text-right flex items-center sm:flex-col sm:items-end justify-between border-t border-white/10 pt-2 sm:border-t-0 sm:pt-0">
              <span className="text-[10px] text-violet-200/80 font-semibold uppercase tracking-wider block">
                Net Payable
              </span>
              <span className="text-2xl font-black text-[#D2F521]">
                ₹{myItem.netAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Controls: Search & Paid / Pending Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member by name or code (e.g. M1)..."
            className="w-full h-10 pl-9 pr-4 text-xs bg-white rounded-xl border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 shadow-2xs transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-neutral-200/80 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All ({enrichedMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Pending ({enrichedMembers.filter((m) => !m.isPaid).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
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
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
              item.isPaid
                ? 'bg-white border-neutral-200/90 hover:border-neutral-300 shadow-xs'
                : 'bg-white border-amber-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs ${
                    item.role === 'admin'
                      ? 'bg-violet-100 text-violet-900 border border-violet-300 ring-2 ring-violet-400/20'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-300/80'
                  }`}
                >
                  {item.role === 'admin' ? <Crown className="w-5 h-5 text-violet-700" /> : item.code}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-neutral-900 truncate">
                      {item.name}
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {item.code}
                    </span>

                    {/* Paid / Pending Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        item.isPaid
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.isPaid ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Paid</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Meals & Wash Breakdown */}
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 flex-wrap">
                    <span className="font-semibold text-neutral-700 inline-flex items-center gap-1">
                      <Utensils className="w-3 h-3 text-neutral-400" />
                      {item.totalMeals} meals ({item.lunchCount} lunch &bull; {item.dinnerCount} dinner)
                    </span>
                    <span className="text-neutral-300">&bull;</span>
                    <span className="text-neutral-600">
                      {item.washes} washes done
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Amount & Payment Toggle */}
              <div className="text-right flex flex-col items-end shrink-0">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Amount
                </span>
                <span className="text-lg font-black text-neutral-900 leading-tight">
                  ₹{item.netAmount.toLocaleString('en-IN')}
                </span>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleTogglePayment(item.id)}
                    className={`mt-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                      item.isPaid
                        ? 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {item.isPaid ? 'Mark Pending' : 'Mark as Paid'}
                  </button>
                ) : (
                  <span className="text-[10px] text-neutral-400 mt-1 italic">
                    {item.isPaid ? 'Settled' : 'Payment due'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredList.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
            No member billing records matching current filters.
          </div>
        )}
      </div>

      {/* 6. Admin Configuration Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 border border-neutral-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-neutral-900 font-bold text-sm">
                <Settings className="w-4 h-4 text-violet-600" />
                <span>Configure Billing Model</span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Billing Mode Selection */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1.5">
                  Billing Calculation Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingMode('per_meal')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      billingMode === 'per_meal'
                        ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-500/20 text-violet-900'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <span className="text-xs font-bold block">Fixed Per-Meal</span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      Fixed ₹ per meal eaten
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingMode('shared_total')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      billingMode === 'shared_total'
                        ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-500/20 text-violet-900'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <span className="text-xs font-bold block">Shared Expense Pool</span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      Split total grocery cost
                    </span>
                  </button>
                </div>
              </div>

              {/* Mode Specific Inputs */}
              {billingMode === 'per_meal' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-800 block">
                    Fixed Cost Per Meal (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={mealRate}
                    onChange={(e) => setMealRate(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs bg-white rounded-xl border border-neutral-200 text-neutral-900 focus:outline-none focus:border-violet-500"
                    placeholder="e.g. 50"
                  />
                  <span className="text-[10px] text-neutral-400 block">
                    Every recorded lunch or dinner costs ₹{mealRate}.
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-800 block">
                    Total Monthly Mess Expense (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={totalMessExpense}
                    onChange={(e) => setTotalMessExpense(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs bg-white rounded-xl border border-neutral-200 text-neutral-900 focus:outline-none focus:border-violet-500"
                    placeholder="e.g. 6000"
                  />
                  <span className="text-[10px] text-neutral-400 block">
                    Divided across all {totalGroupMeals} recorded meals (₹{(totalGroupMeals > 0 ? totalMessExpense / totalGroupMeals : 0).toFixed(1)}/meal).
                  </span>
                </div>
              )}

              {/* Wash Allowance */}
              <div className="space-y-1 pt-1 border-t border-neutral-100">
                <label className="text-xs font-bold text-neutral-800 block">
                  Vessel Washer Credit / Rebate (₹ per wash)
                </label>
                <input
                  type="number"
                  min="0"
                  value={washDiscountRate}
                  onChange={(e) => setWashDiscountRate(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-white rounded-xl border border-neutral-200 text-neutral-900 focus:outline-none focus:border-violet-500"
                  placeholder="e.g. 0 or 20"
                />
                <span className="text-[10px] text-neutral-400 block">
                  Optional rebate deducted from members who washed vessels. Set 0 for no deduction.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="px-3 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings(billingMode, mealRate, totalMessExpense, washDiscountRate)}
                className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs cursor-pointer active-scale"
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
