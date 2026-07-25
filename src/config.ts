export const STORE_CONFIG = {
  name: "SMART SHOP",
  currency: "INR",
  symbol: "₹",
  payment_mode: "COD_ONLY", // Lock to COD
  
  // Product Default Settings (For single product template)
  product: {
    id: "PROD-SMARTWATCH-01",
    name: "Ultra Pro Smartwatch Series 9",
    description: "Premium smartwatch with AMOLED display, Bluetooth calling, and 7-day battery life. 1 Year Brand Warranty included.",
    price: 2999, // in INR
    variants: ["Midnight Black", "Starlight Silver", "Ocean Blue"],
  },

  // COD Specific Settings
  cod: {
    max_order_value: 500000, // Courier limits COD (INR 5000) stored in paise
    min_order_value: 29900, // INR 299 in paise
    verification_required: true,
    otp_provider: "truecaller", // Truecaller primary
    auto_cancel_hours: 24, // Cancel if not verified in 24h
  },
};
