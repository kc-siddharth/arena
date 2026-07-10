/**********************************************************************
 * DIGITAL AVALON — Google Apps Script backend
 * Storage: Google Sheets (no database).
 * Serves a phone web app via HtmlService + google.script.run.
 *
 * Sheets used (auto-created on first run):
 *   Config  : app access password (cell B1)
 *   Rooms   : one row per room  [roomCode | stateJson | updatedAt]
 *   Records : one row per finished game (for the leaderboard)
 *
 * See SETUP-GUIDE.md for deployment steps.
 **********************************************************************/

// ------- Tunables ----------------------------------------------------
var DEFAULT_APP_PASSWORD = 'avalon';   // used only if Config!B1 is empty
var ROOM_CODE_LEN = 4;
var ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I
var AVATARS = ['🦁','🐺','🦉','🦄','🐉','🦅','🐍','🦊','🐻','🐯','🦇','🐸','🦂','🕷️','🦈','🐙','👑','⚔️','🛡️','🔮'];

// Mission team sizes by player count (official table). *=needs 2 fails.
var TEAM_SIZES = {
  5:[2,3,2,3,3], 6:[2,3,4,3,4], 7:[2,3,3,4,4],
  8:[3,4,4,5,5], 9:[3,4,4,5,5], 10:[3,4,4,5,5]
};
// Missions requiring TWO fails to fail (round index, 1-based) by player count.
var TWO_FAIL = { 5:{}, 6:{}, 7:{4:true}, 8:{4:true}, 9:{4:true}, 10:{4:true} };
// Good / Evil counts by player count.
var SIDE_COUNTS = {
  5:{good:3,evil:2}, 6:{good:4,evil:2}, 7:{good:4,evil:3},
  8:{good:5,evil:3}, 9:{good:6,evil:3}, 10:{good:6,evil:4}
};

// ------- Web entry points -------------------------------------------
// Two ways to reach this backend:
//   1) Open the /exec URL directly  -> serves the phone web app (Index.html)
//   2) Call it as a JSON API        -> from a GitHub Pages frontend (fetch)
//
// API calling convention (used by a remote frontend):
//   POST  <exec-url>   body = {"action":"...","payload":{...}}  (Content-Type text/plain)
//   GET   <exec-url>?action=getState&payload=<url-encoded-json>
// Both return JSON. Simple requests only (no custom headers) so no CORS preflight.

// Run this ONCE from the editor (Run > setup) to create the sheets
// and see your app password. Safe to run again anytime.
function setup() {
  ensureSetup_();
  var msg = 'Sheets ready (Config, Rooms, Records). App password = "' + getAppPassword_() + '"';
  Logger.log(msg);
  return msg;
}

function doGet(e) {
  ensureSetup_(); // make sure the sheets exist even on a bare visit
  if (e && e.parameter && e.parameter.action) {
    var payload = {};
    if (e.parameter.payload) { try { payload = JSON.parse(e.parameter.payload); } catch (err) {} }
    return jsonResponse_(api(e.parameter.action, payload));
  }
  // Try to serve the bundled page (pure Apps Script mode). If there is no
  // HTML file named "Index" (i.e. you're hosting the page on GitHub Pages),
  // show a friendly status page instead of throwing.
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Avalon')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput(
      'Avalon API is running ✓\n\n' +
      'This URL is a data API, not the game page.\n' +
      'To play: put this /exec URL into API_URL in games/avalon/index.html, ' +
      'host that page on GitHub Pages, and open the GitHub Pages link.\n\n' +
      'App password (change in the Config sheet, cell B1): "' + getAppPassword_() + '"'
    ).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return jsonResponse_(err_('Bad request body.')); }
  return jsonResponse_(api(body.action, body.payload || {}));
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------- Sheet helpers ----------------------------------------------
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name, headers) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers) sh.appendRow(headers);
  }
  return sh;
}

function ensureSetup_() {
  sheet_('Rooms', ['roomCode', 'stateJson', 'updatedAt']);
  sheet_('Records', ['timestamp', 'roomCode', 'winner', 'winReason', 'players', 'quests', 'playersDetail']);
  var cfg = ss_().getSheetByName('Config');
  if (!cfg) {
    cfg = ss_().insertSheet('Config');
    cfg.getRange('A1').setValue('App Password:');
    cfg.getRange('B1').setValue(DEFAULT_APP_PASSWORD);
    cfg.getRange('A3').setValue('(Players must type the App Password above to enter the app.)');
  }
}

