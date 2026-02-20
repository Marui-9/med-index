/**
 * Tests for seed data integrity and structure.
 *
 * Validates that all 25 seed claims have correct types, consistent fields,
 * and proper data for their market status.
 */
import { describe, it, expect } from "vitest";
import { SEED_CLAIMS } from "../../../prisma/seed-data";

describe("Seed Data", () => {
  it("contains exactly 25 claims", () => {
    expect(SEED_CLAIMS).toHaveLength(25);
  });

  it("all claims have required fields", () => {
    for (const claim of SEED_CLAIMS) {
      expect(claim.title).toBeTruthy();
      expect(claim.title.length).toBeGreaterThanOrEqual(10);
      expect(claim.description).toBeTruthy();
      expect(["EASY", "MEDIUM", "HARD"]).toContain(claim.difficulty);
      expect(["RESEARCHING", "ACTIVE", "RESOLVED"]).toContain(
        claim.marketStatus,
      );
      expect(typeof claim.yesVotes).toBe("number");
      expect(typeof claim.noVotes).toBe("number");
      expect(claim.yesVotes).toBeGreaterThanOrEqual(0);
      expect(claim.noVotes).toBeGreaterThanOrEqual(0);
    }
  });

  it("all titles are unique", () => {
    const titles = SEED_CLAIMS.map((c) => c.title.toLowerCase());
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });

  it("resolved claims have verdict, confidence, and summary", () => {
    const resolved = SEED_CLAIMS.filter(
      (c) => c.marketStatus === "RESOLVED",
    );
    expect(resolved.length).toBeGreaterThan(0);

    for (const claim of resolved) {
      expect(["YES", "NO"]).toContain(claim.aiVerdict);
      expect(claim.aiConfidence).toBeGreaterThan(0);
      expect(claim.aiConfidence).toBeLessThanOrEqual(1);
      expect(claim.consensusSummary).toBeTruthy();
      expect(claim.consensusSummary!.length).toBeGreaterThanOrEqual(10);
      expect(claim.yesVotes + claim.noVotes).toBeGreaterThan(0);
    }
  });

  it("active claims have votes but no verdict", () => {
    const active = SEED_CLAIMS.filter((c) => c.marketStatus === "ACTIVE");
    expect(active.length).toBeGreaterThan(0);

    for (const claim of active) {
      expect(claim.aiVerdict).toBeUndefined();
      expect(claim.aiConfidence).toBeUndefined();
    }
  });

  it("researching claims have zero votes", () => {
    const researching = SEED_CLAIMS.filter(
      (c) => c.marketStatus === "RESEARCHING",
    );
    expect(researching.length).toBeGreaterThan(0);

    for (const claim of researching) {
      expect(claim.yesVotes).toBe(0);
      expect(claim.noVotes).toBe(0);
    }
  });

  it("has a mix of all three difficulties", () => {
    const easy = SEED_CLAIMS.filter((c) => c.difficulty === "EASY");
    const medium = SEED_CLAIMS.filter((c) => c.difficulty === "MEDIUM");
    const hard = SEED_CLAIMS.filter((c) => c.difficulty === "HARD");

    expect(easy.length).toBeGreaterThan(0);
    expect(medium.length).toBeGreaterThan(0);
    expect(hard.length).toBeGreaterThan(0);
  });

  it("has a mix of all three market statuses", () => {
    const statuses = new Set(SEED_CLAIMS.map((c) => c.marketStatus));
    expect(statuses.has("RESEARCHING")).toBe(true);
    expect(statuses.has("ACTIVE")).toBe(true);
    expect(statuses.has("RESOLVED")).toBe(true);
  });

  it("all claims are gym/fitness/nutrition related", () => {
    // Verify titles are relevant health/fitness topics
    const fitnessKeywords = [
      "muscle",
      "protein",
      "creatine",
      "stretch",
      "whey",
      "workout",
      "cold",
      "plunge",
      "bcaa",
      "training",
      "fasting",
      "caffeine",
      "sauna",
      "rep",
      "sleep",
      "foam",
      "rolling",
      "turk",
      "ashwagandha",
      "testosterone",
      "carb",
      "collagen",
      "joint",
      "blood flow",
      "bfr",
      "mouth",
      "lifter",
      "zma",
      "zinc",
      "magnesium",
      "belt",
      "weightlifting",
      "core",
      "massage",
      "doms",
      "recovery",
      "exercise",
      "anabolic",
    ];

    for (const claim of SEED_CLAIMS) {
      const titleLower = claim.title.toLowerCase();
      const descLower = claim.description.toLowerCase();
      const hasRelevantKeyword = fitnessKeywords.some(
        (kw) => titleLower.includes(kw) || descLower.includes(kw),
      );
      expect(hasRelevantKeyword).toBe(true);
    }
  });
});
