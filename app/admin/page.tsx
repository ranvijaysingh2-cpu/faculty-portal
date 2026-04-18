import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";

function isAdmin(email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}

export default async function AdminPage() {
  if (process.env.NODE_ENV !== "development") {
    const session = await auth();
    if (!session?.user?.email) redirect("/");
    if (!isAdmin(session.user.email)) redirect("/");
  }

  return <AdminDashboard />;
}
