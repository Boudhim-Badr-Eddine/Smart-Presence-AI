import { test, expect } from "@playwright/test";

const BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const mockStudent = {
  id: 1,
  email: "student@test.com",
  role: "student" as const,
  last_login: null,
};

const mockResponses = {
  "**/api/auth/me": mockStudent,
  "**/api/student/notifications": {
    items: [
      { id: 1, title: "Test", message: "Message", type: "system", created_at: "2025-01-10T10:00:00Z", read: false },
      { id: 2, title: "Lu", message: "Message", type: "message", created_at: "2025-01-09T10:00:00Z", read: true },
    ],
  },
  "**/api/student/notifications/read-all": { ok: true },
  "**/api/student/notifications/**/read": { ok: true },
  "**/api/student/notifications/**": { ok: true },
  "**/api/student/feedback": { items: [] },
  "**/api/student/profile": {
    full_name: "Student Test",
    email: "student@test.com",
    phone: "+212 600-000000",
    city: "Casablanca",
    track: "Développement Web",
    cohort: "Promo 2025",
    language: "fr" as const,
    theme: "system" as const,
  },
  "**/api/student/calendar": {
    items: [
      { id: 1, title: "Cours", type: "session", date: "2025-01-15", time: "09:00", location: "A101" },
      { id: 2, title: "Examen", type: "exam", date: "2025-01-20", time: "10:00", location: "B202" },
      { id: 3, title: "Rappel", type: "reminder", date: "2025-01-12" },
    ],
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem("spa_access_token", "mock-token");
    localStorage.setItem("spa_user", JSON.stringify(user));
  }, mockStudent);

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    const entry = Object.entries(mockResponses).find(([pattern]) => new RegExp(pattern.replace(/\*\*/g, ".*"), "i").test(url));
    if (entry) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(entry[1]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
});

test.describe("Student pages (mocked API)", () => {
  test("notifications list and filters", async ({ page }) => {
    await page.goto(`${BASE_URL}/student/notifications`);

    await expect(page.getByText(/centre de notifications/i)).toBeVisible();
    await expect(page.getByText(/non lues/i)).toBeVisible();

    await page.getByTestId("notifications-filter-unread").click();
    await expect(page.getByText(/Non lue/)).toBeVisible();

    await page.getByTestId("notifications-mark-all").click();
    await expect(page.getByText(/Test/)).toBeVisible();
  });

  test("profile form renders and updates", async ({ page }) => {
    await page.goto(`${BASE_URL}/student/profile`);
    await expect(page.getByLabel(/Nom complet/i)).toHaveValue("Student Test");

    await page.fill('input[aria-label="Mot de passe actuel"]', "old");
    await page.fill('input[aria-label="Nouveau mot de passe"]', "new");
    await page.fill('input[aria-label="Confirmer le mot de passe"]', "new");
    await page.getByRole("button", { name: /Mettre à jour/i }).click();
  });

  test("calendar filters", async ({ page }) => {
    await page.goto(`${BASE_URL}/student/calendar`);
    await expect(page.getByText(/Calendrier unifié/i)).toBeVisible();

    await page.getByTestId("calendar-filter-exam").click();
    await expect(page.getByText(/Examen/)).toBeVisible();

    await page.getByTestId("calendar-filter-all").click();
    await expect(page.getByText(/Cours/)).toBeVisible();
  });
});