function getAppPassword_() {
  ensureSetup_();
  var v = ss_().getSheetByName('Config').getRange('B1').getValue();
  return (v === '' || v === null) ? DEFAULT_APP_PASSWORD : String(v);
}

// Read a room's state object (or null).
function readRoom_(code) {
  var sh = sheet_('Rooms', ['roomCode', 'stateJson', 'updatedAt']);
  var data = sh.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === code) {
      try { return { row: r + 1, state: JSON.parse(data[r][1]) }; }
      catch (e) { return null; }
    }
  }
  return null;
}

function writeRoom_(code, state) {
  var sh = sheet_('Rooms', ['roomCode', 'stateJson', 'updatedAt']);
  var found = readRoom_(code);
  var json = JSON.stringify(state);
  var now = new Date();
  if (found) {
    sh.getRange(found.row, 2).setValue(json);
    sh.getRange(found.row, 3).setValue(now);
  } else {
    sh.appendRow([code, json, now]);
  }
}

// Run a read-modify-write with a document lock to avoid races.
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); }
  finally { lock.releaseLock(); }
}

// ------- Room expiry / cleanup --------------------------------------
var ROOM_TTL_MS = 3 * 60 * 60 * 1000; // rooms expire 3 hours after creation

function isExpired_(state) {
  return !!(state && state.createdAt && (nowMs_() - state.createdAt > ROOM_TTL_MS));
}

// Remove a single room's row from the Rooms sheet.
function deleteRoomRow_(code) {
  var sh = sheet_('Rooms', ['roomCode', 'stateJson', 'updatedAt']);
  var data = sh.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === code) { sh.deleteRow(r + 1); return true; }
  }
  return false;
}

// Delete every expired (or unparseable) room. Cheap at friends-scale.
function purgeExpiredRooms_() {
  var sh = sheet_('Rooms', ['roomCode', 'stateJson', 'updatedAt']);
  var data = sh.getDataRange().getValues();
  for (var r = data.length - 1; r >= 1; r--) { // bottom-up so indices stay valid
    var st = null;
    try { st = JSON.parse(data[r][1]); } catch (e) {}
    if (!st || isExpired_(st)) sh.deleteRow(r + 1);
  }
}

// Public wrapper for a time-driven trigger (handlers should be public).
function cleanupRooms() { purgeExpiredRooms_(); }

// Run ONCE from the editor to auto-purge expired rooms every hour.
function installCleanupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'cleanupRooms') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('cleanupRooms').timeBased().everyHours(1).create();
  return 'Hourly room-cleanup trigger installed.';
}

// ------- Utility -----------------------------------------------------
function uid_() { return Utilities.getUuid(); }

function randomCode_() {
  var s = '';
  for (var i = 0; i < ROOM_CODE_LEN; i++)
    s += ROOM_CODE_ALPHABET.charAt(Math.floor(Math.random() * ROOM_CODE_ALPHABET.length));
  return s;
}

function uniqueRoomCode_() {
  for (var tries = 0; tries < 50; tries++) {
    var c = randomCode_();
    if (!readRoom_(c)) return c;
  }
  return randomCode_() + randomCode_();
}

