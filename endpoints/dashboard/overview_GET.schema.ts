import superjson from "superjson";

export type OutputType =
  | { hasBusiness: false }
  | {
      hasBusiness: true;
      businessName: string;
      slug: string;
      status: string;
      productCount: number;
      categoryCount: number;
      newEnquiryCount: number;
      pendingOrderCount: number;
    };

export const getDashboardOverview = async (
  init?: RequestInit,
): Promise<OutputType> => {
  const result = await fetch(`/_api/dashboard/overview`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
