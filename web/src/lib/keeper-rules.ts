// Pure functions for keeper rule evaluation — usable on the client.
import type { KeeperCandidate, AdpPlayer } from "./types";
import { adpToRound } from "./format";

export type KeeperCost = {
  candidate: KeeperCandidate;
  /** Round the keeper would cost in the upcoming draft. */
  cost_round: number;
  /** "draft" = drafted last year, use that round. "adp" = repeat keeper, use ADP. "fa" = free agent, last round. */
  cost_source: "draft" | "adp" | "fa";
  /** True if this player simply cannot be kept (rounds 1-3 of last draft). */
  ineligible_reason?: string;
  /** ADP for the player if it exists. */
  adp?: number | null;
};

export function bandForRound(rd: number): "blocked" | "rd_4_7" | "rd_8_16" | "free_agent" {
  if (rd <= 3) return "blocked";
  if (rd >= 4 && rd <= 7) return "rd_4_7";
  return "rd_8_16";
}

export function priceCandidate(
  c: KeeperCandidate,
  adpByPlayerId: Map<number, AdpPlayer>,
  teamCount: number,
  faaLastRound: number,
): KeeperCost {
  const adpEntry = adpByPlayerId.get(c.player_id);
  const adp = adpEntry?.adp ?? null;

  // Determine cost
  if (c.use_adp_next_year) {
    // Year 2+ as a keeper: cost = ADP-equivalent round
    if (adp != null) {
      const rd = adpToRound(adp, teamCount) ?? faaLastRound;
      return {
        candidate: c,
        cost_round: rd,
        cost_source: "adp",
        adp,
      };
    }
    // No ADP available — fall back to last round
    return {
      candidate: c,
      cost_round: faaLastRound,
      cost_source: "fa",
      adp: null,
      ineligible_reason: "No ADP data for repeat keeper — treating as last-round.",
    };
  }

  if (c.origin === "free_agent" || c.base_round_this_year == null) {
    // Free agent → last round
    return {
      candidate: c,
      cost_round: faaLastRound,
      cost_source: "fa",
      adp,
    };
  }

  // Standard year-1 keeper: cost = round drafted at last year
  const rd = c.base_round_this_year;
  if (rd <= 3) {
    return {
      candidate: c,
      cost_round: rd,
      cost_source: "draft",
      adp,
      ineligible_reason: `Drafted in round ${rd} — players in rounds 1-3 cannot be kept.`,
    };
  }
  return { candidate: c, cost_round: rd, cost_source: "draft", adp };
}

export type ValidationResult = {
  legal: boolean;
  reasons: string[];
};

export function validateKeeperSet(
  selected: KeeperCost[],
  rules: { max_total: number; max_rounds_4_to_7: number; max_rounds_8_to_16: number },
): ValidationResult {
  const reasons: string[] = [];
  if (selected.length > rules.max_total) {
    reasons.push(`More than ${rules.max_total} keepers selected.`);
  }
  for (const s of selected) {
    if (s.ineligible_reason && bandForRound(s.cost_round) === "blocked") {
      reasons.push(`${s.candidate.player_name}: ${s.ineligible_reason}`);
    }
  }
  const bands = selected.map((s) => bandForRound(s.cost_round));
  if (bands.filter((b) => b === "rd_4_7").length > rules.max_rounds_4_to_7) {
    reasons.push(`More than ${rules.max_rounds_4_to_7} keeper from rounds 4-7.`);
  }
  if (bands.filter((b) => b === "rd_8_16").length > rules.max_rounds_8_to_16) {
    reasons.push(`More than ${rules.max_rounds_8_to_16} keepers from rounds 8-16.`);
  }
  return { legal: reasons.length === 0, reasons };
}
