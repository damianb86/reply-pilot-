/* eslint-disable react/prop-types, react/no-unescaped-entities */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFetcher, useLoaderData} from 'react-router';
import {SaveBar, useAppBridge} from '@shopify/app-bridge-react';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Checkbox,
  Divider,
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
  ChatIcon,
  HeartIcon,
  InfoIcon,
  ImportIcon,
  MagicIcon,
  ProductIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckMarkIcon,
  StarIcon,
  WandIcon,
  XIcon,
} from '@shopify/polaris-icons';
import {
  defaultAvoidPhrases,
  defaultBrandVoice,
} from '../brandVoiceData';
import {useFetcherTimeout} from '../hooks/useFetcherTimeout';

export const brandVoiceSettingsSections = [
  {id: 'personality-builder', label: 'Personality builder'},
  {id: 'personality-settings', label: 'Personality settings'},
  {id: 'ai-model', label: 'AI model'},
  {id: 'live-preview', label: 'Live preview'},
];
const defaultAlwaysMention = ['product detail', 'what the customer noticed', 'next step when needed'];
const defaultPreviewReview = 'Obsessed with these napkins. The fabric feels substantial, the print looks even better in person, and they made our dinner table feel special.';
const tonePresetOptions = [
  {label: 'Use personality', value: 'use_personality', description: 'No extra tone nudge. Reply Pilot follows the Personality text as the source of truth.'},
  {label: 'More formal', value: 'formal', description: 'Adds polish, restraint, and more precise wording when drafting replies.'},
  {label: 'More casual', value: 'casual', description: 'Makes replies feel more relaxed and conversational without becoming sloppy.'},
  {label: 'Warmer', value: 'warm', description: 'Adds more appreciation and emotional presence, especially around customer concerns.'},
  {label: 'More playful', value: 'playful', description: 'Adds a light upbeat touch when the review gives room for it.'},
  {label: 'More direct', value: 'direct', description: 'Keeps replies practical, clear, and lower-friction.'},
  {label: 'More premium', value: 'premium', description: 'Adds a more composed, refined, and detail-aware feel.'},
];
const personalityStrengthOptions = [
  {label: 'Subtle', value: 'subtle', description: 'Light voice layer. Best when replies should feel clean and mostly support-led.'},
  {label: 'Balanced', value: 'balanced', description: 'Noticeable voice without overwhelming the message. Best default for most shops.'},
  {label: 'Expressive', value: 'expressive', description: 'Stronger character. Useful when the brand voice is part of the customer experience.'},
];
const replyLengthOptions = [
  {label: 'Adaptive', value: 'adaptive', description: 'Lets Reply Pilot choose the right length based on rating, detail, and complexity.'},
  {label: 'Short', value: 'short', description: '1-2 sentences. Best for simple positive reviews and quick acknowledgement.'},
  {label: 'Medium', value: 'medium', description: '2-4 sentences. Enough room for one or two specifics without feeling heavy.'},
  {label: 'Long', value: 'long', description: '4-6 sentences. Useful for mixed, detailed, or negative reviews that need care.'},
  {label: 'Very long', value: 'very_long', description: 'Detailed support-style reply. Use sparingly for complex public responses.'},
];
const defaultTonePreset = 'use_personality';
const defaultVoiceIntensity = 'balanced';
const defaultReplyLength = 'adaptive';
const personalityMaxWords = 200;
const personalityMaxCharacters = 1400;
const previewRatingValues = [1, 2, 3, 4, 5];

