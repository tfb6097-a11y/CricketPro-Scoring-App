import "../../../packages/ui/src/token.css";
import { TopNav } from "../components/TopNav";

export const metadata = {
  title: "CricketPro",
  description: "Live cricket scoring & stats platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}