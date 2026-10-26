import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { courses as initialCourses, type Course } from "../data";

export type ManagedCourse = Course & {
  status: "published" | "draft";
  backendId?: string;
};
export const COURSE_STORAGE_KEY = "devpath-courses-v1";
export const categories = [
  "Web Development",
  "Programming",
  "Design",
  "Data Science",
  "Tools & DevOps",
];
export const levels = ["Beginner", "Intermediate", "Advanced"];
export const coverColors = ["blue", "sage", "purple", "gold", "coral"];

function isCourse(value: unknown): value is ManagedCourse {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    [
      "id",
      "title",
      "category",
      "level",
      "instructor",
      "initials",
      "color",
      "tech",
      "description",
    ].every((key) => typeof c[key] === "string") &&
    ["price", "rating", "students", "hours"].every(
      (key) => typeof c[key] === "number" && Number.isFinite(c[key]),
    ) &&
    (c.status === "published" || c.status === "draft")
  );
}

function parseCourses(raw: string | null): ManagedCourse[] | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(isCourse)) return null;
    if (new Set(value.map((c) => c.id)).size !== value.length) return null;
    return value;
  } catch {
    return null;
  }
}

function seed(): ManagedCourse[] {
  return initialCourses.map((c) => ({ ...c, status: "published" }));
}

type CourseStore = {
  courses: ManagedCourse[];
  storageError: string;
  saveCourse: (course: ManagedCourse) => boolean;
  cacheCreatedCourse: (course: ManagedCourse) => void;
  deleteCourse: (id: string) => boolean;
};
const Context = createContext<CourseStore | null>(null);

export function CourseProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<ManagedCourse[]>(() => {
    try {
      return parseCourses(localStorage.getItem(COURSE_STORAGE_KEY)) ?? seed();
    } catch {
      return seed();
    }
  });
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== COURSE_STORAGE_KEY && event.key !== null) return;
      const parsed = parseCourses(event.newValue);
      if (parsed) setCourses(parsed);
      else if (event.newValue === null) setCourses(seed());
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // The persistence boundary for the frontend demo. Replace these operations
  // with authenticated requests when the Go course API contract is available.
  function persist(next: ManagedCourse[]) {
    try {
      localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(next));
      setCourses(next);
      setStorageError("");
      return true;
    } catch {
      setStorageError(
        "Changes could not be saved. Allow browser storage or free up space, then try again.",
      );
      return false;
    }
  }

  function saveCourse(course: ManagedCourse) {
    const exists = courses.some((c) => c.id === course.id);
    return persist(
      exists
        ? courses.map((c) => (c.id === course.id ? course : c))
        : [course, ...courses],
    );
  }

  function cacheCreatedCourse(course: ManagedCourse) {
    const next = [course, ...courses.filter((c) => c.id !== course.id)];
    // A successful POST must not be repeated if the optional browser cache fails.
    try {
      localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "The course was created on the backend, but its browser copy could not be saved. Do not submit it again; check browser storage.",
      );
    }
    setCourses(next);
  }

  return (
    <Context.Provider
      value={{
        courses,
        storageError,
        saveCourse,
        cacheCreatedCourse,
        deleteCourse: (id) => persist(courses.filter((c) => c.id !== id)),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useCourseStore() {
  const store = useContext(Context);
  if (!store) throw new Error("CourseProvider is required");
  return store;
}

export function usePublishedCourses() {
  return useCourseStore().courses.filter((c) => c.status === "published");
}
