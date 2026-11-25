export type TestimonialLayout = "grid" | "slider" | "gallery";
export type TestimonialStyle = "card" | "quote" | "minimal";

export type TestimonialConfig = {
  testimonialLayout: TestimonialLayout;
  testimonialStyle: TestimonialStyle;
  testimonialColumns: "2" | "3";
  testimonialRating: boolean;
  testimonialPhotos: boolean;
  testimonialMax: "all" | "3" | "6" | "9";
};

export const DEFAULT_TESTIMONIAL_CONFIG: TestimonialConfig = {
  testimonialLayout: "grid",
  testimonialStyle: "card",
  testimonialColumns: "3",
  testimonialRating: true,
  testimonialPhotos: true,
  testimonialMax: "all",
};

/** Reads testimonial display settings from a business's saved appearance settings, with safe defaults. */
export const readTestimonialConfig = (a: Record<string, unknown> | null | undefined): TestimonialConfig => ({
  testimonialLayout: a?.testimonialLayout === "slider" || a?.testimonialLayout === "gallery" ? a.testimonialLayout : "grid",
  testimonialStyle: a?.testimonialStyle === "quote" || a?.testimonialStyle === "minimal" ? a.testimonialStyle : "card",
  testimonialColumns: a?.testimonialColumns === "2" ? "2" : "3",
  testimonialRating: a?.testimonialRating !== false,
  testimonialPhotos: a?.testimonialPhotos !== false,
  testimonialMax: a?.testimonialMax === "3" || a?.testimonialMax === "6" || a?.testimonialMax === "9" ? a.testimonialMax : "all",
});
