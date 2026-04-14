import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plinko — Provably Fair",
  description:
    "A provably fair Plinko game using cryptographic commit-reveal and deterministic PRNG. Verify every round independently.",
  keywords: ["plinko", "provably fair", "crypto game", "blockchain game"],
  openGraph: {
    title: "Plinko — Provably Fair",
    description: "Drop the ball. Verify the result. Trust the math.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="page-wrapper">{children}</div>
      </body>
    </html>
  );
}
