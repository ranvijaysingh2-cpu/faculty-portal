import { auth } from "@/auth";
import SignIn from "./components/SignIn";
import PdfBrowser from "./components/PdfBrowser";

export default async function Home() {
  if (process.env.NODE_ENV === "development") {
    return <PdfBrowser />;
  }

  const session = await auth();

  if (!session?.user) {
    return <SignIn />;
  }

  return <PdfBrowser />;
}
