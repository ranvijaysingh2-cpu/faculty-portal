import { auth } from "@/auth";
import SignIn from "./components/SignIn";
import PdfBrowser from "./components/PdfBrowser";

export default async function Home() {
  if (process.env.NODE_ENV === "development") {
    return <PdfBrowser />;
  }

  try {
    const session = await auth();
    if (!session?.user) return <SignIn />;
    return <PdfBrowser />;
  } catch (e) {
    console.error("[page] auth() failed:", e);
    return <SignIn />;
  }
}
