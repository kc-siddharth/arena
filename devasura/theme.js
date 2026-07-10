/* ============================================================================
   THEME PACK  -  all artwork, names, colours & flavour text live here.
   The GAME LOGIC never changes; only what players SEE.

   - To switch themes:  edit ACTIVE_THEME below.
   - To tweak art:      edit the emoji / colours / text in a theme.
   - To add a theme:    copy a block, give it a new key, point ACTIVE_THEME at it.
   - Want image artwork later?  Any `emoji` field can hold an <img> tag instead
     of an emoji, e.g.  emoji: '<img src="art/narada.png" class="art">'
   ============================================================================ */

var ACTIVE_THEME = "indian";   // "indian"  or  "avalon"

var THEMES = {

  /* ---------------------------------------------------------------- INDIAN */
  indian: {
    appTitle: "DEVASURA",
    appSubtitle: "DEVAS vs ASURAS - THE CHURNING",
    colors: { good: "#3f7fe0", evil: "#d94a4a", gold: "#e8c15a", accent: "#7c5cff" },

    factions: {
      good: { name: "Devas", tagline: "Deva - Force of Dharma" },
      evil: { name: "Asuras", tagline: "Asura - Force of Adharma" }
    },

    // Sacred rite = a "mission". Amrita (nectar) = success, Vish (poison) = fail.
    missionWord: "Yajna",
    missionWordPlural: "Yajnas",
    successWord: "Amrita",
    failWord: "Vish",

    labels: {
      leader: "Yajna Leader",
      lobby: "The Assembly",
      pickTeamVerb: "send on the Yajna",
      successBtn: "Offer Amrita  -  Success",
      sabotageBtn: "Pour Vish  -  Sabotage",
      goodOnlyHint: "As a Deva you may only offer Amrita (Success).",
      voteTitle: "Vote on the party",
      assassinTitle: "The Final Strike",
      assassinLead: "The Devas have completed three Yajnas. The Asuras get one last chance:",
      assassinInstruct: "Kamsa must name Narada (the seer).",
      assassinQuestion: "Who is Narada?",
      killBadge: "tap to strike",
      rejectionsNote: "rejected parties (5 = Asuras win)",
      victoryGood: "THE DEVAS PREVAIL",
      victoryEvil: "THE ASURAS PREVAIL"
    },

    knowledge: {
      merlin: "Asuras revealed to your inner sight",
      percival: "One of these is the true seer, Narada",
      evil: "Your fellow Asuras",
      oberon: "You walk alone among the Asuras"
    },

    // canonical role  ->  themed name, emoji, blurb, and lobby toggle label
    roles: {
      "Merlin":            { name: "Narada",      emoji: "👁️", blurb: "The wandering sage sees every Asura in the assembly - but stay veiled. If the Asuras name you at the end, they win.", toggle: "Narada (Deva - sees the Asuras)" },
      "Percival":          { name: "Arjuna",      emoji: "🏹", blurb: "You sense two radiant figures - one is the true seer Narada, one is an illusion. You cannot tell which. Guard the real seer.", toggle: "Arjuna (Deva - senses Narada)" },
      "Loyal Servant":     { name: "Deva",        emoji: "🪷", blurb: "A loyal god of the celestial host. No special sight - win the sacred Yajnas through wisdom and trust.", toggle: "" },
      "Assassin":          { name: "Kamsa",       emoji: "🗡️", blurb: "If the Devas complete three Yajnas, you get one strike: name Narada. Guess right and the Asuras seize victory.", toggle: "Kamsa (Asura - strikes at Narada)" },
      "Morgana":           { name: "Maya",        emoji: "🌀", blurb: "Weaver of illusion - to Arjuna's eyes you shine like the seer Narada. You know your fellow Asuras.", toggle: "Maya (Asura - deceives Arjuna)" },
      "Mordred":           { name: "Rahu",        emoji: "🌑", blurb: "The shadow even the all-seeing sage cannot perceive. Hidden from Narada. You know your fellow Asuras.", toggle: "Rahu (Asura - hidden from Narada)" },
      "Oberon":            { name: "Bhasmasura",  emoji: "🔥", blurb: "A wild Asura who trusts no one. You do not know the other Asuras, and they do not know you.", toggle: "Bhasmasura (Asura - unknown to the host)" },
      "Minion of Mordred": { name: "Asura",       emoji: "😈", blurb: "A demon of the host. Pour Vish into the Yajnas and drag three into ruin.", toggle: "" }
    },

    avatars: ["🕉️","🔱","🪷","🐘","🦚","🔥","🌊","🏹","🐍","☀️","🌙","⚡","🗡️","🐚","🪔","👁️","🦁","🐅","🌟","🛕"]
  },

  /* ---------------------------------------------------------------- CLASSIC */
  avalon: {
    appTitle: "AVALON",
    appSubtitle: "THE RESISTANCE",
    colors: { good: "#3b82f6", evil: "#ef4444", gold: "#e8c15a", accent: "#7c5cff" },

    factions: {
      good: { name: "Good", tagline: "Loyal Servant of Arthur" },
      evil: { name: "Evil", tagline: "Minion of Mordred" }
    },

    missionWord: "Mission",
    missionWordPlural: "Missions",
    successWord: "Success",
    failWord: "Fail",

    labels: {
      leader: "Team leader",
      lobby: "Lobby",
      pickTeamVerb: "send on the mission",
      successBtn: "Success",
      sabotageBtn: "Fail  -  Sabotage",
      goodOnlyHint: "As a loyal servant you can only play Success.",
      voteTitle: "Vote on the team",
      assassinTitle: "The Assassination",
      assassinLead: "Good completed three missions. Evil has one last chance:",
      assassinInstruct: "The Assassin must name Merlin.",
      assassinQuestion: "Who is Merlin?",
      killBadge: "tap to kill",
      rejectionsNote: "vote rejections (5 = Evil wins)",
      victoryGood: "GOOD WINS",
      victoryEvil: "EVIL WINS"
    },

    knowledge: {
      merlin: "Agents of Evil you can see",
      percival: "One of these is Merlin",
      evil: "Your fellow agents of Evil",
      oberon: "You are Evil, but alone"
    },

    roles: {
      "Merlin":            { name: "Merlin",   emoji: "🧙", blurb: "You know who the Evil players are - but stay hidden. If Evil guesses you at the end, they win.", toggle: "Merlin (Good - sees Evil)" },
      "Percival":          { name: "Percival", emoji: "🛡️", blurb: "You can see Merlin and Morgana, but not which is which. Protect the real Merlin.", toggle: "Percival (Good - sees Merlin)" },
      "Loyal Servant":     { name: "Loyal Servant", emoji: "⚔️", blurb: "A loyal servant of Arthur. You have no special sight - deduce and win the missions.", toggle: "" },
      "Assassin":          { name: "Assassin", emoji: "🗡️", blurb: "If Good wins 3 missions, you get one shot to name Merlin. Guess right and Evil steals the win.", toggle: "Assassin (Evil - guesses Merlin)" },
      "Morgana":           { name: "Morgana",  emoji: "🔮", blurb: "You appear as Merlin to Percival, sowing doubt. You know your fellow agents of Evil.", toggle: "Morgana (Evil - fools Percival)" },
      "Mordred":           { name: "Mordred",  emoji: "👑", blurb: "Even Merlin cannot see you. You know your fellow agents of Evil.", toggle: "Mordred (Evil - hidden from Merlin)" },
      "Oberon":            { name: "Oberon",   emoji: "🦇", blurb: "You are Evil - but you don't know the other agents, and they don't know you.", toggle: "Oberon (Evil - unknown to team)" },
      "Minion of Mordred": { name: "Minion of Mordred", emoji: "😈", blurb: "A minion of Mordred. Sabotage missions and help Evil to three failures.", toggle: "" }
    },

    avatars: ["🦁","🐺","🦉","🦄","🐉","🦅","🐍","🦊","🐻","🐯","🦇","🐸","🦂","🕷️","🦈","🐙","👑","⚔️","🛡️","🔮"]
  }
};

