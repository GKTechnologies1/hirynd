import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/candidate-login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ───
export const authApi = {
  register: (data: Record<string, any>) =>
    api.post('/auth/register/', data),
  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }),
  logout: () => {
    const refresh = localStorage.getItem('refresh_token');
    return api.post('/auth/logout/', { refresh });
  },
  me: () => api.get('/auth/me/'),
  updateProfile: (data: Record<string, any>) => api.patch('/auth/profile/', data),
  changePassword: (data: { current_password: string; new_password: string; confirm_new_password: string }) =>
    api.post('/auth/change-password/', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password/', { email }),
  resetPassword: (data: { token: string; new_password: string; confirm_password: string }) =>
    api.post('/auth/reset-password/', data),
  pendingApprovals: () => api.get('/auth/pending-approvals/'),
  approveUser: (user_id: string, action: 'approved' | 'rejected') =>
    api.post('/auth/approve-user/', { user_id, action }),
  allUsers: (params?: { role?: string; status?: string; search?: string }) =>
    api.get('/auth/users/', { params }),
  updateUser: (user_id: string, data: Record<string, any>) =>
    api.patch(`/auth/users/${user_id}/`, data),
  deleteUser: (user_id: string) =>
    api.delete(`/auth/users/${user_id}/delete/`),
  dashboardStats: () => api.get('/auth/dashboard-stats/'),
};

// ─── Candidates ───
export const candidatesApi = {
  list: (statusFilter?: string) => api.get('/candidates/', { params: statusFilter ? { status: statusFilter } : {} }),
  detail: (id: string) => api.get(`/candidates/${id}/`),
  updateStatus: (id: string, status: string) => api.post(`/candidates/${id}/status/`, { status }),
  getIntake: (id: string) => api.get(`/candidates/${id}/intake/`),
  submitIntake: (id: string, data: Record<string, any>) => api.post(`/candidates/${id}/intake/`, { data }),
  getRoles: (id: string) => api.get(`/candidates/${id}/roles/`),
  addRole: (id: string, data: { role_title: string; description?: string; admin_note?: string }) =>
    api.post(`/candidates/${id}/roles/add/`, data),
  confirmRoles: (id: string, decisions: Record<string, any>) =>
    api.post(`/candidates/${id}/roles/confirm/`, { decisions }),
  getCredentials: (id: string) => api.get(`/candidates/${id}/credentials/`),
  upsertCredential: (id: string, data: Record<string, any>) =>
    api.post(`/candidates/${id}/credentials/upsert/`, { data }),
  getReferrals: (id: string) => api.get(`/candidates/${id}/referrals/`),
  submitReferral: (id: string, data: Record<string, any>) =>
    api.post(`/candidates/${id}/referrals/`, data),
  getInterviews: (id: string) => api.get(`/candidates/${id}/interviews/`),
  submitInterview: (id: string, data: Record<string, any>) =>
    api.post(`/candidates/${id}/interviews/`, data),
  getPlacement: (id: string) => api.get(`/candidates/${id}/placement/`),
  closePlacement: (id: string, data: Record<string, any>) =>
    api.post(`/candidates/${id}/placement/`, data),
  getPayments: (id: string) => api.get(`/candidates/${id}/payments/`),
};

// ─── Recruiters ───
export const recruitersApi = {
  myCandidates: () => api.get('/recruiters/my-candidates/'),
  assignments: (candidateId: string) => api.get(`/recruiters/${candidateId}/assignments/`),
  assign: (data: { candidate: string; recruiter: string; role_type: string }) =>
    api.post('/recruiters/assign/', data),
  unassign: (assignmentId: string) => api.post(`/recruiters/unassign/${assignmentId}/`),
  getDailyLogs: (candidateId: string) => api.get(`/recruiters/${candidateId}/daily-logs/`),
  submitDailyLog: (candidateId: string, data: Record<string, any>) =>
    api.post(`/recruiters/${candidateId}/daily-logs/`, data),
  updateJobStatus: (jobId: string, status: string) =>
    api.post(`/recruiters/jobs/${jobId}/status/`, { status }),
};

// ─── Billing ───
export const billingApi = {
  // Plans
  plans: () => api.get('/billing/plans/'),
  createPlan: (data: Record<string, any>) => api.post('/billing/plans/create/', data),
  updatePlan: (planId: string, data: Record<string, any>) => api.patch(`/billing/plans/${planId}/update/`, data),
  deletePlan: (planId: string) => api.delete(`/billing/plans/${planId}/delete/`),

  // Global admin views
  allPayments: (params?: Record<string, string>) => api.get('/billing/all-payments/', { params }),
  allSubscriptions: (params?: Record<string, string>) => api.get('/billing/all-subscriptions/', { params }),
  paymentSummary: () => api.get('/billing/payment-summary/'),

  // Per-candidate
  subscription: (candidateId: string) => api.get(`/billing/${candidateId}/subscription/`),
  createSubscription: (candidateId: string, data: Record<string, any>) =>
    api.post(`/billing/${candidateId}/subscription/create/`, data),
  updateSubscription: (candidateId: string, data: Record<string, any>) =>
    api.patch(`/billing/${candidateId}/subscription/update/`, data),
  payments: (candidateId: string) => api.get(`/billing/${candidateId}/payments/`),
  recordPayment: (candidateId: string, data: Record<string, any>) =>
    api.post(`/billing/${candidateId}/payments/record/`, data),
  invoices: (candidateId: string) => api.get(`/billing/${candidateId}/invoices/`),
};

// ─── Audit ───
export const auditApi = {
  globalLogs: (action?: string) => api.get('/audit/', { params: action ? { action } : {} }),
  candidateLogs: (candidateId: string) => api.get(`/audit/${candidateId}/`),
};

// ─── Notifications ───
export const notificationsApi = {
  list: (unreadOnly?: boolean) => api.get('/notifications/', { params: unreadOnly ? { unread: 'true' } : {} }),
  markRead: (id: string) => api.post(`/notifications/${id}/read/`),
};

// ─── Files ───
export const filesApi = {
  upload: (file: File, fileType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    return api.post('/files/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getDownloadUrl: (fileId: string) => api.get(`/files/${fileId}/download/`),
};

// ─── Chat ───
export const chatApi = {
  myRooms: () => api.get('/chat/rooms/'),
  roomMessages: (roomId: string) => api.get(`/chat/rooms/${roomId}/messages/`),
  sendMessage: (roomId: string, message_text: string, attachment_url?: string) =>
    api.post(`/chat/rooms/${roomId}/send/`, { message_text, attachment_url }),
};
