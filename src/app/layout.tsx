import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Table Tennis Analytics",
  description: "A premium foundation for table tennis management and player performance tracking.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
