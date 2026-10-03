import { redirect } from "next/navigation";

// Outliers are a filter on the Content page now.
export default function OutliersPage() {
  redirect("/content?out=3&sort=views");
}
