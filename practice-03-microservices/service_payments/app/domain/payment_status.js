function decidePaymentStatus(randomValue = Math.random(), failureRate = 0.2) {
  return randomValue < failureRate ? 'failed' : 'completed';
}
module.exports = { decidePaymentStatus };
