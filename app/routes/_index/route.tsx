import type { LoaderFunctionArgs } from "react-router";
import { Form, redirect, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  const shouldOpenEmbeddedApp = [
    "shop",
    "host",
    "embedded",
    "id_token",
    "session",
  ].some((param) => url.searchParams.has(param));

  if (shouldOpenEmbeddedApp) {
    const search = url.searchParams.toString();
    return redirect(search ? `/app?${search}` : "/app");
  }

  return { showForm: Boolean(login) };
};

export default function Index() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Shopify embedded app</p>
          <h1>Igu</h1>
          <p className={styles.lede}>
            A focused workspace for merchants who need review replies, brand
            voice guidance, support requests, and privacy handling in one
            Shopify-native admin experience.
          </p>

          {showForm && (
            <Form className={styles.form} method="post" action="/auth/login">
              <label className={styles.label}>
                <span>Shop domain</span>
                <input
                  className={styles.input}
                  type="text"
                  name="shop"
                  inputMode="url"
                  autoComplete="organization"
                  placeholder="your-store.myshopify.com"
                />
              </label>
              <button className={styles.button} type="submit">
                Log in
              </button>
            </Form>
          )}
        </div>

        <div className={styles.panel} aria-label="Igu capabilities">
          <div>
            <strong>Review queue</strong>
            <span>Work only with real imported reviews.</span>
          </div>
          <div>
            <strong>Brand voice</strong>
            <span>Keep reply tone consistent across your team.</span>
          </div>
          <div>
            <strong>Support</strong>
            <span>Route merchant requests through production SMTP.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
