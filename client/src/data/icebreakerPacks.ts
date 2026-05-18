export type Tone = "flirty" | "subtle" | "neutral";

export type PackQuestion = {
  purpose: "vibe_check" | "personality_signal" | "action_bridge";
  question: string;
  options: Record<Tone, string>;
};

export type Pack = {
  id: string;
  venueType: string;
  roundTitle: string;
  questions: [PackQuestion, PackQuestion, PackQuestion];
  openers: Record<Tone, string>;
};

export const PACKS: Pack[] = [
  {
    id: "blr_rooftop_1",
    venueType: "rooftop bar",
    roundTitle: "Rooftop Mood Check",
    questions: [
      {
        purpose: "vibe_check",
        question: "Friday rooftop energy tonight?",
        options: {
          flirty: "Soft sparkle ✨",
          subtle: "Easy breeze 🌬️",
          neutral: "Just unwinding 🍹",
        },
      },
      {
        purpose: "personality_signal",
        question: "Your ideal corner at a rooftop bar is…",
        options: {
          flirty: "Near the skyline 🌆",
          subtle: "By the plants 🌿",
          neutral: "Where it's calm 🪑",
        },
      },
      {
        purpose: "action_bridge",
        question: "If the chat feels good, what's a nice next step?",
        options: {
          flirty: "Share a playlist pick 🎶",
          subtle: "Swap one venue tip 📍",
          neutral: "Keep chatting here 💬",
        },
      },
    ],
    openers: {
      flirty: "Soft sparkle and a skyline corner — classy Friday combo. What's the first track on that playlist?",
      subtle: "Easy breeze + the plants corner sounds like the right pace tonight. Got a venue tip I should steal?",
      neutral: "Unwinding here works. Best non-cliché thing to order at a Bangalore rooftop?",
    },
  },
  {
    id: "blr_brewery_1",
    venueType: "brewery",
    roundTitle: "Brewery Table Personality Test",
    questions: [
      {
        purpose: "vibe_check",
        question: "Pick your table vibe tonight:",
        options: {
          flirty: "Laughing a little too loudly 😄",
          subtle: "Warm, witty, unhurried 🍺",
          neutral: "Good food, good seat 🍕",
        },
      },
      {
        purpose: "personality_signal",
        question: "Your Friday-night brewery trait is:",
        options: {
          flirty: "Can make any pour sound poetic 🎤",
          subtle: "Knows a great hidden tap 🔎",
          neutral: "Always checks closing time 🕘",
        },
      },
      {
        purpose: "action_bridge",
        question: "Best next chat topic?",
        options: {
          flirty: "Our most dramatic food opinions 🌶️",
          subtle: "Best breweries in town 🍻",
          neutral: "Weekend plans, no pressure 🙂",
        },
      },
    ],
    openers: {
      flirty: "Dramatic food opinions, ranked: pineapple on pizza — innocent or felony?",
      subtle: "Hidden tap knowledge is premium. What kind of place earns your approval?",
      neutral: "Checking closing time is responsible energy. Respect — what's on your weekend?",
    },
  },
  {
    id: "blr_club_1",
    venueType: "club",
    roundTitle: "Subtle Signals",
    questions: [
      {
        purpose: "vibe_check",
        question: "Tonight feels like…",
        options: {
          flirty: "A tiny plot twist 🌀",
          subtle: "A relaxed evening 🌙",
          neutral: "Just here for the music 🎧",
        },
      },
      {
        purpose: "personality_signal",
        question: "Your club personality is usually:",
        options: {
          flirty: "Front row, full energy 💃",
          subtle: "Edge of the floor, watching 👀",
          neutral: "Wherever the speakers sound best 🔊",
        },
      },
      {
        purpose: "action_bridge",
        question: "What's a nice low-pressure next step?",
        options: {
          flirty: "Trade song requests 🎵",
          subtle: "One question each, slow 🐢",
          neutral: "No rush, keep chatting 💬",
        },
      },
    ],
    openers: {
      flirty: "Plot twist + front row = trouble in the best way. What's the one track you'd request right now?",
      subtle: "Edge of the floor people see the best things. What caught your eye tonight?",
      neutral: "Speakers-first energy, fair. Best set you've heard at a Bangalore club?",
    },
  },
  {
    id: "blr_cafe_1",
    venueType: "cafe",
    roundTitle: "Quiet Cafe Energy",
    questions: [
      {
        purpose: "vibe_check",
        question: "Your ideal cafe corner today?",
        options: {
          flirty: "Near the best view 🌇",
          subtle: "By the window, book-friendly 📖",
          neutral: "Wherever's quiet 🤫",
        },
      },
      {
        purpose: "personality_signal",
        question: "Your cafe order says you're a…",
        options: {
          flirty: "Strong coffee, stronger opinions ☕",
          subtle: "Slow filter, slow weekend 🌿",
          neutral: "Whatever the barista recs 🤷",
        },
      },
      {
        purpose: "action_bridge",
        question: "If this chat is easy, what next?",
        options: {
          flirty: "Swap our weirdest cafe orders 🥐",
          subtle: "Share a comfort read 📚",
          neutral: "Just keep it going here 💬",
        },
      },
    ],
    openers: {
      flirty: "Best view + stronger opinions = I want to hear the weirdest order story you've got.",
      subtle: "Window seat, slow filter, comfort read — what's the book on the nightstand?",
      neutral: "Quiet + barista's pick is a safe bet. Favourite Bangalore cafe so far?",
    },
  },
];

export function pickPackForMatch(matchId: string | number, venueHint?: string): Pack {
  if (venueHint) {
    const v = venueHint.toLowerCase();
    const byVenue = PACKS.find((p) => v.includes(p.venueType.split(" ")[0]));
    if (byVenue) return byVenue;
  }
  const key = String(matchId);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PACKS[hash % PACKS.length];
}

export const TONE_COLOR: Record<Tone, string> = {
  flirty: "#FF1B8D",
  subtle: "#00CFFF",
  neutral: "#8A8FA8",
};

export const TONE_LABEL: Record<Tone, string> = {
  flirty: "Flirty",
  subtle: "Subtle",
  neutral: "Neutral",
};

export const TONES: Tone[] = ["flirty", "subtle", "neutral"];
