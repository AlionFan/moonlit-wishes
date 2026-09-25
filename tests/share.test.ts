import test from 'node:test';
import assert from 'node:assert/strict';
import { freshGift, giftUrl, readGift, normalizeGift } from '../src/content.ts';
function setUrl(url: string) { Object.defineProperty(globalThis, 'location', { value: new URL(url), configurable: true }); }
test('Chinese names, emoji, line breaks and punctuation survive a shared URL', () => {
 setUrl('https://example.com/');
 const gift={...freshGift('teacher'),recipient:'王老师🌙',sender:'小林',message:'祝您中秋快乐！\n感谢 & 惦念 # 团圆 / 安康',track:2};
 const url=giftUrl(gift); setUrl(url);
 assert.deepEqual(readGift(),{gift,received:true,invalid:false});
 assert.equal(new URL(url).searchParams.get('to'),'teacher');
 assert.ok(!new URL(url).search.includes('王老师'));
});
test('All three direct card entries restore the correct theme', () => {
 for(const type of ['friend','elder','teacher'] as const){setUrl(`https://example.com/?to=${type}`);assert.equal(readGift().gift.audience,type);assert.equal(readGift().received,false);}
});
test('Broken or oversized shared links safely fall back', () => {
 for(const fragment of ['%%%','x'.repeat(6001)]){setUrl(`https://example.com/?to=elder#gift=${fragment}`);const value=readGift();assert.equal(value.invalid,true);assert.equal(value.received,false);assert.equal(value.gift.audience,'elder');}
});
test('Untrusted shared data cannot set arbitrary tracks or non-text fields', () => {
 assert.deepEqual(normalizeGift({audience:'unknown',recipient:{x:1},sender:42,track:99,message:null}),freshGift('friend'));
 const data=normalizeGift({audience:'elder',recipient:' 王老师 ',sender:'x'.repeat(100),message:'安'.repeat(300),track:1});
 assert.equal(data.recipient,'王老师');assert.equal(data.sender.length,16);assert.equal(data.message.length,240);assert.equal(data.track,1);
});
test('Full-length custom blessings can be shared without a backend', () => {
 setUrl('https://example.com/'); const gift={...freshGift('elder'),recipient:'祝'.repeat(16),sender:'安'.repeat(16),message:'愿'.repeat(240)};
 setUrl(giftUrl(gift));assert.deepEqual(readGift().gift,gift);
});
test('A shared fragment cannot switch to a different card audience', () => {
 setUrl('https://example.com/');
 const friendGift={...freshGift('friend'),recipient:'阿明',sender:'小林'};
 const fragment=new URL(giftUrl(friendGift)).hash;
 setUrl(`https://example.com/?to=teacher${fragment}`);
 const restored=readGift();
 assert.equal(restored.gift.audience,'teacher');
 assert.equal(restored.gift.track,2);
 assert.equal(restored.gift.recipient,'阿明');
});
