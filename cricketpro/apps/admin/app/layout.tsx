import "../../../packages/ui/src/token.css";

export const metadata = {
  title: "CricketPro Admin",
  description: "Admin panel & Scorer console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}