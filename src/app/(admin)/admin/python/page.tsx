import { redirect } from "next/navigation";
export default async function Page({searchParams}: {searchParams: Promise<Record<string,string|undefined>>}) {
 const params = new URLSearchParams(Object.entries(await searchParams).filter((entry): entry is [string,string] => typeof entry[1] === "string"));
 params.set("type", "python");
 redirect("/admin/results?" + params.toString());
}
