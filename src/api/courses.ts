import type { ManagedCourse } from "../courses/CourseStore";

function getConfig() {
  return {
    base: (
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
    ).replace(/\/+$/, ""),
    path: import.meta.env.VITE_COURSE_CREATE_PATH || "/api/admin/courses",
    tokenKey: import.meta.env.VITE_AUTH_TOKEN_KEY || "token",
    cookieAuth: import.meta.env.VITE_API_AUTH_MODE === "cookie",
  };
}

export function courseCreationUrl() {
  const { base, path } = getConfig();
  return `${base}/${path.replace(/^\/+/, "")}`;
}

export function courseDeletionUrl(id: string) {
  return `${courseCreationUrl()}/${encodeURIComponent(id)}`;
}

export function courseUpdateUrl(id: string) {
  return `${courseCreationUrl()}/${encodeURIComponent(id)}`;
}

type JsonObject = Record<string, unknown>;
function object(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function readToken(key: string) {
  // Use an existing login token; this client never manufactures authentication.
  try {
    const value = sessionStorage.getItem(key) || localStorage.getItem(key);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

function getServerId(body: unknown): string | undefined {
  const root = object(body);
  if (!root) return undefined;
  const candidates = [root, object(root.course), object(root.data)];
  for (const value of Object.values(root)) candidates.push(object(value));
  for (const candidate of candidates) {
    const value = candidate?.id ?? candidate?.ID;
    if (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
      return String(value);
    if (typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0)
      return value;
  }
  return undefined;
}

function errorMessage(
  status: number,
  body: unknown,
  action: "create" | "update",
) {
  const data = object(body);
  const detail =
    typeof data?.error === "string"
      ? data.error
      : typeof data?.message === "string"
        ? data.message
        : "";
  const defaults: Record<number, string> = {
    400: "The backend rejected the course details.",
    401: "Please sign in again. A valid login token is required.",
    403: `Your account does not have permission to ${action} courses.`,
    404:
      action === "create"
        ? "The course creation route was not found. Check the POST API path."
        : "The course update route or course ID was not found. Check the PUT API path and ID.",
    409: "A course with these details already exists.",
    422: "Please check the course details and try again.",
  };
  return `${detail || defaults[status] || `The backend could not ${action} this course.`} (HTTP ${status})`;
}

function coursePayload(candidate: ManagedCourse) {
  return {
    title: candidate.title,
    description: candidate.description,
    category: candidate.category,
    level: candidate.level,
    price: candidate.price,
    rating: candidate.rating,
    duration: candidate.hours,
    instructor: candidate.instructor,
  };
}

function authHeaders(config: ReturnType<typeof getConfig>, json = false) {
  const headers = new Headers(
    json ? { "Content-Type": "application/json" } : undefined,
  );
  if (!config.cookieAuth) {
    const token = readToken(config.tokenKey);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

/** Create a course and retain the database ID returned by the backend. */
export async function createCourse(
  candidate: ManagedCourse,
): Promise<ManagedCourse> {
  const config = getConfig();
  const headers = authHeaders(config, true);

  let response: Response;
  try {
    response = await fetch(courseCreationUrl(), {
      method: "POST",
      headers,
      credentials: config.cookieAuth ? "include" : "same-origin",
      body: JSON.stringify(coursePayload(candidate)),
    });
  } catch {
    throw new Error(
      "Could not connect to the backend. Check that it is running on the configured port and allows this frontend origin through CORS.",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok)
    throw new Error(errorMessage(response.status, body, "create"));

  const backendId = getServerId(body);
  return { ...candidate, id: backendId ?? candidate.id, backendId };
}

export async function updateCourseInApi(
  id: string,
  candidate: ManagedCourse,
): Promise<void> {
  const config = getConfig();
  let response: Response;
  try {
    response = await fetch(courseUpdateUrl(id), {
      method: "PUT",
      headers: authHeaders(config, true),
      credentials: config.cookieAuth ? "include" : "same-origin",
      body: JSON.stringify(coursePayload(candidate)),
    });
  } catch {
    throw new Error(
      "Could not connect to the backend. Check that it is running and allows this frontend origin through CORS.",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok)
    throw new Error(errorMessage(response.status, body, "update"));
}

export async function deleteCourseFromApi(id: string): Promise<void> {
  const config = getConfig();
  const headers = authHeaders(config);

  let response: Response;
  try {
    response = await fetch(courseDeletionUrl(id), {
      method: "DELETE",
      headers,
      credentials: config.cookieAuth ? "include" : "same-origin",
    });
  } catch {
    throw new Error(
      "Could not connect to the backend. Check that it is running and allows this frontend origin through CORS.",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    const data = object(body);
    const detail =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : response.status === 401
            ? "Please sign in again."
            : response.status === 403
              ? "Your account cannot delete courses."
              : response.status === 404
                ? "The course was not found on the backend."
                : "The backend could not delete this course.";
    throw new Error(`${detail} (HTTP ${response.status})`);
  }
}
