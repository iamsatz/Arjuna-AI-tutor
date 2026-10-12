import { redirect } from "next/navigation";

/** Family invite links are no longer required — send everyone to kid setup. */
export default function JoinPage(_props: { params: { code: string } }) {
  redirect("/");
}
