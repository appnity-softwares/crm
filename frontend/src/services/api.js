import axios from 'axios';

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:8080/api'
    : 'https://crmapi.appnity.cloud/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            const refresh = localStorage.getItem('refresh_token');
            if (!refresh) {
                localStorage.clear();
                window.dispatchEvent(new Event('auth_logout'));
                return Promise.reject(error);
            }
            try {
                const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refresh });
                localStorage.setItem('access_token', data.access_token);
                original.headers.Authorization = `Bearer ${data.access_token}`;
                return api(original);
            } catch {
                localStorage.clear();
                window.dispatchEvent(new Event('auth_logout'));
            }
        }
        return Promise.reject(error);
    }
);

// ── Auth ──
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (data) => api.post('/auth/register', data),
    getProfile: () => api.get('/profile'),
    refreshToken: (token) => api.post('/auth/refresh', { refresh_token: token }),
};

// ── Employees ──
export const employeeAPI = {
    create: (data) => api.post('/employees', data),
    getAll: (params) => api.get('/employees', { params }),
    getOne: (id) => api.get(`/employees/${id}`),
    getStats: (id) => api.get(`/employees/${id}/stats`),
    update: (id, data) => api.put(`/employees/${id}`, data),
    activate: (id) => api.put(`/employees/${id}/activate`),
    deactivate: (id) => api.put(`/employees/${id}`, { is_active: false }),
    delete: (id) => api.delete(`/employees/${id}`),
};

// ── Attendance ──
export const attendanceAPI = {
    checkIn: () => api.post('/attendance/check-in'),
    checkOut: () => api.put('/attendance/check-out'),
    getAll: (params) => api.get('/attendance', { params }),
    getMine: (params) => api.get('/attendance/me', { params }),
    getQRToken: () => api.get('/attendance/qr-token'),
    qrCheckIn: (data) => api.post('/attendance/qr-checkin', data),
    create: (data) => api.post('/attendance/manual', data),
    update: (id, data) => api.put(`/attendance/${id}`, data),
    delete: (id) => api.delete(`/attendance/${id}`),
};

// ── Work Logs ──
export const worklogAPI = {
    create: (data) => api.post('/worklogs', data),
    getAll: (params) => api.get('/worklogs', { params }),
    getMine: (params) => api.get('/worklogs/me', { params }),
    update: (id, data) => api.put(`/worklogs/${id}`, data),
    remove: (id) => api.delete(`/worklogs/${id}`),
};

// ── Daily Reports ──
export const dailyReportsAPI = {
    create: (data) => api.post('/reports', data),
    getAll: (params) => api.get('/reports', { params }),
    getMine: (params) => api.get('/reports/me', { params }),
    getStats: () => api.get('/reports/stats'),
    update: (id, data) => api.put(`/reports/${id}`, data),
    review: (id, data) => api.put(`/reports/${id}/review`, data),
    delete: (id) => api.delete(`/reports/${id}`),
};

// ── Projects ──
export const projectAPI = {
    create: (data) => api.post('/projects', data),
    getAll: (params) => api.get('/projects', { params }),
    getOne: (id) => api.get(`/projects/${id}`),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    assignMember: (id, data) => api.post(`/projects/${id}/assign`, data),
    transferMember: (id, data) => api.post(`/projects/${id}/transfer`, data),
    approveUpdate: (id, data) => api.put(`/projects/${id}/approve`, data),
    removeMember: (id, uid) => api.delete(`/projects/${id}/members/${uid}`),
    
    // Updates for clients
    getUpdates: (pid) => api.get(`/projects/${pid}/updates`),
    postUpdate: (data) => api.post(`/projects/updates`, data),
    getComments: (uid) => api.get(`/projects/updates/${uid}/comments`),
    postComment: (data) => api.post(`/projects/updates/comments`, data),
    signSOW: (id) => api.post(`/projects/${id}/sign`),
};

// ── Payroll ──
export const payrollAPI = {
    create: (data) => api.post('/payroll', data),
    getAll: (params) => api.get('/payroll', { params }),
    getMine: (params) => api.get('/payroll/me', { params }),
    update: (id, data) => api.put(`/payroll/${id}`, data),
};

// ── Invoices ──
export const invoiceAPI = {
    create: (data) => api.post('/invoices', data),
    getAll: (params) => api.get('/invoices', { params }),
    getOne: (id) => api.get(`/invoices/${id}`),
    update: (id, data) => api.put(`/invoices/${id}`, data),
    updateInvoice: (id, data) => api.put(`/invoices/${id}`, data),
    updateStatus: (id, data) => api.put(`/invoices/${id}/status`, data),
    remind: (id) => api.post(`/invoices/${id}/remind`),
};

// ── Leads ──
export const leadAPI = {
    create: (data) => api.post('/leads', data),
    getAll: (params) => api.get('/leads', { params }),
    getOne: (id) => api.get(`/leads/${id}`),
    update: (id, data) => api.put(`/leads/${id}`, data),
    remove: (id) => api.delete(`/leads/${id}`),
    submitRequirement: (data) => api.post('/leads/requirement', data),
    getMyProfile: () => api.get('/leads/my-profile'),
    convertToClient: (id, data) => api.post(`/leads/${id}/convert`, data),
    acceptSOW: (id) => api.post(`/leads/${id}/sow/accept`),
};

