// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../main";
import { courses } from "../data";
import { COURSE_STORAGE_KEY } from "../courses/CourseStore";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ course: { ID: 101 } }), {
            status: 201,
          }),
      ),
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  // jsdom has no native dialog implementation; real-browser checks exercise it.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function open(path = "/admin") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

async function fillNewCourse(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Course title"), "Go API Essentials");
  await user.type(
    screen.getByLabelText("Course description"),
    "Build useful APIs with Go, Gin, and PostgreSQL through a practical project.",
  );
  await user.type(screen.getByLabelText("Instructor name"), "Ozod Hamzayev");
  await user.type(screen.getByLabelText("Subject / technology"), "Go");
  await user.type(screen.getByLabelText("Duration (hours)"), "12");
}

test("backend errors appear in the form and a retry creates only one cached course", async () => {
  const user = userEvent.setup();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Course already exists" }), {
        status: 409,
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 202 }), { status: 201 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  open("/admin/courses/new");
  await fillNewCourse(user);
  await user.click(screen.getByRole("button", { name: "Create course" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Course already exists (HTTP 409)",
  );
  expect(localStorage.getItem(COURSE_STORAGE_KEY)).toBeNull();
  expect(
    (screen.getByLabelText("Course title") as HTMLInputElement).value,
  ).toBe("Go API Essentials");
  await user.click(screen.getByRole("button", { name: "Create course" }));
  expect(
    await screen.findByText(
      "“Go API Essentials” was created successfully.",
    ),
  ).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(COURSE_STORAGE_KEY)!)).toHaveLength(
    13,
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("a pending submission disables the form and repeated submit events do not duplicate POST", async () => {
  const user = userEvent.setup();
  let finish: (value: Response) => void = () => {};
  const fetchMock = vi.fn().mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  open("/admin/courses/new");
  await fillNewCourse(user);
  await user.click(screen.getByRole("button", { name: "Create course" }));
  expect(
    (
      screen.getByRole("button", {
        name: "Creating course…",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.submit(document.querySelector("form.admin-editor-grid")!);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  finish(
    new Response(JSON.stringify({ course: { id: 303 } }), { status: 201 }),
  );
  expect(
    await screen.findByText(
      "“Go API Essentials” was created successfully.",
    ),
  ).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(COURSE_STORAGE_KEY)!)[0].id).toBe(
    "303",
  );
});

test("create validates integer fields used by the Go model before sending a request", async () => {
  const user = userEvent.setup();
  open("/admin/courses/new");
  await fillNewCourse(user);
  await user.clear(screen.getByLabelText("Price (USD)"));
  await user.type(screen.getByLabelText("Price (USD)"), "12.50");
  await user.clear(screen.getByLabelText("Duration (hours)"));
  await user.type(screen.getByLabelText("Duration (hours)"), "1.5");
  await user.click(screen.getByRole("button", { name: "Create course" }));
  expect(
    screen.getByText(
      "The current backend accepts whole-dollar prices. Enter a whole number.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText("The current backend accepts a whole number of hours."),
  ).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});

test("a browser cache failure after server creation does not offer to submit the POST again", async () => {
  const user = userEvent.setup();
  open("/admin/courses/new");
  await fillNewCourse(user);
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (key === COURSE_STORAGE_KEY)
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    original.call(this, key, value);
  });
  await user.click(screen.getByRole("button", { name: "Create course" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "The course was created on the backend",
  );
  expect(
    await screen.findByRole("heading", { name: "Your course library." }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Create course" })).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("create validates the form and publishes a persistent course to the student catalog", async () => {
  const user = userEvent.setup();
  const view = open("/admin/courses/new");
  await user.click(screen.getByRole("button", { name: "Create course" }));
  expect(
    screen.getByText("Give your course a title of at least 3 characters."),
  ).toBeTruthy();
  expect(localStorage.getItem(COURSE_STORAGE_KEY)).toBeNull();
  await user.type(screen.getByLabelText("Course title"), "Build APIs with Go");
  await user.type(
    screen.getByLabelText("Course description"),
    "Build practical APIs with Go, Gin, and PostgreSQL through a complete project.",
  );
  await user.type(screen.getByLabelText("Instructor name"), "Ozod Hamzayev");
  await user.type(screen.getByLabelText("Subject / technology"), "Go");
  await user.type(screen.getByLabelText("Duration (hours)"), "14");
  await user.selectOptions(screen.getByLabelText("Visibility"), "published");
  await user.click(screen.getByRole("button", { name: "Create course" }));
  expect(
    await screen.findByText(
      "“Build APIs with Go” was created successfully.",
    ),
  ).toBeTruthy();
  const stored = JSON.parse(localStorage.getItem(COURSE_STORAGE_KEY)!);
  expect(stored).toHaveLength(13);
  expect(stored[0]).toMatchObject({
    title: "Build APIs with Go",
    price: 0,
    hours: 14,
    initials: "OH",
    status: "published",
    id: "101",
    backendId: "101",
  });
  view.unmount();
  open("/courses");
  expect(
    screen.getByRole("heading", { name: "Build APIs with Go" }),
  ).toBeTruthy();
  expect(document.querySelectorAll(".course-card")).toHaveLength(13);
});

test("editing preserves course identity and updates its public detail page", async () => {
  const user = userEvent.setup();
  const view = open("/admin/courses/react/edit");
  await user.clear(screen.getByLabelText("Course title"));
  await user.type(screen.getByLabelText("Course title"), "React in Practice");
  await user.clear(screen.getByLabelText("Price (USD)"));
  await user.type(screen.getByLabelText("Price (USD)"), "64.50");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect(
    await screen.findByText("“React in Practice” was updated successfully."),
  ).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith(
    "http://localhost:8080/api/admin/courses/react",
    expect.objectContaining({ method: "PUT" }),
  );
  const updated = JSON.parse(localStorage.getItem(COURSE_STORAGE_KEY)!).find(
    (c: { id: string }) => c.id === "react",
  );
  expect(updated).toMatchObject({
    title: "React in Practice",
    price: 64.5,
    rating: 4.9,
    students: 12480,
  });
  view.unmount();
  open("/courses/react");
  expect(
    screen.getByRole("heading", { name: "React in Practice", level: 1 }),
  ).toBeTruthy();
});

test("draft courses stay out of the public catalog until published", async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    COURSE_STORAGE_KEY,
    JSON.stringify(
      courses.map((c) => ({
        ...c,
        status: c.id === "react" ? "draft" : "published",
      })),
    ),
  );
  const view = open("/courses");
  expect(screen.queryByRole("heading", { name: courses[0].title })).toBeNull();
  view.unmount();
  const admin = open();
  await user.click(
    screen.getByRole("button", { name: `Publish ${courses[0].title}` }),
  );
  expect(JSON.parse(localStorage.getItem(COURSE_STORAGE_KEY)!)[0].status).toBe(
    "published",
  );
  admin.unmount();
  open("/courses/react");
  expect(
    screen.getByRole("heading", { name: courses[0].title, level: 1 }),
  ).toBeTruthy();
});

test("deletion requires confirmation and removes saved, enrolled and progress references", async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    "devpath",
    JSON.stringify({
      saved: ["react"],
      enrolled: ["react"],
      progress: { react: [0, 1] },
      user: "Alex",
      theme: "midnight",
    }),
  );
  const view = open();
  await user.click(
    screen.getByRole("button", { name: `Delete ${courses[0].title}` }),
  );
  await user.click(screen.getByRole("button", { name: "Keep course" }));
  expect(screen.getByRole("link", { name: courses[0].title })).toBeTruthy();
  await user.click(
    screen.getByRole("button", { name: `Delete ${courses[0].title}` }),
  );
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Delete course",
    }),
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole("link", { name: courses[0].title })).toBeNull();
  expect(JSON.parse(localStorage.getItem("devpath")!)).toMatchObject({
    saved: [],
    enrolled: [],
    progress: {},
  });
  view.unmount();
  open("/courses/react");
  expect(
    screen.getByRole("heading", { name: "This path hasn’t been built yet." }),
  ).toBeTruthy();
});

