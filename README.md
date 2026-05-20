# World War — multiplayer strategy PWA

Real-time geopolitical strategy game for 2–6 friends, played on a real-world map.
Pick any of the 195 UN-recognized countries (193 members + Vatican + Palestine),
form alliances, prepare for war, then strike. Built as a Progressive Web App,
so the same URL works on Android, iOS, and desktop.

## Architecture

| Layer | Tech |
|---|---|
| UI | React 18 + TypeScript + Tailwind |
| Map | Leaflet + Natural Earth `ne_110m_admin_0_countries` |
| Build | Vite |
| PWA | `vite-plugin-pwa` (auto service worker) |
| Realtime | Firebase Firestore (`onSnapshot` listeners) |
| Auth | Firebase Anonymous Auth (no signup needed) |
| Hosting | Firebase Hosting |

### How realtime sync works

Every game lives in a single Firestore document at `rooms/{ROOM_CODE}`.
Every player's client subscribes to that document via `onSnapshot` — when any
write lands (e.g. another player builds a tank), all connected clients receive
the updated state via WebSocket in ~100ms. No polling, no game server.

The day timer is computed **client-side** from `startedAt` (a server timestamp).
All clients use the same wall-clock formula `day = floor((now - startedAt) / dayLengthMs) + 1`,
so the day boundary advances simultaneously without server cron jobs.

The news feed lives in a subcollection `rooms/{ROOM_CODE}/news` so it can be
sorted and paginated independently.

## First-time setup

### 1. Install

```bash
npm install
```

### 2. Create a Firebase project

1. Go to https://console.firebase.google.com and create a new project.
2. In the project, enable:
   - **Authentication** → Sign-in method → **Anonymous** (toggle on).
   - **Firestore Database** → create database, start in **production mode**.
   - **Hosting** (will be initialized in step 4).
3. Project settings → General → "Your apps" → add a **Web app**. Copy the config.

### 3. Configure env

```bash
cp .env.example .env
# fill in VITE_FIREBASE_* values from the Firebase console
```

Also edit `.firebaserc` and replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`.

### 4. Deploy security rules

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 5. Run locally

```bash
npm run dev
```

Open the printed URL (e.g. `http://localhost:5173`) on two browsers/devices to
test multiplayer locally.

### 6. Deploy to Firebase Hosting

```bash
npm run deploy
```

Share the printed URL with your friends. Add it to home screen to install as a PWA.

## Gameplay overview

- **Lobby**: create or join a room with a 5-letter code. Up to 6 players. Pick
  any of the 195 countries (one per player). Form an alliance or stay solo.
  Admin sets prep length (≥ 7 days). Everyone hits Ready → admin starts.
- **Preparation phase** (default 7 days, configurable): build infantry, tanks,
  fighters, bombers, ships, missiles. Manage morale, reputation, treasury.
  Give one speech per day. Diplomacy with NPCs (acceptance 0–100).
- **War phase** (7 days): strike targets via ground (needs land border),
  air, sea, or missile. Each enemy capital has 10 000 HP.
- **Win condition**: when war ends, the player or alliance controlling the
  most population points wins. A player whose capital reaches 0 HP is out.

## Real-world dynamics baked in

- **NPC alignment**: each player's chosen country has real-world allies,
  rivals, and bloc memberships (NATO, BRICS, GCC, SCO, ASEAN, etc.).
  Pick India and the map auto-paints Pakistan/China red, Russia/Israel/US green,
  Brazil/Switzerland white — adjusting live based on other players' picks.
- **Population points**: each country's win-condition value mirrors real-world
  population (in millions, rounded). India ≈ 1428.6, USA ≈ 334.9, Tuvalu ≈ 0.01.
- **Land-border ground rules**: ground attacks require shared border via owned
  territory. Air, naval, and missile strikes have global reach.
- **Perks**: each player rolls 2 of {wealthy, highMorale, innovator, diplomat,
  industrial, militaristic}. Determinstic per player UID so reloading doesn't
  re-roll.

## Roadmap (in priority order)

These are deliberately stubbed today; the data model is ready for them:

1. End-of-day tick that applies production speed (Industrial perk),
   morale-reputation drift, and innovation gains.
2. NPC diplomacy modal: spend money to send `military`/`peace`/`tourism`
   advances at neutral nations; resolve via `game/diplomacy.ts`.
3. Army camps on the map (place in friendly territory to project ground reach).
4. Territory capture: ground strike on a depleted-capital NPC absorbs its
   population points.
5. Visual missile/strike animations on the map.
6. Push notifications via Firebase Cloud Messaging for "you've been attacked."
7. End-game summary screen.

## Project layout

```
src/
  data/countries.ts        # 195 countries with population, borders, blocs
  data/perks.ts            # 6 starting perks + deterministic roll
  game/relationships.ts    # green/red/white NPC logic
  game/timer.ts            # synced day cycle math
  game/scoring.ts          # population-points win condition
  game/army.ts             # units, cost, starting army
  game/speech.ts           # 3 speech kinds + inspire bonus
  game/diplomacy.ts        # NPC advance resolution
  firebase/                # config + anonymous auth + room CRUD
  hooks/                   # useAuth, useRoom (snapshot), useGameClock
  components/              # WorldMap, Lobby, GameView, panels, modals
  routes/RoomRoute.tsx     # /room/:code
firestore.rules            # security rules
firebase.json              # hosting + firestore config
```
