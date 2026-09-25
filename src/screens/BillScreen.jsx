import React, { useState, useMemo, useRef } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  Tag,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  X,
  Search,
  Sparkles,
  AlertCircle,
  FileText,
  CheckCircle2,
  Wallet,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';

/**
 * Format date-time for datetime-local input (YYYY-MM-DDTHH:mm)
 */
function getLocalDateTimeString(dateObj = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = dateObj.getFullYear();
  const m = pad(dateObj.getMonth() + 1);
  const d = pad(dateObj.getDate());
  const h = pad(dateObj.getHours());
  const min = pad(dateObj.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Format date for display (e.g., "25 Sep 2026, 02:30 PM")
 */
function formatBillDisplayDate(dateTimeStr) {
  if (!dateTimeStr) return 'N/A';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateTimeStr;
  }
}

/**
 * Extract Year-Month string (e.g. "2026-09")
 */
function getYearMonthKey(dateTimeStr) {
  if (!dateTimeStr) return 'Unknown';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return 'Unknown';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  } catch {
    return 'Unknown';
  }
}

/**
 * Format Year-Month to readable title (e.g. "September 2026")
 */
function formatMonthTitle(ymKey) {
  if (!ymKey || ymKey === 'all') return 'All Months';
  try {
    const [y, m] = ymKey.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } catch {
    return ymKey;
  }
}

const COMMON_EXPENSE_CATEGORIES = [
  'Groceries',
  'Vegetables & Fruits',
  'Mess Gas / Cylinder',
  'Cleaning Supplies',
  'Milk & Dairy',
  'Kitchen Utensils',
  'Maintenance',
  'Miscellaneous',
];

