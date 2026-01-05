# 🌾Smart-Agri-Suite - Final Year Research Project<br/>

This cross-platform mobile application empowers farmers with intelligent, real-time insights to support smarter agricultural decision-making. Designed with usability, localization, and offline capability in mind, the app delivers:<br/>

📈 Live Crop Price Tracking – Stay updated with dynamic market prices.<br/>
🔮 Demand Forecasting – Anticipate crop demand trends using predictive analytics.<br/>
🗣️ Customer Voice Intention Analysis – Enhance negotiation outcomes during land sales calls through voice-based sentiment prediction.<br/>
📊 Stock Prediction - Automatically predict upcoming spice demand/sales and alert warehouse or shop owners to restock before shortages or overstock happen.<br/>
🛰️ Idle Land Detection - Detect idle lands/manual listing of lands and lease lands for a better income for residences 

# Introduction to the Problem<br/>
Sri Lanka's spice industry, known globally for its premium products like cinnamon, pepper, and cloves, plays a significant role in the country's economy. However, the sector faces several challenges that hinder its growth. Our research, conducted through discussions with experts and industry leaders, identified key issues:

Inconsistent Market Prices: Spice farmers are often unaware of regional price variations and are forced to sell their produce at lower rates, reducing their income.
Inefficient Logistics: The absence of optimized transport systems leads to delays, increased costs, and wastage, further affecting farmer profitability.
Limited Access to Reliable Data: Smallholder farmers struggle with inadequate access to timely, location-specific market data and demand forecasts.
Lack of Integrated Tools: There is a need for a system that combines market pricing, logistics optimization, and demand forecasting to guide farmers in making better decisions.

These challenges result in unstable incomes, hinder the competitive edge of Sri Lankan spices in international markets, and discourage the younger generation from pursuing spice cultivation. Thus, a digital solution that integrates pricing insights, forecasting, and optimized logistics is essential to improving the livelihoods of spice farmers and strengthening the industry’s global position.

# Importance of Solving This Problem<br/>
Solving the issues in Sri Lanka's spice industry is critical for enhancing agricultural productivity, improving farmers' livelihoods, and ensuring the nation's competitiveness in the global market. By addressing price fluctuations, inefficient logistics, and lack of timely market data, we can empower smallholder farmers to make informed decisions, increase their income, and reduce wastage. Additionally, optimizing land use and transport routes can help minimize costs, improve resource allocation, and prevent overproduction or stockouts. This solution not only strengthens the domestic spice trade but also contributes to sustainable farming practices, attracting the younger generation to agriculture and bolstering Sri Lanka’s position as a leading global spice exporter.

# Overall System Architecture<br/>
<img width="1116" height="436" alt="image" src="https://github.com/user-attachments/assets/919917ec-18ea-4540-a5b9-4453305e4516" />


<br/>Built as part of our final year research initiative, Smart Agri-Suite aims to bridge the gap between data science and rural accessibility—bringing powerful tools to the hands of farmers through an intuitive interface.

This research is aligned to Expo SDK 54 toolchain expectations.

start backend:
uvicorn main:app --reload --host 0.0.0.0 --port 8000

start frontend:
npx expo start -c
