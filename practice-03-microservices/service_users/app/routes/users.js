const express = require('express');
const service = require('../services/user_service');
const { validateUserPayload } = require('../schemas');

const router = express.Router();

router.get('/status', (req, res) => res.json({ status: 'Users service is running' }));
router.get('/health', (req, res) => res.json({
  status: 'OK', service: 'Users Service', timestamp: new Date().toISOString()
}));

router.get('/', async (req, res, next) => {
  try { res.json(await service.listUsers()); } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = validateUserPayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    res.status(201).json(await service.createUser(parsed.value));
  } catch (error) { next(error); }
});

router.get('/:userId', async (req, res, next) => {
  try {
    const user = await service.getUser(Number(req.params.userId));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { next(error); }
});

router.put('/:userId', async (req, res, next) => {
  try {
    const parsed = validateUserPayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const user = await service.updateUser(Number(req.params.userId), parsed.value);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { next(error); }
});

router.delete('/:userId', async (req, res, next) => {
  try {
    const deletedUser = await service.deleteUser(Number(req.params.userId));
    if (!deletedUser) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted', deletedUser });
  } catch (error) { next(error); }
});

module.exports = router;
