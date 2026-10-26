// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  createCourse,
  courseCreationUrl,
  courseDeletionUrl,
  courseUpdateUrl,
  deleteCourseFromApi,
  updateCourseInApi,
} from "./courses";
import { courses } from "../data";
import type { ManagedCourse } from "../courses/CourseStore";

const candidate: ManagedCourse = {
  ...courses[0],
  id: "temporary-course-id",
  status: "draft",
  rating: 0,
  students: 0,
};
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8080");
  vi.stubEnv("VITE_COURSE_CREATE_PATH", "/api/admin/courses");
  vi.stubEnv("VITE_API_AUTH_MODE", "bearer");
  vi.stubEnv("VITE_AUTH_TOKEN_KEY", "token");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("posts the Go DTO, sends an existing Bearer token and retains the server-assigned ID", async () => {
  sessionStorage.setItem("token", "test-access-token");
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ course: { ID: 42 } }), { status: 201 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const result = await createCourse(candidate);
  expect(result.id).toBe("42");
  expect(result.backendId).toBe("42");
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("http://localhost:8080/api/admin/courses");
  expect(options.method).toBe("POST");
  expect(options.headers.get("Authorization")).toBe("Bearer test-access-token");
  expect(options.headers.get("Content-Type")).toBe("application/json");
  expect(JSON.parse(options.body)).toEqual({
    title: candidate.title,
    description: candidate.description,
    category: candidate.category,
    level: candidate.level,
    price: candidate.price,
    rating: 0,
    duration: candidate.hours,
    instructor: candidate.instructor,
  });
  expect(JSON.parse(options.body)).not.toHaveProperty("hours");
  expect(JSON.parse(options.body)).not.toHaveProperty("id");
});

test("supports configurable URLs and HttpOnly-cookie authentication without a Bearer header", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:9090/");
  vi.stubEnv("VITE_COURSE_CREATE_PATH", "/courses/create");
  vi.stubEnv("VITE_API_AUTH_MODE", "cookie");
  localStorage.setItem("token", "must-not-be-sent-in-cookie-mode");
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ id: "42" }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const result = await createCourse(candidate);
  expect(courseCreationUrl()).toBe("http://localhost:9090/courses/create");
  expect(result.id).toBe("42");
  expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
  expect(fetchMock.mock.calls[0][1].headers.has("Authorization")).toBe(false);
});

test.each([401, 403, 404, 409, 422, 500])(
  "rejects backend status %s instead of reporting success",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: "Rejected by backend" }), {
            status,
          }),
        ),
    );
    await expect(createCourse(candidate)).rejects.toThrow(
      `Rejected by backend (HTTP ${status})`,
    );
  },
);

test("explains network failures and does not convert them into local-only creation", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  await expect(createCourse(candidate)).rejects.toThrow(
    "Could not connect to the backend",
  );
});

test("accepts an empty successful response without inventing a backend ID", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 201 })),
  );
  const result = await createCourse(candidate);
  expect(result.id).toBe(candidate.id);
  expect(result.backendId).toBeUndefined();
});

test("reads the ID from the backend's successfully-created response wrapper", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ "successfully created": { id: 14 } }),
        { status: 201 },
      ),
    ),
  );

  const result = await createCourse(candidate);

  expect(result.id).toBe("14");
  expect(result.backendId).toBe("14");
});

test("updates a course through PUT with the Go DTO and Bearer token", async () => {
  localStorage.setItem("token", "update-token");
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ id: 42 }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await updateCourseInApi("42", {
    ...candidate,
    title: "Updated React",
    price: 79,
  });

  expect(courseUpdateUrl("42")).toBe(
    "http://localhost:8080/api/admin/courses/42",
  );
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("http://localhost:8080/api/admin/courses/42");
  expect(options.method).toBe("PUT");
  expect(options.headers.get("Authorization")).toBe("Bearer update-token");
  expect(options.headers.get("Content-Type")).toBe("application/json");
  expect(JSON.parse(options.body)).toMatchObject({
    title: "Updated React",
    price: 79,
    duration: candidate.hours,
  });
});

test("identifies a missing update route instead of calling it a create error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
  );

  await expect(updateCourseInApi("42", candidate)).rejects.toThrow(
    "The course update route or course ID was not found",
  );
});

test("deletes a course by backend ID with the existing Bearer token", async () => {
  sessionStorage.setItem("token", "test-access-token");
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);

  await deleteCourseFromApi("42");

  expect(courseDeletionUrl("42")).toBe(
    "http://localhost:8080/api/admin/courses/42",
  );
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("http://localhost:8080/api/admin/courses/42");
  expect(options.method).toBe("DELETE");
  expect(options.headers.get("Authorization")).toBe(
    "Bearer test-access-token",
  );
});

test("reports a backend delete error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
      }),
    ),
  );

  await expect(deleteCourseFromApi("999")).rejects.toThrow(
    "Course not found (HTTP 404)",
  );
});
