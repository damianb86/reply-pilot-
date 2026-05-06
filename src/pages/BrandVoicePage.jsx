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
  RangeSlider,
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
  {id: 'personality-builder', label: 'Builder'},
  {id: 'brand-voice', label: 'Brand voice'},
  {id: 'ai-model', label: 'AI model'},
];
const sectionIds = settingsSections.map((section) => section.id);
const defaultAlwaysMention = ['product detail', 'what the customer noticed', 'next step when needed'];
const defaultPreviewReview = 'Obsessed with these napkins. The fabric feels substantial, the print looks even better in person, and they made our dinner table feel special.';
const personalityStyleOptions = [
  {label: 'Balanced', value: 'balanced', description: 'Natural, clear, and useful without leaning too hard into a character.'},
  {label: 'Formal', value: 'formal', description: 'Polished and respectful, with more restraint in word choice.'},
  {label: 'Casual', value: 'casual', description: 'Relaxed and conversational while still feeling professional.'},
  {label: 'Warm', value: 'warm', description: 'More appreciative and emotionally present, especially for customer concerns.'},
  {label: 'Playful', value: 'playful', description: 'Light and upbeat, with a little charm when the review allows it.'},
  {label: 'Direct', value: 'direct', description: 'Practical, concise, and low-friction for fast queue work.'},
  {label: 'Premium', value: 'premium', description: 'Calm, refined, and detail-oriented for a more elevated support tone.'},
];
const personalityStrengthOptions = [
  {label: 'Subtle', value: 'subtle', description: 'Keeps replies close to plain support copy with only a light voice layer.'},
  {label: 'Balanced', value: 'balanced', description: 'Adds a noticeable voice while keeping the reply grounded and easy to approve.'},
  {label: 'Expressive', value: 'expressive', description: 'Lets the brand voice show more clearly without adding unsupported details.'},
];
const replyLengthOptions = [
  {label: 'Short', value: 'short', description: 'Best for quick, simple reviews that need a compact answer.'},
  {label: 'Medium', value: 'medium', description: 'The default balance: specific enough without feeling heavy.'},
  {label: 'Long', value: 'long', description: 'Gives more room for mixed sentiment, product detail, or careful acknowledgement.'},
  {label: 'Very long', value: 'very_long', description: 'Most useful for detailed negative or nuanced reviews that need a fuller response.'},
];
const previewRatingValues = [1, 2, 3, 4, 5];

