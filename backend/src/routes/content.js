import express from 'express';
import { HttpError } from '../errors.js';
import { rateLimiter } from '../middleware/rateLimit.js';
import { checkFlag, hasFlag } from '../labs/catalog.js';

// Write API for everything that used to be a direct browser -> Supabase write.
//   PUT/DELETE /api/progress/:lessonId        learner, own rows only
//   /api/admin/...                            admin role, checked on every call
// Lesson content can be large, so this router parses its own (bigger) JSON
// body and must be mounted before the global 16kb parser.
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

export function createContentRouter({ service, dashboard, authenticate, isAdmin, bodyLimit = '512kb', limits = {} }) {
  const { perIp = 600, perUser = 300 } = limits;
  const router = express.Router();
  // Scoped to our own prefixes: this router is mounted at /api, next to the
  // sandbox routes, which keep their own (smaller) body limit.
  // Per-IP first (cheap, stops token-guessing floods before they cost a
  // Supabase lookup), then per-user (one noisy account can't starve the rest).
  router.use(['/progress', '/admin', '/labs'],
    rateLimiter(perIp),
    authenticate,
    rateLimiter(perUser, 60000, { key: (req) => req.user.id, message: 'Too many requests, slow down' }),
    express.json({ limit: bodyLimit, strict: true }));

  const requireAdmin = wrap(async (req, _res) => {
    if (!(await isAdmin(req.user.id))) throw new HttpError(403, 'FORBIDDEN', 'Admin role required');
  });
  const admin = express.Router();
  admin.use((req, res, next) => requireAdmin(req, res).then(() => next(), next));
  router.use('/admin', admin);

  // ---- learner progress ----------------------------------------------------
  router.put('/progress/:lessonId', wrap(async (req, res) => {
    const user = { id: req.user.id, isAdmin: await isAdmin(req.user.id) };
    // A lab with a flag is completed by submitting the flag, never by asking for "done".
    if (req.body?.status === 'done' && hasFlag(await service.getLessonSlug(req.params.lessonId, user.isAdmin))) {
      throw new HttpError(403, 'FLAG_REQUIRED', 'Submit the lab flag to complete this lab.');
    }
    await service.markProgress(user, req.params.lessonId, req.body?.status);
    res.sendStatus(204);
  }));

  // ---- lab flags -------------------------------------------------------------
  // A correct flag completes the lab (the server writes the progress itself).
  const flagLimiter = rateLimiter(10, 60000, { key: (req) => req.user.id, code: 'FLAG_RATE_LIMIT', message: 'Too many flag attempts, wait a minute' });
  router.post('/labs/:lessonId/flag', flagLimiter, wrap(async (req, res) => {
    const user = { id: req.user.id, isAdmin: await isAdmin(req.user.id) };
    const slug = await service.getLessonSlug(req.params.lessonId, user.isAdmin);
    if (!hasFlag(slug)) throw new HttpError(404, 'NO_FLAG', 'This lab has no flag');
    if (!checkFlag(slug, req.body?.flag)) return res.json({ correct: false });
    await service.markProgress(user, req.params.lessonId, 'done');
    res.json({ correct: true });
  }));
  router.delete('/progress/:lessonId', wrap(async (req, res) => {
    await service.clearProgress(req.user, req.params.lessonId);
    res.sendStatus(204);
  }));

  // ---- admin: dashboard (Prometheus time series + headline numbers) ----
  if (dashboard) admin.get('/dashboard', wrap(async (req, res) => res.json(await dashboard.get(req.query.range))));

  // ---- admin: content --------------------------------------------------------
  admin.post('/courses', wrap(async (req, res) => res.status(201).json(await service.createCourse(req.body))));
  admin.patch('/courses/:id', wrap(async (req, res) => res.json(await service.updateCourse(req.params.id, req.body))));
  admin.post('/courses/:id/chapters', wrap(async (req, res) => res.status(201).json(await service.createChapter(req.params.id, req.body))));
  admin.patch('/chapters/:id', wrap(async (req, res) => res.json(await service.updateChapter(req.params.id, req.body))));
  admin.post('/chapters/:id/lessons', wrap(async (req, res) => res.status(201).json(await service.createLesson(req.params.id, req.body))));
  admin.patch('/lessons/:id', wrap(async (req, res) => res.json(await service.updateLesson(req.params.id, req.body))));
  admin.post('/:kind/swap', wrap(async (req, res) => {
    await service.swapOrder(req.params.kind, req.body);
    res.sendStatus(204);
  }));

  // ---- admin: users and sessions (audited by the RPCs themselves) --------------
  admin.post('/users/:id/role', wrap(async (req, res) => {
    await service.setUserRole(req.accessToken, req.params.id, req.body?.role, req.body?.reason);
    res.sendStatus(204);
  }));
  admin.post('/users/:id/lock', wrap(async (req, res) => {
    await service.setUserLock(req.accessToken, req.params.id, req.body?.locked, req.body?.reason);
    res.sendStatus(204);
  }));
  admin.post('/sessions/:id/stop', wrap(async (req, res) => {
    const sandboxSessionId = await service.stopPracticeSession(req.accessToken, req.params.id, req.body?.reason);
    req.app.emit('practice-session-stopped', sandboxSessionId);
    res.sendStatus(204);
  }));

  return router;
}
