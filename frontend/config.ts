// Smart Agri Suite Frontend Configuration
// Replace 'localhost' with your workstation's LAN IP to connect from a physical device via Expo Go

export const HOST = "172.20.10.3"; 
export const NODE_PORT = "5000";
export const ML_PORT = "8000";

export const API_BASE_URL = `http://${HOST}:${NODE_PORT}/api`;
export const ML_BASE_URL = `http://${HOST}:${ML_PORT}`;
