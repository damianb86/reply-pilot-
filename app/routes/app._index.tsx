import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { authenticate } from "../shopify.server";

export const loader = async ({request}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const search = url.searchParams.toString();

  return redirect(search ? `/app/dashboard?${search}` : "/app/dashboard");
};

export default function AppIndexRoute() {
  return null;
}
