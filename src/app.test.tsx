// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "./main";
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
test("search, filters, reset, empty results and saved courses persist", async () => {
  const user = userEvent.setup();
  open("/courses");
  expect(document.querySelectorAll(".course-card")).toHaveLength(12);
  const input = screen.getByLabelText("Search by course title");
  await user.type(input, "React");
  expect(document.querySelectorAll(".course-card")).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Save course" }));
  expect(JSON.parse(localStorage.getItem("devpath")!).saved).toEqual(["react"]);
  await user.click(screen.getByRole("button", { name: "Reset filters" }));
  await user.selectOptions(screen.getByLabelText("Price"), "free");
  expect(document.querySelectorAll(".course-card")).toHaveLength(3);
  await user.selectOptions(screen.getByLabelText("Difficulty"), "Advanced");
  expect(screen.getByText("No courses on this path yet.")).toBeTruthy();
  await user.click(screen.getAllByRole("button", { name: "Reset filters" })[0]);
  expect(document.querySelectorAll(".course-card")).toHaveLength(12);
  await user.selectOptions(screen.getByLabelText("Category"), "Design");
  expect(document.querySelectorAll(".course-card")).toHaveLength(1);
});
test("enroll, open lesson, complete, navigate and restore progress", async () => {
  const user = userEvent.setup();
  const view = open("/courses/react");
  await user.click(
    screen.getByRole("button", { name: /Enroll in this course/ }),
  );
  expect(JSON.parse(localStorage.getItem("devpath")!).enrolled).toEqual([
    "react",
  ]);
  await user.click(screen.getByRole("link", { name: /Continue Learning/ }));
  expect(
    screen.getByRole("heading", { name: "Welcome to your learning path" }),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Mark Complete" }));
  expect(JSON.parse(localStorage.getItem("devpath")!).progress.react).toEqual([
    0,
  ]);
  await user.click(screen.getByRole("button", { name: "Next lesson" }));
  expect(
    screen.getByRole("heading", {
      name: "Setting up your workspace",
      level: 1,
    }),
  ).toBeTruthy();
  view.unmount();
  open("/dashboard");
  expect(screen.getByText("1 of 9 lessons completed")).toBeTruthy();
  expect(screen.getByText("11%")).toBeTruthy();
});
test("demo authentication validates, toggles password and stores no password", async () => {
  const user = userEvent.setup();
  open("/signup");
  await user.click(screen.getByRole("button", { name: /Start demo learning/ }));
  expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
  await user.type(screen.getByLabelText(/^Your name/), "Alex Morgan");
  await user.type(screen.getByLabelText(/^Email address/), "alex@example.com");
  await user.type(screen.getByLabelText(/^Password/), "demo12345");
  await user.click(screen.getByRole("button", { name: "Show password" }));
  expect((screen.getByLabelText(/^Password/) as HTMLInputElement).type).toBe(
    "text",
  );
  await user.click(screen.getByRole("button", { name: /Start demo learning/ }));
  expect(
    screen.getByRole("heading", { name: "Welcome back, Alex." }),
  ).toBeTruthy();
  const stored = localStorage.getItem("devpath")!;
  expect(stored).not.toContain("demo12345");
  expect(stored).not.toContain("alex@example.com");
});
test("mobile navigation and dark preference work", async () => {
  const user = userEvent.setup();
  open("/");
  await user.click(screen.getByRole("button", { name: "Toggle navigation" }));
  expect(document.querySelector(".mobile-nav")).toBeTruthy();
  await user.click(
    within(document.querySelector(".mobile-nav") as HTMLElement).getByText(
      "My Learning",
    ),
  );
  expect(
    screen.getByRole("heading", { name: "Welcome to your learning space." }),
  ).toBeTruthy();
  await user.click(
    screen.getByLabelText("Switch between midnight and dusk dark themes"),
  );
  expect(JSON.parse(localStorage.getItem("devpath")!).theme).toBe("dusk");
});
