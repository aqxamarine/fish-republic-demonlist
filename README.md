# Fish Republic Demonlist

A small static site that renders a Geometry Dash demon list leaderboard.
All content is driven by one JSON file — you never need to touch HTML,
CSS, or JS to update the list.

## Project structure

```
├── index.html          # Page shell (navbar + empty container)
├── css/
│   └── main.css        # Styling (glass cards, responsive layout)
├── js/
│   └── app.js          # Reads levels.json and renders the whole page
├── data/
│   └── levels.json     # ★ The single source of truth — edit this
└── images/             # Level thumbnails + section background art
```

## Running the app

Because the page loads its data with `fetch`, it must be served over HTTP
(opening `index.html` directly via `file://` will show a friendly error).
From this folder, run any of:

```
npx serve
python -m http.server 8000
```

…then open the printed URL. (VS Code's "Live Server" extension works too.)

## Editing the list — `data/levels.json`

### Add a level

Add an object to the `levels` array:

```json
{
  "rank": 16,
  "name": "My New Level",
  "list": "extended",
  "creator": "SomePlayer",
  "beatenBy": ["PlayerA", "PlayerB"],
  "thumbnail": "images/my-level.png"
}
```

- `rank` — placement. Cards are always sorted by `rank`, so you can put
  the object anywhere in the array.
- `list` — which list it belongs to: `main`, `extended`, or `legacy`
  (or any id you define under `lists`).
- `beatenBy` — array of player names; shown comma-separated.
- `thumbnail` — path to an image (drop new images into `images/`).
- No `points` field — points are calculated automatically (see below).

### Points are auto-calculated

You never write points by hand. Levels in lists marked `"scored": true`
(main + extended) share a single ladder:

- The top level gets **500 points**
- Each step down adds `500 / N` (where `N` = total number of scored
  levels), so with 18 scored levels each step is 27.8: #18 → 27.8,
  #17 → 55.6, … #1 → 500
- Levels in unscored lists (`"scored": false`, e.g. Legacy #31+) are
  always worth **0**

This means the whole ladder shifts automatically every time you add or
remove a level — once the list grows into the Legacy range (#31+), those
levels show 0 while main + extended keep spanning 500 → 0.

### Rearrange levels

Just change the `rank` numbers — the page re-sorts automatically.
To move a level between lists, change its `list` field.

### Lists

The `lists` array controls the top-level sections and their
scroll-to chips:

```json
{
  "id": "extended",                        // levels reference this via "list"
  "scored": true,                          // true = counts toward the 500→0 point ladder
  "label": "Extended List (#11 – #25)",    // chip text
  "divider": "#11 – #25: Extended List",   // banner shown above the section (null = none)
  "background": "images/v194_405.png"      // section background art
}
```

A list with no levels (like `legacy` right now) automatically shows a
"No levels yet" placeholder — you can still scroll to it from the chips.
