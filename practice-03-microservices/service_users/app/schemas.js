function validateUserPayload(payload) {
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const fullName = typeof (payload.full_name ?? payload.name) === 'string'
    ? String(payload.full_name ?? payload.name).trim()
    : '';

  if (!email || !email.includes('@')) return { error: 'email is required and must be valid' };
  if (!fullName) return { error: 'full_name is required' };
  return { value: { email, full_name: fullName } };
}

module.exports = { validateUserPayload };
