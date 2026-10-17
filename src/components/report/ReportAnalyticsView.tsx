import React, { useState } from 'react';
import {
  FileText,
  Download,
  Clock,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  CreditCard,
  Printer,
  Sparkles,
  ArrowRight,
  Layers,
  CircleDot,
  Crown
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../../types/printperfect';
import type { PrintOrder } from '../../types/printperfect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface ReportAnalyticsViewProps {
  onViewReceipt: (order: PrintOrder) => void;
  onBackToHome: () => void;
  onOpenMyReceipts?: () => void;
}

export const ReportAnalyticsView: React.FC<ReportAnalyticsViewProps> = ({
  onViewReceipt,
  onBackToHome,
  onOpenMyReceipts
}) => {
  const { user, selectedEnterprise, orders } = usePrintPerfect();
  const [selectedRange, setSelectedRange] = useState<'Last 2 Days' | 'Last 7 Days' | 'Last 30 Days' | 'Last 90 Days'>('Last 30 Days');
  const [activeTimeFilter, setActiveTimeFilter] = useState<'7D' | '30D' | '90D'>('30D');
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date(2026, 9, 1)); // October 2026

  // Functional date range filtering strictly matching requirement
  const filteredOrders = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const now = new Date();
    let days = 30;
    if (selectedRange === 'Last 2 Days') days = 2;
    else if (selectedRange === 'Last 7 Days') days = 7;
    else if (selectedRange === 'Last 90 Days') days = 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return orders.filter(o => {
      if (!o.createdAt) return true;
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return true;
      return d >= cutoff;
    });
  }, [orders, selectedRange]);

  // Real-time calculations dynamically computed from filtered orders in the database
  const totalPrintsVolume = filteredOrders.reduce(
    (acc, o) => acc + ((o.calculatedPages || 1) * (o.config?.copies || 1)),
    0
  );
  const totalSpentAmount = filteredOrders.reduce((acc, o) => acc + (o.grandTotal || 0), 0);
  const totalDownloadedFiles = filteredOrders.filter(o => o.document?.fileName).length;
  const avgOrderValue = filteredOrders.length > 0 ? totalSpentAmount / filteredOrders.length : 0;

  // Real user Color vs B&W breakdown
  const colorPagesCount = filteredOrders.reduce((acc, o) => {
    const isColor = o.config?.printType === 'Colour' || o.config?.printType === 'Color';
    const pages = (o.calculatedPages || 1) * (o.config?.copies || 1);
    return isColor ? acc + pages : acc;
  }, 0);

  const bwPagesCount = filteredOrders.reduce((acc, o) => {
    const isColor = o.config?.printType === 'Colour' || o.config?.printType === 'Color';
    const pages = (o.calculatedPages || 1) * (o.config?.copies || 1);
    return !isColor ? acc + pages : acc;
  }, 0);

  // Scatter Chart data points dynamically generated from actual user orders for selected month
  const scatterCategories = [
    { name: 'Documents', color: '#3B82F6' },
    { name: 'Color Prints', color: '#FF1300' },
    { name: 'Photos', color: '#F59E0B' },
    { name: 'Assignments', color: '#06B6D4' }
  ];

  // Dynamic user-specific scatter points from actual completed orders in IST
  const activeScatterData = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];

    // Extract target year and month in IST
    const targetFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric'
    });
    const targetParts = targetFormatter.formatToParts(selectedMonth);
    const targetYear = parseInt(targetParts.find(p => p.type === 'year')?.value || '2026', 10);
    const targetMonth = parseInt(targetParts.find(p => p.type === 'month')?.value || '10', 10);

    return orders
      .filter((o, idx) => {
        const dateRaw = o.createdAt ? new Date(o.createdAt) : null;
        const d = dateRaw && !isNaN(dateRaw.getTime()) ? dateRaw : new Date();

        // Get order date components in IST
        const orderParts = targetFormatter.formatToParts(d);
        const oYear = parseInt(orderParts.find(p => p.type === 'year')?.value || '0', 10);
        const oMonth = parseInt(orderParts.find(p => p.type === 'month')?.value || '0', 10);

        return oYear === targetYear && oMonth === targetMonth;
      })
      .map((o, idx) => {
        const dateRaw = o.createdAt ? new Date(o.createdAt) : null;
        const d = dateRaw && !isNaN(dateRaw.getTime()) ? dateRaw : new Date();

        // Format day and time in IST
        const dayStr = d.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          month: 'short',
          day: 'numeric'
        });
        const timeStr = d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit'
        });
        const dayNum = parseInt(
          new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(d),
          10
        );

        const pages = (o.calculatedPages || 1) * (o.config?.copies || 1);
        const isColor = o.config?.printType === 'Colour' || o.config?.printType === 'Color';
        const catType = isColor ? 'Color Prints' : 'Documents';

        return {
          day: dayStr,
          dayNum,
          timestamp: d.getTime(),
          timeStr,
          volume: pages,
          cost: o.grandTotal || Math.round(pages * 2),
          type: catType,
          title: o.document?.fileName || `Print_${o.orderNumber || idx + 1}`
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [orders, selectedMonth]);

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700/60 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-white truncate max-w-[150px]">{data.title}</span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{
                backgroundColor:
                  scatterCategories.find(c => c.name === data.type)?.color || '#3B82F6'
              }}
            >
              {data.type}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 text-[11px] pt-1 border-t border-slate-800">
            <span>Date: <strong className="text-white">{data.day}</strong></span>
            <span>Pages: <strong className="text-white">{data.volume}</strong></span>
            <span>Cost: <strong className="text-emerald-400">₹{data.cost}</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-full px-2 md:px-6 space-y-6 pb-20 font-sans">
      {/* ======================================================== */}
      {/* 1. User Personal Status & Station Badge (Personal Report) */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* 2. Page Title Block & Date Filter (Matching report.png) */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF1300] text-white flex items-center justify-center shadow-md shadow-red-500/25 shrink-0">
            <BarChart3 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-lg md:text-xl font-black text-slate-900 font-heading leading-tight">
              Personal Report & Analytics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-normal">
              Track your personal printing activity, expenses, and savings at a glance.
            </p>
          </div>
        </div>

        {/* Date Filter Pill Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-xs hover:border-slate-300 transition-all font-heading"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FF1300]" />
              <span>{selectedRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-50">
            {(['Last 2 Days', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days'] as const).map(range => (
              <DropdownMenuItem
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 transition-colors ${
                  selectedRange === range ? 'bg-red-50 text-[#FF1300] font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {range}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* ======================================================== */}
      {/* 3. Four Metric Cards with Top Colored Tabs (Sleek & Balanced) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Prints (Blue Tab) */}
        <div className="relative bg-white rounded-2xl p-3.5 border border-blue-100/90 shadow-2xs hover:shadow-xs transition-shadow overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-3.5 w-12 h-1 bg-[#3B82F6] rounded-b-md" />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3B82F6] flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              Volume
            </span>
          </div>

          <div className="mt-2.5">
            <span className="text-[11px] font-semibold text-slate-500 block leading-none">
              Total Prints
            </span>
            <p className="text-xl md:text-2xl font-black text-slate-900 font-heading mt-1 leading-tight">
              {totalPrintsVolume} <span className="text-xs font-semibold text-slate-400">pages</span>
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600">
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>Real-time</span>
              <span className="text-slate-400 font-normal">from active database</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Spent (Yellow Tab) */}
        <div className="relative bg-white rounded-2xl p-3.5 border border-amber-100/90 shadow-2xs hover:shadow-xs transition-shadow overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-3.5 w-12 h-1 bg-[#F59E0B] rounded-b-md" />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#F59E0B] flex items-center justify-center font-black text-xs shrink-0">
              ₹
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              Expense
            </span>
          </div>

          <div className="mt-2.5">
            <span className="text-[11px] font-semibold text-slate-500 block leading-none">
              Total Spent
            </span>
            <p className="text-xl md:text-2xl font-black text-slate-900 font-heading mt-1 leading-tight">
              ₹ {totalSpentAmount.toFixed(2)}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600">
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>{orders.length} orders</span>
              <span className="text-slate-400 font-normal">processed</span>
            </div>
          </div>
        </div>

        {/* Card 3: Download Logs (Orange Tab) */}
        <div className="relative bg-white rounded-2xl p-3.5 border border-orange-100/90 shadow-2xs hover:shadow-xs transition-shadow overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-3.5 w-12 h-1 bg-[#F97316] rounded-b-md" />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              Downloads
            </span>
          </div>

          <div className="mt-2.5">
            <span className="text-[11px] font-semibold text-slate-500 block leading-none">
              Download Logs
            </span>
            <p className="text-xl md:text-2xl font-black text-slate-900 font-heading mt-1 leading-tight">
              {totalDownloadedFiles} <span className="text-xs font-semibold text-slate-400">files</span>
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600">
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>Secure</span>
              <span className="text-slate-400 font-normal">cloud storage</span>
            </div>
          </div>
        </div>

        {/* Card 4: Avg. Order Value (Cyan Tab) */}
        <div className="relative bg-white rounded-2xl p-3.5 border border-cyan-100/90 shadow-2xs hover:shadow-xs transition-shadow overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-3.5 w-12 h-1 bg-[#06B6D4] rounded-b-md" />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-[#06B6D4] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              Average
            </span>
          </div>

          <div className="mt-2.5">
            <span className="text-[11px] font-semibold text-slate-500 block leading-none">
              Avg. Order Value
            </span>
            <p className="text-xl md:text-2xl font-black text-slate-900 font-heading mt-1 leading-tight">
              ₹ {avgOrderValue.toFixed(2)}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600">
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>Accurate</span>
              <span className="text-slate-400 font-normal">live telemetry</span>
            </div>
          </div>
        </div>
      </div>
      {/* ======================================================== */}
      {/* 4. Printing Activity Overview: Scatter Chart (Matching report.png + Scatter Image 3) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF1300] text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">
                Printing Activity Overview
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total prints & revenue trend for {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Month Navigation for Scatter Graph (Anchored to October 2026) */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-full self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="w-7 h-7 rounded-full bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-2 font-heading min-w-[110px] text-center">
              {selectedMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="w-7 h-7 rounded-full bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend Row matching Scatter Categories (Image 3) */}
        <div className="flex items-center gap-4 flex-wrap text-xs font-semibold pt-1 border-t border-slate-100">
          <span className="text-slate-400 text-[11px]">Print Categories:</span>
          {scatterCategories.map(cat => (
            <div key={cat.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-slate-700">{cat.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px]">
            <span className="text-purple-600 font-bold">Color: {colorPagesCount} pgs</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-bold">B&W: {bwPagesCount} pgs</span>
          </div>

        </div>

        {/* Interactive Scatter Chart with Recharts */}
        <div className="h-60 w-full pt-2">
          {activeScatterData.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No Printing Activity Recorded</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                {selectedMonth.getFullYear() < 2026 || (selectedMonth.getFullYear() === 2026 && selectedMonth.getMonth() < 9)
                  ? 'No records before Print on 24 platform launch (October 2026).'
                  : selectedMonth.getFullYear() > 2026 || (selectedMonth.getFullYear() === 2026 && selectedMonth.getMonth() > 9)
                  ? 'Future month: Orders have not yet been placed.'
                  : 'Your print orders for October 2026 will appear here in real-time as prints are executed.'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  dataKey="volume"
                  name="Pages"
                  unit="p"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <ZAxis dataKey="cost" range={[60, 240]} name="Cost" unit="₹" />
                <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Print Jobs" data={activeScatterData}>
                  {activeScatterData.map((entry, index) => {
                    const catColor =
                      scatterCategories.find(c => c.name === entry.type)?.color || '#3B82F6';
                    return <Cell key={`cell-${index}`} fill={catColor} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {/* ======================================================== */}
      {/* 6. Recent Detailed Print Logs (With View Receipt capability) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FF1300]" />
            <h3 className="font-bold text-slate-900 font-heading text-[11px]">{"Recent Itemized"}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">{orders.length} {orders.length === 1 ? 'Record' : 'Records'}</span>
            {onOpenMyReceipts && (
              <button
                type="button"
                onClick={onOpenMyReceipts}
                className="px-3 py-1 rounded-full bg-red-50 hover:bg-red-100 text-[#FF1300] text-xs font-bold transition-all flex items-center gap-1 font-heading"
              >
                <span className="text-[11px]">My Receipts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          {(showAllLogs ? orders : orders.slice(0, 5)).map(order => {
            const isColour = order.config?.printType === 'Colour' || order.config?.printType === 'Color';
            return (
              <div
                key={order.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-red-50/20 px-3.5 rounded-2xl transition-colors border border-red-200/90 shadow-2xs bg-white"
              >
                {/* Left: Avatar & Document Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#FF1300] border border-red-200/60 flex items-center justify-center font-bold text-xs shrink-0 font-heading shadow-2xs">
                    {order.enterpriseName ? order.enterpriseName.substring(0, 2).toUpperCase() : 'CP'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate font-heading">
                      {order.document?.fileName || 'Document.pdf'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {order.enterpriseName} • {order.createdAt || 'Recent'}
                    </p>
                  </div>
                </div>
                {/* Middle: Configuration Badges */}
                <div className="flex items-center gap-1.5 shrink-0 pl-13 sm:pl-0">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                    {order.calculatedPages || 1} pgs × {order.config?.copies || 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isColour
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {order.config?.printType || 'B&W'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-medium border border-amber-200/50">
                    {order.config?.pageSize || 'A4'}
                  </span>
                </div>
                {/* Right: Price & View Receipt Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-13 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <span className="text-xs font-black text-slate-900 font-heading min-w-[50px] text-right">
                    ₹{(order.grandTotal || 0).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onViewReceipt(order)}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 text-[#FF1300] text-xs font-bold transition-all font-heading shadow-2xs"
                  >
                    View Receipt
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* View More / View Less Toggle when more than 5 logs */}
        {orders.length > 5 && (
          <div className="pt-3 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAllLogs(prev => !prev)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs font-heading"
            >
              <span>{showAllLogs ? 'Show Less (Top 5)' : `View More (${orders.length - 5} More Records)`}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllLogs ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
