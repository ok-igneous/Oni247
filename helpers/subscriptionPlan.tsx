import type {PlanTier} from "./schema";

export const subscriptionPlan={
  onePagePriceNgn:1500,
  premiumPlusPriceNgn:3000,
  standardPriceNgn:3000,
  launchPriceNgn:3000,
  launchEndsAt:new Date("2099-12-31T23:59:59Z"),
  currency:"NGN",
   10	  currentPriceNgn(){return this.premiumPlusPriceNgn;},
   11	  isLaunchPricing(){return false;},
   12	  registrationPromoPercent:50,
   13	  trialDays:7,
   14	  freeProductLimit:5,
   15	  freeDailyCreationLimit:2,
   16	  minDurationMonths:1,
   17	  maxDurationMonths:24,
   18	  presenceRequiresPremium:true,
   19	  priceFor(websitePlan:"one_page"|"premium_plus",durationMonths:number,promo=false){
   20	    const monthly=websitePlan==="one_page"?this.onePagePriceNgn:this.premiumPlusPriceNgn;
   21	    return monthly*durationMonths*(promo?0.5:1);
   22	  },
   23	  resolve(b:{plan:PlanTier;websitePlan?:string|null;trialEndsAt:Date|string|null;planRenewsAt:Date|string|null;premiumTrialUsed?:boolean},now:Date=new Date()){
   24	    const t=b.trialEndsAt?new Date(b.trialEndsAt):null;
   25	    const r=b.planRenewsAt?new Date(b.planRenewsAt):null;
   26	    const paid=b.plan==="premium"&&r!==null&&r>now;
   27	    const trial=!paid&&t!==null&&t>now;
   28	    const websitePlan:"one_page"|"premium_plus"=b.websitePlan==="premium_plus"?"premium_plus":"one_page";
   29	    const premiumPlus=trial||(paid&&websitePlan==="premium_plus");
   30	    const left=trial&&t?t.getTime()-now.getTime():0;
   31	    return{isPremium:paid||trial,isPremiumPlus:premiumPlus,websitePlan,source:paid?("paid" as const):trial?("trial" as const):("free" as const),trialDaysLeft:Math.max(0,Math.ceil(left/86400000)),trialEndsAt:t,renewsAt:r,trialUsed:Boolean(b.premiumTrialUsed),productLimit:paid||trial?null:this.freeProductLimit,dailyCreationLimit:paid||trial?null:this.freeDailyCreationLimit,canUseReports:paid||trial,canCreateCollection:paid||trial,canUseProductLinks:paid||trial,canUseTrackingLinks:paid||trial,canEditPresence:!this.presenceRequiresPremium||paid||trial,canUseMultiPage:premiumPlus,canUseGalleries:premiumPlus,canUseBlog:premiumPlus,canUseServices:premiumPlus,lapsed:b.plan==="premium"&&r!==null&&r<=now};
   32	  },
   33	};
