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
  FileSpreadsheet,
  Share2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
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
 * Format short date (e.g., "25 Sep 2026")
 */
function formatShortDate(dateTimeStr) {
  if (!dateTimeStr) return 'N/A';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
 * Renders a single receipt onto a jsPDF document page with 100% UI template parity.
 * Matches on-screen receipt:
 *   - Centered EXPENSE RECEIPT title
 *   - RECEIPT NO: #0000X
 *   - Left: Expense Type & Paid By
 *   - Right: Date & Time & Recorded By
 *   - Particulars table
 *   - Total Amount in bold
 *   - Zero "Vessel Wash" branding and zero "Thank you" footer
 */
function renderSingleReceiptPage(doc, bill, startY = 42) {
  // 1. Header: EXPENSE RECEIPT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 18, 22);
  doc.text('EXPENSE RECEIPT', 210, startY, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(132, 93, 8);
  doc.text(`RECEIPT NO: ${bill.receiptId || '#00001'}`, 210, startY + 18, { align: 'center' });

  // Top Divider
  doc.setDrawColor(215, 215, 215);
  doc.setLineWidth(1);
  doc.line(30, startY + 28, 390, startY + 28);

  // 2. Swapped Layout Columns:
  // Left Side: Expense Type and Paid By
  // Right Side: Date & Time and Recorded By
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('EXPENSE TYPE:', 30, startY + 44);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 18, 22);
  doc.text(String(bill.expenseType || 'General Expense'), 30, startY + 56);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('PAID BY:', 30, startY + 76);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 18, 22);
  doc.text(
    `${bill.paidByMemberName || 'Member'} ${bill.paidByMemberCode ? `(${bill.paidByMemberCode})` : ''}`,
    30,
    startY + 88
  );

  // Right Column
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('DATE & TIME:', 390, startY + 44, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 18, 22);
  doc.text(formatBillDisplayDate(bill.billDateTime), 390, startY + 56, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('RECORDED BY:', 390, startY + 76, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 18, 22);
  doc.text(String(bill.creatorName || bill.paidByMemberName || 'User'), 390, startY + 88, {
    align: 'right',
  });

  // Intermediate Divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.8);
  doc.line(30, startY + 98, 390, startY + 98);

  // 3. Particulars Line Items Table
  const tableData = (bill.lineItems || []).map((it, idx) => [
    `#${it.sNo || idx + 1}`,
    it.particular,
    `INR ${Number(it.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: startY + 104,
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

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : startY + 180;

  // 4. Total Amount in Bold
  doc.setDrawColor(17, 18, 22);
  doc.setLineWidth(1.5);
  doc.line(30, finalY + 12, 390, finalY + 12);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 18, 22);
  doc.text('TOTAL AMOUNT:', 30, finalY + 30);
  doc.text(
    `INR ${Number(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    390,
    finalY + 30,
    { align: 'right' }
  );

  return finalY + 35;
}

/**
 * Convert Date to YYYY-MM-DD for date input
 */
function toDateInputString(dateObj = new Date()) {
  try {
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Generates the official Cover Page for Consolidated Expense Report
 * Features:
 *   - Title: CONSOLIDATED EXPENSE REPORT
 *   - Paid By (User) and Code
 *   - Date Range / Period
 *   - Total Receipts Count and Consolidated Grand Total
 *   - Consolidated Calculation Breakdown Box (e.g. Bill 1 Amount + Bill 2 Amount = Total Sum)
 *   - Receipts Index Table in LIFO order
 */
function renderReportCoverPage(doc, {
  bills = [],
  currentMember = null,
  dateRangeStr = '',
  totalAmount = 0,
  formulaStr = '',
  detailedFormulaStr = '',
}) {
  const totalCount = bills.length;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 18, 22);
  doc.text('CONSOLIDATED EXPENSE REPORT', pageWidth / 2, 42, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Official Out-of-Pocket Expense Summary • Multi-Receipt Audit', pageWidth / 2, 56, { align: 'center' });

  // Accent Gold Bar
  doc.setFillColor(236, 189, 86);
  doc.rect((pageWidth - 70) / 2, 63, 70, 2, 'F');

  // Summary Metadata Card Box
  doc.setFillColor(242, 241, 237);
  doc.setDrawColor(221, 217, 208);
  doc.roundedRect(26, 72, pageWidth - 52, 66, 5, 5, 'FD');

  // Box Content: Paid By, Date Range, Total Receipts, Total Consolidated Amount
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(132, 93, 8);
  doc.text('PAID BY (USER):', 38, 86);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 18, 22);
  doc.text(
    `${currentMember?.name || 'Member'} ${currentMember?.code ? `(${currentMember.code})` : ''}`,
    38,
    98
  );

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(132, 93, 8);
  doc.text('DATE RANGE / PERIOD:', 220, 86);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 18, 22);
  doc.text(dateRangeStr || 'All History', 220, 98);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(132, 93, 8);
  doc.text('TOTAL RECEIPTS:', 38, 116);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 18, 22);
  doc.text(`${totalCount} Receipts`, 38, 128);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(132, 93, 8);
  doc.text('CONSOLIDATED GRAND TOTAL:', 220, 116);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(132, 93, 8);
  doc.text(
    `INR ${Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    220,
    128
  );

  // Consolidated Sum Formula Box (Requirements 2: Total amount paid by user breakdown e.g. Bill 1 Amount + Bill 2 Amount = Total Sum)
  let nextY = 144;
  if (formulaStr) {
    doc.setFillColor(254, 252, 243);
    doc.setDrawColor(236, 189, 86);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    const formulaLines = doc.splitTextToSize(formulaStr, pageWidth - 76);
    const boxHeight = Math.max(30, 14 + formulaLines.length * 9);

    doc.roundedRect(26, nextY, pageWidth - 52, boxHeight, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(132, 93, 8);
    doc.text('CONSOLIDATED SUM CALCULATION (USER EXPENSE BREAKDOWN):', 36, nextY + 10);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(17, 18, 22);
    doc.text(formulaLines, 36, nextY + 20);

    nextY += boxHeight + 8;
  }

  // Summary Index Table Header
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 18, 22);
  doc.text('RECEIPTS INDEX (LIFO ORDER):', 26, nextY + 4);

  // Index Table Body
  const indexRows = bills.map((b) => [
    b.receiptId || '#00001',
    formatShortDate(b.billDateTime),
    b.expenseType || 'General',
    `${b.lineItems?.length || 0}`,
    `INR ${Number(b.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: nextY + 10,
    head: [['Receipt No.', 'Date', 'Expense Type', 'Items', 'Amount']],
    body: indexRows,
    theme: 'plain',
    headStyles: {
      fillColor: [236, 189, 86],
      textColor: [17, 18, 22],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [17, 18, 22],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 65 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 80, halign: 'right' },
    },
    margin: { left: 26, right: 26 },
  });

  const finalCoverY = doc.lastAutoTable ? doc.lastAutoTable.finalY : nextY + 90;

  // Cover Page Total Row
  doc.setDrawColor(17, 18, 22);
  doc.setLineWidth(1.2);
  doc.line(26, finalCoverY + 6, pageWidth - 26, finalCoverY + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 18, 22);
  doc.text('CONSOLIDATED GRAND TOTAL:', 26, finalCoverY + 16);
  doc.text(
    `INR ${Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    pageWidth - 26,
    finalCoverY + 16,
    { align: 'right' }
  );

  // Cover Page Footer Notice
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated on ${formatBillDisplayDate(new Date().toISOString())} • Page 1 of ${totalCount + 1}`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );
}

/**
 * Scalloped / saw-tooth perforated paper cut edge SVG
 */
export function ThermalSawtoothEdge({ position = 'top' }) {
  return (
    <div className="w-full overflow-hidden leading-none select-none block" style={{ height: '8px', lineHeight: 0 }}>
      <svg
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        className="w-full h-full text-white fill-current block"
        style={{ display: 'block', width: '100%', height: '8px' }}
      >
        {position === 'top' ? (
          <polygon points="0,8 2.5,0 5,8 7.5,0 10,8 12.5,0 15,8 17.5,0 20,8 22.5,0 25,8 27.5,0 30,8 32.5,0 35,8 37.5,0 40,8 42.5,0 45,8 47.5,0 50,8 52.5,0 55,8 57.5,0 60,8 62.5,0 65,8 67.5,0 70,8 72.5,0 75,8 77.5,0 80,8 82.5,0 85,8 87.5,0 90,8 92.5,0 95,8 97.5,0 100,8" />
        ) : (
          <polygon points="0,0 2.5,8 5,0 7.5,8 10,0 12.5,8 15,0 17.5,8 20,0 22.5,8 25,0 27.5,8 30,0 32.5,8 35,0 37.5,8 40,0 42.5,8 45,0 47.5,8 50,0 52.5,8 55,0 57.5,8 60,0 62.5,8 65,0 67.5,8 70,0 72.5,8 75,0 77.5,8 80,0 82.5,8 85,0 87.5,8 90,0 92.5,8 95,0 97.5,8 100,0" />
        )}
      </svg>
    </div>
  );
}

/**
 * Exact Thermal Cash Receipt UI Component
 * Features:
 *   - Jagged / saw-tooth perforated paper edges (top & bottom)
 *   - Centered shop / store header (* EXPENSE RECEIPT *, RECEIPT NO)
 *   - Asterisk divider lines (* * * * * * * * * *)
 *   - Swapped metadata columns (Left: Expense Type & Paid By, Right: Date & Time & Recorded By)
 *   - HTML table with fixed layout and S.No, DESCRIPTION, PRICE(INR) columns
 *   - Total section with double borders
 *   - Zero barcode, zero footer text, zero "Cash Voucher" label
 */
export function ThermalReceipt({ bill }) {
  if (!bill) return null;
  return (
    <div
      className="mx-auto select-none"
      style={{
        width: '360px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Jagged Top Perforation */}
      <ThermalSawtoothEdge position="top" />

      {/* Thermal Paper Body */}
      <div
        className="bg-white text-[#111216]"
        style={{
          padding: '16px 18px',
          boxSizing: 'border-box',
        }}
      >
        {/* Centered Store Header */}
        <div className="text-center" style={{ marginBottom: '10px' }}>
          <div
            className="text-[10px] tracking-widest text-[#666] font-bold select-none overflow-hidden"
            style={{ whiteSpace: 'nowrap', marginBottom: '3px' }}
          >
            * * * * * * * * * * * * * * * * * * * *
          </div>
          <h3
            className="text-base font-black tracking-wider uppercase text-[#111216]"
            style={{ margin: '2px 0' }}
          >
            * EXPENSE RECEIPT *
          </h3>
          <div
            className="text-xs font-black tracking-wide text-[#111216]"
            style={{ margin: '3px 0' }}
          >
            RECEIPT NO: {bill.receiptId || '#00001'}
          </div>
          <div
            className="text-[10px] tracking-widest text-[#666] font-bold select-none overflow-hidden"
            style={{ whiteSpace: 'nowrap', marginTop: '3px' }}
          >
            * * * * * * * * * * * * * * * * * * * *
          </div>
        </div>

        {/* Metadata Section - Swapped Columns:
            Left Side: Expense Type & Paid By
            Right Side: Date & Time & Recorded By */}
        <div
          className="pb-2.5 text-left border-b border-dashed border-gray-300"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '11px',
            lineHeight: '1.35',
            marginBottom: '8px',
          }}
        >
          <div style={{ flex: '1 1 50%', minWidth: 0 }}>
            <div style={{ marginBottom: '6px' }}>
              <span className="text-[9px] uppercase font-bold text-gray-500 block tracking-wider">
                EXPENSE TYPE
              </span>
              <span className="font-black text-[#111216] block break-words" style={{ fontSize: '11px' }}>
                {bill.expenseType || 'General Expense'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-500 block tracking-wider">
                PAID BY
              </span>
              <span className="font-black text-[#111216] block break-words" style={{ fontSize: '11px' }}>
                {bill.paidByMemberName || 'Member'} {bill.paidByMemberCode ? `(${bill.paidByMemberCode})` : ''}
              </span>
            </div>
          </div>

          <div style={{ flex: '1 1 50%', textAlign: 'right', minWidth: 0 }}>
            <div style={{ marginBottom: '6px' }}>
              <span className="text-[9px] uppercase font-bold text-gray-500 block tracking-wider">
                DATE &amp; TIME
              </span>
              <span className="font-bold text-[#111216] block whitespace-nowrap" style={{ fontSize: '10.5px' }}>
                {formatBillDisplayDate(bill.billDateTime)}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-500 block tracking-wider">
                RECORDED BY
              </span>
              <span className="font-bold text-[#111216] block break-words" style={{ fontSize: '11px' }}>
                {bill.creatorName || bill.paidByMemberName || 'User'}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="text-center text-[10px] tracking-widest text-gray-400 select-none overflow-hidden"
          style={{ whiteSpace: 'nowrap', margin: '6px 0' }}
        >
          - - - - - - - - - - - - - - - - - - - -
        </div>

        {/* Line Items Table with S.No Column Header */}
        <div style={{ margin: '6px 0' }}>
          <table
            style={{
              width: '100%',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              fontSize: '11px',
            }}
          >
            <thead>
              <tr
                className="text-[10px] font-black uppercase text-gray-600 border-b border-gray-300"
                style={{ lineHeight: '1.4' }}
              >
                <th style={{ width: '18%', textAlign: 'left', paddingBottom: '4px' }}>S.No</th>
                <th style={{ width: '52%', textAlign: 'left', paddingBottom: '4px' }}>DESCRIPTION</th>
                <th style={{ width: '30%', textAlign: 'right', paddingBottom: '4px' }}>PRICE(INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-gray-200">
              {(bill.lineItems || []).map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ width: '18%', padding: '4px 0', verticalAlign: 'top', color: '#6b7280', fontWeight: 'bold' }}>
                    #{item.sNo || idx + 1}
                  </td>
                  <td
                    style={{
                      width: '52%',
                      padding: '4px 4px 4px 0',
                      verticalAlign: 'top',
                      fontWeight: 'bold',
                      color: '#111216',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.particular}
                  </td>
                  <td
                    style={{
                      width: '30%',
                      padding: '4px 0',
                      verticalAlign: 'top',
                      textAlign: 'right',
                      fontWeight: '900',
                      color: '#111216',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {Number(item.amount).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Divider */}
        <div
          className="text-center text-[10px] tracking-widest text-gray-400 select-none overflow-hidden"
          style={{ whiteSpace: 'nowrap', margin: '6px 0' }}
        >
          = = = = = = = = = = = = = = = = = = = =
        </div>

        {/* Total Section with Double Border Style */}
        <div style={{ padding: '4px 0' }}>
          <div
            className="flex justify-between items-center text-xs font-bold text-gray-600"
            style={{ marginBottom: '3px' }}
          >
            <span>ITEMS COUNT:</span>
            <span>{bill.lineItems?.length || 0}</span>
          </div>
          <div
            className="flex justify-between items-center text-xs font-bold text-gray-600"
            style={{ marginBottom: '3px' }}
          >
            <span>SUBTOTAL:</span>
            <span>
              INR {Number(bill.totalAmount || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div
            className="flex justify-between items-center text-xs font-bold text-gray-600"
            style={{ marginBottom: '6px' }}
          >
            <span>TAX / DEDUCTION (0%):</span>
            <span>INR 0.00</span>
          </div>
          <div
            className="pt-2 border-t-2 border-b-2 border-black flex justify-between items-center"
            style={{ padding: '6px 0' }}
          >
            <span className="font-black text-xs uppercase tracking-wide text-black">
              TOTAL AMOUNT:
            </span>
            <span className="font-black text-sm text-black tracking-tight whitespace-nowrap">
              INR {Number(bill.totalAmount || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Jagged Bottom Perforation */}
      <ThermalSawtoothEdge position="bottom" />
    </div>
  );
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
  // 1. Creator Scoping & Verification (Only creator can see and delete)
  const isCreator = (bill) => {
    if (!bill) return false;
    if (!currentMember && !userEmail) return true;

    const curId = currentMember?.id ? String(currentMember.id).toLowerCase().trim() : '';
    const curName = currentMember?.name ? currentMember.name.toLowerCase().trim() : '';
    const curEmail = (userEmail || currentMember?.email || '').toLowerCase().trim();
    const curPrefix = curEmail ? curEmail.split('@')[0] : '';

    const billCreatedBy = bill.createdBy ? String(bill.createdBy).toLowerCase().trim() : '';
    const billCreatorEmail = bill.creatorEmail ? bill.creatorEmail.toLowerCase().trim() : '';
    const billCreatorName = bill.creatorName ? bill.creatorName.toLowerCase().trim() : '';
    const billPaidById = bill.paidByMemberId ? String(bill.paidByMemberId).toLowerCase().trim() : '';
    const billPaidByName = bill.paidByMemberName ? bill.paidByMemberName.toLowerCase().trim() : '';

    const curCode = currentMember?.code ? String(currentMember.code).toLowerCase().trim() : '';
    const billPaidByCode = bill.paidByMemberCode ? String(bill.paidByMemberCode).toLowerCase().trim() : '';

    if (curId && billCreatedBy && (curId === billCreatedBy || billCreatedBy.includes(curId) || curId.includes(billCreatedBy))) return true;
    if (curCode && billPaidByCode && curCode === billPaidByCode) return true;
    if (curEmail && billCreatorEmail && curEmail === billCreatorEmail) return true;
    if (curPrefix && billCreatorEmail && (curPrefix === billCreatorEmail.split('@')[0] || billCreatorEmail.startsWith(curPrefix))) return true;
    if (curName && billCreatorName && (curName === billCreatorName || curName.includes(billCreatorName) || billCreatorName.includes(curName))) return true;
    if (curId && billPaidById && (curId === billPaidById || billPaidById.includes(curId) || curId.includes(billPaidById))) return true;
    if (curName && billPaidByName && (curName === billPaidByName || curName.includes(billPaidByName) || billPaidByName.includes(curName))) return true;

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

  const [selectedMonth, setSelectedMonth] = useState('all');

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

  // Monthly Metrics Calculation
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

  // Compute Human-Readable Date Range for Consolidated Export Cover Page
  const computedDateRangeStr = useMemo(() => {
    if (selectedMonth !== 'all') {
      return formatMonthTitle(selectedMonth);
    }
    if (displayedBills.length === 0) return 'All History';

    const dates = displayedBills
      .map(b => new Date(b.billDateTime || b.createdAt).getTime())
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);

    if (dates.length === 0) return 'All History';
    const firstStr = formatShortDate(new Date(dates[0]).toISOString());
    const lastStr = formatShortDate(new Date(dates[dates.length - 1]).toISOString());
    return firstStr === lastStr ? firstStr : `${firstStr} - ${lastStr}`;
  }, [selectedMonth, displayedBills]);

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
  // "EXPENSE BILL" FORM MODAL STATE
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

      // Auto-bound strictly to current logged-in user
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

        // Ensure newly created bill is instantly visible in LIFO view
        setSelectedMonth('all');
        setSearchQuery('');
      }

      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save bill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // DOWNLOAD & EXPORT ACTIONS (Thermal PNG & Consolidated Report)
  // ----------------------------------------------------
  const [previewBill, setPreviewBill] = useState(null);
  const [exportingReport, setExportingReport] = useState(false);
  const [exportingBill, setExportingBill] = useState(null);
  const [exportingPng, setExportingPng] = useState(false);
  const offscreenReceiptRef = useRef(null);

  // Date Range Selector & Consolidated Report State (Requirement 2)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeRangePreset, setActiveRangePreset] = useState('this_month');
  const [exportStartDate, setExportStartDate] = useState(() => {
    const now = new Date();
    return toDateInputString(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [exportEndDate, setExportEndDate] = useState(() => {
    return toDateInputString(new Date());
  });
  const [reportProgress, setReportProgress] = useState({ current: 0, total: 0 });
  const [exportingReportBill, setExportingReportBill] = useState(null);
  const offscreenReportBillRef = useRef(null);

  // Filter bills matching selected date range for consolidated export
  const matchingReportBills = useMemo(() => {
    return userBills
      .filter(bill => {
        const bDate = bill.billDateTime || bill.createdAt;
        if (!bDate) return true;
        const bDateStr = toDateInputString(new Date(bDate));
        if (exportStartDate && bDateStr < exportStartDate) return false;
        if (exportEndDate && bDateStr > exportEndDate) return false;
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.billDateTime).getTime();
        const timeB = new Date(b.createdAt || b.billDateTime).getTime();
        return timeB - timeA; // strict LIFO order
      });
  }, [userBills, exportStartDate, exportEndDate]);

  // Total amount of matching report bills
  const reportTotalSum = useMemo(() => {
    return matchingReportBills.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
  }, [matchingReportBills]);

  // Consolidated Sum Calculation breakdown string (Requirement 2: e.g. Bill 1 Amount + Bill 2 Amount = Total Sum)
  const consolidatedFormulaStr = useMemo(() => {
    if (matchingReportBills.length === 0) return 'No receipts in selected range';
    if (matchingReportBills.length === 1) {
      const b = matchingReportBills[0];
      const amt = Number(b.totalAmount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${b.receiptId || '#00001'} (₹${amt}) = ₹${amt}`;
    }
    const amountsStr = matchingReportBills
      .map(b => '₹' + Number(b.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      .join(' + ');
    const totalStr = '₹' + Number(reportTotalSum).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${amountsStr} = ${totalStr}`;
  }, [matchingReportBills, reportTotalSum]);

  // Detailed breakdown with Receipt IDs
  const consolidatedDetailedFormulaStr = useMemo(() => {
    if (matchingReportBills.length <= 1) return '';
    const items = matchingReportBills
      .map(b => `${b.receiptId || '#00001'} (₹${Number(b.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`)
      .join(' + ');
    const totalStr = '₹' + Number(reportTotalSum).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${items} = ${totalStr}`;
  }, [matchingReportBills, reportTotalSum]);

  // Readable date range label
  const reportDateRangeLabel = useMemo(() => {
    if (!exportStartDate && !exportEndDate) return 'All History';
    if (exportStartDate && exportEndDate) {
      const s = formatShortDate(exportStartDate);
      const e = formatShortDate(exportEndDate);
      return s === e ? s : `${s} – ${e}`;
    }
    if (exportStartDate) return `From ${formatShortDate(exportStartDate)}`;
    if (exportEndDate) return `Up to ${formatShortDate(exportEndDate)}`;
    return 'Custom Range';
  }, [exportStartDate, exportEndDate]);

  // Quick preset button handler
  const handleQuickRange = (preset) => {
    setActiveRangePreset(preset);
    const now = new Date();
    if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setExportStartDate(toDateInputString(firstDay));
      setExportEndDate(toDateInputString(now));
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setExportStartDate(toDateInputString(firstDayLastMonth));
      setExportEndDate(toDateInputString(lastDayLastMonth));
    } else if (preset === 'last_2_months') {
      const firstDayTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setExportStartDate(toDateInputString(firstDayTwoMonthsAgo));
      setExportEndDate(toDateInputString(now));
    } else if (preset === 'last_30_days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setExportStartDate(toDateInputString(thirtyDaysAgo));
      setExportEndDate(toDateInputString(now));
    } else if (preset === 'all') {
      setExportStartDate('');
      setExportEndDate(toDateInputString(now));
    }
  };

  // Open Export Modal with current month preset synced
  const handleOpenExportModal = () => {
    if (selectedMonth && selectedMonth !== 'all') {
      try {
        const [y, m] = selectedMonth.split('-');
        const firstDay = new Date(Number(y), Number(m) - 1, 1);
        const lastDay = new Date(Number(y), Number(m), 0);
        setExportStartDate(toDateInputString(firstDay));
        setExportEndDate(toDateInputString(lastDay));
        setActiveRangePreset('custom');
      } catch {
        handleQuickRange('this_month');
      }
    } else {
      handleQuickRange('this_month');
    }
    setIsExportModalOpen(true);
  };

  // Individual Thermal Receipt Download as PNG & Native Share (Requirement 1)
  const downloadReceiptAsPng = async (bill) => {
    if (!bill) return;
    setExportingPng(true);
    const cleanId = String(bill.receiptId || '00001').replace('#', '').trim();
    const filename = `Expense_Receipt_${cleanId}.png`;

    try {
      setExportingBill(bill);
      // Wait for React to render the dedicated offscreen receipt
      await new Promise(r => setTimeout(r, 120));
      const element = offscreenReceiptRef.current;

      if (!element) {
        console.warn('[Receipt] Could not find thermal receipt element to capture');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        scrollX: 0,
        scrollY: 0,
        logging: false,
      });

      const pngUrl = canvas.toDataURL('image/png');

      // 1. Direct File Download as PNG
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Direct Share (Simultaneous) if supported
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const file = new File([blob], filename, { type: 'image/png' });
          const shareData = {
            title: `Expense Receipt ${bill.receiptId}`,
            text: `Expense Receipt ${bill.receiptId} • Total: ₹${Number(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${bill.expenseType}) - Paid by ${bill.paidByMemberName}`,
          };
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              ...shareData,
              files: [file],
            });
          } else if (navigator.share) {
            await navigator.share(shareData);
          }
        } catch (shareErr) {
          if (shareErr.name !== 'AbortError') {
            console.warn('[Receipt] Share sheet dismissed:', shareErr);
          }
        }
      }, 'image/png');
    } catch (err) {
      console.error('[Receipt] Failed to export thermal PNG:', err);
    } finally {
      setExportingBill(null);
      setExportingPng(false);
    }
  };

  const handleDownloadAndShareReceipt = downloadReceiptAsPng;

  // Consolidated Multi-Bill Export with Cover Page (Requirement 2: Date Range, Consolidated Formula & Thermal UI Template)
  const handleGenerateConsolidatedReport = async () => {
    if (matchingReportBills.length === 0) return;
    setExportingReport(true);
    setReportProgress({ current: 0, total: matchingReportBills.length });

    try {
      const doc = new jsPDF({
        unit: 'pt',
        format: 'a5',
      });

      // 1. Cover Page (Page 1) with consolidated sum breakdown formula
      renderReportCoverPage(doc, {
        bills: matchingReportBills,
        currentMember,
        dateRangeStr: reportDateRangeLabel,
        totalAmount: reportTotalSum,
        formulaStr: consolidatedFormulaStr,
        detailedFormulaStr: consolidatedDetailedFormulaStr,
      });

      // 2. Subsequent Pages: Exact Thermal Receipt UI Template
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      for (let i = 0; i < matchingReportBills.length; i++) {
        const bill = matchingReportBills[i];
        setReportProgress({ current: i + 1, total: matchingReportBills.length });
        setExportingReportBill(bill);

        // Allow DOM to update and render thermal receipt offscreen
        await new Promise(r => setTimeout(r, 90));

        const element = offscreenReportBillRef.current;
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#FFFFFF',
          scrollX: 0,
          scrollY: 0,
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        doc.addPage('a5', 'portrait');

        // Header on receipt page
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(132, 93, 8);
        doc.text(`EXPENSE RECEIPT • ${bill.receiptId || '#00001'}`, 26, 24);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(110, 110, 110);
        doc.text(
          `${formatShortDate(bill.billDateTime)} • ${i + 1} of ${matchingReportBills.length}`,
          pageWidth - 26,
          24,
          { align: 'right' }
        );

        // Display thermal receipt image cleanly centered
        const targetWidth = 260;
        let finalWidth = targetWidth;
        let finalHeight = (canvas.height * targetWidth) / canvas.width;

        if (finalHeight > pageHeight - 65) {
          finalHeight = pageHeight - 65;
          finalWidth = (canvas.width * finalHeight) / canvas.height;
        }

        const finalX = (pageWidth - finalWidth) / 2;
        const finalY = 32;

        doc.addImage(imgData, 'PNG', finalX, finalY, finalWidth, finalHeight);

        // Footer on receipt page
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(130, 130, 130);
        doc.text(
          `Consolidated Expense Report • Receipt ${i + 1} of ${matchingReportBills.length} • Page ${i + 2} of ${matchingReportBills.length + 1}`,
          pageWidth / 2,
          pageHeight - 12,
          { align: 'center' }
        );
      }

      const filename = `Consolidated_Expense_Report_${exportStartDate || 'Start'}_to_${exportEndDate || 'End'}.pdf`;

      // 1. Direct File Download
      doc.save(filename);

      // 2. Native Share
      try {
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
        const shareData = {
          title: `Consolidated Expense Report (${reportDateRangeLabel})`,
          text: `Consolidated Expense Report (${reportDateRangeLabel}) • Total: ₹${Number(reportTotalSum).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${matchingReportBills.length} receipts) - Paid by ${currentMember?.name}`,
        };
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({ ...shareData, files: [pdfFile] });
        } else if (navigator.share) {
          await navigator.share(shareData);
        }
      } catch (shareErr) {
        if (shareErr.name !== 'AbortError') {
          console.warn('[ConsolidatedExport] Share sheet dismissed:', shareErr);
        }
      }

      setIsExportModalOpen(false);
    } catch (err) {
      console.error('[ConsolidatedExport] Failed to generate consolidated report:', err);
    } finally {
      setExportingReportBill(null);
      setExportingReport(false);
    }
  };

  // Delete Handler with prompt (Strictly creator only)
  const [billToDelete, setBillToDelete] = useState(null);
  const handleConfirmDelete = async () => {
    if (!billToDelete || !onDeleteBill) return;
    if (!isCreator(billToDelete)) {
      setBillToDelete(null);
      return;
    }
    await onDeleteBill(billToDelete.id);
    setBillToDelete(null);
  };

  return (
    <div className="relative pb-6 sm:pb-8 px-4 pt-3 space-y-4">
      {/* Hidden Offscreen Thermal Receipt for High-Resolution PNG Capture */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '360px',
          zIndex: -9999,
          opacity: 0,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {exportingBill && (
          <div
            ref={offscreenReceiptRef}
            style={{ width: '360px', boxSizing: 'border-box' }}
          >
            <ThermalReceipt bill={exportingBill} />
          </div>
        )}
      </div>

      {/* Hidden Offscreen Thermal Receipt for Report PDF Generation */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '360px',
          zIndex: -9999,
          opacity: 0,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {exportingReportBill && (
          <div
            ref={offscreenReportBillRef}
            style={{ width: '360px', boxSizing: 'border-box' }}
          >
            <ThermalReceipt bill={exportingReportBill} />
          </div>
        )}
      </div>

      {/* 1. Monthly Expense Section Header & Metric Cards */}
      <div className="p-5 sm:p-6 rounded-[24px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#8E8E93] block">
              EXPENSE LEDGER &bull; LIFO FEED
            </span>
            <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.03em] text-[#111214] dark:text-[#F5F5F7] leading-tight mt-0.5">
              Monthly Expense
            </h2>
            <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
              Personal out-of-pocket expense ledger &bull; Creator-scoped history
            </p>
          </div>

          {/* Desktop/Tablet Docked Action Bar: Responsive FAB & Consolidated Export */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Consolidated Report Export Button (Opens Date Range Selector Modal) */}
            {userBills.length > 0 && (
              <button
                type="button"
                onClick={handleOpenExportModal}
                disabled={exportingReport}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.07] dark:border-white/[0.08] text-xs font-semibold transition-all cursor-pointer active-scale"
                title="Prepare and Export Consolidated Expense Report with Date Range"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{exportingReport ? 'Exporting...' : 'Export Report'}</span>
              </button>
            )}

            {/* Desktop Docked "New Bill" Button */}
            <button
              type="button"
              onClick={handleOpenNewBill}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] hover:opacity-90 font-semibold text-xs shadow-xs active-scale transition-all cursor-pointer select-none"
              title="Create Expense Bill"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Bill</span>
            </button>
          </div>
        </div>

        {/* 2. Consistent Filter UI Pattern (Search on left, Month Tabs on right) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8E8E93] dark:text-[#636366] absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipts by ID, particular, or expense type..."
              className="w-full h-10 pl-9 pr-9 text-xs bg-black/[0.03] dark:bg-white/[0.05] rounded-full border border-black/[0.08] dark:border-white/[0.1] text-[#111214] dark:text-[#F5F5F7] placeholder-[#8E8E93] dark:placeholder-[#636366] focus:outline-none focus:bg-white dark:focus:bg-[#141518] focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[#8E8E93] dark:text-[#636366] hover:text-[#111214] dark:hover:text-[#F5F5F7] p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Month Filter Pills: Clean Grayscale Tabs */}
          <div className="flex items-center gap-1 bg-[#EFEFF1] dark:bg-[#1C1D21] p-1 rounded-full border border-black/[0.05] dark:border-white/[0.05] overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-white dark:bg-[#2C2E33] text-[#111214] dark:text-[#F5F5F7] font-semibold shadow-xs'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7]'
              }`}
            >
              All History
            </button>
            {distinctMonths.map(ym => (
              <button
                key={ym}
                type="button"
                onClick={() => setSelectedMonth(ym)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
                  selectedMonth === ym
                    ? 'bg-white dark:bg-[#2C2E33] text-[#111214] dark:text-[#F5F5F7] font-semibold shadow-xs'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7]'
                }`}
              >
                {formatMonthTitle(ym)}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Summary Bento Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="p-4 sm:p-5 rounded-[20px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.07] space-y-1.5">
            <span className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block">
              TOTAL EXPENSE AMOUNT
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[24px] sm:text-[26px] font-semibold text-[#111214] dark:text-[#F5F5F7] tracking-[-0.02em] tabular-nums">
                ₹{monthlyMetrics.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-medium text-[#8E8E93] dark:text-[#636366]">INR</span>
            </div>
            <span className="text-[11px] text-[#8E8E93] dark:text-[#636366] block">
              Active ledger total
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-[20px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.07] space-y-1.5">
            <span className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block">
              TOTAL RECEIPTS
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[24px] sm:text-[26px] font-semibold text-[#111214] dark:text-[#F5F5F7] tracking-[-0.02em] tabular-nums">
                {monthlyMetrics.count}
              </span>
              <span className="text-[11px] font-medium text-[#8E8E93] dark:text-[#636366]">recorded</span>
            </div>
            <span className="text-[11px] text-[#8E8E93] dark:text-[#636366] block">
              Receipt entries logged
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-[20px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.07] space-y-1.5">
            <span className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block">
              AVERAGE SPENT
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[24px] sm:text-[26px] font-semibold text-[#111214] dark:text-[#F5F5F7] tracking-[-0.02em] tabular-nums">
                ₹{monthlyMetrics.avg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-medium text-[#8E8E93] dark:text-[#636366]">avg / receipt</span>
            </div>
            <span className="text-[11px] text-[#8E8E93] dark:text-[#636366] block">
              Normalized expense
            </span>
          </div>
        </div>
      </div>

      {/* 4. LIFO History Cards Feed */}
      {displayedBills.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-[20px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/10 text-[#111214] dark:text-[#F5F5F7] flex items-center justify-center mx-auto border border-black/[0.08] dark:border-white/[0.1] shadow-xs">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#111214] dark:text-[#F5F5F7]">
              No Expense Receipts Found
            </h3>
            <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] max-w-sm mx-auto mt-1 leading-relaxed">
              {searchQuery
                ? `No receipts matched "${searchQuery}". Clear your search or change the month filter.`
                : 'You have not recorded any expenses for this period. Tap the "New Bill" button below to log your first expense!'}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenNewBill}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] hover:opacity-90 text-xs font-semibold shadow-xs active-scale transition-all cursor-pointer"
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
                className="rounded-[20px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-2xs hover:shadow-xs transition-all p-5 space-y-3.5"
              >
                {/* Top Row: Primary Heading = Receipt No. + Expense Date & Total Amount */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Primary Heading: Receipt No. */}
                      <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#111214] dark:text-[#F5F5F7] tabular-nums">
                        {bill.receiptId || '#00001'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] text-[11px] font-medium border border-black/[0.06] dark:border-white/[0.08]">
                        {bill.expenseType || 'General Expense'}
                      </span>
                    </div>

                    {/* Member Name in Small Text Size */}
                    <p className="text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                      Paid by{' '}
                      <span className="font-semibold text-[#111214] dark:text-[#F5F5F7]">
                        {bill.paidByMemberName || currentMember?.name}
                      </span>
                      {bill.paidByMemberCode ? ` (${bill.paidByMemberCode})` : ''}
                    </p>
                  </div>

                  {/* Expense Date and Total Amount */}
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] flex items-center justify-end gap-1 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatBillDisplayDate(bill.billDateTime)}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[#111214] dark:text-[#F5F5F7] tracking-tight block mt-0.5 tabular-nums">
                      ₹{Number(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Particulars / Line Items Summary */}
                <div className="rounded-[16px] bg-[#EFEFF1]/60 dark:bg-[#1C1D21]/60 p-3.5 border border-black/[0.05] dark:border-white/[0.06]">
                  <div
                    onClick={() => toggleExpand(bill.id)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-[#6E6E73] dark:text-[#8E8E93] block">
                        Particulars Summary
                      </span>
                      <p className="text-xs font-semibold text-[#111214] dark:text-[#F5F5F7] truncate mt-0.5">
                        {(bill.lineItems || []).map(it => it.particular).filter(Boolean).join(', ') || 'No line items recorded'}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="text-xs font-semibold text-[#111214] dark:text-[#F5F5F7] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide' : `View (${bill.lineItems?.length || 0})`}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expandable itemized table */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] animate-fadeIn">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="text-[#6E6E73] dark:text-[#8E8E93] border-b border-black/[0.06] dark:border-white/[0.06]">
                            <th className="text-left font-semibold py-1.5 w-12">S.No</th>
                            <th className="text-left font-semibold py-1.5">Particular</th>
                            <th className="text-right font-semibold py-1.5 w-24">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                          {(bill.lineItems || []).map((item, idx) => (
                            <tr key={item.id || idx} className="text-[#111214] dark:text-[#F5F5F7]">
                              <td className="py-1.5 font-medium text-[#6E6E73] dark:text-[#8E8E93] tabular-nums">
                                #{item.sNo || idx + 1}
                              </td>
                              <td className="py-1.5 font-medium">{item.particular}</td>
                              <td className="py-1.5 font-bold text-right text-[#111214] dark:text-[#F5F5F7] tabular-nums">
                                ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-black/[0.08] dark:border-white/[0.1] font-bold">
                            <td colSpan={2} className="pt-2 text-right text-[#6E6E73] dark:text-[#8E8E93]">
                              Total:
                            </td>
                            <td className="pt-2 text-right text-sm text-[#111214] dark:text-[#F5F5F7] font-bold tabular-nums">
                              ₹{Number(bill.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-black/[0.05] dark:border-white/[0.05] flex-wrap">
                  {/* Delete Button */}
                  {userIsCreator && (
                    <button
                      type="button"
                      onClick={() => setBillToDelete(bill)}
                      className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
                      title="Delete Receipt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* View Receipt */}
                  <button
                    type="button"
                    onClick={() => setPreviewBill(bill)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.07] dark:border-white/[0.08] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                    title="View Receipt Preview"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>View Receipt</span>
                  </button>

                  {/* Download Receipt */}
                  {userIsCreator && (
                    <button
                      type="button"
                      onClick={() => downloadReceiptAsPng(bill)}
                      disabled={exportingPng}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] hover:opacity-90 text-xs font-semibold shadow-2xs active-scale transition-all cursor-pointer"
                      title="Download Expense Receipt PNG"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Receipt</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Mobile Floating Action Button (FAB) "New Bill" */}
      <div className="sm:hidden fixed bottom-20 right-4 z-20">
        <button
          type="button"
          onClick={handleOpenNewBill}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] active:scale-95 text-xs font-semibold shadow-lg border border-black/10 dark:border-white/10 active-scale transition-all cursor-pointer select-none"
          title="Create Expense Bill"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Bill</span>
        </button>
      </div>

      {/* 6. "EXPENSE BILL" FORM MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Expense Bill"
        subtitle="Record an out-of-pocket expense"
        className="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[#111214] dark:text-[#F5F5F7] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Bill Date & Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#111214] dark:text-[#F5F5F7]" />
                <span>Bill Date &amp; Time</span>
              </span>
              <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-normal">
                (Past dates permitted)
              </span>
            </label>
            <input
              type="datetime-local"
              required
              value={billDateTime}
              onChange={(e) => setBillDateTime(e.target.value)}
              className="w-full h-10 px-3.5 text-xs bg-[#F5F5F7] dark:bg-[#141518] text-[#111214] dark:text-[#F5F5F7] rounded-[14px] border border-black/[0.07] dark:border-white/[0.08] outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 transition-all tabular-nums"
            />
          </div>

          {/* Paid By - RESTRICTED & AUTO-BOUND TO CURRENT LOGGED-IN USER */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#111214] dark:text-[#F5F5F7]" />
              <span>Paid By</span>
            </label>
            <div className="w-full h-10 px-3.5 flex items-center justify-between text-xs bg-[#F5F5F7] dark:bg-[#141518] text-[#111214] dark:text-[#F5F5F7] rounded-[14px] border border-black/[0.07] dark:border-white/[0.08]">
              <span className="font-bold">
                {currentMember?.name || 'Member'} {currentMember?.code ? `(${currentMember.code})` : ''}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#111214] dark:text-[#F5F5F7] border border-black/10 dark:border-white/15">
                Logged In User
              </span>
            </div>
          </div>

          {/* Expense Type - STRICTLY CLEAN TEXT INPUT */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#111214] dark:text-[#F5F5F7]" />
              <span>Expense Type</span>
            </label>
            <input
              type="text"
              required
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              placeholder="Enter expense type (e.g. Vegetables, Grocery, Gas Refill)"
              className="w-full h-10 px-3.5 text-xs bg-[#F5F5F7] dark:bg-[#141518] text-[#111214] dark:text-[#F5F5F7] rounded-[14px] border border-black/[0.07] dark:border-white/[0.08] outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 transition-all placeholder-[#8E8E93]"
            />
          </div>

          {/* Line Items Table with Structured Cell Borders and Clear Alignment */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7]">
                Line Items (Particulars &amp; Amounts)
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#111214] dark:text-[#F5F5F7] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="rounded-[14px] border border-black/[0.07] dark:border-white/[0.08] overflow-hidden bg-white dark:bg-[#141518]">
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#EFEFF1] dark:bg-[#1C1D21] text-[11px] font-bold text-[#6E6E73] dark:text-[#8E8E93] border-b border-black/[0.07] dark:border-white/[0.08]">
                      <th className="py-2 px-2.5 text-center w-12 border-r border-black/[0.07] dark:border-white/[0.08]">S.No</th>
                      <th className="py-2 px-3 text-left border-r border-black/[0.07] dark:border-white/[0.08]">Particular</th>
                      <th className="py-2 px-3 text-right w-32 border-r border-black/[0.07] dark:border-white/[0.08]">Amount (₹)</th>
                      <th className="py-2 px-2 text-center w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                    {lineItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-1.5 px-2 text-center font-bold text-[#6E6E73] dark:text-[#8E8E93] border-r border-black/[0.07] dark:border-white/[0.08]">
                          #{item.sNo}
                        </td>
                        <td className="py-1 px-2 border-r border-black/[0.07] dark:border-white/[0.08]">
                          <input
                            type="text"
                            required
                            value={item.particular}
                            onChange={(e) => handleLineItemChange(idx, 'particular', e.target.value)}
                            placeholder="Particular description"
                            className="w-full h-8 px-2.5 text-xs bg-[#F5F5F7] dark:bg-[#1C1D21] text-[#111214] dark:text-[#F5F5F7] rounded-lg border border-black/[0.07] dark:border-white/[0.08] outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
                          />
                        </td>
                        <td className="py-1 px-2 border-r border-black/[0.07] dark:border-white/[0.08]">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={item.amount}
                            onChange={(e) => handleLineItemChange(idx, 'amount', e.target.value)}
                            placeholder="0.00"
                            className="w-full h-8 px-2.5 text-xs text-right bg-[#F5F5F7] dark:bg-[#1C1D21] text-[#111214] dark:text-[#F5F5F7] font-bold rounded-lg border border-black/[0.07] dark:border-white/[0.08] outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 tabular-nums"
                          />
                        </td>
                        <td className="py-1 px-1 text-center">
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="p-1 rounded-lg text-[#6E6E73] hover:text-black dark:text-[#8E8E93] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                              title="Remove item"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#EFEFF1] dark:bg-[#1C1D21] border-t border-black/[0.07] dark:border-white/[0.08]">
                      <td colSpan={2} className="py-2.5 px-3 text-right text-xs font-bold text-[#111214] dark:text-[#F5F5F7] border-r border-black/[0.07] dark:border-white/[0.08]">
                        Auto Calculated Sum:
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm font-black text-[#111214] dark:text-[#F5F5F7] border-r border-black/[0.07] dark:border-white/[0.08] tabular-nums">
                        ₹{calculatedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/[0.07] dark:border-white/[0.08]">
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

      {/* 7. EXPENSE RECEIPT MODAL VIEW */}
      <Modal
        isOpen={Boolean(previewBill)}
        onClose={() => setPreviewBill(null)}
        title="Expense Receipt"
        subtitle={`Receipt ${previewBill?.receiptId || ''} • Expense Receipt`}
        className="max-w-md"
      >
        {previewBill && (
          <div className="space-y-4">
            {/* Authentic Thermal Receipt Paper Layout */}
            <div className="flex justify-center p-2.5 sm:p-4 bg-[#F5F5F7] dark:bg-[#0B0C0E] rounded-[16px] border border-black/[0.07] dark:border-white/[0.08] overflow-hidden">
              <div className="w-full flex justify-center">
                <ThermalReceipt bill={previewBill} />
              </div>
            </div>

            {/* Modal Actions */}
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
                loading={exportingPng}
                onClick={() => downloadReceiptAsPng(previewBill)}
              >
                Download PNG
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
        subtitle="Are you sure you want to delete this receipt?"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs space-y-1.5">
            <p className="font-bold text-[#111214] dark:text-[#F5F5F7]">
              Are you sure you want to delete this receipt?
            </p>
            <p className="text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
              This will permanently delete receipt <strong className="text-[#111214] dark:text-[#F5F5F7]">{billToDelete?.receiptId}</strong> (₹{Number(billToDelete?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) for <em>{billToDelete?.expenseType}</em> from your expense history. This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setBillToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete}>
              Delete Receipt
            </Button>
          </div>
        </div>
      </Modal>

      {/* 9. DATE RANGE SELECTOR & CONSOLIDATED REPORT EXPORT MODAL */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => {
          if (!exportingReport) setIsExportModalOpen(false);
        }}
        title="Export Consolidated Expense Report"
        subtitle="Prepare multi-receipt report with date range & consolidated formula"
        className="max-w-lg"
      >
        <div className="space-y-4">
          {/* Quick Preset Buttons (Includes Last 2 Months) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7]">
              Quick Range Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_2_months', label: 'Last 2 Months' },
                { id: 'last_30_days', label: 'Last 30 Days' },
                { id: 'all', label: 'All History' },
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleQuickRange(preset.id)}
                  disabled={exportingReport}
                  className={`px-2 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap text-center ${
                    activeRangePreset === preset.id
                      ? 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] border-transparent shadow-xs'
                      : 'bg-[#EFEFF1] dark:bg-[#1C1D21] text-[#6E6E73] dark:text-[#8E8E93] border-black/[0.07] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#111214] dark:text-[#F5F5F7]" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => {
                  setExportStartDate(e.target.value);
                  setActiveRangePreset('custom');
                }}
                disabled={exportingReport}
                className="w-full h-10 px-3 text-xs bg-[#F5F5F7] dark:bg-[#141518] text-[#111214] dark:text-[#F5F5F7] rounded-[14px] border border-black/[0.07] dark:border-white/[0.08] outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#111214] dark:text-[#F5F5F7]" />
                <span>End Date</span>
              </label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => {
                  setExportEndDate(e.target.value);
                  setActiveRangePreset('custom');
                }}
                disabled={exportingReport}
                className="w-full h-10 px-3 text-xs bg-[#F5F5F7] dark:bg-[#141518] text-[#111214] dark:text-[#F5F5F7] rounded-[14px] border border-black/[0.07] dark:border-white/[0.08] outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 tabular-nums"
              />
            </div>
          </div>

          {/* Live Preview & Calculation Summary Box */}
          <div className="p-3.5 rounded-[16px] bg-[#F5F5F7] dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.07] dark:border-white/[0.08]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E73] dark:text-[#8E8E93] block">
                  Report Scope
                </span>
                <span className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7]">
                  {reportDateRangeLabel}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] block">
                  Matching Receipts
                </span>
                <span className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7] tabular-nums">
                  {matchingReportBills.length} receipts
                </span>
              </div>
            </div>

            {/* Paid By info */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6E6E73] dark:text-[#8E8E93]">Paid By (User):</span>
              <span className="font-bold text-[#111214] dark:text-[#F5F5F7]">
                {currentMember?.name || 'User'} {currentMember?.code ? `(${currentMember.code})` : ''}
              </span>
            </div>

            {/* Total Sum */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#6E6E73] dark:text-[#8E8E93]">Total Consolidated Amount:</span>
              <span className="text-base font-black text-[#111214] dark:text-[#F5F5F7] tabular-nums">
                ₹{reportTotalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Consolidated Sum Formula Breakdown */}
            <div className="pt-2 border-t border-black/[0.07] dark:border-white/[0.08] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E73] dark:text-[#8E8E93] block">
                Consolidated Calculation Formula:
              </span>
              <div className="p-2.5 rounded-[12px] bg-white dark:bg-[#0B0C0E] border border-black/[0.07] dark:border-white/[0.08] font-mono text-[11px] leading-relaxed break-words text-[#111214] dark:text-[#F5F5F7] tabular-nums">
                {consolidatedFormulaStr}
              </div>
              {consolidatedDetailedFormulaStr && (
                <div className="p-2 rounded-[12px] bg-white/60 dark:bg-[#0B0C0E]/60 text-[10px] text-[#6E6E73] dark:text-[#8E8E93] font-mono break-words tabular-nums">
                  {consolidatedDetailedFormulaStr}
                </div>
              )}
            </div>
          </div>

          {/* Export Progress Bar */}
          {exportingReport && (
            <div className="p-3 rounded-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-[#111214] dark:text-[#F5F5F7]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#111214] dark:bg-white animate-ping" />
                  <span>Converting Thermal Receipts to PDF...</span>
                </span>
                <span className="tabular-nums">
                  {reportProgress.current} / {reportProgress.total}
                </span>
              </div>
              <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#111214] dark:bg-white h-full transition-all duration-200"
                  style={{
                    width: `${reportProgress.total > 0 ? (reportProgress.current / reportProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/[0.07] dark:border-white/[0.08]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={exportingReport}
              onClick={() => setIsExportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Download}
              loading={exportingReport}
              disabled={matchingReportBills.length === 0 || exportingReport}
              onClick={handleGenerateConsolidatedReport}
            >
              {exportingReport ? 'Generating Report...' : `Export PDF (${matchingReportBills.length})`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
