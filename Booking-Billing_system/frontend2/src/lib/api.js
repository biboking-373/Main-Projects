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

export const authAPI = {
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async logout() {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  async getCurrentUser() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },
};

export const roomsAPI = {
  async getAll() {
    const { data } = await api.get('/rooms');
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/rooms/${id}`);
    return data;
  },

  async getAvailable(checkIn, checkOut) {
    const { data } = await api.get('/rooms/available', {
      params: { checkIn, checkOut }
    });
    return data;
  },

  async checkAvailability(roomId, checkIn, checkOut) {
    const { data } = await api.get('/bookings/check-availability', {
      params: { 
        room_id: roomId, 
        check_in_date: checkIn, 
        check_out_date: checkOut 
      }
    });
    return data;
  },
};

export const bookingsAPI = {
  async getMyBookings() {
    const { data } = await api.get('/bookings/my-bookings');
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/bookings/my-bookings/${id}`);
    return data;
  },

  async create(bookingData) {
    const { data } = await api.post('/bookings/my-bookings', bookingData);
    return data;
  },

  async cancel(id) {
    const { data } = await api.put(`/bookings/my-bookings/${id}/cancel`);
    return data;
  },

  async checkAvailability(roomId, checkIn, checkOut) {
    const { data } = await api.get('/bookings/check-availability', {
      params: { 
        room_id: roomId, 
        check_in_date: checkIn, 
        check_out_date: checkOut 
      }
    });
    return data;
  },
};

export const customerDetailsAPI = {
  async getMyDetails() {
    const { data } = await api.get('/customer-details/me');
    return data;
  },

  async createMyDetails(detailsData) {
    const { data } = await api.post('/customer-details/me', detailsData);
    return data;
  },

  async updateMyDetails(detailsData) {
    const { data } = await api.put('/customer-details/me', detailsData);
    return data;
  },
};

export const paymentsAPI = {
  async getMyPayments(paymentStatus) {
    const { data } = await api.get('/payment/my-payments', {
      params: paymentStatus ? { payment_status: paymentStatus } : {}
    });
    return data;
  },

  async getMyPaymentById(id) {
    const { data } = await api.get(`/payment/my-payments/${id}`);
    return data;
  },

  async createPayment(paymentData) {
    const { data } = await api.post('/payment/my-payments', paymentData);
    return data;
  },
};

// ADD M-PESA API
export const mpesaAPI = {
  async initiatePayment(bookingId, phoneNumber) {
    const { data } = await api.post('/mpesa/initiate', { bookingId, phoneNumber });
    return data;
  },

  async checkPaymentStatus(checkoutRequestID) {
    const { data } = await api.get(`/mpesa/status/${checkoutRequestID}`);
    return data;
  }
};

export const activitiesAPI = {
  async getAll() {
    const { data } = await api.get('/activities');
    return data;
  },
};

export default api;