// ── Dashboard ──
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
};

// ── Configs & Flags ──
export const configAPI = {
    getFlags: () => api.get('/configs/flags'),
    toggleFlag: (key) => api.patch(`/configs/flags/${key}`),
    getAuditLogs: (params) => api.get('/configs/audit', { params }),
};

// ── Notifications ──
export const notificationAPI = {
    getAll: () => api.get('/notifications'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all'),
    remove: (id) => api.delete(`/notifications/${id}`),
    saveToken: (token, device = 'web') => api.post('/notifications/token', { token, device }),
    removeToken: (token) => api.delete('/notifications/token', { data: { token } }),
    getTypes: () => api.get('/notifications/types'),
    getPreferences: () => api.get('/notifications/preferences'),
    updatePreferences: (updates) => api.put('/notifications/preferences', { updates }),
};

// ── Expenses ──
export const expenseAPI = {
    create: (data) => api.post('/expenses', data),
    getAll: (params) => api.get('/expenses', { params }),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    remove: (id) => api.delete(`/expenses/${id}`),
};

export const balanceAPI = {
    get: () => api.get('/finance/balance'),
    getStats: () => api.get('/finance/stats'),
    getAnalytics: () => api.get('/finance/analytics'),
    updateManual: (data) => api.post('/finance/balance/manual', data),
};

export const userAPI = {
    updateProfile: (data) => api.put('/profile', data),
};

export const portalAPI = {
    getData: (token) => api.get(`/portal/${token}`),
    initializePayment: (token) => api.post(`/portal/${token}/pay`),
    verifyPayment: (token, data) => api.post(`/portal/${token}/verify`, data),
    createTicket: (token, data) => api.post(`/portal/${token}/tickets`, data),
    getTickets: (token) => api.get(`/portal/${token}/tickets`),
    postComment: (token, data) => api.post(`/portal/${token}/comments`, data),
    acceptSOW: (token) => api.post(`/portal/${token}/sow/accept`),
    updateSOW: (token, data) => api.post(`/portal/${token}/sow`, data),
    requestChat: (token, data) => api.post(`/portal/${token}/chat-request`, data),
    getChatStatus: (token) => api.get(`/portal/${token}/chat-status`),
};

export const ticketAPI = {
    getAll: () => api.get('/tickets'),
    updateStatus: (id, status) => api.put(`/tickets/${id}/status`, { status }),
};

export const leaveAPI = {
    apply: (data) => api.post('/leaves', data),
    getMyLeaves: () => api.get('/leaves/me'),
    getAll: (params) => api.get('/leaves', { params }),
    review: (id, data) => api.put(`/leaves/${id}/review`, data),
};

export const noticeAPI = {
    getAll: () => api.get('/notices'),
    create: (data) => api.post('/notices', data),
    remove: (id) => api.delete(`/notices/${id}`),
};

export const chatAPI = {
    getConversations: () => api.get('/chat/conversations'),
    getHistory: (uid) => api.get(`/chat/history/${uid}`),
    send: (data) => api.post('/chat/send', data),
    edit: (mid, data) => api.put(`/chat/${mid}`, data),
    remove: (mid, forEveryone) => api.delete(`/chat/${mid}`, { data: { delete_for_everyone: forEveryone } }),
};

export const taskAPI = {
    getByProject: (pid) => api.get(`/projects/${pid}/tasks`),
    create: (data) => api.post('/projects/tasks', data),
    update: (id, data) => api.put(`/projects/tasks/${id}`, data),
    remove: (id) => api.delete(`/projects/tasks/${id}`),
};

export const incomeAPI = {
    getAll: (params) => api.get('/income', { params }),
    create: (data) => api.post('/income', data),
    update: (id, data) => api.put(`/income/${id}`, data),
    delete: (id) => api.delete(`/income/${id}`),
};

export const clientAPI = {
    getAll: (params) => api.get('/clients', { params }),
    get: (id) => api.get(`/clients/${id}`),
    create: (data) => api.post('/clients', data),
    update: (id, data) => api.put(`/clients/${id}`, data),
    activate: (id) => api.put(`/clients/${id}`, { is_active: true }),
    delete: (id) => api.delete(`/clients/${id}`),
};

export const chatPermissionAPI = {
    getAll: () => api.get('/chat/permissions'),
    request: (data) => api.post('/chat/permissions/request', data),
    update: (id, data) => api.put(`/chat/permissions/${id}`, data),
};

export const trainingAPI = {
    createCourse: (data) => api.post('/training/courses', data),
    getCourses: () => api.get('/training/courses'),
    getCourse: (id) => api.get(`/training/courses/${id}`),
    updateCourse: (id, data) => api.put(`/training/courses/${id}`, data),
    enroll: (data) => api.post('/training/enrollments', data),
    getEnrollments: (params) => api.get('/training/enrollments', { params }),
    updateEnrollment: (id, data) => api.put(`/training/enrollments/${id}`, data),
    addPayment: (id, data) => api.post(`/training/enrollments/${id}/payments`, data),
    getMyEnrollments: () => api.get('/training/enrollments/me'),
    deleteCourse: (id) => api.delete(`/training/courses/${id}`),
};

export {
    api,
    dailyReportsAPI as reportAPI,
    balanceAPI as financeAPI,
};
