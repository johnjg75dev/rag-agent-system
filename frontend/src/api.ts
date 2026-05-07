import axios from 'axios';

// In production (Docker), the frontend is served from the same origin as the API.
// In development, Vite's proxy forwards /api requests to the backend.
const api = axios.create({ baseURL: '' });

export default api;