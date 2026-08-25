/**
 * DOM utility for Trusted Types safe HTML insertion on YouTube Music
 */

let trustedPolicy: any = null;

if (typeof window !== 'undefined' && (window as any).trustedTypes?.createPolicy) {
  try {
    trustedPolicy = (window as any).trustedTypes.createPolicy('ytmd-default', {
      createHTML: (s: string) => s,
      createScriptURL: (s: string) => s,
      createScript: (s: string) => s,
    });
  } catch {
    // Policy might already exist
  }
}

export function setSafeHTML(element: HTMLElement, htmlString: string): void {
  if (trustedPolicy) {
    try {
      element.innerHTML = trustedPolicy.createHTML(htmlString);
      return;
    } catch {
      // Continue to DOMParser fallback
    }
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    element.replaceChildren(...Array.from(doc.body.childNodes));
  } catch {
    try {
      (element as any).innerHTML = htmlString;
    } catch (e) {
      console.warn('[YTMD] Could not set HTML:', e);
    }
  }
}
