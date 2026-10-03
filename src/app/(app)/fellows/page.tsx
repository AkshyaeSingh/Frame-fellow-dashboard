import { redirect } from "next/navigation";

// The fellows database now lives on Home.
export default async function FellowsPage(props: PageProps<"/fellows">) {
  const sp = await props.searchParams;
  redirect(typeof sp.cohort === "string" ? `/?cohort=${sp.cohort}` : "/");
}
