import api from './http';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3130';

const apiMultipart = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const adminDashboardAPI = {
  async getStats() {
    const { data } = await api.get('/admin/dashboard/stats');
    return data;
  },

  async getRecentActivity() {
    const { data } = await api.get('/admin/dashboard/recent-activity');
    return data;
  },
};

export const adminRoomsAPI = {
  async getAll(params = {}) {
    const { data } = await api.get('/rooms', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/rooms/${id}`);
    return data;
  },

  async create(roomData) {
    const { data } = await apiMultipart.post('/rooms', roomData);
    return data;
  },

  async update(id, roomData) {
    const { data } = await apiMultipart.put(`/rooms/${id}`, roomData);
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/rooms/${id}`);
    return data;
  },
};

export const adminBookingsAPI = {
  async getAll(params = {}) {
    const { data } = await api.get('/bookings', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/bookings/${id}`);
    return data;
  },

  async updateStatus(id, status) {
    const { data } = await api.put(`/bookings/${id}/status`, { status });
    return data;
  },

  async update(id, bookingData) {
    const { data } = await api.put(`/bookings/${id}`, bookingData);
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/bookings/${id}`);
    return data;
  },
};

export const adminEmployeesAPI = {
  async getAll(params = {}) {
    const { data } = await api.get('/admin/employees', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/admin/employees/${id}`);
    return data;
  },

  async create(employeeData) {
    const { data } = await api.post('/admin/employees', employeeData);
    return data;
  },

  async update(id, employeeData) {
    const { data } = await api.put(`/admin/employees/${id}`, employeeData);
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/admin/employees/${id}`);
    return data;
  },
};

export const adminCustomersAPI = {
  async getAll(params = {}) {
    const { data } = await api.get('/customer-details', { params });
    return data;
  },

  async getByUserId(userId) {
    const { data } = await api.get(`/customer-details/user/${userId}`);
    return data;
  },

  async update(userId, customerData) {
    const { data } = await api.put(`/customer-details/user/${userId}`, customerData);
    return data;
  },

  async delete(userId) {
    const { data } = await api.delete(`/customer-details/user/${userId}`);
    return data;
  },
};

export const adminPaymentsAPI = {
  async getAll(params = {}) {
    const { data } = await api.get('/payment', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/payment/${id}`);
    return data;
  },

  async getByBookingId(bookingId) {
    const { data } = await api.get(`/payment/booking/${bookingId}`);
    return data;
  },

  async updateStatus(id, paymentStatus) {
    const { data } = await api.put(`/payment/${id}/status`, { payment_status: paymentStatus });
    return data;
  },

  async updateAmount(id, amount) {
    const { data } = await api.put(`/payment/${id}/amount`, { amount });
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/payment/${id}`);
    return data;
  },

  async getStatistics() {
    const { data } = await api.get('/payment/statistics/summary');
    return data;
  },
};

export const adminReportsAPI = {
  async getBookingReport(params = {}) {
    const { data } = await api.get('/admin/reports/bookings', { 
      params,
      responseType: 'blob'
    });
    return data;
  },

  async getPaymentReport(params = {}) {
    const { data } = await api.get('/admin/reports/payments', { 
      params,
      responseType: 'blob'
    });
    return data;
  },

  async getRoomReport(params = {}) {
    const { data } = await api.get('/admin/reports/rooms', { 
      params,
      responseType: 'blob'
    });
    return data;
  },

  async getEmployeeReport(params = {}) {
    const { data } = await api.get('/admin/reports/employees', { 
      params,
      responseType: 'blob'
    });
    return data;
  },
};

export default api;