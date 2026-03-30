import axios from 'axios';

const isStaging = window.location.href.includes("staging.hyrind.com") || window.location.href.includes("staging.hrind.com");

const STAGING_URL = import.meta.env.VITE_STAGING_API || 'https://api-staging.hyrind.com';
const LOCAL_URL = import.meta.env.VITE_LOCAL_API || 'http://localhost:8000';

const DEFAULT_URL = isStaging ? STAGING_URL : LOCAL_URL;

const VITE_API_URL = import.meta.env.VITE_API_URL || DEFAULT_URL;
const API_BASE_URL = `${VITE_API_URL.replace(/\/$/, "")}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
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
  register: (data: any) =>
    api.post('/auth/register/', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
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
  pendingApprovals: () => api.get('/auth/pending-approvals/'),
  requestPasswordReset: (email: string) => api.post('/auth/password-reset/', { email }),
  resetPassword: (data: any) => api.post('/auth/password-reset/confirm/', data),
  approveUser: (user_id: string, action: 'approved' | 'rejected') =>
    api.post('/auth/approve-user/', { user_id, action }),
  allUsers: (params?: { role?: string; search?: string; page?: number; page_size?: number }) =>
    api.get('/auth/users/', { params }),
  getUser: (userId: string) => api.get(`/auth/users/${userId}/`),
  updateUser: (userId: string, data: Record<string, any>) => api.patch(`/auth/users/${userId}/`, data),
  deleteUser: (userId: string) => api.delete(`/auth/users/${userId}/`),
  analytics: () => api.get('/auth/analytics/'),
  submitContact: (data: any) => api.post('/auth/contact/', data),
};

// ─── Candidates ───
export const candidatesApi = {
  me: () => api.get('/candidates/me/'),
  list: (statusFilter?: string) => api.get('/candidates/', { params: statusFilter ? { status: statusFilter } : {} }),
  detail: (id: string) => api.get(`/candidates/${id}/`),
  updateStatus: (id: string, status: string) => api.post(`/candidates/${id}/status/`, { status }),
  getIntake: (id: string) => api.get(`/candidates/${id}/intake/`),
  submitIntake: (id: string, data: Record<string, any>) => api.post(`/candidates/${id}/intake/`, { data }),
  reopenIntake: (id: string) => api.post(`/candidates/${id}/intake/reopen/`),
  getRoles: (id: string) => api.get(`/candidates/${id}/roles/`),
  reopenRoles: (id: string) => api.post(`/candidates/${id}/roles/reopen/`),
  addRole: (id: string, data: { role_title: string; description?: string; admin_note?: string }) =>
    api.post(`/candidates/${id}/roles/add/`, data),
  confirmRoles: (id: string, data: Record<string, any>) =>
    api.post(`/candidates/${id}/roles/confirm/`, data),
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
  adminListReferrals: () => api.get('/candidates/referrals/all/'),
  updateReferral: (referralId: string, data: Record<string, any>) =>
    api.patch(`/candidates/referrals/${referralId}/update/`, data),
};

// ─── Recruiters ───
export const recruitersApi = {
  myCandidates: () => api.get('/recruiters/my-candidates/'),
  assignments: (candidateId: string) => api.get(`/recruiters/${candidateId}/assignments/`),
  assign: (data: { candidate: string; recruiter: string; role_type: string }) =>
    api.post('/recruiters/assign/', data),
  unassign: (assignmentId: string) => api.post(`/recruiters/unassign/${assignmentId}/`),
  getDailyLogs: (candidateId: string) => api.get(`/recruiters/${candidateId}/daily-logs/`),
  submitDailyLog: (candidateId: string, data: any) => api.post(`/recruiters/${candidateId}/daily-logs/`, data),
  updateJobStatus: (jobId: string, status: string) => api.post(`/recruiters/jobs/${jobId}/status/`, { status }),
  fetchJobDetails: (url: string) => api.post(`/recruiters/fetch-job-details/`, { url }),
  stats: (params?: { user_id?: string }) => api.get('/recruiters/stats/', { params }),
  getProfile: () => api.get('/recruiters/profile/'),
  updateProfile: (data: any) => api.patch('/recruiters/profile/', data),
  getBankDetails: () => api.get('/recruiters/bank-details/'),
  updateBankDetails: (data: any) => api.post('/recruiters/bank-details/', data),
};

// ─── Billing ───
export const billingApi = {
  // Subscription Plans catalogue
  listPlans: () => api.get('/billing/plans/'),
  createPlan: (data: Record<string, any>) => api.post('/billing/plans/create/', data),
  updatePlan: (planId: string, data: Record<string, any>) => api.patch(`/billing/plans/${planId}/`, data),
  deletePlan: (planId: string) => api.delete(`/billing/plans/${planId}/`),

  // Subscription Addons catalogue
  listAddons: () => api.get('/billing/addons/'),
  createAddon: (data: Record<string, any>) => api.post('/billing/addons/create/', data),
  updateAddon: (addonId: string, data: Record<string, any>) => api.patch(`/billing/addons/${addonId}/`, data),
  deleteAddon: (addonId: string) => api.delete(`/billing/addons/${addonId}/`),

  // Admin overviews
  allSubscriptions: (statusFilter?: string) =>
    api.get('/billing/subscriptions/', { params: statusFilter ? { status: statusFilter } : {} }),
  billingAlerts: () => api.get('/billing/alerts/'),
  billingAnalytics: () => api.get('/billing/analytics/'),

  // Per-candidate subscription
  subscription: (candidateId: string) => api.get(`/billing/${candidateId}/subscription/`),
  assignPlan: (candidateId: string, data: { plan_id: string; addons?: string[] }) =>
    api.post(`/billing/${candidateId}/subscription/assign/`, data),
  updateSubscription: (candidateId: string, data: Record<string, any>) =>
    api.patch(`/billing/${candidateId}/subscription/update/`, data),
  addAddonToSubscription: (candidateId: string, addon_id: string) =>
    api.post(`/billing/${candidateId}/subscription/addon/`, { addon_id }),

  // Razorpay checkout
  createOrder: (candidateId: string) =>
    api.post(`/billing/${candidateId}/payment/create-order/`),
  verifyPayment: (candidateId: string, data: Record<string, any>) =>
    api.post(`/billing/${candidateId}/payment/verify/`, data),

  // Payment history
  payments: (candidateId: string) => api.get(`/billing/${candidateId}/payments/`),
  recordPayment: (candidateId: string, data: Record<string, any>) =>
    api.post(`/billing/${candidateId}/payments/record/`, data),
  updatePayment: (paymentId: string, data: Record<string, any>) =>
    api.patch(`/billing/payments/${paymentId}/manage/`, data),
  deletePayment: (paymentId: string) =>
    api.delete(`/billing/payments/${paymentId}/manage/`),
  invoices: (candidateId: string) => api.get(`/billing/${candidateId}/invoices/`),
  updateInvoice: (invoiceId: string, data: Record<string, any>) =>
    api.patch(`/billing/invoices/${invoiceId}/update/`, data),

  // Legacy compat — used by AdminBillingTab manual form
  createSubscription: (candidateId: string, data: Record<string, any>) =>
    api.post(`/billing/${candidateId}/subscription/create/`, data),
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

// ─── Jobs & Submissions ───
export const jobsApi = {
  list: (params?: { status?: string; employment_type?: string; search?: string; page?: number; page_size?: number }) =>
    api.get('/jobs/', { params }),
  create: (data: Record<string, any>) => api.post('/jobs/create/', data),
  get: (jobId: string) => api.get(`/jobs/${jobId}/`),
  update: (jobId: string, data: Record<string, any>) => api.patch(`/jobs/${jobId}/`, data),
  delete: (jobId: string) => api.delete(`/jobs/${jobId}/`),
  stats: () => api.get('/jobs/stats/'),

  // Submissions
  listSubmissions: (params?: { job?: string; candidate?: string; status?: string; search?: string; page?: number; page_size?: number }) =>
    api.get('/jobs/submissions/', { params }),
  createSubmission: (data: { job: string; candidate: string; notes?: string }) =>
    api.post('/jobs/submissions/create/', data),
  updateSubmission: (submissionId: string, data: Record<string, any>) =>
    api.patch(`/jobs/submissions/${submissionId}/`, data),
  deleteSubmission: (submissionId: string) =>
    api.delete(`/jobs/submissions/${submissionId}/`),
};
