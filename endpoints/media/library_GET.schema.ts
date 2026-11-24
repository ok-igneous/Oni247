import superjson from "superjson";

export type LibraryImage = {
  id: string;
  kind: string;
  fileUrl: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
};

export type OutputType = { images: LibraryImage[] };

export const getMediaLibrary = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/media/library`, {
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
