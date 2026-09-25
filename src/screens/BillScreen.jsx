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
  X,
  Search,
  AlertCircle,
  FileText,
  Share2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';

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

/**
 * Generates an official clean A5 Expense Receipt PDF
 * Swapped layout:
 *   Left side: Expense Type and Paid By
 *   Right side: Date & Time and Recorded By
 * No "Vessel Wash" text, no "Thank you" footer.
 */
function generateExpenseReceiptPdf(bill) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a5',
  });

  // 1. Header: Expense Receipt (No Vessel Wash)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 18, 22);
  doc.text('EXPENSE RECEIPT', 210, 42, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(132, 93, 8);
  doc.text(`RECEIPT NO: ${bill.receiptId || '#00001'}`, 210, 60, { align: 'center' });

  // Divider
  doc.setDrawColor(215, 215, 215);
  doc.setLineWidth(1);
  doc.line(30, 72, 390, 72);

  // 2. Swapped Layout Columns:
  // Left Side: Expense Type and Paid By
  // Right Side: Date & Time and Recorded By
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('EXPENSE TYPE:', 30, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 18, 22);
  doc.text(String(bill.expenseType || 'General Expense'), 30, 102);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('PAID BY:', 30, 122);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 18, 22);
  doc.text(
    `${bill.paidByMemberName || 'Member'} ${bill.paidByMemberCode ? `(${bill.paidByMemberCode})` : ''}`,
    30,
    134
  );

  // Right Column
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('DATE & TIME:', 390, 90, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 18, 22);
  doc.text(formatBillDisplayDate(bill.billDateTime), 390, 102, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('RECORDED BY:', 390, 122, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 18, 22);
  doc.text(String(bill.creatorName || bill.paidByMemberName || 'User'), 390, 134, {
    align: 'right',
  });

  // 3. Particulars Line Items Table
  const tableData = (bill.lineItems || []).map((it, idx) => [
    `#${it.sNo || idx + 1}`,
    it.particular,
    `INR ${Number(it.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 152,
    head: [['S.No', 'Particular', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [242, 241, 237],
      textColor: [17, 18, 22],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [17, 18, 22],
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 95, halign: 'right' },
    },
    margin: { left: 30, right: 30 },
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 240;

  // 4. Total Amount in Bold
  doc.setDrawColor(17, 18, 22);
  doc.setLineWidth(1.5);
  doc.line(30, finalY + 12, 390, finalY + 12);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 18, 22);
  doc.text('TOTAL AMOUNT:', 30, finalY + 30);
  doc.text(
    `INR ${Number(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    390,
    finalY + 30,
    { align: 'right' }
  );

  return doc;
}

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
      if (selectedMonth !== 'all') {
        const billYm = getYearMonthKey(bill.billDateTime || bill.createdAt);
        if (billYm !== selectedMonth) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchReceipt = (bill.receiptId || '').toLowerCase().includes(q);
        const matchExpenseType = (bill.expenseType || '').toLowerCase().includes(q);
        const matchParticulars = (bill.lineItems || []).some(item =>
          (item.particular || '').toLowerCase().includes(q)
        );
        const matchPaidBy = (bill.paidByMemberName || '').toLowerCase().includes(q);
        return matchReceipt || matchExpenseType || matchParticulars || matchPaidBy;
      }
      return true;
    });
  }, [lifoBills, selectedMonth, searchQuery]);

  // Monthly Metrics Calculation (Requirement 4)
  const monthlyMetrics = useMemo(() => {
    const targetBills = userBills.filter(b => {
      if (selectedMonth === 'all') return true;
      return getYearMonthKey(b.billDateTime || b.createdAt) === selectedMonth;
    });

    const totalAmount = targetBills.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
    const count = targetBills.length;
    const avg = count > 0 ? totalAmount / count : 0;

    return { totalAmount, count, avg };
  }, [userBills, selectedMonth]);

  // Toggle Line Items Accordion
  const toggleExpand = (billId) => {
    setExpandedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(billId)) {
        next.delete(billId);
      } else {
        next.add(billId);
      }
      return next;
    });
  };

  // ----------------------------------------------------
  // "EXPENSE BILL" FORM MODAL STATE (Requirement 3)
  // ----------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billDateTime, setBillDateTime] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [lineItems, setLineItems] = useState([
    { id: 'item-1', sNo: 1, particular: '', amount: '' },
  ]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Open modal & initialize (Auto-binds Paid By to currently logged-in user)
  const handleOpenNewBill = () => {
    setBillDateTime(getLocalDateTimeString(new Date()));
    setExpenseType('');
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
      setFormError('Please specify the Expense Type.');
      return;
    }

    const validItems = lineItems.filter(
      item => item.particular.trim() && !isNaN(parseFloat(item.amount)) && parseFloat(item.amount) > 0
    );

    if (validItems.length === 0) {
      setFormError('Please provide at least one valid item with a description and positive amount.');
      return;
    }

    setSubmitting(true);
    try {
      const formattedItems = validItems.map((item, idx) => ({
        id: item.id || `item-${idx + 1}`,
        sNo: idx + 1,
        particular: item.particular.trim(),
        amount: parseFloat(item.amount),
      }));

      const totalAmount = formattedItems.reduce((acc, item) => acc + item.amount, 0);

      // Auto-bound strictly to current logged-in user (Requirement 3)
      if (onSaveBill) {
        await onSaveBill({
          billDateTime,
          paidByMemberId: currentMember?.id || 'm1',
          paidByMemberName: currentMember?.name || 'Member',
          paidByMemberCode: currentMember?.code || 'M1',
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
  // COMBINED DOWNLOAD & SHARE ACTION (Requirement 2)
  // Direct Download + Native Share sheet, zero print option
  // ----------------------------------------------------
  const [previewBill, setPreviewBill] = useState(null);

  const handleDownloadAndShareReceipt = async (bill) => {
    if (!bill || !isCreator(bill)) return;
    try {
      const cleanId = String(bill.receiptId || '00001').replace('#', '').trim();
      const filename = `Expense_Receipt_${cleanId}.pdf`;
      const doc = generateExpenseReceiptPdf(bill);

      // 1. DIRECT DOWNLOAD
      doc.save(filename);

      // 2. DIRECT SHARE
      try {
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
        const shareData = {
          title: `Expense Receipt ${bill.receiptId}`,
          text: `Expense Receipt ${bill.receiptId} • Total: ₹${Number(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${bill.expenseType}) - Paid by ${bill.paidByMemberName}`,
        };

        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            ...shareData,
            files: [pdfFile],
          });
        } else if (navigator.share) {
          await navigator.share(shareData);
        }
      } catch (shareErr) {
        if (shareErr.name !== 'AbortError') {
          console.warn('[Receipt] Share sheet dismissed or unavailable:', shareErr);
        }
      }
    } catch (err) {
      console.error('[Receipt] Failed to download and share receipt:', err);
    }
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
      {/* 1. Monthly Expense Section Header & Metric Cards (Requirement 4) */}
      <div className="p-4 sm:p-5 rounded-[22px] bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs space-y-3.5">
        <div className="pb-3 border-b border-[#DDD9D0]/70 dark:border-[#2A364B]/70">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ECBD56]">
              Expense Management
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ECBD56]/20 text-[#ECBD56] border border-[#ECBD56]/40">
              LIFO Feed
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111216] dark:text-[#F7F6F3] mt-0.5">
            Monthly Expense
          </h2>
          <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] mt-0.5">
            Personal out-of-pocket expense ledger &bull; Creator-scoped history
          </p>
        </div>

        {/* 2. Consistent Filter UI Pattern (Search on left, Month Tabs on right) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#848A96] dark:text-[#64748B] absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipts by ID, particular, or expense type..."
              className="w-full h-10 pl-9 pr-9 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] placeholder-[#848A96] dark:placeholder-[#64748B] focus:outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[#848A96] dark:text-[#64748B] hover:text-[#111216] dark:hover:text-[#F7F6F3] p-0.5 rounded-full hover:bg-white dark:hover:bg-[#171F2C] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Month Filter Pills */}
          <div className="flex items-center gap-1 bg-[#F2F1ED] dark:bg-[#1F2A3C] p-1 rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#ECBD56] shadow-xs'
                  : 'text-[#4E525D] dark:text-[#9BA5B7] hover:text-[#111216] dark:hover:text-[#F7F6F3]'
              }`}
            >
              All History
            </button>
            {distinctMonths.map(ym => (
              <button
                key={ym}
                type="button"
                onClick={() => setSelectedMonth(ym)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedMonth === ym
                    ? 'bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#ECBD56] shadow-xs'
                    : 'text-[#4E525D] dark:text-[#9BA5B7] hover:text-[#111216] dark:hover:text-[#F7F6F3]'
                }`}
              >
                {formatMonthTitle(ym)}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Summary Metrics: Exact 3 Requested Metric Labels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B]">
            <span className="text-[11px] font-semibold text-[#4E525D] dark:text-[#9BA5B7] block">
              Total Monthly Expense Amount
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#ECBD56] tracking-tight">
                ₹{monthlyMetrics.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold text-[#4E525D] dark:text-[#9BA5B7]">INR</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B]">
            <span className="text-[11px] font-semibold text-[#4E525D] dark:text-[#9BA5B7] block">
              Total Receipts
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
              Avg. Spent Amount
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#111216] dark:text-[#F7F6F3] tracking-tight">
                ₹{monthlyMetrics.avg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-[#4E525D] dark:text-[#9BA5B7]">avg / receipt</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LIFO History Cards Feed (Requirement 2) */}
      {displayedBills.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-[22px] bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#ECBD56]/15 text-[#ECBD56] flex items-center justify-center mx-auto border border-[#ECBD56]/30 shadow-xs">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111216] dark:text-[#F7F6F3]">
              No Expense Receipts Found
            </h3>
            <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] max-w-sm mx-auto mt-1 leading-relaxed">
              {searchQuery
                ? `No receipts matched "${searchQuery}". Clear your search or change the month filter.`
                : 'You have not recorded any expenses for this period. Tap the "New Bill" button below to log your first expense!'}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenNewBill}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ECBD56] hover:bg-[#DEAA3E] text-[#111216] text-xs font-bold shadow-xs active-scale transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Expense</span>
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
                {/* Top Row: Primary Heading = Receipt No. + Expense Date & Total Amount */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Primary Heading: Receipt No. */}
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-[#111216] dark:text-[#F7F6F3]">
                        {bill.receiptId || '#00001'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] text-[11px] font-semibold border border-[#DDD9D0] dark:border-[#2A364B]">
                        {bill.expenseType || 'General Expense'}
                      </span>
                    </div>

                    {/* Member Name in Small Text Size */}
                    <p className="text-[11px] font-medium text-[#4E525D] dark:text-[#9BA5B7]">
                      Paid by{' '}
                      <span className="font-bold text-[#111216] dark:text-[#F7F6F3]">
                        {bill.paidByMemberName || currentMember?.name}
                      </span>
                      {bill.paidByMemberCode ? ` (${bill.paidByMemberCode})` : ''}
                    </p>
                  </div>

                  {/* Expense Date and Total Amount */}
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-semibold text-[#4E525D] dark:text-[#9BA5B7] flex items-center justify-end gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#ECBD56]" />
                      {formatBillDisplayDate(bill.billDateTime)}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-[#ECBD56] tracking-tight block mt-0.5">
                      ₹{Number(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Particulars / Line Items Summary */}
                <div className="rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] p-3 border border-[#DDD9D0] dark:border-[#2A364B]">
                  <div
                    onClick={() => toggleExpand(bill.id)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#4E525D] dark:text-[#9BA5B7] block">
                        Particulars Summary
                      </span>
                      <p className="text-xs font-semibold text-[#111216] dark:text-[#F7F6F3] truncate mt-0.5">
                        {(bill.lineItems || []).map(it => it.particular).filter(Boolean).join(', ') || 'No line items recorded'}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="text-xs font-bold text-[#ECBD56] hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>{isExpanded ? 'Hide' : `View (${bill.lineItems?.length || 0})`}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expandable itemized table with sleek rounded corners */}
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
                                ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-[#DDD9D0] dark:border-[#2A364B] font-bold">
                            <td colSpan={2} className="pt-2 text-right text-[#4E525D] dark:text-[#9BA5B7]">
                              Total:
                            </td>
                            <td className="pt-2 text-right text-sm text-[#ECBD56] font-black">
                              ₹{Number(bill.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Actions Arrangement (Requirement 2):
                    Trash (delete) icon placed IMMEDIATELY BEFORE the download receipt button on the right */}
                <div className="flex items-center justify-between pt-1">
                  {/* Left: Preview Receipt Trigger */}
                  <button
                    type="button"
                    onClick={() => setPreviewBill(bill)}
                    className="text-xs font-semibold text-[#4E525D] dark:text-[#9BA5B7] hover:text-[#ECBD56] dark:hover:text-[#ECBD56] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5 text-[#ECBD56]" />
                    <span>View Receipt</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Trash (Delete) icon immediately BEFORE download button */}
                    {userIsCreator && (
                      <button
                        type="button"
                        onClick={() => setBillToDelete(bill)}
                        className="p-2 rounded-xl text-[#D9483B] dark:text-[#FF5A4E] hover:bg-[#D9483B]/10 dark:hover:bg-[#FF5A4E]/15 border border-[#DDD9D0] dark:border-[#2A364B] transition-colors cursor-pointer"
                        title="Delete Receipt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Download Receipt Button (triggers both download & share, no print) */}
                    {userIsCreator && (
                      <button
                        type="button"
                        onClick={() => handleDownloadAndShareReceipt(bill)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ECBD56] hover:bg-[#DEAA3E] text-[#111216] text-xs font-bold shadow-2xs active-scale transition-all cursor-pointer"
                        title="Download and Share PDF Receipt"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Floating Action Button (FAB) "New Bill" */}
      <div className="fixed bottom-24 right-5 sm:right-8 z-30">
        <button
          type="button"
          onClick={handleOpenNewBill}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#ECBD56] hover:bg-[#DEAA3E] active:bg-[#C9972E] text-[#111216] font-bold text-sm shadow-xl hover:shadow-2xl border border-[#ECBD56] ring-4 ring-[#ECBD56]/25 active-scale transition-all cursor-pointer select-none"
          title="Create Expense Bill"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>New Bill</span>
        </button>
      </div>

      {/* 6. "EXPENSE BILL" FORM MODAL (Requirement 3) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Expense Bill"
        subtitle="Record an out-of-pocket expense"
        className="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-[#FDF1F0] dark:bg-[#331310] border border-[#F5A9A2] dark:border-[#991B1B] text-[#D9483B] dark:text-[#FF5A4E] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Bill Date & Time */}
          <div className="space-y-1.5">
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
              className="w-full h-10 px-3.5 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 transition-all"
            />
          </div>

          {/* Paid By - RESTRICTED & AUTO-BOUND TO CURRENT LOGGED-IN USER */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#ECBD56]" />
              <span>Paid By</span>
            </label>
            <div className="w-full h-10 px-3.5 flex items-center justify-between text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B]">
              <span className="font-bold">
                {currentMember?.name || 'Member'} {currentMember?.code ? `(${currentMember.code})` : ''}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ECBD56]/20 text-[#ECBD56] border border-[#ECBD56]/30">
                Logged In User
              </span>
            </div>
          </div>

          {/* Expense Type - STRICTLY CLEAN TEXT INPUT, NO CATEGORY SUGGESTIONS */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#ECBD56]" />
              <span>Expense Type</span>
            </label>
            <input
              type="text"
              required
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              placeholder="Enter expense type (e.g. Vegetables, Grocery, Gas Refill)"
              className="w-full h-10 px-3.5 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 transition-all placeholder-[#848A96] dark:placeholder-[#64748B]"
            />
          </div>

          {/* Line Items Table with Minimal Sleek Rounded Corners */}
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
              <div className="grid grid-cols-12 gap-1.5 p-2.5 bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[11px] font-bold text-[#4E525D] dark:text-[#9BA5B7] border-b border-[#DDD9D0] dark:border-[#2A364B]">
                <div className="col-span-2 text-center">S.No</div>
                <div className="col-span-6">Particular</div>
                <div className="col-span-3 text-right">Amount (₹)</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-[#DDD9D0]/50 dark:divide-[#2A364B]/50 max-h-52 overflow-y-auto p-1.5 space-y-1">
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
                        placeholder="Particular description"
                        className="w-full h-8 px-2.5 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] rounded-lg border border-[#DDD9D0] dark:border-[#2A364B] outline-none focus:border-[#ECBD56] focus:ring-1 focus:ring-[#ECBD56]"
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
                        className="w-full h-8 px-2.5 text-xs text-right bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] font-bold rounded-lg border border-[#DDD9D0] dark:border-[#2A364B] outline-none focus:border-[#ECBD56] focus:ring-1 focus:ring-[#ECBD56]"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 rounded-md text-[#D9483B] dark:text-[#FF5A4E] hover:bg-[#D9483B]/10 cursor-pointer transition-colors"
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
                  ₹{calculatedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DDD9D0]/70 dark:border-[#2A364B]/70">
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

      {/* 7. EXPENSE RECEIPT MODAL VIEW (Requirement 1) */}
      <Modal
        isOpen={Boolean(previewBill)}
        onClose={() => setPreviewBill(null)}
        title="Expense Receipt"
        subtitle={`Receipt ${previewBill?.receiptId || ''} • Creator Protected View`}
        className="max-w-md"
      >
        {previewBill && (
          <div className="space-y-4">
            {/* Clean Receipt Canvas: No "Vessel Wash", Title: "EXPENSE RECEIPT", Swapped Columns, No Footer Notice */}
            <div className="p-5 rounded-2xl bg-white text-[#111216] border-2 border-dashed border-[#DDD9D0] space-y-4 font-mono text-xs shadow-inner">
              {/* Header */}
              <div className="text-center pb-3 border-b border-dashed border-gray-300">
                <h4 className="text-base font-black tracking-tight uppercase text-[#111216]">
                  Expense Receipt
                </h4>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                  Official Out-of-Pocket Expense Record
                </p>
                <div className="mt-2 text-sm font-black text-[#845D08]">
                  RECEIPT NO: {previewBill.receiptId}
                </div>
              </div>

              {/* Swapped Columns (Requirement 1):
                  Left side: Expense Type and Paid By
                  Right side: Date & Time and Recorded By */}
              <div className="grid grid-cols-2 gap-3 text-[11px] pb-3 border-b border-dashed border-gray-300 text-left font-sans">
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-bold">
                      Expense Type
                    </span>
                    <span className="font-bold text-[#111216] block mt-0.5">
                      {previewBill.expenseType}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-bold">
                      Paid By
                    </span>
                    <span className="font-bold text-[#111216] block mt-0.5">
                      {previewBill.paidByMemberName} {previewBill.paidByMemberCode ? `(${previewBill.paidByMemberCode})` : ''}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-bold">
                      Date &amp; Time
                    </span>
                    <span className="font-bold text-[#111216] block mt-0.5">
                      {formatBillDisplayDate(previewBill.billDateTime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-bold">
                      Recorded By
                    </span>
                    <span className="font-bold text-[#111216] block mt-0.5">
                      {previewBill.creatorName || previewBill.paidByMemberName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Particulars Items Table */}
              <div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-500 font-sans">
                      <th className="text-left py-1 w-10">S.No</th>
                      <th className="text-left py-1">Particular</th>
                      <th className="text-right py-1 w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(previewBill.lineItems || []).map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="py-1 text-gray-400">#{it.sNo || idx + 1}</td>
                        <td className="py-1 font-medium">{it.particular}</td>
                        <td className="py-1 text-right font-bold text-[#111216]">
                          ₹{Number(it.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                  ₹{Number(previewBill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Combined Action Buttons: No print option, only Download & Share and Close */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewBill(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Download}
                onClick={() => handleDownloadAndShareReceipt(previewBill)}
              >
                Download &amp; Share
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 8. Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(billToDelete)}
        onClose={() => setBillToDelete(null)}
        title="Delete Expense Receipt"
        subtitle={`Are you sure you want to delete receipt ${billToDelete?.receiptId}?`}
      >
        <div className="space-y-3">
          <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] leading-relaxed">
            This will permanently remove receipt <strong>{billToDelete?.receiptId}</strong> (₹{Number(billToDelete?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}) from your expense history.
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
