# Smart Agri Suite 👋

Integrated pricing, logistics, and yield optimization suite for spice farmers and customers.

## System Components

- **Frontend**: Expo (React Native) Mobile Application
- **Backend (Node)**: Express.js server for order management and marketing.
- **Backend (Python)**: FastAPI service for ML-based price predictions.
- **Database**: MongoDB

## Pre-requisites

1. **Node.js** (v18+)
2. **Python 3.9+**
3. **MongoDB** (Running on port 27017)
4. **Expo Go** (On your physical device)

## Getting Started

### 1. Initial Setup

Install all dependencies for both frontend and backend:

```bash
# Root directory
cd backend
npm install
# Ensure you have a venv at backend/venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..

cd frontend
npm install
cd ..
```

### 2. Configuration

Update `frontend/config.ts` if you want to connect from a **physical device**. Replace `localhost` with your workstation's LAN IP.

### 3. Running the Suite

The easiest way to run everything is using the unified launcher:

```bash
run-all.bat
```

This will open three separate command windows for:
- Node.js Backend (`localhost:5000`)
- Python ML Service (`localhost:8000`)
- Expo Metro Bundler

## Project Structure

- `/frontend`: React Native source code (Expo Router).
- `/backend`: Node.js Express controllers and routes.
- `/backend/ml`: Python ML scripts and trained models.
- `/backend/ml/data`: Datasets for training and seasonal analytics.

## Troubleshooting

- **MongoDB Connection**: Ensure MongoDB is running. If it fails to connect, the backend will log an error but might still run with limited functionality.
- **Network Discovery**: If Expo Go cannot see your server, ensure your firewall allows ports 5000, 8000, and 8081, and that you've updated `frontend/config.ts` with your local IP.
- **Model Loading**: The ML model is approximately 170MB and uses `mmap` for efficient memory usage.
