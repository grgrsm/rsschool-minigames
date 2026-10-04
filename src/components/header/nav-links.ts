import { routeHref } from '@/router';

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: routeHref('home') },
  { label: 'Library', href: routeHref('library') },
  { label: 'Tournaments', href: '#tournaments' },
  { label: 'Community', href: '#community' },
];
