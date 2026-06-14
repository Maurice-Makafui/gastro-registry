import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import DashboardShell from "@/components/ui/DashboardShell";

export const metadata: Metadata = {
  title: "Gastro Referral & Registry System",
  description:
    "Clinical workflow platform for gastroenterology and hepatology specialists in Ghana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "10px",
              background: "#1e293b",
              color: "#f8fafc",
              fontSize: "14px",
            },
          }}
        />
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
