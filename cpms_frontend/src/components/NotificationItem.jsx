const KIND_META = {
    SLOT_OPENED: { icon: '🗓️', cls: 'bg-blue-500/10 border-blue-400/30 text-blue-100' },
    SLOT_RESCHEDULED: { icon: '🔁', cls: 'bg-amber-500/10 border-amber-400/30 text-amber-100' },
    SLOT_COMPLETED: { icon: '✅', cls: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100' },
    SLOT_CANCELLED: { icon: '❌', cls: 'bg-red-500/10 border-red-400/30 text-red-100' },
    BOOKING_CANCELLED: { icon: '❌', cls: 'bg-red-500/10 border-red-400/30 text-red-100' },
    MEETING_REMINDER_24H: { icon: '⏰', cls: 'bg-purple-500/10 border-purple-400/30 text-purple-100' },
    MEETING_REMINDER_1H: { icon: '⏰', cls: 'bg-purple-500/10 border-purple-400/30 text-purple-100' },
    PROJECT_ALLOCATED: { icon: '🎓', cls: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100' },
    PROPOSAL_SUBMITTED: { icon: '📝', cls: 'bg-blue-500/10 border-blue-400/30 text-blue-100' },
    PROPOSAL_APPROVED: { icon: '✅', cls: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100' },
    PROPOSAL_REJECTED: { icon: '❌', cls: 'bg-red-500/10 border-red-400/30 text-red-100' },
    PROPOSAL_FEEDBACK: { icon: '💬', cls: 'bg-amber-500/10 border-amber-400/30 text-amber-100' },
    DEADLINE_CHANGED: { icon: '📢', cls: 'bg-purple-500/10 border-purple-400/30 text-purple-100' },
};

const NotificationItem = ({ n, onDismiss }) => {
    const meta = KIND_META[n.kind] || { icon: '🔔', cls: 'bg-slate-500/10 border-white/10 text-slate-100' };
    return (
        <div className={`relative border rounded-lg p-3 pr-7 ${meta.cls}`}>
            {onDismiss && (
                <button
                    onClick={() => onDismiss(n.id)}
                    aria-label="Dismiss notification"
                    className="absolute top-1.5 right-2 text-xs text-slate-400 hover:text-white"
                >
                    ✕
                </button>
            )}
            <p className="text-xs leading-relaxed">
                <span className="mr-1">{meta.icon}</span>{n.message}
            </p>
            <p className="text-[10px] text-slate-400 mt-1.5">{new Date(n.created_at).toLocaleString()}</p>
        </div>
    );
};

export default NotificationItem;