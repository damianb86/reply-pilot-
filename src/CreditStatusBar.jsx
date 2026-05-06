/* eslint-disable react/prop-types */
import {Button, InlineStack} from '@shopify/polaris';
import {useLocation, useMatches, useNavigate} from 'react-router';

function formatCreditNumber(value) {
  const numeric = Math.trunc(Number(value || 0));
  const sign = numeric < 0 ? '-' : '';
  return `${sign}${Math.abs(numeric).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export default function CreditStatusBar({credits}) {
  const matches = useMatches();
  const location = useLocation();
  const navigate = useNavigate();
  const latestCredits = [...matches]
    .reverse()
    .map((match) => match.data?.credits)
    .find(Boolean);
  const current = latestCredits ?? credits;

  if (!current) return null;

  const meterBase = Math.max(1, Number(current.creditMeter?.baseCredits ?? current.totalAllocated ?? current.balance ?? 1));
  const remainingPercent = Math.min(100, Math.max(0, Math.round((Number(current.balance || 0) / meterBase) * 100)));
  const lowCredits = Number(current.balance || 0) <= 25 || remainingPercent <= 20;
  const params = new URLSearchParams(location.search);
  const embeddedParams = new URLSearchParams();
  ['embedded', 'host', 'shop'].forEach((key) => {
    const value = params.get(key);
    if (value) embeddedParams.set(key, value);
  });
  const buyUrl = `/app/credits${embeddedParams.toString() ? `?${embeddedParams.toString()}` : ''}`;
  const isCreditsPage = location.pathname.endsWith('/credits');

  return (
    <div className="rp-credit-status">
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <InlineStack gap="300" blockAlign="center" wrap={false}>
          <Button
            size="slim"
            variant="primary"
            disabled={isCreditsPage}
            onClick={() => navigate(buyUrl)}
          >
            Buy credits
          </Button>
          <span
            className={`rp-credit-meter ${lowCredits ? 'is-low' : ''}`}
            aria-label={`${remainingPercent}% of credits remaining from ${formatCreditNumber(meterBase)} credits`}
            title={`100% equals ${formatCreditNumber(meterBase)} credits: your balance after the latest credit purchase or welcome grant.`}
          >
            <span style={{width: `${remainingPercent}%`}} />
          </span>
        </InlineStack>
        <InlineStack gap="400" blockAlign="center" wrap={false}>
          <span className="rp-credit-meta">
            <span>{formatCreditNumber(current.spent)} spent</span>
            <span>{formatCreditNumber(current.purchased)} purchased</span>
          </span>
          <span className={`rp-credit-balance ${lowCredits ? 'is-low' : ''}`}>
            <span className="rp-credit-balance-number">{formatCreditNumber(current.balance)}</span>
            <span className="rp-credit-balance-label">credits left</span>
          </span>
        </InlineStack>
      </InlineStack>
    </div>
  );
}