test("deletion sends a numeric backend ID for a database course", async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    COURSE_STORAGE_KEY,
    JSON.stringify([
      { ...courses[0], id: "17", backendId: "17", status: "published" },
    ]),
  );
  open();

  await user.click(
    screen.getByRole("button", { name: `Delete ${courses[0].title}` }),
  );
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Delete course",
    }),
  );

  expect(fetch).toHaveBeenCalledWith(
    "http://localhost:8080/api/admin/courses/17",
    expect.objectContaining({ method: "DELETE" }),
  );
});

test("admin search, status filters, reset and pagination are functional", async () => {
  const user = userEvent.setup();
  open();
  expect(document.querySelectorAll("tbody tr")).toHaveLength(6);
  await user.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Showing 7–12 of 12 courses")).toBeTruthy();
  await user.type(screen.getByLabelText("Search admin courses"), "Python");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
  await user.selectOptions(
    screen.getByLabelText("Filter by course status"),
    "draft",
  );
  expect(screen.getByText("A little off the path?")).toBeTruthy();
  await user.click(screen.getAllByRole("button", { name: "Reset filters" })[0]);
  expect(screen.getByText("Showing 1–6 of 12 courses")).toBeTruthy();
});

test("an empty library survives reload and cancelling a new course does not create one", async () => {
  const user = userEvent.setup();
  localStorage.setItem(COURSE_STORAGE_KEY, "[]");
  const view = open();
  expect(
    screen.getByText("Every library starts with one course."),
  ).toBeTruthy();
  await user.click(
    screen.getByRole("link", { name: "Create your first course" }),
  );
  await user.type(screen.getByLabelText("Course title"), "Unfinished course");
  await user.click(screen.getByRole("link", { name: "Cancel" }));
  expect(
    screen.getByText("Every library starts with one course."),
  ).toBeTruthy();
  expect(localStorage.getItem(COURSE_STORAGE_KEY)).toBe("[]");
  view.unmount();
  open("/");
  expect(
    screen
      .getByRole("link", { name: "Continue learning" })
      .getAttribute("href"),
  ).toBe("/courses");
});

test("storage failures are reported without pretending changes were saved", async () => {
  const user = userEvent.setup();
  open("/admin/courses/react/edit");
  await user.clear(screen.getByLabelText("Course title"));
  await user.type(screen.getByLabelText("Course title"), "Unsaved edit");
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (key === COURSE_STORAGE_KEY)
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    original.call(this, key, value);
  });
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect(screen.getByRole("alert").textContent).toContain(
    "Changes could not be saved",
  );
  expect(screen.queryByText("was updated successfully.")).toBeNull();
});
