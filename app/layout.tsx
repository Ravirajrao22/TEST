import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Ayushman Shikshan Sansthan - Online Examination Platform",
  description:
    "Online examination and MCQ assessment platform for Ayushman Shikshan Sansthan (Pioneer: Chandan Guru Jee). Classes 8 to 12.",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans text-slate-800 relative selection:bg-indigo-100 selection:text-[#4338CA]">
        {/* Fixed Background with Cool Gradient and 3 Blurred Blobs */}
        <div
          className="fixed inset-0 -z-20 pointer-events-none bg-gradient-to-br from-[#F4F7FB] to-[#EAF0FA]"
          aria-hidden="true"
        >
          {/* Pale Indigo Blob (#C7D2FE at 45%) */}
          <div
            className="absolute -top-[10%] -left-[10%] w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] rounded-full blur-[100px] sm:blur-[140px] pointer-events-none"
            style={{ backgroundColor: "rgba(199, 210, 254, 0.45)" }}
          />

          {/* Pale Teal Blob (#BAE6FD at 40%) */}
          <div
            className="absolute top-[30%] -right-[12%] w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full blur-[90px] sm:blur-[130px] pointer-events-none"
            style={{ backgroundColor: "rgba(186, 230, 253, 0.40)" }}
          />

          {/* Faint Lavender Blob (#E9D5FF at 30%) */}
          <div
            className="absolute -bottom-[10%] left-[20%] w-[450px] h-[450px] sm:w-[600px] sm:h-[600px] rounded-full blur-[110px] sm:blur-[150px] pointer-events-none"
            style={{ backgroundColor: "rgba(233, 213, 255, 0.30)" }}
          />
        </div>

        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
