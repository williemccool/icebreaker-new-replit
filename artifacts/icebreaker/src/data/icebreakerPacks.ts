export {
  PACKS,
  TONES,
  getPackById,
  pickPackForMatch,
  pickOtherTone,
  renderRoundPath,
  validateIcebreakerRound,
} from "@shared/icebreakerPacks";
export type { Tone, ToneMap, Pack } from "@shared/icebreakerPacks";

import type { Tone } from "@shared/icebreakerPacks";

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

// Client-side self-check on module load.
import { PACKS as _PACKS, TONES as _TONES, renderRoundPath as _render, validateIcebreakerRound as _validate } from "@shared/icebreakerPacks";
(function selfCheck() {
  for (const pack of _PACKS) {
    for (const t1 of _TONES) {
      for (const t2 of _TONES) {
        if (!_validate(_render(pack, t1, t2))) {
          // eslint-disable-next-line no-console
          console.error(`[icebreakerPacks] Pack "${pack.id}" failed validation at ${t1}/${t2}`);
        }
      }
    }
  }
})();
