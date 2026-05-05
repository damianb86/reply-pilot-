export const onboardingSteps = [
  {
    id: 'connect',
    step: '1',
    title: 'Connect a review source',
    description: 'Paste Judge.me API token',
  },
  {
    id: 'voice',
    step: '2',
    title: 'Train your brand voice',
    description: 'Paste 5-10 past replies',
  },
  {
    id: 'approve',
    step: '3',
    title: 'Approve and ship',
    description: 'One by one or in bulk',
  },
];

export const reviewSources = [
  {
    id: 'judgeme',
    initials: 'J.',
    name: 'Judge.me',
    status: 'recommended',
    detail: 'Pulls the last 90 days of reviews. Read and write access. Revoke anytime from Judge.me.',
    merchants: '37k merchants',
    available: true,
  },
  {
    id: 'loox',
    initials: 'L',
    name: 'Loox',
    detail: 'Photo and video reviews',
    votes: 218,
  },
  {
    id: 'yotpo',
    initials: 'Y',
    name: 'Yotpo',
    detail: 'Reviews and loyalty',
    votes: 154,
  },
  {
    id: 'stamped',
    initials: 'St',
    name: 'Stamped',
    detail: 'Reviews and UGC',
    votes: 92,
  },
  {
    id: 'google',
    initials: 'G',
    name: 'Google Business',
    detail: 'Local profile reviews',
    votes: 81,
  },
  {
    id: 'trustpilot',
    initials: 'T',
    name: 'Trustpilot',
    detail: 'Public profile reviews',
    votes: 67,
  },
  {
    id: 'shopify',
    initials: 'S',
    name: 'Shopify Reviews',
    detail: 'Native Shopify reviews',
    votes: 44,
  },
];

export const reviewQueue = [
  {
    id: 'maria',
    initials: 'MG',
    customer: 'Maria Gonzalez',
    product: 'Linen Apron - Olive',
    review:
      'It arrived perfectly, the color is beautiful, and the fabric feels even better than expected. I will order another for my mom.',
    rating: 5,
    confidence: 94,
    age: '2h',
    selected: true,
    draft:
      'Hi Maria! Thank you so much for the kind words. We are thrilled the linen won you over; it is handmade in Oaxaca with natural dyes. If you order one for your mom, write to us and we will include a personalized note. - Sofia, Marisol & co.',
  },
  {
    id: 'jesse',
    initials: 'JP',
    customer: 'Jesse Pham',
    product: 'Cotton Tote - Sand',
    review:
      'The stitching on the strap came undone after 3 weeks. Disappointed for the price.',
    rating: 2,
    confidence: 61,
    age: '5h',
    human: true,
    draft:
      "Hi Jesse - that's not the quality we stand behind, and I'm sorry the strap gave out. Email hello@marisol.co with your order number and we'll send a replacement.",
  },
  {
    id: 'anya',
    initials: 'AP',
    customer: 'Anya Petrova',
    product: 'Block-Print Napkins, set of 4',
    review:
      'Obsessed!! These made my dinner party. The hand-printed quality really came through.',
    rating: 5,
    confidence: 97,
    age: '8h',
    selected: true,
    draft:
      'Anya, this just made our morning. Each napkin is block-printed by Reema in Jaipur, so it means a lot that the craft came through. Tag us if they make another table appearance.',
  },
  {
    id: 'david',
    initials: 'DK',
    customer: 'David Kim',
    product: 'Linen Apron - Olive',
    review:
      'Beautiful apron, fits well. Wish the pocket were a touch deeper for my phone but otherwise great.',
    rating: 4,
    confidence: 88,
    age: '1d',
    selected: true,
    draft:
      "Hi David - happy you're loving the apron. Funny you mention the pocket; we deepened it on the next batch. Thanks for the useful note.",
  },
  {
    id: 'camila',
    initials: 'CR',
    customer: 'Camila R.',
    product: 'Block-Print Napkins, set of 4',
    review: 'They arrived quickly and are even more beautiful in person.',
    rating: 5,
    confidence: 95,
    age: '1d',
    selected: true,
    draft:
      'Camila, this made our day. Reema, the artisan who prints them by hand, will be so happy to read this. Thank you for choosing us.',
  },
  {
    id: 'thornton',
    initials: 'MT',
    customer: 'M. Thornton',
    product: 'Cotton Tote - Sand',
    review:
      'Never arrived. Tracking says delivered but I have NOTHING. Need a refund now.',
    rating: 1,
    confidence: 34,
    age: '2d',
    human: true,
    draft:
      "I'm sorry this has not arrived. Send us your order number and we'll open a carrier claim today while we make this right.",
  },
  {
    id: 'hiro',
    initials: 'HN',
    customer: 'Hiro N.',
    product: 'Ceramic Mug - Terracotta',
    review: 'Perfect weight in the hand. Coffee tastes better, somehow.',
    rating: 5,
    confidence: 92,
    age: '2d',
    selected: true,
    draft:
      'Hiro, this made us smile. The terracotta batch was shaped by Diego, so the weight is very intentional. Thank you for noticing.',
  },
  {
    id: 'lucia',
    initials: 'LF',
    customer: 'Lucia F.',
    product: 'Linen Apron - Olive',
    review: 'It is nice, but the color is darker than it looks in the photo.',
    rating: 3,
    confidence: 74,
    age: '3d',
    draft:
      'Lucia, thank you for saying that. Natural dyes can photograph a little brighter than they look in person, and we will tune the product photos so expectations are clearer.',
  },
];

