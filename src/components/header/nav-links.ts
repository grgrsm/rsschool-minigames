export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '#home' },
  { label: 'Library', href: '#library' },
  { label: 'Tournaments', href: '#tournaments' },
  { label: 'Community', href: '#community' },
];
