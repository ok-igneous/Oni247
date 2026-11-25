import { platformSettings } from "./platformSettings";
import { DEFAULT_PORTFOLIO, mergePortfolio, PORTFOLIO_KEY, type Portfolio } from "./portfolioConfig";

/** Backend-only persistence for the public portfolio configuration. */
export const portfolioSettings = {
  async load(): Promise<Portfolio> {
    const stored = await platformSettings.get<unknown>(PORTFOLIO_KEY);
    return stored == null ? DEFAULT_PORTFOLIO : mergePortfolio(stored);
  },
  async save(value: unknown): Promise<Portfolio> {
    const portfolio = mergePortfolio(value);
    await platformSettings.set(PORTFOLIO_KEY, portfolio);
    return portfolio;
  },
};
