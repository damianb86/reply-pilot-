/* eslint-disable react/prop-types */
import {Button, InlineStack} from '@shopify/polaris';
import {useLocation, useMatches} from 'react-router';

export default function CreditStatusBar({credits}) {
  const matches = useMatches();
  const location = useLocation();
  const latestCredits = [...matches]
    .reverse()
    .map((match) => match.data?.credits)
    .find(Boolean);
  const current = latestCredits ?? credits;

  if (!current) return null;

  const total = Math.max(1, Number(current.balance || 0) + Number(current.spent || 0));
  const spentPercent = Math.min(100, Math.max(0, Math.round((Number(current.spent || 0) / total) * 100)));
  const lowCredits = Number(current.balance || 0) <= 25;
  const params = new URLSearchParams(location.search);
  const embeddedParams = new URLSearchParams();
  ['embedded', 'host', 'shop'].forEach((key) => {
    const value = params.get(key);
    if (value) embeddedParams.set(key, value);
  });
  const buyUrl = `/app/credits${embeddedParams.toString() ? `?${embeddedParams.toString()}` : ''}`;

  return (
    <div className="rp-credit-status">
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <InlineStack gap="300" blockAlign="center" wrap={false}>
          <Button size="slim" variant="primary" url={buyUrl}>Buy credits</Button>
          <span className="rp-credit-meter" aria-label={`${spentPercent}% of available credits spent`}>
            <span style={{width: `${spentPercent}%`}} />
          </span>
        </InlineStack>
        <InlineStack gap="400" blockAlign="center" wrap={false}>
          <span className="rp-credit-meta">
            <span>{current.spent} spent</span>
            <span>{current.purchased} purchased</span>
          </span>
          <span className={`rp-credit-balance ${lowCredits ? 'is-low' : ''}`}>
            <span className="rp-credit-balance-number">{current.balance}</span>
            <span className="rp-credit-balance-label">credits left</span>
          </span>
        </InlineStack>
      </InlineStack>
    </div>
  );
}
