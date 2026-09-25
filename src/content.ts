export type Audience = 'friend' | 'elder' | 'teacher';
export type Gift = { audience: Audience; recipient: string; sender: string; message: string; track: number };
export const audiences: Audience[] = ['friend', 'elder', 'teacher'];
export const themes = {
  friend: { label: '朋友', english: 'TO A DEAR FRIEND', tag: '山水有相逢，心意常相伴', title: ['山河远阔，', '心意同圆。'], subtitle: ['有些牵挂，不必常常说起。', '借今晚的月色，送你一段好时光。'], poem: '但愿人长久，千里共婵娟。', poemAuthor: '苏轼《水调歌头》', opening: '亲爱的', message: '日子匆匆，别忘了给自己留一点慢下来的时光。\n\n愿这一轮月，照见你的欢喜，也安放你的疲惫；愿这一段旋律，陪你放下忙碌，听一听心里的宁静。\n\n不论相隔多远，总有一份惦念如约而至。中秋快乐，愿你所行皆坦途，所遇皆温柔。', short: '愿月光照见欢喜，愿你所遇皆温柔。', thanks: '好朋友，就该分享好时光。', track: 0 },
  elder: { label: '前辈', english: 'WITH RESPECT & WARMTH', tag: '岁月有回响，感念长在心', title: ['月映千山，', '敬祝安康。'], subtitle: ['一路承蒙关照，心中常怀感念。', '以一轮明月、一曲清音，遥寄祝福。'], poem: '海上生明月，天涯共此时。', poemAuthor: '张九龄《望月怀远》', opening: '敬爱的', message: '承蒙您一路以来的提携与关照，这份心意，始终记在心间。\n\n中秋月圆，愿您暂歇忙碌，泡一壶清茶，听一曲舒缓的音乐，让身心自在，让时光从容。\n\n愿您往后的日子，平安喜乐，家人常伴；所念皆如愿，四季皆安康。谨借这一轮明月，敬送最诚挚的祝福。', short: '愿您四季安康，身心自在，家人常伴。', thanks: '把一份敬意，化作长久的惦念。', track: 1 },
  teacher: { label: '师长', english: 'TO THE ONE WHO GUIDED ME', tag: '一程师恩，一生铭记', title: ['桃李不言，', '月满师恩。'], subtitle: ['您曾照亮来路，也温暖了岁月。', '今夜，愿这份温柔也能陪伴您。'], poem: '春华秋实，桃李芬芳。', poemAuthor: '一份敬意，一声感谢', opening: '敬爱的', message: '有些话，走过很多年才更懂；有些恩情，越长大越觉得珍贵。感谢您曾经的耐心与指引，让我有勇气走向更远的地方。\n\n又是一年月圆时，愿您放下案头的忙碌，在轻柔的旋律里，享一刻属于自己的清闲。\n\n愿您岁岁安康，眉目舒展；桃李满园，喜乐常伴。中秋快乐，师恩长记。', short: '愿您桃李满园，岁岁安康，喜乐常伴。', thanks: '让心中的感谢，被温柔地听见。', track: 2 },
};
export const stories = {
  friend: {
    memoryTitle: '有你在，平凡日子也会发光。',
    memory: ['想起我们说过的那些话，走过的那些路，连寻常的一天也有了值得收藏的光亮。', '生活常常催着人向前。今晚，就借这轮月亮说一句：很高兴，我们一直是朋友。'],
    wishes: [
      ['愿你自在', '想做的事慢慢去做，想去的地方终会抵达。'],
      ['愿你被爱', '奔忙的日子里，也有人认真听你说话。'],
      ['愿你常欢', '月亮照过的每个夜晚，都有安心与好梦。'],
    ],
    ritualTitle: '给自己三分钟，好好歇一歇。',
    ritual: ['抬头看看今晚的月色，让肩膀慢慢放松。', '把呼吸放慢一点，让音乐替你接住心事。', '在心里念一个名字，也记得把温柔留给自己。'],
    ritualNote: '这段时光，属于你。',
  },
  elder: {
    memoryTitle: '那些照拂，始终记在心里。',
    memory: ['许多珍贵的关照，当时只觉得寻常，后来才懂得其中的分量。', '您走过的路、给予的指点，都成为我前行时温暖而笃定的力量。借着中秋的月色，向您道一声感谢。'],
    wishes: [
      ['愿您安康', '四时有序，起居从容，身边常有欢声笑语。'],
      ['愿您舒心', '繁忙之外，总有一盏清茶和一段自在时光。'],
      ['愿您团圆', '所念之人常在身旁，佳节年年皆有好景。'],
    ],
    ritualTitle: '这一刻，请为自己留些清闲。',
    ritual: ['放下手边的忙碌，找一个舒服的位置坐下。', '听一段轻柔的旋律，看看窗外的月色。', '想起一件近来的小欢喜，让笑意慢慢浮上心头。'],
    ritualNote: '愿岁月温柔，愿您从容。',
  },
  teacher: {
    memoryTitle: '您点亮的，不止一段来路。',
    memory: ['从前不懂的叮咛，在很久以后，成了做选择时的一份勇气。', '一方讲台，一片真心。您的耐心与教诲，早已悄悄留在我们后来的人生里。'],
    wishes: [
      ['愿您安康', '忙碌有尽时，身心常舒展，岁岁都平安。'],
      ['愿您喜乐', '案头有花，窗前有月，日子里多些悠闲。'],
      ['愿您欣慰', '春风化雨终有回响，桃李芬芳遍四方。'],
    ],
    ritualTitle: '今夜，请把时间还给自己。',
    ritual: ['暂时合上书卷与工作，给自己一段安静时光。', '随着旋律缓缓呼吸，让肩头的疲惫轻轻落下。', '看看这轮圆月，愿所有牵挂都得到温柔回应。'],
    ritualNote: '师恩如月，长照心间。',
  },
} as const;
export const tracks = [
  { title: '此刻，休憩', original: 'Rest Now', artist: 'Eugenio Mininni · 空灵轻音', mood: '放下忙碌', duration: 300, url: '/audio/rest-now.mp3', color: '#798772' },
  { title: '静心时光', original: 'Meditation', artist: 'Arulo · 冥想轻音', mood: '静心小憩', duration: 118, url: '/audio/meditation.mp3', color: '#84939a' },
  { title: '宁静片刻', original: 'Serene Moments', artist: 'Ahjay Stelino · 舒缓轻音', mood: '温柔相伴', duration: 119, url: '/audio/serene-moments.mp3', color: '#ad9170' },
];
export function freshGift(audience: Audience = 'friend'): Gift {
  return { audience, recipient: '', sender: '', message: '', track: themes[audience].track };
}
export function normalizeGift(value: unknown): Gift {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const audience = audiences.includes(v.audience as Audience) ? v.audience as Audience : 'friend';
  const str = (key: string, max: number) => typeof v[key] === 'string' ? (v[key] as string).trim().slice(0, max) : '';
  return { audience, recipient: str('recipient', 16), sender: str('sender', 16), message: str('message', 240), track: Number.isInteger(v.track) && Number(v.track) >= 0 && Number(v.track) < tracks.length ? Number(v.track) : themes[audience].track };
}
export function readGift(): { gift: Gift; received: boolean; invalid: boolean } {
  const audience = new URLSearchParams(location.search).get('to') as Audience;
  const fallback = freshGift(audiences.includes(audience) ? audience : 'friend');
  const raw = new URLSearchParams(location.hash.slice(1)).get('gift');
  if (!raw) return { gift: fallback, received: false, invalid: false };
  try {
    if (raw.length > 6000) throw new Error('too long');
    const json = new TextDecoder().decode(Uint8Array.from(atob(raw.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
    const gift = normalizeGift(JSON.parse(json));
    if (audiences.includes(audience) && gift.audience !== audience) {
      gift.audience = audience;
      gift.track = themes[audience].track;
    }
    return { gift, received: true, invalid: false };
  } catch { return { gift: fallback, received: false, invalid: true }; }
}
export function giftUrl(gift: Gift): string {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizeGift(gift)));
  const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${location.origin}${location.pathname}?to=${gift.audience}#gift=${encoded}`;
}
export const formatTime = (seconds: number) => `${Math.floor((seconds || 0) / 60).toString().padStart(2, '0')}:${Math.floor((seconds || 0) % 60).toString().padStart(2, '0')}`;
