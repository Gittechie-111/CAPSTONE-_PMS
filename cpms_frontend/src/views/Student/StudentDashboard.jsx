import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    milestoneService, submissionService, proposalService,
    meetingSlotService, meetingBookingService, settingsService, notificationService
} from '../../services/api';
import FileViewer from '../../components/FileViewer';
import NotificationItem from '../../components/NotificationItem';

const CHAPTERS = [1, 2, 3, 4, 5];
const STATUS_LABEL = { APPROVED: 'Approved', REVISIONS: 'Revisions requested', PENDING: 'Awaiting review' };
const STATUS_STYLE = {
    APPROVED: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
    REVISIONS: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
    PENDING: 'border-white/15 bg-slate-900/20 text-slate-200',
};

const MILESTONE_ICONS = {
    APPROVED: '✅',
    REVISIONS: '📝',
    PENDING: '⏳',
};

const RESEARCH_AREAS = [
    { value: 'AI_ML', label: 'AI & Machine Learning' },
    { value: 'CYBER', label: 'Cybersecurity & Blockchain' },
    { value: 'IOT', label: 'IoT & Embedded Systems' },
    { value: 'WEB', label: 'Web & Mobile Development' },
    { value: 'DATA', label: 'Data Science & Analytics' },
    { value: 'OTHER', label: 'Other' }
];

