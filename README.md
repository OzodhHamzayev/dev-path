# DevPath

A responsive programming learning platform built with React 19, TypeScript, Vite, Tailwind CSS 4, and Lucide icons. Frontend only; no API keys, backend, or payment setup required.

## Run locally

Requires Node.js 22.12+ (validated with Node 22 and 24). A `.nvmrc` file selects Node 22 for nvm users.

```sh
npm ci
npm run dev
```

## Verify and build

```sh
npm test
npm run build
npm run preview
```

`npm test` runs four DOM integration tests covering catalog search and filters, saving, enrollment, lesson completion and persistence, demo form validation, navigation, and theme preferences.

## Explore

- `/` — homepage
- `/courses` — 12-course catalog, filters, search, and sorting
- `/courses/react` — course overview, curriculum, and demo enrollment
- `/dashboard` — enrolled courses, bookmarks, progress, and activity
- `/learn/react/0` — lesson workspace (enroll first)
- `/signin` and `/signup` — clearly labeled demo authentication

Course enrollment is simulated and never collects payment. Authentication stores only a display name; passwords and email addresses are never saved or sent. Bookmarks, enrollment, completed lesson indices, and the selected dark ambiance are stored under `devpath` in localStorage. Clear that key to reset the demo. Both ambiance options remain dark.

All course illustrations are local SVG/CSS artwork. External fonts have system fallbacks, and decorative learner photos fail gracefully. Lesson videos are honestly represented as placeholders with usable written lessons. Course metadata and testimonials are illustrative mock data. Weekly activity reflects lessons completed in the current demo, attributed to today; it is not a historical analytics service.

## Hosting

Deploy the generated `dist` directory to a static host and configure all application paths to fall back to `index.html` so direct links and browser refreshes work. Vite development and preview servers include this fallback.

Browser-based visual checks could not run in the setup environment because the Chromium download domain was blocked. DOM integration tests and the production build passed.

## Native dependency troubleshooting on Linux

If Tailwind reports “Cannot find native binding”, first use a supported Node version and install optional dependencies. The lockfile already includes Linux platform bindings; keep it. `npm ci` replaces the generated dependency directory automatically.

With nvm: `nvm install && nvm use`, followed by `npm ci --include=dev --include=optional`.

Without changing your global Node installation, use:

```sh
npx --yes --package=node@22 --package=npm@10 -c 'node --version && npm ci --include=dev --include=optional && npm run dev'
```

This downloads Node 22 and npm 10 into npm's tool cache, installs dependencies under that runtime, and starts Vite. Subsequent development sessions should use this command or an activated Node 22 environment.
