import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AERIS — AI-Enabled Real-time Intelligence for Storms",
  description:
    "Short-term (0–180 min) thunderstorm and lightning nowcasting system for India. Prototype with synthetic data demonstrating real operational architecture.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="h-full overflow-hidden"
        style={{
          fontFamily: "var(--font-body)",
          background: "var(--bg-night)",
          color: "var(--text-primary)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
