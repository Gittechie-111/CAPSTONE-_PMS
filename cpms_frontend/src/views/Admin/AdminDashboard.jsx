import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    adminService, settingsService, milestoneService, milestoneAdminService,
    meetingSlotService, proposalService,
} from '../../services/api';
import { apiError } from '../../services/apiError';

const RESEARCH_AREAS = [
    { value: 'AI_ML', label: 'AI & Machine Learning' },
    { value: 'CYBER', label: 'Cybersecurity & Blockchain' },
    { value: 'IOT', label: 'IoT & Embedded Systems' },
    { value: 'WEB', label: 'Web & Mobile Development' },
    { value: 'DATA', label: 'Data Science & Analytics' },
    { value: 'OTHER', label: 'Other' },
];

const NAV_ITEMS = [
    { id: 'appoint-supervisor', label: 'Appoint Supervisor', icon: '👩‍🏫' },
    { id: 'timelines', label: 'Timelines', icon: '⏰' },
    { id: 'automated-allocation', label: 'Run Allocation', icon: '🎯' },
    { id: 'current-allocations', label: 'Allocations', icon: '📊' },
    { id: 'open-slots', label: 'Open Slots', icon: '🗓️' },
    { id: 'past-meetings', label: 'Past Meetings', icon: '📜' },
];

const EMPTY_INVITE = { username: '', email: '', phone_number: '', expertise: '', research_area: 'AI_ML', max_capacity: 5 };

const toDatetimeLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmt = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Optional extras should not blank the whole dashboard if one request fails
const safe = (promise, fallback) =>
    promise.catch((err) => {
        console.error('Admin dashboard request failed:', err.config?.url, err.response?.status, err.response?.data);
        return fallback;
    });

const fieldClass = 'w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white';
const areaLabel = (v) => RESEARCH_AREAS.find((r) => r.value === v)?.label || v || '';

