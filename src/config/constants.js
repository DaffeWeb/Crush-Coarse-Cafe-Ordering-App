// Delivery locations for Crush Coarse Cafe
export const DELIVERY_LOCATIONS = {
  buildings: [
    { id: 'mab', name: 'MAB', requiresRoom: true },
    { id: 'asb', name: 'ASB', requiresRoom: true },
    { id: 'gsb', name: 'GSB', requiresRoom: true },
    { id: 'mt-lab', name: 'MT Lab', requiresRoom: true },
    { id: 'vea-a', name: 'VEA A', requiresRoom: true },
    { id: 'vea-b', name: 'VEA B', requiresRoom: true },
    { id: 'emvm', name: 'EMVM', requiresRoom: true },
    { id: 'library', name: 'Library', requiresRoom: true },
  ],
  establishments: [
    { id: 'workplace-cafe', name: 'Workplace Cafe', requiresRoom: false },
    { id: 'mesh-cafe', name: 'Mesh Cafe', requiresRoom: false },
    { id: 'huddle-cowork', name: 'Huddle CoWork', requiresRoom: false },
  ],
  landmarks: [
    { id: 'parkway', name: 'Parkway', requiresRoom: false },
    { id: 'raintree', name: 'Raintree', requiresRoom: false },
    { id: 'kichap', name: 'Kichap', requiresRoom: false },
    { id: 'garden', name: 'Garden', requiresRoom: false },
  ],
};

export const LOCATION_TYPES = [
  { id: 'buildings', label: 'Building', icon: '🏢' },
  { id: 'establishments', label: 'Cafe / CoWork', icon: '☕' },
  { id: 'landmarks', label: 'Landmark', icon: '📍' },
];

// Order statuses
export const ORDER_STATUSES = {
  pending: { label: 'Pending', icon: '⏳', color: 'var(--status-pending)' },
  confirmed: { label: 'Confirmed', icon: '✅', color: 'var(--status-confirmed)' },
  preparing: { label: 'Preparing', icon: '☕', color: 'var(--status-preparing)' },
  ready: { label: 'Ready', icon: '🎉', color: 'var(--status-ready)' },
  out_for_delivery: { label: 'On the Way', icon: '🚀', color: 'var(--status-delivering)' },
  delivered: { label: 'Delivered', icon: '✨', color: 'var(--status-delivered)' },
  cancelled: { label: 'Cancelled', icon: '❌', color: 'var(--status-cancelled)' },
};

// Order status flow (what comes next)
export const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Payment methods
export const PAYMENT_METHODS = {
  cod: { label: 'Cash on Delivery', icon: '💵', description: 'Pay when your order arrives' },
  gcash: { label: 'GCash', icon: '📱', description: 'Scan QR code & upload receipt' },
};

// App config defaults
export const APP_CONFIG = {
  orderLimitPerDay: 5,
  gcashNumber: '09XX XXX XXXX', // Replace with actual GCash number
  gcashName: 'Jenis Nino Benedict T.', // Replace with actual GCash name
  cafeName: 'Crush Coarse Cafe',
};

// Default menu items (seed data)
export const DEFAULT_MENU = [
  {
    id: 'iced-latte',
    name: 'Iced Café Latte',
    description: 'Rich espresso blended with cold milk over ice',
    price: 89,
    category: 'coffee',
    imageUrl: '',
    available: true,
    sortOrder: 1,
  },
  {
    id: 'iced-mocha',
    name: 'Iced Mocha',
    description: 'Espresso, chocolate, and milk — perfectly icy',
    price: 99,
    category: 'coffee',
    imageUrl: '',
    available: true,
    sortOrder: 2,
  },
  {
    id: 'spanish-latte',
    name: 'Spanish Latte',
    description: 'Sweet condensed milk meets bold espresso',
    price: 99,
    category: 'coffee',
    imageUrl: '',
    available: true,
    sortOrder: 3,
  },
  {
    id: 'caramel-macchiato',
    name: 'Caramel Macchiato',
    description: 'Vanilla, milk, espresso, and caramel drizzle',
    price: 109,
    category: 'coffee',
    imageUrl: '',
    available: true,
    sortOrder: 4,
  },
  {
    id: 'matcha-latte',
    name: 'Matcha Latte',
    description: 'Premium matcha whisked with creamy milk',
    price: 109,
    category: 'non-coffee',
    imageUrl: '',
    available: true,
    sortOrder: 5,
  },
  {
    id: 'choco-frappe',
    name: 'Chocolate Frappé',
    description: 'Blended chocolate goodness with whipped cream',
    price: 109,
    category: 'non-coffee',
    imageUrl: '',
    available: true,
    sortOrder: 6,
  },
  {
    id: 'strawberry-milk',
    name: 'Strawberry Milk',
    description: 'Fresh strawberry blended with cold milk',
    price: 99,
    category: 'non-coffee',
    imageUrl: '',
    available: true,
    sortOrder: 7,
  },
  {
    id: 'cookies',
    name: 'Assorted Cookies',
    description: 'Freshly baked cookies — chocolate chip & more',
    price: 49,
    category: 'snacks',
    imageUrl: '',
    available: true,
    sortOrder: 8,
  },
  {
    id: 'banana-bread',
    name: 'Banana Bread',
    description: 'Homemade banana bread, warm and soft',
    price: 59,
    category: 'snacks',
    imageUrl: '',
    available: true,
    sortOrder: 9,
  },
];

export const MENU_CATEGORIES = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'coffee', label: 'Coffee', icon: '☕' },
  { id: 'non-coffee', label: 'Non-Coffee', icon: '🧋' },
  { id: 'snacks', label: 'Snacks', icon: '🍪' },
];
