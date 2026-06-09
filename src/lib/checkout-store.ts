type CheckoutRecord = {
  resultId: string;
  paid: boolean;
  stripeSessionId?: string;
  createdAt: number;
};

const globalCheckoutStore = globalThis as typeof globalThis & {
  checkoutStore?: Map<string, CheckoutRecord>;
};

export const checkoutStore =
  globalCheckoutStore.checkoutStore ?? new Map<string, CheckoutRecord>();

globalCheckoutStore.checkoutStore = checkoutStore;

export function createCheckoutRecord(resultId: string) {
  const accessToken = crypto.randomUUID();
  checkoutStore.set(accessToken, {
    resultId,
    paid: false,
    createdAt: Date.now(),
  });

  return accessToken;
}

export function markCheckoutRecordPaid(
  accessToken: string,
  stripeSessionId: string,
) {
  const record = checkoutStore.get(accessToken);

  if (!record) {
    return false;
  }

  checkoutStore.set(accessToken, {
    ...record,
    paid: true,
    stripeSessionId,
  });

  return true;
}

export function isCheckoutRecordPaid(accessToken: string, resultId: string) {
  const record = checkoutStore.get(accessToken);
  return Boolean(record?.paid && record.resultId === resultId);
}
