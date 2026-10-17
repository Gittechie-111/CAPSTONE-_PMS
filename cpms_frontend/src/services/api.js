import axios from 'axios';

const API = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    }
});

API.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

const storeTokens = (data) => {
    sessionStorage.setItem('accessToken', data.access);
    localStorage.setItem('refreshToken', data.refresh);
};

export const authService = {
    login: async (username, password) => {
        const response = await API.post('auth/login/', { username, password });
        if (response.data.access) storeTokens(response.data);
        return response.data;   // either tokens, or { otp_required, challenge_id, phone_hint }
    },
    verifyOtp: async (challengeId, code) => {
        const response = await API.post('auth/verify-otp/', { challenge_id: challengeId, code });
        storeTokens(response.data);
        return response.data;
    },
    register: async (username, email, password, phoneNumber, registrationNumber, securityQuestion, securityAnswer) =>
        (await API.post('register/', {
            username, email, password,
            phone_number: phoneNumber,
            registration_number: registrationNumber,
            security_question: securityQuestion,
            security_answer: securityAnswer,
        })).data,
    activateAccount: async (token, password, securityQuestion, securityAnswer) =>
        (await API.post('auth/activate/', {
            token, password, security_question: securityQuestion, security_answer: securityAnswer,
        })).data,
    getSecurityQuestion: async (username) =>
        (await API.post('auth/forgot/question/', { username })).data,
    resetPassword: async (username, answer, newPassword) =>
        (await API.post('auth/forgot/reset/', { username, answer, new_password: newPassword })).data,
    setSecurityQuestion: async (question, answer, currentPassword) =>
        (await API.post('auth/security-question/', { question, answer, current_password: currentPassword })).data,
    logout: () => {
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },
};

export const proposalService = {
    getProposals: async () => (await API.get('proposals/')).data,
    submitProposal: async (title, description, researchArea) =>
        (await API.post('proposals/', {
            title,
            description,
            research_area: researchArea
        })).data,
    getMyProposal: async () => (await API.get('proposals/my-proposal/')).data,
    addFeedback: async (proposalId, feedback) =>
        (await API.patch(`proposals/${proposalId}/add-feedback/`, { feedback })).data,
    reviewProposal: async (proposalId, status, feedback = '') =>
        (await API.patch(`proposals/${proposalId}/review/`, { status, feedback })).data,
    getUnassigned: async () => (await API.get('proposals/unassigned/')).data,
    appointSupervisor: async (proposalId, supervisorId) =>
        (await API.patch(`proposals/${proposalId}/appoint/`, { supervisor: supervisorId })).data,
};

export const supervisorService = {
    getMe: async () => (await API.get('supervisors/me/')).data,
};

export const projectService = {
    getFinalGrade: async (projectId) =>
        (await API.get(`projects/${projectId}/final_grade/`)).data,
    getProjects: async () => (await API.get('projects/')).data
};

export const meetingSlotService = {
    getSlots: async () => (await API.get('slots/')).data,
    createSlot: async (startTime, endTime) =>
        (await API.post('slots/', { start_time: startTime, end_time: endTime })).data,
    deleteSlot: async (slotId) => {
        await API.delete(`slots/${slotId}/`);
    },
    completeSlot: async (slotId) => (await API.patch(`slots/${slotId}/complete/`)).data,
    rescheduleSlot: async (slotId, startTime, endTime, reason) =>
        (await API.patch(`slots/${slotId}/reschedule/`, { start_time: startTime, end_time: endTime, reason })).data,
    cancelSlot: async (slotId, reason) =>
        (await API.patch(`slots/${slotId}/cancel/`, { reason })).data,
};

export const meetingBookingService = {
    getBookings: async () => (await API.get('bookings/')).data,
    bookSlot: async (slotId) =>
        (await API.post('bookings/', { slot: slotId })).data,
    // ✅ FIX: `reason` is now a real parameter instead of an undefined free variable
    cancelBooking: async (bookingId, reason) =>
        (await API.patch(`bookings/${bookingId}/cancel/`, { reason })).data
};

export const milestoneService = {
    getMilestones: async () => (await API.get('milestones/')).data
};

export const submissionService = {
    getSubmissions: async () => (await API.get('submissions/')).data,
    uploadSubmission: async (milestoneId, file, chapter = null) => {
        const formData = new FormData();
        formData.append('milestone', milestoneId);
        formData.append('file_upload', file);
        if (chapter) formData.append('chapter', chapter);
        const response = await API.post('submissions/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
    reviewSubmission: (id, status, comments = '') =>
        API.patch(`submissions/${id}/review/`, { status, comments }),
};

export const adminService = {
    getAllocations: async () => (await API.get('projects/')).data,
    runAutoAllocate: async () => (await API.post('projects/auto-allocate/')).data,
    inviteSupervisor: async (payload) => (await API.post('auth/invite/', payload)).data,
    getSupervisors: async () => (await API.get('supervisors/')).data,
};

export const settingsService = {
    getSettings: async () => (await API.get('settings/current/')).data,
    updateProposalDeadline: async (deadline) =>
        (await API.patch('settings/current/', { proposal_deadline: deadline })).data
};

export const milestoneAdminService = {
    updateMilestone: async (id, updates) =>
        (await API.patch(`milestones/${id}/`, updates)).data,
    setChapterDeadlines: async (id, deadlines) =>
        (await API.put(`milestones/${id}/chapter-deadlines/`, { deadlines })).data,
};

export const notificationService = {
    getNotifications: async () => (await API.get('notifications/')).data,
    dismiss: async (id) => { await API.delete(`notifications/${id}/dismiss/`); },
    clearAll: async () => { await API.delete('notifications/clear/'); },
};

export default API;


















