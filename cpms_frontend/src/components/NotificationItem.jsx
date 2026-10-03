const KIND_META = {
    SLOT_OPENED: { icon: '🗓️', cls: 'bg-blue-500/10 border-blue-400/30 text-blue-100' },
    SLOT_RESCHEDULED: { icon: '🔁', cls: 'bg-amber-500/10 border-amber-400/30 text-amber-100' },
    SLOT_COMPLETED: { icon: '✅', cls: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100' },
    SLOT_CANCELLED: { icon: '❌', cls: 'bg-red-500/10 border-red-400/30 text-red-100' },
    BOOKING_CANCELLED: { icon: '❌', cls: 'bg-red-500/10 border-red-400/30 text-red-100' },
    MEETING_REMINDER_24H: { icon: '⏰', cls: 'bg-purple-500/10 border-purple-400/30 text-purple-100' },
    MEETING_REMINDER_1H: { icon: '⏰', cls: 'bg-purple-500/10 border-purple-400/30 text-purple-100' },
    PROJECT_ALLOCATED: { icon: '🎓', cls: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100' },
};

const NotificationItem = ({ n }) => {
    const meta = KIND_META[n.kind] || { icon: '🔔', cls: 'bg-slate-500/10 border-white/10 text-slate-100' };
    return (
        <div className={`border rounded-lg p-3 ${meta.cls}`}>
            <p className="text-xs leading-relaxed">
                <span className="mr-1">{meta.icon}</span>{n.message}
            </p>
            <p className="text-[10px] text-slate-400 mt-1.5">{new Date(n.created_at).toLocaleString()}</p>
        </div>
    );
};

export default NotificationItem;