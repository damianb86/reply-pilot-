/* eslint-disable react/prop-types, react/no-unescaped-entities */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFetcher, useLoaderData, useLocation, useNavigate} from 'react-router';
import {useAppBridge} from '@shopify/app-bridge-react';
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Icon,
  InlineGrid,
  InlineStack,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  ArrowLeftIcon,
  ChartVerticalIcon,
  ConfettiIcon,
  ExportIcon,
  RefreshIcon,
  SearchIcon,
} from '@shopify/polaris-icons';

function Stars({rating}) {
  return (
    <span className="rp-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({length: 5}, (_, index) => (
        <span key={index} className={index >= rating ? 'is-empty' : undefined}>★</span>
      ))}
    </span>
  );
}

function statusTone(status) {
  if (status === 'generated') return 'success';
  if (status === 'edited') return 'info';
  return 'attention';
}

function statusLabel(status) {
  if (status === 'generated') return 'Generated';
  if (status === 'edited') return 'Edited';
  return 'Manual';
}

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return 'Not available';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours < 24) return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(rows) {
  const headers = [
    'Sent at',
    'Customer',
    'Product',
    'Rating',
    'Status',
    'Confidence',
    'Review',
    'Reply',
    'AI model',
    'Minutes to send',
  ];
  const body = rows.map((reply) => [
    reply.sentAt,
    reply.customer,
    reply.product,
    reply.rating,
    statusLabel(reply.status),
    reply.confidence,
    reply.review,
    reply.reply,
    reply.aiModel?.name || '',
    reply.minutesToSend ?? '',
  ]);
  const csv = [headers, ...body].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reply-pilot-sent-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function SentRow({reply, active, onClick}) {
  return (
    <button type="button" className={`rp-sent-row ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="rp-avatar">{reply.initials}</span>
      <div className="rp-sent-copy">
        <InlineStack gap="150" blockAlign="center">
          <Text as="span" variant="bodyMd" fontWeight="semibold">{reply.customer}</Text>
          <Stars rating={reply.rating} />
          <Text as="span" variant="bodySm" tone="subdued">· {reply.product}</Text>
        </InlineStack>
        <Text as="p" variant="bodyMd" tone="subdued">
          <span className="rp-line-clamp">↳ {reply.reply}</span>
        </Text>
      </div>
      <Badge tone={statusTone(reply.status)}>{statusLabel(reply.status)}</Badge>
      <Text as="span" variant="bodySm" tone="subdued">{reply.age}</Text>
    </button>
  );
}

function EmptySentState({hasFilters, onClear, onOpenQueue}) {
  return (
    <div className="rp-empty-state-card is-compact">
      <BlockStack gap="300" align="center">
        <span className="rp-empty-mark is-blue">
          <Icon source={ConfettiIcon} tone="base" />
        </span>
        <BlockStack gap="100" align="center">
          <Text as="h2" variant="headingLg" alignment="center">
            {hasFilters ? 'No sent replies match these filters' : 'No sent replies yet'}
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
            {hasFilters
              ? 'Clear filters or broaden the date range to audit more replies.'
              : 'Replies will appear here after they are approved and sent from Queue.'}
          </Text>
        </BlockStack>
        {hasFilters ? <Button onClick={onClear}>Clear filters</Button> : <Button onClick={onOpenQueue}>Open Queue</Button>}
      </BlockStack>
    </div>
  );
}

function DetailPanel({reply}) {
  if (!reply) {
    return (
      <Card>
        <BlockStack gap="250" align="center">
          <span className="rp-empty-mark">
            <Icon source={ChartVerticalIcon} tone="base" />
          </span>
          <Text as="h2" variant="headingMd" alignment="center">Nothing selected</Text>
          <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
            Select a sent reply to inspect the original review, shipped text, timing, and model.
          </Text>
        </BlockStack>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="start" gap="300">
          <BlockStack gap="100">
            <InlineStack gap="200" blockAlign="center">
              <Text as="h2" variant="headingLg">{reply.customer}</Text>
              <Stars rating={reply.rating} />
            </InlineStack>
            <Text as="p" variant="bodyMd" tone="subdued">{reply.product}</Text>
          </BlockStack>
          <Badge tone={statusTone(reply.status)}>{statusLabel(reply.status)}</Badge>
        </InlineStack>

        <div className="rp-quote">
          <Text as="p" variant="bodyMd">"{reply.review}"</Text>
        </div>

        <div className="rp-draft-box">
          <Text as="p" variant="bodyLg">{reply.reply}</Text>
        </div>

        <InlineGrid columns={{xs: 1, sm: 2}} gap="300">
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Sent at</Text>
            <Text as="span" variant="bodyMd" fontWeight="semibold">{formatDate(reply.sentAt)}</Text>
          </BlockStack>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Response time</Text>
            <Text as="span" variant="bodyMd" fontWeight="semibold">{formatDuration(reply.minutesToSend)}</Text>
          </BlockStack>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">AI model</Text>
            <Text as="span" variant="bodyMd" fontWeight="semibold">{reply.aiModel?.name || 'Manual reply'}</Text>
          </BlockStack>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Revisions</Text>
            <Text as="span" variant="bodyMd" fontWeight="semibold">{reply.draftRevisionCount}</Text>
          </BlockStack>
        </InlineGrid>

        {reply.productType || reply.productTags.length ? (
          <InlineStack gap="200">
            {reply.productType ? <Badge>{reply.productType}</Badge> : null}
            {reply.productTags.slice(0, 6).map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </InlineStack>
        ) : null}
      </BlockStack>
    </Card>
  );
}

function LogsContent() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const location = useLocation();
  const shopify = useAppBridge();
  const lastToastKey = useRef('');
  const pageData = fetcher.data?.sentReplies ? fetcher.data : loaderData;
  const sentReplies = useMemo(() => pageData.sentReplies ?? [], [pageData.sentReplies]);
  const products = pageData.products ?? [];
  const stats = pageData.stats ?? {
    total: 0,
    totalStored: 0,
    sentToday: 0,
    sentLast7Days: 0,
    edited: 0,
    generated: 0,
    manual: 0,
    avgResponseMinutes: null,
    estimatedMinutesSaved: 0,
  };
  const weekBars = pageData.weekBars ?? [];

  const [activeReplyId, setActiveReplyId] = useState(sentReplies[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('7');
  const [sortNewest, setSortNewest] = useState(true);
  const [localToast, setLocalToast] = useState(null);
  const isSubmitting = fetcher.state !== 'idle';

  const filteredReplies = useMemo(() => {
    const now = Date.now();
    const normalizedQuery = query.trim().toLowerCase();
    const rangeDays = rangeFilter === 'all' ? null : Number(rangeFilter);

    return [...sentReplies]
      .filter((reply) => productFilter === 'all' || reply.product === productFilter)
      .filter((reply) => ratingFilter === 'all' || String(reply.rating) === ratingFilter)
      .filter((reply) => statusFilter === 'all' || reply.status === statusFilter)
      .filter((reply) => {
        if (!rangeDays) return true;
        const sentAt = reply.sentAt ? new Date(reply.sentAt).getTime() : 0;
        return sentAt && now - sentAt <= rangeDays * 24 * 60 * 60 * 1000;
      })
      .filter((reply) => {
        if (!normalizedQuery) return true;
        return [reply.customer, reply.product, reply.review, reply.reply, reply.aiModel?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        const aTime = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const bTime = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return sortNewest ? bTime - aTime : aTime - bTime;
      });
  }, [sentReplies, productFilter, ratingFilter, statusFilter, rangeFilter, query, sortNewest]);

  const activeReply = filteredReplies.find((reply) => reply.id === activeReplyId) ?? filteredReplies[0] ?? null;
  const hasFilters = Boolean(query.trim()) || productFilter !== 'all' || ratingFilter !== 'all' || statusFilter !== 'all' || rangeFilter !== '7';

  const showToast = useCallback((data) => {
    if (!data?.message) return;
    const key = `${data.intent || 'action'}:${data.ok ? 'ok' : 'error'}:${data.message}`;
    if (lastToastKey.current === key) return;
    lastToastKey.current = key;

    if (!data.ok && data.error) {
      console.error('Sent action failed', data.error);
    }

    try {
      shopify.toast.show(data.message, {
        duration: data.ok ? 4000 : 8000,
        isError: data.ok === false,
      });
    } catch {
      setLocalToast({message: data.message, isError: data.ok === false});
      window.setTimeout(() => setLocalToast(null), data.ok ? 4000 : 8000);
    }
  }, [shopify]);

  useEffect(() => {
    if (!activeReply && filteredReplies[0]) {
      setActiveReplyId(filteredReplies[0].id);
    }
  }, [activeReply, filteredReplies]);

  useEffect(() => {
    showToast(fetcher.data);
  }, [fetcher.data, showToast]);

  function clearFilters() {
    setQuery('');
    setProductFilter('all');
    setRatingFilter('all');
    setStatusFilter('all');
    setRangeFilter('7');
  }

  function handleSync() {
    const formData = new FormData();
    formData.set('intent', 'sync');
    fetcher.submit(formData, {method: 'post'});
  }

  function openQueue() {
    navigate(`/app/reviews${location.search || ''}`);
  }

  return (
    <BlockStack gap="400">
      {localToast ? (
        <div className={`rp-local-toast ${localToast.isError ? 'is-error' : ''}`} role="status">
          {localToast.message}
        </div>
      ) : null}

      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h1" variant="heading2xl">Sent</Text>
            <Badge tone="success">{stats.sentLast7Days} last 7 days</Badge>
          </InlineStack>
          <Text as="p" variant="bodyLg" tone="subdued">
            Audit approved replies, timing, edits, products, and AI model usage.
          </Text>
        </BlockStack>
        <InlineStack gap="200">
          <Button icon={ExportIcon} disabled={!filteredReplies.length} onClick={() => downloadCsv(filteredReplies)}>
            Export CSV
          </Button>
          <Button icon={RefreshIcon} loading={isSubmitting && fetcher.formData?.get('intent') === 'sync'} onClick={handleSync}>
            Sync now
          </Button>
        </InlineStack>
      </InlineStack>

      <InlineGrid columns={{xs: 1, sm: 2, lg: 4}} gap="300">
        <Card>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Sent today</Text>
            <Text as="p" variant="headingXl">{stats.sentToday}</Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Total sent</Text>
            <Text as="p" variant="headingXl">{stats.totalStored ?? stats.total}</Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Avg response</Text>
            <Text as="p" variant="headingXl">{formatDuration(stats.avgResponseMinutes)}</Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Estimated time saved</Text>
            <Text as="p" variant="headingXl">{formatDuration(stats.estimatedMinutesSaved)}</Text>
          </BlockStack>
        </Card>
      </InlineGrid>

      <div className="rp-sent-card">
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center" gap="300">
            <BlockStack gap="050">
              <Text as="h2" variant="headingLg">Last 7 days</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {stats.generated} generated · {stats.edited} edited · {stats.manual} manual
              </Text>
            </BlockStack>
            <Button icon={ArrowLeftIcon} onClick={openQueue}>Back to Queue</Button>
          </InlineStack>

          <div className="rp-week-chart" aria-label="Replies sent by day">
            {weekBars.map((bar) => (
              <div className="rp-bar-wrap" key={bar.date}>
                <div className="rp-bar" style={{height: `${bar.height}px`}} title={`${bar.count} sent`} />
                <Text as="span" variant="bodySm" tone="subdued">{bar.day}</Text>
                <Text as="span" variant="bodySm" tone="subdued">{bar.count}</Text>
              </div>
            ))}
          </div>
        </BlockStack>
      </div>

      <div className="rp-sent-card">
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="end" gap="300">
            <InlineStack gap="200" blockAlign="end">
              <div className="rp-filter-select is-search">
                <TextField
                  label="Search sent replies"
                  labelHidden
                  prefix={<Icon source={SearchIcon} tone="subdued" />}
                  value={query}
                  onChange={setQuery}
                  placeholder="Search customer, product, reply..."
                  autoComplete="off"
                />
              </div>
              <div className="rp-filter-select is-wide">
                <Select
                  label="Product"
                  labelHidden
                  options={[
                    {label: 'All products', value: 'all'},
                    ...products.map((product) => ({label: product, value: product})),
                  ]}
                  value={productFilter}
                  onChange={setProductFilter}
                />
              </div>
              <div className="rp-filter-select">
                <Select
                  label="Rating"
                  labelHidden
                  options={[
                    {label: 'All stars', value: 'all'},
                    {label: '5 stars', value: '5'},
                    {label: '4 stars', value: '4'},
                    {label: '3 stars', value: '3'},
                    {label: '2 stars', value: '2'},
                    {label: '1 star', value: '1'},
                  ]}
                  value={ratingFilter}
                  onChange={setRatingFilter}
                />
              </div>
              <div className="rp-filter-select">
                <Select
                  label="Status"
                  labelHidden
                  options={[
                    {label: 'All statuses', value: 'all'},
                    {label: 'Generated', value: 'generated'},
                    {label: 'Edited', value: 'edited'},
                    {label: 'Manual', value: 'manual'},
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
              <div className="rp-filter-select">
                <Select
                  label="Date range"
                  labelHidden
                  options={[
                    {label: 'Last 7 days', value: '7'},
                    {label: 'Last 30 days', value: '30'},
                    {label: 'All time', value: 'all'},
                  ]}
                  value={rangeFilter}
                  onChange={setRangeFilter}
                />
              </div>
            </InlineStack>
            <Button onClick={() => setSortNewest((value) => !value)}>
              {sortNewest ? 'Newest' : 'Oldest'}
            </Button>
          </InlineStack>

          <div className="rp-sent-layout">
            <div className="rp-sent-list">
              {filteredReplies.length ? (
                filteredReplies.map((reply) => (
                  <SentRow
                    key={reply.id}
                    reply={reply}
                    active={reply.id === activeReply?.id}
                    onClick={() => setActiveReplyId(reply.id)}
                  />
                ))
              ) : (
                <EmptySentState hasFilters={hasFilters} onClear={clearFilters} onOpenQueue={openQueue} />
              )}
            </div>

            <div className="rp-sent-detail">
              <DetailPanel reply={activeReply} />
            </div>
          </div>
        </BlockStack>
      </div>
    </BlockStack>
  );
}

export default function LogsPage() {
  return <LogsContent />;
}
