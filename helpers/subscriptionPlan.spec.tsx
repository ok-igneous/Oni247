import { describe, it, expect } from "vitest";
import { subscriptionPlan } from "./subscriptionPlan";

describe("subscriptionPlan", () => {
  const now = new Date("2026-10-03T10:00:00.000Z");

  it("keeps the one-time Premium Plus trial active for its seven-day window", () => {
    const result = subscriptionPlan.resolve({
      plan: "free",
      websitePlan: "one_page",
      trialEndsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      planRenewsAt: null,
      premiumTrialUsed: true,
    }, now);

    expect(result.source).toBe("trial");
    expect(result.isPremiumPlus).toBe(true);
    expect(result.canUseBlog).toBe(true);
    expect(result.canUseMultiPage).toBe(true);
    expect(result.trialUsed).toBe(true);
  });

  it("returns an expired trial to Free without removing the saved content", () => {
    const result = subscriptionPlan.resolve({
      plan: "free",
      websitePlan: "one_page",
      trialEndsAt: new Date(now.getTime() - 1000),
      planRenewsAt: null,
      premiumTrialUsed: true,
    }, now);

    expect(result.source).toBe("free");
    expect(result.isPremium).toBe(false);
    expect(result.productLimit).toBe(5);
    expect(result.canUseGalleries).toBe(false);
    expect(result.canUseMultiPage).toBe(false);
  });

  it("does not grant Premium Plus features to a paid One-Page subscription", () => {
    const result = subscriptionPlan.resolve({
      plan: "premium",
      websitePlan: "one_page",
      trialEndsAt: null,
      planRenewsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      premiumTrialUsed: true,
    }, now);

    expect(result.source).toBe("paid");
    expect(result.isPremium).toBe(true);
    expect(result.isPremiumPlus).toBe(false);
    expect(result.canUseBlog).toBe(false);
    expect(result.canUseServices).toBe(false);
    expect(result.canUseMultiPage).toBe(false);
  });

  it("treats an expired paid subscription as Free", () => {
    const result = subscriptionPlan.resolve({
      plan: "premium",
      websitePlan: "premium_plus",
      trialEndsAt: null,
      planRenewsAt: new Date(now.getTime() - 1000),
      premiumTrialUsed: true,
    }, now);

    expect(result.source).toBe("free");
    expect(result.isPremium).toBe(false);
    expect(result.isPremiumPlus).toBe(false);
    expect(result.lapsed).toBe(true);
  });

  it("allows custom domains only for an active paid subscription, never for trials", () => {
    const paid = subscriptionPlan.resolve({
      plan: "premium",
      websitePlan: "one_page",
      trialEndsAt: null,
      planRenewsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      premiumTrialUsed: true,
    }, now);
    const trial = subscriptionPlan.resolve({
      plan: "free",
      websitePlan: "one_page",
      trialEndsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      planRenewsAt: null,
      premiumTrialUsed: true,
    }, now);
    const expired = subscriptionPlan.resolve({
      plan: "premium",
      websitePlan: "premium_plus",
      trialEndsAt: null,
      planRenewsAt: new Date(now.getTime() - 1000),
      premiumTrialUsed: true,
    }, now);

    expect(paid.canUseCustomDomain).toBe(true);
    expect(trial.canUseCustomDomain).toBe(false);
    expect(expired.canUseCustomDomain).toBe(false);
  });

  it("applies the 50% registration promo to the selected duration", () => {
    expect(subscriptionPlan.priceFor("one_page", 12, true)).toBe(9000);
    expect(subscriptionPlan.priceFor("premium_plus", 2, true)).toBe(3000);
    expect(subscriptionPlan.priceFor("premium_plus", 2, false)).toBe(6000);
  });
});
