import { auth } from "@/auth";
import SignIn from "./components/SignIn";
import PdfBrowser from "./components/PdfBrowser";

export default async function Home({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (process.env.NODE_ENV === "development") {
    return <PdfBrowser />;
  }

  try {
    const session = await auth();
    if (!session?.user) return <SignIn error={searchParams.error} />;
    return <PdfBrowser />;
  } catch (e) {
    console.error("[page] auth() failed:", e);
    return <SignIn error={searchParams.error} />;
  }
}
