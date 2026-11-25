export const PORTFOLIO_KEY = "emmanuel_portfolio_v1";

export type PortfolioItem = { title: string; text: string; category: string; imageUrl: string; linkUrl: string };
export type Portfolio = {
  name: string; headline: string; eyebrow: string; intro: string; availability: string;
  profileImageUrl: string; aboutTitle: string; aboutOne: string; aboutTwo: string;
  approachTitle: string; approachText: string; location: string; meta: string[];
  services: PortfolioItem[]; projects: PortfolioItem[];
  contactTitle: string; contactText: string; phone: string; email: string;
  seoTitle: string; seoDescription: string;
};

export const DEFAULT_PORTFOLIO: Portfolio = {
  name: "Emmanuel Ponle Okunyode",
  headline: "I make technology work for people.",
  eyebrow: "TECHNOLOGY · SUPPORT · DEVELOPMENT",
  intro: "I'm Emmanuel Ponle Okunyode — an IT support professional and software builder working across customer support, POS systems, web development and business technology.",
  availability: "OPEN TO REMOTE & ON-SITE OPPORTUNITIES",
  profileImageUrl: "",
  aboutTitle: "Technology should solve problems, not create more of them.",
  aboutOne: "I combine hands-on technical support with a builder's mindset. My work involves helping people use technology confidently, diagnosing issues, setting up business systems and developing digital products.",
  aboutTwo: "I'm comfortable translating technical problems into clear steps, guiding users through unfamiliar software and thinking about how a solution fits into the way a business actually operates.",
  approachTitle: "Understand the problem. Make the solution usable. Stay until it works.",
  approachText: "Listen carefully, diagnose methodically and follow through until the solution works.",
  location: "Based in Nigeria",
  meta: ["Based in Nigeria", "Available for remote work", "Practical, user-focused solutions"],
  services: [
    { title: "Customer & Technical Support", text: "Patient, practical help with software, devices, user questions and technical issues — from first response through resolution.", category: "Support", imageUrl: "", linkUrl: "" },
    { title: "Web Development", text: "Responsive websites and web experiences designed to make services clear, accessible and easy to use.", category: "Development", imageUrl: "", linkUrl: "" },
    { title: "Software Development", text: "Business-focused software, workflow tools and digital products that solve real operational problems.", category: "Development", imageUrl: "", linkUrl: "" },
    { title: "IT & POS Support", text: "POS installation, configuration, troubleshooting, software setup and hands-on user training.", category: "IT", imageUrl: "", linkUrl: "" },
    { title: "Software Implementation", text: "Helping teams move from setup to confident daily use through configuration, onboarding and practical guidance.", category: "Implementation", imageUrl: "", linkUrl: "" },
    { title: "Business Technology", text: "Connecting people and business processes with useful digital tools, systems and support.", category: "Technology", imageUrl: "", linkUrl: "" },
  ],
  projects: [
    { title: "Oni247", category: "Website & storefront platform", text: "A platform for businesses to establish an online presence, showcase products and services, and receive customer enquiries and orders.", imageUrl: "", linkUrl: "" },
    { title: "VendMage", category: "POS & business management", text: "A business software project focused on point-of-sale operations, inventory, sales and day-to-day business management.", imageUrl: "", linkUrl: "" },
    { title: "OniRep", category: "Repair & device support", text: "A repair-service and device-support solution designed to organise repair workflows and make technical assistance easier to access.", imageUrl: "", linkUrl: "" },
    { title: "OniShield", category: "AI-assisted business security · In development", text: "An evolving security platform exploring intelligent threat investigation, evidence-led recommendations and controlled response workflows.", imageUrl: "", linkUrl: "" },
  ],
  contactTitle: "Have a support need, a project or an opportunity?",
  contactText: "I'm open to customer support, IT support, software implementation, web development and related technology opportunities.",
  phone: "07054086806", email: "okemmap@gmail.com",
  seoTitle: "Emmanuel Ponle Okunyode | IT Support, Web & Software Development",
  seoDescription: "Portfolio of Emmanuel Ponle Okunyode — customer support, IT and POS support, web development, software development and business technology.",
};

const cleanText = (value: unknown, fallback: string, max = 3000) => typeof value === "string" ? value.trim().slice(0, max) : fallback;
const cleanItems = (value: unknown, fallback: PortfolioItem[]): PortfolioItem[] => {
  if (!Array.isArray(value)) return fallback;
  return value.slice(0, 30).map((raw) => {
    const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    return {
      title: cleanText(item.title, "", 120), text: cleanText(item.text, "", 1500),
      category: cleanText(item.category, "", 160), imageUrl: cleanText(item.imageUrl, "", 1000),
      linkUrl: cleanText(item.linkUrl, "", 1000),
    };
  }).filter((item) => item.title);
};

export const mergePortfolio = (value: unknown): Portfolio => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (key: keyof Portfolio, max = 3000) => cleanText(raw[key], DEFAULT_PORTFOLIO[key] as string, max);
  return {
    ...DEFAULT_PORTFOLIO,
    name: text("name", 120), headline: text("headline", 220), eyebrow: text("eyebrow", 120),
    intro: text("intro", 1200), availability: text("availability", 120), profileImageUrl: text("profileImageUrl", 1000),
    aboutTitle: text("aboutTitle", 220), aboutOne: text("aboutOne", 2000), aboutTwo: text("aboutTwo", 2000),
    approachTitle: text("approachTitle", 220), approachText: text("approachText", 1000), location: text("location", 120),
    meta: Array.isArray(raw.meta) ? raw.meta.slice(0, 6).map((v) => cleanText(v, "", 120)).filter(Boolean) : DEFAULT_PORTFOLIO.meta,
    services: cleanItems(raw.services, DEFAULT_PORTFOLIO.services), projects: cleanItems(raw.projects, DEFAULT_PORTFOLIO.projects),
    contactTitle: text("contactTitle", 220), contactText: text("contactText", 1200), phone: text("phone", 40), email: text("email", 180),
    seoTitle: text("seoTitle", 70), seoDescription: text("seoDescription", 200),
  };
};