const personalityPresets = [
  {
    id: 'warm-small-team',
    name: 'Warm small team',
    icon: HeartIcon,
    summary: 'Human, attentive, and grounded for most stores.',
    tags: ['Warm', 'General', 'Trust'],
    persona: `Brand personality: warm, attentive, and genuinely human.

This voice feels like a small team that actually reads every review. It is kind, grateful, specific, and calm without becoming overly familiar. The brand notices concrete details and sounds present rather than scripted.

Basic rules: stay grounded in what the customer said, avoid exaggerated emotion, do not sound corporate or defensive, and never promise anything the business cannot guarantee.

The goal is to make customers feel seen by real people who care about the product and the post-purchase experience.`,
  },
  {
    id: 'premium-concierge',
    name: 'Premium concierge',
    icon: StarIcon,
    summary: 'Composed and refined for higher-touch brands.',
    tags: ['Premium', 'Calm', 'Refined'],
    persona: `Brand personality: polished, composed, and quietly premium.

This voice has the restraint of a thoughtful concierge: respectful, precise, and calm. It feels elevated but not cold. It uses clean language, avoids hype, and makes customers feel that their feedback is being handled with care.

Basic rules: do not over-explain, do not sound alarmed, keep claims measured, and communicate confidence, taste, and accountability.

The goal is to make every response feel considered, professional, and worthy of a brand that pays attention to details.`,
  },
  {
    id: 'direct-product-expert',
    name: 'Product expert',
    icon: ProductIcon,
    summary: 'Practical and knowledgeable when shoppers care about details.',
    tags: ['Direct', 'Useful', 'Expert'],
    persona: `Brand personality: practical, knowledgeable, and product-first.

This voice sounds like an experienced product specialist who wants customers to get useful information quickly. It is direct, helpful, and grounded in what the customer actually said. It values clarity over performance.

Basic rules: avoid fluff, vague praise, and generic customer-service language. Do not invent technical details, product claims, policies, fixes, or anything not supported by the review or product context.

The goal is to make replies feel useful to both the reviewer and future shoppers reading the public thread.`,
  },
  {
    id: 'playful-community',
    name: 'Playful community',
    icon: ChatIcon,
    summary: 'Social, lively, and lightly witty without becoming silly.',
    tags: ['Playful', 'Friendly', 'Social'],
    persona: `Brand personality: upbeat, friendly, and lightly playful.

This voice talks like a confident community host: conversational, appreciative, and a little witty when the moment allows it. It feels energetic but still clear. Humor is light, inclusive, and never at the customer's expense.

Basic rules: avoid forced jokes, unnatural slang, or overusing exclamation points. When a customer is upset, keep the warmth but do not joke over the concern.

The goal is to make replies feel alive, social, and memorable while still helping the customer and protecting trust.`,
  },
  {
    id: 'calm-problem-solver',
    name: 'Calm resolver',
    icon: ShieldCheckMarkIcon,
    summary: 'Steady and accountable for support-sensitive brands.',
    tags: ['Support', 'Calm', 'Safe'],
    persona: `Brand personality: calm, accountable, and solution-oriented.

This voice is especially careful with frustration, low ratings, delivery issues, defects, and mixed feedback. It is steady, respectful, and practical. It acknowledges customer experience without arguing, minimizing, or sounding like a policy script.

Basic rules: avoid blame, defensiveness, excessive apology, and vague phrases like "we strive to do better." Only mention next steps that are realistic and supported.

The goal is to make customers feel that the brand is composed, fair, and capable of handling problems responsibly.`,
  },
  {
    id: 'theatrical-roast',
    name: 'Theatrical roast',
    icon: WandIcon,
    summary: 'Sharp, performative, and intentionally absurd.',
    tags: ['Sarcastic', 'Bold', 'Comedic'],
    persona: `Brand personality: sarcastic, theatrical, hostile in a funny way, and intentionally rude as a clear performance.

This voice treats customers like charming little disasters who somehow managed to buy the product correctly. It feels like a cruel comedian forced to work in customer support: dry, sharp, arrogant, and entertaining, but still functional.

Basic rules: the cruelty is performative and witty, not genuinely harmful. The voice can roast, exaggerate, and show playful contempt, but it must stay useful and clearly absurd.

The goal is to make the customer feel roasted, not genuinely harmed. Avoid real threats, protected-class insults, body, identity, or health attacks, and anything that feels like actual harassment.`,
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
  const hasDecimals = !Number.isInteger(Math.abs(credits));
  const formatted = credits.toLocaleString('en', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: hasDecimals ? 1 : 0,
  });
  return `${formatted} credit${credits === 1 ? '' : 's'}`;
}

function creditsNumber(amount) {
  const credits = Number(amount ?? 0);
  const hasDecimals = !Number.isInteger(Math.abs(credits));
  return credits.toLocaleString('en', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: hasDecimals ? 1 : 0,
  });
}

function replyCostBadge(model, multiplier = 1) {
  const credits = Number(model.credits?.reply ?? 0) * Number(multiplier || 1);
  if (!credits) return 'Free';
  return `${creditsText(credits)} / reply`;
}

