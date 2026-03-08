// ─────────────────────────────────────────────────────────
// Dashboard Dummy Data & Types
// ─────────────────────────────────────────────────────────

// ── Constants from Dataset ──────────────────────────
export const SPICES = ['Cardamom', 'Cinnamon', 'Clove', 'Nutmeg', 'Pepper'];
export const REGIONS = ['Galle', 'Kandy', 'Kegalle', 'Kurunegala', 'Matale', 'Matara'];

// ── Color tokens inspired by UI reference ──────────
export const COLORS = {
  // Brand & Background
  background: '#f8f9fa',
  surface: '#ffffff',
  brandDark: '#0f172a', // Dark blue/gray for headers
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  
  // Greens
  primaryGreen: '#16a34a',
  darkGreen: '#166534',
  lightGreen: '#dcfce7',
  proTipBg: '#86efac', // Matches the "Pro Tip" card background
  proTipText: '#14532d',
  
  // Accents / Badges
  tealLight: '#ccfbf1',
  tealDark: '#0f766e',
  
  // Warning / Danger
  redLight: '#fee2e2',
  redDark: '#b91c1c',
  amberLight: '#fef3c7',
  amberDark: '#b45309',

  // Borders & UI elements
  border: '#e2e8f0',
  cardShadow: 'rgba(15, 23, 42, 0.05)',
  actionBg: '#f1f5f9', // Light gray for secondary action buttons
};

// ── Types ─────────────────────────────────────────────────
export interface StockPrediction {
  spice: string;
  region: string;
  availableStock: number;
  predictedNeed: number;
  gap: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  seasonalChange: number;
  festivalImpact: 'Low' | 'Medium' | 'High';
  recommendationPriority: 'Low' | 'Medium' | 'High';
  explanation: string;
  updatedAt: string;
}

export interface AlertItem {
  id: string;
  icon: string;
  title: string;
  message: string;
  severity: 'Low' | 'Medium' | 'High';
  timestamp: string;
}

export interface RecommendationItem {
  id: string;
  icon: string;
  title: string;
  message: string;
  actionLabel: string;
  priority: 'Low' | 'Medium' | 'High';
}

export interface HandlingStep {
  id: string;
  title: string;
  description: string;
  checked: boolean;
}

export interface InsightItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  tag: string;
}

export interface MonthlyTrend {
  month: string;
  demand: number;
  season: 'high' | 'low' | 'normal';
}

// ── Dummy data ────────────────────────────────────────────

export const stockPrediction: StockPrediction = {
  spice: 'Pepper',
  region: 'Matale',
  availableStock: 140,
  predictedNeed: 185,
  gap: -45,
  riskLevel: 'Medium',
  seasonalChange: -18,
  festivalImpact: 'Low',
  recommendationPriority: 'High',
  explanation:
    'Seasonal demand is expected to increase based on previous monthly patterns in this region.',
  updatedAt: 'Today • 2:45 PM',
};

export const monthlyTrends: MonthlyTrend[] = [
  { month: 'Jan', demand: 120, season: 'normal' },
  { month: 'Feb', demand: 110, season: 'low' },
  { month: 'Mar', demand: 95, season: 'low' },
  { month: 'Apr', demand: 130, season: 'normal' },
  { month: 'May', demand: 155, season: 'high' },
  { month: 'Jun', demand: 170, season: 'high' },
  { month: 'Jul', demand: 185, season: 'high' },
  { month: 'Aug', demand: 160, season: 'high' },
  { month: 'Sep', demand: 140, season: 'normal' },
  { month: 'Oct', demand: 120, season: 'normal' },
  { month: 'Nov', demand: 100, season: 'low' },
  { month: 'Dec', demand: 135, season: 'normal' },
];

export const alerts: AlertItem[] = [
  {
    id: 'a1',
    icon: '📦',
    title: 'Shortage Detected',
    message: 'A possible shortage of 45 kg has been detected for next month.',
    severity: 'High',
    timestamp: '2 hours ago',
  },
  {
    id: 'a2',
    icon: '📈',
    title: 'Seasonal Rise Expected',
    message: 'Demand may rise due to seasonal market behavior.',
    severity: 'Medium',
    timestamp: '5 hours ago',
  },
  {
    id: 'a3',
    icon: '📉',
    title: 'Off-Season Warning',
    message: 'Off-season movement may reduce outgoing stock volume.',
    severity: 'Low',
    timestamp: '1 day ago',
  },
];

