type AttrValue = string | number | boolean;

export interface ElementOptions {
  className?: string;
  attrs?: Record<string, AttrValue>;
  text?: string;
  html?: string;
}

/**
 * Minimal, type-safe element factory. Keeps components framework-free
 * while avoiding repetitive `document.createElement` + attribute wiring.
 */
export function el<TagName extends keyof HTMLElementTagNameMap>(
  tag: TagName,
  options: ElementOptions = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[TagName] {
  const node = document.createElement(tag);

  if (options.className) {
    node.className = options.className;
  }

  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (typeof value === 'boolean') {
        if (value) node.setAttribute(key, '');
      } else {
        node.setAttribute(key, String(value));
      }
    }
  }

  if (options.text !== undefined) {
    node.textContent = options.text;
  }

  if (options.html !== undefined) {
    node.innerHTML = options.html;
  }

  for (const child of children) {
    node.append(child);
  }

  return node;
}

export function formatCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(value);
}

export function formatScore(value: number): string {
  return value.toLocaleString('en-US');
}
