const test = require('node:test');
const assert = require('node:assert/strict');
const { decidePaymentStatus } = require('../service_payments/app/domain/payment_status');
const { validateUserPayload } = require('../service_users/app/schemas');
const { validateOrderPayload } = require('../service_orders/app/schemas');
const { validatePaymentPayload } = require('../service_payments/app/schemas');

test('payment status uses the configured failure threshold', () => {
  assert.equal(decidePaymentStatus(0.19, 0.2), 'failed');
  assert.equal(decidePaymentStatus(0.2, 0.2), 'completed');
});

test('schemas reject invalid data and normalize accepted aliases', () => {
  assert.equal(validateUserPayload({ email: 'invalid', name: 'Test' }).error !== undefined, true);
  assert.deepEqual(validateUserPayload({ email: 'test@example.com', name: 'Test User' }).value, {
    email: 'test@example.com', full_name: 'Test User'
  });
  assert.equal(validateOrderPayload({ product: 'Book' }).error !== undefined, true);
  assert.deepEqual(validatePaymentPayload({ order_id: 1, amount: 10 }).value, {
    order_id: 1, amount: 10
  });
});
