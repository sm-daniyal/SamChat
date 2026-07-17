// src/api.js — Axios instance pointing to Flask backend
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export default api;
