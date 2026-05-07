/* eslint-disable react/prop-types */
import {Page} from "@shopify/polaris";
import CreditStatusBar from "../../src/CreditStatusBar";

export default function IguShell({children, credits, hideCredits = false}) {
  return (
    <div className="embedded-shell">
      <main className="main-content">
        {hideCredits ? null : <CreditStatusBar credits={credits} />}
        <Page fullWidth>{children}</Page>
      </main>
    </div>
  );
}
