# 🌾 Smart-Agri-Suite - Final Year Research Project

This cross-platform mobile application empowers farmers with intelligent, real-time insights to support smarter agricultural decision-making. Designed with usability, localization, and offline capability in mind, the app delivers:

- 📈 **Live Crop Price Tracking** – Stay updated with dynamic market prices.
- 🔮 **Demand Forecasting** – Anticipate crop demand trends using predictive analytics.
- 🗣️ **Cultivator Voice Intention Analysis** – Enhance negotiation outcomes during land sales calls through voice-based sentiment prediction.
- 🌦️ **Climate-Resilient Trade Recommendations** – Receive tailored suggestions for sustainable and profitable trade strategies.
- 🛰️ **Universal Idle Land Detection** - Instantly analyze land anywehere in the world via **Google Earth Engine (GEE)** and **XGBoost**. View idle lands, vegetation, built-up areas, spice suitability, and intercropping recommendations. List your land on the integrated marketplace.

Built as part of our final year research initiative, Smart Agri-Suite aims to bridge the gap between data science and rural accessibility—bringing powerful tools to the hands of farmers through an intuitive interface.

## Prerequisites

1. **Python 3.9+** (Backend)
2. **Node.js 18+** (Frontend)
3. **Google Earth Engine (GEE) Account** - Required for global point/polygon analysis.

## Setup Instructions

### 1. Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure Environment Variables:
   - Copy `.env.example` to `.env`
   - Provide your PostgreSQL `DATABASE_URL`
   - Provide your **Google Cloud Project ID** mapped to GEE in `GEE_PROJECT` (e.g., `GEE_PROJECT=my-first-project-123456`)
   - Authenticate GEE locally by running: `earthengine authenticate`

5. Start the backend server:
   ```bash
   uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
   ```

### 2. Frontend Setup (React Native / Expo)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo server:
   ```bash
   npx expo start -c
   ```
4. Use the **Expo Go** app on your phone (or a simulator) to scan the QR code and run the app.