const personalityPresets = [
  {
    id: 'warm-small-team',
    name: 'Warm small team',
    summary: 'Personal, kind, specific, and easy for most stores to approve.',
    tags: ['Warm', 'General', 'Trust'],
    persona: `Brand personality: warm, attentive, and genuinely human.

This brand replies like a small team that actually reads every review. The tone should feel personal without becoming overly familiar: kind, grateful, specific, and calm. The brand notices concrete details from the customer's review and responds to those details directly instead of using generic praise.

Positive reviews should feel appreciated and lightly celebratory. Mixed or negative reviews should acknowledge the concern plainly, thank the customer for the useful detail, and offer a grounded next step when one is appropriate. Never sound corporate, defensive, or scripted. Avoid exaggerated emotion, empty apologies, or promises the business cannot guarantee.

The goal is to make customers feel seen by real people who care about the product and the post-purchase experience.`,
  },
  {
    id: 'premium-concierge',
    name: 'Premium concierge',
    summary: 'Polished, composed, and refined for higher-touch brands.',
    tags: ['Premium', 'Calm', 'Refined'],
    persona: `Brand personality: polished, composed, and quietly premium.

This brand responds with the restraint of a thoughtful concierge: respectful, precise, and calm. The tone should feel elevated but never cold. Replies should use clean language, avoid hype, and make the customer feel that their feedback has been handled with care.

Positive reviews should be acknowledged with understated appreciation and one specific detail. Negative or mixed reviews should be treated seriously without sounding alarmed, defensive, or overly apologetic. The brand should not over-explain. It should communicate confidence, taste, and accountability in a concise way.

The goal is to make every response feel considered, professional, and worthy of a brand that pays attention to details.`,
  },
  {
    id: 'direct-product-expert',
    name: 'Product expert',
    summary: 'Clear, practical, and useful when shoppers care about details.',
    tags: ['Direct', 'Useful', 'Expert'],
    persona: `Brand personality: practical, knowledgeable, and product-first.

This brand replies like an experienced product specialist who wants customers to get useful information quickly. The tone should be direct, helpful, and grounded in what the customer actually said. Avoid fluff, vague praise, and generic customer-service language.

Positive reviews should reinforce the specific product benefit the customer noticed. Mixed or negative reviews should acknowledge the issue, explain only what is known, and give a clear next step if one is relevant. Do not invent technical details, product claims, policies, or fixes. When the review includes product context, use it carefully and naturally.

The goal is to make replies feel useful to both the reviewer and future shoppers reading the public thread.`,
  },
  {
    id: 'playful-community',
    name: 'Playful community',
    summary: 'Friendly, upbeat, and lightly witty without becoming silly.',
    tags: ['Playful', 'Friendly', 'Social'],
    persona: `Brand personality: upbeat, friendly, and lightly playful.

This brand talks like a confident community host: conversational, appreciative, and a little witty when the review gives permission for it. The tone should feel energetic but still clear. Humor should be light, inclusive, and never at the customer's expense.

Positive reviews can sound excited and personal, especially when the customer shares a fun detail. Mixed or negative reviews should become more grounded: keep the warmth, but do not joke over the customer's concern. Avoid forced jokes, slang that feels unnatural, or overusing exclamation points.

The goal is to make replies feel alive, social, and memorable while still helping the customer and protecting trust.`,
  },
  {
    id: 'calm-problem-solver',
    name: 'Calm resolver',
    summary: 'Best for brands that want complaints handled with care.',
    tags: ['Support', 'Calm', 'Safe'],
    persona: `Brand personality: calm, accountable, and solution-oriented.

This brand is especially careful with frustration, low ratings, delivery issues, defects, and mixed feedback. The tone should be steady, respectful, and practical. Replies should acknowledge the customer's experience without arguing, minimizing, or sounding like a policy script.

Positive reviews should still feel appreciative, but the brand's strongest behavior appears when something went wrong: name the concern plainly, thank the customer for the detail, and provide a realistic next step when available. Avoid blame, defensiveness, excessive apology, or vague phrases like "we strive to do better."

The goal is to make customers feel that the brand is composed, fair, and capable of handling problems responsibly.`,
  },
  {
    id: 'theatrical-roast',
    name: 'Theatrical roast',
    summary: 'Sarcastic and funny for brands built around sharp character.',
    tags: ['Sarcastic', 'Bold', 'Comedic'],
    persona: `Brand personality: sarcastic, theatrical, hostile in a funny way, and intentionally rude as a clear performance.

This brand treats customers like charming little disasters who somehow managed to buy the product correctly. The tone should feel like a cruel comedian forced to work in customer support: dry, sharp, arrogant, and entertaining, but still functional.

Positive reviews should be accepted as obvious proof that the customer finally developed taste. Negative reviews may be mocked first, then answered with just enough useful information to remain helpful. The brand can exaggerate complaints, make jokes at the customer's expense, and respond with playful contempt.

The goal is to make the customer feel roasted, not genuinely harmed. Avoid real threats, protected-class insults, body, identity, or health attacks, and anything that feels like actual harassment. The cruelty should be witty, performative, and clearly part of an absurd brand persona.`,
  },
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

function creditsText(amount) {
  const credits = Number(amount ?? 0);
  if (!credits) return 'free';
  return `${credits} credit${credits === 1 ? '' : 's'}`;
}

function ModelCard({model, selected, onSelect}) {
  return (
    <button
      type="button"
      className={`rp-model-card ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
    >
      <BlockStack gap="250">
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <span className="rp-model-radio" aria-hidden="true" />
          <BlockStack gap="050">
            <Text as="span" variant="headingLg">{model.name}</Text>
            <Text as="span" variant="bodySm" tone="subdued">
              Uses {model.detail}
            </Text>
          </BlockStack>
          <Badge tone="info">{creditsText(model.credits?.reply)} per reply</Badge>
        </InlineStack>
        <BlockStack gap="050">
          <InlineStack gap="150" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">{model.provider}</Text>
            <Badge tone={model.configured ? 'success' : 'attention'}>
              {model.configured ? 'Configured' : `Missing ${model.missingEnv}`}
            </Badge>
          </InlineStack>
          <Text as="span" variant="bodySm" fontWeight="semibold">{model.bestFor}</Text>
          <Text as="span" variant="bodySm" tone="subdued">{model.description}</Text>
          <Text as="span" variant="bodySm" tone="subdued">
            Reply and Live preview: {creditsText(model.credits?.reply)} · Personality: {creditsText(model.credits?.personality)}
          </Text>
          {model.strengths?.length ? (
            <div className="rp-model-strengths">
              {model.strengths.map((strength) => (
                <Badge key={strength}>{strength}</Badge>
              ))}
            </div>
          ) : null}
          {model.activeVariant ? (
            <InlineStack gap="150" blockAlign="center">
              <Badge tone="info">Current dev fallback</Badge>
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

function PreviewRatingPicker({value, onChange}) {
  const selectedRating = Math.max(1, Math.min(5, Number(value) || 5));
  const tone = selectedRating <= 2 ? 'critical' : selectedRating === 3 ? 'attention' : 'success';

  return (
    <BlockStack gap="150">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="p" variant="bodyMd" fontWeight="semibold">Preview rating</Text>
        <Badge tone={tone}>{selectedRating} out of 5</Badge>
      </InlineStack>
      <div className="rp-preview-rating-picker" role="radiogroup" aria-label="Preview rating">
        {previewRatingValues.map((rating) => (
          <button
            key={rating}
            type="button"
            className={`rp-preview-rating-option ${rating === selectedRating ? 'is-selected' : ''} ${rating <= selectedRating ? 'is-filled' : ''}`}
            role="radio"
            aria-checked={rating === selectedRating}
            aria-label={`${rating} out of 5 stars`}
            onClick={() => onChange(String(rating))}
          >
            <span aria-hidden="true">★</span>
          </button>
        ))}
      </div>
      <Text as="p" variant="bodySm" tone="subdued">
        The reply changes tone based on the customer rating.
      </Text>
    </BlockStack>
  );
}

function PersonalityPresetCard({preset, selected, onApply}) {
  return (
    <button
      type="button"
      className={`rp-personality-preset ${selected ? 'is-selected' : ''}`}
      onClick={onApply}
    >
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="start" gap="200" wrap={false}>
          <BlockStack gap="050">
            <Text as="span" variant="headingMd">{preset.name}</Text>
            <Text as="span" variant="bodySm" tone="subdued">{preset.summary}</Text>
          </BlockStack>
          {selected ? <Badge tone="success">Applied</Badge> : null}
        </InlineStack>
        <InlineStack gap="100">
          {preset.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </InlineStack>
      </BlockStack>
    </button>
  );
}

function optionIndex(options, value) {
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : 0;
}

function sliderOption(options, value) {
  const index = Math.max(0, Math.min(options.length - 1, Math.round(Number(value) || 0)));
  return options[index] ?? options[0];
}

function VoiceSettingSlider({title, options, value, onChange, helpText}) {
  const selectedIndex = optionIndex(options, value);
  const selectedOption = options[selectedIndex] ?? options[0];
  const handleChange = useCallback(
    (nextValue) => {
      onChange(sliderOption(options, nextValue).value);
    },
    [onChange, options],
  );

  return (
    <div className="rp-voice-slider">
      <BlockStack gap="250">
        <InlineStack align="space-between" blockAlign="center" gap="200">
          <Text as="h2" variant="headingMd">{title}</Text>
          <Badge tone="info">{selectedOption.label}</Badge>
        </InlineStack>
        <RangeSlider
          label={title}
          labelHidden
          min={0}
          max={options.length - 1}
          step={1}
          value={selectedIndex}
          onChange={handleChange}
        />
        <div
          className="rp-voice-slider-steps"
          style={{gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`}}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              className={`rp-voice-slider-step ${index === selectedIndex ? 'is-selected' : ''}`}
              aria-pressed={index === selectedIndex}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Text as="p" variant="bodySm" tone="subdued">
          {selectedOption.description || helpText}
        </Text>
      </BlockStack>
    </div>
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
  const connection = loaderData.connection;
  const loaderAiModels = useMemo(() => loaderData.aiModels ?? [], [loaderData.aiModels]);
  const defaultSelectedModel = loaderData.defaultAiModelId ?? loaderAiModels[0]?.id ?? 'basic';
  const importedReplyOptions = [
    {label: 'Last 5 replies', value: '5'},
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
  const [activeSection, setActiveSection] = useState('personality-builder');
  const [savedConfig, setSavedConfig] = useState(initialConfig);
  const [localToast, setLocalToast] = useState(null);
  const [showPersonalityPresets, setShowPersonalityPresets] = useState(false);
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
  const creditOverview = previewFetcher.data?.credits ?? personalityFetcher.data?.credits ?? loaderData.credits ?? {balance: 0};
  const selectedCreditCosts = selectedModelConfig?.credits ?? {reply: 1, preview: 1, personality: 2};
  const canGeneratePreview = Number(creditOverview.balance ?? 0) >= Number(selectedCreditCosts.preview ?? 0);
  const canGeneratePersonality = Number(creditOverview.balance ?? 0) >= Number(selectedCreditCosts.personality ?? 0);

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

  function removeExampleReply(id) {
    setExampleReplies((current) => current.filter((example) => example.id !== id));
  }

  function applyPersonalityPreset(preset) {
    setPersona(preset.persona);
    setShowPersonalityPresets(false);
    showToast({
      ok: true,
      intent: 'apply-personality-preset',
      message: `${preset.name} preset applied. Review it, then use Shopify Save to keep it.`,
    });
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
          <section id="personality-builder" className="rp-field-card">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="start" gap="300">
                <InlineStack gap="300" blockAlign="start" wrap={false}>
                  <span className="rp-icon-tile is-blue">
                    <Icon source={MagicIcon} />
                  </span>
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingLg">Personality builder</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Start with a preset or learn from approved Judge.me replies, then refine the Personality text below.
                    </Text>
                  </BlockStack>
                </InlineStack>
                <Badge tone={connection?.status === 'connected' ? 'success' : 'attention'}>
                  {connection?.status === 'connected' ? 'Judge.me ready' : 'Judge.me not connected'}
                </Badge>
              </InlineStack>

              <div className="rp-builder-method">
                <InlineStack align="space-between" blockAlign="center" gap="300">
                  <BlockStack gap="050">
                    <Text as="h3" variant="headingMd">Choose a preset</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Use a ready-made voice direction when you want a fast starting point.
                    </Text>
                  </BlockStack>
                  <Button onClick={() => setShowPersonalityPresets((value) => !value)}>
                    {showPersonalityPresets ? 'Hide presets' : 'Show presets'}
                  </Button>
                </InlineStack>

                {showPersonalityPresets ? (
                  <div className="rp-personality-preset-grid">
                    {personalityPresets.map((preset) => (
                      <PersonalityPresetCard
                        key={preset.id}
                        preset={preset}
                        selected={persona.trim() === preset.persona.trim()}
                        onApply={() => applyPersonalityPreset(preset)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rp-builder-method">
                <InlineGrid columns={{xs: 1, md: 2}} gap="300">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingMd">Generate from past replies</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Import approved replies as evidence. Reply Pilot uses them to draft Personality without saving until you review it.
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
                      disabled={connection?.status !== 'connected'}
                      loading={importFetcher.state !== 'idle'}
                      onClick={handleImportReplies}
                    >
                      Import replies
                    </Button>
                    <Button
                      icon={MagicIcon}
                      variant="primary"
                      disabled={!exampleReplies.length || !selectedModelConfigured || !canGeneratePersonality}
                      loading={personalityFetcher.state !== 'idle'}
                      onClick={handleGeneratePersonality}
                    >
                      Generate Personality · {creditsText(selectedCreditCosts.personality)}
                    </Button>
                  </InlineStack>
                </InlineGrid>

                <div className="rp-builder-evidence">
                  {exampleReplies.length ? (
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center" gap="300">
                        <Text as="p" variant="bodySm" tone="subdued">
                          {exampleReplies.length} imported {exampleReplies.length === 1 ? 'reply' : 'replies'} ready as voice evidence.
                        </Text>
                        <Badge tone="info">Evidence only</Badge>
                      </InlineStack>
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
                        Import replies to generate a Personality from real merchant language.
                      </Text>
                    </div>
                  )}
                </div>
              </div>
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

          <section className="rp-field-card">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center" gap="300">
                <BlockStack gap="050">
                  <Text as="h2" variant="headingLg">Reply behavior</Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    Tune how strongly Reply Pilot applies the voice when drafting replies.
                  </Text>
                </BlockStack>
                <Badge tone="info">Used by Queue and preview</Badge>
              </InlineStack>

              <VoiceSettingSlider
                title="Personality style"
                options={personalityStyleOptions}
                value={personalityStyle}
                onChange={setPersonalityStyle}
                helpText="Sets the voice lens for generated replies while keeping imported examples as the source of truth."
              />
              <VoiceSettingSlider
                title="Personality strength"
                options={personalityStrengthOptions}
                value={personalityStrength}
                onChange={setPersonalityStrength}
                helpText="Controls whether the voice stays subtle or becomes more expressive in generated replies."
              />
              <VoiceSettingSlider
                title="Reply length"
                options={replyLengthOptions}
                value={replyLength}
                onChange={setReplyLength}
                helpText="Controls how much detail Reply Pilot includes before the final sign-off."
              />
            </BlockStack>
          </section>

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
                <InlineStack gap="150" blockAlign="center">
                  <Badge tone={creditOverview.balance <= 25 ? 'critical' : 'info'}>{creditOverview.balance} credits left</Badge>
                  {selectedModelConfig ? <Badge tone="info">{selectedModelConfig.name}</Badge> : null}
                </InlineStack>
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

              <Text as="p" variant="bodySm" tone="subdued">
                The selected tier is used for Personality generation, Live preview, and Queue replies. Reply and preview generation cost {creditsText(selectedCreditCosts.reply)} with this tier; Personality costs {creditsText(selectedCreditCosts.personality)} because it also generates a preview. Higher tiers spend more credits but follow Brand Voice and product context more carefully.
              </Text>
            </BlockStack>
          </section>

          <section className="rp-field-card">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={MagicIcon} tone="critical" />
                  <Text as="h2" variant="headingLg" tone="critical">Live preview</Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    against your saved test review · {selectedModelConfig?.name ?? 'selected tier'}
                  </Text>
                </InlineStack>
                <Button
                  icon={RefreshIcon}
                  disabled={!selectedModelConfigured || !canGeneratePreview}
                  loading={previewFetcher.state !== 'idle'}
                  onClick={handleGeneratePreview}
                >
                  {livePreview ? 'Regenerate preview' : 'Generate preview'} · {creditsText(selectedCreditCosts.preview)}
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
                <PreviewRatingPicker
                  value={previewRating}
                  onChange={setPreviewRating}
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