/* ============================================================================
   VISUAL SKINS  —  colour palettes, independent of the narrative theme above.
   Players switch between these live (persisted). To add one: copy a block,
   give it a key + name + mode, set the CSS variables. `mode` is just a hint.
   ============================================================================ */
var SKINS = {
  kathakali: {
    name: "Kathakali Night", blurb: "dark · pacha green + brass", mode: "dark",
    vars: {
      "--bg": "#131A18", "--panel": "#1D2623", "--inset": "#141B18", "--text": "#EFE7D3",
      "--muted": "#A7A08C", "--line": "#2B3733", "--gold": "#C7A24A", "--good": "#2E9366",
      "--evil": "#C33B2B", "--ok": "#5E8F52", "--accent": "#C7A24A", "--accent-text": "#1a1405",
      "--chip": "#26302C", "--chip-text": "#EFE7D3"
    }
  },
  kasavu: {
    name: "Kasavu Onam", blurb: "light · cream + zari gold", mode: "light",
    vars: {
      "--bg": "#F4EBD6", "--panel": "#FCF5E5", "--inset": "#EFE3C9", "--text": "#241E15",
      "--muted": "#857556", "--line": "#DFD0AC", "--gold": "#B98F2E", "--good": "#2F7D57",
      "--evil": "#B0402C", "--ok": "#5E8A4E", "--accent": "#B98F2E", "--accent-text": "#241905",
      "--chip": "#EDE1C6", "--chip-text": "#3A2F1E"
    }
  }
};
var DEFAULT_SKIN = "kathakali";

/* ---- resolved theme + helpers (used by index.html) ---- */
var THEME = THEMES[ACTIVE_THEME] || THEMES.avalon;

function roleName(c){ return (THEME.roles[c] && THEME.roles[c].name) || c; }
function roleBlurb(c){ return (THEME.roles[c] && THEME.roles[c].blurb) || ""; }
function roleEmoji(c){ return (THEME.roles[c] && THEME.roles[c].emoji) || ""; }
function roleToggle(c){ return (THEME.roles[c] && THEME.roles[c].toggle) || c; }
function factionName(side){ return THEME.factions[side].name; }
function factionTagline(side){ return THEME.factions[side].tagline; }
function T(k){ return THEME.labels[k] || ""; }
function knowLabel(k){ return THEME.knowledge[k] || ""; }

// Turn a server-generated reason into a clean, themed sentence.
// Matched by keyword so it never depends on exact punctuation.
function themeReason(s){
  if(!s) return "";
  var mp = THEME.missionWordPlural.toLowerCase();
  if(/rejected in a row/i.test(s))  return "Five parties were rejected in a row.";
  if(/missions failed/i.test(s))    return "Three " + mp + " fell to ruin.";
  if(/missions succeeded/i.test(s)) return "Three " + mp + " were completed.";
  if(/found Merlin/i.test(s))       return roleName("Assassin") + " named " + roleName("Merlin") + " correctly.";
  if(/missed Merlin/i.test(s))      return roleName("Assassin") + " failed to name " + roleName("Merlin") + ".";
  return String(s)
    .replace(/Merlin/g, roleName("Merlin"))
    .replace(/Assassin/g, roleName("Assassin"))
    .replace(/\bGood\b/g, factionName("good"))
    .replace(/\bEvil\b/g, factionName("evil"));
}
