const test = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");

function makeUrl(port, path) {
  return `http://127.0.0.1:${port}${path}`;
}

test("GET /api/health returns healthy response", async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(makeUrl(port, "/api/health"));
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
  } finally {
    server.close();
  }
});

test("POST /api/v1/auth/forgot-password route exists", async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(makeUrl(port, "/api/v1/auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const body = await res.json();

    assert.notEqual(res.status, 404);
    assert.equal(body.success, false);
    assert.match(String(body.message || ""), /email is required/i);
  } finally {
    server.close();
  }
});

test("POST /api/auth/forgot-password alias route exists", async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(makeUrl(port, "/api/auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const body = await res.json();

    assert.notEqual(res.status, 404);
    assert.equal(body.success, false);
    assert.match(String(body.message || ""), /email is required/i);
  } finally {
    server.close();
  }
});

test("POST /api/v1/auth/reset-password route exists", async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(makeUrl(port, "/api/v1/auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    assert.notEqual(res.status, 404);
  } finally {
    server.close();
  }
});

test("POST /api/admin/login route exists", async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(makeUrl(port, "/api/admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", password: "" })
    });

    assert.notEqual(res.status, 404);
  } finally {
    server.close();
  }
});

const protectedGetEndpoints = [
  "/api/v1/auth/me",
  "/api/auth/me",
  "/api/v1/users/me",
  "/api/users/me",
  "/api/v1/payments/summary",
  "/api/payments/summary",
  "/api/v1/payout-settings",
  "/api/payout-settings",
  "/api/v1/threads",
  "/api/threads",
  "/api/v1/notifications",
  "/api/notifications",
  "/api/v1/teacher-requests",
  "/api/teacher-requests",
  "/api/v1/sessions",
  "/api/sessions",
  "/api/v1/enrollments",
  "/api/enrollments",
  "/api/v1/messages/threads",
  "/api/messages/threads",
  "/api/v1/lessons/progress/summary",
  "/api/lessons/progress/summary",
  "/api/v1/invites/my",
  "/api/invites/my",
  "/api/v1/live-sessions/course/test-course",
  "/api/live-sessions/course/test-course",
  "/api/admin/dashboard-stats",
];

for (const endpoint of protectedGetEndpoints) {
  test(`GET ${endpoint} requires auth (route exists)`, async () => {
    const server = app.listen(0);
    try {
      const { port } = server.address();
      const res = await fetch(makeUrl(port, endpoint));

      assert.notEqual(res.status, 404);
      assert.equal(res.status, 401);
    } finally {
      server.close();
    }
  });
}
