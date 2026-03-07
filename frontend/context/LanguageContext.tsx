import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'si';

export const TRANSLATIONS: Record<string, Record<string, string>> = {
    en: {
        // AppHome
        "dash.title": "Smart Farmer Dashboard",
        "dash.growSmarter": "Grow smarter,",
        "dash.yieldBetter": "Yield better.",
        "dash.subtitle": "Use these tools to analyze your idle lands, predict crops, and understand the market.",
        "dash.upcoming": "Upcoming",
        "dash.online": "Online",
        "dash.launch": "Launch Module  →",
        "dash.logoutPrompt": "Are you sure you want to sign out?",
        "dash.logout": "Sign Out",
        "dash.cancel": "Cancel",
        "dash.notifications": "Notifications",
        "dash.hello": "👋",

        // Modules
        "mod.idleLand.title": "Idle Land Mobilization",
        "mod.idleLand.sub": "Identify & optimize unused land parcels using GEE & AI-driven analytics",
        "mod.buyerIntent.title": "Buyer Intent Analysis",
        "mod.buyerIntent.sub": "Predict market demand and match buyers with agricultural opportunities",
        "mod.cropRec.title": "Crop Recommendation",
        "mod.cropRec.sub": "AI-based insights for maximum yield and optimal resource usage",
        "mod.supplyChain.title": "Supply Chain & Market",
        "mod.supplyChain.sub": "Forecast pricing and manage logistics for agricultural outputs",

        // Common
        "common.loading": "Loading...",
        "common.retrying": "Retrying...",
        "common.backToHub": "Back to Hub",

        // Overview
        "ov.heroTitle": "🌱 Spice Cultivation Optimization",
        "ov.heroSub": "Through Idle Land Mobilization",
        "ov.heroDesc": "Understand your land condition and get simple farming guidance using satellite data. Tap a location on the map to analyze its potential for spice cultivation.",
        "ov.whatAppDo": "What can this app help you with?",
        "ov.f1.title": "Check land type",
        "ov.f1.desc": "Vegetation / Idle / Built-up",
        "ov.f2.title": "Water & vegetation",
        "ov.f2.desc": "Health indicators",
        "ov.f3.title": "Crop suitability",
        "ov.f3.desc": "Which spices fit best",
        "ov.f4.title": "Intercropping advice",
        "ov.f4.desc": "Grow multiple crops",
        "ov.studyArea": "Study Area",
        "ov.studyDesc1": "This analysis covers land inside the ",
        "ov.studyDescBlue": "blue AOI boundary (Malabe area)",
        "ov.studyDesc2": "Satellite imagery is used to assess land conditions and potential.",
        "ov.studyTip": "💡 Higher resolution data helps us understand terrain, vegetation health, and moisture levels.",
        "ov.howToUse": "How to use this app",
        "ov.step1.title": "Go to Map",
        "ov.step1.desc": "Tap the Map tab at the bottom",
        "ov.step2.title": "Select a location",
        "ov.step2.desc": "Tap inside the blue AOI boundary",
        "ov.step3.title": "View analytics",
        "ov.step3.desc": "Get land health & crop recommendations",
        "ov.helperText": "✓ No technical knowledge needed. Tap and explore!",
        "ov.colors": "Color meanings",
        "ov.color1": "Green (Good)",
        "ov.color1Desc": "Good for farming • Healthy conditions",
        "ov.color2": "Amber (Moderate)",
        "ov.color2Desc": "Needs care • With management possible",
        "ov.color3": "Red (Poor)",
        "ov.color3Desc": "Improvement needed • Plan ahead",
        "ov.colorTip": "💡 Colors appear in charts, scores, and status indicators to help you quickly understand land conditions.",
        "ov.whoCanUse": "Who can use this app?",
        "ov.user1": "Farmers & Landowners",
        "ov.user2": "Agriculture Officers",
        "ov.user3": "Students & Researchers",
        "ov.user4": "Environmental Planners",
        "ov.userNote": "This tool is designed for anyone interested in understanding land potential for agricultural use.",
        "ov.keyFeatures": "Key features",
        "ov.kf1.title": "Satellite Analytics",
        "ov.kf1.desc": "Real-time vegetation, moisture & terrain data",
        "ov.kf2.title": "ML Model",
        "ov.kf2.desc": "Predicts land type: Vegetation, Idle, or Built-up",
        "ov.kf3.title": "Spice Scoring",
        "ov.kf3.desc": "Personalized suitability for Cinnamon, Pepper, Clove & Cardamom",
        "ov.kf4.title": "Intercropping",
        "ov.kf4.desc": "Smart recommendations for growing multiple crops together",
        "ov.kf5.title": "Farmer-Friendly",
        "ov.kf5.desc": "Simple language & practical guidance, no jargon",
        "ov.tips": "Tips for best results",
        "ov.tip1": "Tap multiple points across your land to see variations",
        "ov.tip2": "Zoom in for more detailed analysis in specific areas",
        "ov.tip3": "Check satellite view for visual context",
        "ov.tip4": "Compare scores with field observations",
        "ov.tip5": "Use recommendations as a starting point for planning",
        "ov.tipsFooter": "Remember: Satellite analysis is a tool to help planning, not a replacement for field knowledge and local expertise.",
        "ov.cta": "🗺️ Open Map & Analyze",
        "ov.footerTip": "🌍 Tip: Tap anywhere inside the blue boundary on the map to start analyzing land!",
    },
    si: {
        // AppHome
        "dash.title": "ස්මාර්ට් ගොවි දත්ත පුවරුව",
        "dash.growSmarter": "බුද්ධිමත්ව වවන්න,",
        "dash.yieldBetter": "හොඳ අස්වැන්නක් ලබාගන්න.",
        "dash.subtitle": "ඔබගේ හිස් ඉඩම් විශ්ලේෂණය කිරීමට, භෝග පුරෝකථනය කිරීමට සහ වෙළඳපොළ තේරුම් ගැනීමට මෙම මෙවලම් භාවිතා කරන්න.",
        "dash.upcoming": "ඉදිරියට",
        "dash.online": "සක්‍රීයයි",
        "dash.launch": "ආරම්භ කරන්න →",
        "dash.logoutPrompt": "ඔබට නිසැකවම ඉවත් වීමට අවශ්‍යද?",
        "dash.logout": "ඉවත් වන්න",
        "dash.cancel": "අවලංගු කරන්න",
        "dash.notifications": "දැනුම්දීම්",
        "dash.hello": "ආයුබෝවන්",

        // Modules
        "mod.idleLand.title": "හිස් ඉඩම් බල ගැන්වීම",
        "mod.idleLand.sub": "GEE සහ AI දත්ත විශ්ලේෂණ හරහා භාවිතයට නොගත් ඉඩම් හඳුනාගැනීම සහ ප්‍රශස්ත කිරීම",
        "mod.buyerIntent.title": "ගැනුම්කරුවන්ගේ නැඹුරුව විශ්ලේෂණය",
        "mod.buyerIntent.sub": "වෙළඳපොළ ඉල්ලුම පුරෝකථනය කර ගැනුම්කරුවන් කෘෂිකාර්මික අවස්ථා සමඟ ගලපන්න",
        "mod.cropRec.title": "භෝග නිර්දේශය",
        "mod.cropRec.sub": "උපරිම අස්වැන්න සහ සම්පත් භාවිතය සඳහා AI මගින් ලබා දෙන උපදෙස්",
        "mod.supplyChain.title": "සැපයුම් දාමය සහ වෙළඳපොළ",
        "mod.supplyChain.sub": "කෘෂිකාර්මික නිෂ්පාදන සඳහා මිල පුරෝකථනය කර ප්‍රවාහනය කළමනාකරණය කරන්න",

        // Common
        "common.loading": "පූරණය වෙමින්...",
        "common.retrying": "නැවත උත්සාහ කරමින්...",
        "common.backToHub": "ආපසු මුල් පිටුවට",

        // Overview
        "ov.heroTitle": "🌱 කුළුබඩු වගා ප්‍රශස්ත කිරීම",
        "ov.heroSub": "හිස් ඉඩම් බල ගැන්වීම හරහා",
        "ov.heroDesc": "ඔබේ ඉඩමේ තත්ත්වය අවබෝධ කරගෙන චන්ද්‍රිකා දත්ත භාවිතයෙන් සරල ගොවිතැන් මාර්ගෝපදේශ ලබා ගන්න. කුළුබඩු වගාව සඳහා එහි ඇති හැකියාව විශ්ලේෂණය කිරීමට සිතියමේ ස්ථානයක් ස්පර්ශ කරන්න.",
        "ov.whatAppDo": "මෙම යෙදුම ඔබට කුමක් සඳහා උදව් කරයිද?",
        "ov.f1.title": "ඉඩම් වර්ගය පරීක්ෂා කිරීම",
        "ov.f1.desc": "වෘක්ෂලතාදිය / හිස්බිම් / ගොඩනැගිලි ආවරණය",
        "ov.f2.title": "ජලය සහ ශාක වර්ධනය",
        "ov.f2.desc": "ඉඩමේ සෞඛ්‍ය දර්ශක",
        "ov.f3.title": "භෝග යෝග්‍යතාවය",
        "ov.f3.desc": "වඩාත් ගැලපෙන කුළුබඩු වර්ග මොනවාදැයි බැලීම",
        "ov.f4.title": "අන්තර් භෝග උපදෙස්",
        "ov.f4.desc": "භෝග කිහිපයක් එකට වගා කිරීම",
        "ov.studyArea": "අධ්‍යයන ප්‍රදේශය (Study Area)",
        "ov.studyDesc1": "මෙම විශ්ලේෂණය ආවරණය කරන්නේ ",
        "ov.studyDescBlue": "නිල් පැහැති මායිම් රේඛාව (මාලඹේ ප්‍රදේශය)",
        "ov.studyDesc2": " ඇතුළත ඉඩම් සඳහාය. ඉඩම් වල තත්ත්වය සහ විභවය තක්සේරු කිරීමට චන්ද්‍රිකා ඡායාරූප භාවිතා වේ.",
        "ov.studyTip": "💡 ඉහළ ගුණාත්මක දත්ත මගින් භූමි ලක්ෂණ, ශාක සෞඛ්‍යය, සහ තෙතමනය මට්ටම් අවබෝධ කර ගැනීමට උපකාරී වේ.",
        "ov.howToUse": "යෙදුම (App) භාවිතා කරන්නේ කෙසේද?",
        "ov.step1.title": "සිතියමට යන්න",
        "ov.step1.desc": "පහත Map අංශය ස්පර්ශ කරන්න",
        "ov.step2.title": "ස්ථානයක් තෝරන්න",
        "ov.step2.desc": "නිල් පැහැති මායිමට ඇතුළත ස්පර්ශ කරන්න",
        "ov.step3.title": "විශ්ලේෂණය බලන්න",
        "ov.step3.desc": "භූමියේ සෞඛ්‍යය සහ වගා නිර්දේශ ලබා ගන්න",
        "ov.helperText": "✓ භාවිතයට තාක්ෂණික දැනුමක් අවශ්‍ය නොවේ. ස්පර්ශ කර ගවේෂණය කරන්න!",
        "ov.colors": "වර්ණ වල තේරුම",
        "ov.color1": "කොළ පැහැය (හොඳයි)",
        "ov.color1Desc": "වගාව සඳහා සුදුසුයි • යහපත් තත්ත්වයන්",
        "ov.color2": "කහ පැහැය (මධ්‍යම)",
        "ov.color2Desc": "රැකබලා ගැනීම අවශ්‍යයි • නිසි කළමනාකරණයෙන් වගා කළ හැකිය",
        "ov.color3": "රතු පැහැය (දුර්වල)",
        "ov.color3Desc": "වැඩිදියුණු කළ යුතුයි • සැලසුම්කර වැඩ කරන්න",
        "ov.colorTip": "💡 ඉඩමේ තත්ත්වය කඩිනමින් අවබෝධ කරගැනීමට උදව් වන පරිදි වර්ණ සටහන් වල දක්වා ඇත.",
        "ov.whoCanUse": "මෙය භාවිත කළ හැක්කේ කාටද?",
        "ov.user1": "ගොවීන් සහ ඉඩම් හිමියන්",
        "ov.user2": "කෘෂිකර්ම නිලධාරීන්",
        "ov.user3": "සිසුන් සහ පර්යේෂකයන්",
        "ov.user4": "පරිසර සැලසුම්කරුවන්",
        "ov.userNote": "මෙම මෙවලම භූමි විශ්ලේෂණය කෙරෙහි උනන්දුවක් දක්වන ඕනෑම කෙනෙකුට භාවිතා කිරීමට හැකි පරිදි නිර්මාණය කර ඇත.",
        "ov.keyFeatures": "ප්‍රධාන ලක්ෂණ",
        "ov.kf1.title": "චන්ද්‍රිකා දත්ත",
        "ov.kf1.desc": "තත්‍ය කාලීන ශාක, තෙතමනය සහ භූ දත්ත",
        "ov.kf2.title": "ML ආකෘතිය",
        "ov.kf2.desc": "ශාක සහිතද, හිස් බිමක්ද, ගොඩනැගිලි සහිතද යන්න පුරෝකථනය කරයි.",
        "ov.kf3.title": "කුළුබඩු වර්ගීකරණය",
        "ov.kf3.desc": "කුරුඳු, ගම්මිරිස්, කරාබුනැටි සහ එනසාල් සඳහා පුද්ගලික යෝග්‍යතාවය",
        "ov.kf4.title": "අන්තර් වගාව (Intercropping)",
        "ov.kf4.desc": "බහු භෝග වගාවට අදාළ ස්මාර්ට් නිර්දේශ",
        "ov.kf5.title": "ගොවි මිතුරු (Farmer-Friendly)",
        "ov.kf5.desc": "අවබෝධ කරගැනීමට පහසු සරල භාෂාව",
        "ov.tips": "හොඳ ප්‍රතිඵල සඳහා උපදෙස්",
        "ov.tip1": "වෙනස්කම් බැලීමට ඉඩම පුරා විවිධ ලක්ෂ්‍ය ස්පර්ශ කරන්න.",
        "ov.tip2": "විශේෂිත ප්‍රදේශ පිළිබඳ විස්තරාත්මකව බැලීම සඳහා 'Zoom in' කරන්න.",
        "ov.tip3": "වඩාත් පැහැදිලි දැක්මක් සඳහා චන්ද්‍රිකා ඡායාරූප (satellite view) බලන්න.",
        "ov.tip4": "සිතියමේ ඇති දත්ත ක්ෂේත්‍රයේ ඇති දත්ත සමඟ සසඳා බලන්න.",
        "ov.tip5": "වගා සැලසුම් කිරීමේදී නිර්දේශ ආරම්භක ලක්ෂ්‍යයක් ලෙස පාවිච්චි කරන්න.",
        "ov.tipsFooter": "සැලකිය යුතුයි: චන්ද්‍රිකා විශ්ලේෂණය යනු සැලසුම්කිරීමට උපකාරී වන මෙවලමක් මිස, ඔබේ ක්ෂේත්‍ර දැනුම සහ ප්‍රායෝගික පළපුරුද්ද සඳහා වූ ආදේශකයක් නොවේ.",
        "ov.cta": "🗺️ සිතියම (Map) වෙත ගොස් පරීක්ෂා කරන්න",
        "ov.footerTip": "🌍 විස්තර: භූමිය විශ්ලේෂණය කිරීම ආරම්භ කිරීමට සිතියමේ නිල් පැහැති රේඛාව ඇතුළත ඕනෑම තැනක ස්පර්ශ කරන්න!"
    }
};

interface LanguageContextProps {
    language: Language;
    toggleLanguage: () => void;
    langConfig: Record<string, string>;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        AsyncStorage.getItem('appLanguage').then(storedLang => {
            if (storedLang === 'en' || storedLang === 'si') {
                setLanguage(storedLang);
            }
        });
    }, []);

    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'si' : 'en';
        setLanguage(newLang);
        AsyncStorage.setItem('appLanguage', newLang);
    };

    const langConfig = TRANSLATIONS[language];
    const t = (key: string) => langConfig[key] || key;

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, langConfig, t }}>
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
