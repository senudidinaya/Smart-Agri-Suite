export const en = {
  // Common
  welcome: "Welcome",
  back: "Back",
  save: "Save",
  cancel: "Cancel",
  loading: "Loading...",
  error: "Error",
  success: "Success",
  goBackRole: "Go back to Role Selector",

  // Role Selector
  roleTitle: "Select Your Portal",
  farmerRole: "Farmer Command",
  customerRole: "Customer Market",

  // Farmer Portal
  agriCommand: "Agri-Command",
  harvestStock: "Harvest Stock",
  inboundOrders: "Inbound Orders",
  hubLocation: "Hub Location",
  nearbyPartners: "Nearby Partners",
  modelPrice: "Trained Model Price",
  moistureLevel: "Moisture Content (%)",
  publishHarvest: "Publish Harvest",
  myHarvests: "My Harvests",
  globalFeed: "Global Feed",
  yieldPredictor: "Yield Predictor",
  regionalOpportunity: "Regional Opportunity Index",

  // Customer Portal
  marketplace: "Marketplace",
  sourcingFrom: "Sourcing from",
  searchVariety: "Search variety or name...",
  allSpices: "All Spices",
  addToCart: "Add to Cart",
  checkout: "Checkout",
  tracking: "Order Tracking",
  logisticsHub: "Logistics Hub",
  
  // Units
  kg: "kg",
  lkr: "LKR",
};

export type TranslationKey = keyof typeof en;