const AdminDashboard = () => {
    const { user, logout } = useAuth();

    const [allocations, setAllocations] = useState([]);
    const [slots, setSlots] = useState([]);
    const [unassigned, setUnassigned] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [proposalDeadline, setProposalDeadline] = useState('');

    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [showProfile, setShowProfile] = useState(false);

    const [invite, setInvite] = useState(EMPTY_INVITE);
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);
    const [pick, setPick] = useState({});
    const [savingDeadline, setSavingDeadline] = useState(false);
    const [allocSearch, setAllocSearch] = useState('');
    const [expandedSupervisor, setExpandedSupervisor] = useState(null);

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Six names on the left, six calls on the right, in the same order.
    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [allocData, settingsData, milestoneData, slotData, unassignedData, supervisorData] = await Promise.all([
                adminService.getAllocations(),
                safe(settingsService.getSettings(), {}),
                safe(milestoneService.getMilestones(), []),
                safe(meetingSlotService.getSlots(), []),
                safe(proposalService.getUnassigned(), []),
                safe(adminService.getSupervisors(), []),
            ]);
            setAllocations(allocData);
            setProposalDeadline(settingsData.proposal_deadline || '');
            setMilestones(milestoneData);
            setSlots(slotData);
            setUnassigned(unassignedData);
            setSupervisors(supervisorData);
        } catch (err) {
            console.error('Admin loadData failed:', err);
            setError(apiError(err, 'Could not load dashboard data.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAutoAllocate = async () => {
        setError('');
        setResult(null);
        setRunning(true);
        try {
            setResult(await adminService.runAutoAllocate());
            await loadData(true);
        } catch (err) {
            setError(`Auto-allocation failed: ${apiError(err)}`);
        } finally {
            setRunning(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setError('');
        setInviteResult(null);
        setInviting(true);
        try {
            setInviteResult(await adminService.inviteSupervisor(invite));
            setInvite(EMPTY_INVITE);
            await loadData(true);
        } catch (err) {
            setError(apiError(err, 'Could not appoint this supervisor.'));
        } finally {
            setInviting(false);
        }
    };

    const handleAppoint = async (proposalId) => {
        setError('');
        try {
            await proposalService.appointSupervisor(proposalId, pick[proposalId]);
            await loadData(true);
        } catch (err) {
            setError(apiError(err, 'Could not appoint that supervisor.'));
        }
    };

    // The proposal-topic deadline is one global setting: students and every supervisor see this same date.
    const saveDeadline = async (value) => {
        setError('');
        setSavingDeadline(true);
        try {
            await settingsService.updateProposalDeadline(value);
            await loadData(true);
        } catch (err) {
            setError(apiError(err, 'Could not save the deadline.'));
        } finally {
            setSavingDeadline(false);
        }
    };

    const handleUpdateMilestoneDate = async (id, value) => {
        if (!value) return;
        setError('');
        try {
            await milestoneAdminService.updateMilestone(id, { due_date: value });
            await loadData(true);
        } catch (err) {
            setError(apiError(err, 'Could not update that date.'));
        }
    };

    const handleChapterDeadline = async (milestoneId, chapter, value, current) => {
        if (value === toDatetimeLocal(current)) return;
        setError('');
        try {
            const updated = await milestoneAdminService.setChapterDeadlines(milestoneId, { [chapter]: value });
            setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        } catch (err) {
            setError(apiError(err, 'Could not save that chapter deadline.'));
        }
    };

    // ---- derived data -------------------------------------------------
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const deadlineDate = proposalDeadline ? new Date(proposalDeadline) : null;
    const deadlineClosed = deadlineDate && deadlineDate < now;

    const supName = (s) =>
        s.supervisor_name ||
        supervisors.find((x) => x.id === s.supervisor)?.user_details?.username ||
        `Supervisor ${s.supervisor}`;

    const openSlots = slots
        .filter((s) => s.status === 'OPEN' && new Date(s.start_time) > now)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const pastSlots = slots
        .filter((s) => new Date(s.start_time) < now && new Date(s.start_time) >= monthAgo)
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    const term = allocSearch.trim().toLowerCase();
    const areaByName = {};
    const bySupervisor = allocations
        .filter((a) =>
            !term ||
            a.title?.toLowerCase().includes(term) ||
            a.student_details?.username?.toLowerCase().includes(term) ||
            a.supervisor_details?.user_details?.username?.toLowerCase().includes(term) ||
            areaLabel(a.supervisor_details?.research_area).toLowerCase().includes(term)
        )
        .reduce((acc, a) => {
            const name = a.supervisor_details?.user_details?.username || 'Unassigned';
            areaByName[name] = a.supervisor_details?.research_area;
            (acc[name] = acc[name] || []).push(a);
            return acc;
        }, {});
    const supervisorNames = Object.keys(bySupervisor).sort();

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
                        <h1 className="text-2xl font-semibold text-white mb-1">Welcome back, {user?.username}</h1>
                        <p className="text-slate-300 text-sm">
                            {allocations.length} project{allocations.length !== 1 ? 's' : ''} currently allocated
                        </p>
                    </header>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-6 border border-red-200">{error}</div>
                    )}

                    <div className="space-y-6">

                        {/* Appoint a supervisor */}
                        <section id="appoint-supervisor" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-1">Appoint a Supervisor</h2>
                            <p className="text-xs text-slate-300 mb-4">
                                The supervisor receives an email with a one-time link to set their own password and security question.
                                Their phone number is used for login codes.
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
                                            required={key !== 'expertise'}
                                            className={fieldClass}
                                        />
                                    </div>
                                ))}
                                <div>
                                    <label htmlFor="inv-area" className="block text-sm text-slate-200 mb-1">Research area</label>
                                    <select
                                        id="inv-area"
                                        value={invite.research_area}
                                        onChange={(e) => setInvite({ ...invite, research_area: e.target.value })}
                                        className={fieldClass}
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
                                        className={fieldClass}
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
                                    <p className={inviteResult.email_sent ? 'text-emerald-300' : 'text-amber-300'}>
                                        {inviteResult.message} {inviteResult.email_sent ? 'Invitation email sent.' : 'The email could not be sent.'}
                                    </p>
                                    {inviteResult.activation_link && (
                                        <p className="text-xs text-slate-300 mt-1 break-all">Dev link: {inviteResult.activation_link}</p>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Proposals nobody could be routed to */}
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

                        {/* Timelines */}
                        <section id="timelines" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-1">Timelines</h2>
                            <p className="text-xs text-slate-300 mb-4">
                                You set these dates once. Every student and every supervisor sees the same dates.
                            </p>

                            <label htmlFor="proposal-deadline" className="block text-sm text-slate-200 mb-1">
                                Proposal topic &amp; description deadline
                            </label>
                            <div className="flex flex-wrap gap-2 max-w-lg">
                                <input
                                    id="proposal-deadline"
                                    type="datetime-local"
                                    value={toDatetimeLocal(proposalDeadline)}
                                    onChange={(e) => setProposalDeadline(e.target.value)}
                                    className="flex-1 min-w-[14rem] px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white"
                                />
                                <button
                                    onClick={() => saveDeadline(proposalDeadline || null)}
                                    disabled={savingDeadline}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                                >
                                    {savingDeadline ? 'Saving…' : 'Save'}
                                </button>
                                {proposalDeadline && (
                                    <button
                                        onClick={() => saveDeadline(null)}
                                        disabled={savingDeadline}
                                        className="border border-white/15 text-slate-200 hover:text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <p className={`text-xs mt-2 ${deadlineClosed ? 'text-red-300' : 'text-emerald-300'}`}>
                                {!deadlineDate
                                    ? 'No deadline set: students can submit topics at any time.'
                                    : deadlineClosed
                                    ? `Closed on ${fmt(proposalDeadline)}. Students can no longer submit topics.`
                                    : `Open: students can submit topics until ${fmt(proposalDeadline)}.`}
                            </p>

                            <p className="text-sm text-slate-200 mt-6 mb-2">Milestone deadlines</p>
                            <div className="space-y-4 max-w-lg">
                                {milestones.length === 0 && <p className="text-xs text-slate-400">No milestones found.</p>}
                                {milestones.map((m) => (
                                    <div key={m.id} className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm text-slate-200">
                                                {m.title} ({m.weight}%){m.has_chapters ? ' — final deadline' : ''}
                                            </span>
                                            <input
                                                type="datetime-local"
                                                defaultValue={toDatetimeLocal(m.due_date)}
                                                onBlur={(e) => handleUpdateMilestoneDate(m.id, e.target.value)}
                                                className="px-2 py-1 border border-white/15 bg-slate-900/30 rounded text-white text-sm"
                                            />
                                        </div>

                                        {m.has_chapters && (
                                            <div className="ml-4 pl-4 border-l border-white/10 space-y-2">
                                                <p className="text-xs text-slate-400">
                                                    Chapter deadlines. Leave a box empty to use the final deadline.
                                                </p>
                                                {[1, 2, 3, 4, 5].map((ch) => (
                                                    <div
                                                        key={`${m.id}-${ch}-${m.chapter_deadlines?.[ch] || ''}`}
                                                        className="flex items-center justify-between gap-3"
                                                    >
                                                        <span className="text-xs text-slate-300">Chapter {ch}</span>
                                                        <input
                                                            type="datetime-local"
                                                            defaultValue={toDatetimeLocal(m.chapter_deadlines?.[ch])}
                                                            onBlur={(e) =>
                                                                handleChapterDeadline(m.id, ch, e.target.value, m.chapter_deadlines?.[ch])
                                                            }
                                                            className="px-2 py-1 border border-white/15 bg-slate-900/30 rounded text-white text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Auto allocation */}
                        <section id="automated-allocation" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <div className="flex justify-between items-center mb-2 gap-3">
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
                                Confirms supervisors for topics a lecturer has approved, based on the appointed supervisor and available capacity.
                            </p>

                            {result && (
                                <div className="mt-4 text-sm">
                                    <p className="text-green-400 font-medium mb-1">
                                        Allocated: {result.allocated_count} | Skipped: {result.skipped_count}
                                    </p>
                                    {result.skipped?.length > 0 && (
                                        <ul className="text-slate-200 list-disc list-inside">
                                            {result.skipped.map((s, i) => <li key={i}>{s.student}: {s.reason}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Current allocations, grouped by supervisor */}
                        <section id="current-allocations" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                                <h2 className="text-sm font-semibold text-white tracking-wide">Current Allocations</h2>
                                <input
                                    type="text"
                                    value={allocSearch}
                                    onChange={(e) => setAllocSearch(e.target.value)}
                                    placeholder="Search student or project..."
                                    className="px-3 py-1.5 text-sm border border-white/15 bg-slate-900/30 rounded text-white placeholder:text-slate-500 w-64"
                                />
                            </div>
                            {allocations.length === 0 ? (
                                <p className="text-sm text-white/80">No projects allocated yet.</p>
                            ) : supervisorNames.length === 0 ? (
                                <p className="text-sm text-white/80">No matches.</p>
                            ) : (
                                <div className="space-y-2">
                                    {supervisorNames.map((name) => {
                                        const open = expandedSupervisor === name;
                                        const rows = bySupervisor[name];
                                        return (
                                            <div key={name} className="border border-white/15 bg-slate-900/20 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedSupervisor(open ? null : name)}
                                                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                                                >
                                                    <span className="text-sm text-white">
                                                        {name}
                                                        {areaByName[name] && (
                                                            <span className="text-slate-400"> · {areaLabel(areaByName[name])}</span>
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {rows.length} student{rows.length !== 1 ? 's' : ''} {open ? '▲' : '▼'}
                                                    </span>
                                                </button>
                                                {open && (
                                                    <div className="overflow-x-auto border-t border-white/10">
                                                        <table className="w-full text-sm">
                                                            <tbody>
                                                                {rows.map((a) => (
                                                                    <tr key={a.id} className="border-b border-white/10 last:border-0">
                                                                        <td className="py-2 px-4 text-slate-100">{a.title}</td>
                                                                        <td className="py-2 px-4 text-slate-300">{a.student_details?.username}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Open slots */}
                        <section id="open-slots" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">All Open Slots</h2>
                            {openSlots.length === 0 ? (
                                <p className="text-sm text-white/80">No open slots right now.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-slate-200 border-b border-white/10">
                                                <th className="pb-2">Supervisor</th>
                                                <th className="pb-2">Starts</th>
                                                <th className="pb-2">Booked</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {openSlots.map((s) => (
                                                <tr key={s.id} className="border-b border-white/10 last:border-0">
                                                    <td className="py-2 text-slate-100">{supName(s)}</td>
                                                    <td className="py-2 text-slate-100">{fmt(s.start_time)}</td>
                                                    <td className="py-2 text-slate-100">{s.booked_count}/{s.capacity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* Past meetings: last 30 days only */}
                        <section id="past-meetings" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-1">Past Meetings — Last 30 Days</h2>
                            <p className="text-xs text-slate-400 mb-4">Older meetings are not shown here.</p>
                            {pastSlots.length === 0 ? (
                                <p className="text-sm text-white/80">No meetings in the last 30 days.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-slate-200 border-b border-white/10">
                                                <th className="pb-2">Supervisor</th>
                                                <th className="pb-2">Date</th>
                                                <th className="pb-2">Status</th>
                                                <th className="pb-2">Booked</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pastSlots.map((s) => (
                                                <tr key={s.id} className="border-b border-white/10 last:border-0">
                                                    <td className="py-2 text-slate-100">{supName(s)}</td>
                                                    <td className="py-2 text-slate-100">{new Date(s.start_time).toLocaleDateString()}</td>
                                                    <td className="py-2 text-slate-100">{s.status}</td>
                                                    <td className="py-2 text-slate-100">{s.booked_count}/{s.capacity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </main>

                {/* Recent activity */}
                <aside className="bg-gradient-to-br from-blue-400/15 to-emerald-600/15 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col">
                    <div className="lg:sticky lg:top-6 flex flex-col h-full">
                        <h2 className="font-semibold text-white text-sm mb-5">Recent Activity</h2>
                        <div className="space-y-4">
                            {unassigned.length > 0 && (
                                <div className="border-b border-white/10 pb-3">
                                    <p className="text-xs text-amber-300">
                                        {unassigned.length} proposal{unassigned.length !== 1 ? 's' : ''} waiting for a supervisor
                                    </p>
                                </div>
                            )}
                            {result ? (
                                <div className="border-b border-white/10 pb-3">
                                    <p className="text-xs text-emerald-300">
                                        Last run: {result.allocated_count} allocated, {result.skipped_count} skipped
                                    </p>
                                </div>
                            ) : (
                                unassigned.length === 0 && <p className="text-xs text-slate-400">No recent activity yet.</p>
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Profile modal */}
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
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-slate-400">Supervisors</span>
                                <span className="text-white">{supervisors.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Awaiting a supervisor</span>
                                <span className="text-white">{unassigned.length}</span>
                            </div>
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