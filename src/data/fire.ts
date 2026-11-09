// Calibrated fire effects for real project photos, keyed by project folder.
// Rectangles are [x, y, width, height] in percent of the photo.
// A photo that is not listed here gets no simulated fire at all: we never add
// flames to a photo without a visible fire. Calibrate with ?calibrate=1.
import type { Effect } from '../lib/living';
export const FIRE: Record<string, Effect[]> = {
  'stylish-napoleon-56-linear-gas-fireplace': [{ t: 'flames', r: [37, 61, 21, 7] }, { t: 'embers', r: [38, 60, 19, 6], i: 0.4 }],
  'real-fyre-g31-wood-to-gas-conversion': [{ t: 'flames', r: [25, 44, 45, 20] }, { t: 'embers', r: [28, 44, 38, 10], i: 0.5 }],
  'wood-to-gas-fireplace-conversion': [{ t: 'flames', r: [42, 38, 20, 22] }],
  'living-room-upgrade-kozy-heat-nordic-34-gas-insert': [{ t: 'flames', r: [36, 56, 28, 8], i: 0.6 }],
  'simplifire-inception-36-electric-fireplace': [{ t: 'flames', r: [37, 74, 36, 14], i: 0.6 }],
};
// Which project photo each featured option uses as its hero.
const OPTION_PHOTO: Record<string, string> = {
  'linear-gas-fireplace': 'stylish-napoleon-56-linear-gas-fireplace',
  'gas-logs-and-doors': 'real-fyre-g31-wood-to-gas-conversion',
  'gas-insert': 'living-room-upgrade-kozy-heat-nordic-34-gas-insert',
  'built-in-electric-fireplace': 'simplifire-inception-36-electric-fireplace',
};
export const fireForOption = (optionId: string): Effect[] => FIRE[OPTION_PHOTO[optionId]] ?? [];
export const fireForProject = (projectId: string): Effect[] => FIRE[projectId] ?? [];