const NAV_ITEMS = [
    { id: 'milestone-progress', label: 'Dashboard', icon: '🏠' },
    { id: 'proposal-report', label: 'Proposal Topic', icon: '📄' },
    { id: 'submit-work', label: 'Submit Work', icon: '📤' },
    { id: 'my-bookings', label: 'Upcoming Meetings', icon: '📅' },
    { id: 'consultation-slots', label: 'Consultation Slots', icon: '🗓️' },
];

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [milestones, setMilestones] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [slots, setSlots] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [proposal, setProposal] = useState(null);
    const [selectedMilestone, setSelectedMilestone] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [proposalTitle, setProposalTitle] = useState('');
    const [proposalDescription, setProposalDescription] = useState('');
    const [researchArea, setResearchArea] = useState('');
    const [submittingProposal, setSubmittingProposal] = useState(false);
    const [proposalSubmitted, setProposalSubmitted] = useState(false);
    const [proposalDeadline, setProposalDeadline] = useState(null);
    const [loadingSlot, setLoadingSlot] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelModalBookingId, setCancelModalBookingId] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showProfile, setShowProfile] = useState(false);
    const [viewerFile, setViewerFile] = useState(null);

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const fetchDashboardData = async () => {
        const [milestoneData, submissionData, slotData, bookingData, settingsData, notifData] = await Promise.all([
            milestoneService.getMilestones(),
            submissionService.getSubmissions(),
            meetingSlotService.getSlots(),
            meetingBookingService.getBookings(),
            settingsService.getSettings(),
            notificationService.getNotifications(),
        ]);
        setMilestones(milestoneData);
        setSubmissions(submissionData);
        setSlots(slotData);
        setBookings(bookingData);
        setProposalDeadline(settingsData.proposal_deadline);
        setNotifications(notifData);

        try {
            const proposalData = await proposalService.getMyProposal();
            setProposal(proposalData);
        } catch (err) {
            setProposal(null);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            await fetchDashboardData();
        } catch (err) {
            setError('Could not load your dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    const refreshDataSilently = async () => {
        try {
            await fetchDashboardData();
        } catch (err) {
            // Silent — a background refresh failure shouldn't interrupt the user
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const onFocus = () => refreshDataSilently();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    useEffect(() => {
        const FIVE_MINUTES = 5 * 60 * 1000;
        const id = setInterval(() => {
            if (document.visibilityState === 'visible') refreshDataSilently();
        }, FIVE_MINUTES);
        return () => clearInterval(id);
    }, []);

    const handleProposalSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!proposalTitle || !proposalDescription || !researchArea) {
            setError('Fill in a title, description, and choose a research area.');
            return;
        }
        setSubmittingProposal(true);
        try {
            await proposalService.submitProposal(proposalTitle, proposalDescription, researchArea);
            setProposalTitle('');
            setProposalDescription('');
            setResearchArea('');
            setProposalSubmitted(true);
            await loadData();
        } catch (err) {
            const data = err.response?.data;
            if (Array.isArray(data)) {
                setError(data[0]);
            } else if (typeof data === 'string') {
                setError(data);
            } else if (data && typeof data === 'object') {
                const firstKey = Object.keys(data)[0];
                const firstMessage = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                setError(firstMessage);
            } else {
                setError('Could not submit proposal. Please try again.');
            }
        } finally {
            setSubmittingProposal(false);
        }
    };

    const subsByMilestone = submissions.reduce((acc, s) => {
        const mId = typeof s.milestone === 'object' ? s.milestone?.id : s.milestone;
        if (mId) (acc[mId] = acc[mId] || []).push(s);
        return acc;
    }, {});
    const chapterSub = (mId, ch) => (subsByMilestone[mId] || []).find((s) => s.chapter === ch);
    const singleSub = (mId) => (subsByMilestone[mId] || [])[0];

    const milestoneFraction = (m) =>
        m.has_chapters
            ? CHAPTERS.filter((ch) => chapterSub(m.id, ch)).length / CHAPTERS.length
            : singleSub(m.id) ? 1 : 0;

    const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0);
    const completedWeight = milestones.reduce((sum, m) => sum + m.weight * milestoneFraction(m), 0);
    const progressPercent = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    const deadlinePassed = proposalDeadline && new Date() > new Date(proposalDeadline);

    // Everything the student can still upload (not yet submitted, or sent back for revisions)
    const uploadTargets = milestones.flatMap((m) => {
        if (m.has_chapters) {
            return CHAPTERS
                .filter((ch) => { const s = chapterSub(m.id, ch); return !s || s.status === 'REVISIONS'; })
                .map((ch) => ({ key: `${m.id}:${ch}`, milestoneId: m.id, chapter: ch, sub: chapterSub(m.id, ch), label: `${m.title} — Chapter ${ch}` }));
        }
        const s = singleSub(m.id);
        return !s || s.status === 'REVISIONS'
            ? [{ key: `${m.id}`, milestoneId: m.id, chapter: null, sub: s, label: m.title }]
            : [];
    });
    const selectedTarget = uploadTargets.find((t) => t.key === selectedMilestone);

    const handleUpload = async (e) => {
        e.preventDefault();
        setError('');
        if (!selectedTarget || !file) {
            setError('Choose what you are submitting and attach a file.');
            return;
        }
        setUploading(true);
        try {
            await submissionService.uploadSubmission(selectedTarget.milestoneId, file, selectedTarget.chapter);
            setSelectedMilestone('');
            setFile(null);
            await loadData();
        } catch (err) {
            const d = err.response?.data;
            setError(d?.error || d?.detail || (typeof d === 'string' ? d : 'Upload failed. Please try again.'));
        } finally {
            setUploading(false);
        }
    };

    const handleBookSlot = async (slotId) => {
        setError('');
        setLoadingSlot(slotId);
        try {
            await meetingBookingService.bookSlot(slotId);
            await loadData();
        } catch (err) {
            const errData = err.response?.data;
            if (typeof errData === 'string') {
                setError(errData);
            } else if (errData?.detail) {
                setError(errData.detail);
            } else {
                setError('Booking failed. Please try again.');
            }
        } finally {
            setLoadingSlot(null);
        }
    };

    const handleCancelBooking = async () => {
        if (!cancelReason.trim()) {
            setError('A reason is required to cancel.');
            return;
        }
        setCancelling(true);
        try {
            await meetingBookingService.cancelBooking(cancelModalBookingId, cancelReason);
            setCancelModalBookingId(null);
            setCancelReason('');
            await loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Could not cancel booking.');
        } finally {
            setCancelling(false);
        }
    };

    // const pendingMilestones = milestones.filter((m) => {
    //     const submission = submissionByMilestone[m.id];
    //     if (!submission) return true;
    //     if (submission.status === 'REVISIONS') return true;
    //     return false;
    // });

    const upcomingBooking = bookings.find((b) => b.status === 'BOOKED');
    // appointed_supervisor_details is only sent once the coordinator has allocated this student
    const allocated = !!proposal?.appointed_supervisor_details;

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
                                <p className="text-slate-400 text-xs truncate">Student</p>
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
                            {proposal ? (
                                <>
                                    {proposal.title} —{' '}
                                    <span className={
                                        proposal.status === 'APPROVED' ? 'text-emerald-300'
                                        : proposal.status === 'PENDING' ? 'text-amber-300'
                                        : 'text-red-300'
                                    }>
                                        {proposal.status}
                                    </span>
                                </>
                            ) : (
                                'No active proposal yet'
                            )}
                        </p>
                    </header>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-6 border border-red-200">
                            {error}
                        </div>
                    )}

                    {/* Milestone Progress */}
                    <section id="milestone-progress" className="mb-12 scroll-mt-6">
                        <div className="flex justify-between items-baseline mb-3">
                            <h2 className="text-sm font-semibold text-white tracking-wide">
                                Project Milestone Progress
                            </h2>
                            <span className="text-sm text-white/80">{progressPercent}%</span>
                        </div>

                        <div className="w-full bg-slate-200/20 rounded-full h-2.5 mb-8 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-emerald-400 to-blue-500 h-full rounded-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        <div className="space-y-4">
                                {proposal && (
                                   <div className={`flex items-center gap-3 border rounded-lg px-5 py-4 ${
                                       proposal.status === 'APPROVED'
                                           ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                                           : 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                                   }`}>
                                       <span>{proposal.status === 'APPROVED' ? '✅' : '⏳'}</span>
                                       <span className="text-sm">
                                           Proposal Topic & Description — {proposal.status === 'APPROVED' ? 'Approved' : 'Awaiting supervisor review'}
                                       </span>
                                   </div>
                               )}

                            {milestones.map((m) => {
                                const due = new Date(m.due_date);
                                const overdue = due < new Date();

                                if (m.has_chapters) {
                                    const done = CHAPTERS.filter((ch) => chapterSub(m.id, ch)).length;
                                    return (
                                        <div key={m.id} className="border border-white/15 bg-slate-900/20 rounded-lg px-5 py-4">
                                            <div className="flex justify-between items-start mb-3 gap-3">
                                                <div>
                                                    <p className="text-sm text-slate-100">{m.title} ({m.weight}%)</p>
                                                    <p className={`text-xs mt-0.5 ${overdue && done < CHAPTERS.length ? 'text-red-300' : 'text-slate-400'}`}>
                                                        Due {due.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-slate-300 shrink-0">{done}/{CHAPTERS.length} chapters submitted</span>
                                            </div>
                                            <div className="space-y-2">
                                                {CHAPTERS.map((ch) => {
                                                    const s = chapterSub(m.id, ch);
                                                    const status = s ? s.status : 'PENDING';
                                                    return (
                                                        <div key={ch}>
                                                            <div className={`flex items-center justify-between gap-3 border rounded-md px-3 py-2 text-xs ${STATUS_STYLE[status]}`}>
                                                                <span>
                                                                    {MILESTONE_ICONS[status]} Chapter {ch} — {s ? STATUS_LABEL[status] : 'Not submitted'}
                                                                </span>
                                                                {s && (
                                                                    <button
                                                                        onClick={() => setViewerFile({ url: s.file_upload, title: `${m.title} — Chapter ${ch}` })}
                                                                        className="underline shrink-0"
                                                                    >
                                                                        View file
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {s?.status === 'REVISIONS' && s.supervisor_comments && (
                                                                <p className="text-[11px] text-amber-200 mt-1 ml-1">Supervisor: {s.supervisor_comments}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }

                                const submitted = singleSub(m.id);
                                const status = submitted ? submitted.status : 'PENDING';
                                const isOverdue = !submitted && overdue;
                                const styles = {
                                    ...STATUS_STYLE,
                                    PENDING: isOverdue ? 'border-red-400/40 bg-red-500/10 text-red-200' : STATUS_STYLE.PENDING,
                                };
                                return (
                                    <div key={m.id}>
                                        <div className={`flex items-center justify-between gap-3 border rounded-lg px-5 py-4 ${styles[status]}`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span>{MILESTONE_ICONS[status]}</span>
                                                <span className="text-sm break-words">
                                                    {m.title} ({m.weight}%) —{' '}
                                                    {submitted ? STATUS_LABEL[status] : isOverdue ? 'Overdue' : 'Pending'}
                                                </span>
                                            </div>
                                            {submitted && (
                                                <button
                                                    onClick={() => setViewerFile({ url: submitted.file_upload, title: m.title })}
                                                    className="text-xs underline shrink-0"
                                                >
                                                    View file
                                                </button>
                                            )}
                                        </div>
                                        {submitted?.status === 'REVISIONS' && submitted.supervisor_comments && (
                                            <p className="text-[11px] text-amber-200 mt-1 ml-1">Supervisor: {submitted.supervisor_comments}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Proposal Report */}
                    {proposal && (
                        <section id="proposal-report" className="border-t border-white/10 pt-8 mb-12 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">
                                Proposal Topic & Description
                            </h2>
                            <div className="space-y-5">
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Title</p>
                                    <p className="text-sm text-white">{proposal.title}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Description</p>
                                    <p className="text-sm text-slate-100">{proposal.description}</p>
                                </div>
                                {proposal.appointed_supervisor_details && (
                                    <div>
                                       <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Appointed Supervisor</p>
                                       {proposal.appointed_supervisor_details ? (
                                           <>
                                               <p className="text-sm text-slate-100">{proposal.appointed_supervisor_details.user_details?.username}</p>
                                               <p className="text-xs text-slate-400">{proposal.appointed_supervisor_details.user_details?.email || 'No email on file'}</p>
                                           </>
                                       ) : (
                                           <p className="text-sm text-slate-300">
                                               {proposal.status === 'APPROVED'
                                                   ? 'Your topic is approved. Your supervisor will appear here once the coordinator runs allocation.'
                                                   : 'Your topic is with the lecturer reviewing your research area. Once it is approved and the coordinator runs allocation, your appointed supervisor will appear here.'}
                                           </p>
                                       )}
                                   </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <div>
                                        <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Status</p>
                                        <p className={`text-sm font-medium ${
                                            proposal.status === 'APPROVED' ? 'text-emerald-400'
                                            : proposal.status === 'PENDING' ? 'text-amber-400'
                                            : 'text-red-400'
                                        }`}>
                                            {proposal.status}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Submitted</p>
                                        <p className="text-sm text-slate-200">
                                            {new Date(proposal.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Submit Proposal */}
                    {!proposal && (
                        <section id="proposal-report" className="border-t border-white/10 pt-8 mb-12 scroll-mt-6">
                            <h2 className="text-sm font-semibold text-white tracking-wide mb-4">
                                Submit Project Proposal Description
                            </h2>
                            {proposalSubmitted ? (
                                <p className="text-sm text-white/80">
                                    Your proposal was submitted and is awaiting review.
                                </p>
                            ) : deadlinePassed ? (
                                <p className="text-sm text-red-300">
                                    Proposal submissions are closed. The deadline was{' '}
                                    {new Date(proposalDeadline).toLocaleString(undefined, {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    })}.
                                </p>
                            ) : (
                                <form onSubmit={handleProposalSubmit} className="space-y-5 max-w-xl">
                                    {proposalDeadline && (
                                        <p className="text-xs text-slate-400">
                                            Submit by{' '}
                                            {new Date(proposalDeadline).toLocaleString(undefined, {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </p>
                                    )}
                                    <div>
                                        <label htmlFor="proposal-title" className="block text-sm font-medium text-slate-200 mb-1.5">
                                            Title
                                        </label>
                                        <input
                                            id="proposal-title"
                                            name="title"
                                            type="text"
                                            value={proposalTitle}
                                            onChange={(e) => setProposalTitle(e.target.value)}
                                            className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-400/50"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="proposal-description" className="block text-sm font-medium text-slate-200 mb-1.5">
                                            Description
                                        </label>
                                        <textarea
                                            id="proposal-description"
                                            name="description"
                                            rows="4"
                                            value={proposalDescription}
                                            onChange={(e) => setProposalDescription(e.target.value)}
                                            className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-400/50"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="proposal-area" className="block text-sm font-medium text-slate-200 mb-1.5">
                                            Research Area
                                        </label>
                                        <select
                                            id="proposal-area"
                                            name="research_area"
                                            value={researchArea}
                                            onChange={(e) => setResearchArea(e.target.value)}
                                            className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white focus:outline-none focus:border-blue-400/50"
                                        >
                                            <option value="">Select a research area...</option>
                                            {RESEARCH_AREAS.map((r) => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingProposal}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded text-sm font-medium disabled:opacity-50"
                                    >
                                        {submittingProposal ? 'Submitting...' : 'Submit Proposal'}
                                    </button>
                                </form>
                            )}
                        </section>
                    )}

                    {/* Submit Work */}
                    <section id="submit-work" className="border-t border-white/10 pt-8 mb-12 scroll-mt-6">
                        <h2 className="text-sm font-semibold text-white tracking-wide mb-4">
                            Submit Work
                        </h2>
                            {!allocated ? (
                               <p className="text-sm text-slate-300">
                                   Thesis chapter and prototype uploads open once your topic is approved and the coordinator has allocated your supervisor.
                               </p>
                           ) : uploadTargets.length === 0 ? (
                            <p className="text-sm text-white/70">Everything is submitted. Nothing more to upload right now.</p>
                        ) : (
                            <form onSubmit={handleUpload} className="space-y-5 max-w-xl">
                                <div>
                                    <label htmlFor="milestone-select" className="block text-sm font-medium text-slate-200 mb-1.5">
                                        What are you submitting?
                                    </label>
                                    <select
                                        id="milestone-select"
                                        name="milestone"
                                        value={selectedMilestone}
                                        onChange={(e) => setSelectedMilestone(e.target.value)}
                                        className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white focus:outline-none focus:border-blue-400/50"
                                    >
                                        <option value="">Select a milestone or chapter...</option>
                                        {uploadTargets.map((t) => (
                                            <option key={t.key} value={t.key}>
                                                {t.label}{t.sub?.status === 'REVISIONS' ? ' (Revise & Resubmit)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedTarget?.sub?.status === 'REVISIONS' && (
                                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4 text-xs text-amber-200">
                                        <p className="font-semibold mb-1">Revisions requested by your supervisor:</p>
                                        <p className="whitespace-pre-wrap">{selectedTarget.sub.supervisor_comments || 'No comment provided.'}</p>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="file-upload" className="block text-sm font-medium text-slate-200 mb-1.5">File</label>
                                    <input
                                        id="file-upload"
                                        name="file_upload"
                                        type="file"
                                        accept=".pdf,.docx"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="w-full text-sm text-white file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded text-sm font-medium disabled:opacity-50"
                                >
                                    {uploading ? 'Uploading...' : 'Upload Submission'}
                                </button>
                            </form>
                        )}
                    </section>

                    {/* My Bookings */}
                    <section id="my-bookings" className="border-t border-white/10 pt-8 mb-12 scroll-mt-6">
                        <h2 className="text-sm font-semibold text-white tracking-wide mb-4">
                            My Bookings
                        </h2>
                        {bookings.length === 0 ? (
                            <p className="text-sm text-white/70">You haven't booked any slots yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {bookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="border border-white/15 bg-slate-900/20 rounded-lg px-5 py-4 flex justify-between items-center gap-4"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {new Date(booking.slot_details.start_time).toLocaleString(undefined, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                            </p>
                                            <p className="text-xs text-slate-300 mt-0.5 truncate">
                                                {booking.slot_details.supervisor_name}
                                            </p>
                                            <p className={`text-xs mt-1 ${
                                                booking.status === 'BOOKED' ? 'text-emerald-400'
                                                : booking.status === 'CANCELLED' ? 'text-red-400'
                                                : 'text-slate-400'
                                            }`}>
                                                {booking.status === 'BOOKED' ? '✓ Confirmed' : booking.status}
                                            </p>
                                        </div>
                                        {booking.status === 'BOOKED' && (
                                            <button
                                                onClick={() => {
                                                    setCancelModalBookingId(booking.id);
                                                    setCancelReason('');
                                                }}
                                                className="shrink-0 px-4 py-2 rounded text-xs font-medium bg-red-600/90 hover:bg-red-700 text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Consultation Slots */}
                    <section id="consultation-slots" className="border-t border-white/10 pt-8 scroll-mt-6">
                        <h2 className="text-sm font-semibold text-white tracking-wide mb-4">
                            Available Consultation Slots
                        </h2>
                        {slots.length === 0 ? (
                            <p className="text-sm text-white/70">No supervisor slots available yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {slots.map((slot) => (
                                    <div
                                        key={slot.id}
                                        className="border border-white/15 bg-slate-900/20 rounded-lg px-5 py-4 flex justify-between items-center gap-4"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {new Date(slot.start_time).toLocaleString(undefined, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                            </p>
                                            <p className="text-xs text-slate-300 mt-0.5 truncate">
                                                {slot.supervisor_name} • {slot.available_seats}/{slot.capacity} seats
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleBookSlot(slot.id)}
                                            disabled={slot.available_seats === 0 || loadingSlot === slot.id}
                                            className={`shrink-0 px-4 py-2 rounded text-xs font-medium transition-colors ${
                                                slot.available_seats === 0
                                                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                        >
                                            {loadingSlot === slot.id ? 'Booking...' : slot.available_seats === 0 ? 'Full' : 'Book'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </main>

                {/* Recent Activity */}
                <aside className="bg-gradient-to-br from-blue-400/15 to-emerald-600/15 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col">
                    <div className="lg:sticky lg:top-6 flex flex-col h-full">
                        <h2 className="font-semibold text-white text-sm mb-5">Recent Activity</h2>
                        <div className="space-y-4">
                            {proposal?.supervisor_feedback && (
                                <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3.5">
                                    <p className="text-xs text-amber-200 leading-relaxed">
                                        Supervisor comment: "{proposal.supervisor_feedback}"
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        {new Date(proposal.feedback_updated_at).toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {upcomingBooking && (
                                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3.5">
                                    <p className="text-xs text-blue-200 leading-relaxed">
                                        Upcoming meeting:{' '}
                                        {new Date(upcomingBooking.slot_details.start_time).toLocaleString(undefined, {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        })}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        with {upcomingBooking.slot_details.supervisor_name}
                                    </p>
                                </div>
                            )}

                            {!upcomingBooking && slots.length > 0 && (
                                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3.5">
                                    <p className="text-xs text-blue-200 leading-relaxed">
                                        Next available slot:{' '}
                                        {new Date(slots[0].start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-2">with {slots[0].supervisor_name}</p>
                                </div>
                            )}

                            {notifications.slice(0, 8).map((n) => (
                                <NotificationItem key={n.id} n={n} />
                            ))}

                            {!proposal?.supervisor_feedback && !upcomingBooking && notifications.length === 0 && (
                                <p className="text-xs text-slate-400">No recent activity yet.</p>
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Cancel Booking Modal */}
            {cancelModalBookingId && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                    onClick={() => setCancelModalBookingId(null)}
                >
                    <div
                        className="bg-slate-900 border border-white/15 rounded-xl p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-white mb-3">Cancel this booking?</h3>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Reason for cancelling (required)"
                            rows="3"
                            className="w-full px-3 py-2 bg-slate-900/30 border border-white/15 rounded text-white text-sm mb-3"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancelBooking}
                                disabled={cancelling || !cancelReason.trim()}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
                            >
                                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                            <button
                                onClick={() => setCancelModalBookingId(null)}
                                className="text-xs border border-white/10 text-slate-300 px-3 py-1.5 rounded"
                            >
                                Keep Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {showProfile && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowProfile(false)}
                >
                    <div
                        className="bg-slate-900 border border-white/15 rounded-xl p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                                {user?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <p className="text-white font-semibold">{user?.username}</p>
                                <p className="text-slate-400 text-xs">Student</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-slate-400">Active Proposal</span>
                                <span className="text-white">{proposal ? proposal.title : 'None'}</span>
                            </div>
                            {proposal?.appointed_supervisor_details && (
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span className="text-slate-400">Appointed Supervisor</span>
                                    <span className="text-white">
                                        {proposal.appointed_supervisor_details.user_details?.username}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-slate-400">Milestone Progress</span>
                                <span className="text-white">{progressPercent}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Confirmed Bookings</span>
                                <span className="text-white">{bookings.filter((b) => b.status === 'BOOKED').length}</span>
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

export default StudentDashboard;




























