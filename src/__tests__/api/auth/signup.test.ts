/**
 * Tests for POST /api/auth/signup
 *
 * These test the signup route handler's validation and logic
 * by mocking Prisma and coin-service.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock Prisma
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// Mock coin-service
const mockGrantSignupBonus = vi.fn();
const mockGrantNewsletterBonus = vi.fn();

vi.mock("@/lib/coin-service", () => ({
  grantSignupBonus: (...args: unknown[]) => mockGrantSignupBonus(...args),
  grantNewsletterBonus: (...args: unknown[]) => mockGrantNewsletterBonus(...args),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password_123"),
  },
}));

// Import the route handler AFTER mocks are set up
import { POST } from "@/app/api/auth/signup/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if email is missing", async () => {
    const req = makeRequest({ name: "Test", password: "12345678" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 if password is too short", async () => {
    const req = makeRequest({
      name: "Test",
      email: "test@example.com",
      password: "short",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/8 characters/i);
  });

  it("returns 400 if name is missing", async () => {
    const req = makeRequest({
      email: "test@example.com",
      password: "12345678",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if email format is invalid", async () => {
    const req = makeRequest({
      name: "Test",
      email: "not-an-email",
      password: "12345678",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 409 if user already exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing-user", email: "test@example.com" });

    const req = makeRequest({
      name: "Test",
      email: "test@example.com",
      password: "12345678",
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/i);
  });

  it("creates user and grants signup bonus on valid input", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-user-id",
      name: "Test User",
      email: "test@example.com",
    });
    mockGrantSignupBonus.mockResolvedValue(undefined);

    const req = makeRequest({
      name: "Test User",
      email: "test@example.com",
      password: "secure_password_123",
      newsletter: false,
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.userId).toBe("new-user-id");

    // Verify Prisma was called correctly
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Test User",
          email: "test@example.com",
          passwordHash: "hashed_password_123",
          newsletterOptIn: false,
        }),
      })
    );

    // Verify signup bonus was granted
    expect(mockGrantSignupBonus).toHaveBeenCalledWith("new-user-id");

    // Verify newsletter bonus was NOT granted
    expect(mockGrantNewsletterBonus).not.toHaveBeenCalled();
  });

  it("grants newsletter bonus when opted in", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-user-id",
      name: "Newsletter Fan",
      email: "fan@example.com",
    });
    mockGrantSignupBonus.mockResolvedValue(undefined);
    mockGrantNewsletterBonus.mockResolvedValue(undefined);

    const req = makeRequest({
      name: "Newsletter Fan",
      email: "fan@example.com",
      password: "secure_password_123",
      newsletter: true,
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(mockGrantSignupBonus).toHaveBeenCalledWith("new-user-id");
    expect(mockGrantNewsletterBonus).toHaveBeenCalledWith("new-user-id");
  });

  it("returns 500 if Prisma throws", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error("DB connection failed"));

    const req = makeRequest({
      name: "Test",
      email: "test@example.com",
      password: "12345678",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});
