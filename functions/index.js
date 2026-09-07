const { onValueWritten } = require('firebase-functions/v2/database');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp({
  databaseURL: 'https://myecosystem-e6414-default-rtdb.firebaseio.com'
});
const db = admin.database();

const ADMIN_UIDS = new Set([
  'ayXehcol9FgAQU6tZuup7aSaRoV2',
  'pWB0nGVvVXc4je6466ss7IwBm9G2',
  'ANR62p3qcjOe2ALsdVvJHUNCCV42'
]);
const MAX_LEVEL = 86;
const XP = { post: 12, comment: 3, visit: 2 };

function levelForExperience(experience) {
  let level = 1;
  let required = 0;
  while (level < MAX_LEVEL) {
    const next = Math.round(20 + level * 12 + level * level * 2);
    if (experience < required + next) break;
    required += next;
    level += 1;
  }
  return level;
}

async function changeExperience(site, uid, delta, field) {
  if (!site || !uid || !delta) return null;
  const ref = db.ref(`sites/${site}/profile_levels/${uid}`);
  const result = await ref.transaction((current) => {
    const state = current || { experience: 0, level: 1, posts: 0, comments: 0, activeDays: 0 };
    state.experience = Math.max(0, Number(state.experience || 0) + delta);
    if (field) {
      state[field] = Math.max(0, Number(state[field] || 0) + (delta > 0 ? 1 : -1));
    } else {
      state.manualExperience = Number(state.manualExperience || 0) + delta;
    }
    state.level = levelForExperience(state.experience);
    state.updatedAt = Date.now();
    return state;
  });
  return result.snapshot.val();
}

async function scorePublication(event) {
  const before = event.data.before.val();
  const after = event.data.after.val();
  const site = event.params.site;
  if (!before && after && after.authorUid && !after.deleted) {
    await changeExperience(site, after.authorUid, XP.post, 'posts');
    return;
  }
  if (before && after && before.authorUid && !before.deleted && after.deleted) {
    await changeExperience(site, before.authorUid, -XP.post, 'posts');
    return;
  }
  if (before && !after && before.authorUid && !before.deleted) {
    await changeExperience(site, before.authorUid, -XP.post, 'posts');
  }
}

exports.scorePost = onValueWritten('/sites/{site}/feed_posts/{postId}', scorePublication);
exports.scorePhotoPost = onValueWritten('/sites/{site}/foto_posts/{postId}', scorePublication);

async function scorePublicationComment(event) {
  const before = event.data.before.val();
  const after = event.data.after.val();
  const site = event.params.site;
  if (!before && after && after.authorUid) {
    await changeExperience(site, after.authorUid, XP.comment, 'comments');
  } else if (before && !after && before.authorUid) {
    await changeExperience(site, before.authorUid, -XP.comment, 'comments');
  }
}

exports.scoreComment = onValueWritten('/sites/{site}/feed_posts/{postId}/comments/{commentId}', scorePublicationComment);
exports.scorePhotoComment = onValueWritten('/sites/{site}/foto_posts/{postId}/comments/{commentId}', scorePublicationComment);

exports.recordDailyVisit = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Требуется вход в аккаунт.');
  const uid = request.auth.uid;
  const site = String(request.data && request.data.site || '');
  if (!site) throw new HttpsError('invalid-argument', 'Не указан сайт.');
  const now = Date.now();
  const moscowDay = new Date(now + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const visitRef = db.ref(`sites/${site}/profile_activity/${uid}/days/${moscowDay}`);
  const created = await visitRef.transaction((current) => current || { at: now });
  if (!created.committed || !created.snapshot.val() || created.snapshot.val().at !== now) {
    return { added: false };
  }
  const state = await changeExperience(site, uid, XP.visit, 'activeDays');
  return { added: true, level: state.level, experience: state.experience };
});

exports.adjustProfileExperience = onCall(async (request) => {
  if (!request.auth || !ADMIN_UIDS.has(request.auth.uid)) {
    throw new HttpsError('permission-denied', 'Только администратор может менять опыт.');
  }
  const data = request.data || {};
  const site = String(data.site || '');
  const uid = String(data.uid || '');
  const delta = Number(data.delta);
  if (!site || !uid || !Number.isInteger(delta) || delta < -5000 || delta > 5000 || delta === 0) {
    throw new HttpsError('invalid-argument', 'Некорректные параметры опыта.');
  }
  const state = await changeExperience(site, uid, delta, null);
  await db.ref(`sites/${site}/profile_activity/${uid}/admin_adjustments`).push({
    delta, by: request.auth.uid, at: Date.now(), reason: String(data.reason || '').slice(0, 250)
  });
  logger.info('Profile experience adjusted', { uid, delta, by: request.auth.uid });
  return { level: state.level, experience: state.experience };
});

exports.rebuildProfileExperience = onCall(async (request) => {
  if (!request.auth || !ADMIN_UIDS.has(request.auth.uid)) {
    throw new HttpsError('permission-denied', 'Только администратор может пересчитать опыт.');
  }
  const data = request.data || {};
  const site = String(data.site || '');
  const uid = String(data.uid || '');
  if (!site || !uid) throw new HttpsError('invalid-argument', 'Не указан пользователь.');
  const [feedSnap, photoSnap, levelSnap] = await Promise.all([
    db.ref(`sites/${site}/feed_posts`).once('value'),
    db.ref(`sites/${site}/foto_posts`).once('value'),
    db.ref(`sites/${site}/profile_levels/${uid}`).once('value')
  ]);
  let posts = 0;
  let comments = 0;
  [feedSnap.val() || {}, photoSnap.val() || {}].forEach((collection) => {
    Object.values(collection).forEach((post) => {
      if (!post) return;
      if (post.authorUid === uid && !post.deleted) posts += 1;
      Object.values(post.comments || {}).forEach((comment) => {
        if (comment && comment.authorUid === uid) comments += 1;
      });
    });
  });
  const old = levelSnap.val() || {};
  const activeDays = Math.max(0, Number(old.activeDays || 0));
  const manualExperience = Number(old.manualExperience || 0);
  const experience = Math.max(0, posts * XP.post + comments * XP.comment + activeDays * XP.visit + manualExperience);
  const state = { experience, level: levelForExperience(experience), posts, comments, activeDays, manualExperience, updatedAt: Date.now() };
  await db.ref(`sites/${site}/profile_levels/${uid}`).set(state);
  return state;
});
