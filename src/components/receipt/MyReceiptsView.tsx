import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  FileText,
  Printer,
  ChevronRight,
  Download,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  ExternalLink,
  Tag
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import type { PrintOrder } from '../../types/printperfect';
import { toast } from 'sonner';

interface MyReceiptsViewProps {
  onViewReceipt: (order: PrintOrder) => void;
  onOpenUpload: () => void;
}

export const MyReceiptsView: React.FC<MyReceiptsViewProps> = ({
  onViewReceipt,
  onOpenUpload
}) => {
  const { orders, retrieveDocumentForPrint } = usePrintPerfect();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Completed' | 'Pending'>('All');

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.enterpriseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.document.fileName.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedFilter === 'All') return matchesSearch;
    if (selectedFilter === 'Completed') return matchesSearch && order.status === 'Completed';
    return matchesSearch && order.status !== 'Completed';
  });

  const totalSpent = orders.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const totalPrints = orders.reduce((acc, curr) => acc + curr.calculatedPages * curr.config.copies, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 pb-28 select-none font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#FF1300]" />
            <span>My Receipts & Invoices</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View, download and track your itemized print orders and official payment slips
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenUpload}
          className="self-start sm:self-auto px-4 py-2.5 rounded-full bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/20 flex items-center gap-1.5 font-heading transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>New Print Order</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Receipts
            </p>
            <p className="text-2xl font-black text-slate-900 font-heading mt-1">
              {orders.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Pages Printed
            </p>
            <p className="text-2xl font-black text-slate-900 font-heading mt-1">
              {totalPrints}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Amount Spent
            </p>
            <p className="text-2xl font-black text-emerald-600 font-heading mt-1">
              ₹{totalSpent.toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-heading font-black text-xl">
            ₹
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by shop name, order ID or file..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#FF1300] text-slate-800"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-full border border-slate-200/80">
          {(['All', 'Completed', 'Pending'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedFilter(tab)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedFilter === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Receipt Item List */}
      <div className="space-y-3">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:border-[#FF1300]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-100/70 text-[#FF1300] font-black text-sm flex items-center justify-center shrink-0 border border-red-200/60 font-heading">
                  {order.enterpriseName.substring(0, 3).toUpperCase()}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-extrabold text-slate-900 font-heading truncate">
                      {order.enterpriseName}
                    </h3>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium truncate flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{order.document.fileName}</span>
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {order.createdAt}
                    </span>
                    <span>•</span>
                    <span>{order.calculatedPages} Pages</span>
                    <span>•</span>
                    <span>{order.config.copies} Copies</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">
                      {order.config.printType} ({order.config.sides})
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Price & View Thermal Receipt Button */}
              <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-left md:text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                    Amount Paid
                  </span>
                  <span className="text-lg font-black text-slate-900 font-heading">
                    ₹{order.grandTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      toast.loading('Checking 12h retention & retrieving document...');
                      const res = await retrieveDocumentForPrint(order.id, order.document?.id);
                      toast.dismiss();
                      if (!res.success) {
                        toast.error(res.error || 'Original customer document could not be retrieved.');
                      } else if (res.url) {
                        window.open(res.url, '_blank');
                        toast.success(`Original document '${res.docName || order.document.fileName}' retrieved! Sent to printer.`);
                      }
                    }}
                    className="px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 font-heading"
                    title="Retrieve original stored customer document for print (12h retention)"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#FF1300]" />
                    <span className="hidden sm:inline">Go For Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewReceipt(order)}
                    className="px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-[#FF1300] text-[#FF1300] hover:text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 font-heading"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>View Receipt</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 font-heading">
              No receipts found
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your completed and active print orders will appear here with full downloadable tax invoices.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
