import React from 'react';
import {
  X,
  FileText,
  Printer,
  Calendar,
  CheckCircle2,
  Copy,
  Receipt,
  Download
} from 'lucide-react';
import type { PrintOrder } from '../../types/printperfect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

interface ShortViewReceiptModalProps {
  order: PrintOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullThermalReceipt: (order: PrintOrder) => void;
}

export const ShortViewReceiptModal: React.FC<ShortViewReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  onOpenFullThermalReceipt
}) => {
  if (!order) return null;

  const copyToken = () => {
    navigator.clipboard.writeText(order.tokenNumber);
    toast.success(`Token ${order.tokenNumber} copied to clipboard!`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      {/* Note: DialogContent internally already provides a single top-right close 'X' button! Duplicate cut button removed */}
      <DialogContent className="max-w-[calc(100%-1.5rem)] md:max-w-md p-0 overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-2xl">
        <DialogHeader className="p-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 pr-12">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#FF1300] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 text-left font-heading">
                Short-View Receipt
              </DialogTitle>
              <p className="text-[10px] text-slate-500 text-left">
                Token #{order.tokenNumber} • {order.orderNumber}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Order Header Badge - Consistent Red Brand Color */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-red-50/70 border border-red-100">
            <div>
              <span className="text-[10px] font-bold text-[#FF1300] uppercase tracking-wider font-heading">
                Pickup Token
              </span>
              <p className="text-2xl font-black text-[#FF1300] tracking-tight font-heading">
                {order.tokenNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={copyToken}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 active:scale-95 text-slate-700 hover:text-[#FF1300] text-xs font-bold border border-slate-200 hover:border-[#FF1300] flex items-center gap-1 shadow-sm transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy</span>
            </button>
          </div>

          {/* Details Grid */}
          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Print Shop:</span>
              <span className="font-bold text-slate-800 text-right font-heading">{order.enterpriseName}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Document:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 truncate max-w-[200px]">
                <FileText className="w-3.5 h-3.5 text-[#FF1300] shrink-0" />
                <span className="truncate">{order.document.fileName}</span>
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Configuration:</span>
              <span className="font-medium text-slate-700">
                {order.config.pageSize} • {order.config.printType} • {order.config.sides}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Quantity & Sheets:</span>
              <span className="font-medium text-slate-700">
                {order.calculatedPages} pgs × {order.config.copies} sets ({order.sheetsUsed} sheets)
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Payment:</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  order.paymentMethod === 'Pay on Counter'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {order.paymentMethod === 'Pay on Counter'
                  ? `Pay on Counter (Pending - ₹${order.grandTotal.toFixed(2)})`
                  : `Online (${order.paymentMethod} - ₹${order.grandTotal.toFixed(2)})`}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Current Status:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-[#FF1300] font-bold text-[10px]">
                {order.status}
              </span>
            </div>
          </div>

          {/* Action button to open Full Thermal Receipt (Red Brand Color #FF1300) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullThermalReceipt(order);
            }}
            className="w-full py-2.5 px-3 rounded-full bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-500/25 transition-all font-heading text-center"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="truncate">Open Digital Receipt & Barcode</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
