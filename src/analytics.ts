import { giftUrl } from './content';
import type { Gift } from './content';

type Event = 'created' | 'share_copy' | 'share_native' | 'share_poster' | 'opened';
let temporaryId = '';

function visitorId() {
  try {
    const stored = localStorage.getItem('moonlit-visitor-id');
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem('moonlit-visitor-id', id);
    return id;
  } catch {
    temporaryId ||= crypto.randomUUID();
    return temporaryId;
  }
}

export async function trackCardEvent(event: Event, gift: Gift) {
  try {
    const encoded = new TextEncoder().encode(giftUrl(gift).split('#')[1] || '');
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    const cardId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, cardId, visitorId: visitorId(), audience: gift.audience }),
      keepalive: true,
    });
  } catch { /* Analytics must never interrupt a gift. */ }
}