function shuffle_(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function nowMs_() { return new Date().getTime(); }

// ------- Public API (single dispatcher) ------------------------------
// Called from client via google.script.run.api(action, payload)
function api(action, payload) {
  payload = payload || {};
  try {
    switch (action) {
      case 'auth':          return ok_({ ok: verifyPassword_(payload.password) });
      case 'createRoom':    return createRoom_(payload);
      case 'joinRoom':      return joinRoom_(payload);
      case 'leaveRoom':     return leaveRoom_(payload);
      case 'closeRoom':     return closeRoom_(payload);
      case 'getState':      return getState_(payload);
      case 'setConfig':     return setConfig_(payload);
      case 'startGame':     return startGame_(payload);
      case 'ackRole':       return ackRole_(payload);
      case 'proposeTeam':   return proposeTeam_(payload);
      case 'castVote':      return castVote_(payload);
      case 'playCard':      return playCard_(payload);
      case 'assassinate':   return assassinate_(payload);
      case 'leaderboard':   return ok_({ rows: leaderboard_() });
      default:              return err_('Unknown action: ' + action);
    }
  } catch (e) {
    return err_(String(e && e.message ? e.message : e));
  }
}

function ok_(obj)  { obj = obj || {}; obj.ok = (obj.ok === undefined) ? true : obj.ok; return obj; }
function err_(msg) { return { ok: false, error: msg }; }

function verifyPassword_(pw) {
  return String(pw || '').trim() === getAppPassword_().trim();
}

// ------- Room lifecycle ----------------------------------------------
function createRoom_(p) {
  if (!verifyPassword_(p.password)) return err_('Wrong host password.');
  var name = String(p.name || '').trim();
  var avatar = String(p.avatar || '').trim();
  if (!name) return err_('Enter a name.');
  return withLock_(function () {
    purgeExpiredRooms_(); // opportunistic cleanup on each new room
    var code = uniqueRoomCode_();
    var pid = uid_();
    var state = {
      roomCode: code,
      createdAt: nowMs_(),
      phase: 'LOBBY',
      hostId: pid,
      config: { merlin: true, percival: true, assassin: true, morgana: true, mordred: false, oberon: false },
      players: [{ id: pid, name: name, avatar: avatar || AVATARS[0], seen: nowMs_(), acked: false, role: null, side: null }],
      order: [],
      leaderIndex: 0,
      round: 1,
      rejectCount: 0,
      proposedTeam: [],
      votes: {},
      cards: {},
      quests: [],
      assassinTarget: null,
      winner: null,
      winReason: ''
    };
    writeRoom_(code, state);
    return ok_({ roomCode: code, playerId: pid });
  });
}

function joinRoom_(p) {
  // Joining needs only a valid room code — NO password. Only creating a
  // room requires the host password (see createRoom_).
  var code = String(p.roomCode || '').trim().toUpperCase();
  var name = String(p.name || '').trim();
  var avatar = String(p.avatar || '').trim();
  if (!name) return err_('Enter a name.');
  return withLock_(function () {
    var found = readRoom_(code);
    if (!found) return err_('Room ' + code + ' not found.');
    var st = found.state;
    if (isExpired_(st)) { deleteRoomRow_(code); return err_('Room ' + code + ' has expired — ask the host for a new code.'); }
    if (st.phase !== 'LOBBY') return err_('That game has already started.');
    if (st.players.length >= 10) return err_('Room is full (10 max).');
    // Names & avatars must be unique within the room.
    for (var i = 0; i < st.players.length; i++) {
      if (st.players[i].name.toLowerCase() === name.toLowerCase())
        return err_('Name already taken in this room.');
      if (avatar && st.players[i].avatar === avatar)
        return err_('Avatar already taken — pick another.');
    }
    var pid = uid_();
    st.players.push({ id: pid, name: name, avatar: avatar || pickFreeAvatar_(st), seen: nowMs_(), acked: false, role: null, side: null });
    writeRoom_(code, st);
    return ok_({ roomCode: code, playerId: pid });
  });
}

function pickFreeAvatar_(st) {
  var used = {};
  st.players.forEach(function (pl) { used[pl.avatar] = true; });
  for (var i = 0; i < AVATARS.length; i++) if (!used[AVATARS[i]]) return AVATARS[i];
  return AVATARS[0];
}

function leaveRoom_(p) {
  return withLock_(function () {
    var found = readRoom_(p.roomCode);
    if (!found) return ok_({});
    var st = found.state;
    if (st.phase === 'LOBBY') {
      st.players = st.players.filter(function (pl) { return pl.id !== p.playerId; });
      if (st.players.length === 0) { /* leave empty room; harmless */ }
      else if (st.hostId === p.playerId) st.hostId = st.players[0].id; // reassign host
      writeRoom_(p.roomCode, st);
    }
    return ok_({});
  });
}

// Host-only: close the room for everyone (deletes it so the code is freed).
function closeRoom_(p) {
  return withLock_(function () {
    var found = readRoom_(p.roomCode);
    if (!found) return ok_({ closed: true });
    if (found.state.hostId !== p.playerId) return err_('Only the host can close the room.');
    deleteRoomRow_(p.roomCode);
    return ok_({ closed: true });
  });
}

function setConfig_(p) {
  return withLock_(function () {
    var found = readRoom_(p.roomCode);
    if (!found) return err_('Room not found.');
    var st = found.state;
    if (st.hostId !== p.playerId) return err_('Only the host can change settings.');
    if (st.phase !== 'LOBBY') return err_('Game already started.');
    var c = p.config || {};
    st.config = {
      merlin: !!c.merlin, percival: !!c.percival, assassin: !!c.assassin,
      morgana: !!c.morgana, mordred: !!c.mordred, oberon: !!c.oberon
    };
    writeRoom_(p.roomCode, st);
    return ok_({});
  });
}

// ------- Start game / assign roles -----------------------------------
function validateConfig_(st) {
  var n = st.players.length;
  if (n < 5 || n > 10) return 'Need 5–10 players (have ' + n + ').';
  var sc = SIDE_COUNTS[n];
  var c = st.config;
  if (c.merlin && !c.assassin) return 'Assassin must be ON when Merlin is in play.';
  if (c.percival && !c.merlin) return 'Percival needs Merlin in the game.';
  var goodSpecials = (c.merlin ? 1 : 0) + (c.percival ? 1 : 0);
  var evilSpecials = (c.assassin ? 1 : 0) + (c.morgana ? 1 : 0) + (c.mordred ? 1 : 0) + (c.oberon ? 1 : 0);
  if (goodSpecials > sc.good) return 'Too many good special roles for ' + n + ' players.';
  if (evilSpecials > sc.evil) return 'Too many evil special roles for ' + n + ' players.';
  return null;
}

function startGame_(p) {
  return withLock_(function () {
    var found = readRoom_(p.roomCode);
    if (!found) return err_('Room not found.');
    var st = found.state;
    if (st.hostId !== p.playerId) return err_('Only the host can start.');
    if (st.phase !== 'LOBBY') return err_('Already started.');
    var problem = validateConfig_(st);
    if (problem) return err_(problem);

    var n = st.players.length;
    var sc = SIDE_COUNTS[n];
    var c = st.config;

    // Build the role pool.
    var good = [], evil = [];
    if (c.merlin) good.push('Merlin');
    if (c.percival) good.push('Percival');
    while (good.length < sc.good) good.push('Loyal Servant');
    if (c.assassin) evil.push('Assassin');
    if (c.morgana) evil.push('Morgana');
    if (c.mordred) evil.push('Mordred');
    if (c.oberon) evil.push('Oberon');
    while (evil.length < sc.evil) evil.push('Minion of Mordred');

    var roles = [];
    good.forEach(function (r) { roles.push({ role: r, side: 'good' }); });
    evil.forEach(function (r) { roles.push({ role: r, side: 'evil' }); });
    shuffle_(roles);

    st.players = shuffle_(st.players.slice());
    for (var i = 0; i < st.players.length; i++) {
      st.players[i].role = roles[i].role;
      st.players[i].side = roles[i].side;
      st.players[i].acked = false;
    }
    st.order = st.players.map(function (pl) { return pl.id; });
    st.leaderIndex = Math.floor(Math.random() * n);
    st.round = 1;
    st.rejectCount = 0;
    st.proposedTeam = [];
    st.votes = {};
    st.cards = {};
    st.quests = [];
    st.assassinTarget = null;
    st.winner = null;
    st.winReason = '';
    st.phase = 'ROLE_REVEAL';
    writeRoom_(p.roomCode, st);
    return ok_({});
  });
}

function ackRole_(p) {
  return withLock_(function () {
    var found = readRoom_(p.roomCode);
    if (!found) return err_('Room not found.');
    var st = found.state;
    var pl = playerById_(st, p.playerId);
    if (pl) pl.acked = true;
    // When everyone has seen their role, move to first team selection.
    if (st.phase === 'ROLE_REVEAL' && st.players.every(function (x) { return x.acked; })) {
      st.phase = 'TEAM_SELECT';
    }
    writeRoom_(p.roomCode, st);
    return ok_({});
  });
}

function playerById_(st, id) {
  for (var i = 0; i < st.players.length; i++) if (st.players[i].id === id) return st.players[i];
  return null;
}
function currentLeaderId_(st) { return st.order[st.leaderIndex % st.order.length]; }
function teamSize_(st) { return TEAM_SIZES[st.players.length][st.round - 1]; }
function needsTwoFails_(st) { return !!TWO_FAIL[st.players.length][st.round]; }

// ------- Team proposal / vote ----------------------------------------
function proposeTeam_(p) {
  return withLock_(function () {
    var found = readRoom_(p.roomCode);
    if (!found) return err_('Room not found.');
    var st = found.state;
    if (st.phase !== 'TEAM_SELECT') return err_('Not team-selection phase.');
    if (currentLeaderId_(st) !== p.playerId) return err_('Only the current leader can propose.');
    var team = (p.team || []).slice();
    var size = teamSize_(st);
    if (team.length !== size) return err_('Team must have exactly ' + size + ' players.');
    // validate ids
    for (var i = 0; i < team.length; i++) if (!playerById_(st, team[i])) return err_('Invalid team member.');
    st.proposedTeam = team;
    st.votes = {};
    st.phase = 'TEAM_VOTE';
    writeRoom_(p.roomCode, st);
    return ok_({});
  });
}

function castVote_(p) {
  return withLock_(function () {
    var found = readRoom_(p.roomCode);
    if (!found) return err_('Room not found.');
    var st = found.state;
    if (st.phase !== 'TEAM_VOTE') return err_('Not voting phase.');
    if (!playerById_(st, p.playerId)) return err_('Not in this room.');
    if (p.vote !== 'approve' && p.vote !== 'reject') return err_('Bad vote.');
    st.votes[p.playerId] = p.vote;
    // Resolve when everyone has voted.
    if (Object.keys(st.votes).length >= st.players.length) resolveVote_(st);
    writeRoom_(p.roomCode, st);
    return ok_({});
  });
}

function resolveVote_(st) {
  var approve = 0, reject = 0;
  st.players.forEach(function (pl) {
    if (st.votes[pl.id] === 'approve') approve++; else reject++;
  });
  st.lastVote = { approve: approve, reject: reject, votes: cloneVotes_(st) };
  if (approve * 2 > st.players.length) {
    // Approved -> go on the quest.
    st.rejectCount = 0;
    st.cards = {};
    st.phase = 'QUEST';
  } else {
    // Rejected -> next leader; 5 rejects in a mission = evil wins.
    st.rejectCount += 1;
    st.leaderIndex = (st.leaderIndex + 1) % st.order.length;
    if (st.rejectCount >= 5) {
      endGame_(st, 'evil', 'Five team proposals rejected in a row — Evil wins.');
    } else {
      st.proposedTeam = [];
      st.votes = {};
      st.phase = 'TEAM_SELECT';
    }
  }
}

function cloneVotes_(st) {
  var out = {};
  st.players.forEach(function (pl) { out[pl.id] = st.votes[pl.id] || null; });
  return out;
}

// ------- Quest cards -------------------------------------------------
function playCard_(p) {
  return withLock_(function () {
    var found = readRoom_(p.roomCode);
    if (!found) return err_('Room not found.');
    var st = found.state;
    if (st.phase !== 'QUEST') return err_('Not quest phase.');
    if (st.proposedTeam.indexOf(p.playerId) < 0) return err_('You are not on this quest.');
    var pl = playerById_(st, p.playerId);
    var card = p.card;
    // Good players may only play Success.
    if (pl.side === 'good') card = 'success';
    if (card !== 'success' && card !== 'fail') return err_('Bad card.');
    st.cards[p.playerId] = card;
    if (Object.keys(st.cards).length >= st.proposedTeam.length) resolveQuest_(st);
    writeRoom_(p.roomCode, st);
    return ok_({});
  });
}

function resolveQuest_(st) {
  var fails = 0;
  st.proposedTeam.forEach(function (id) { if (st.cards[id] === 'fail') fails++; });
  var need = needsTwoFails_(st) ? 2 : 1;
  var result = (fails >= need) ? 'fail' : 'success';
  st.quests.push({ round: st.round, team: st.proposedTeam.slice(), result: result, fails: fails, twoFail: needsTwoFails_(st) });

  var succ = st.quests.filter(function (q) { return q.result === 'success'; }).length;
  var fl = st.quests.filter(function (q) { return q.result === 'fail'; }).length;

  if (fl >= 3) {
    endGame_(st, 'evil', 'Three missions failed — Evil wins.');
    return;
  }
  if (succ >= 3) {
    // Good completed 3 quests. If an Assassin + Merlin are in play, assassin guesses Merlin.
    var hasMerlin = st.players.some(function (x) { return x.role === 'Merlin'; });
    var hasAssassin = st.players.some(function (x) { return x.role === 'Assassin'; });
    if (hasMerlin && hasAssassin) {
      st.phase = 'ASSASSIN';
    } else {
      endGame_(st, 'good', 'Three missions succeeded — Good wins.');
    }
    return;
  }
  // Continue: next mission, pass leader.
  st.round += 1;
  st.leaderIndex = (st.leaderIndex + 1) % st.order.length;
  st.rejectCount = 0;
  st.proposedTeam = [];
  st.votes = {};
  st.cards = {};
  st.phase = 'TEAM_SELECT';
}

// ------- Assassin ----------------------------------------------------
function assassinate_(p) {
  return withLock_(function () {
    var found = readRoom_(p.roomCode);
    if (!found) return err_('Room not found.');
    var st = found.state;
    if (st.phase !== 'ASSASSIN') return err_('Not the assassination phase.');
    var me = playerById_(st, p.playerId);
    if (!me || me.role !== 'Assassin') return err_('Only the Assassin may act.');
    var target = playerById_(st, p.targetId);
    if (!target || target.side !== 'good') return err_('Pick a good player.');
    st.assassinTarget = p.targetId;
    if (target.role === 'Merlin') {
      endGame_(st, 'evil', 'The Assassin found Merlin — Evil wins!');
    } else {
      endGame_(st, 'good', 'The Assassin missed Merlin — Good wins!');
    }
    writeRoom_(p.roomCode, st);
    return ok_({});
  });
}

// ------- End game + records ------------------------------------------
function endGame_(st, winner, reason) {
  st.winner = winner;
  st.winReason = reason;
  st.phase = 'GAME_OVER';
  st.finishedAt = nowMs_();
  saveRecord_(st);
}

function saveRecord_(st) {
  try {
    var sh = sheet_('Records', ['timestamp', 'roomCode', 'winner', 'winReason', 'players', 'quests', 'playersDetail']);
    var detail = st.players.map(function (pl) {
      return { name: pl.name, avatar: pl.avatar, role: pl.role, side: pl.side, won: (pl.side === st.winner) };
    });
    var questsStr = st.quests.map(function (q) { return q.result === 'success' ? '✓' : '✗'; }).join(' ');
    sh.appendRow([
      new Date(), st.roomCode, st.winner, st.winReason,
      st.players.map(function (pl) { return pl.name; }).join(', '),
      questsStr, JSON.stringify(detail)
    ]);
  } catch (e) { /* never block gameplay on record write */ }
}

function leaderboard_() {
  var sh = ss_().getSheetByName('Records');
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  var agg = {}; // name -> stats
  for (var r = 1; r < data.length; r++) {
    var detailStr = data[r][6];
    if (!detailStr) continue;
    var detail;
    try { detail = JSON.parse(detailStr); } catch (e) { continue; }
    detail.forEach(function (d) {
      var k = d.name;
      if (!agg[k]) agg[k] = { name: k, avatar: d.avatar, games: 0, wins: 0, goodGames: 0, goodWins: 0, evilGames: 0, evilWins: 0 };
      var a = agg[k];
      a.avatar = d.avatar || a.avatar;
      a.games++;
      if (d.won) a.wins++;
      if (d.side === 'good') { a.goodGames++; if (d.won) a.goodWins++; }
      else { a.evilGames++; if (d.won) a.evilWins++; }
    });
  }
  var rows = Object.keys(agg).map(function (k) {
    var a = agg[k];
    a.winRate = a.games ? Math.round(100 * a.wins / a.games) : 0;
    return a;
  });
  rows.sort(function (x, y) {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (y.winRate !== x.winRate) return y.winRate - x.winRate;
    return y.games - x.games;
  });
  return rows;
}

// ------- State projection (hide secrets per player) ------------------
function getState_(p) {
  var found = readRoom_(p.roomCode);
  if (!found) return err_('Room not found.');
  var st = found.state;
  if (isExpired_(st)) { deleteRoomRow_(p.roomCode); return err_('Room expired.'); }
  // mark presence (best-effort, no write to avoid lock churn on polling)
  return ok_({ state: projectState_(st, p.playerId) });
}

function projectState_(st, viewerId) {
  var me = playerById_(st, viewerId);
  var view = {
    roomCode: st.roomCode,
    phase: st.phase,
    hostId: st.hostId,
    config: st.config,
    round: st.round,
    rejectCount: st.rejectCount,
    teamSize: (st.phase === 'LOBBY') ? null : teamSize_(st),
    needsTwoFails: (st.phase === 'LOBBY') ? false : needsTwoFails_(st),
    leaderId: (st.order && st.order.length) ? currentLeaderId_(st) : null,
    proposedTeam: st.proposedTeam,
    quests: st.quests.map(function (q) { return { round: q.round, result: q.result, fails: q.fails, twoFail: q.twoFail }; }),
    winner: st.winner,
    winReason: st.winReason,
    youAreHost: st.hostId === viewerId,
    you: me ? { id: me.id, name: me.name, avatar: me.avatar, role: me.role, side: me.side, acked: me.acked } : null,
    players: st.players.map(function (pl) {
      return {
        id: pl.id, name: pl.name, avatar: pl.avatar, acked: pl.acked,
        isLeader: (st.order && st.order.length) ? (currentLeaderId_(st) === pl.id) : false,
        onTeam: st.proposedTeam.indexOf(pl.id) >= 0,
        hasVoted: st.votes ? (st.votes[pl.id] != null) : false,
        hasPlayedCard: st.cards ? (st.cards[pl.id] != null) : false
      };
    }),
    voteCount: st.votes ? Object.keys(st.votes).length : 0,
    cardCount: st.cards ? Object.keys(st.cards).length : 0,
    availableAvatars: AVATARS
  };

  // Your private vote (so UI can show what you picked)
  if (me && st.votes) view.yourVote = st.votes[viewerId] || null;
  if (me && st.cards) view.yourCard = st.cards[viewerId] || null;

  // Role knowledge — only for the viewer, only after reveal.
  if (me && me.role && st.phase !== 'LOBBY') {
    view.knowledge = knowledgeFor_(st, me);
  }

  // Reveal all roles + full vote history once the game is over.
  if (st.phase === 'GAME_OVER') {
    view.revealAll = st.players.map(function (pl) {
      return { id: pl.id, name: pl.name, avatar: pl.avatar, role: pl.role, side: pl.side, won: pl.side === st.winner };
    });
    view.assassinTarget = st.assassinTarget;
  }

  // Last vote breakdown (public, once resolved) so players can discuss.
  if (st.lastVote) view.lastVote = st.lastVote;

  return view;
}

// What secret info does this player legitimately know?
// Returns a neutral `key` (the client's theme supplies the wording).
function knowledgeFor_(st, me) {
  var out = [];
  var names = function (pred) {
    return st.players.filter(pred).filter(function (x) { return x.id !== me.id; })
      .map(function (x) { return { name: x.name, avatar: x.avatar }; });
  };
  if (me.role === 'Merlin') {
    // Merlin sees all evil EXCEPT Mordred.
    out.push({ key: 'merlin', people: names(function (x) { return x.side === 'evil' && x.role !== 'Mordred'; }) });
  } else if (me.role === 'Percival') {
    // Percival sees Merlin & Morgana, indistinguishable.
    var p = names(function (x) { return x.role === 'Merlin' || x.role === 'Morgana'; });
    shuffle_(p);
    out.push({ key: 'percival', people: p });
  } else if (me.side === 'evil' && me.role !== 'Oberon') {
    // Evil see each other, except Oberon is hidden from them and they from Oberon.
    out.push({ key: 'evil', people: names(function (x) { return x.side === 'evil' && x.role !== 'Oberon'; }) });
  } else if (me.role === 'Oberon') {
    out.push({ key: 'oberon', people: [] });
  }
  return out;
}
