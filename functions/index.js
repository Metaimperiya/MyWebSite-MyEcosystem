const { onValueWritten } = require('firebase-functions/v2/database');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('node:crypto');

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
const REFERRAL_SITE = 'www_metaimperiya_com';
const MAX_REFERRAL_ANCESTORS = 100;

function referralSite(value) {
  if (value !== REFERRAL_SITE) throw new HttpsError('invalid-argument', 'Неизвестный сайт.');
  return value;
}

exports.getReferralDashboard = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Войди, чтобы открыть приглашения.');
  const site = referralSite(request.data && request.data.site);
  const uid = request.auth.uid;
  const codeRef = db.ref(`sites/${site}/referral_code_by_uid/${uid}`);
  let code = (await codeRef.once('value')).val();
  if (!code) {
    for (let attempt = 0; attempt < 5 && !code; attempt += 1) {
      const candidate = crypto.randomBytes(6).toString('hex').toUpperCase();
      const result = await db.ref(`sites/${site}/referral_codes/${candidate}`).transaction((current) => current || { uid, createdAt: Date.now() });
      if (result.snapshot.val() && result.snapshot.val().uid === uid) {
        const mapping = await codeRef.transaction((current) => current || candidate);
        code = mapping.snapshot.val();
      }
    }
    if (!code) throw new HttpsError('unavailable', 'Не удалось создать ссылку. Попробуй ещё раз.');
  }
  await db.ref(`sites/${site}/referral_codes/${code}`).transaction((current) => current || { uid, createdAt: Date.now() });
  const [directSnap, teamSnap, walletSnap] = await Promise.all([
    db.ref(`sites/${site}/referrals/${uid}`).once('value'),
    db.ref(`sites/${site}/referral_team/${uid}`).once('value'),
    db.ref(`sites/${site}/referral_wallets/${uid}`).once('value')
  ]);
  const direct = directSnap.val() || {};
  const team = teamSnap.val() || {};
  const members = Object.keys(team).map((memberUid) => ({
    uid: memberUid,
    depth: Number(team[memberUid].depth || 1),
    joinedAt: Number(team[memberUid].joinedAt || 0),
    directReferrerUid: team[memberUid].directReferrerUid || uid
  })).sort((a, b) => b.joinedAt - a.joinedAt).slice(0, 250);
  return {
    code,
    link: `https://metaimperiya.com/?ref=${encodeURIComponent(code)}`,
    directCount: Object.keys(direct).length,
    teamCount: Object.keys(team).length,
    balance: Number(walletSnap.child('balance').val() || 0),
    members
  };
});

exports.getReferralFeed = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Войди, чтобы открыть ленту команды.');
  const site = referralSite(request.data && request.data.site);
  const uid = request.auth.uid;
  const teamSnap = await db.ref(`sites/${site}/referral_team/${uid}`).once('value');
  const team = teamSnap.val() || {};
  const members = Object.keys(team).sort((a, b) => Number(team[a].depth || 1) - Number(team[b].depth || 1) || Number(team[b].joinedAt || 0) - Number(team[a].joinedAt || 0)).slice(0, 30);
  const authors = [uid].concat(members);
  const batches = await Promise.all(authors.map(async (authorUid) => {
    const snap = await db.ref(`sites/${site}/feed_posts`).orderByChild('authorUid').equalTo(authorUid).limitToLast(8).once('value');
    return Object.entries(snap.val() || {}).map(([id, post]) => ({ id, post, teamDepth: authorUid === uid ? 0 : Number(team[authorUid] && team[authorUid].depth || 1) }));
  }));
  return batches.flat().filter((entry) => entry.post && !entry.post.deleted).sort((a, b) => Number(b.post.timestamp || 0) - Number(a.post.timestamp || 0)).slice(0, 100);
});

exports.searchPeople = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Войди, чтобы искать участников.');
  const site = referralSite(request.data && request.data.site);
  const data = request.data || {};
  const sort = data.sort === 'name' ? 'name' : 'lastLogin';
  const queryText = String(data.query || '').trim().toLocaleLowerCase('ru').slice(0, 100);
  const countryText = String(data.country || '').trim().toLocaleLowerCase('ru').slice(0, 80);
  const cityText = String(data.city || '').trim().toLocaleLowerCase('ru').slice(0, 80);
  const pageSize = 50;
  const batchSize = 200;
  const maxBatches = 20;
  let cursor = data.cursor && typeof data.cursor.key === 'string' ? { value: data.cursor.value, key: data.cursor.key } : null;
  let hasMore = true;
  let batches = 0;
  const matches = [];
  while (hasMore && batches < maxBatches && matches.length < pageSize) {
    let ref = db.ref(`sites/${site}/all_users`).orderByChild(sort);
    if (sort === 'lastLogin' && cursor) ref = ref.endAt(cursor.value, cursor.key);
    else if (sort === 'name' && cursor) ref = ref.startAfter(cursor.value, cursor.key);
    const snapshot = await (sort === 'lastLogin' ? ref.limitToLast(batchSize) : ref.limitToFirst(batchSize)).once('value');
    const batchFull = snapshot.numChildren() === batchSize;
    const rows = [];
    snapshot.forEach((child) => rows.push({ uid: child.key, user: child.val() || {} }));
    if (sort === 'lastLogin') {
      rows.reverse();
      if (cursor && rows.length && rows[0].uid === cursor.key) rows.shift();
    }
    batches += 1;
    if (!rows.length) { hasMore = false; break; }
    let stoppedInsideBatch = false;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const user = row.user;
      const details = user.profileDetails || {};
      const name = String(user.name || '').toLocaleLowerCase('ru');
      const country = String(details.country || user.country || '').toLocaleLowerCase('ru');
      const city = String(details.city || user.city || '').toLocaleLowerCase('ru');
      const searchable = [name, country, city, details.profession, details.specialization, details.interests].join(' ').toLocaleLowerCase('ru');
      if (row.uid !== request.auth.uid && (!queryText || searchable.includes(queryText)) && (!countryText || country.includes(countryText)) && (!cityText || city.includes(cityText))) {
        matches.push({
          uid: row.uid,
          user: {
            name: user.name || 'Участник', avatarUrl: user.avatarUrl || '', lastLogin: Number(user.lastLogin || 0),
            profileDetails: { country: details.country || '', city: details.city || '', profession: details.profession || '', specialization: details.specialization || '', interests: details.interests || [] }
          }
        });
      }
      cursor = { key: row.uid, value: sort === 'name' ? String(user.name || '') : Number(user.lastLogin || 0) };
      if (matches.length >= pageSize) { stoppedInsideBatch = index < rows.length - 1; break; }
    }
    hasMore = stoppedInsideBatch || batchFull;
  }
  return { people: matches.slice(0, pageSize), cursor, hasMore, scanned: batches * batchSize };
});

