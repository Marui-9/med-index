/**
 * Seed data: 25 gym / fitness / nutrition health claims.
 *
 * Each claim has a title, optional description, difficulty, market status,
 * simulated vote counts, and optionally an AI verdict with confidence score.
 */

import type { ClaimDifficulty, MarketStatus, ForecastSide } from "@prisma/client";

export interface SeedClaim {
  title: string;
  description: string;
  difficulty: ClaimDifficulty;
  marketStatus: MarketStatus;
  yesVotes: number;
  noVotes: number;
  aiVerdict?: ForecastSide;
  aiConfidence?: number;
  consensusSummary?: string;
}

export const SEED_CLAIMS: SeedClaim[] = [
  // ── EASY claims ──────────────────────────────────────────────────────
  {
    title: "Creatine monohydrate increases lean muscle mass",
    description:
      "Creatine is one of the most studied sports supplements. Proponents claim it directly increases muscle mass when combined with resistance training.",
    difficulty: "EASY",
    marketStatus: "RESOLVED",
    yesVotes: 187,
    noVotes: 12,
    aiVerdict: "YES",
    aiConfidence: 0.96,
    consensusSummary:
      "Meta-analyses consistently show creatine supplementation (3-5 g/day) combined with resistance training increases lean body mass by ~1-2 kg over 4-12 weeks compared to placebo.",
  },
  {
    title: "Protein intake of 1.6 g/kg/day maximizes muscle protein synthesis",
    description:
      "A commonly cited threshold for daily protein intake to optimize muscle growth in resistance-trained individuals.",
    difficulty: "EASY",
    marketStatus: "RESOLVED",
    yesVotes: 154,
    noVotes: 28,
    aiVerdict: "YES",
    aiConfidence: 0.89,
    consensusSummary:
      "A 2018 meta-analysis by Morton et al. found that intakes above ~1.6 g/kg/day did not further increase fat-free mass gains. Evidence strongly supports this as a practical ceiling.",
  },
  {
    title: "Stretching before exercise prevents injuries",
    description:
      "Static stretching before workouts is a long-standing gym practice. But does the evidence support injury prevention?",
    difficulty: "EASY",
    marketStatus: "RESOLVED",
    yesVotes: 41,
    noVotes: 139,
    aiVerdict: "NO",
    aiConfidence: 0.82,
    consensusSummary:
      "Multiple systematic reviews show static stretching alone before exercise does not significantly reduce overall injury risk. Dynamic warm-ups are more effective.",
  },
  {
    title: "Whey protein is superior to plant protein for muscle growth",
    description:
      "Animal-derived whey protein has a higher leucine content and DIAAS score. Does this translate to better real-world muscle growth?",
    difficulty: "EASY",
    marketStatus: "ACTIVE",
    yesVotes: 96,
    noVotes: 72,
  },
  {
    title: "You need to eat within 30 minutes after a workout (anabolic window)",
    description:
      "The 'anabolic window' theory suggests that delaying post-workout protein intake reduces muscle repair and growth.",
    difficulty: "EASY",
    marketStatus: "RESOLVED",
    yesVotes: 38,
    noVotes: 162,
    aiVerdict: "NO",
    aiConfidence: 0.91,
    consensusSummary:
      "Research shows the anabolic window is much wider than 30 minutes. Total daily protein intake matters far more than precise timing around workouts.",
  },

  // ── MEDIUM claims ────────────────────────────────────────────────────
  {
    title: "Cold plunges after training improve recovery and reduce muscle soreness",
    description:
      "Cold water immersion (ice baths, cold plunges) is popular among athletes for post-exercise recovery. Does the evidence support it?",
    difficulty: "MEDIUM",
    marketStatus: "ACTIVE",
    yesVotes: 83,
    noVotes: 67,
  },
  {
    title: "BCAAs are unnecessary if daily protein intake is adequate",
    description:
      "Branched-chain amino acids (BCAAs) are heavily marketed, but some experts argue they add nothing beyond whole-protein sources.",
    difficulty: "MEDIUM",
    marketStatus: "RESOLVED",
    yesVotes: 128,
    noVotes: 34,
    aiVerdict: "YES",
    aiConfidence: 0.88,
    consensusSummary:
      "When total protein intake meets recommendations (≥1.6 g/kg/day), additional BCAA supplementation provides no significant benefit for muscle growth or recovery.",
  },
  {
    title: "Training to failure is necessary for maximum hypertrophy",
    description:
      "Should every set in a resistance training program be taken to muscular failure for optimal muscle growth?",
    difficulty: "MEDIUM",
    marketStatus: "ACTIVE",
    yesVotes: 55,
    noVotes: 89,
  },
  {
    title: "Intermittent fasting preserves muscle mass during a cut",
    description:
      "Proponents claim that intermittent fasting (16:8 or similar) protects lean mass better than continuous caloric restriction.",
    difficulty: "MEDIUM",
    marketStatus: "ACTIVE",
    yesVotes: 61,
    noVotes: 78,
  },
  {
    title: "Caffeine supplementation improves strength and endurance performance",
    description:
      "Caffeine is one of the most widely consumed ergogenic aids. Evidence suggests it enhances exercise capacity.",
    difficulty: "MEDIUM",
    marketStatus: "RESOLVED",
    yesVotes: 171,
    noVotes: 15,
    aiVerdict: "YES",
    aiConfidence: 0.94,
    consensusSummary:
      "Caffeine (3-6 mg/kg) has robust evidence for improving both endurance performance and maximal strength. Effects are consistent across multiple meta-analyses.",
  },
  {
    title: "Sauna use after workouts accelerates muscle recovery",
    description:
      "Sauna bathing is increasingly popular in gym culture. Claims include improved blood flow, reduced DOMS, and faster recovery.",
    difficulty: "MEDIUM",
    marketStatus: "ACTIVE",
    yesVotes: 44,
    noVotes: 36,
  },
  {
    title: "High-rep training (15-30 reps) builds as much muscle as low-rep training (6-12 reps)",
    description:
      "Traditional bodybuilding favors moderate rep ranges. Newer research challenges whether low-load training can produce equal hypertrophy.",
    difficulty: "MEDIUM",
    marketStatus: "ACTIVE",
    yesVotes: 72,
    noVotes: 68,
  },
  {
    title: "Sleeping less than 7 hours significantly impairs muscle recovery",
    description:
      "Sleep is often called the most important recovery tool. How strong is the evidence that insufficient sleep reduces gains?",
    difficulty: "MEDIUM",
    marketStatus: "RESOLVED",
    yesVotes: 156,
    noVotes: 22,
    aiVerdict: "YES",
    aiConfidence: 0.87,
    consensusSummary:
      "Sleep restriction (<7 h/night) impairs anabolic hormones (testosterone, GH), increases cortisol, and reduces muscle protein synthesis. Multiple studies confirm a meaningful negative effect on recovery.",
  },
  {
    title: "Foam rolling improves range of motion without decreasing strength",
    description:
      "Self-myofascial release (foam rolling) is widely used as a warm-up tool. Does it actually improve mobility while preserving force output?",
    difficulty: "MEDIUM",
    marketStatus: "ACTIVE",
    yesVotes: 62,
    noVotes: 29,
  },

  // ── HARD claims ──────────────────────────────────────────────────────
  {
    title: "Turkesterone supplementation increases muscle growth in humans",
    description:
      "Turkesterone, an ecdysteroid, went viral on social media as a natural anabolic. In vitro studies showed promise, but human data is limited.",
    difficulty: "HARD",
    marketStatus: "ACTIVE",
    yesVotes: 38,
    noVotes: 91,
  },
  {
    title: "Ashwagandha supplementation meaningfully increases testosterone levels",
    description:
      "Ashwagandha (KSM-66) is marketed as a natural testosterone booster. Some RCTs show modest increases, but clinical significance is debated.",
    difficulty: "HARD",
    marketStatus: "ACTIVE",
    yesVotes: 52,
    noVotes: 64,
  },
  {
    title: "Carb cycling is more effective for body recomposition than steady macros",
    description:
      "Alternating high-carb and low-carb days supposedly optimizes fat loss and muscle gain simultaneously. Strong claims, limited controlled data.",
    difficulty: "HARD",
    marketStatus: "ACTIVE",
    yesVotes: 29,
    noVotes: 47,
  },
  {
    title: "Collagen peptides improve joint health and reduce exercise-related joint pain",
    description:
      "Collagen supplements are a growing segment of the sports nutrition market. Do hydrolyzed collagen peptides actually benefit connective tissue?",
    difficulty: "HARD",
    marketStatus: "ACTIVE",
    yesVotes: 68,
    noVotes: 53,
  },
  {
    title: "Blood flow restriction (BFR) training builds comparable muscle to heavy lifting",
    description:
      "BFR uses bands or cuffs to restrict venous return during low-load exercise. Proponents claim it can substitute for heavy weights.",
    difficulty: "HARD",
    marketStatus: "ACTIVE",
    yesVotes: 45,
    noVotes: 41,
  },
  {
    title: "Consuming more than 40g of protein per meal is wasted for muscle growth",
    description:
      "A persistent myth suggests the body can only use ~40g of protein per meal for muscle protein synthesis, with excess being oxidized.",
    difficulty: "HARD",
    marketStatus: "RESOLVED",
    yesVotes: 34,
    noVotes: 112,
    aiVerdict: "NO",
    aiConfidence: 0.85,
    consensusSummary:
      "Recent research (e.g., Trommelen et al. 2023) shows that higher per-meal doses (up to 100g) continue stimulating MPS, though with diminishing returns. The 40g ceiling is a simplification.",
  },
  {
    title: "Mouth taping during sleep improves recovery and athletic performance",
    description:
      "A viral biohacking trend claims that taping the mouth shut during sleep promotes nasal breathing, improving sleep quality and recovery.",
    difficulty: "HARD",
    marketStatus: "RESEARCHING",
    yesVotes: 0,
    noVotes: 0,
  },
  {
    title: "Natural lifters cannot gain more than 0.5 lb of muscle per week",
    description:
      "The Lyle McDonald and Alan Aragon models suggest diminishing returns on muscle growth. Can beginners truly exceed this rate?",
    difficulty: "HARD",
    marketStatus: "ACTIVE",
    yesVotes: 58,
    noVotes: 63,
  },
  {
    title: "Zinc and magnesium (ZMA) supplementation improves sleep quality in athletes",
    description:
      "ZMA is a popular sports supplement combining zinc, magnesium, and vitamin B6. Marketed primarily for sleep and testosterone.",
    difficulty: "HARD",
    marketStatus: "ACTIVE",
    yesVotes: 39,
    noVotes: 48,
  },
  {
    title: "Wearing a weightlifting belt reduces core muscle activation",
    description:
      "Critics argue that belts create a dependency and weaken the core over time. Supporters say belts increase intra-abdominal pressure safely.",
    difficulty: "HARD",
    marketStatus: "RESOLVED",
    yesVotes: 28,
    noVotes: 134,
    aiVerdict: "NO",
    aiConfidence: 0.83,
    consensusSummary:
      "EMG studies show that wearing a belt does NOT reduce core muscle activation. In fact, belts typically increase intra-abdominal pressure and trunk stability during heavy lifts.",
  },
  {
    title: "Massage guns are as effective as manual massage for reducing DOMS",
    description:
      "Percussive therapy devices have become ubiquitous in gyms. Are they comparable to traditional sports massage for soreness reduction?",
    difficulty: "HARD",
    marketStatus: "ACTIVE",
    yesVotes: 51,
    noVotes: 37,
  },
];
