// load and save invites to JSON file, works as a personal invite bot. Will need to change for scalability if needed in future.


const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'invites.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ invites: {} }, null, 2));
}

function load() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function createInvite(invite) {
  const data = load();
  data.invites[invite.id] = invite;
  save(data);
  return invite;
}

function getInvite(id) {
  const data = load();
  return data.invites[id] || null;
}

// updater receives the live invite object and mutates it directly
function updateInvite(id, updater) {
  const data = load();
  const invite = data.invites[id];
  if (!invite) return null;
  updater(invite);
  save(data);
  return invite;
}

module.exports = { createInvite, getInvite, updateInvite };