function ModelCard({model, selected, onSelect, replyCreditMultiplier = 1}) {
  const previewCost = creditsText(model.credits?.preview ?? model.credits?.reply);

  return (
    <button
      type="button"
      className={`rp-model-card ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <BlockStack gap="400">
        <div className="rp-model-card-header">
          <span className="rp-model-radio" aria-hidden="true" />
          <BlockStack gap="150">
            <InlineStack gap="200" blockAlign="center" wrap={false}>
              <Text as="span" variant="headingLg">{model.name}</Text>
              <Badge tone="info">{replyCostBadge(model, replyCreditMultiplier)}</Badge>
            </InlineStack>
          </BlockStack>
        </div>

        <BlockStack gap="300">
          <BlockStack gap="150">
            <Text as="h3" variant="headingMd">{model.bestFor}</Text>
            <Text as="p" variant="bodyMd" tone="subdued">{model.description}</Text>
          </BlockStack>

          <div className="rp-model-card-divider" />

          <Text as="p" variant="bodySm" tone="subdued">
            Preview: {previewCost} · Personality: {creditsText(model.credits?.personality)}
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

function CreditInfoPanel() {
  return (
    <div className="rp-credit-info-panel">
      <span className="rp-credit-info-icon" aria-hidden="true">
        <Icon source={InfoIcon} />
      </span>
      <BlockStack gap="100">
        <Text as="h3" variant="headingMd">How credits work</Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          The selected tier is used for queue replies, live preview, and personality generation. Higher tiers use more credits, but follow brand voice and product context more carefully.
        </Text>
      </BlockStack>
    </div>
  );
}

function ProductDescriptionContextPanel({
  checked,
  onChange,
}) {
  return (
    <div className="rp-product-context-option">
      <BlockStack gap="200">
        <Checkbox
          label="Use product descriptions"
          checked={checked}
          onChange={onChange}
          disabled={!onChange}
        />
        <Text as="p" variant="bodyMd" tone="subdued">
          Keep this enabled to let Reply Pilot read cleaned Shopify product descriptions when drafting replies. Turn it off if you want responses based only on the review, product title, tags, and rating.
        </Text>
      </BlockStack>
    </div>
  );
}

function AiActionButton({children, className = '', icon = MagicIcon, ...buttonProps}) {
  return (
    <span className={`rp-ai-action-button ${className}`}>
      <Button {...buttonProps} icon={icon}>{children}</Button>
    </span>
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
            <span className="rp-preset-title-row">
              <span className="rp-preset-title-icon">
                <Icon source={preset.icon} />
              </span>
              <Text as="span" variant="headingMd">{preset.name}</Text>
            </span>
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

function optionByValue(options, value) {
  return options.find((option) => option.value === value) ?? options[0];
}

function normalizeTonePreset(value) {
  if (value === 'balanced') return defaultTonePreset;
  return tonePresetOptions.some((option) => option.value === value) ? value : defaultTonePreset;
}

function normalizeVoiceIntensity(value) {
  return personalityStrengthOptions.some((option) => option.value === value) ? value : defaultVoiceIntensity;
}

function normalizeReplyLength(value) {
  return replyLengthOptions.some((option) => option.value === value) ? value : defaultReplyLength;
}

function sliderOption(options, value) {
  const index = Math.max(0, Math.min(options.length - 1, Math.round(Number(value) || 0)));
  return options[index] ?? options[0];
}

function TonePresetSelect({value, onChange}) {
  const selectedValue = normalizeTonePreset(value);
  const selectedOption = optionByValue(tonePresetOptions, selectedValue);

  return (
    <div className="rp-voice-slider">
      <BlockStack gap="250">
        <InlineStack align="space-between" blockAlign="center" gap="200">
          <Text as="h2" variant="headingMd">Tone preset</Text>
          <Badge tone="info">{selectedOption.label}</Badge>
        </InlineStack>
        <div className="rp-tone-preset-select">
          <Select
            label="Tone preset"
            labelHidden
            options={tonePresetOptions.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={selectedValue}
            onChange={onChange}
          />
        </div>
        <Text as="p" variant="bodySm" tone="subdued">
          Use this only if you want to nudge generated replies in a specific direction. {selectedOption.description}
        </Text>
      </BlockStack>
    </div>
  );
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

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function limitPersonalityText(value) {
  const text = String(value ?? '').slice(0, personalityMaxCharacters);
  const parts = text.match(/\S+\s*/g) ?? [];
  if (parts.length <= personalityMaxWords) return text;
  return parts.slice(0, personalityMaxWords).join('').trimEnd();
}

function buildConfig(settings, defaultSelectedModel) {
  return {
    persona: limitPersonalityText(settings?.persona ?? defaultBrandVoice.persona),
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
    personalityStyle: normalizeTonePreset(settings?.personalityStyle),
    personalityStrength: normalizeVoiceIntensity(settings?.personalityStrength),
    replyLength: normalizeReplyLength(settings?.replyLength),
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
    personalityStyle: normalizeTonePreset(config.personalityStyle),
    personalityStrength: normalizeVoiceIntensity(config.personalityStrength),
    replyLength: normalizeReplyLength(config.replyLength),
    livePreview: config.livePreview || '',
    previewReview: config.previewReview || '',
    previewProductId: config.previewProductId || '',
    previewProductTitle: config.previewProductTitle || '',
    previewProductType: config.previewProductType || '',
    previewProductTags: Array.isArray(config.previewProductTags) ? config.previewProductTags : [],
    previewRating: config.previewRating || '5',
  });
}

export default function BrandVoicePage({
  data,
  actionPath,
  embedded = false,
  activeSection: controlledActiveSection,
  onActiveSectionChange,
  useProductDescription = false,
  onUseProductDescriptionChange,
  replyCreditMultiplier = 1,
  defaultSelectedModelOverride,
  hideSaveBar = false,
  onConfigChange,
  onSkipPersonalityBuilder,
  suppressPreviewFallback = false,
  livePreviewDescription,
} = {}) {
  const shopify = useAppBridge();
  const routeLoaderData = useLoaderData();
  const loaderData = data ?? routeLoaderData.brandVoice ?? routeLoaderData;
  const saveFetcher = useFetcher();
  const importFetcher = useFetcher();
  const personalityFetcher = useFetcher();
  const previewFetcher = useFetcher();
  const productFetcher = useFetcher();
  const saveTimeout = useFetcherTimeout(saveFetcher, {
    timeoutMs: 20000,
    message: 'Saving Brand Voice took too long. Please try again later.',
  });
  const importTimeout = useFetcherTimeout(importFetcher, {
    timeoutMs: 30000,
    message: 'Importing past replies took too long. Please try again later.',
  });
  const personalityTimeout = useFetcherTimeout(personalityFetcher, {
    timeoutMs: 60000,
    message: 'Generating Personality took too long. Please try again later.',
  });
  const previewTimeout = useFetcherTimeout(previewFetcher, {
    timeoutMs: 60000,
    message: 'Generating the live preview took too long. Please try again later.',
  });
  const productTimeout = useFetcherTimeout(productFetcher, {
    timeoutMs: 30000,
    message: 'Loading the selected Shopify product took too long. Please try again later.',
  });
  const connection = loaderData.connection;
  const loaderAiModels = useMemo(() => loaderData.aiModels ?? [], [loaderData.aiModels]);
  const defaultSelectedModel = defaultSelectedModelOverride ?? loaderData.defaultAiModelId ?? loaderAiModels[0]?.id ?? 'basic';
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
  const [internalActiveSection, setInternalActiveSection] = useState('personality-builder');
  const activeSection = controlledActiveSection ?? internalActiveSection;
  const setActiveSection = useCallback((section) => {
    if (onActiveSectionChange) {
      onActiveSectionChange(section);
      return;
    }
    setInternalActiveSection(section);
  }, [onActiveSectionChange]);
  const [savedConfig, setSavedConfig] = useState(initialConfig);
  const [localToast, setLocalToast] = useState(null);
  const [showPersonalityPresets, setShowPersonalityPresets] = useState(false);
  const [showAdvancedLength, setShowAdvancedLength] = useState(initialConfig.replyLength === 'very_long');
  const [personalityHighlight, setPersonalityHighlight] = useState(false);
  const lastToastKey = useRef('');
  const personalityHighlightTimer = useRef(null);
  const saveResult = saveTimeout.result || saveFetcher.data;
  const importResult = importTimeout.result || importFetcher.data;
  const personalityResult = personalityTimeout.result || personalityFetcher.data;
  const previewResult = previewTimeout.result || previewFetcher.data;
  const productResult = productTimeout.result || productFetcher.data;

  const wordCount = useMemo(() => countWords(persona), [persona]);
  const characterCount = persona.length;
  const personalityIsAtLimit =
    wordCount >= personalityMaxWords || characterCount >= personalityMaxCharacters;

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
  const previewProductContextText = useMemo(() => {
    if (!previewProductTitle) return 'Open Shopify product picker to search the full catalog.';

    const productBasics = [previewProductType, previewProductTags.slice(0, 4).join(', ')].filter(Boolean).join(' · ');
    if (useProductDescription) {
      return productBasics
        ? `${productBasics} · cleaned description included`
        : 'Cleaned product description is included when Shopify provides it.';
    }

    return productBasics || 'Title is sent to the AI.';
  }, [previewProductTags, previewProductTitle, previewProductType, useProductDescription]);
  const visibleReplyLengthOptions = useMemo(
    () => (showAdvancedLength || replyLength === 'very_long'
      ? replyLengthOptions
      : replyLengthOptions.filter((option) => option.value !== 'very_long')),
    [replyLength, showAdvancedLength],
  );

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

  useEffect(() => {
    onConfigChange?.(currentConfig);
  }, [currentConfig, onConfigChange]);

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

  const updatePersona = useCallback((value) => {
    setPersona(limitPersonalityText(value));
  }, []);

  const revealPersonalitySettings = useCallback(() => {
    window.clearTimeout(personalityHighlightTimer.current);
    setActiveSection('personality-settings');
    setPersonalityHighlight(true);
    personalityHighlightTimer.current = window.setTimeout(() => {
      setPersonalityHighlight(false);
    }, 2600);
  }, [setActiveSection]);

  useEffect(() => () => {
    window.clearTimeout(personalityHighlightTimer.current);
  }, []);

  useEffect(() => {
    setAiModels(loaderAiModels);
  }, [loaderAiModels]);

  useEffect(() => {
    showToast(importResult);

    if (importFetcher.data?.ok && importFetcher.data.intent === 'import-replies') {
      if (Array.isArray(importFetcher.data.importedReplies) && importFetcher.data.importedReplies.length) {
        setExampleReplies(importFetcher.data.importedReplies);
      }
    }
  }, [importFetcher.data, importResult, showToast]);

  useEffect(() => {
    showToast(personalityResult);
    if (Array.isArray(personalityFetcher.data?.aiModels)) {
      setAiModels(personalityFetcher.data.aiModels);
    }

    if (personalityFetcher.data?.ok && personalityFetcher.data.intent === 'generate-personality') {
      if (personalityFetcher.data.personality) {
        updatePersona(personalityFetcher.data.personality);
        revealPersonalitySettings();
      }

      if (personalityFetcher.data.livePreview) {
        setLivePreview(personalityFetcher.data.livePreview);
      }
    }
  }, [personalityFetcher.data, personalityResult, revealPersonalitySettings, showToast, updatePersona]);

  useEffect(() => {
    showToast(previewResult);
    if (Array.isArray(previewFetcher.data?.aiModels)) {
      setAiModels(previewFetcher.data.aiModels);
    }

    if (previewFetcher.data?.ok && previewFetcher.data.livePreview) {
      setLivePreview(previewFetcher.data.livePreview);
    }
  }, [previewFetcher.data, previewResult, showToast]);

  useEffect(() => {
    showToast(productResult);

    if (productFetcher.data?.ok && productFetcher.data.product) {
      const product = productFetcher.data.product;
      setPreviewProductId(product.id || '');
      setPreviewProductTitle(product.title || '');
      setPreviewProductType(product.productType || '');
      setPreviewProductTags(Array.isArray(product.tags) ? product.tags : []);
    }
  }, [productFetcher.data, productResult, showToast]);

  useEffect(() => {
    showToast(saveResult);
    if (Array.isArray(saveFetcher.data?.aiModels)) {
      setAiModels(saveFetcher.data.aiModels);
    }

    if (saveFetcher.data?.ok && saveFetcher.data.intent === 'save-settings') {
      const nextConfig = buildConfig(saveFetcher.data.settings, defaultSelectedModel);
      updatePersona(nextConfig.persona);
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
  }, [saveFetcher.data, defaultSelectedModel, saveResult, showToast, updatePersona]);

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

  const submitBrandVoice = useCallback((fetcher, formData) => {
    fetcher.submit(formData, actionPath ? {method: 'post', action: actionPath} : {method: 'post'});
  }, [actionPath]);

  function applyConfig(config) {
    updatePersona(config.persona);
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
    submitBrandVoice(productFetcher, formData);
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
    submitBrandVoice(saveFetcher, formData);
  }

  function handleDiscard() {
    applyConfig(savedConfig);
  }

  function handleImportReplies() {
    const formData = new FormData();
    formData.set('intent', 'import-replies');
    formData.set('limit', importLimit);
    submitBrandVoice(importFetcher, formData);
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
    formData.set('previewProductId', previewProductId);
    formData.set('previewProductTitle', previewProductTitle);
    formData.set('previewProductType', previewProductType);
    formData.set('previewProductTags', JSON.stringify(previewProductTags));
    formData.set('previewRating', previewRating);
    formData.set('useProductDescription', String(Boolean(useProductDescription)));
    formData.set('replies', JSON.stringify(exampleReplies));
    submitBrandVoice(personalityFetcher, formData);
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
    formData.set('previewProductId', previewProductId);
    formData.set('previewProductTitle', previewProductTitle);
    formData.set('previewProductType', previewProductType);
    formData.set('previewProductTags', JSON.stringify(previewProductTags));
    formData.set('previewRating', previewRating);
    formData.set('useProductDescription', String(Boolean(useProductDescription)));
    submitBrandVoice(previewFetcher, formData);
  }

  function removeExampleReply(id) {
    setExampleReplies((current) => current.filter((example) => example.id !== id));
  }

  function applyPersonalityPreset(preset) {
    updatePersona(preset.persona);
    setShowPersonalityPresets(false);
    revealPersonalitySettings();
    showToast({
      ok: true,
      intent: 'apply-personality-preset',
      message: `${preset.name} preset applied. Review it, then use Shopify Save to keep it.`,
    });
  }

  return (
    <BlockStack gap="400">
      {!hideSaveBar ? (
      <SaveBar open={isDirty}>
        <button variant="primary" disabled={saveTimeout.pending} onClick={handleSave}>Save</button>
        <button onClick={handleDiscard}>Discard</button>
      </SaveBar>
      ) : null}

      {localToast ? (
        <div className={`rp-local-toast ${localToast.isError ? 'is-error' : ''}`} role="status">
          {localToast.message}
        </div>
      ) : null}

      {!embedded ? (
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <Text as="h1" variant="heading2xl">Your brand voice</Text>
          <Text as="p" variant="bodyLg" tone="subdued">
            The more specific you get, the better. Edits to approved replies feed back into these rules.
          </Text>
        </BlockStack>
      </InlineStack>
      ) : null}

      <div className={embedded ? 'rp-brand-voice-embedded' : 'rp-settings-layout'}>
        {!embedded ? (
        <aside className="rp-settings-nav" aria-label="Brand voice sections">
          <BlockStack gap="150">
            <Text as="p" variant="bodySm" tone="subdued" fontWeight="semibold">BRAND VOICE</Text>
            {brandVoiceSettingsSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`rp-settings-nav-item ${activeSection === section.id ? 'is-active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </BlockStack>
        </aside>
        ) : null}

        <BlockStack gap="400">
          {activeSection === 'personality-builder' ? (
          <section className="rp-field-card">
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
                      disabled={connection?.status !== 'connected' || importTimeout.pending}
                      loading={importTimeout.pending}
                      onClick={handleImportReplies}
                    >
                      Import replies
                    </Button>
                    <AiActionButton
                      variant="primary"
                      disabled={!exampleReplies.length || !selectedModelConfigured || !canGeneratePersonality || personalityTimeout.pending}
                      loading={personalityTimeout.pending}
                      onClick={handleGeneratePersonality}
                    >
                      Generate Personality
                    </AiActionButton>
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
                      {exampleReplies.map((example) => (
                        <ExampleRow
                          key={example.id}
                          example={example}
                          onRemove={() => removeExampleReply(example.id)}
                        />
                      ))}
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

              {onSkipPersonalityBuilder ? (
                <InlineStack align="end">
                  <Button variant="plain" onClick={onSkipPersonalityBuilder}>
                    I’ll write the Personality myself
                  </Button>
                </InlineStack>
              ) : null}
            </BlockStack>
          </section>
          ) : null}

          {activeSection === 'personality-settings' ? (
          <>
          <section className={`rp-field-card rp-personality-card ${personalityHighlight ? 'is-personality-updated' : ''}`}>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="end" gap="300">
                <InlineStack gap="150" blockAlign="end">
                  <Text as="h2" variant="headingLg">Personality</Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    Describe the voice, attitude, and basic rules the assistant should follow when replying to reviews.
                  </Text>
                </InlineStack>
                <InlineStack gap="150" blockAlign="center">
                  {personalityHighlight ? <Badge tone="info">Updated now</Badge> : null}
                  <Text as="span" variant="bodySm" tone="critical">Review generated text before saving</Text>
                </InlineStack>
              </InlineStack>
              <div className="rp-personality-field-wrap">
                <TextField
                  label="Personality"
                  labelHidden
                  value={persona}
                  onChange={updatePersona}
                  autoComplete="off"
                  maxLength={personalityMaxCharacters}
                  multiline={8}
                />
              </div>
              <InlineStack align="space-between" blockAlign="center">
                <span className={`rp-word-count ${personalityIsAtLimit ? 'is-limit' : ''}`}>
                  {wordCount} / {personalityMaxWords} words · {characterCount} / {personalityMaxCharacters.toLocaleString('en')} characters
                </span>
                <Text as="span" variant="bodySm" tone="subdued">Saved only through Shopify Save</Text>
              </InlineStack>
            </BlockStack>
          </section>

          <section className="rp-field-card">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center" gap="300">
                <BlockStack gap="050">
                  <Text as="h2" variant="headingLg">Voice controls</Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    These settings control how the personality above is applied when drafting replies.
                  </Text>
                </BlockStack>
                <Badge tone="info">Used by Queue and preview</Badge>
              </InlineStack>

              <InlineGrid columns={{xs: 1, md: 2}} gap="400">
                <TonePresetSelect
                  value={personalityStyle}
                  onChange={setPersonalityStyle}
                />
                <VoiceSettingSlider
                  title="Voice intensity"
                  options={personalityStrengthOptions}
                  value={personalityStrength}
                  onChange={setPersonalityStrength}
                  helpText="Controls how strongly the brand voice shows up in each reply."
                />
              </InlineGrid>
              <VoiceSettingSlider
                title="Reply length"
                options={visibleReplyLengthOptions}
                value={replyLength}
                onChange={setReplyLength}
                helpText="Controls how much detail Reply Pilot includes before the final sign-off."
              />
              {!showAdvancedLength && replyLength !== 'very_long' ? (
                <InlineStack align="end">
                  <Button variant="plain" onClick={() => setShowAdvancedLength(true)}>
                    Show advanced length option
                  </Button>
                </InlineStack>
              ) : null}

              <Divider />
              <BlockStack gap="300">
                <BlockStack gap="050">
                  <Text as="h3" variant="headingMd">Greeting and sign-off</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    These small pieces are applied around every draft when the model writes a reply.
                  </Text>
                </BlockStack>
                <InlineGrid columns={{xs: 1, md: 2}} gap="400">
                  <BlockStack gap="250">
                    <Text as="h4" variant="headingSm">Sign-on greeting</Text>
                    <TextField
                      label="Sign-on greeting"
                      labelHidden
                      value={greeting}
                      onChange={setGreeting}
                      autoComplete="off"
                    />
                    <Text as="p" variant="bodySm" tone="subdued">Variables: {'{name}'}, {'{product}'}, {'{stars}'}</Text>
                  </BlockStack>

                  <BlockStack gap="250">
                    <Text as="h4" variant="headingSm">Sign-off</Text>
                    <TextField
                      label="Sign-off"
                      labelHidden
                      value={signOff}
                      onChange={setSignOff}
                      autoComplete="off"
                    />
                    <Text as="p" variant="bodySm" tone="subdued">Can include a signature line or light brand detail.</Text>
                  </BlockStack>
                </InlineGrid>
              </BlockStack>

              <Divider />
              <BlockStack gap="300">
                <BlockStack gap="050">
                  <Text as="h3" variant="headingMd">Reply rules</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Use these as soft guidance. Reply Pilot considers them when they fit the review, but the AI should still sound natural.
                  </Text>
                </BlockStack>
                <InlineGrid columns={{xs: 1, md: 2}} gap="400">
                  <BlockStack gap="300">
                    <BlockStack gap="200">
                      <InlineStack gap="150" blockAlign="end">
                        <Text as="h4" variant="headingSm">Emphasize when helpful</Text>
                        <Text as="span" variant="bodySm" tone="subdued">Soft guidance</Text>
                      </InlineStack>
                      <RuleTags
                        items={alwaysMention}
                        onRemove={(item) => setAlwaysMention((current) => current.filter((value) => value !== item))}
                      />
                    </BlockStack>
                    <AddRule
                      label="Add emphasis guidance"
                      value={alwaysInput}
                      onChange={setAlwaysInput}
                      onAdd={addAlwaysMention}
                      placeholder="Add idea to emphasize..."
                    />
                  </BlockStack>

                  <BlockStack gap="300">
                    <BlockStack gap="200">
                      <InlineStack gap="150" blockAlign="end">
                        <Text as="h4" variant="headingSm">Prefer avoiding</Text>
                        <Text as="span" variant="bodySm" tone="subdued">Use judgment</Text>
                      </InlineStack>
                      <RuleTags
                        items={avoidPhrases}
                        onRemove={(item) => setAvoidPhrases((current) => current.filter((value) => value !== item))}
                      />
                    </BlockStack>
                    <AddRule
                      label="Add phrase to avoid when possible"
                      value={avoidInput}
                      onChange={setAvoidInput}
                      onAdd={addAvoidPhrase}
                      placeholder="Add phrase to avoid when possible..."
                    />
                  </BlockStack>
                </InlineGrid>
              </BlockStack>
            </BlockStack>
          </section>
          </>
          ) : null}

          {activeSection === 'ai-model' ? (
          <section className="rp-field-card">
            <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="start" gap="300">
                <BlockStack gap="050">
                  <Text as="h2" variant="headingXl">AI model</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Choose which model tier generates replies, previews, and personality drafts.
                  </Text>
                </BlockStack>
                <InlineStack gap="150" blockAlign="center">
                  <Badge tone={creditOverview.balance <= 25 ? 'critical' : 'info'}>{creditsNumber(creditOverview.balance)} credits left</Badge>
                  {selectedModelConfig ? <Badge>{selectedModelConfig.name} selected</Badge> : null}
                  {replyCreditMultiplier > 1 ? <Badge tone="attention">Product descriptions {replyCreditMultiplier}x replies</Badge> : null}
                </InlineStack>
              </InlineStack>

              <div className="rp-model-grid">
                {aiModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    selected={selectedModel === model.id}
                    onSelect={() => setSelectedModel(model.id)}
                    replyCreditMultiplier={replyCreditMultiplier}
                  />
                ))}
              </div>

              <ProductDescriptionContextPanel
                checked={Boolean(useProductDescription)}
                onChange={(value) => onUseProductDescriptionChange?.(value)}
              />

              <CreditInfoPanel />
            </BlockStack>
          </section>
          ) : null}

          {activeSection === 'live-preview' ? (
          <section className="rp-field-card">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={MagicIcon} tone="critical" />
                  <Text as="h2" variant="headingLg" tone="critical">Live preview</Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    against your saved test review · {selectedModelConfig?.name ?? 'selected tier'}
                  </Text>
                  {useProductDescription ? <Badge tone="attention">Product description on</Badge> : null}
                </InlineStack>
              </InlineStack>
              {livePreviewDescription ? (
                <Text as="p" variant="bodyMd" tone="subdued">{livePreviewDescription}</Text>
              ) : null}

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
                          {previewProductContextText}
                        </Text>
                      </BlockStack>
                      <InlineStack gap="150" wrap={false}>
                        <Button
                          icon={SearchIcon}
                          loading={productTimeout.pending}
                          disabled={productTimeout.pending}
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

              <InlineStack align="start">
                <AiActionButton
                  variant="primary"
                  size="large"
                  disabled={!selectedModelConfigured || !canGeneratePreview || previewTimeout.pending}
                  loading={previewTimeout.pending}
                  onClick={handleGeneratePreview}
                >
                  {livePreview ? 'Regenerate preview' : 'Generate preview'}
                </AiActionButton>
              </InlineStack>

              <div className="rp-draft-box">
                <Text as="p" variant="bodyLg">
                  {livePreview || (!suppressPreviewFallback ? previewReply : 'Generate a preview to see how Reply Pilot will answer this review.')}
                </Text>
              </div>
            </BlockStack>
          </section>
          ) : null}
        </BlockStack>
      </div>
    </BlockStack>
  );
}
