/* eslint-disable react/prop-types */
import {Page} from "@shopify/polaris";

export default function IguShell({children}) {
  return (
    <div className="embedded-shell">
      <main className="main-content">
        <Page fullWidth>{children}</Page>
      </main>
    </div>
  );
}
