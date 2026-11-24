import superjson from "superjson";

export type OwnerComment = {
  id: string;
  targetType: "blog" | "product" | "event" | "gallery";
  targetId: string;
  targetTitle: string;
  authorName: string;
  body: string;
  status: "pending" | "approved" | "hidden";
  createdAt: Date;
  likeCount: number;
};

export type OutputType = { comments: OwnerComment[] };

export const getOwnerComments = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/engagement/ownerComments`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