export function BillScreen({
  bills = [],
  members = [],
  currentMember = null,
  isAdmin = false,
  userEmail = '',
  onSaveBill,
  onDeleteBill,
  todayDateStr = '',
}) {
  // 1. Creator Scoping & Verification
  const isCreator = (bill) => {
    if (!bill || !currentMember) return false;
    if (bill.createdBy && currentMember.id && bill.createdBy === currentMember.id) return true;
    if (bill.creatorEmail && userEmail && bill.creatorEmail.toLowerCase() === userEmail.toLowerCase()) return true;
    if (bill.creatorName && currentMember.name && bill.creatorName.trim().toLowerCase() === currentMember.name.trim().toLowerCase()) return true;
    return false;
  };

  // Strictly filter bills created by the logged-in user
  const userBills = useMemo(() => {
    return bills.filter(isCreator);
  }, [bills, currentMember, userEmail]);

  // 2. Strict LIFO Sorting (newest at top)
  const lifoBills = useMemo(() => {
    return [...userBills].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.billDateTime).getTime();
      const timeB = new Date(b.createdAt || b.billDateTime).getTime();
      return timeB - timeA;
    });
  }, [userBills]);

  // 3. Month Filter & Analytics
  const distinctMonths = useMemo(() => {
    const set = new Set();
    userBills.forEach(b => {
      const ym = getYearMonthKey(b.billDateTime || b.createdAt);
      if (ym && ym !== 'Unknown') set.add(ym);
    });
    // Add current month if empty
    const currentYm = getYearMonthKey(todayDateStr || new Date().toISOString());
    if (currentYm && currentYm !== 'Unknown') set.add(currentYm);
    return Array.from(set).sort().reverse();
  }, [userBills, todayDateStr]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    return getYearMonthKey(todayDateStr || new Date().toISOString()) || 'all';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBillIds, setExpandedBillIds] = useState(() => new Set());

  // Filter by selected month & search query
  const displayedBills = useMemo(() => {
    return lifoBills.filter(bill => {
      // Month match
      if (selectedMonth !== 'all') {
        const ym = getYearMonthKey(bill.billDateTime || bill.createdAt);
        if (ym !== selectedMonth) return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchReceipt = bill.receiptId?.toLowerCase().includes(q);
        const matchType = bill.expenseType?.toLowerCase().includes(q);
        const matchPaidBy = bill.paidByMemberName?.toLowerCase().includes(q);
        const matchItem = bill.lineItems?.some(it => it.particular?.toLowerCase().includes(q));
        if (!matchReceipt && !matchType && !matchPaidBy && !matchItem) return false;
      }
      return true;
    });
  }, [lifoBills, selectedMonth, searchQuery]);

  // Calculate Monthly Metrics for current creator
  const monthlyMetrics = useMemo(() => {
    const monthBills = lifoBills.filter(bill => {
      if (selectedMonth === 'all') return true;
      return getYearMonthKey(bill.billDateTime || bill.createdAt) === selectedMonth;
    });
    const totalAmount = monthBills.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
    const count = monthBills.length;
    const avg = count > 0 ? Math.round(totalAmount / count) : 0;
    return { totalAmount, count, avg };
  }, [lifoBills, selectedMonth]);

  // Toggle item breakdown expander
  const toggleExpand = (id) => {
    setExpandedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ----------------------------------------------------
  // "NEW BILL" FORM MODAL STATE
  // ----------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billDateTime, setBillDateTime] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [lineItems, setLineItems] = useState([
    { id: 'item-1', sNo: 1, particular: '', amount: '' },
  ]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Open modal & initialize
  const handleOpenNewBill = () => {
    setBillDateTime(getLocalDateTimeString(new Date()));
    setPaidByMemberId(currentMember?.id || (members[0]?.id || 'm1'));
    setExpenseType('Groceries');
    setLineItems([{ id: `item-${Date.now()}`, sNo: 1, particular: '', amount: '' }]);
    setFormError('');
    setIsModalOpen(true);
  };

  // Dynamic Line Item Actions
  const handleAddLineItem = () => {
    setLineItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        sNo: prev.length + 1,
        particular: '',
        amount: '',
      },
    ]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      // Re-index sNo
      return updated.map((item, idx) => ({ ...item, sNo: idx + 1 }));
    });
  };

  const handleLineItemChange = (index, field, value) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (formError) setFormError('');
  };

  // Real-time sum calculation
  const calculatedGrandTotal = useMemo(() => {
    return lineItems.reduce((acc, row) => {
      const parsed = parseFloat(row.amount);
      return acc + (isNaN(parsed) || parsed < 0 ? 0 : parsed);
    }, 0);
  }, [lineItems]);

  // Form Submit Handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!billDateTime) {
      setFormError('Please select a valid bill date and time.');
      return;
    }

    if (!expenseType.trim()) {
      setFormError('Please specify the expense type or purpose.');
      return;
    }

    // Validate line items
    const validItems = lineItems.filter(
      item => item.particular.trim() && !isNaN(parseFloat(item.amount)) && parseFloat(item.amount) > 0
    );

    if (validItems.length === 0) {
      setFormError('Please provide at least one valid item with a description and positive amount.');
      return;
    }

    const selectedMember = members.find(m => m.id === paidByMemberId) || currentMember;

    setSubmitting(true);
    try {
      const formattedItems = validItems.map((item, idx) => ({
        id: item.id || `item-${idx + 1}`,
        sNo: idx + 1,
        particular: item.particular.trim(),
        amount: parseFloat(item.amount),
      }));

      const totalAmount = formattedItems.reduce((acc, item) => acc + item.amount, 0);

      if (onSaveBill) {
        await onSaveBill({
          billDateTime,
          paidByMemberId: selectedMember?.id || currentMember?.id || 'm1',
          paidByMemberName: selectedMember?.name || currentMember?.name || 'Member',
          paidByMemberCode: selectedMember?.code || currentMember?.code || 'M1',
          expenseType: expenseType.trim(),
          lineItems: formattedItems,
          totalAmount,
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save bill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // CREATOR-ONLY PRINT / PDF RECEIPT MODAL
  // ----------------------------------------------------
  const [printBill, setPrintBill] = useState(null);
  const printAreaRef = useRef(null);

  const handleOpenPrintReceipt = (bill) => {
    if (!isCreator(bill)) return;
    setPrintBill(bill);
  };

  const handleExecutePrint = () => {
    window.print();
  };

  // Delete Handler with prompt
  const [billToDelete, setBillToDelete] = useState(null);
  const handleConfirmDelete = async () => {
    if (!billToDelete || !onDeleteBill) return;
    await onDeleteBill(billToDelete.id);
    setBillToDelete(null);
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-28 px-4 pt-3 space-y-4">
      {/* 1. Header Banner & Scoped Info */}
      <div className="p-4 sm:p-5 rounded-[22px] bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#DDD9D0]/70 dark:border-[#2A364B]/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ECBD56]">
                Reimbursement Register
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ECBD56]/20 text-[#ECBD56] border border-[#ECBD56]/40">
                LIFO History
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111216] dark:text-[#F7F6F3] mt-0.5">
              Out-of-Pocket Bills
            </h2>
            <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] mt-0.5">
              Digital receipt book for mess purchases &bull; Creator-scoped history
            </p>
          </div>

          {/* Logged in Creator Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B]">
            <div className="w-6 h-6 rounded-full bg-[#ECBD56] text-[#111216] flex items-center justify-center font-black text-[11px] shadow-2xs">
              {currentMember?.code || 'U'}
            </div>
            <div className="text-left">
              <span className="text-[10px] text-[#4E525D] dark:text-[#9BA5B7] block leading-none">
                Logged in as
              </span>
              <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                {currentMember?.name || 'Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Month Selector Tabs */}
        <div className="flex items-center gap-2 pt-3 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-[#4E525D] dark:text-[#9BA5B7] flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#ECBD56]" />
            Month:
          </span>
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedMonth === 'all'
                ? 'bg-[#111216] dark:bg-[#ECBD56] text-[#F7F6F3] dark:text-[#111216] shadow-xs'
                : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] hover:bg-[#EAE8E2] dark:hover:bg-[#253248]'
            }`}
          >
            All History
          </button>
          {distinctMonths.map(ym => (
            <button
              key={ym}
              type="button"
              onClick={() => setSelectedMonth(ym)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedMonth === ym
                  ? 'bg-[#111216] dark:bg-[#ECBD56] text-[#F7F6F3] dark:text-[#111216] shadow-xs'
                  : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] hover:bg-[#EAE8E2] dark:hover:bg-[#253248]'
              }`}
            >
              {formatMonthTitle(ym)}
            </button>
          ))}
        </div>

        {/* Monthly Summary Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5">
          <div className="p-3.5 rounded-2xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B]">
            <span className="text-[11px] font-semibold text-[#4E525D] dark:text-[#9BA5B7] block">
              {formatMonthTitle(selectedMonth)} Out-of-Pocket Total
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#ECBD56] tracking-tight">
                ₹{monthlyMetrics.totalAmount.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-bold text-[#4E525D] dark:text-[#9BA5B7]">INR</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B]">
            <span className="text-[11px] font-semibold text-[#4E525D] dark:text-[#9BA5B7] block">
              Submitted Receipts
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#111216] dark:text-[#F7F6F3] tracking-tight">
                {monthlyMetrics.count}
              </span>
              <span className="text-[10px] text-[#4E525D] dark:text-[#9BA5B7]">receipts recorded</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B]">
            <span className="text-[11px] font-semibold text-[#4E525D] dark:text-[#9BA5B7] block">
              Average Expense per Receipt
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#111216] dark:text-[#F7F6F3] tracking-tight">
                ₹{monthlyMetrics.avg.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#4E525D] dark:text-[#9BA5B7]">avg / bill</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Search & LIFO Count Indicator */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt ID, item, category..."
            className="w-full h-10 px-4 pl-9 text-xs bg-white dark:bg-[#171F2C] rounded-full border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] placeholder:text-[#848A96] dark:placeholder:text-[#64748B] outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 shadow-2xs transition-colors"
          />
          <Search className="w-4 h-4 text-[#848A96] dark:text-[#64748B] absolute left-3.5 top-3 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-[#848A96] hover:text-[#111216] dark:hover:text-[#F7F6F3]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-semibold text-[#4E525D] dark:text-[#9BA5B7]">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#ECBD56]" />
          <span>Showing {displayedBills.length} receipt(s) &bull; Newest First (LIFO)</span>
        </div>
      </div>

      {/* 3. LIFO Bills Feed */}
      {displayedBills.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-[22px] bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#ECBD56]/15 text-[#ECBD56] flex items-center justify-center mx-auto border border-[#ECBD56]/30 shadow-xs">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111216] dark:text-[#F7F6F3]">
              No Reimbursement Bills Found
            </h3>
            <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] max-w-sm mx-auto mt-1 leading-relaxed">
              {searchQuery
                ? `No bills matched "${searchQuery}". Clear your search or change the month filter.`
                : 'You have not recorded any out-of-pocket expenses for this period. Tap the "New Bill" button below to log your first receipt!'}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenNewBill}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ECBD56] hover:bg-[#DEAA3E] text-[#111216] text-xs font-bold shadow-xs active-scale transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Bill</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {displayedBills.map((bill) => {
            const isExpanded = expandedBillIds.has(bill.id);
            const userIsCreator = isCreator(bill);

            return (
              <div
                key={bill.id}
                className="rounded-[22px] bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs hover:shadow-xs transition-all p-4 sm:p-5 space-y-3.5"
              >
                {/* Header: Receipt ID & Meta */}
                <div className="flex items-start justify-between gap-2.5 pb-3 border-b border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Auto-incrementing Receipt ID Badge */}
                    <span className="px-3 py-1 rounded-full bg-[#FCF7ED] dark:bg-[#272115] text-[#845D08] dark:text-[#FBE6AB] border border-[#ECBD56]/70 text-xs font-black tracking-wide shadow-2xs inline-flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-[#ECBD56]" />
                      <span>{bill.receiptId || '#00001'}</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] text-[11px] font-semibold border border-[#DDD9D0] dark:border-[#2A364B]">
                      {bill.expenseType || 'General'}
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 text-[#22AC77] dark:text-[#4ADE80] border border-[#22AC77]/30">
                      Logged by You
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-[#ECBD56]" />
                      {formatBillDisplayDate(bill.billDateTime)}
                    </span>
                  </div>
                </div>

                {/* Body: Paid By & Amount */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center justify-center font-bold text-xs text-[#111216] dark:text-[#F7F6F3] shrink-0 shadow-2xs">
                      {bill.paidByMemberCode || 'M'}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] block leading-none">
                        Paid out-of-pocket by
                      </span>
                      <span className="text-sm font-bold text-[#111216] dark:text-[#F7F6F3] truncate block mt-0.5">
                        {bill.paidByMemberName}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-[#4E525D] dark:text-[#9BA5B7] block">
                      Total Reimbursement
                    </span>
                    <span className="text-2xl font-black text-[#ECBD56] tracking-tight">
                      ₹{Number(bill.totalAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Line Items Overview */}
                <div className="rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] p-3 border border-[#DDD9D0] dark:border-[#2A364B]">
                  <div
                    onClick={() => toggleExpand(bill.id)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#ECBD56]" />
                      <span>{bill.lineItems?.length || 0} Line Item(s)</span>
                    </span>

                    <button
                      type="button"
                      className="text-xs font-bold text-[#ECBD56] hover:underline flex items-center gap-0.5"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Particulars'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expanded Line Items Table */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#DDD9D0]/70 dark:border-[#2A364B]/70 animate-fadeIn">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[#4E525D] dark:text-[#9BA5B7] border-b border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
                            <th className="text-left font-bold py-1.5 w-12">S.No</th>
                            <th className="text-left font-bold py-1.5">Particular</th>
                            <th className="text-right font-bold py-1.5 w-24">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDD9D0]/40 dark:divide-[#2A364B]/40">
                          {(bill.lineItems || []).map((item, idx) => (
                            <tr key={item.id || idx} className="text-[#111216] dark:text-[#F7F6F3]">
                              <td className="py-1.5 font-bold text-[#4E525D] dark:text-[#9BA5B7]">
                                #{item.sNo || idx + 1}
                              </td>
                              <td className="py-1.5 font-medium">{item.particular}</td>
                              <td className="py-1.5 font-bold text-right text-[#ECBD56]">
                                ₹{Number(item.amount).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-[#DDD9D0] dark:border-[#2A364B] font-bold">
                            <td colSpan={2} className="pt-2 text-right text-[#4E525D] dark:text-[#9BA5B7]">
                              Total:
                            </td>
                            <td className="pt-2 text-right text-sm text-[#ECBD56] font-black">
                              ₹{Number(bill.totalAmount).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Fixed Footer Note */}
                      <div className="mt-2.5 pt-2 text-center text-[10px] text-[#4E525D] dark:text-[#9BA5B7] border-t border-dashed border-[#DDD9D0] dark:border-[#2A364B]">
                        {bill.footerText || 'Thank you for using this app'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-1">
                  {/* Creator-Only Download / Print Button (Requirement 5) */}
                  {userIsCreator ? (
                    <button
                      type="button"
                      onClick={() => handleOpenPrintReceipt(bill)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECBD56] hover:bg-[#DEAA3E] text-[#111216] text-xs font-bold shadow-2xs active-scale transition-all cursor-pointer"
                      title="Download or Print Official PDF Receipt"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Receipt</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] italic">
                      Receipt export restricted to creator
                    </span>
                  )}

                  {/* Delete Button (Creator Only) */}
                  {userIsCreator && (
                    <button
                      type="button"
                      onClick={() => setBillToDelete(bill)}
                      className="p-1.5 rounded-lg text-[#D9483B] dark:text-[#FF5A4E] hover:bg-[#D9483B]/10 dark:hover:bg-[#FF5A4E]/15 transition-colors cursor-pointer"
                      title="Delete bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Floating Action Button (FAB) "New Bill" (Requirement 1) */}
      <div className="fixed bottom-24 right-5 sm:right-8 z-30">
        <button
          type="button"
          onClick={handleOpenNewBill}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#ECBD56] hover:bg-[#DEAA3E] active:bg-[#C9972E] text-[#111216] font-bold text-sm shadow-xl hover:shadow-2xl border border-[#ECBD56] ring-4 ring-[#ECBD56]/25 active-scale transition-all cursor-pointer select-none"
          title="Create New Reimbursement Bill"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>New Bill</span>
        </button>
      </div>

      {/* 5. "NEW BILL" FORM MODAL (Requirement 1 & 2) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Reimbursement Bill"
        subtitle="Record out-of-pocket expenses for mess reimbursement"
        className="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-[#FDF1F0] dark:bg-[#331310] border border-[#F5A9A2] dark:border-[#991B1B] text-[#D9483B] dark:text-[#FF5A4E] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Bill Date & Time (Permits past dates!) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#ECBD56]" />
                <span>Bill Date &amp; Time</span>
              </span>
              <span className="text-[10px] text-[#4E525D] dark:text-[#9BA5B7] font-normal">
                (Past dates permitted)
              </span>
            </label>
            <input
              type="datetime-local"
              required
              value={billDateTime}
              onChange={(e) => setBillDateTime(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] outline-none focus:border-[#ECBD56] focus:ring-1 focus:ring-[#ECBD56]"
            />
          </div>

          {/* Paid By (Dropdown from Members) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#ECBD56]" />
              <span>Paid By (Member)</span>
            </label>
            <select
              value={paidByMemberId}
              onChange={(e) => setPaidByMemberId(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] outline-none focus:border-[#ECBD56] focus:ring-1 focus:ring-[#ECBD56]"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code}) {m.status === 'inactive' ? '• Inactive' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Expense Type (Category) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#ECBD56]" />
              <span>Expense Type / Category</span>
            </label>
            <input
              type="text"
              required
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              placeholder="e.g. Groceries, Vegetables, Mess Gas"
              className="w-full h-10 px-3 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] outline-none focus:border-[#ECBD56] focus:ring-1 focus:ring-[#ECBD56]"
            />
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {COMMON_EXPENSE_CATEGORIES.slice(0, 5).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setExpenseType(cat)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                    expenseType === cat
                      ? 'bg-[#ECBD56] text-[#111216] border-[#ECBD56]'
                      : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border-[#DDD9D0] dark:border-[#2A364B]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Line Items Table (Requirement 1) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                Line Items (Particulars &amp; Amounts)
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ECBD56] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] overflow-hidden bg-white dark:bg-[#171F2C]">
              <div className="grid grid-cols-12 gap-1.5 p-2 bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[11px] font-bold text-[#4E525D] dark:text-[#9BA5B7] border-b border-[#DDD9D0] dark:border-[#2A364B]">
                <div className="col-span-2 text-center">S.No</div>
                <div className="col-span-6">Particular</div>
                <div className="col-span-3 text-right">Amount (₹)</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-[#DDD9D0]/50 dark:divide-[#2A364B]/50 max-h-48 overflow-y-auto p-1.5 space-y-1">
                {lineItems.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center py-1">
                    <div className="col-span-2 text-center text-xs font-bold text-[#4E525D] dark:text-[#9BA5B7]">
                      #{item.sNo}
                    </div>
                    <div className="col-span-6">
                      <input
                        type="text"
                        required
                        value={item.particular}
                        onChange={(e) => handleLineItemChange(idx, 'particular', e.target.value)}
                        placeholder="e.g. Rice 25kg"
                        className="w-full h-8 px-2 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] rounded-lg border border-[#DDD9D0] dark:border-[#2A364B] outline-none focus:border-[#ECBD56]"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={item.amount}
                        onChange={(e) => handleLineItemChange(idx, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full h-8 px-2 text-xs text-right bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] font-bold rounded-lg border border-[#DDD9D0] dark:border-[#2A364B] outline-none focus:border-[#ECBD56]"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 rounded text-[#D9483B] dark:text-[#FF5A4E] hover:bg-[#D9483B]/10 cursor-pointer"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation Row */}
              <div className="flex items-center justify-between p-3 bg-[#F2F1ED] dark:bg-[#1F2A3C] border-t border-[#DDD9D0] dark:border-[#2A364B]">
                <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                  Auto Calculated Sum:
                </span>
                <span className="text-base font-black text-[#ECBD56]">
                  ₹{calculatedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Fixed Footer Text (Requirement 1) */}
          <div className="p-3 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] text-center text-xs font-semibold text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B]">
            Thank you for using this app
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              Save &amp; Generate Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. PRINT / PDF RECEIPT MODAL (Requirement 5) */}
      <Modal
        isOpen={Boolean(printBill)}
        onClose={() => setPrintBill(null)}
        title="Official Reimbursement Receipt"
        subtitle={`Receipt ${printBill?.receiptId || ''} • Creator Protected View`}
        className="max-w-md print:p-0 print:border-none print:shadow-none"
      >
        {printBill && (
          <div className="space-y-4">
            {/* Printable Receipt Canvas */}
            <div
              ref={printAreaRef}
              className="p-5 rounded-2xl bg-white text-[#111216] border-2 border-dashed border-[#DDD9D0] space-y-4 font-mono text-xs shadow-inner"
            >
              {/* Header */}
              <div className="text-center pb-3 border-b border-dashed border-gray-300">
                <div className="inline-block p-1.5 rounded-lg bg-[#ECBD56] text-[#111216] font-black text-xs mb-1">
                  VESSEL WASH
                </div>
                <h4 className="text-sm font-black tracking-tight uppercase">
                  Reimbursement Receipt
                </h4>
                <p className="text-[10px] text-gray-500">Official Out-of-Pocket Expense Record</p>
                <div className="mt-2 text-sm font-black text-[#845D08]">
                  RECEIPT ID: {printBill.receiptId}
                </div>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-gray-300">
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase font-bold">Date &amp; Time</span>
                  <span className="font-bold">{formatBillDisplayDate(printBill.billDateTime)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase font-bold">Expense Type</span>
                  <span className="font-bold">{printBill.expenseType}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase font-bold">Paid By</span>
                  <span className="font-bold">{printBill.paidByMemberName} ({printBill.paidByMemberCode})</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase font-bold">Recorded By</span>
                  <span className="font-bold">{printBill.creatorName}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-500">
                      <th className="text-left py-1 w-10">S.No</th>
                      <th className="text-left py-1">Particular</th>
                      <th className="text-right py-1 w-20">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(printBill.lineItems || []).map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="py-1 text-gray-400">#{it.sNo || idx + 1}</td>
                        <td className="py-1 font-medium">{it.particular}</td>
                        <td className="py-1 text-right font-bold">
                          ₹{Number(it.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grand Total */}
              <div className="pt-2 border-t-2 border-gray-900 flex items-center justify-between font-sans">
                <span className="font-bold text-sm">TOTAL AMOUNT:</span>
                <span className="text-xl font-black text-[#845D08]">
                  ₹{Number(printBill.totalAmount).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Fixed Footer Note (Requirement 1) */}
              <div className="pt-3 text-center border-t border-dashed border-gray-300 text-[11px] font-sans font-bold text-gray-600">
                {printBill.footerText || 'Thank you for using this app'}
              </div>
            </div>

            {/* Print/Download Button */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPrintBill(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Printer}
                onClick={handleExecutePrint}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(billToDelete)}
        onClose={() => setBillToDelete(null)}
        title="Delete Reimbursement Bill"
        subtitle={`Are you sure you want to delete receipt ${billToDelete?.receiptId}?`}
      >
        <div className="space-y-3">
          <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] leading-relaxed">
            This will permanently remove receipt <strong>{billToDelete?.receiptId}</strong> (₹{Number(billToDelete?.totalAmount || 0).toLocaleString('en-IN')}) from your reimbursement history.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setBillToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete}>
              Delete Receipt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
