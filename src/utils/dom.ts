/**
 * Pure DOM Element Builders.
 * Uses ONLY native DOM methods (createElement, createElementNS, textContent, setAttribute, appendChild, DOMParser)
 * to guarantee 100% immunity to Trusted Types CSP restrictions on YouTube Music.
 */

export function createSvg(
  pathD: string,
  width = 18,
  height = 18,
  viewBox = '0 0 24 24'
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'currentColor');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  svg.appendChild(path);

  return svg;
}

export function createSvgIcon(svgString: string): SVGElement {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (svg) {
      return document.importNode(svg, true) as SVGElement;
    }
  } catch {}
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
}

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: {
    id?: string;
    className?: string;
    text?: string;
    title?: string;
    style?: string;
  }
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs?.id) el.id = attrs.id;
  if (attrs?.className) el.className = attrs.className;
  if (attrs?.text !== undefined) el.textContent = attrs.text;
  if (attrs?.title) el.title = attrs.title;
  if (attrs?.style) el.style.cssText = attrs.style;
  return el;
}
