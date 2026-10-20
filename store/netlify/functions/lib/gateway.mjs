// عميل Moyasar من جهة الخادم: يجلب الدفعة بالمفتاح السري للتحقق منها (لا نثق بتحويل المتصفح).
// Server-side Moyasar client: fetches the payment with the SECRET key to verify it.
// Docs: https://docs.moyasar.com/guides/card-payments/min-integration  (Step 4)
//
// Project manager · Eng. Ahmed Zahran

const API = 'https://api.moyasar.com/v1';

export class GatewayError extends Error {
  /** @param {'not_found'|'unauthorized'|'unavailable'} kind */
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

export function createMoyasar({ secretKey, fetchImpl = fetch }) {
  const auth = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

  return {
    /** GET /v1/payments/:id */
    async fetchPayment(paymentId) {
      let res;
      try {
        res = await fetchImpl(`${API}/payments/${encodeURIComponent(paymentId)}`, {
          headers: { Authorization: auth, Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
      } catch (err) {
        throw new GatewayError('unavailable', `Moyasar unreachable: ${err?.name ?? 'error'}`);
      }
      if (res.status === 404) throw new GatewayError('not_found', 'payment not found');
      if (res.status === 401 || res.status === 403) throw new GatewayError('unauthorized', 'Moyasar rejected the secret key');
      if (!res.ok) throw new GatewayError('unavailable', `Moyasar answered ${res.status}`);
      return res.json();
    },
  };
}
