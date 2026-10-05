function validatePaymentPayload(payload, { partial = false } = {}) {
  const result = {};
  if (!partial || payload.order_id !== undefined) {
    const orderId = Number(payload.order_id);
    if (!Number.isInteger(orderId) || orderId <= 0) return { error: 'order_id must be a positive integer' };
    result.order_id = orderId;
  }
  if (!partial || payload.amount !== undefined) {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'amount must be a positive number' };
    result.amount = amount;
  }
  if (payload.status !== undefined) {
    if (!['pending', 'completed', 'failed'].includes(payload.status)) {
      return { error: 'status must be pending, completed or failed' };
    }
    result.status = payload.status;
  }
  if (payload.provider_reference !== undefined) result.provider_reference = String(payload.provider_reference);
  return { value: result };
}
module.exports = { validatePaymentPayload };
