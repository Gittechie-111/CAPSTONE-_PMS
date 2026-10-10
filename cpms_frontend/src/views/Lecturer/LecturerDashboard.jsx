import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    projectService, meetingSlotService, meetingBookingService, proposalService,
    settingsService, milestoneAdminService, milestoneService, submissionService, notificationService,
} from '../../services/api';
import FileViewer from '../../components/FileViewer';
import NotificationItem from '../../components/NotificationItem';

const CHAPTERS = [1, 2, 3, 4, 5];

const toDatetimeLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const NAV_ITEMS = [
       { id: 'assigned-proposals', label: 'Topics to Review', icon: '📝' },
       { id: 'supervised-students', label: 'Dashboard', icon: '🏠' },
       { id: 'student-submissions', label: 'Submissions', icon: '📚' },
       { id: 'meeting-slots', label: 'Meeting Slots', icon: '🗓️' },
       { id: 'slot-bookings', label: 'Upcoming Meetings', icon: '📅' },
       { id: 'manage-timelines', label: 'Timelines', icon: '⏰' },
   ];

const LecturerDashboard = () => {
    const { user, logout } = useAuth();
    const [projects, setProjects] = useState([]);
    const [proposals, setProposals] = useState([]);
    const [slots, setSlots] = useState([]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [feedbackProposalId, setFeedbackProposalId] = useState(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [addingFeedback, setAddingFeedback] = useState(false);
    const [milestones, setMilestones] = useState([]);
    const [proposalDeadline, setProposalDeadline] = useState('');
    const [savingTimeline, setSavingTimeline] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [rescheduleSlotId, setRescheduleSlotId] = useState(null);
    const [rescheduleStart, setRescheduleStart] = useState('');
    const [rescheduleEnd, setRescheduleEnd] = useState('');
    const [rescheduleReason, setRescheduleReason] = useState('');
    const [rescheduling, setRescheduling] = useState(false);
    const [cancelSlotId, setCancelSlotId] = useState(null);
    const [cancelSlotReason, setCancelSlotReason] = useState('');
    const [cancellingSlot, setCancellingSlot] = useState(false);
    const [selectedStudentInfo, setSelectedStudentInfo] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [reviewComments, setReviewComments] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [viewingSubmission, setViewingSubmission] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [viewerFile, setViewerFile] = useState(null);

    const API_BASE = 'http://127.0.0.1:8000';
    const toAbsoluteUrl = (url) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${API_BASE}${url}`;
    };

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [
                projectData, slotData, proposalData, milestoneData,
                settingsData, bookingData, submissionData, notifData,
            ] = await Promise.all([
                projectService.getProjects(),
                meetingSlotService.getSlots(),
                proposalService.getProposals(),
                milestoneService.getMilestones(),
                settingsService.getSettings(),
                meetingBookingService.getBookings(),
                submissionService.getSubmissions(),
                notificationService.getNotifications(),
            ]);
            setProjects(projectData);
            setSlots(slotData);
            setProposals(proposalData);
            setMilestones(milestoneData);
            setProposalDeadline(settingsData.proposal_deadline || '');
            setBookings(bookingData);
            setSubmissions(submissionData);
            setNotifications(notifData);
        } catch (err) {
            setError('Could not load your dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateSlot = async (e) => {
        e.preventDefault();
        setError('');
        if (!startTime || !endTime) {
            setError('Set both a start and end time.');
            return;
        }
        if (new Date(endTime) <= new Date(startTime)) {
            setError('End time must be after start time.');
            return;
        }
        setCreating(true);
        try {
            await meetingSlotService.createSlot(startTime, endTime);
            setStartTime('');
            setEndTime('');
            await loadData();
        } catch (err) {
            setError('Could not create the slot. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteSlot = async (slotId) => {
        if (!window.confirm('Delete this slot?')) return;
        setError('');
        try {
            await meetingSlotService.deleteSlot(slotId);
            await loadData();
        } catch (err) {
            setError('Could not delete this slot — it may already be booked.');
        }
    };

    const handleCompleteSlot = async (slotId) => {
        setError('');
        try {
            await meetingSlotService.completeSlot(slotId);
            await loadData();
        } catch (err) {
            setError('Could not mark this slot complete.');
        }
    };

    const handleSubmitReschedule = async () => {
        if (!rescheduleReason.trim()) {
            setError('A reason is required to reschedule.');
            return;
        }
        if (!rescheduleStart || !rescheduleEnd) {
            setError('Set a new start and end time.');
            return;
        }
        setRescheduling(true);
        setError('');
        try {
            await meetingSlotService.rescheduleSlot(rescheduleSlotId, rescheduleStart, rescheduleEnd, rescheduleReason);
            setRescheduleSlotId(null);
            setRescheduleStart('');
            setRescheduleEnd('');
            setRescheduleReason('');
            await loadData();
        } catch (err) {
            setError('Could not reschedule this slot.');
        } finally {
            setRescheduling(false);
        }
    };

    const handleSubmitCancelSlot = async () => {
        if (!cancelSlotReason.trim()) {
            setError('A reason is required to cancel.');
            return;
        }
        setCancellingSlot(true);
        setError('');
        try {
            await meetingSlotService.cancelSlot(cancelSlotId, cancelSlotReason);
            setCancelSlotId(null);
            setCancelSlotReason('');
            await loadData();
        } catch (err) {
            setError('Could not cancel this slot.');
        } finally {
            setCancellingSlot(false);
        }
    };

    const handleReview = async (proposalId, status) => {
        setError('');
        let feedback = '';
        if (status === 'REJECTED') {
            const p = proposals.find((x) => x.id === proposalId);
            if (!p?.supervisor_feedback) {
                feedback = (window.prompt('Reason for rejecting this topic (the student will see it):') || '').trim();
                if (!feedback) return;
            }
        }
        try {
            await proposalService.reviewProposal(proposalId, status, feedback);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Could not update this proposal.');
        }
    };

    const handleAddFeedback = async (proposalId) => {
        if (!feedbackText.trim()) {
            setError('Feedback cannot be empty.');
            return;
        }
        setError('');
        setAddingFeedback(true);
        try {
            await proposalService.addFeedback(proposalId, feedbackText);
            setFeedbackText('');
            setFeedbackProposalId(null);
            await loadData();
        } catch (err) {
            const errData = err.response?.data;
            if (typeof errData === 'string') setError(errData);
            else if (errData?.error) setError(errData.error);
            else if (errData?.message) setError(errData.message);
            else setError('Could not add feedback. Please try again.');
        } finally {
            setAddingFeedback(false);
        }
    };

    const handleSaveDeadline = async () => {
        setSavingTimeline(true);
        setError('');
        try {
            await settingsService.updateProposalDeadline(proposalDeadline);
            await loadData();
        } catch (err) {
            setError('Could not update the proposal deadline.');
        } finally {
            setSavingTimeline(false);
        }
    };

    const handleUpdateMilestoneDate = async (milestoneId, newDate) => {
        setError('');
        try {
            await milestoneAdminService.updateMilestone(milestoneId, { due_date: newDate });
            await loadData();
        } catch (err) {
            setError('Could not update that milestone deadline.');
        }
    };

    const handleReviewSubmission = async (submissionId, status) => {
        setError('');
        try {
            await submissionService.reviewSubmission(submissionId, status, reviewComments[submissionId] || '');
            await loadData();
        } catch (err) {
            setError('Could not update this submission.');
        }
    };

    const formatDateTime = (iso) =>
        new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

    const groupSubmissionsByStudent = () => {
        return submissions.reduce((acc, s) => {
            const username = s.project_details?.student_details?.username || 'Unknown';
            if (!acc[username]) acc[username] = [];
            acc[username].push(s);
            return acc;
        }, {});
    };

    const pendingProposalCount = proposals.filter((p) => p.status === 'PENDING').length;
    const openSlotCount = slots.filter((s) => s.status === 'OPEN').length;

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
                                <p className="text-slate-400 text-xs truncate">Lecturer / Supervisor</p>
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
                            Supervising {projects.length} student{projects.length !== 1 ? 's' : ''}
                        </p>
                    </header>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-6 border border-red-200">
                            {error}
                        </div>
                    )}

                    {/* Assigned Proposals & Feedback */}
                        <section id="assigned-proposals" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">Proposal Topics for Review</h2>
                            {proposals.length === 0 ? (
                                <p className="text-sm text-white/80">No proposal topics assigned to you yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {proposals.map((p) => (
                                        <div key={p.id} className="border border-white/15 bg-slate-900/20 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-white">{p.title}</p>
                                                    <p className="text-xs text-slate-300 mt-0.5">from {p.student_details?.username}</p>
                                                    <p className="text-xs text-slate-400">
                                                        Reg No: {p.student_details?.registration_number || 'N/A'} • Phone: {p.student_details?.phone_number || 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Submitted: {new Date(p.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                    p.status === 'APPROVED' ? 'bg-green-500/20 text-green-300'
                                                    : p.status === 'REJECTED' ? 'bg-red-500/20 text-red-300'
                                                    : 'bg-yellow-500/20 text-yellow-300'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-100 mb-3">{p.description}</p>

                                            {p.status === 'PENDING' && (
                                                <div className="flex gap-2 mb-3">
                                                    <button
                                                        onClick={() => handleReview(p.id, 'APPROVED')}
                                                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReview(p.id, 'REJECTED')}
                                                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}

                                            <div className="border-t border-white/10 pt-3">
                                                {p.supervisor_feedback ? (
                                                    <div className="mb-3">
                                                        <p className="text-xs text-slate-300 uppercase font-semibold mb-2">Your Feedback</p>
                                                        <div className="bg-blue-500/10 border border-blue-400/30 rounded p-3">
                                                            <p className="text-xs text-white whitespace-pre-wrap">{p.supervisor_feedback}</p>
                                                            <p className="text-xs text-slate-500 mt-2">
                                                                Posted: {new Date(p.feedback_updated_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {feedbackProposalId === p.id ? (
                                                    <div>
                                                        <p className="text-xs text-slate-300 uppercase font-semibold mb-2">Add/Update Feedback</p>
                                                        <textarea
                                                            value={feedbackText}
                                                            onChange={(e) => setFeedbackText(e.target.value)}
                                                            placeholder="What improvements or fixes does this proposal need?"
                                                            className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white placeholder:text-slate-500 text-sm mb-2"
                                                            rows="3"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleAddFeedback(p.id)}
                                                                disabled={addingFeedback}
                                                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
                                                            >
                                                                {addingFeedback ? 'Saving...' : 'Save Feedback'}
                                                            </button>
                                                            <button
                                                                onClick={() => { setFeedbackProposalId(null); setFeedbackText(''); }}
                                                                className="text-xs border border-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setFeedbackProposalId(p.id); setFeedbackText(p.supervisor_feedback || ''); }}
                                                        className="text-xs border border-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded"
                                                    >
                                                        {p.supervisor_feedback ? 'Edit Feedback' : 'Add Feedback'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                    <div className="space-y-6">
                        {/* Supervised Students */}
                        <section id="supervised-students" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">Supervised Students</h2>
                            {projects.length === 0 ? (
                                <p className="text-sm text-white/80">No students allocated to you yet.</p>
                            ) : (
                                <ul className="divide-y divide-white/10">
                                    {projects.map((p) => {
                                        const matchedProposal = proposals.find(
                                            (prop) => prop.student_details?.username === p.student_details?.username
                                        );
                                        return (
                                            <li
                                                key={p.id}
                                                onClick={() => setSelectedStudentInfo({ project: p, proposal: matchedProposal })}
                                                className="py-3 flex justify-between items-center cursor-pointer hover:bg-white/5 rounded px-2 -mx-2 transition-colors"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-slate-100">{p.title}</p>
                                                    <p className="text-xs text-slate-200">{p.student_details?.username}</p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>

                        {/* Student Submissions */}
                        <section id="student-submissions" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">Student Submissions</h2>
                            {submissions.length === 0 ? (
                                <p className="text-sm text-white/80">No submissions yet.</p>
                            ) : (
                                Object.entries(groupSubmissionsByStudent()).map(([username, subs]) => {
                                    const chapterSubs = subs.filter((s) => s.milestone_details?.has_chapters);
                                    const otherSubs = subs.filter((s) => !s.milestone_details?.has_chapters);

                                    const subButton = (sub, label, key) =>
                                        sub ? (
                                            <button
                                                key={key}
                                                onClick={() => setViewingSubmission(sub)}
                                                className="text-xs border border-white/10 text-slate-200 hover:text-white hover:border-white/30 px-3 py-1.5 rounded transition-colors"
                                            >
                                                {label}
                                                {sub.status === 'PENDING' && <span className="ml-1.5 text-amber-300">•</span>}
                                                {sub.status === 'REVISIONS' && <span className="ml-1.5 text-orange-300">↻</span>}
                                                {sub.status === 'APPROVED' && <span className="ml-1.5 text-emerald-300">✓</span>}
                                            </button>
                                        ) : (
                                            <button key={key} disabled className="text-xs border border-white/5 text-slate-600 px-3 py-1.5 rounded cursor-not-allowed">
                                                {label}
                                            </button>
                                        );

                                    return (
                                        <div key={username} className="border border-white/15 bg-slate-900/20 rounded-lg p-4 mb-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-medium text-white">{username}</p>
                                                    <p className="text-xs text-slate-400">{subs.length} submission{subs.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2 items-center">
                                                <span className="text-[11px] text-slate-400 uppercase mr-1">Thesis</span>
                                                {CHAPTERS.map((ch) => subButton(chapterSubs.find((s) => s.chapter === ch), `Ch ${ch}`, `ch-${ch}`))}
                                                {otherSubs.map((s) => subButton(s, s.milestone_details?.title, `s-${s.id}`))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </section>

                        {/* Your Meeting Slots */}
                        <section id="meeting-slots" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">Your Meeting Slots</h2>
                            {slots.length === 0 ? (
                                <p className="text-sm text-white/80">No slots created yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {slots.map((s) => {
                                        const slotEnd = new Date(s.end_time);
                                        const isPast = typeof s.is_past === 'boolean' ? s.is_past : slotEnd < new Date();
                                        return (
                                            <div key={s.id} className="border border-white/15 bg-slate-900/20 rounded-lg p-4 hover:bg-slate-900/40 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-white">{formatDateTime(s.start_time)}</p>
                                                        <p className="text-xs text-slate-300 mt-0.5">End: {formatDateTime(s.end_time)}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteSlot(s.id)}
                                                        className="ml-2 text-xs text-red-300 hover:text-red-100 underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>

                                                <div className="flex items-center mt-3">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-xs text-slate-300">
                                                                Student Bookings: <span className="text-white font-medium">{s.booked_count ?? 0}</span> / {s.capacity}
                                                            </p>

                                                            {s.status === 'COMPLETED' ? (
                                                                <p className="text-xs font-medium text-slate-400">✓ Completed</p>
                                                            ) : s.status === 'CANCELLED' ? (
                                                                <p className="text-xs font-medium text-red-400">❌ Cancelled</p>
                                                            ) : s.status === 'OPEN' ? (
                                                                <div className="flex gap-2">
                                                                    {isPast && (
                                                                        <button onClick={() => handleCompleteSlot(s.id)} className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-2 py-1 rounded">
                                                                            Mark Complete
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => { setRescheduleSlotId(s.id); setRescheduleStart(''); setRescheduleEnd(''); setRescheduleReason(''); }}
                                                                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded"
                                                                    >
                                                                        Reschedule
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setCancelSlotId(s.id); setCancelSlotReason(''); }}
                                                                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs font-medium text-blue-400">{s.status === 'FULL' && '🔒 Slot Full'}</p>
                                                            )}
                                                        </div>

                                                        {rescheduleSlotId === s.id && (
                                                            <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                                                                <input
                                                                    type="datetime-local"
                                                                    value={rescheduleStart}
                                                                    onChange={(e) => setRescheduleStart(e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-900/30 border border-white/15 rounded text-white text-sm"
                                                                />
                                                                <input
                                                                    type="datetime-local"
                                                                    value={rescheduleEnd}
                                                                    onChange={(e) => setRescheduleEnd(e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-900/30 border border-white/15 rounded text-white text-sm"
                                                                />
                                                                <textarea
                                                                    value={rescheduleReason}
                                                                    onChange={(e) => setRescheduleReason(e.target.value)}
                                                                    placeholder="Reason for rescheduling (required)"
                                                                    className="w-full px-2 py-1 bg-slate-900/30 border border-white/15 rounded text-white text-sm"
                                                                    rows="2"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={handleSubmitReschedule}
                                                                        disabled={rescheduling}
                                                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
                                                                    >
                                                                        {rescheduling ? 'Saving...' : 'Confirm Reschedule'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setRescheduleSlotId(null)}
                                                                        className="text-xs border border-white/10 text-slate-300 px-3 py-1.5 rounded"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {cancelSlotId === s.id && (
                                                            <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                                                                <textarea
                                                                    value={cancelSlotReason}
                                                                    onChange={(e) => setCancelSlotReason(e.target.value)}
                                                                    placeholder="Reason for cancelling this slot (required)"
                                                                    className="w-full px-2 py-1 bg-slate-900/30 border border-white/15 rounded text-white text-sm"
                                                                    rows="2"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={handleSubmitCancelSlot}
                                                                        disabled={cancellingSlot}
                                                                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
                                                                    >
                                                                        {cancellingSlot ? 'Cancelling...' : 'Confirm Cancel'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setCancelSlotId(null)}
                                                                        className="text-xs border border-white/10 text-slate-300 px-3 py-1.5 rounded"
                                                                    >
                                                                        Back
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="h-2 bg-slate-600 rounded-full overflow-hidden mt-2">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-400 to-blue-500"
                                                        style={{ width: `${s.capacity ? (s.booked_count / s.capacity) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Slot Bookings */}
                        <section id="slot-bookings" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">Slot Bookings</h2>
                            {bookings.length === 0 ? (
                                <p className="text-sm text-white/80">No students have booked your slots yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {bookings.map((b) => (
                                        <div key={b.id} className="border border-white/15 bg-slate-900/20 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-medium text-white">{b.student_details?.username}</p>
                                                    <p className="text-xs text-slate-300">
                                                        Reg No: {b.student_details?.registration_number || 'N/A'} • Phone: {b.student_details?.phone_number || 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {new Date(b.slot_details.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </p>
                                                </div>
                                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                    b.status === 'BOOKED' ? 'bg-green-500/20 text-green-300'
                                                    : b.status === 'CANCELLED' ? 'bg-red-500/20 text-red-300'
                                                    : b.status === 'ATTENDED' ? 'bg-blue-500/20 text-blue-300'
                                                    : 'bg-slate-500/20 text-slate-300'
                                                }`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Booked: {new Date(b.booked_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Manage Timelines */}
                        <section id="manage-timelines" className="border-t border-white/10 pt-8 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">Manage Timelines</h2>

                            <div className="mb-6">
                                <label htmlFor="proposal-deadline" className="block text-sm font-medium text-slate-100 mb-1">
                                    Proposal Submission Deadline
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        id="proposal-deadline"
                                        name="proposal_deadline"
                                        type="datetime-local"
                                        value={toDatetimeLocal(proposalDeadline)}
                                        onChange={(e) => setProposalDeadline(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white"
                                    />
                                    <button
                                        onClick={handleSaveDeadline}
                                        disabled={savingTimeline}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                                    >
                                        {savingTimeline ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-slate-100 mb-2">Milestone Deadlines</p>
                                <div className="space-y-3">
                                    {milestones.map((m) => (
                                        <div key={m.id} className="flex items-center justify-between gap-3">
                                            <span className="text-sm text-slate-200">{m.title} ({m.weight}%)</span>
                                            <input
                                                type="datetime-local"
                                                defaultValue={toDatetimeLocal(m.due_date)}
                                                onBlur={(e) => handleUpdateMilestoneDate(m.id, e.target.value)}
                                                className="px-2 py-1 border border-white/15 bg-slate-900/30 rounded text-white text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Open a New Slot */}
                        <section className="border-t border-white/10 pt-8">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">Open a New Slot</h2>
                            <form onSubmit={handleCreateSlot} className="space-y-4 max-w-xl">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="start-time" className="block text-sm font-medium text-slate-100 mb-1">Start</label>
                                        <input
                                            id="start-time"
                                            name="start_time"
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="end-time" className="block text-sm font-medium text-slate-100 mb-1">End</label>
                                        <input
                                            id="end-time"
                                            name="end_time"
                                            type="datetime-local"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Slot'}
                                </button>
                            </form>
                        </section>
                    </div>
                </main>

                {/* Recent Activity */}
                <aside className="bg-gradient-to-br from-blue-400/15 to-emerald-600/15 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col">
                    <div className="lg:sticky lg:top-6 flex flex-col h-full">
                        <h2 className="font-semibold text-white text-sm mb-5">Recent Activity</h2>
                        <div className="space-y-4">
                            {(() => {
                                const upcoming = slots
                                    .filter((s) => ['OPEN', 'FULL'].includes(s.status) && new Date(s.start_time) > new Date())
                                    .slice(0, 3);
                                return upcoming.length > 0 && (
                                    <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3.5">
                                        <p className="text-xs font-semibold text-blue-200 mb-2">Upcoming meetings</p>
                                        {upcoming.map((s) => (
                                            <p key={s.id} className="text-xs text-blue-100 leading-relaxed">
                                                {formatDateTime(s.start_time)} — {s.booked_count ?? 0}/{s.capacity} booked
                                            </p>
                                        ))}
                                    </div>
                                );
                            })()}

                            {notifications.length === 0 ? (
                                <p className="text-xs text-slate-400">No recent activity yet.</p>
                            ) : (
                                notifications.slice(0, 10).map((n) => <NotificationItem key={n.id} n={n} />)
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Modal: student info */}
            {selectedStudentInfo && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStudentInfo(null)}>
                    <div className="bg-slate-900 border border-white/15 rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">{selectedStudentInfo.project.title}</h3>
                        <p className="text-xs text-slate-400 mb-4">{selectedStudentInfo.project.student_details?.username}</p>

                        {selectedStudentInfo.proposal ? (
                            <div className="space-y-3 mb-4">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Project Description</p>
                                    <p className="text-sm text-slate-100">{selectedStudentInfo.proposal.description}</p>
                                </div>
                                <p className="text-xs text-slate-400">Research Area: {selectedStudentInfo.proposal.research_area}</p>
                                <p className="text-xs text-slate-500">
                                    Proposal submitted: {new Date(selectedStudentInfo.proposal.created_at).toLocaleString()}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 mb-4">No proposal details found.</p>
                        )}

                        {(() => {
                            const username = selectedStudentInfo.project.student_details?.username;
                            const studentSubs = submissions.filter((s) => s.project_details?.student_details?.username === username);
                            const chapterSubs = studentSubs.filter((s) => s.milestone_details?.has_chapters);
                            const otherSubs = studentSubs.filter((s) => !s.milestone_details?.has_chapters);

                            const renderSub = (label, sub, key) => (
                                <div key={key} className="border border-white/15 bg-slate-900/30 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm font-medium text-white">{label}</p>
                                        {sub && (
                                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                sub.status === 'APPROVED' ? 'bg-green-500/20 text-green-300'
                                                : sub.status === 'REVISIONS' ? 'bg-amber-500/20 text-amber-300'
                                                : 'bg-slate-500/20 text-slate-300'
                                            }`}>{sub.status}</span>
                                        )}
                                    </div>
                                    {sub ? (
                                        <>
                                            <button
                                                onClick={() => setViewerFile({ url: toAbsoluteUrl(sub.file_upload), title: `${username} — ${label}` })}
                                                className="text-xs text-blue-300 hover:text-blue-200 underline"
                                            >
                                                Open submitted file ↗
                                            </button>
                                            <p className="text-xs text-slate-500 mt-1">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-slate-500">Not submitted yet.</p>
                                    )}
                                </div>
                            );

                            return (
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Milestone Submissions</p>
                                    {CHAPTERS.map((ch) => renderSub(`Thesis — Chapter ${ch}`, chapterSubs.find((s) => s.chapter === ch) || null, `ch-${ch}`))}
                                    {otherSubs.map((s) => renderSub(s.milestone_details?.title, s, `s-${s.id}`))}
                                </div>
                            );
                        })()}

                        <button onClick={() => setSelectedStudentInfo(null)} className="mt-4 text-xs border border-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded">
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Modal: single submission review */}
            {viewingSubmission && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setViewingSubmission(null)}>
                    <div className="bg-slate-900 border border-white/15 rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    {viewingSubmission.milestone_details?.title}
                                    {viewingSubmission.chapter ? ` — Chapter ${viewingSubmission.chapter}` : ''}
                                </h3>
                                <p className="text-xs text-slate-400">{viewingSubmission.project_details?.student_details?.username}</p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                                viewingSubmission.status === 'APPROVED' ? 'bg-green-500/20 text-green-300'
                                : viewingSubmission.status === 'REVISIONS' ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-500/20 text-slate-300'
                            }`}>
                                {viewingSubmission.status}
                            </span>
                        </div>

                        <p className="text-xs text-slate-500 mb-3">
                            Submitted: {new Date(viewingSubmission.submitted_at).toLocaleString()}
                        </p>

                        <button
                            onClick={() => setViewerFile({
                                url: toAbsoluteUrl(viewingSubmission.file_upload),
                                title: `${viewingSubmission.project_details?.student_details?.username} — ${viewingSubmission.milestone_details?.title}${viewingSubmission.chapter ? ` Ch ${viewingSubmission.chapter}` : ''}`,
                            })}
                            className="text-xs text-blue-300 hover:text-blue-200 underline"
                        >
                            Open submitted file ↗
                        </button>

                        {viewingSubmission.status === 'PENDING' && (
                            <div className="mt-4 space-y-2">
                                <textarea
                                    value={reviewComments[viewingSubmission.id] || ''}
                                    onChange={(e) => setReviewComments({ ...reviewComments, [viewingSubmission.id]: e.target.value })}
                                    placeholder="Comments (optional)"
                                    className="w-full px-2 py-1 bg-slate-900/30 border border-white/15 rounded text-white text-sm"
                                    rows="3"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => { await handleReviewSubmission(viewingSubmission.id, 'APPROVED'); setViewingSubmission(null); }}
                                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={async () => { await handleReviewSubmission(viewingSubmission.id, 'REVISIONS'); setViewingSubmission(null); }}
                                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded"
                                    >
                                        Request Revisions
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewingSubmission.supervisor_comments && (
                            <p className="text-xs text-slate-400 mt-3">Previous comment: {viewingSubmission.supervisor_comments}</p>
                        )}

                        <button onClick={() => setViewingSubmission(null)} className="mt-4 text-xs border border-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded">
                            Close
                        </button>
                    </div>
                </div>
            )}

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
                                <p className="text-slate-400 text-xs">Lecturer / Supervisor</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-slate-400">Supervised Students</span>
                                <span className="text-white">{projects.length}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-slate-400">Pending Proposals</span>
                                <span className="text-white">{pendingProposalCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Open Meeting Slots</span>
                                <span className="text-white">{openSlotCount}</span>
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
            {viewerFile && <FileViewer url={viewerFile.url} title={viewerFile.title} onClose={() => setViewerFile(null)} />}
        </div>
    );
};

export default LecturerDashboard;




















