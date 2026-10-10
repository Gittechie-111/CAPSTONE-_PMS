import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService, meetingSlotService, meetingBookingService, proposalService } from '../../services/api';

const NAV_ITEMS = [
    { id: 'automated-allocation', label: 'Dashboard', icon: '🏠' },
    { id: 'current-allocations', label: 'Allocations', icon: '📊' },
];

const RESEARCH_AREAS = [
    { value: 'AI_ML', label: 'AI & Machine Learning' },
    { value: 'CYBER', label: 'Cybersecurity & Blockchain' },
    { value: 'IOT', label: 'IoT & Embedded Systems' },
    { value: 'WEB', label: 'Web & Mobile Development' },
    { value: 'DATA', label: 'Data Science & Analytics' },
    { value: 'OTHER', label: 'Other' },
];


const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [invite, setInvite] = useState({ username: '', email: '', phone_number: '', expertise: '', research_area: 'AI_ML', max_capacity: 5 });
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);
    const [unassigned, setUnassigned] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [pick, setPick] = useState({});

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await adminService.getAllocations();
            setAllocations(data);
        } catch (err) {
            setError('Could not load allocations.');
        } finally {
            setLoading(false);
        }
    const [allocData, slotData, bookingData, unassignedData, supData] = await Promise.all([
        adminService.getAllocations(),
        meetingSlotService.getSlots(),
        meetingBookingService.getBookings(),
        proposalService.getUnassigned(),
        adminService.getSupervisors(),
        ]);
    setUnassigned(unassignedData);
    setSupervisors(supData);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleInvite = async (e) => {
        e.preventDefault();
        setError('');
        setInviteResult(null);
        setInviting(true);
        try {
            const data = await adminService.inviteSupervisor(invite);
            setInviteResult(data);
            setInvite({ username: '', email: '', phone_number: '', expertise: '', research_area: 'AI_ML', max_capacity: 5 });
        } catch (err) {
            setError(err.response?.data?.error || 'Could not appoint this supervisor.');
        } finally {
            setInviting(false);
        }
    };

    const handleAppoint = async (proposalId) => {
        setError('');
        try {
            await proposalService.appointSupervisor(proposalId, pick[proposalId]);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Could not appoint that supervisor.');
        }
    };

    const handleAutoAllocate = async () => {
        setError('');
        setResult(null);
        setRunning(true);
        try {
            const data = await adminService.runAutoAllocate();
            setResult(data);
            await loadData();
        } catch (err) {
            const d = err.response?.data;
            setError(`Auto-allocation failed (${err.response?.status || 'no response'}): ${d?.error || d?.detail || err.message}`);
        } finally {
            setRunning(false);
        }
    };

    if (loading) return <div className="p-8">Loading dashboard...</div>;

    return (
        <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8">
            <div className="w-full grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px] gap-5 lg:gap-6 min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">

                {/* Sidebar */}
                <aside className="bg-slate-950/80 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col">
                    <div className="lg:sticky lg:top-6 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                {user?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white font-semibold text-sm truncate">{user?.username}</p>
                                <p className="text-slate-400 text-xs truncate">Project Coordinator</p>
                            </div>
                        </div>

                        <nav className="space-y-1 flex-1">
                            {NAV_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className="w-full flex items-center gap-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors"
                                >
                                    <span className="text-base">{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                            <button
                                onClick={() => setShowProfile(true)}
                                className="w-full flex items-center gap-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors"
                            >
                                <span className="text-base">👤</span>
                                Profile
                            </button>

                            <button
                                onClick={logout}
                                className="mt-6 w-full text-xs text-slate-200 hover:text-red-300 border border-white/10 rounded-lg px-3 py-2.5 transition-colors"
                            >
                                🚪 Logout
                            </button>
                        </nav>

                        
                    </div>
                </aside>

                {/* Main panel */}
                <main className="min-w-0 bg-gradient-to-br from-emerald-400/15 to-blue-600/15 backdrop-blur-md rounded-2xl border border-white/10 p-6 lg:p-10 shadow-2xl">
                    <header className="mb-10">
                        <h1 className="text-2xl font-semibold text-white mb-1">
                            Welcome back, {user?.username}
                        </h1>
                        <p className="text-slate-300 text-sm">
                            {allocations.length} project{allocations.length !== 1 ? 's' : ''} currently allocated
                        </p>
                    </header>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-6 border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <section id="appoint-supervisor" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-1">Appoint a Supervisor</h2>
                            <p className="text-xs text-slate-300 mb-4">
                                The supervisor receives an SMS with a one-time link to set their own password. Their phone number is then used for login codes.
                            </p>
                            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                                {[
                                    ['username', 'Username', 'text'],
                                    ['email', 'Email', 'email'],
                                    ['phone_number', 'Phone (+254…)', 'text'],
                                    ['expertise', 'Expertise', 'text'],
                                ].map(([key, label, type]) => (
                                    <div key={key}>
                                        <label htmlFor={`inv-${key}`} className="block text-sm text-slate-200 mb-1">{label}</label>
                                        <input
                                            id={`inv-${key}`}
                                            type={type}
                                            value={invite[key]}
                                            onChange={(e) => setInvite({ ...invite, [key]: e.target.value })}
                                            required={key === 'username' || key === 'phone_number'}
                                            className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white"
                                        />
                                    </div>
                                ))}
                                <div>
                                    <label htmlFor="inv-area" className="block text-sm text-slate-200 mb-1">Research area</label>
                                    <select
                                        id="inv-area"
                                        value={invite.research_area}
                                        onChange={(e) => setInvite({ ...invite, research_area: e.target.value })}
                                        className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white"
                                    >
                                        {RESEARCH_AREAS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="inv-cap" className="block text-sm text-slate-200 mb-1">Max students</label>
                                    <input
                                        id="inv-cap"
                                        type="number"
                                        min="1"
                                        value={invite.max_capacity}
                                        onChange={(e) => setInvite({ ...invite, max_capacity: e.target.value })}
                                        className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <button
                                        type="submit"
                                        disabled={inviting}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                                    >
                                        {inviting ? 'Sending…' : 'Appoint & Send Invite'}
                                    </button>
                                </div>
                            </form>

                            {inviteResult && (
                                <div className="mt-4 text-sm">
                                    <p className={inviteResult.sms_sent ? 'text-emerald-300' : 'text-amber-300'}>
                                        {inviteResult.message} {inviteResult.sms_sent ? 'SMS sent.' : 'SMS could not be sent.'}
                                    </p>
                                    {inviteResult.activation_link && (
                                        <p className="text-xs text-slate-300 mt-1 break-all">
                                            Dev link: {inviteResult.activation_link}
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                        {unassigned.length > 0 && (
                            <section id="unassigned" className="border-t border-white/10 pt-8 scroll-mt-6">
                                <h2 className="text-sm font-semibold text-white tracking-wide mb-1">
                                    Proposals Awaiting a Supervisor ({unassigned.length})
                                </h2>
                                <p className="text-xs text-slate-300 mb-4">
                                    Every supervisor in these students' research areas is at capacity. Appoint one so the topic can be reviewed.
                                </p>
                                <div className="space-y-2">
                                    {unassigned.map((p) => (
                                        <div key={p.id} className="border border-amber-400/30 bg-amber-500/5 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm text-white truncate">{p.title}</p>
                                                <p className="text-xs text-slate-400">{p.student_details?.username} • {p.research_area}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <select
                                                    value={pick[p.id] || ''}
                                                    onChange={(e) => setPick({ ...pick, [p.id]: e.target.value })}
                                                    className="px-2 py-1.5 text-sm border border-white/15 bg-slate-900/30 rounded text-white"
                                                >
                                                    <option value="">Choose supervisor...</option>
                                                    {supervisors.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.user_details?.username} ({s.research_area})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleAppoint(p.id)}
                                                    disabled={!pick[p.id]}
                                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
                                                >
                                                    Appoint
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        <section id="automated-allocation" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-sm font-semibold text-white tracking-wide">Automated Allocation</h2>
                                <button
                                    onClick={handleAutoAllocate}
                                    disabled={running}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                                >
                                    {running ? 'Running...' : 'Run Auto-Allocation'}
                                </button>
                            </div>
                            <p className="text-sm text-slate-200">
                                Assigns approved proposals to supervisors based on requested preference and available capacity.
                            </p>

                            {result && (
                                <div className="mt-4 text-sm">
                                    <p className="text-green-400 font-medium mb-1">
                                        Allocated: {result.allocated_count} | Skipped: {result.skipped_count}
                                    </p>
                                    {result.skipped.length > 0 && (
                                        <ul className="text-slate-200 list-disc list-inside">
                                            {result.skipped.map((s, i) => (
                                                <li key={i}>{s.student}: {s.reason}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </section>

                        <section id="current-allocations" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">Current Allocations</h2>
                            {allocations.length === 0 ? (
                                <p className="text-sm text-white/80">No projects allocated yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-slate-200 border-b border-white/10">
                                                <th className="pb-2">Project</th>
                                                <th className="pb-2">Student</th>
                                                <th className="pb-2">Supervisor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allocations.map((a) => (
                                                <tr key={a.id} className="border-b border-white/10 last:border-0">
                                                    <td className="py-2 text-slate-100">{a.title}</td>
                                                    <td className="py-2 text-slate-100">{a.student_details?.username}</td>
                                                    <td className="py-2 text-slate-100">{a.supervisor_details?.user_details?.username}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </main>

                {/* Recent Activity */}
                <aside className="bg-gradient-to-br from-blue-400/15 to-emerald-600/15 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col">
                    <div className="lg:sticky lg:top-6 flex flex-col h-full">
                        <h2 className="font-semibold text-white text-sm mb-5">Recent Activity</h2>
                        <div className="space-y-4">
                            {result ? (
                                <div className="border-b border-white/10 pb-3">
                                    <p className="text-xs text-emerald-300">
                                        Last run: {result.allocated_count} allocated, {result.skipped_count} skipped
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400">No recent activity yet.</p>
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Profile Modal */}
            {showProfile && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(false)}>
                    <div className="bg-slate-900 border border-white/15 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                                {user?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <p className="text-white font-semibold">{user?.username}</p>
                                <p className="text-slate-400 text-xs">Project Coordinator</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-slate-400">Total Allocations</span>
                                <span className="text-white">{allocations.length}</span>
                            </div>
                            {result && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Last Run Result</span>
                                    <span className="text-white">
                                        {result.allocated_count} allocated / {result.skipped_count} skipped
                                    </span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowProfile(false)}
                            className="mt-5 w-full text-xs border border-white/10 text-slate-300 hover:text-white px-3 py-2 rounded"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;


















// import { useState, useEffect } from 'react';
// import { useAuth } from '../../context/AuthContext';
// import { adminService } from '../../services/api';
// // Global GradientLayout applied in App.jsx

// const AdminDashboard = () => {
//     const { user, logout } = useAuth();
//     const [allocations, setAllocations] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [running, setRunning] = useState(false);
//     const [error, setError] = useState('');
//     const [result, setResult] = useState(null);

//     const loadData = async () => {
//         setLoading(true);
//         try {
//             const data = await adminService.getAllocations();
//             setAllocations(data);
//         } catch (err) {
//             setError('Could not load allocations.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         loadData();
//     }, []);

//     const handleAutoAllocate = async () => {
//         setError('');
//         setResult(null);
//         setRunning(true);
//         try {
//             const data = await adminService.runAutoAllocate();
//             setResult(data);
//             await loadData();
//         } catch (err) {
//             setError('Auto-allocation failed. Please try again.');
//         } finally {
//             setRunning(false);
//         }
//     };

//     if (loading) return <div className="p-8">Loading dashboard...</div>;

//     return (
//             <div className="min-h-[60vh] p-8">
//                 <div className="max-w-5xl mx-auto">
//                     <div className="flex justify-between items-center mb-8">
//                         <div>
//                             <h1 className="text-2xl font-semibold text-white tracking-tight">Admin Dashboard</h1>
//                             <p className="text-slate-300 text-sm mt-1">Welcome, {user?.username}</p>
//                         </div>
//                         <button
//                             onClick={logout}
//                             className="text-sm text-slate-200 hover:text-blue-300 border border-white/10 rounded px-3 py-1.5 transition-colors"
//                         >
//                             Logout
//                         </button>
//                     </div>

//                     {error && (
//                         <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4 border border-red-200">
//                             {error}
//                         </div>
//                     )}

//                     <div className="space-y-6">
//                         <section className="dashboard-section bg-gradient-to-br from-emerald-400/25 to-blue-600/25 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-2xl">
//                             <div className="flex justify-between items-center mb-2">
//                                 <h2 className="font-semibold text-white">Automated Allocation</h2>
//                                 <button
//                                     onClick={handleAutoAllocate}
//                                     disabled={running}
//                                     className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
//                                 >
//                                     {running ? 'Running...' : 'Run Auto-Allocation'}
//                                 </button>
//                             </div>
//                             <p className="text-sm text-slate-200">
//                                 Assigns approved proposals to supervisors based on requested preference and available capacity.
//                             </p>

//                             {result && (
//                                 <div className="mt-4 text-sm">
//                                     <p className="text-green-400 font-medium mb-1">
//                                         Allocated: {result.allocated_count} | Skipped: {result.skipped_count}
//                                     </p>
//                                     {result.skipped.length > 0 && (
//                                         <ul className="text-slate-200 list-disc list-inside">
//                                             {result.skipped.map((s, i) => (
//                                                 <li key={i}>{s.student}: {s.reason}</li>
//                                             ))}
//                                         </ul>
//                                     )}
//                                 </div>
//                             )}
//                         </section>

//                         <section className="dashboard-section bg-gradient-to-br from-emerald-400/25 to-blue-600/25 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-2xl">
//                             <h2 className="font-semibold text-white mb-4">Current Allocations</h2>
//                             {allocations.length === 0 ? (
//                                 <p className="text-sm text-white/80">No projects allocated yet.</p>
//                             ) : (
//                                 <div className="overflow-x-auto">
//                                     <table className="w-full text-sm">
//                                         <thead>
//                                             <tr className="text-left text-slate-200 border-b border-white/10">
//                                                 <th className="pb-2">Project</th>
//                                                 <th className="pb-2">Student</th>
//                                                 <th className="pb-2">Supervisor</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {allocations.map((a) => (
//                                                 <tr key={a.id} className="border-b border-white/10 last:border-0">
//                                                     <td className="py-2 text-slate-100">{a.title}</td>
//                                                     <td className="py-2 text-slate-100">{a.student_details?.username}</td>
//                                                     <td className="py-2 text-slate-100">
//                                                         {a.supervisor_details?.user_details?.username}
//                                                     </td>
//                                                 </tr>
//                                             ))}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             )}
//                         </section>
//                     </div>
//                 </div>
//             </div>
//     );
// };

// export default AdminDashboard;