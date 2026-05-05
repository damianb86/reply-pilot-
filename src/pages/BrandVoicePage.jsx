/* eslint-disable react/prop-types, react/no-unescaped-entities */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFetcher, useLoaderData} from 'react-router';
import {SaveBar, useAppBridge} from '@shopify/app-bridge-react';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Icon,
  InlineGrid,
  InlineStack,
  Select,
  Tag,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  DeleteIcon,
  ImportIcon,
  MagicIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  XIcon,
} from '@shopify/polaris-icons';
import {
  defaultAvoidPhrases,
  defaultBrandVoice,
} from '../brandVoiceData';

const settingsSections = [
  {id: 'connections', label: 'Connections'},
  {id: 'brand-voice', label: 'Brand voice'},
  {id: 'ai-model', label: 'AI model'},
];
const sectionIds = settingsSections.map((section) => section.id);
const defaultAlwaysMention = ['product detail', 'what the customer noticed', 'next step when needed'];
const defaultPreviewReview = 'Obsessed with these napkins. The fabric feels substantial, the print looks even better in person, and they made our dinner table feel special.';
const personalityStyleOptions = [
  {label: 'Balanced', value: 'balanced'},
  {label: 'Formal', value: 'formal'},
  {label: 'Casual', value: 'casual'},
  {label: 'Warm', value: 'warm'},
  {label: 'Playful', value: 'playful'},
  {label: 'Direct', value: 'direct'},
  {label: 'Premium', value: 'premium'},
];
const personalityStrengthOptions = [
  {label: 'Subtle', value: 'subtle'},
  {label: 'Balanced', value: 'balanced'},
  {label: 'Expressive', value: 'expressive'},
];
const replyLengthOptions = [
  {label: 'Short', value: 'short'},
  {label: 'Medium', value: 'medium'},
  {label: 'Long', value: 'long'},
  {label: 'Very long', value: 'very_long'},
];
const previewRatingOptions = [
  {label: '5 stars', value: '5'},
  {label: '4 stars', value: '4'},
  {label: '3 stars', value: '3'},
  {label: '2 stars', value: '2'},
  {label: '1 star', value: '1'},
];

function RuleTags({items, onRemove}) {
  return (
    <div className="rp-tag-list">
      {items.map((item) => (
        <Tag key={item} onRemove={() => onRemove(item)}>{item}</Tag>
      ))}
    </div>
  );
}

function AddRule({value, onChange, onAdd, placeholder, label}) {
  return (
    <InlineStack gap="200" blockAlign="end">
      <div style={{flex: 1}}>
        <TextField
          label={label}
          labelHidden
          value={value}
          onChange={onChange}
          autoComplete="off"
          placeholder={placeholder}
        />
      </div>
      <Button icon={PlusIcon} accessibilityLabel={label} onClick={onAdd} />
    </InlineStack>
  );
}

function ExampleRow({example, onRemove}) {
  return (
    <div className="rp-example-row">
      <span className="rp-rating-chip">{example.rating ? `${example.rating}★` : 'Reply'}</span>
      <BlockStack gap="050">
        <Text as="p" variant="bodyMd">
          <span className="rp-line-clamp">{example.text}</span>
        </Text>
        {example.source ? (
          <Text as="span" variant="bodySm" tone="subdued">{example.source}</Text>
        ) : null}
      </BlockStack>
      <Button icon={DeleteIcon} variant="plain" accessibilityLabel="Remove example reply" onClick={onRemove} />
    </div>
  );
}

