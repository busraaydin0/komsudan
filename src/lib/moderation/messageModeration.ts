import { hasPersonalInfo } from "./personalInfo";
import { hasProfanity } from "./profanity";
import { isOffPlatform } from "./offPlatform";
import { looksLikeSpam } from "./spam";

export type ModerationDecision = "allow" | "warn" | "block";

export type ModerationResult = {
  decision: ModerationDecision;
  reason: string | null;
};

export function moderateMessage(body: string): ModerationResult {
  if (hasProfanity(body) || hasPersonalInfo(body) || looksLikeSpam(body)) {
    return { decision: "block", reason: "policy" };
  }
  if (isOffPlatform(body)) {
    return { decision: "warn", reason: "off_platform" };
  }
  return { decision: "allow", reason: null };
}

export { normalizeForMatch } from "./normalize";
