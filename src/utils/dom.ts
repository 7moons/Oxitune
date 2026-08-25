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

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_CHILD_TAGS = 'circle|path|rect|line|polyline|polygon|g|ellipse';

/**
 * Builds an SVG element from a trusted, hardcoded markup string using only
 * createElementNS/setAttribute (never DOMParser). YouTube Music's Trusted Types
 * policy blocks DOMParser.parseFromString() outright ("This document requires
 * 'TrustedHTML' assignment"), which silently swallowed every icon here before.
 */
export function createSvgIcon(svgString: string): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');

  const setAttrsFrom = (el: Element, attrString: string) => {
    for (const match of attrString.matchAll(/([\w:-]+)="([^"]*)"/g)) {
      el.setAttribute(match[1], match[2]);
    }
  };

  const svgTagMatch = svgString.match(/^<svg([^>]*)>/);
  if (svgTagMatch) {
    setAttrsFrom(svg, svgTagMatch[1]);
  }

  const childRe = new RegExp(`<(${SVG_CHILD_TAGS})([^>]*)\\/?>`, 'g');
  for (const match of svgString.matchAll(childRe)) {
    const el = document.createElementNS(SVG_NS, match[1]);
    setAttrsFrom(el, match[2]);
    svg.appendChild(el);
  }

  return svg;
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
