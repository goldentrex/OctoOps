import type { Metadata } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "OctoOps | One Founder. Eight Arms. Zero Employees.",
  description:
    "AI Workforce Governance for QwenWork Agents & Hashmeta AI Client Trust Portal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fredoka.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased selection:bg-emerald-200 selection:text-slate-900">
        {children}
      </body>
    </html>
  );
}
