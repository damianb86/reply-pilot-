/* eslint-disable react/prop-types, react/no-unescaped-entities */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFetcher, useLoaderData} from 'react-router';
import {useAppBridge} from '@shopify/app-bridge-react';
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  Icon,
  IndexTable,
  InlineStack,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  AlertTriangleIcon,
  ChatIcon,
  EditIcon,
  MagicIcon,
  RefreshIcon,
  SendIcon,
  XIcon,
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

function ConfidenceMeter({value}) {
  const isWarning = value < 75;

  return (
    <span className="rp-confidence">
      <span className="rp-confidence-track" aria-hidden="true">
        <span
          className={`rp-confidence-fill ${isWarning ? 'is-warning' : ''}`}
          style={{width: `${value}%`}}
        />
      </span>
      <Text as="span" variant="bodySm" tone={isWarning ? 'critical' : 'subdued'}>{value}%</Text>
    </span>
  );
}

function CustomerCell({review}) {
  return (
    <div className="rp-customer-cell">
      <span className="rp-avatar">{review.initials}</span>
      <BlockStack gap="050">
        <Text as="span" variant="bodyMd" fontWeight="semibold">{review.customer}</Text>
        <Stars rating={review.rating} />
      </BlockStack>
    </div>
  );
}

function QueueEmptyState({connected, onRefresh}) {
  return (
    <div className="rp-queue-empty">
      <span className="rp-empty-mark is-blue">
        <Icon source={ChatIcon} tone="base" />
      </span>
      <BlockStack gap="150" align="center">
        <Text as="h2" variant="headingLg" alignment="center">No messages to show</Text>
        <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
          {connected
            ? 'When Judge.me has pending reviews, Reply Pilot will import them here so you can generate drafts for approval.'
            : 'Connect Judge.me from Connect to import reviews and start replying from this queue.'}
        </Text>
      </BlockStack>
      <InlineStack gap="200" align="center">
        <Button icon={RefreshIcon} onClick={onRefresh}>Refresh queue</Button>
        {!connected ? <Button url="/app/dashboard" variant="primary">Go to Connect</Button> : null}
      </InlineStack>
    </div>
  );
}

function ResultBanner({result, syncError}) {
  if (result?.message && result.ok === false) {
    return (
      <Banner tone={result.ok ? 'success' : 'critical'}>
        <BlockStack gap="150">
          <Text as="p" variant="bodyMd">{result.message}</Text>
          {!result.ok && result.error ? (
            <pre className="rp-json-preview is-error">{JSON.stringify(result.error, null, 2)}</pre>
          ) : null}
        </BlockStack>
      </Banner>
    );
  }

  if (syncError) {
    return (
      <Banner tone="critical">
        <BlockStack gap="150">
          <Text as="p" variant="bodyMd">Could not sync Judge.me reviews.</Text>
          <pre className="rp-json-preview is-error">{JSON.stringify(syncError, null, 2)}</pre>
        </BlockStack>
      </Banner>
    );
  }

  return null;
}

function formatErrorPreview(value) {
  if (!value) return '';

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return String(value);
  }
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasDraft(review) {
  return Boolean(review?.draftGenerated ?? review?.draft?.trim());
}

function QueueLoadingState() {
  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <div className="rp-title-row">
            <Text as="h1" variant="heading2xl">Reply Pilot · Inbox</Text>
            <span className="rp-title-metric is-yellow">Loading</span>
            <span className="rp-title-metric is-green">Ready</span>
          </div>
          <Text as="p" variant="bodyLg" tone="subdued">
            Loading review approvals...
          </Text>
        </BlockStack>
      </InlineStack>

      <div className="rp-queue-shell">
        <div className="rp-queue-empty">
          <span className="rp-empty-mark is-blue">
            <Icon source={ChatIcon} tone="base" />
          </span>
          <BlockStack gap="150" align="center">
            <Text as="h2" variant="headingLg" alignment="center">Preparing queue</Text>
            <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
              Reply Pilot is loading Judge.me reviews and queue state.
            </Text>
          </BlockStack>
        </div>
      </div>
    </BlockStack>
  );
}

