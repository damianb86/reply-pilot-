import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendContactEmail } from "../email.server";
import HelpPage from "../../src/pages/HelpPage";

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const type = String(formData.get("type") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const replyEmail = String(formData.get("email") ?? "").trim() || undefined;

  if (!type || !message) {
    return {
      ok: false,
      intent: "contact" as const,
      message: "Message is required.",
    };
  }

  try {
    await db.contactRequest.create({
      data: {
        shop: session.shop,
        type,
        subject: subject || type,
        message,
        email: replyEmail ?? null,
      },
    });

    await sendContactEmail({
      type,
      subject: subject || type,
      message,
      replyEmail,
      shop: session.shop,
    });

    return {
      ok: true,
      intent: "contact" as const,
      message: "Message sent. We will get back to you soon.",
    };
  } catch (error) {
    console.error("[app.help.action]", error);
    return {
      ok: false,
      intent: "contact" as const,
      message: "Could not send the message. Check SMTP configuration and try again.",
    };
  }
}

export default function HelpRoute() {
  return <HelpPage />;
}
