import superjson from "superjson";
import type { Portfolio } from "../helpers/portfolioConfig";
export type OutputType = { portfolio: Portfolio };
export const getPortfolio = async (init?: RequestInit): Promise<OutputType> => {
  const response = await fetch("/_api/portfolio", { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error("Could not load the portfolio.");
  return superjson.parse<OutputType>(await response.text());
};