export const sentReplies = [
  {
    id: 'sent-maria',
    initials: 'MG',
    customer: 'Maria Gonzalez',
    product: 'Linen Apron - Olive',
    rating: 5,
    reply:
      'Hi Maria! Thank you so much for the kind words. We are thrilled the linen won you over; it is handmade in Oaxaca with natural dyes.',
    status: 'edited',
    age: '2h',
  },
  {
    id: 'sent-jesse',
    initials: 'JP',
    customer: 'Jesse Pham',
    product: 'Cotton Tote - Sand',
    rating: 2,
    reply:
      "Hi Jesse - that's not the quality we stand behind, and I'm sorry the strap gave out. Email hello@marisol.co with your order number and we'll send a replacement.",
    status: 'as-is',
    age: '5h',
  },
  {
    id: 'sent-anya',
    initials: 'AP',
    customer: 'Anya Petrova',
    product: 'Block-Print Napkins, set of 4',
    rating: 5,
    reply:
      'Anya, this just made our morning. Each napkin is block-printed by Reema in Jaipur, so it means a lot that the craft came through.',
    status: 'as-is',
    age: '8h',
  },
  {
    id: 'sent-david',
    initials: 'DK',
    customer: 'David Kim',
    product: 'Linen Apron - Olive',
    rating: 4,
    reply:
      "Hi David - happy you're loving the apron. Funny you mention the pocket; we actually deepened it on the next batch.",
    status: 'edited',
    age: '1d',
  },
  {
    id: 'sent-camila',
    initials: 'CR',
    customer: 'Camila R.',
    product: 'Block-Print Napkins, set of 4',
    rating: 5,
    reply:
      'Camila, this made our day. Reema, the artisan who prints them by hand, will be so happy to read this. Thank you for choosing us.',
    status: 'as-is',
    age: '1d',
  },
];

export const voiceExamples = [
  {id: 'maya', rating: 5, text: 'Hi Maya - that means the world! Reema, who block-prints each napkin, will be thrilled.'},
  {id: 'tom', rating: 1, text: 'Oh no, Tom - let me fix this today. Email hello@marisol.co and I will take it from there.'},
  {id: 'camila', rating: 5, text: 'Camila, thank you! Diego will be happy to read this.'},
  {id: 'david', rating: 4, text: "Hey David - happy you're loving the apron. Funny you mention the pocket."},
];

export const aiModels = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    detail: 'Fast, balanced, default',
  },
  {
    id: 'claude',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    detail: 'Warmer prose',
  },
  {
    id: 'gemini',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    detail: 'Lowest quota cost',
  },
];

export const weekBars = [
  {day: 'M', value: 38},
  {day: 'T', value: 42},
  {day: 'W', value: 47},
  {day: 'T', value: 51},
  {day: 'F', value: 58},
  {day: 'S', value: 44},
  {day: 'S', value: 49},
];
