// lib/employeeAPI.js
import api from './http';

export const employeeDashboardAPI = {
  async getStats() {
    const { data } = await api.get('/employee/dashboard/stats');
    return data;
  },

  async getRecentActivity() {
    const { data } = await api.get('/employee/dashboard/recent-activity');
    return data;
  },
};

export const employeeBookingsAPI = {
  async getAll(params = {}) {
    const { data } = await api.get('/bookings', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/bookings/${id}`);
    return data;
  },

  async create(bookingData) {
    const { data } = await api.post('/bookings', bookingData);
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

export const employeePaymentsAPI = {
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

  async create(paymentData) {
    const { data } = await api.post('/payment', paymentData);
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
};

export const employeeCustomersAPI = {
  async getAll(params = {}) {
    const { data } = await api.get('/customer-details', { params });
    return data;
  },

  async getByUserId(userId) {
    const { data } = await api.get(`/customer-details/user/${userId}`);
    return data;
  },

  async create(customerData) {
    const { data } = await api.post('/customer-details', customerData);
    return data;
  },

  async update(userId, customerData) {
    const { data } = await api.put(`/customer-details/user/${userId}`, customerData);
    return data;
  },
};

export const employeeRoomsAPI = {
  async getAll(params = {}) {
    const { data } = await api.get('/rooms', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/rooms/${id}`);
    return data;
  },

  async getAvailable(params = {}) {
    const { data } = await api.get('/rooms/available', { params });
    return data;
  },

  async updateStatus(id, status) {
    const { data } = await api.put(`/rooms/${id}/status`, { status });
    return data;
  },
};

export const employeeProfileAPI = {
  async getProfile() {
    const { data } = await api.get('/employee/employees/profile');
    return data;
  },

  async updateProfile(profileData) {
    const { data } = await api.put('/employee/employees/profile', profileData);
    return data;
  },

  async changePassword(passwordData) {
    const { data } = await api.put('/employee/employees/change-password', passwordData);
    return data;
  },
};

export default api;