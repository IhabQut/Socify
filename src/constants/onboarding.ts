import { OnboardingLayoutStyle } from '@/components/OnboardingStep';

export interface OnboardingData {
  id: string;
  title: string;
  subtitle: string;
  emoji?: string;
  style: OnboardingLayoutStyle;
  type?: 'welcome' | 'discovery' | 'question_select' | 'question_input' | 'final';
  options?: { label: string; emoji?: string; icon?: string }[];
  placeholder?: string;
  multiSelect?: boolean;
  maxLength?: number;
}

export const ONBOARDING_DATA: OnboardingData[] = [
  {
    id: '1',
    title: "Your brand.\nAmplified by AI.",
    subtitle: "Join thousands of creators generating scroll-stopping content in seconds.",
    emoji: '✦',
    style: 'hero',
    type: 'welcome',
  },
  {
    id: '15',
    title: "What's your\nbrand called?",
    subtitle: "This is how your creative hub will be personalized.",
    style: 'centered',
    type: 'question_input',
    placeholder: 'e.g. Luminary Studio',
    maxLength: 40,
  },
  {
    id: '14',
    title: "What industry\nare you in?",
    subtitle: "We'll prioritize the templates that actually convert in your space.",
    style: 'centered',
    type: 'question_select',
    multiSelect: false,
    options: [
      { label: 'Fashion & Apparel',    emoji: '👗' },
      { label: 'Beauty & Cosmetics',   emoji: '💄' },
      { label: 'Food & Beverage',      emoji: '🍽️' },
      { label: 'Health & Wellness',    emoji: '🧘' },
      { label: 'Real Estate',          emoji: '🏠' },
      { label: 'Tech & SaaS',          emoji: '💻' },
      { label: 'Education',            emoji: '📚' },
      { label: 'Luxury & Lifestyle',   emoji: '✨' },
      { label: 'Creative Services',    emoji: '🎨' },
    ],
  },
  {
    id: '4',
    title: "What's your\nbiggest goal?",
    subtitle: "Our AI will prioritize strategies built around this outcome.",
    style: 'centered',
    type: 'question_select',
    multiSelect: false,
    options: [
      { label: 'Drive more sales',        emoji: '💰' },
      { label: 'Grow my audience',        emoji: '📈' },
      { label: 'Build brand authority',   emoji: '👑' },
      { label: 'Get more engagement',     emoji: '🔥' },
      { label: 'Launch a product',        emoji: '🚀' },
      { label: 'Establish my presence',   emoji: '🌍' },
    ],
  },
  {
    id: '8',
    title: "Where does\nyour audience live?",
    subtitle: "Select every platform you want to dominate.",
    style: 'centered',
    type: 'question_select',
    multiSelect: true,
    options: [
      { label: 'Instagram',  emoji: '📸' },
      { label: 'TikTok',     emoji: '🎵' },
      { label: 'YouTube',    emoji: '▶️' },
      { label: 'Facebook',   emoji: '👥' },
      { label: 'LinkedIn',   emoji: '💼' },
      { label: 'Threads',    emoji: '🧵' },
      { label: 'Pinterest',  emoji: '📌' },
    ],
  },
  {
    id: '10',
    title: "How big is\nyour following?",
    subtitle: "We'll calibrate your strategy to your current stage.",
    style: 'centered',
    type: 'question_select',
    multiSelect: false,
    options: [
      { label: 'Just starting out',    emoji: '🌱' },
      { label: '1K – 10K',             emoji: '📊' },
      { label: '10K – 50K',            emoji: '💫' },
      { label: '50K – 100K',           emoji: '⭐' },
      { label: '100K+',                emoji: '🏆' },
    ],
  },
  {
    id: '11',
    title: "Describe your\nbrand in one line.",
    subtitle: "Be bold. This shapes every caption and template we generate for you.",
    style: 'centered',
    type: 'question_input',
    placeholder: 'e.g. Minimalist fashion for the modern woman',
    maxLength: 80,
  },
  {
    id: '13',
    title: "How often do you\npost content?",
    subtitle: "We'll set your output frequency and scheduling engine accordingly.",
    style: 'centered',
    type: 'question_select',
    multiSelect: false,
    options: [
      { label: 'Every day',           emoji: '⚡' },
      { label: 'A few times a week',  emoji: '📅' },
      { label: 'Once a week',         emoji: '🗓️' },
      { label: 'A few times a month', emoji: '📆' },
      { label: 'Just getting started',emoji: '🌱' },
    ],
  },
  {
    id: '12',
    title: "Do you have\na physical location?",
    subtitle: "This helps us surface local marketing templates and geo-targeting options.",
    style: 'centered',
    type: 'question_select',
    multiSelect: false,
    options: [
      { label: 'Yes — I have a store or office', emoji: '🏪' },
      { label: 'No — fully online',              emoji: '🌐' },
    ],
  },
  {
    id: '9',
    title: "How did you\nhear about us?",
    subtitle: "Just 30 seconds of your time helps us grow too.",
    style: 'centered',
    type: 'question_select',
    multiSelect: false,
    options: [
      { label: 'App Store',          emoji: '📱' },
      { label: 'Instagram / TikTok', emoji: '📲' },
      { label: 'Google Search',      emoji: '🔍' },
      { label: 'A friend told me',   emoji: '💬' },
      { label: 'Advertisement',      emoji: '📣' },
    ],
  },
  {
    id: '6',
    title: "Finally — what\nshould we call you?",
    subtitle: "This is just between us. Your creative hub, your name.",
    style: 'centered',
    type: 'question_input',
    placeholder: 'Your name or alias...',
    maxLength: 30,
  },
  {
    id: '7',
    title: 'Strategy Ready',
    subtitle: "Your personalized AI engine is locked and loaded.",
    style: 'hero',
    type: 'final',
  },
];
