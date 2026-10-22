import axios from 'axios';
import {
  User,
  Team,
  Task,
  Announcement,
  Attendance,
  LeaveRequest,
  AdminDashboardData,
  UserDashboardData,
} from '../types';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: async (credentials: { username: string; password: string }) => {
    const res = await api.post<{ success: boolean; token: string; user: User }>('/auth/login', credentials);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<{ success: boolean; user: User }>('/auth/me');
    return res.data;
  },
  updateProfile: async (data: { name?: string; email?: string; password?: string }) => {
    const res = await api.put<{ success: boolean; message: string; user: User }>('/auth/profile', data);
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },
};

// Users Service (Admin)
export const userService = {
  getAll: async (params?: { search?: string; teamId?: string; role?: string; status?: string }) => {
    const res = await api.get<{ success: boolean; users: User[]; count: number }>('/users', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; user: User & { tasks: Task[]; attendances: Attendance[]; leaveRequests: LeaveRequest[] } }>(`/users/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post<{ success: boolean; message: string; user: User }>('/users', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put<{ success: boolean; message: string; user: User }>(`/users/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/users/${id}`);
    return res.data;
  },
  toggleStatus: async (id: string) => {
    const res = await api.patch<{ success: boolean; message: string; user: User }>(`/users/${id}/status`);
    return res.data;
  },
  resetPassword: async (id: string, newPassword: string) => {
    const res = await api.post<{ success: boolean; message: string }>(`/users/${id}/reset-password`, { newPassword });
    return res.data;
  },
};

// Teams Service
export const teamService = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; teams: Team[] }>('/teams');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; team: Team }>(`/teams/${id}`);
    return res.data;
  },
  create: async (data: { name: string; description?: string; leadId?: string }) => {
    const res = await api.post<{ success: boolean; message: string; team: Team }>('/teams', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put<{ success: boolean; message: string; team: Team }>(`/teams/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/teams/${id}`);
    return res.data;
  },
};

// Tasks Service
export const taskService = {
  getUserTasks: async (params?: { status?: string; priority?: string; search?: string }) => {
    const res = await api.get<{ success: boolean; tasks: Task[] }>('/tasks', { params });
    return res.data;
  },
  getAdminTasks: async (params?: { status?: string; priority?: string; userId?: string; teamId?: string; search?: string }) => {
    const res = await api.get<{
      success: boolean;
      summary: { total: number; inProgress: number; pending: number; completed: number; review: number };
      tasks: Task[];
    }>('/tasks/admin/all', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; task: Task }>(`/tasks/${id}`);
    return res.data;
  },
  create: async (data: Partial<Task>) => {
    const res = await api.post<{ success: boolean; message: string; task: Task }>('/tasks', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Task>) => {
    const res = await api.put<{ success: boolean; message: string; task: Task }>(`/tasks/${id}`, data);
    return res.data;
  },
  updateStatus: async (id: string, status: string, progress?: number) => {
    const res = await api.patch<{ success: boolean; message: string; task: Task }>(`/tasks/${id}/status`, { status, progress });
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/tasks/${id}`);
    return res.data;
  },
};

// Announcements Service
export const announcementService = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; announcements: Announcement[] }>('/announcements');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; announcement: Announcement }>(`/announcements/${id}`);
    return res.data;
  },
  create: async (data: { title: string; content: string; priority?: string; expiryDate?: string; attachment?: string }) => {
    const res = await api.post<{ success: boolean; message: string; announcement: Announcement }>('/announcements', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put<{ success: boolean; message: string; announcement: Announcement }>(`/announcements/${id}`, data);
    return res.data;
  },
  repost: async (id: string) => {
    const res = await api.post<{ success: boolean; message: string; announcement: Announcement }>(`/announcements/${id}/repost`);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/announcements/${id}`);
    return res.data;
  },
};

// Attendance Service
export const attendanceService = {
  checkIn: async (notes?: string) => {
    const res = await api.post<{ success: boolean; message: string; attendance: Attendance }>('/attendance/check-in', { notes });
    return res.data;
  },
  checkOut: async (notes?: string) => {
    const res = await api.post<{ success: boolean; message: string; attendance: Attendance }>('/attendance/check-out', { notes });
    return res.data;
  },
  getMyToday: async () => {
    const res = await api.get<{ success: boolean; attendance: Attendance | null; today: string }>('/attendance/me/today');
    return res.data;
  },
  getMyHistory: async (params?: { month?: string | number; year?: string | number }) => {
    const res = await api.get<{
      success: boolean;
      stats: { total: number; present: number; late: number; absent: number; onLeave: number; rate: number };
      attendances: Attendance[];
    }>('/attendance/me', { params });
    return res.data;
  },
  getAdminAttendance: async (params?: { date?: string; month?: string; teamId?: string; status?: string; search?: string }) => {
    const res = await api.get<{
      success: boolean;
      date: string;
      stats: {
        totalMembers: number;
        present: number;
        presentPercentage: string;
        late: number;
        latePercentage: string;
        absent: number;
        absentPercentage: string;
        workingDays: number;
      };
      attendances: Attendance[];
    }>('/attendance/admin/all', { params });
    return res.data;
  },
};

// Leave Requests Service
export const leaveService = {
  submit: async (data: { leaveDate: string; reason: string; description?: string }) => {
    const res = await api.post<{ success: boolean; message: string; leave: LeaveRequest }>('/leaves', data);
    return res.data;
  },
  getMyLeaves: async () => {
    const res = await api.get<{ success: boolean; leaves: LeaveRequest[] }>('/leaves/me');
    return res.data;
  },
  getAdminLeaves: async (params?: { status?: string }) => {
    const res = await api.get<{
      success: boolean;
      summary: { total: number; pending: number; approved: number; rejected: number };
      leaves: LeaveRequest[];
    }>('/leaves/admin/all', { params });
    return res.data;
  },
  approve: async (id: string) => {
    const res = await api.patch<{ success: boolean; message: string; leave: LeaveRequest }>(`/leaves/admin/${id}/approve`);
    return res.data;
  },
  reject: async (id: string) => {
    const res = await api.patch<{ success: boolean; message: string; leave: LeaveRequest }>(`/leaves/admin/${id}/reject`);
    return res.data;
  },
};

// Stats Service
export const statsService = {
  getAdminDashboard: async () => {
    const res = await api.get<AdminDashboardData>('/stats/admin');
    return res.data;
  },
  getUserDashboard: async () => {
    const res = await api.get<UserDashboardData>('/stats/user');
    return res.data;
  },
};

export default api;
