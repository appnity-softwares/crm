import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

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
            try {
                const refresh = localStorage.getItem('refresh_token');
                const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refresh });
                localStorage.setItem('access_token', data.access_token);
                original.headers.Authorization = `Bearer ${data.access_token}`;
                return api(original);
            } catch {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ── Auth ──
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    refresh: (token) => api.post('/auth/refresh', { refresh_token: token }),
    getProfile: () => api.get('/profile'),
};

// ── Employees ──
export const employeeAPI = {
    create: (data) => api.post('/employees', data),
    getAll: (params) => api.get('/employees', { params }),
    getOne: (id) => api.get(`/employees/${id}`),
    getStats: (id) => api.get(`/employees/${id}/stats`),
    update: (id, data) => api.put(`/employees/${id}`, data),
    deactivate: (id) => api.delete(`/employees/${id}`),
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
};

// ── Projects ──
export const projectAPI = {
    create: (data) => api.post('/projects', data),
    getAll: (params) => api.get('/projects', { params }),
    getOne: (id) => api.get(`/projects/${id}`),
    update: (id, data) => api.put(`/projects/${id}`, data),
    assign: (id, data) => api.post(`/projects/${id}/assign`, data),
    transfer: (id, data) => api.post(`/projects/${id}/transfer`, data),
    removeMember: (id, uid) => api.delete(`/projects/${id}/members/${uid}`),
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
    updateStatus: (id, data) => api.put(`/invoices/${id}/status`, data),
};

// ── Leads ──
export const leadAPI = {
    create: (data) => api.post('/leads', data),
    getAll: (params) => api.get('/leads', { params }),
    getOne: (id) => api.get(`/leads/${id}`),
    update: (id, data) => api.put(`/leads/${id}`, data),
    remove: (id) => api.delete(`/leads/${id}`),
};

// ── Dashboard ──
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
};

// ── Configs & Flags ──
export const configAPI = {
    getFlags: () => api.get('/configs/flags'),
    toggleFlag: (key) => api.patch(`/configs/flags/${key}`),
};

// ── Notifications ──
export const notificationAPI = {
    getAll: () => api.get('/notifications'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all'),
    remove: (id) => api.delete(`/notifications/${id}`),
};

export default api;

