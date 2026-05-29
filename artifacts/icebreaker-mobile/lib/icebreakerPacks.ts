export type Tone = "flirty" | "subtle" | "neutral";
export type ToneMap = Record<Tone, string>;

export type Pack = {
  id: string;
  round_title: string;
  venue_type: string;
  screen_prompt: string;
  turn1_options: ToneMap;
  turn2_options: Record<Tone, ToneMap>;
  turn3_options: Record<Tone, ToneMap>;
};

export const TONES: Tone[] = ["flirty", "subtle", "neutral"];

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

export const TONE_EMOJI: Record<Tone, string> = {
  flirty: "💗",
  subtle: "✨",
  neutral: "😊",
};

export const PACKS: Pack[] = [
  {
    id: "blr_rooftop_v2",
    round_title: "Rooftop Mood Check",
    venue_type: "rooftop bar",
    screen_prompt: "It's a Bangalore rooftop night. How's your Friday going?",
    turn1_options: {
      flirty: "Pretending I'm in a music video up here — what's setting your mood tonight?",
      subtle: "Slow start, good breeze, no rush. What brought you up here tonight?",
      neutral: "Just dropped in to unwind. Is this your usual rooftop spot?",
    },
    turn2_options: {
      flirty: {
        flirty: "Definitely the skyline plus a song I'd never admit to liking. What's yours?",
        subtle: "Honestly, it's the cool air and a good corner. What corner do you usually claim?",
        neutral: "The view does most of the work. Have you tried their drinks menu?",
      },
      subtle: {
        flirty: "Needed a reset and the views never disappoint. What's been your highlight of the week?",
        subtle: "A friend recommended it and the breeze sold me. What's your go-to chill spot in town?",
        neutral: "Just wanted somewhere quiet after work. What do you usually order here?",
      },
      neutral: {
        flirty: "First time, but already plotting my next visit. What should I not miss here?",
        subtle: "Used to come more often, less these days. Are you a regular?",
        neutral: "Been a few times, it's reliable. Any other rooftops you'd recommend?",
      },
    },
    turn3_options: {
      flirty: {
        flirty: "Sold. Trade playlists right here, right now.",
        subtle: "Cool — let's keep this rooftop chat going for a bit.",
        neutral: "Noted. Maybe a wave from across the deck if our paths cross tonight.",
      },
      subtle: {
        flirty: "Comfort show + corner spot intel — you're winning. Let's keep chatting.",
        subtle: "Good answer. Happy to keep this slow and easy in the app for now.",
        neutral: "Sounds like a plan. No rush — say hi at the bar if it feels right.",
      },
      neutral: {
        flirty: "Then I'm trusting your menu picks. Send me the must-try.",
        subtle: "Will check it out. Easy chat here works for me.",
        neutral: "Cool, will keep that in mind. Catch you in the Icebreaker Zone if it makes sense.",
      },
    },
  },
  {
    id: "blr_brewery_v2",
    round_title: "Brewery Table Read",
    venue_type: "brewery",
    screen_prompt: "Brewery night — what kind of table are you running tonight?",
    turn1_options: {
      flirty: "The kind where the food opinions get a little too passionate. Care to weigh in?",
      subtle: "A quiet corner, slow pour, good company kind of table. What's your table style?",
      neutral: "Honestly just here for a solid pour and a seat. First time at this place?",
    },
    turn2_options: {
      flirty: {
        flirty: "Bring it — what's the most controversial menu take you've defended this year?",
        subtle: "Always down for spirited food debate. What's a dish you'd order every time here?",
        neutral: "Strong opinions are welcome. What do you usually go for at a brewery?",
      },
      subtle: {
        flirty: "Slow pour table is elite energy. What's your favourite brew here so far?",
        subtle: "That's basically my whole evening plan. Any breweries you keep coming back to?",
        neutral: "Same energy. What got you out tonight — anything specific?",
      },
      neutral: {
        flirty: "Second visit and already obsessed with one of their pours. You into hoppy or smooth?",
        subtle: "First time too — going off vibes. What's caught your eye on the menu?",
        neutral: "Been a few times. The pizza's underrated. What are you ordering?",
      },
    },
    turn3_options: {
      flirty: {
        flirty: "Then settle this: pineapple on pizza — innocent or felony? Reply quick.",
        subtle: "Okay, I want to hear your top pick — message me your order, I'll trust it.",
        neutral: "Solid. Maybe a brewery rec swap when we're both back online?",
      },
      subtle: {
        flirty: "Adding it to my list. Tell me one more spot you'd actually return to.",
        subtle: "Nice — let's keep this thread going for a bit, no rush.",
        neutral: "Cool. Happy to compare notes here whenever you're around.",
      },
      neutral: {
        flirty: "Going to test that recommendation tonight. Wave if you see me ordering it.",
        subtle: "Will try it. Easy chat here suits me fine.",
        neutral: "Appreciate it — let's keep it casual in the app.",
      },
    },
  },
  {
    id: "blr_cafe_v2",
    round_title: "Quiet Cafe Energy",
    venue_type: "cafe",
    screen_prompt: "Cafe afternoon — what kind of mood did you walk in with?",
    turn1_options: {
      flirty: "Caffeine first, charm second — what brought you in today?",
      subtle: "Needed a window seat and a slow filter. What about you?",
      neutral: "Just on a reset break. Do you come here often?",
    },
    turn2_options: {
      flirty: {
        flirty: "Charm requires a third coffee. What's the strongest opinion on your tab today?",
        subtle: "Coffee first sounds like a healthy plan. What's your go-to order here?",
        neutral: "Same logic, honestly. Do you have a usual at this place?",
      },
      subtle: {
        flirty: "Window seat energy is rare and welcome. What's the book in your bag, if any?",
        subtle: "Came in for the same — quiet table, slow brew. What's the read of the week?",
        neutral: "That's a good setup. What do you usually do here — work or unwind?",
      },
      neutral: {
        flirty: "First time and already eyeing the dessert menu. What should I try?",
        subtle: "A regular when the week gets heavy. What gets you in here?",
        neutral: "Drop by sometimes. The cold coffee is reliably good. You tried it?",
      },
    },
    turn3_options: {
      flirty: {
        flirty: "Cold coffee — dessert or drink? Defend your answer.",
        subtle: "I'll bite — recommend me one strong opinion of yours, I'll consider it.",
        neutral: "Fair. Easy cafe chat works — happy to compare orders here.",
      },
      subtle: {
        flirty: "Adding it to my reading list. What's another comfort thing on your shelf?",
        subtle: "Sounds like my Sunday. Let's keep this chat slow and steady.",
        neutral: "Will check it out. No pressure — chat here whenever you're around.",
      },
      neutral: {
        flirty: "Then I trust the recommendation. Tell me when you're back so I can review.",
        subtle: "Will try it next time. Easy in-app chat suits me.",
        neutral: "Appreciated. Catch you here whenever it makes sense.",
      },
    },
  },
];

export function getPackById(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}

export function pickPackForMatch(matchId: string | number, venueHint?: string): Pack {
  if (venueHint) {
    const v = venueHint.toLowerCase();
    const byVenue = PACKS.find((p) => v.includes(p.venue_type.split(" ")[0]));
    if (byVenue) return byVenue;
  }
  const key = String(matchId);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PACKS[hash % PACKS.length];
}

export function pickOtherTone(matchId: string | number, turnIdx: number, yourTone: Tone): Tone {
  const key = `${matchId}-t${turnIdx}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  if (h % 10 < 6) return yourTone;
  return TONES[(TONES.indexOf(yourTone) + 1) % TONES.length];
}
