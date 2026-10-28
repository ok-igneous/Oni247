import { subscriptionPlan } from "./subscriptionPlan";

describe("subscriptionPlan", () => {
  const now = new Date("2026-10-03T10:00:00.000Z");

  it("keeps the one-time Premium Plus trial active for its seven-day window", () => {
    const result = subscriptionPlan.resolve({
      plan: "free",
      websitePlan: "one_page",
   10	      trialEndsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
   11	      planRenewsAt: null,
   12	      premiumTrialUsed: true,
   13	    }, now);
   14	
   15	    expect(result.source).toBe("trial");
   16	    expect(result.isPremiumPlus).toBeTrue();
   17	    expect(result.canUseBlog).toBeTrue();
   18	    expect(result.canUseMultiPage).toBeTrue();
   19	    expect(result.trialUsed).toBeTrue();
   20	  });
   21	
   22	  it("returns an expired trial to Free without removing the saved content", () => {
   23	    const result = subscriptionPlan.resolve({
   24	      plan: "free",
   25	      websitePlan: "one_page",
   26	      trialEndsAt: new Date(now.getTime() - 1000),
   27	      planRenewsAt: null,
   28	      premiumTrialUsed: true,
   29	    }, now);
   30	
   31	    expect(result.source).toBe("free");
   32	    expect(result.isPremium).toBeFalse();
   33	    expect(result.productLimit).toBe(5);
   34	    expect(result.canUseGalleries).toBeFalse();
   35	    expect(result.canUseMultiPage).toBeFalse();
   36	  });
   37	
   38	  it("does not grant Premium Plus features to a paid One-Page subscription", () => {
   39	    const result = subscriptionPlan.resolve({
   40	      plan: "premium",
   41	      websitePlan: "one_page",
   42	      trialEndsAt: null,
   43	      planRenewsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
   44	      premiumTrialUsed: true,
   45	    }, now);
   46	
   47	    expect(result.source).toBe("paid");
   48	    expect(result.isPremium).toBeTrue();
   49	    expect(result.isPremiumPlus).toBeFalse();
   50	    expect(result.canUseBlog).toBeFalse();
   51	    expect(result.canUseServices).toBeFalse();
   52	    expect(result.canUseMultiPage).toBeFalse();
   53	  });
   54	
   55	  it("treats an expired paid subscription as Free", () => {
   56	    const result = subscriptionPlan.resolve({
   57	      plan: "premium",
   58	      websitePlan: "premium_plus",
   59	      trialEndsAt: null,
   60	      planRenewsAt: new Date(now.getTime() - 1000),
   61	      premiumTrialUsed: true,
   62	    }, now);
   63	
   64	    expect(result.source).toBe("free");
   65	    expect(result.isPremium).toBeFalse();
   66	    expect(result.isPremiumPlus).toBeFalse();
   67	    expect(result.lapsed).toBeTrue();
   68	  });
   69	
   70	  it("applies the 50% registration promo to the selected duration", () => {
   71	    expect(subscriptionPlan.priceFor("one_page", 12, true)).toBe(9000);
   72	    expect(subscriptionPlan.priceFor("premium_plus", 2, true)).toBe(3000);
   73	    expect(subscriptionPlan.priceFor("premium_plus", 2, false)).toBe(6000);
   74	  });
   75	});
