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
  // Turns 4-6 continue the exchange so each person sends three messages total.
  // Optional per-pack overrides; when omitted the shared CONTINUATION_* below is
  // used. Each branches on the immediately-preceding turn's tone, like turn 2/3.
  turn4_options?: Record<Tone, ToneMap>;
  turn5_options?: Record<Tone, ToneMap>;
  turn6_options?: Record<Tone, ToneMap>;
};

export const TONES: Tone[] = ["flirty", "subtle", "neutral"];

// A full icebreaker is 6 alternating turns: initiator plays 1/3/5, the other
// player plays 2/4/6 — three messages each. Chat unlocks after turn 6.
export const TOTAL_TURNS = 6;

// Shared continuation for turns 4-6. By turn 4 the chat has moved past venue
// specifics, so this content is venue-agnostic and reused across every pack.
// Turn 4 = other player, Turn 5 = initiator, Turn 6 = other player (closing).
export const CONTINUATION_TURN4: Record<Tone, ToneMap> = {
  flirty: {
    flirty: "Bold — I like it. So what's your go-to way to make a regular night actually fun?",
    subtle: "Okay, you've got my attention. What's something you're weirdly good at?",
    neutral: "Ha, fair enough. What's been the best part of your week so far?",
  },
  subtle: {
    flirty: "Smooth. Tell me one thing about you nobody here would guess.",
    subtle: "I'm into the slow lane too. What's been keeping you busy lately?",
    neutral: "Sounds good. Are you a plan-the-night type or see-where-it-goes?",
  },
  neutral: {
    flirty: "Cute. If tonight had a theme song, what's yours?",
    subtle: "Noted. What's something you've been meaning to get back into?",
    neutral: "Cool. Is going out a regular thing for you or a one-off tonight?",
  },
};
export const CONTINUATION_TURN5: Record<Tone, ToneMap> = {
  flirty: {
    flirty: "Easy — I peak at karaoke nobody asked for. Your turn: hidden talent, go.",
    subtle: "Probably overthinking playlists. What's yours, since you started this?",
    neutral: "Honestly just good food and better company. What's your kind of good night?",
  },
  subtle: {
    flirty: "Lately it's late drives and slightly worse decisions. You in or out on that?",
    subtle: "Mostly work and the occasional night like this. What about you?",
    neutral: "A bit of everything. What do you do with an actually free evening?",
  },
  neutral: {
    flirty: "See-where-it-goes, clearly — I'm still here talking to you. Worth it?",
    subtle: "Trying to get back into reading, badly. Any recs I won't abandon?",
    neutral: "Usually weekends. You seem like you'd know the good spots — do you?",
  },
};
export const CONTINUATION_TURN6: Record<Tone, ToneMap> = {
  flirty: {
    flirty: "Okay, officially intrigued. Let's take this to chat before the night ends.",
    subtle: "You're fun. Save me finding you later — let's keep this in chat.",
    neutral: "Worth it. Let's keep talking somewhere quieter — chat's open.",
  },
  subtle: {
    flirty: "I'm in. Tell me the rest over chat?",
    subtle: "Same energy, honestly. Let's move this to chat and keep going.",
    neutral: "I'd like that. Let's swap notes properly in the chat.",
  },
  neutral: {
    flirty: "Ha, you're trouble. Come on — chat's unlocked, let's actually talk.",
    subtle: "I've got a few. Let's trade them in the chat.",
    neutral: "I do, actually. Let's take it to chat and I'll share.",
  },
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

// Single source of truth for "which tone options does the player choosing this
// turn see", given the tones already committed. `tones` is 0-indexed: tones[0]
// is turn-1's tone, tones[1] turn-2's, etc. Each turn branches on the previous
// turn's tone. Shared by the server (to resolve bodies) and the client (to render).
export function turnOptions(pack: Pack, turn: number, tones: (Tone | undefined)[]): ToneMap | null {
  switch (turn) {
    case 1: return pack.turn1_options;
    case 2: return tones[0] ? pack.turn2_options[tones[0]] : null;
    case 3: return tones[1] ? pack.turn3_options[tones[1]] : null;
    case 4: return tones[2] ? (pack.turn4_options ?? CONTINUATION_TURN4)[tones[2]] : null;
    case 5: return tones[3] ? (pack.turn5_options ?? CONTINUATION_TURN5)[tones[3]] : null;
    case 6: return tones[4] ? (pack.turn6_options ?? CONTINUATION_TURN6)[tones[4]] : null;
    default: return null;
  }
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

// Deterministic mocked "Person 2" tone pick — same fn on client (preview) and server (truth).
export function pickOtherTone(matchId: string, turnIdx: number, yourTone: Tone): Tone {
  const key = `${matchId}-t${turnIdx}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  if (h % 10 < 6) return yourTone;
  return TONES[(TONES.indexOf(yourTone) + 1) % TONES.length];
}

export function renderRoundPath(pack: Pack, turn1Tone: Tone, turn2Tone: Tone) {
  return {
    module: "icebreakers",
    round_title: pack.round_title,
    venue_type: pack.venue_type,
    mechanic: "selected_answer_becomes_next_prompt",
    turns: [
      { turn: 1, speaker: "person_1", screen_prompt: pack.screen_prompt, options: pack.turn1_options },
      { turn: 2, speaker: "person_2", prompt_source: "selected_option_from_turn_1", options: pack.turn2_options[turn1Tone] },
      { turn: 3, speaker: "person_1", prompt_source: "selected_option_from_turn_2", options: pack.turn3_options[turn2Tone] },
    ],
  };
}

export function validateIcebreakerRound(round: any): boolean {
  const t1 = round?.turns?.[0];
  const t2 = round?.turns?.[1];
  const t3 = round?.turns?.[2];
  if (!t1 || !t2 || !t3) return false;
  const keys: Tone[] = ["flirty", "subtle", "neutral"];
  for (const k of keys) {
    if (!t1.options?.[k] || !t2.options?.[k] || !t3.options?.[k]) return false;
    if (!/[?]$/.test(String(t1.options[k]).trim())) return false;
    if (!/[?]$/.test(String(t2.options[k]).trim())) return false;
  }
  if (t2.prompt_source !== "selected_option_from_turn_1") return false;
  if (t3.prompt_source !== "selected_option_from_turn_2") return false;
  return true;
}
