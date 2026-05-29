export type ShopCategory = "cubes" | "godmode" | "season";

export interface ShopItem {
  sku: string;
  category: ShopCategory;
  name: string;
  tagline: string;
  priceInPaise: number;
  originalPriceInPaise?: number;
  cubes?: number;
  bonusCubes?: number;
  durationDays?: number;
  badge?: string;
  perks?: string[];
  popular?: boolean;
  bestValue?: boolean;
}

export const SHOP_CATALOG: Record<string, ShopItem> = {
  cubes_100: {
    sku: "cubes_100", category: "cubes", name: "Starter Pack",
    tagline: "Try a few drinks on the house", priceInPaise: 9900, cubes: 100,
  },
  cubes_500: {
    sku: "cubes_500", category: "cubes", name: "Party Pack",
    tagline: "Most chosen by night owls", priceInPaise: 39900, cubes: 500, bonusCubes: 50,
    badge: "+50 bonus", popular: true,
  },
  cubes_1200: {
    sku: "cubes_1200", category: "cubes", name: "VIP Pack",
    tagline: "Treat your whole crew", priceInPaise: 79900, cubes: 1200, bonusCubes: 200,
    badge: "+200 bonus", bestValue: true,
  },
  cubes_3000: {
    sku: "cubes_3000", category: "cubes", name: "Whale Pack",
    tagline: "Months of premium nights", priceInPaise: 179900, cubes: 3000, bonusCubes: 700,
    badge: "+700 bonus",
  },

  godmode_monthly: {
    sku: "godmode_monthly", category: "godmode", name: "Monthly",
    tagline: "Try God Mode for a month", priceInPaise: 49900, durationDays: 30,
    perks: ["Unlimited swipes", "See who likes you", "Premium rooms", "2x Cubes earning", "Boost once a week"],
  },
  godmode_quarterly: {
    sku: "godmode_quarterly", category: "godmode", name: "3 Months",
    tagline: "₹433/month — save 13%", priceInPaise: 129900, originalPriceInPaise: 149700, durationDays: 90,
    perks: ["Everything in Monthly", "Priority verification", "3 Boosts /month", "Hidden mode"],
    popular: true,
  },
  godmode_yearly: {
    sku: "godmode_yearly", category: "godmode", name: "Annual",
    tagline: "₹333/month — save 33%", priceInPaise: 399900, originalPriceInPaise: 598800, durationDays: 365,
    perks: ["Everything in 3 Months", "Annual member badge", "Exclusive event invites", "Concierge support"],
    bestValue: true, badge: "SAVE 33%",
  },

  season_pass: {
    sku: "season_pass", category: "season", name: "Season Pass",
    tagline: "Unlock the full Season 1 rewards track", priceInPaise: 29900,
    perks: ["Premium quests track", "2x Cube rewards on quests", "Exclusive Monsoon Nights badge", "Season-end bonus"],
    bestValue: true,
  },
};

export const CUBE_SKUS = ["cubes_100", "cubes_500", "cubes_1200", "cubes_3000"];
export const GODMODE_SKUS = ["godmode_monthly", "godmode_quarterly", "godmode_yearly"];
export const SEASON_SKU = "season_pass";

export const formatINR = (paise: number) =>
  `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export const formatINRDecimal = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
