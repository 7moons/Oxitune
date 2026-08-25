/**
 * DOM utility for Trusted Types safe HTML insertion on YouTube Music.
 * Uses DOMParser and document.importNode with replaceChildren to completely bypass Trusted Types.
 */

export function setSafeHTML(element: HTMLElement, htmlString: string): void {
  try {
    const trimmed = htmlString.trim();

    // Check if it's an SVG string
    if (trimmed.startsWith('<svg') || trimmed.includes('<svg')) {
      const xmlParser = new DOMParser();
      const xmlDoc = xmlParser.parseFromString(htmlString, 'image/svg+xml');
      const svgElement = xmlDoc.documentElement;
      if (svgElement && svgElement.nodeName.toLowerCase() === 'svg') {
        const imported = document.importNode(svgElement, true);
        element.replaceChildren(imported);
        return;
      }
    }

    // HTML elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const nodes = Array.from(doc.body.childNodes).map((n) => document.importNode(n, true));
    element.replaceChildren(...nodes);
  } catch (e) {
    console.warn('[YTMD] Safe DOM insertion error:', e);
  }
}
