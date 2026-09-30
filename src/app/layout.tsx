import type { Metadata } from "next";
import "./globals.css";
import "./teacher.css";

export const metadata: Metadata = {
  title: { default: "KnightCode", template: "%s · KnightCode" },
  description: "Learn programming logic through KnightCode puzzle rooms.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/assets/css/style.css" />
        <link rel="stylesheet" href="/assets/css/dashboard-quest.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
