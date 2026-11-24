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
    expect(result.isPremiumPlus).toBeTrue();
    expect(result.canUseBlog).toBeTrue();
    expect(result.canUseMultiPage).toBeTrue();
    expect(result.trialUsed).toBeTrue();
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
    expect(result.isPremium).toBeFalse();
    expect(result.productLimit).toBe(5);
    expect(result.canUseGalleries).toBeFalse();
    expect(result.canUseMultiPage).toBeFalse();
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
    expect(result.isPremium).toBeTrue();
    expect(result.isPremiumPlus).toBeFalse();
    expect(result.canUseBlog).toBeFalse();
    expect(result.canUseServices).toBeFalse();
    expect(result.canUseMultiPage).toBeFalse();
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
    expect(result.isPremium).toBeFalse();
    expect(result.isPremiumPlus).toBeFalse();
    expect(result.lapsed).toBeTrue();
  });

  it("applies the 50% registration promo to the selected duration", () => {
    expect(subscriptionPlan.priceFor("one_page", 12, true)).toBe(9000);
    expect(subscriptionPlan.priceFor("premium_plus", 2, true)).toBe(3000);
    expect(subscriptionPlan.priceFor("premium_plus", 2, false)).toBe(6000);
  });
});
