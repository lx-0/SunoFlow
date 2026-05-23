import { authDataRoute } from "@/lib/route-handler";
import { getInvoices } from "@/lib/billing";

export const GET = authDataRoute(async (_request, { auth }) => {
  const invoices = await getInvoices(auth.userId);
  return { invoices };
}, { route: "/api/billing/invoices" });
