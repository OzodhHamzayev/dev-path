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

`npm test` runs 11 DOM integration tests covering catalog search and filters, saving, enrollment, lesson completion and persistence, demo form validation, navigation, theme preferences, and the admin course workflows.

## Explore

- `/` — homepage
- `/courses` — 12-course catalog, filters, search, and sorting
- `/courses/react` — course overview, curriculum, and demo enrollment
- `/dashboard` — enrolled courses, bookmarks, progress, and activity
- `/learn/react/0` — lesson workspace (enroll first)
- `/signin` and `/signup` — clearly labeled demo authentication
- `/admin` — course management, search, filters, publishing, and deletion
- `/admin/courses/new` — create a course with a live preview
- `/admin/courses/:id/edit` — edit an existing course

Course enrollment is simulated and never collects payment. Authentication stores only a display name; passwords and email addresses are never saved or sent. Bookmarks, enrollment, completed lesson indices, and the selected dark ambiance are stored under `devpath` in localStorage. Clear that key to reset the demo. Both ambiance options remain dark.

All course illustrations are local SVG/CSS artwork. External fonts have system fallbacks, and decorative learner photos fail gracefully. Lesson videos are honestly represented as placeholders with usable written lessons. Course metadata and testimonials are illustrative mock data. Weekly activity reflects lessons completed in the current demo, attributed to today; it is not a historical analytics service.

## Hosting

Deploy the generated `dist` directory to a static host and configure all application paths to fall back to `index.html` so direct links and browser refreshes work. Vite development and preview servers include this fallback.

The admin update was checked in Chromium on desktop, tablet, and mobile widths (320–1440px). Browser checks exercised creation, editing, publishing, reload persistence, course enrollment/progress, deletion, dialog keyboard behavior, and direct links. DOM integration tests and the production build passed.

## Admin frontend

Open `/admin` or use **Admin** in the navigation. Create a course, fill in its details, and choose **Draft** or **Published** before saving. Published courses immediately appear in the homepage, catalog, course details, and student learning pages. Draft courses remain in the admin workspace. The status badge in the course list also toggles publication.

Deletion asks for confirmation and removes the course's local saved/enrollment/progress references. Searching, status/category filters, sorting, and pagination work in the course library. Forms validate required information, price, and duration; cancelled edits are not saved. Newly created courses start with zero reviews and students, and use the existing illustrative curriculum.

This is a frontend preview, not a protected production admin system. There is no backend connection or server-side role enforcement. Course changes are stored under `devpath-courses-v1` in localStorage, separately from student preferences. The original courses in `src/data.ts` seed a fresh browser; an intentionally empty saved library stays empty. Clearing `devpath-courses-v1` restores the seed on reload.

See [admin frontend integration notes](docs/admin-frontend.md) for file locations and the boundary to connect to your Go backend. The existing demo sign-in/sign-up handlers were not changed by this update.

## Native dependency troubleshooting on Linux

If Tailwind reports “Cannot find native binding”, first use a supported Node version and install optional dependencies. The lockfile already includes Linux platform bindings; keep it. `npm ci` replaces the generated dependency directory automatically.

With nvm: `nvm install && nvm use`, followed by `npm ci --include=dev --include=optional`.

Without changing your global Node installation, use:

```sh
npx --yes --package=node@22 --package=npm@10 -c 'node --version && npm ci --include=dev --include=optional && npm run dev'
```

This downloads Node 22 and npm 10 into npm's tool cache, installs dependencies under that runtime, and starts Vite. Subsequent development sessions should use this command or an activated Node 22 environment.
