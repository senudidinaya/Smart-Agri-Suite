import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'si';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Header & Greeting
    ayubowanFarmer: "Ayubowan, Farmer",
    goodMorning: "Good Morning",
    goodAfternoon: "Good Afternoon",
    goodEvening: "Good Evening",
    farmerTitle: "Farmer",
    live: "LIVE",
    welcome: "Welcome to Smart Agri-Suite",
    welcomeDescription: "Smart Agri-Suite analyzes market demand, pricing trends, logistics costs, and seasonal conditions to help Sri Lankan spice farmers maximize profits.",
    smartPricingBadge: "Smart Pricing & Logistics",
    trending: "Trending",
    startExploring: "Start Exploring",
    
    // Modules
    exploreModules: "Explore Modules",
    exploreModulesSub: "Tap any module to dive deeper into analytics, pricing, and logistics",
    simulateHarvest: "Harvest Simulator",
    simulator: "Profit Projection",
    farmer: "Farmer Dashboard",
    prices: "Market Intelligence",
    demandPrediction: "Demand Prediction",
    demand: "Demand Heatmap",
    seasonalAnalytics: "Seasonal Trends",
    routePlanner: "Logistics Router",
    transport: "Transport Fleet",
    analytics: "Transit Analytics",
    optimizeTransport: "Fleet Optimizer",
    tracking: "Live Tracking",
    yieldAnalytics: "Yield Analytics",
    
    // Descriptions (Sub-text)
    harvestScenario: "Simulate yields & transport costs",
    profitProjectionSub: "Calc potential ROI per season",
    farmerDashDesc: "Track your active spice pipeline",
    priceResultDesc: "Real-time market price benchmarks",
    demandPredictionDesc: "AI-driven future demand forecasts",
    demandMapDesc: "Regional spice demand distribution",
    seasonalAnalyticsDesc: "Best times to harvest & sell",
    routePlannerDesc: "Optimized multi-stop delivery",
    transportDesc: "Manage available vehicle types",
    transportAnalyticsDesc: "Fuel Efficiency & Speed metrics",
    transportOptimizerDesc: "Load & Capacity optimization",
    transportTrackingDesc: "Real-time GPS cargo monitoring",
    yieldAnalyticsDesc: "Growth quality & soil metrics",

    // Dashboard
    farmerDashboard: "Farmer Dashboard",
    overviewTitle: "Your Spice Empire Overview",
    estimatedProfit: "Estimated Profit",
    activeOrders: "Active Pipeline",
    profitTrend: "Profit by Spice Type",
    demandMap: "Demand Distribution",
    activePipeline: "Active Pipeline",
    vsLastMonth: "vs last month",
    inTransit: "In Transit",
    delivered: "Delivered",
    harvested: "Harvested",
    profitBySpiceDesc: "Cumulative profit breakdown by spice type (LKR '000)",
    regionalDemandDesc: "Market demand percentage distribution across key regions",

    // Market / Prices
    livePrices: "Live Spice Prices",
    liveMarketAnalysis: "Live Market Analysis",
    marketVolatility: "Market Volatility",
    demandPressure: "Demand Pressure",
    priceMomentum: "Price Momentum",
    currentPriceIn: "Current Price in",
    today: "today",
    priceTrend: "Price Trend (24h)",
    selectRegion: "Select Region",
    marketIntelligence: "Market Intelligence",

    // Simulator / Order
    selectSpiceType: "1. Select Spice Type",
    harvestQuantity: "2. Harvest Quantity",
    selectLogistics: "3. Selection Logistics",
    orderSummary: "Order Summary",
    confirmOrder: "Confirm & Start Simulation",
    back: "Back",
    next: "Next",
    spice: "Spice",
    quantity: "Quantity",
    transportLabel: "Transport",
    orderConfirmedTitle: "Order Confirmed!",
    orderConfirmedDesc: "Thank you for ordering with us. Your harvest simulation has been recorded and added to your dashboard for tracking.",
    goToDashboard: "Go to Dashboard",

    // Regions
    colombo: "Colombo",
    kandy: "Kandy",
    matale: "Matale",
    kurunegala: "Kurunegala",
    dambulla: "Dambulla",
    other: "Other",

    // Spices
    cinnamon: "Cinnamon",
    pepper: "Pepper",
    cardamom: "Cardamom",
    clove: "Clove",
    nutmeg: "Nutmeg",
    
    // Units
    kg: "kg",
    currencySymbol: "LKR",

    // Tips
    tip1: "Sell when demand is high & supply is low for best prices",
    tip2: "Choose the right vehicle — bikes save cost for short distances",
    tip3: "Colombo & Kandy consistently offer the highest spice prices",
    tip4: "Monitor seasonal trends to time your harvest sales perfectly",
    modules: "Modules",
    regions: "Regions",
    spices: "Spices",
    profit: "Profit",
  },
  si: {
    // Ayubowan
    ayubowanFarmer: "ආයුබෝවන්, ගොවි මහතා",
    goodMorning: "සුබ උදෑසනක්",
    goodAfternoon: "සුබ දහවලක්",
    goodEvening: "සුබ සන්ධ්‍යාවක්",
    farmerTitle: "ගොවිමහතා",
    live: "සජීවී",
    welcome: "Smart Agri-Suite වෙත සාදරයෙන් පිළිගනිමු",
    welcomeDescription: "ශ්‍රී ලංකාවේ කුළුබඩු ගොවීන්ට ලාභය උපරිම කර ගැනීමට වෙළඳපල ඉල්ලුම, මිල ප්‍රවණතා සහ ප්‍රවාහන පිරිවැය විශ්ලේෂණය කරයි.",
    smartPricingBadge: "මිලකරණය සහ ප්‍රවාහනය",
    trending: "ප්‍රචලිත",
    startExploring: "පරීක්ෂා කිරීම ආරම්භ කරන්න",

    exploreModules: "අංශ ගවේෂණය කරන්න",
    exploreModulesSub: "විශ්ලේෂණ සහ මිලකරණ තොරතුරු බැලීමට ඕනෑම අංශයක් ස්පර්ශ කරන්න",
    simulateHarvest: "අස්වනු සිමියුලේටරය",
    simulator: "ලාභ පුරෝකථනය",
    farmer: "ගොවි පුවරුව",
    prices: "වෙළඳපල බුද්ධිය",
    demandPrediction: "ඉල්ලුම් පුරෝකථනය",
    demand: "ඉල්ලුම් සිතියම",
    seasonalAnalytics: "කාලීන ප්‍රවණතා",
    routePlanner: "ප්‍රවාහන මාර්ග",
    transport: "ප්‍රවාහන සේවා",
    analytics: "ගමන් විශ්ලේෂණය",
    optimizeTransport: "ප්‍රවාහන කළමනාකරණය",
    tracking: "සජීවී ලුහුබැඳීම",
    yieldAnalytics: "අස්වනු විශ්ලේෂණය",

    harvestScenario: "අස්වැන්න සහ ප්‍රවාහන පිරිවැය",
    profitProjectionSub: "සෑම කාලයකටම අදාළ ලාභය",
    farmerDashDesc: "ක්‍රියාකාරී කුළුබඩු නල මාර්ගය",
    priceResultDesc: "වෙළඳපල මිල මට්ටම්",
    demandPredictionDesc: "AI මගින් අනාගත ඉල්ලුම",
    demandMapDesc: "ප්‍රාදේශීය ඉල්ලුම බෙදා හැරීම",
    seasonalAnalyticsDesc: "අස්වනු නෙළීමට සුදුසුම කාලය",
    routePlannerDesc: "ප්‍රශස්ත ප්‍රවාහන මාර්ග",
    transportDesc: "පවතින වාහන වර්ග කළමනාකරණය",
    transportAnalyticsDesc: "ඉන්ධන සහ වේග දත්ත",
    transportOptimizerDesc: "ධාරිතාව උපරිම කිරීම",
    transportTrackingDesc: "සජීවී GPS නිරීක්ෂණය",
    yieldAnalyticsDesc: "අස්වැන්නේ ගුණාත්මකභාවය",

    farmerDashboard: "ගොවි උපකරණ පුවරුව",
    overviewTitle: "ඔබගේ ව්‍යාපාරික දළ විශ්ලේෂණය",
    estimatedProfit: "ඇස්තමේන්තුගත ලාභය",
    activeOrders: "ක්‍රියාකාරී ඇණවුම්",
    profitTrend: "කුළුබඩු වර්ගය අනුව ලාභය",
    demandMap: "ඉල්ලුම බෙදා හැරීම",
    activePipeline: "ක්‍රියාකාරී නල මාර්ගය",
    vsLastMonth: "පසුගිය මාසයට සාපේක්ෂව",
    inTransit: "ගමනේ යෙදේ",
    delivered: "භාර දෙන ලදී",
    harvested: "අස්වනු නෙළන ලද",
    profitBySpiceDesc: "කුළුබඩු වර්ගය අනුව ලාභය (රු. '000)",
    regionalDemandDesc: "ප්‍රධාන ප්‍රදේශ අනුව වෙළඳපල ඉල්ලුම ප්‍රතිශතය",

    livePrices: "සජීවී කුළුබඩු මිල",
    liveMarketAnalysis: "සජීවී වෙළඳපල විශ්ලේෂණය",
    marketVolatility: "වෙළඳපල විචලනය",
    demandPressure: "ඉල්ලුම් පීඩනය",
    priceMomentum: "මිල වේගය",
    currentPriceIn: "දැනට පවතින මිල",
    today: "අද",
    priceTrend: "මිල ප්‍රවණතාවය (පැය 24)",
    selectRegion: "ප්‍රදේශය තෝරන්න",
    marketIntelligence: "වෙළඳපල බුද්ධිය",

    selectSpiceType: "1. කුළුබඩු වර්ගය තෝරන්න",
    harvestQuantity: "2. අස්වනු ප්‍රමාණය",
    selectLogistics: "3. ප්‍රවාහන ක්‍රමය",
    orderSummary: "ඇණවුම් සාරාංශය",
    confirmOrder: "තහවුරු කර ආරම්භ කරන්න",
    back: "ආපසු",
    next: "මීළඟ",
    spice: "කුළුබඩු",
    quantity: "ප්‍රමාණය",
    transportLabel: "ප්‍රවාහනය",
    orderConfirmedTitle: "ඇණවුම තහවුරු කරන ලදී!",
    orderConfirmedDesc: "සෑම ඇණවුමක්ම අප සමඟ සිදු කිරීම ගැන ස්තූතියි. ඔබගේ දත්ත පුවරුවට එකතු කරන ලදී.",
    goToDashboard: "පුවරුවට යන්න",

    colombo: "කොළඹ",
    kandy: "මහනුවර",
    matale: "මාතලේ",
    kurunegala: "කුරුණෑගල",
    dambulla: "දඹුල්ල",
    other: "වෙනත්",

    cinnamon: "කුරුඳු",
    pepper: "ගම්මිරිස්",
    cardamom: "කරදමුංගු",
    clove: "කරාබුනැටි",
    nutmeg: "සාදික්කා",

    kg: "කි.ග්‍රෑ.",
    currencySymbol: "රු.",

    tip1: "ඉල්ලුම වැඩි විට සහ සැපයුම අඩු විට විකුණන්න",
    tip2: "නිවැරදි වාහනය තෝරාගන්න — යතුරුපැදි ලාභදායී වේ",
    tip3: "කොළඹ සහ මහනුවර වැඩිම මිලක් ලබා දෙයි",
    tip4: "කාලීන ප්‍රවණතා නිරීක්ෂණය කරන්න",
    modules: "අංශ",
    regions: "ප්‍රදේශ",
    spices: "කුළුබඩු",
    profit: "ලාභය",
  },
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return (translations[language] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
