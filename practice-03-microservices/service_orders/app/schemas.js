function validateOrderPayload(payload, { partial = false } = {}) {
  const result = {};
  if (!partial || payload.user_id !== undefined) {
    const userId = Number(payload.user_id);
    if (!Number.isInteger(userId) || userId <= 0) return { error: 'user_id must be a positive integer' };
    result.user_id = userId;
  }
  if (!partial || payload.product !== undefined) {
    if (typeof payload.product !== 'string' || !payload.product.trim()) return { error: 'product is required' };
    result.product = payload.product.trim();
  }
  if (payload.amount !== undefined) {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount < 0) return { error: 'amount must be a non-negative number' };
    result.amount = amount;
  }
  if (payload.status !== undefined) {
    if (!['created', 'cancelled', 'completed'].includes(payload.status)) return { error: 'invalid status' };
    result.status = payload.status;
  }
  return { value: result };
}
module.exports = { validateOrderPayload };
