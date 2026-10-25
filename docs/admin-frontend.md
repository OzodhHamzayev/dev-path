# Admin frontend integration

## Files

| File                               | Responsibility                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `src/admin/AdminCourses.tsx`       | Course list, statistics, filtering, pagination, publish/unpublish, delete confirmation |
| `src/admin/CourseEditor.tsx`       | Create/edit form, validation, cover choices, live preview                              |
| `src/admin/AdminLayout.tsx`        | Admin sidebar, mobile navigation, breadcrumbs                                          |
| `src/admin/DeleteCourseDialog.tsx` | Native modal confirmation, Escape handling, focus restoration                          |
| `src/admin/admin.css`              | Responsive admin styling                                                               |
| `src/courses/CourseStore.tsx`      | Shared course state and browser persistence                                            |
| `src/components/CourseVisual.tsx`  | Reusable admin cover artwork                                                           |
| `src/main.tsx`                     | Admin routes and published-course consumption in existing student pages                |

The admin UI is available at `/admin`. It intentionally does not pretend to authenticate administrators. No Go backend files, JWT behavior, or existing authentication handlers are changed.

## Shared data

`CourseProvider` owns the course library. `useCourseStore()` exposes all courses to the admin; `usePublishedCourses()` exposes published courses to student pages. Both use the same state, so changes are reflected immediately. Courses retain their IDs during editing, preserving existing links and student progress. Deletion also removes local learning references through `onDeleteCourse` in `AppContent`.

`ManagedCourse` extends the existing `Course` type with `status: "draft" | "published"`. Existing ratings and student counts are preserved during editing. New courses start at zero; admins cannot invent reviews through the form. Curriculum remains the existing sample content and is outside this course-metadata editor.

## Connecting the Go API later

The current `saveCourse` and `deleteCourse` operations persist to localStorage. Replace this persistence boundary with your actual API only after its route and response formats are known:

1. Load the admin's course list from the backend, with loading/error states.
2. Split course creation and updating into the matching POST and PUT/PATCH requests. Keep frontend IDs in sync with server-assigned IDs.
3. Await successful DELETE responses before removing courses locally.
4. Apply the server's returned course data to shared state after successful mutations.
5. Send authentication according to the backend's cookie or Bearer-token contract. Enforce admin authorization on every backend mutation and private admin read.
6. Serve the public catalog from a backend endpoint that excludes drafts. Frontend filtering alone is not access control.
7. Move enrollment/bookmark/progress cleanup into a backend transaction or appropriate relational constraints once those records are stored remotely.

No request URLs or JWT storage assumptions have been hardcoded for this admin preview. LocalStorage changes do not update PostgreSQL, other users, or another browser.

## Checks

```sh
npm ci
npm test
npm run build
npm run dev
```

The test suite covers create/read/update/delete, input validation, draft visibility, persistence after remount, empty libraries, delete cancellation, student-state cleanup, list filters/pagination, and storage failures. Real Chromium checks also covered desktop/tablet/mobile layouts and native dialog Escape/focus behavior.
