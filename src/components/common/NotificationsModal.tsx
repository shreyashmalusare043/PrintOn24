import React from 'react';
import {
  X,
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Printer,
  Trash2
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewOrderReceipt?: (orderId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onViewOrderReceipt
}) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    orders,
    setActiveReceiptOrder
  } = usePrintPerfect();

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    markNotificationAsRead(notif.id);
    if (notif.orderId && onViewOrderReceipt) {
      const order = orders.find(o => o.id === notif.orderId);
      if (order) {
        setActiveReceiptOrder(order);
        onClose();
        onViewOrderReceipt(notif.orderId);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 overflow-hidden bg-white rounded-3xl">
        <DialogHeader className="p-4 bg-red-50/50 border-b border-red-100 flex flex-row items-center justify-between space-y-0 pr-12">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-[#FF1300] flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 text-left font-heading">
                Notifications Center
              </DialogTitle>
              <p className="text-[10px] text-slate-500 text-left">
                Print statuses, memberships & offers
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Action Toolbar: Read All & Clear All separated cleanly without any overlap with dismiss X */}
        <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            {notifications.length} {notifications.length === 1 ? 'Notification' : 'Notifications'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              className="px-2.5 py-1 text-xs text-[#FF1300] hover:bg-red-50 rounded-lg font-bold flex items-center gap-1 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Read All</span>
            </button>
            <button
              type="button"
              onClick={clearAllNotifications}
              className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-1 transition-colors border border-rose-200/60"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="w-10 h-10 mx-auto text-red-300 stroke-1 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No notifications right now</p>
              <p className="text-[11px] text-slate-400 mt-0.5">You're all caught up!</p>
            </div>
          ) : (
            notifications.map(notif => {
              const getIcon = () => {
                if (notif.type === 'print_complete') {
                  return <Printer className="w-4 h-4 text-emerald-600" />;
                }
                if (notif.type === 'membership_renew') {
                  return <AlertTriangle className="w-4 h-4 text-amber-600" />;
                }
                return <Sparkles className="w-4 h-4 text-[#FF1300]" />;
              };

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`pt-2.5 first:pt-0 flex items-start gap-3 p-2.5 rounded-2xl cursor-pointer transition-colors ${
                    !notif.read ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    {getIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.orderId && (
                      <span className="inline-block mt-1 text-[11px] font-bold text-[#FF1300] hover:underline">
                        View Digital Receipt & Token →
                      </span>
                    )}
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-[#FF1300] shrink-0 mt-2" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
