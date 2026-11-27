export default function NextMigrationPreviewPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "12vh auto",
        padding: "0 24px",
        color: "var(--foreground)",
        fontFamily: "var(--font-family-base)",
      }}
    >
      <p style={{ color: "var(--primary)", fontWeight: 700 }}>ONI247 · NEXT.JS MIGRATION</p>
      <h1>Next.js foundation is running.</h1>
      <p>
        This is an isolated migration checkpoint. The existing Oni247 application,
        API routes, authentication, storefront routing, and production deployment
        remain on their current runtime until each migration stage is verified.
      </p>
    </main>
  );
}
