import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invoice Follow-Up Automation | Automatic Invoice Reminders — InvoiceFlow",
  description: "Automate invoice follow-ups and get paid faster with scheduled email reminders. No manual chasing. Free plan available.",
  keywords: "invoice follow-up automation, automatic invoice reminders, overdue invoice reminders, invoice payment reminders",
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  alternates: {
    canonical: "https://invoice.jahongir-travel.uz",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