exports.claimReferral = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Сначала войди в аккаунт.');
  const site = referralSite(request.data && request.data.site);
  const uid = request.auth.uid;
  let code = String(request.data && request.data.code || '').trim();
  if (/^[a-f0-9]{12}$/i.test(code)) code = code.toUpperCase();
  if (!/^[A-Za-z0-9_-]{10,128}$/.test(code)) return { claimed: false, reason: 'invalid_code' };
  const authUser = await admin.auth().getUser(uid);
  const createdAt = Date.parse(authUser.metadata.creationTime || '');
  if (!createdAt || Date.now() - createdAt > 7 * 24 * 60 * 60 * 1000) return { claimed: false, reason: 'account_not_new' };
  const codeSnap = await db.ref(`sites/${site}/referral_codes/${code}`).once('value');
  const referrerUid = codeSnap.child('uid').val();
  if (!referrerUid || referrerUid === uid) return { claimed: false, reason: 'invalid_code' };
  const joinedAt = createdAt;
  const attributionRef = db.ref(`sites/${site}/referred_by/${uid}`);
  const attributionTx = await attributionRef.transaction((current) => current || { referrerUid, code, joinedAt });
  const attribution = attributionTx.snapshot.val();
  if (!attribution || attribution.referrerUid !== referrerUid) return { claimed: false, reason: 'already_attributed' };

  const ancestorsSnap = await db.ref(`sites/${site}/referral_ancestors/${referrerUid}`).once('value');
  const ancestors = ancestorsSnap.val() || {};
  const ancestorUids = Object.keys(ancestors).sort((a, b) => Number(ancestors[a]) - Number(ancestors[b])).slice(0, MAX_REFERRAL_ANCESTORS);
  const updates = {};
  updates[`sites/${site}/referrals/${referrerUid}/${uid}`] = { joinedAt };
  updates[`sites/${site}/referral_team/${referrerUid}/${uid}`] = { depth: 1, joinedAt, directReferrerUid: referrerUid };
  updates[`sites/${site}/referral_ancestors/${uid}/${referrerUid}`] = 1;
  ancestorUids.forEach((ancestorUid) => {
    const depth = Number(ancestors[ancestorUid] || 1) + 1;
    updates[`sites/${site}/referral_ancestors/${uid}/${ancestorUid}`] = depth;
    updates[`sites/${site}/referral_team/${ancestorUid}/${uid}`] = { depth, joinedAt, directReferrerUid: referrerUid };
  });
  await db.ref().update(updates);
  logger.info('Referral attributed', { uid, referrerUid, teamAncestors: ancestorUids.length });
  return { claimed: true, referrerUid };
});

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

exports.setProfileLevel = onCall(async (request) => {
  if (!request.auth || !ADMIN_UIDS.has(request.auth.uid)) {
    throw new HttpsError('permission-denied', 'Только администратор может менять уровень.');
  }
  const data = request.data || {};
  const site = String(data.site || '');
  const uid = String(data.uid || '');
  const targetLevel = Number(data.level);
  if (!site || !uid || !Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > MAX_LEVEL) {
    throw new HttpsError('invalid-argument', 'Уровень должен быть целым числом от 1 до 86.');
  }
  const ref = db.ref(`sites/${site}/profile_levels/${uid}`);
  const result = await ref.transaction((current) => {
    const state = current || { experience: 0, posts: 0, comments: 0, activeDays: 0, manualExperience: 0 };
    let required = 0;
    for (let level = 1; level < targetLevel; level += 1) {
      required += Math.round(20 + level * 12 + level * level * 2);
    }
    const earned = Math.max(0, Number(state.posts || 0)) * XP.post +
      Math.max(0, Number(state.comments || 0)) * XP.comment +
      Math.max(0, Number(state.activeDays || 0)) * XP.visit;
    state.manualExperience = required - earned;
    state.experience = required;
    state.level = targetLevel;
    state.updatedAt = Date.now();
    return state;
  });
  const state = result.snapshot.val();
  logger.info('Profile level set', { uid, level: targetLevel, by: request.auth.uid });
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
