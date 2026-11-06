// shared by api/game.mjs and (copied) city.js: 3 daily quests picked from the date
export const QUESTS = ['crystals', 'like', 'stadium', 'mall', 'race', 'guest', 'walk', 'goal', 'chat'];
export function questsFor(dayStr) { let h = 2166136261; for (const c of dayStr) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const out = []; let x = h >>> 0; while (out.length < 3) { x = (Math.imul(x ^ (x >>> 15), 2246822507) + 0x9e3779b9) >>> 0; const q = x % QUESTS.length; if (!out.includes(q)) out.push(q); } return out; }
export const QUEST_REWARD = 10, QUEST_BONUS = 15;
