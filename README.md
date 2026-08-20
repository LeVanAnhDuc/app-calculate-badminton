🏸 Badminton cost split — divide court and shuttlecock costs across the group after every session

A mobile-first web app that works out what each member of a badminton group
owes. No server, no sign-in — your data stays on your own device.

## Features

- **Two split modes**
  - **Split by ratio**: add up shuttlecock and court costs, then divide by gender weight (Male/Female), with support for entering a half session
  - **Court by the hour**: the court fee follows each person's actual playing time while shuttlecocks still split by weight (for groups where people arrive late or leave early)

- **Several shuttlecock types in one session**
  - Each type has its own name, quantity and price — the shuttlecock total still splits by weight as before
  - Pick a type from a bottom sheet: chips for the types you use often, type to filter, and choosing one fills in last time's price
  - The entry row is down to two fields — the unit price sits with the type name inside the bottom sheet, and the button outside already reads "Hải Yến · 25.000đ", so the price is visible without opening it
  - Each row shows its own line total ("12 quả × 25.000đ = 300.000đ"), so checking it needs no mental arithmetic
  - History spells out every shuttlecock type used in the session

- **Rounding and balance**
  - Round up to 1,000₫ (the default) or keep exact amounts
  - Shows the balance between what is collected and what is owed (hidden behind a 👁 button each time the app opens)

- **Extra costs**
  - Enter the odds and ends (water, racket rental, grip tape…) right in the Costs section
  - Assign each one to a single person, a few of them, or the whole group — the amount divides evenly per head
  - The result lists every item under each person's name, in the PNG image and in the copied text alike
  - Delete a player and a shared item keeps its total — the remaining people carry that share

- **Contacts and a session list that remembers itself**
  - A contacts page in the style of the iPhone Contacts app: grouped by first letter, letter headers that stick while scrolling, and an A–Z bar down the right edge to jump between groups
  - Vietnamese names group by their unaccented letter (Ánh under A, Đức with D); names starting with a digit or an unusual character go under #
  - Search ignores accents and case ("duc" finds "Đức"); the + button at the top of the page opens a bottom sheet to add someone
  - Name suggestions from contacts as you type (case-insensitive)
  - A "Frequent players" chip row while the name box is empty: one tap adds the person you play with most (ranked by saved sessions, and anyone already in this session drops off the list)
  - The current session's list survives between visits — next time you only need to amend it

- **iOS-style player entry on phones** (large screens keep the old layout)
  - The input becomes a rounded search bar with a magnifying glass, a clear button and a "Cancel" button, like the iOS search bar
  - "Frequent players" becomes a single horizontally scrolling row of round avatars (first letter of the name, coloured by gender) instead of 3–4 rows of chips — about two thirds shorter
  - Contact suggestions gather into one rounded block, its rows separated by hairlines
  - Type a name that does not exist yet and two rows appear straight away — "Add … as a new player · Male / Female" — one tap and it is done, with no need to pick a gender first and then press add
  - Type a name already in the session and it says so immediately instead of leaving the suggestion list blank

- **Detailed history, ready to reuse**
  - Review any past session in full (costs, weights, computed result)
  - "Reuse this list" loads an old session's players into a new one
  - Delete a session with one tap, and press "Undo" if it was a slip

- **Safe deletion, with "Undo"**
  - Deleting a player, a saved session or a contact no longer asks for confirmation
  - An "Undo" notice stays for 6 seconds, restores the item to its old position, and keeps every change you made in the meantime
  - Press "New session" by mistake and the whole session you were entering comes back

- **Track who has paid**
  - Mark ✓ paid for each person right on the result table and in history
  - Paid status shows in the downloaded result image too

- **Share the result**
  - Press share to send the result image straight into Zalo/Messenger through the phone's share sheet (devices without support download the PNG instead)
  - Copy the result as text (name + amount + a ✓ for paid) to paste into a chat
  - Reshare an old session's image or text from history, keeping the date it was saved under

- **A VietQR code per player**
  - Enter the collector's bank account once and the app reuses it for every session after
  - Each person scans their own QR code, with the amount and transfer note already filled in, to pay
  - The VietQR code appears in the shared PNG result image
  - Press "Share QR" to send one person's code straight into Zalo/Messenger — the card image already carries their name, the amount, the transfer note and the account number (devices without support download the image instead)

- **The same delete gesture in every list**
  - Mobile: swipe left to delete — players, contacts, shuttlecock rows, extra costs and sessions in history alike, with no delete button taking up space in the row
  - Desktop: a single red trash button, the same size and alignment as the edit button on every screen
  - Every list carries a hint about how to delete, worded for the device in use
  - Swipes are axis-locked: scrolling vertically with a slightly crooked finger no longer drags the row sideways

- **A flexible interface**
  - Edit playing times through a bottom sheet (vaul), picking hours with an iOS-style 24-hour wheel picker
  - Drag the ⠿ handle to reorder players (mobile and desktop)
  - Responsive: one column on mobile, two sticky columns on desktop with smooth animation (Motion)

- **Install it as an app, use it offline**
  - Add it to the home screen and open it like an app, without going through a browser
  - Fully usable with no connection — which suits a court with weak signal

- **No sign-in, no server**
  - All data lives in localStorage on your own device
  - Share the app's link with friends and everyone uses their own copy

## Tech Stack

- **Frontend**: React 19, TypeScript (strict mode), Vite
- **Styling**: Tailwind CSS v4
- **UI Components**: vaul (bottom sheet), sonner (toast), react-mobile-picker, Motion (animation)
- **Testing**: Vitest + React Testing Library (441 test cases)
- **Build & Deploy**: Vite, works on static hosting (Vercel, Netlify, GitHub Pages)

## Running

**Requires**: Node.js 18+

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:5173)
npm run dev

# Run the test suite (Vitest)
npm test

# Build for production (output: dist/)
npm run build
```

## Project structure

```
src/
├── lib/
│   ├── calc.ts        # Pure calculation logic (both modes, rounding, balance)
│   ├── time.ts        # Parse/format times, including past midnight
│   ├── format.ts      # Format/parse VND amounts
│   ├── storage.ts     # localStorage wrapper (roster, session, history, settings)
│   └── types.ts       # TypeScript types
├── components/        # React components (form, player list, history, etc.)
└── App.tsx           # Routing and top-level state

docs/
└── superpowers/specs/2026-08-13-badminton-cost-split-design.md  # Full design spec
```

## Calculation example

**"Split by ratio" mode**: 300,000₫ total, weights Male 1.5 / Female 1.0

Group: Tuấn, Hùng, Minh (male) + Lan, Hoa (female), with Minh playing half the session

```
Total shares = 1.5 + 1.5 + 0.75 + 1.0 + 1.0 = 5.75

Result (rounded up to 1,000₫):
  Tuấn:  78.261đ → 79.000đ
  Hùng:  78.261đ → 79.000đ
  Minh:  39.130đ → 40.000đ
  Lan:   52.174đ → 53.000đ
  Hoa:   52.174đ → 53.000đ

Collected: 304.000đ | Balance: +4.000đ
```

---

**Created**: 2026-08-13