export const recommendations: RecommendationItem[] = [
  {
    id: 'r1',
    icon: '✨',
    title: 'Careful Storage Needed',
    message: 'Seasonal demand is declining. Store your spice stock carefully to reduce spoilage.',
    actionLabel: 'Review Storage',
    priority: 'High',
  },
  {
    id: 'r2',
    icon: '🛑',
    title: 'Avoid Excess Harvesting',
    message: 'Avoid excess harvesting during this low-demand period.',
    actionLabel: 'Plan Harvest',
    priority: 'High',
  },
  {
    id: 'r3',
    icon: '📦',
    title: 'Batch Release Stock',
    message: 'Release stock in smaller batches instead of selling everything at once.',
    actionLabel: 'Organize Stock',
    priority: 'Medium',
  },
  {
    id: 'r4',
    icon: '🚛',
    title: 'Delay Transport',
    message: 'Delay large transport plans until the next higher-demand cycle.',
    actionLabel: 'Reschedule',
    priority: 'Low',
  },
];

export const handlingSteps: HandlingStep[] = [
  {
    id: 'h1',
    title: 'Store spices in a cool, dry place',
    description: 'Avoid direct sunlight and ground moisture.',
    checked: false,
  },
  {
    id: 'h2',
    title: 'Avoid moisture exposure',
    description: 'Use dehumidifiers if required in storage rooms.',
    checked: false,
  },
  {
    id: 'h3',
    title: 'Use sealed packaging',
    description: 'Improve packaging quality to protect stock during slower movement weeks.',
    checked: false,
  },
  {
    id: 'h4',
    title: 'Separate old and new stock',
    description: 'Maintain batches to manage shelf life effectively.',
    checked: false,
  },
];

export const insights: InsightItem[] = [
  {
    id: 'i1',
    icon: '💡',
    title: 'Why this was triggered',
    description: 'Recommendation generated because predicted movement for the coming month is below the usual range.',
    tag: 'Model Insight',
  },
  {
    id: 'i2',
    icon: '💡',
    title: 'Risk Factor',
    description: 'Seasonal slowdown increases the importance of storage quality. Current stock level is above projected movement.',
    tag: 'Storage Risk',
  },
];
// ── Marketplace Types ─────────────────────────────────────
export interface MarketStock {
  id: string;
  farmerName: string;
  spice: string;
  region: string;
  availableStock: number;
  image: string;
}

export interface CartItem extends MarketStock {
  selectedQuantity: number;
}

// ── Spice Image Mapping ──────────────────────────────
export const SPICE_IMAGES: Record<string, any> = {
  'Cardamom': null,
  'Cinnamon': null,
  'Clove': null,
  'Nutmeg': null,
  'Pepper': null,
};

// ── Initial Market Mock Data ───────────────────────
export const mockMarketData: MarketStock[] = [
  {
    id: 'm1',
    farmerName: 'Farmer A',
    spice: 'Pepper',
    region: 'Matale',
    availableStock: 140,
    image: 'Pepper',
  },
  {
    id: 'm2',
    farmerName: 'Farmer B',
    spice: 'Cinnamon',
    region: 'Galle',
    availableStock: 200,
    image: 'Cinnamon',
  },
  {
    id: 'm3',
    farmerName: 'Farmer C',
    spice: 'Clove',
    region: 'Kandy',
    availableStock: 85,
    image: 'Clove',
  },
  {
    id: 'm4',
    farmerName: 'Farmer D',
    spice: 'Nutmeg',
    region: 'Kurunegala',
    availableStock: 50,
    image: 'Nutmeg',
  },
  {
    id: 'm5',
    farmerName: 'Farmer E',
    spice: 'Cardamom',
    region: 'Matara',
    availableStock: 120,
    image: 'Cardamom',
  },
];
