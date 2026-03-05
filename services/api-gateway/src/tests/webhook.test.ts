import crypto from 'crypto';

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

describe('Webhook HMAC verification', () => {
  const secret = 'test-webhook-secret';
  const body = JSON.stringify({ event: 'record.created', tenantId: 't1' });

  it('accepts valid HMAC signature', () => {
    const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it('rejects tampered body', () => {
    const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature('{"tampered":true}', sig, secret)).toBe(false);
  });

  it('rejects wrong secret', () => {
    const sig = 'sha256=' + crypto.createHmac('sha256', 'wrong-secret').update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });

  it('rejects missing sha256= prefix', () => {
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });
});