function ModelCard({model, selected, onSelect}) {
  return (
    <button
      type="button"
      className={`rp-model-card ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
    >
      <BlockStack gap="200">
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <span className="rp-model-radio" aria-hidden="true" />
          <Text as="span" variant="bodyMd" fontWeight="bold">{model.name}</Text>
        </InlineStack>
        <BlockStack gap="050">
          <InlineStack gap="150" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">{model.provider}</Text>
            <Badge tone={model.configured ? 'success' : 'attention'}>
              {model.configured ? 'Configured' : `Missing ${model.missingEnv}`}
            </Badge>
          </InlineStack>
          <Text as="span" variant="bodySm" tone="subdued">{model.detail}</Text>
          <Text as="span" variant="bodySm">{model.bestFor}</Text>
          {model.activeVariant ? (
            <InlineStack gap="150" blockAlign="center">
              <Badge tone="info">Using now</Badge>
              <Text as="span" variant="bodySm">{model.activeVariant.name}</Text>
            </InlineStack>
          ) : null}
          {model.exhaustedVariants?.length ? (
            <Text as="span" variant="bodySm" tone="subdued">
              Exhausted today: {model.exhaustedVariants.map((variant) => variant.name).join(', ')}
            </Text>
          ) : null}
        </BlockStack>
      </BlockStack>
    </button>
  );
}

function buildConfig(settings, defaultSelectedModel) {
  return {
    persona: settings?.persona ?? defaultBrandVoice.persona,
    greeting: settings?.greeting ?? defaultBrandVoice.greeting,
    signOff: settings?.signOff ?? defaultBrandVoice.signOff,
    alwaysMention: Array.isArray(settings?.alwaysMention) ? settings.alwaysMention : defaultAlwaysMention,
    avoidPhrases: Array.isArray(settings?.avoidPhrases) ? settings.avoidPhrases : defaultAvoidPhrases,
    selectedModel: settings?.selectedModel ?? defaultSelectedModel,
    livePreview: settings?.livePreview ?? '',
    previewReview: settings?.previewReview ?? defaultPreviewReview,
    previewProductId: settings?.previewProductId ?? '',
    previewProductTitle: settings?.previewProductTitle ?? '',
    previewProductType: settings?.previewProductType ?? '',
    previewProductTags: Array.isArray(settings?.previewProductTags) ? settings.previewProductTags : [],
    previewRating: String(settings?.previewRating ?? '5'),
    personalityStyle: settings?.personalityStyle ?? 'balanced',
    personalityStrength: settings?.personalityStrength ?? 'balanced',
    replyLength: settings?.replyLength ?? 'medium',
  };
}

function configSignature(config) {
  return JSON.stringify({
    persona: config.persona || '',
    greeting: config.greeting || '',
    signOff: config.signOff || '',
    alwaysMention: Array.isArray(config.alwaysMention) ? config.alwaysMention : [],
    avoidPhrases: Array.isArray(config.avoidPhrases) ? config.avoidPhrases : [],
    selectedModel: config.selectedModel || '',
    personalityStyle: config.personalityStyle || 'balanced',
    personalityStrength: config.personalityStrength || 'balanced',
    replyLength: config.replyLength || 'medium',
    livePreview: config.livePreview || '',
    previewReview: config.previewReview || '',
    previewProductId: config.previewProductId || '',
    previewProductTitle: config.previewProductTitle || '',
    previewProductType: config.previewProductType || '',
    previewProductTags: Array.isArray(config.previewProductTags) ? config.previewProductTags : [],
    previewRating: config.previewRating || '5',
  });
}

export default function BrandVoicePage() {
  const shopify = useAppBridge();
  const loaderData = useLoaderData();
  const saveFetcher = useFetcher();
  const importFetcher = useFetcher();
  const personalityFetcher = useFetcher();
  const previewFetcher = useFetcher();
  const productFetcher = useFetcher();
  const testFetcher = useFetcher();
  const connection = loaderData.connection;
  const loaderAiModels = useMemo(() => loaderData.aiModels ?? [], [loaderData.aiModels]);
  const defaultSelectedModel = loaderData.defaultAiModelId ?? loaderAiModels[0]?.id ?? 'gemini-3-flash-preview';
  const importedReplyOptions = [
    {label: 'Last 10 replies', value: '10'},
    {label: 'Last 25 replies', value: '25'},
    {label: 'Last 50 replies', value: '50'},
  ];
  const initialConfig = useMemo(
    () => buildConfig(loaderData.settings, defaultSelectedModel),
    [loaderData.settings, defaultSelectedModel],
  );

  const [persona, setPersona] = useState(initialConfig.persona);
  const [greeting, setGreeting] = useState(initialConfig.greeting);
  const [signOff, setSignOff] = useState(initialConfig.signOff);
  const [alwaysMention, setAlwaysMention] = useState(initialConfig.alwaysMention);
  const [avoidPhrases, setAvoidPhrases] = useState(initialConfig.avoidPhrases);
  const [alwaysInput, setAlwaysInput] = useState('');
  const [avoidInput, setAvoidInput] = useState('');
  const [aiModels, setAiModels] = useState(loaderAiModels);
  const [selectedModel, setSelectedModel] = useState(initialConfig.selectedModel);
  const [personalityStyle, setPersonalityStyle] = useState(initialConfig.personalityStyle);
  const [personalityStrength, setPersonalityStrength] = useState(initialConfig.personalityStrength);
  const [replyLength, setReplyLength] = useState(initialConfig.replyLength);
  const [exampleReplies, setExampleReplies] = useState([]);
  const [importLimit, setImportLimit] = useState('25');
  const [livePreview, setLivePreview] = useState(initialConfig.livePreview);
  const [previewReview, setPreviewReview] = useState(initialConfig.previewReview);
  const [previewProductId, setPreviewProductId] = useState(initialConfig.previewProductId);
  const [previewProductTitle, setPreviewProductTitle] = useState(initialConfig.previewProductTitle);
  const [previewProductType, setPreviewProductType] = useState(initialConfig.previewProductType);
  const [previewProductTags, setPreviewProductTags] = useState(initialConfig.previewProductTags);
  const [previewRating, setPreviewRating] = useState(initialConfig.previewRating);
  const [activeSection, setActiveSection] = useState('brand-voice');
  const [savedConfig, setSavedConfig] = useState(initialConfig);
  const [localToast, setLocalToast] = useState(null);
  const lastToastKey = useRef('');

  const wordCount = useMemo(
    () => persona.trim().split(/\s+/).filter(Boolean).length,
    [persona],
  );

  const previewReply = useMemo(() => {
    const safeGreeting = greeting.replace('{name}', 'Anya').trim() || 'Hi Anya -';
    const safeSignOff = signOff.trim() || '- The team';
    return `${safeGreeting} thank you for sharing this. We appreciate the specific detail in your review and are glad the order felt right in person.\n\n${safeSignOff}`;
  }, [greeting, signOff]);
  const selectedModelConfig = aiModels.find((model) => model.id === selectedModel);
  const selectedModelConfigured = selectedModelConfig?.configured ?? false;

  const currentConfig = useMemo(() => ({
    persona,
    greeting,
    signOff,
    alwaysMention,
    avoidPhrases,
    selectedModel,
    personalityStyle,
    personalityStrength,
    replyLength,
    livePreview,
    previewReview,
    previewProductId,
    previewProductTitle,
    previewProductType,
    previewProductTags,
    previewRating,
  }), [
    persona,
    greeting,
    signOff,
    alwaysMention,
    avoidPhrases,
    selectedModel,
    personalityStyle,
    personalityStrength,
    replyLength,
    livePreview,
    previewReview,
    previewProductId,
    previewProductTitle,
    previewProductType,
    previewProductTags,
    previewRating,
  ]);

  const isDirty = configSignature(currentConfig) !== configSignature(savedConfig);

  const showToast = useCallback((data) => {
    if (!data?.message) return;

    const key = `${data.intent || 'action'}:${data.ok ? 'ok' : 'error'}:${data.message}`;
    if (lastToastKey.current === key) return;
    lastToastKey.current = key;

    if (!data.ok && data.error) {
      // Keep full debug details out of the page while preserving them for local debugging.
      console.error('Brand voice action failed', data.error);
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
    setAiModels(loaderAiModels);
  }, [loaderAiModels]);

  useEffect(() => {
    function handleScroll() {
      const visibleSection = sectionIds
        .map((id) => {
          const element = document.getElementById(id);
          if (!element) return null;
          return {id, top: Math.abs(element.getBoundingClientRect().top - 96)};
        })
        .filter(Boolean)
        .sort((a, b) => a.top - b.top)[0];

      if (visibleSection) {
        setActiveSection(visibleSection.id);
      }
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, {passive: true});
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    showToast(importFetcher.data);

    if (importFetcher.data?.ok && importFetcher.data.intent === 'import-replies') {
      if (Array.isArray(importFetcher.data.importedReplies) && importFetcher.data.importedReplies.length) {
        setExampleReplies(importFetcher.data.importedReplies);
      }
    }
  }, [importFetcher.data, showToast]);

  useEffect(() => {
    showToast(personalityFetcher.data);
    if (Array.isArray(personalityFetcher.data?.aiModels)) {
      setAiModels(personalityFetcher.data.aiModels);
    }

    if (personalityFetcher.data?.ok && personalityFetcher.data.intent === 'generate-personality') {
      if (personalityFetcher.data.personality) {
        setPersona(personalityFetcher.data.personality);
      }

      if (personalityFetcher.data.livePreview) {
        setLivePreview(personalityFetcher.data.livePreview);
      }
    }
  }, [personalityFetcher.data, showToast]);

  useEffect(() => {
    showToast(previewFetcher.data);
    if (Array.isArray(previewFetcher.data?.aiModels)) {
      setAiModels(previewFetcher.data.aiModels);
    }

    if (previewFetcher.data?.ok && previewFetcher.data.livePreview) {
      setLivePreview(previewFetcher.data.livePreview);
    }
  }, [previewFetcher.data, showToast]);

  useEffect(() => {
    showToast(productFetcher.data);

    if (productFetcher.data?.ok && productFetcher.data.product) {
      const product = productFetcher.data.product;
      setPreviewProductId(product.id || '');
      setPreviewProductTitle(product.title || '');
      setPreviewProductType(product.productType || '');
      setPreviewProductTags(Array.isArray(product.tags) ? product.tags : []);
    }
  }, [productFetcher.data, showToast]);

  useEffect(() => {
    showToast(saveFetcher.data);
    if (Array.isArray(saveFetcher.data?.aiModels)) {
      setAiModels(saveFetcher.data.aiModels);
    }

    if (saveFetcher.data?.ok && saveFetcher.data.intent === 'save-settings') {
      const nextConfig = buildConfig(saveFetcher.data.settings, defaultSelectedModel);
      setPersona(nextConfig.persona);
      setGreeting(nextConfig.greeting);
      setSignOff(nextConfig.signOff);
      setAlwaysMention(nextConfig.alwaysMention);
      setAvoidPhrases(nextConfig.avoidPhrases);
      setSelectedModel(nextConfig.selectedModel);
      setPersonalityStyle(nextConfig.personalityStyle);
      setPersonalityStrength(nextConfig.personalityStrength);
      setReplyLength(nextConfig.replyLength);
      setLivePreview(nextConfig.livePreview);
      setPreviewReview(nextConfig.previewReview);
      setPreviewProductId(nextConfig.previewProductId);
      setPreviewProductTitle(nextConfig.previewProductTitle);
      setPreviewProductType(nextConfig.previewProductType);
      setPreviewProductTags(nextConfig.previewProductTags);
      setPreviewRating(nextConfig.previewRating);
      setSavedConfig(nextConfig);
    }
  }, [saveFetcher.data, defaultSelectedModel, showToast]);

  useEffect(() => {
    showToast(testFetcher.data);
    if (Array.isArray(testFetcher.data?.aiModels)) {
      setAiModels(testFetcher.data.aiModels);
    }
  }, [testFetcher.data, showToast]);

  function addAlwaysMention() {
    const nextValue = alwaysInput.trim();
    if (!nextValue || alwaysMention.includes(nextValue)) return;
    setAlwaysMention((current) => [...current, nextValue]);
    setAlwaysInput('');
  }

  function addAvoidPhrase() {
    const nextValue = avoidInput.trim();
    if (!nextValue || avoidPhrases.includes(nextValue)) return;
    setAvoidPhrases((current) => [...current, nextValue]);
    setAvoidInput('');
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function applyConfig(config) {
    setPersona(config.persona);
    setGreeting(config.greeting);
    setSignOff(config.signOff);
    setAlwaysMention(config.alwaysMention);
    setAvoidPhrases(config.avoidPhrases);
    setSelectedModel(config.selectedModel);
    setPersonalityStyle(config.personalityStyle);
    setPersonalityStrength(config.personalityStrength);
    setReplyLength(config.replyLength);
    setLivePreview(config.livePreview);
    setPreviewReview(config.previewReview);
    setPreviewProductId(config.previewProductId);
    setPreviewProductTitle(config.previewProductTitle);
    setPreviewProductType(config.previewProductType);
    setPreviewProductTags(config.previewProductTags);
    setPreviewRating(config.previewRating);
  }

  function loadPreviewProduct(productId) {
    const formData = new FormData();
    formData.set('intent', 'load-preview-product');
    formData.set('productId', productId);
    productFetcher.submit(formData, {method: 'post'});
  }

  async function handlePreviewProductPicker() {
    try {
      const selection = await shopify.resourcePicker({
        type: 'product',
        multiple: false,
        selectionIds: previewProductId ? [{id: previewProductId}] : [],
      });
      const selectedProduct = Array.isArray(selection) ? selection[0] : null;
      if (!selectedProduct?.id) return;

      setPreviewProductId(selectedProduct.id);
      setPreviewProductTitle(selectedProduct.title || 'Selected product');
      setPreviewProductType('');
      setPreviewProductTags([]);
      loadPreviewProduct(selectedProduct.id);
    } catch (error) {
      console.error('Product picker failed', error);
      setLocalToast({message: 'Product picker could not be opened.', isError: true});
      window.setTimeout(() => setLocalToast(null), 8000);
    }
  }

  function handleClearPreviewProduct() {
    setPreviewProductId('');
    setPreviewProductTitle('');
    setPreviewProductType('');
    setPreviewProductTags([]);
  }

  function handleSave() {
    const formData = new FormData();
    formData.set('intent', 'save-settings');
    formData.set('personality', persona);
    formData.set('greeting', greeting);
    formData.set('signOff', signOff);
    formData.set('alwaysMention', JSON.stringify(alwaysMention));
    formData.set('avoidPhrases', JSON.stringify(avoidPhrases));
    formData.set('modelId', selectedModel);
    formData.set('personalityStyle', personalityStyle);
    formData.set('personalityStrength', personalityStrength);
    formData.set('replyLength', replyLength);
    formData.set('livePreview', livePreview);
    formData.set('previewReview', previewReview);
    formData.set('previewProductId', previewProductId);
    formData.set('previewProductTitle', previewProductTitle);
    formData.set('previewProductType', previewProductType);
    formData.set('previewProductTags', JSON.stringify(previewProductTags));
    formData.set('previewRating', previewRating);
    saveFetcher.submit(formData, {method: 'post'});
  }

  function handleDiscard() {
    applyConfig(savedConfig);
  }

  function handleImportReplies() {
    const formData = new FormData();
    formData.set('intent', 'import-replies');
    formData.set('limit', importLimit);
    importFetcher.submit(formData, {method: 'post'});
  }

  function handleGeneratePersonality() {
    const formData = new FormData();
    formData.set('intent', 'generate-personality');
    formData.set('modelId', selectedModel);
    formData.set('personality', persona);
    formData.set('greeting', greeting);
    formData.set('signOff', signOff);
    formData.set('alwaysMention', JSON.stringify(alwaysMention));
    formData.set('avoidPhrases', JSON.stringify(avoidPhrases));
    formData.set('personalityStyle', personalityStyle);
    formData.set('personalityStrength', personalityStrength);
    formData.set('replyLength', replyLength);
    formData.set('previewReview', previewReview);
    formData.set('previewProductTitle', previewProductTitle);
    formData.set('previewProductType', previewProductType);
    formData.set('previewProductTags', JSON.stringify(previewProductTags));
    formData.set('previewRating', previewRating);
    formData.set('replies', JSON.stringify(exampleReplies));
    personalityFetcher.submit(formData, {method: 'post'});
  }

  function handleGeneratePreview() {
    const formData = new FormData();
    formData.set('intent', 'generate-preview');
    formData.set('modelId', selectedModel);
    formData.set('personality', persona);
    formData.set('greeting', greeting);
    formData.set('signOff', signOff);
    formData.set('alwaysMention', JSON.stringify(alwaysMention));
    formData.set('avoidPhrases', JSON.stringify(avoidPhrases));
    formData.set('personalityStyle', personalityStyle);
    formData.set('personalityStrength', personalityStrength);
    formData.set('replyLength', replyLength);
    formData.set('previewReview', previewReview);
    formData.set('previewProductTitle', previewProductTitle);
    formData.set('previewProductType', previewProductType);
    formData.set('previewProductTags', JSON.stringify(previewProductTags));
    formData.set('previewRating', previewRating);
    previewFetcher.submit(formData, {method: 'post'});
  }

  function handleTestModel() {
    const formData = new FormData();
    formData.set('intent', 'test-ai-model');
    formData.set('modelId', selectedModel);
    testFetcher.submit(formData, {method: 'post'});
  }

  function removeExampleReply(id) {
    setExampleReplies((current) => current.filter((example) => example.id !== id));
  }

  return (
    <BlockStack gap="400">
      <SaveBar open={isDirty}>
        <button variant="primary" disabled={saveFetcher.state !== 'idle'} onClick={handleSave}>Save</button>
        <button onClick={handleDiscard}>Discard</button>
      </SaveBar>

      {localToast ? (
        <div className={`rp-local-toast ${localToast.isError ? 'is-error' : ''}`} role="status">
          {localToast.message}
        </div>
      ) : null}

      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <Text as="h1" variant="heading2xl">Your brand voice</Text>
          <Text as="p" variant="bodyLg" tone="subdued">
            The more specific you get, the better. Edits to approved replies feed back into these rules.
          </Text>
        </BlockStack>
      </InlineStack>

      <div className="rp-settings-layout">
        <aside className="rp-settings-nav" aria-label="Settings sections">
          <BlockStack gap="150">
            <Text as="p" variant="bodySm" tone="subdued" fontWeight="semibold">SETTINGS</Text>
            {settingsSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`rp-settings-nav-item ${activeSection === section.id ? 'is-active' : ''}`}
                onClick={() => scrollToSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </BlockStack>
        </aside>

        <BlockStack gap="400">
          <section id="connections" className="rp-field-card">
            <BlockStack gap="350">
              <InlineStack align="space-between" blockAlign="start" gap="300">
                <InlineStack gap="300" blockAlign="start" wrap={false}>
                  <span className="rp-icon-tile is-blue">
                    <Icon source={ImportIcon} />
                  </span>
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingLg">Connections</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Import recent approved replies from Judge.me. Generation stays separate.
                    </Text>
                  </BlockStack>
                </InlineStack>
                <Badge tone={connection?.status === 'connected' ? 'success' : 'attention'}>
                  {connection?.status === 'connected' ? 'Judge.me connected' : 'Judge.me not connected'}
                </Badge>
              </InlineStack>

              <InlineGrid columns={{xs: 1, md: 2}} gap="300">
                <BlockStack gap="150">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Reply import</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Choose a batch size, then import. These replies will appear below as editable voice evidence.
                  </Text>
                </BlockStack>
                <InlineStack gap="200" blockAlign="end" align="end">
                  <div className="rp-filter-select">
                    <Select
                      label="Reply import count"
                      labelHidden
                      options={importedReplyOptions}
                      value={importLimit}
                      onChange={setImportLimit}
                    />
                  </div>
                  <Button
                    icon={ImportIcon}
                    variant="primary"
                    disabled={connection?.status !== 'connected'}
                    loading={importFetcher.state !== 'idle'}
                    onClick={handleImportReplies}
                  >
                    Import replies
                  </Button>
                </InlineStack>
              </InlineGrid>

              <InlineStack gap="200">
                <Button url="/app/dashboard">Manage source</Button>
                {connection?.shopDomain ? (
                  <Text as="span" variant="bodySm" tone="subdued">Connected shop: {connection.shopDomain}</Text>
                ) : null}
              </InlineStack>
            </BlockStack>
          </section>

          <section className="rp-field-card">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center" gap="300">
                <BlockStack gap="050">
                  <Text as="h2" variant="headingLg">Example replies</Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {exampleReplies.length
                      ? `${exampleReplies.length} imported · used to generate Personality`
                      : 'Import replies from Connections to start.'}
                  </Text>
                </BlockStack>
                <Button
                  icon={MagicIcon}
                  variant="primary"
                  disabled={!exampleReplies.length || !selectedModelConfigured}
                  loading={personalityFetcher.state !== 'idle'}
                  onClick={handleGeneratePersonality}
                >
                  Generate Personality
                </Button>
              </InlineStack>

              {exampleReplies.length ? (
                <BlockStack gap="200">
                  {exampleReplies.slice(0, 4).map((example) => (
                    <ExampleRow
                      key={example.id}
                      example={example}
                      onRemove={() => removeExampleReply(example.id)}
                    />
                  ))}
                  {exampleReplies.length > 4 ? (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Showing 4 of {exampleReplies.length}. All imported replies are sent when Personality is generated.
                    </Text>
                  ) : null}
                </BlockStack>
              ) : (
                <div className="rp-example-empty">
                  <Icon source={ImportIcon} tone="subdued" />
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No example replies imported yet.
                  </Text>
                </div>
              )}
            </BlockStack>
          </section>

          <section id="brand-voice" className="rp-field-card">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="end" gap="300">
                <InlineStack gap="150" blockAlign="end">
                  <Text as="h2" variant="headingLg">Personality</Text>
                  <Text as="span" variant="bodySm" tone="subdued">Describe who is replying</Text>
                </InlineStack>
                <Text as="span" variant="bodySm" tone="critical">Review generated text before saving</Text>
              </InlineStack>
              <TextField
                label="Personality"
                labelHidden
                value={persona}
                onChange={setPersona}
                autoComplete="off"
                multiline={8}
              />
              <InlineStack align="space-between" blockAlign="center">
                <span className="rp-word-count">~{wordCount} / 500 words</span>
                <Text as="span" variant="bodySm" tone="subdued">Saved only through Shopify Save</Text>
              </InlineStack>
            </BlockStack>
          </section>

          <InlineGrid columns={{xs: 1, md: 3}} gap="400">
            <div className="rp-field-card">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Personality style</Text>
                <Select
                  label="Personality style"
                  labelHidden
                  options={personalityStyleOptions}
                  value={personalityStyle}
                  onChange={setPersonalityStyle}
                />
                <Text as="p" variant="bodySm" tone="subdued">
                  Sets the voice lens for generated replies while keeping the imported examples as the source of truth.
                </Text>
              </BlockStack>
            </div>

            <div className="rp-field-card">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Personality strength</Text>
                <Select
                  label="Personality strength"
                  labelHidden
                  options={personalityStrengthOptions}
                  value={personalityStrength}
                  onChange={setPersonalityStrength}
                />
                <Text as="p" variant="bodySm" tone="subdued">
                  Controls whether the voice stays subtle or becomes more expressive in generated replies.
                </Text>
              </BlockStack>
            </div>

            <div className="rp-field-card">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Reply length</Text>
                <Select
                  label="Reply length"
                  labelHidden
                  options={replyLengthOptions}
                  value={replyLength}
                  onChange={setReplyLength}
                />
                <Text as="p" variant="bodySm" tone="subdued">
                  Controls how much detail Reply Pilot includes before the final sign-off.
                </Text>
              </BlockStack>
            </div>
          </InlineGrid>

          <InlineGrid columns={{xs: 1, md: 2}} gap="400">
            <div className="rp-field-card">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Sign-on greeting</Text>
                <TextField
                  label="Sign-on greeting"
                  labelHidden
                  value={greeting}
                  onChange={setGreeting}
                  autoComplete="off"
                />
                <Text as="p" variant="bodySm" tone="subdued">Variables: {'{name}'}, {'{product}'}, {'{stars}'}</Text>
              </BlockStack>
            </div>

            <div className="rp-field-card">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Sign-off</Text>
                <TextField
                  label="Sign-off"
                  labelHidden
                  value={signOff}
                  onChange={setSignOff}
                  autoComplete="off"
                />
                <Text as="p" variant="bodySm" tone="subdued">Can include a signature line or light brand detail.</Text>
              </BlockStack>
            </div>
          </InlineGrid>

          <InlineGrid columns={{xs: 1, md: 2}} gap="400">
            <div className="rp-field-card">
              <BlockStack gap="300">
                <InlineStack gap="150" blockAlign="end">
                  <Text as="h2" variant="headingMd">Always mention</Text>
                  <Text as="span" variant="bodySm" tone="subdued">When relevant</Text>
                </InlineStack>
                <RuleTags
                  items={alwaysMention}
                  onRemove={(item) => setAlwaysMention((current) => current.filter((value) => value !== item))}
                />
                <AddRule
                  label="Add always mention rule"
                  value={alwaysInput}
                  onChange={setAlwaysInput}
                  onAdd={addAlwaysMention}
                  placeholder="Add rule..."
                />
              </BlockStack>
            </div>

            <div className="rp-field-card">
              <BlockStack gap="300">
                <InlineStack gap="150" blockAlign="end">
                  <Text as="h2" variant="headingMd">Never use</Text>
                  <Text as="span" variant="bodySm" tone="subdued">Hard rules</Text>
                </InlineStack>
                <RuleTags
                  items={avoidPhrases}
                  onRemove={(item) => setAvoidPhrases((current) => current.filter((value) => value !== item))}
                />
                <AddRule
                  label="Add phrase to avoid"
                  value={avoidInput}
                  onChange={setAvoidInput}
                  onAdd={addAvoidPhrase}
                  placeholder="Add phrase..."
                />
              </BlockStack>
            </div>
          </InlineGrid>

          <section id="ai-model" className="rp-field-card">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="start">
                <BlockStack gap="050">
                  <InlineStack gap="150" blockAlign="end">
                    <Text as="h2" variant="headingLg">AI model</Text>
                    <Text as="span" variant="bodySm" tone="subdued">Who is writing</Text>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    API keys are read only on the server from environment variables. Missing keys disable generation and expose debug details here.
                  </Text>
                </BlockStack>
                <Badge tone="info">
                  {selectedModelConfig?.activeVariant
                    ? `Using ${selectedModelConfig.activeVariant.name}`
                    : 'Default: Gemini 3'}
                </Badge>
              </InlineStack>

              <div className="rp-model-grid">
                {aiModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    selected={selectedModel === model.id}
                    onSelect={() => setSelectedModel(model.id)}
                  />
                ))}
              </div>

              <InlineStack align="space-between" blockAlign="center" gap="300">
                <Text as="p" variant="bodySm" tone="subdued">
                  The selected model is used for Personality generation and Live preview. Gemini starts over daily and skips exhausted models for the current day.
                </Text>
                <Button
                  icon={RefreshIcon}
                  disabled={!selectedModelConfigured}
                  loading={testFetcher.state !== 'idle'}
                  onClick={handleTestModel}
                >
                  Test selected model
                </Button>
              </InlineStack>
            </BlockStack>
          </section>

          <section className="rp-field-card">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={MagicIcon} tone="critical" />
                  <Text as="h2" variant="headingLg" tone="critical">Live preview</Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    against your saved test review · {selectedModelConfig?.name ?? 'selected model'}
                  </Text>
                </InlineStack>
                <Button
                  icon={RefreshIcon}
                  disabled={!selectedModelConfigured}
                  loading={previewFetcher.state !== 'idle'}
                  onClick={handleGeneratePreview}
                >
                  Try again
                </Button>
              </InlineStack>

              <InlineGrid columns={{xs: 1, md: 2}} gap="300">
                <BlockStack gap="150">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Preview product</Text>
                  <Box borderColor="border" borderWidth="025" borderRadius="200" padding="300" background="bg-surface-secondary">
                    <InlineStack align="space-between" blockAlign="center" gap="300">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {previewProductTitle || 'No product selected'}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {previewProductTitle
                            ? [previewProductType, previewProductTags.slice(0, 4).join(', ')].filter(Boolean).join(' · ') || 'Title is sent to the AI.'
                            : 'Open Shopify product picker to search the full catalog.'}
                        </Text>
                      </BlockStack>
                      <InlineStack gap="150" wrap={false}>
                        <Button
                          icon={SearchIcon}
                          loading={productFetcher.state !== 'idle'}
                          onClick={handlePreviewProductPicker}
                        >
                          {previewProductTitle ? 'Change' : 'Select'}
                        </Button>
                        {previewProductTitle ? (
                          <Button
                            icon={XIcon}
                            accessibilityLabel="Clear preview product"
                            onClick={handleClearPreviewProduct}
                          />
                        ) : null}
                      </InlineStack>
                    </InlineStack>
                  </Box>
                </BlockStack>
                <Select
                  label="Preview rating"
                  options={previewRatingOptions}
                  value={previewRating}
                  onChange={setPreviewRating}
                  helpText="The reply changes tone based on the star rating."
                />
              </InlineGrid>

              <TextField
                label="Preview review"
                value={previewReview}
                onChange={setPreviewReview}
                autoComplete="off"
                multiline={3}
                helpText="Saved with Brand voice so you can reuse the same test review while tuning settings."
              />

              <div className="rp-draft-box">
                <Text as="p" variant="bodyLg">{livePreview || previewReply}</Text>
              </div>
            </BlockStack>
          </section>
        </BlockStack>
      </div>
    </BlockStack>
  );
}