function ReviewsContent() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const lastToastKey = useRef('');
  const [localToast, setLocalToast] = useState(null);
  const pageData = fetcher.data?.reviews ? fetcher.data : loaderData;
  const reviews = useMemo(() => pageData.reviews ?? [], [pageData.reviews]);
  const stats = pageData.stats ?? {pending: 0, sentToday: 0, skipped: 0, ungenerated: 0, highConfidence: 0, needsHuman: 0};
  const products = pageData.products ?? [];
  const aiConfig = pageData.aiConfig ?? {};
  const aiConfigured = aiConfig.configured !== false;
  const aiDisplayName = aiConfig.displayName || aiConfig.activeVariant?.name || aiConfig.selectedModel?.name || 'Brand Voice model';
  const aiProvider = aiConfig.provider || aiConfig.activeVariant?.provider || aiConfig.selectedModel?.provider || 'AI';

  const [activeReviewId, setActiveReviewId] = useState(reviews[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [starFilter, setStarFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [highConfidenceOnly, setHighConfidenceOnly] = useState(false);
  const [needsHumanOnly, setNeedsHumanOnly] = useState(false);
  const [lastSevenDaysOnly, setLastSevenDaysOnly] = useState(true);
  const [showSkipped, setShowSkipped] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState('');

  const filteredReviews = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    return [...reviews]
      .filter((review) => showSkipped || review.status !== 'skipped')
      .filter((review) => starFilter === 'all' || String(review.rating) === starFilter)
      .filter((review) => productFilter === 'all' || review.product === productFilter)
      .filter((review) => !highConfidenceOnly || (hasDraft(review) && review.confidence >= 85))
      .filter((review) => !needsHumanOnly || (hasDraft(review) && review.human))
      .filter((review) => {
        if (!lastSevenDaysOnly) return true;
        const date = parseDate(review.createdAt);
        return !date || now - date.getTime() <= sevenDays;
      })
      .sort((a, b) => {
        const aTime = parseDate(a.createdAt)?.getTime() ?? 0;
        const bTime = parseDate(b.createdAt)?.getTime() ?? 0;
        return sortNewest ? bTime - aTime : aTime - bTime;
      });
  }, [reviews, showSkipped, starFilter, productFilter, highConfidenceOnly, needsHumanOnly, lastSevenDaysOnly, sortNewest]);

  const activeReview = filteredReviews.find((review) => review.id === activeReviewId) ?? filteredReviews[0] ?? null;
  const visibleIds = filteredReviews.map((review) => review.id);
  const activeHasDraft = hasDraft(activeReview);
  const highConfidenceVisible = filteredReviews.filter((review) => review.status === 'pending' && hasDraft(review) && review.confidence >= 85);
  const ungeneratedVisible = filteredReviews.filter((review) => review.status === 'pending' && !hasDraft(review));
  const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedPendingIds = selectedVisibleIds.filter((id) => filteredReviews.find((review) => review.id === id)?.status === 'pending');
  const selectedGeneratedPendingIds = selectedPendingIds.filter((id) => hasDraft(filteredReviews.find((review) => review.id === id)));
  const selectedUngeneratedPendingIds = selectedPendingIds.filter((id) => !hasDraft(filteredReviews.find((review) => review.id === id)));
  const selectedSkippedIds = selectedVisibleIds.filter((id) => filteredReviews.find((review) => review.id === id)?.status === 'skipped');
  const selectedCount = selectedVisibleIds.length;
  const isSubmitting = fetcher.state !== 'idle';

  const showToast = useCallback((data) => {
    if (!data?.message) return;

    const key = `${data.intent || 'action'}:${data.ok ? 'ok' : 'error'}:${data.message}`;
    if (lastToastKey.current === key) return;
    lastToastKey.current = key;

    if (!data.ok && data.error) {
      console.error('Queue action failed', data.error);
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
    if (!activeReview && filteredReviews[0]) {
      setActiveReviewId(filteredReviews[0].id);
    }
  }, [activeReview, filteredReviews]);

  useEffect(() => {
    setDraftValue(activeReview?.draft ?? '');
    setIsEditing(false);
  }, [activeReview?.id, activeReview?.draft]);

  useEffect(() => {
    if ((fetcher.data?.ok || fetcher.data?.generation?.generated) && ['send', 'skip', 'restore', 'generate', 'regenerate'].includes(fetcher.data.intent)) {
      setSelectedIds([]);
    }
  }, [fetcher.data]);

  useEffect(() => {
    showToast(fetcher.data);
  }, [fetcher.data, showToast]);

  useEffect(() => {
    function handleKeyDown(event) {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'button' || tag === 'select' || event.target?.isContentEditable) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelectedIds(visibleIds);
        return;
      }

      if (!activeReview) return;

      if (event.key === 'Enter' && activeReview.status === 'pending' && hasDraft(activeReview)) {
        event.preventDefault();
        submitAction('send', [activeReview.id]);
      } else if (event.key.toLowerCase() === 'e' && activeReview.status === 'pending') {
        event.preventDefault();
        setIsEditing(true);
      } else if (event.key.toLowerCase() === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        moveActive(1);
      } else if (event.key.toLowerCase() === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveActive(-1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function submitAction(intent, ids = selectedVisibleIds, extra = {}) {
    const formData = new FormData();
    formData.set('intent', intent);
    formData.set('ids', JSON.stringify(ids));

    Object.entries(extra).forEach(([key, value]) => {
      formData.set(key, value);
    });

    fetcher.submit(formData, {method: 'post'});
  }

  function submitSingle(intent, id, extra = {}) {
    submitAction(intent, [id], extra);
  }

  function handleSelectionChange(selectionType, isSelecting, selection) {
    if (selectionType === 'all' || selectionType === 'page') {
      setSelectedIds(isSelecting ? visibleIds : []);
      return;
    }

    if (selectionType === 'single') {
      setSelectedIds((current) => (
        isSelecting
          ? Array.from(new Set([...current, selection]))
          : current.filter((id) => id !== selection)
      ));
      return;
    }

    if (Array.isArray(selection)) {
      const [start, end] = selection;
      const rangeIds = visibleIds.slice(Number(start), Number(end) + 1);
      setSelectedIds((current) => (
        isSelecting
          ? Array.from(new Set([...current, ...rangeIds]))
          : current.filter((id) => !rangeIds.includes(id))
      ));
    }
  }

  function moveActive(direction) {
    if (!filteredReviews.length) return;
    const currentIndex = Math.max(0, filteredReviews.findIndex((review) => review.id === activeReview?.id));
    const nextIndex = Math.min(filteredReviews.length - 1, Math.max(0, currentIndex + direction));
    setActiveReviewId(filteredReviews[nextIndex].id);
  }

  function handleRefresh() {
    submitAction('sync', []);
  }

  function handleSaveDraft() {
    if (!activeReview || activeReview.status === 'skipped' || !draftValue.trim()) return;

    const formData = new FormData();
    formData.set('intent', 'update-draft');
    formData.set('id', activeReview.id);
    formData.set('draft', draftValue);
    fetcher.submit(formData, {method: 'post'});
  }

  const promotedBulkActions = [
    {
      content: `Generate ${selectedUngeneratedPendingIds.length || ''}`.trim(),
      icon: MagicIcon,
      onAction: () => submitAction('generate', selectedUngeneratedPendingIds),
      disabled: !aiConfigured || !selectedUngeneratedPendingIds.length || isSubmitting,
    },
    {
      content: `Approve & send all ${selectedGeneratedPendingIds.length || ''}`.trim(),
      icon: SendIcon,
      onAction: () => submitAction('send', selectedGeneratedPendingIds),
      disabled: !selectedGeneratedPendingIds.length || isSubmitting,
    },
    {
      content: 'Regenerate',
      icon: RefreshIcon,
      onAction: () => submitAction('regenerate', selectedGeneratedPendingIds),
      disabled: !aiConfigured || !selectedGeneratedPendingIds.length || isSubmitting,
    },
  ];

  const bulkActions = [
    {
      content: "Don't reply",
      icon: XIcon,
      onAction: () => submitAction('skip', selectedPendingIds),
      disabled: !selectedPendingIds.length || isSubmitting,
    },
    {
      content: 'Restore',
      icon: RefreshIcon,
      onAction: () => submitAction('restore', selectedSkippedIds),
      disabled: !selectedSkippedIds.length || isSubmitting,
    },
  ];

  const rowMarkup = filteredReviews.map((review, index) => (
    <IndexTable.Row
      id={review.id}
      key={review.id}
      selected={selectedIds.includes(review.id)}
      position={index}
      tone={review.id === activeReview?.id ? 'success' : undefined}
      onClick={() => setActiveReviewId(review.id)}
    >
      <IndexTable.Cell>
        <CustomerCell review={review} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div className="rp-product-cell">
          <Text as="span" variant="bodyMd">{review.product}</Text>
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div className="rp-review-cell">
          <Text as="p" variant="bodyMd">
            <span className="rp-line-clamp">"{review.review}"</span>
          </Text>
          <InlineStack gap="200" blockAlign="center">
            {review.status === 'skipped' ? (
              <Badge tone="attention">Skipped</Badge>
            ) : !hasDraft(review) ? (
              <Badge tone="info">Draft needed</Badge>
            ) : (
              <span className="rp-draft-ready">✶ draft ready</span>
            )}
            {review.human ? <Badge tone="critical">Human</Badge> : null}
            {review.lastError ? <Badge tone="critical">AI error</Badge> : null}
          </InlineStack>
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {hasDraft(review) ? (
          <ConfidenceMeter value={review.confidence} />
        ) : (
          <Text as="span" variant="bodySm" tone="subdued">Not generated</Text>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="subdued">{review.age}</Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <BlockStack gap="400">
      {localToast ? (
        <div className={`rp-local-toast ${localToast.isError ? 'is-error' : ''}`} role="status">
          {localToast.message}
        </div>
      ) : null}

      <ResultBanner result={fetcher.data} syncError={pageData.syncError} />
      {!aiConfigured ? (
        <Banner tone="critical">
          <Text as="p" variant="bodyMd">
            {aiConfig.dailyLimitReached
              ? `All Gemini/Gemma variants configured for Brand Voice are exhausted for ${aiConfig.dayKey || 'today'}. Queue generation will resume when the daily pool resets.`
              : `The AI model selected in Brand Voice is missing backend configuration${aiConfig.missingEnv ? ` (${aiConfig.missingEnv})` : ''}. Queue generation is paused until it is configured.`}
          </Text>
        </Banner>
      ) : null}

      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <div className="rp-title-row">
            <Text as="h1" variant="heading2xl">Reply Pilot · Inbox</Text>
            <span className="rp-title-metric is-yellow">{stats.pending} pending</span>
            {stats.ungenerated ? <span className="rp-title-metric">{stats.ungenerated} need draft</span> : null}
            <span className="rp-title-metric is-green">{stats.sentToday} sent today</span>
            {stats.skipped ? <span className="rp-title-metric">{stats.skipped} skipped</span> : null}
          </div>
          <Text as="p" variant="bodyLg" tone="subdued">
            Review approvals stay table-first for speed while the AI draft remains visible in the side panel.
          </Text>
        </BlockStack>
        <Button icon={RefreshIcon} loading={isSubmitting && fetcher.formData?.get('intent') === 'sync'} onClick={handleRefresh}>
          Refresh
        </Button>
      </InlineStack>

      <div className="rp-queue-shell">
        <div className="rp-queue-header">
          <InlineStack align="space-between" blockAlign="center" gap="300">
            <InlineStack gap="200" blockAlign="center">
              <span className="rp-brand-lockup">
                <span className="rp-brand-mark">
                  <Icon source={MagicIcon} tone="base" />
                </span>
                <span className="rp-brand-name">Queue</span>
              </span>
              <Badge tone="info">Shortcuts enabled</Badge>
            </InlineStack>
            <InlineStack gap="200" blockAlign="center">
              <Badge tone={aiConfigured ? 'info' : 'critical'}>AI: {aiDisplayName}</Badge>
              <Text as="span" variant="bodySm" tone="subdued">{aiProvider} from Brand Voice</Text>
              <Badge>{pageData.connected ? 'Judge.me connected' : 'Source missing'}</Badge>
              <Badge tone={pageData.connected ? 'success' : 'attention'}>{pageData.connected ? 'Ready' : 'Setup needed'}</Badge>
            </InlineStack>
          </InlineStack>
        </div>

        <div className="rp-queue-filterbar">
          <InlineStack align="space-between" blockAlign="center" gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">FILTER</Text>
              <div className="rp-filter-select">
                <Select
                  label="Stars"
                  labelHidden
                  options={[
                    {label: 'All stars', value: 'all'},
                    {label: '5 stars', value: '5'},
                    {label: '4 stars', value: '4'},
                    {label: '3 stars', value: '3'},
                    {label: '2 stars', value: '2'},
                    {label: '1 star', value: '1'},
                  ]}
                  value={starFilter}
                  onChange={setStarFilter}
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
              <Button pressed={highConfidenceOnly} tone={highConfidenceOnly ? 'critical' : undefined} onClick={() => setHighConfidenceOnly((value) => !value)}>
                High confidence
              </Button>
              <Button pressed={needsHumanOnly} icon={AlertTriangleIcon} onClick={() => setNeedsHumanOnly((value) => !value)}>
                Needs human
              </Button>
              <Button pressed={lastSevenDaysOnly} onClick={() => setLastSevenDaysOnly((value) => !value)}>
                Last 7 days
              </Button>
              <Checkbox
                label={`Show skipped${stats.skipped ? ` (${stats.skipped})` : ''}`}
                checked={showSkipped}
                onChange={setShowSkipped}
              />
            </InlineStack>
            <Button onClick={() => setSortNewest((value) => !value)}>
              {sortNewest ? 'Newest' : 'Oldest'}
            </Button>
          </InlineStack>
        </div>

        <div className="rp-bulkbar">
          <InlineStack align="space-between" blockAlign="center" gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="bodyMd" fontWeight="semibold">{selectedCount} selected</Text>
              <Button icon={MagicIcon} disabled={!aiConfigured || !selectedUngeneratedPendingIds.length || isSubmitting} onClick={() => submitAction('generate', selectedUngeneratedPendingIds)}>
                Generate {selectedUngeneratedPendingIds.length}
              </Button>
              <Button icon={SendIcon} variant="primary" disabled={!selectedGeneratedPendingIds.length || isSubmitting} onClick={() => submitAction('send', selectedGeneratedPendingIds)}>
                Approve & send all {selectedGeneratedPendingIds.length}
              </Button>
              <Button icon={RefreshIcon} disabled={!aiConfigured || !selectedGeneratedPendingIds.length || isSubmitting} onClick={() => submitAction('regenerate', selectedGeneratedPendingIds)}>
                Regenerate
              </Button>
              <Button icon={XIcon} disabled={!selectedPendingIds.length || isSubmitting} onClick={() => submitAction('skip', selectedPendingIds)}>
                Don't reply
              </Button>
              {showSkipped ? (
                <Button icon={RefreshIcon} disabled={!selectedSkippedIds.length || isSubmitting} onClick={() => submitAction('restore', selectedSkippedIds)}>
                  Restore {selectedSkippedIds.length}
                </Button>
              ) : null}
            </InlineStack>
            <InlineStack gap="200" blockAlign="center">
              {ungeneratedVisible.length ? (
                <Button icon={MagicIcon} disabled={!aiConfigured || isSubmitting} onClick={() => submitAction('generate', ungeneratedVisible.map((review) => review.id))}>
                  Generate missing {ungeneratedVisible.length}
                </Button>
              ) : null}
              <Text as="span" variant="bodyMd" tone="critical">{highConfidenceVisible.length} high-conf - select all</Text>
              <Button disabled={!highConfidenceVisible.length} onClick={() => setSelectedIds(highConfidenceVisible.map((review) => review.id))}>
                Select all {highConfidenceVisible.length}
              </Button>
              <Button variant="plain" onClick={() => setSelectedIds([])}>Clear</Button>
            </InlineStack>
          </InlineStack>
        </div>

        <div className="rp-queue-grid">
          <div className="rp-index-pane rp-index-table">
            {filteredReviews.length ? (
              <IndexTable
                resourceName={{singular: 'review', plural: 'reviews'}}
                itemCount={filteredReviews.length}
                selectedItemsCount={selectedCount === filteredReviews.length && selectedCount ? 'All' : selectedCount}
                onSelectionChange={handleSelectionChange}
                promotedBulkActions={promotedBulkActions}
                bulkActions={bulkActions}
                headings={[
                  {title: 'Customer'},
                  {title: 'Product'},
                  {title: 'Review'},
                  {title: 'Conf.'},
                  {title: 'Age'},
                ]}
              >
                {rowMarkup}
              </IndexTable>
            ) : (
              <QueueEmptyState connected={pageData.connected} onRefresh={handleRefresh} />
            )}
          </div>

          <aside className="rp-detail-panel" aria-label="AI draft">
            {activeReview ? (
              <>
                <div className="rp-detail-body">
                  <InlineStack align="space-between" blockAlign="start" gap="300">
                    <InlineStack gap="300" blockAlign="start" wrap={false}>
                      <span className="rp-avatar">{activeReview.initials}</span>
                      <BlockStack gap="100">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="h2" variant="headingLg">{activeReview.customer}</Text>
                          <Stars rating={activeReview.rating} />
                          <Text as="span" variant="bodySm" tone="subdued">{activeReview.age} ago</Text>
                        </InlineStack>
                        <Text as="p" variant="bodyMd" tone="subdued">{activeReview.product}</Text>
                      </BlockStack>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      {activeReview.status === 'skipped' ? <Badge tone="attention">Skipped</Badge> : null}
                      <Badge>Judge.me</Badge>
                    </InlineStack>
                  </InlineStack>

                  <div className="rp-quote">
                    <Text as="p" variant="bodyMd">"{activeReview.review}"</Text>
                  </div>

                  {activeReview.lastError ? (
                    <Banner tone="critical">
                      <BlockStack gap="150">
                        <Text as="p" variant="bodyMd">The last AI generation attempt for this review failed.</Text>
                        <pre className="rp-json-preview is-error">{formatErrorPreview(activeReview.lastError)}</pre>
                      </BlockStack>
                    </Banner>
                  ) : null}

                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={MagicIcon} tone="critical" />
                      <Text as="h3" variant="headingMd" tone="critical">AI draft</Text>
                    </InlineStack>
                    {activeHasDraft ? (
                      <InlineStack gap="200" blockAlign="center">
                        {activeReview.aiModel ? (
                          <Text as="span" variant="bodySm" tone="subdued">
                            {activeReview.aiModel.name}
                          </Text>
                        ) : null}
                        <ConfidenceMeter value={activeReview.confidence} />
                      </InlineStack>
                    ) : (
                      <Badge tone="info">Not generated</Badge>
                    )}
                  </InlineStack>

                  <div className="rp-draft-box">
                    {isEditing ? (
                      <BlockStack gap="300">
                        <TextField
                          label="Draft reply"
                          labelHidden
                          value={draftValue}
                          onChange={setDraftValue}
                          multiline={8}
                          autoComplete="off"
                        />
                        <InlineStack align="end" gap="200">
                          <Button onClick={() => { setDraftValue(activeReview.draft); setIsEditing(false); }}>
                            Cancel
                          </Button>
                          <Button variant="primary" loading={isSubmitting && fetcher.formData?.get('intent') === 'update-draft'} onClick={handleSaveDraft}>
                            Save draft
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    ) : !activeHasDraft ? (
                      <BlockStack gap="250" align="center">
                        <span className="rp-empty-mark is-blue">
                          <Icon source={MagicIcon} tone="base" />
                        </span>
                        <Text as="h3" variant="headingMd" alignment="center">No draft generated yet</Text>
                        <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                          Generate this reply when you are ready. Existing drafts are left untouched.
                        </Text>
                        {activeReview.status === 'pending' ? (
                          <Button icon={MagicIcon} variant="primary" disabled={!aiConfigured} loading={isSubmitting && fetcher.formData?.get('intent') === 'generate'} onClick={() => submitSingle('generate', activeReview.id)}>
                            Generate reply
                          </Button>
                        ) : null}
                      </BlockStack>
                    ) : (
                      <Text as="p" variant="bodyLg">{activeReview.draft}</Text>
                    )}
                  </div>

                  <BlockStack gap="200">
                    <Text as="span" variant="bodySm" tone="subdued">Nudge</Text>
                    <InlineStack gap="200">
                      <Button size="slim" disabled={!aiConfigured || isSubmitting || activeReview.status === 'skipped' || !activeHasDraft} onClick={() => submitSingle('regenerate', activeReview.id, {nudge: 'shorter'})}>Shorter</Button>
                      <Button size="slim" disabled={!aiConfigured || isSubmitting || activeReview.status === 'skipped' || !activeHasDraft} onClick={() => submitSingle('regenerate', activeReview.id, {nudge: 'warmer'})}>Warmer</Button>
                      <Button size="slim" disabled={!aiConfigured || isSubmitting || activeReview.status === 'skipped' || !activeHasDraft} onClick={() => submitSingle('regenerate', activeReview.id, {nudge: 'artisan'})}>+ artisan</Button>
                      <Button size="slim" icon={RefreshIcon} disabled={!aiConfigured || isSubmitting || activeReview.status === 'skipped' || !activeHasDraft} onClick={() => submitSingle('regenerate', activeReview.id)}>Regenerate</Button>
                    </InlineStack>
                  </BlockStack>
                </div>

                <div className="rp-detail-footer">
                  <BlockStack gap="300">
                    <InlineStack gap="200" wrap={false}>
                      {activeReview.status === 'skipped' ? (
                        <Button icon={RefreshIcon} variant="primary" size="large" fullWidth loading={isSubmitting && fetcher.formData?.get('intent') === 'restore'} onClick={() => submitSingle('restore', activeReview.id)}>
                          Restore to queue
                        </Button>
                      ) : !activeHasDraft ? (
                        <Button icon={MagicIcon} variant="primary" size="large" fullWidth disabled={!aiConfigured} loading={isSubmitting && fetcher.formData?.get('intent') === 'generate'} onClick={() => submitSingle('generate', activeReview.id)}>
                          Generate reply
                        </Button>
                      ) : (
                        <Button icon={SendIcon} variant="primary" size="large" fullWidth loading={isSubmitting && fetcher.formData?.get('intent') === 'send'} onClick={() => submitSingle('send', activeReview.id)}>
                          Approve & send
                        </Button>
                      )}
                      <Button icon={EditIcon} accessibilityLabel="Edit draft" disabled={activeReview.status === 'skipped'} onClick={() => setIsEditing(true)} />
                      <Button icon={RefreshIcon} accessibilityLabel="Regenerate draft" disabled={!aiConfigured || isSubmitting || activeReview.status === 'skipped' || !activeHasDraft} onClick={() => submitSingle('regenerate', activeReview.id)} />
                      <Button icon={XIcon} accessibilityLabel="Do not reply" disabled={isSubmitting || activeReview.status === 'skipped'} onClick={() => submitSingle('skip', activeReview.id)} />
                    </InlineStack>
                    {activeReview.status === 'skipped' ? (
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Restore this message to edit, regenerate, or send it.
                      </Text>
                    ) : !activeHasDraft ? (
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Generate a draft before approving this reply.
                      </Text>
                    ) : (
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Enter approve · E edit · J/K next · Cmd A select all
                      </Text>
                    )}
                  </BlockStack>
                </div>
              </>
            ) : (
              <div className="rp-detail-body">
                <Card>
                  <BlockStack gap="250" align="center">
                    <span className="rp-empty-mark">
                      <Icon source={MagicIcon} tone="base" />
                    </span>
                    <Text as="h2" variant="headingMd" alignment="center">Nothing selected</Text>
                    <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                      Select a review when messages appear to inspect the draft and send it.
                    </Text>
                  </BlockStack>
                </Card>
              </div>
            )}
          </aside>
        </div>
      </div>
    </BlockStack>
  );
}

export default function ReviewsPage() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <QueueLoadingState />;
  }

  return <ReviewsContent />;
}
