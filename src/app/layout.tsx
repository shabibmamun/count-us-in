import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Count Us In - Private Personal & Shared Budgeting",
  description: "Count Us In gives you and the people you trust one clear, private view of your money. Track income, spending, budgets, and settle up easily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
