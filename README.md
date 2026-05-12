# field-guide

> A field guide to Kinderhook, NY and the small places nearby.
> Kept by Feed & Seed, a barn in Kinderhook, NY. Lives at https://field-guide.feed-and-seed.com.

A small Astro site. The list is short on purpose. Everywhere in it is
somewhere we'd actually go. The factual scaffolding (addresses, hours,
coordinates) is in `src/data/places.ts`; the curation — a few sentences
per place, in the field-guide voice — goes in the `notes` field for
each entry.

Companion to [fieldreports.harmonic-systems.org](https://fieldreports.harmonic-systems.org),
which is the cold, machine-readable layer. This is the warm one.

## Run it

```sh
npm install
npm run dev      # localhost:4321
npm run build    # static output in ./dist
```

## Deploy

Pushes to `main` are built and deployed by `.github/workflows/deploy.yml`
to GitHub Pages. The custom subdomain is set via `public/CNAME`, which
GitHub Pages reads on each deploy.

### One-time setup in GitHub

1. **Settings → Pages** → set the source to **GitHub Actions**.
2. **Settings → Pages** → confirm the custom domain is `field-guide.feed-and-seed.com`
   (the CNAME file in `public/` will populate this on first deploy).
3. **Settings → Pages** → tick **Enforce HTTPS** once the cert is issued
   (takes a few minutes after DNS resolves).

### One-time DNS setup at the `feed-and-seed.com` registrar

Add a `CNAME` record:

```
field-guide   →   <your-github-username>.github.io
```

(Replace `<your-github-username>` with the user or org that owns this
repo. If the repo is under `harmonicsystems`, that's
`harmonicsystems.github.io`.)

GitHub's docs: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## Project layout

```
src/
  data/places.ts         the 23 entries — slug, address, hours, lat/lng, notes
  layouts/Layout.astro   shared <head>, paper-and-ink styling
  pages/
    index.astro          home — list grouped by town
    [slug].astro         one static page per place
  styles/global.css      Tailwind v4 import + design tokens (paper, ink, rule)
public/
  CNAME                  field-guide.feed-and-seed.com
  favicon.svg
.github/workflows/
  deploy.yml             build + deploy on push to main
```

## What's done

- [x] 23 places, full Google Places metadata (address, hours, lat/lng, place_id)
- [x] Static index grouped by town
- [x] One static detail page per place (`/[slug]/`)
- [x] Tailwind v4, paper/ink/rule color tokens, serif body
- [x] GitHub Pages deploy workflow
- [x] CNAME for the custom subdomain

## What's left (handoff to Claude Code)

The scaffold is intentionally quiet. Things to think about next, roughly
in order of when they matter:

1. **Write the notes.** Open `src/data/places.ts` and fill in `notes`
   for each place. A few sentences per entry. Voice: someone who
   actually lives here writing to someone who's about to visit. Don't
   try to be comprehensive — be specific. Insider timing
   ("don't drive out on a Tuesday"), what to order, who runs it,
   what makes it worth the drive.

2. **A "from the Feed and Seed" angle.** Each place could mention the
   relationship to the barn — walking distance, en route from the city,
   good post-meeting spot, kid-friendly for visiting families.

3. **Categories / tags.** Right now category is a free-text field. If
   you want filterable views (food, kids, arts, drink), promote it to a
   structured tag list and add facet pages — `/food/`, `/kids/`, etc.

4. **JSON-LD per place.** Mirror what `fieldreports` does: a Place /
   LocalBusiness graph in `<script type="application/ld+json">` on each
   detail page. Pull lat/lng, address, phone, hours from the data file.
   The `kinderhook.json` graph at fieldreports could even import these
   entries by slug — cross-linking the cold and warm layers.

5. **Co-located places.** Greenhouse Cidery and Chatham Berry Farm
   share an address. Decide whether they get one entry or two.

6. **`llms.txt`.** Short orientation file at the root, like the one on
   fieldreports. Tells AI crawlers what the site is, who runs it, and
   what's authoritative.

7. **A photo per place.** Optional, and only if you have your own
   photos. Nothing scraped.

8. **Spreadsheet-as-CMS.** Long term, you may want to mirror the
   farmers market site's pattern — Google Sheet → JSON → build. For
   now, editing `places.ts` directly is fast and the data is small
   enough that this is fine.
