import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, ArrowLeft, Check, Copy, Download, Hand, Headphones, Mail, Moon, Music2, Pause, PenLine, Play, RotateCcw, Volume2, VolumeX, X, Timer, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';
import { themes, stories, tracks, freshGift, readGift, giftUrl, formatTime } from './content';
import type { Gift } from './content';
import { trackCardEvent } from './analytics';

const initial = readGift();
const STEPS = ['月下相逢', '心中有你', '一纸祝福', '三句祝愿', '片刻静好', '一曲清音', '再寄心意'];

export default function App() {
  const [gift, setGift] = useState<Gift>(initial.gift);
  const [received, setReceived] = useState(initial.received);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(tracks[initial.gift.track].duration);
  const [volume, setVolume] = useState(.65);
  const [timer, setTimer] = useState(0);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [maker, setMaker] = useState(false);
  const [shareGift, setShareGift] = useState<Gift | null>(null);
  const [toast, setToast] = useState(initial.invalid ? '这张卡片的链接不完整，先送你一份默认祝福。' : '');
  const audio = useRef<HTMLAudioElement>(null);
  const touch = useRef<{ x: number; y: number; top: number; max: number } | null>(null);
  const playId = useRef(0);
  const autoplayStarted = useRef(false);
  const currentTrack = useRef(gift.track);
  const stageRef = useRef<HTMLElement>(null);
  const theme = themes[gift.audience];
  const story = stories[gift.audience];
  const track = tracks[gift.track];

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  useEffect(() => {
    if (!timer) return;
    const t = setTimeout(() => { audio.current?.pause(); setTimer(0); setToast('音乐已轻轻停下，愿你有个好梦。'); }, timer * 60000);
    return () => clearTimeout(t);
  }, [timer]);
  useEffect(() => {
    if (initial.received) void trackCardEvent('opened', initial.gift);
    const sync = () => { const data = readGift(); setGift(data.gift); setReceived(data.received); setPage(0); audio.current?.pause(); if (data.received) void trackCardEvent('opened', data.gift); };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    if (currentTrack.current !== gift.track || !audio.current?.getAttribute('src')) { playId.current++; audio.current?.pause(); setElapsed(0); setDuration(tracks[gift.track].duration); setPlaying(false); setLoading(false); currentTrack.current = gift.track; if (audio.current) audio.current.src = tracks[gift.track].url; }
  }, [gift.track]);
  useEffect(() => {
    if (autoplayStarted.current) return;
    autoplayStarted.current = true;
    const el = audio.current;
    if (!el) return;
    el.src = tracks[gift.track].url;
    el.play().catch(() => setNeedsGesture(true));
  }, []);
  useEffect(() => {
    if (!needsGesture) return;
    const resume = () => {
      const el = audio.current;
      if (el?.paused) el.play().then(() => setNeedsGesture(false)).catch(() => {});
    };
    document.addEventListener('pointerdown', resume, { capture: true });
    document.addEventListener('keydown', resume, { capture: true });
    return () => { document.removeEventListener('pointerdown', resume, true); document.removeEventListener('keydown', resume, true); };
  }, [needsGesture]);
  useEffect(() => { document.title = gift.recipient ? `${gift.recipient}，有一份音乐祝福送给你 · 月下寄心意` : `月下寄心意 · 致${theme.label}`; }, [gift.recipient, theme.label]);
  useEffect(() => {
    const stage = stageRef.current;
    const content = stage?.querySelector<HTMLElement>('.card-content');
    if (!stage || !content) return;
    const update = () => {
      setIsOverflowing(content.scrollHeight - stage.clientHeight > 15);
      setHasMore(content.scrollHeight - stage.scrollTop - stage.clientHeight > 15);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    observer.observe(content);
    return () => observer.disconnect();
  }, [page, gift]);

  function navigate(next: number) {
    setPage(Math.max(0, Math.min(STEPS.length - 1, next)));
    stageRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }
  async function togglePlay() {
    const el = audio.current;
    if (!el) return;
    if (playing || loading) { playId.current++; el.pause(); setLoading(false); return; }
    const id = ++playId.current;
    setLoading(true);
    try { await el.play(); if (id !== playId.current) el.pause(); }
    catch (error) { if (id === playId.current && (error as Error).name !== 'AbortError') setToast('音乐暂时没有连接上，请再点一次播放。'); }
    finally { if (id === playId.current) setLoading(false); }
  }
  async function selectTrack(index: number) {
    if (gift.track === index) { void togglePlay(); return; }
    const el = audio.current;
    const id = ++playId.current;
    currentTrack.current = index;
    el?.pause(); setElapsed(0); setDuration(tracks[index].duration);
    setGift(prev => ({ ...prev, track: index }));
    if (!el) return;
    el.src = tracks[index].url;
    setLoading(true);
    try { await el.play(); if (id !== playId.current) el.pause(); }
    catch (error) { if (id === playId.current && (error as Error).name !== 'AbortError') setToast('音乐暂时没有连接上，请再点一次播放。'); }
    finally { if (id === playId.current) setLoading(false); }
  }
  function openMaker() { setMaker(true); }

  return <div className={`app theme-${gift.audience}`}>
    <header className="site-header">
      <a className="wordmark" href={`?to=${gift.audience}`} aria-label={`回到致${theme.label}首页`}><span className="brand-moon"><Moon size={21} strokeWidth={1.2}/></span><span>月下寄心意<small>MOONLIT WISHES</small></span></a>
      <p className="header-thought">以月为笺，以乐寄情</p>
      <button className="header-create" onClick={openMaker}><PenLine size={16}/><span className="create-pointer" aria-hidden="true">➜</span><span>写一张心意卡</span><ArrowUpRight size={15}/></button><button className={`mobile-music-toggle ${playing ? 'is-playing' : ''}`} onClick={togglePlay} aria-label={playing ? '暂停背景音乐' : '聆听背景音乐'}>{playing ? <Pause size={14}/> : <Music2 size={14}/>}</button>
    </header>

    <main className="main-content">
      <div className="collection-topline"><span className="tiny-star">✧</span><span>中秋特别心意</span><span className="topline-rule"/><span className="collection-en">A LITTLE MOMENT OF PEACE</span></div>
      {received ? <div className="received-label"><Mail size={15}/>{gift.sender || '一位惦念你的人'}，为你寄来一份心意</div> : <div className="single-audience">一份专属于<span>{theme.label}</span>的中秋心意</div>}

      <section ref={stageRef} className={`card-stage page-${page} ${isOverflowing ? 'is-overflowing' : ''}`} aria-label={STEPS[page]} tabIndex={0} onScroll={() => { const stage = stageRef.current; const content = stage?.querySelector<HTMLElement>('.card-content'); if (stage && content) setHasMore(content.scrollHeight - stage.scrollTop - stage.clientHeight > 15); }}
        onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(page + 1); if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate(page - 1); }}
        onTouchStart={e => { const stage = stageRef.current; touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, top: stage?.scrollTop || 0, max: Math.max(0, (stage?.scrollHeight || 0) - (stage?.clientHeight || 0)) }; }}
        onTouchEnd={e => { const start = touch.current; touch.current = null; if (!start || (e.target as HTMLElement).closest('button,input,textarea,a')) return; const dx = e.changedTouches[0].clientX - start.x; const dy = e.changedTouches[0].clientY - start.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { navigate(page + (dx < 0 ? 1 : -1)); return; } if (Math.abs(dy) > 75 && Math.abs(dy) > Math.abs(dx) * 1.3 && (start.max <= 5 || dy > 0 && start.top < 5 || dy < 0 && start.top >= start.max - 5)) navigate(page + (dy < 0 ? 1 : -1)); }}>
        <div className="scene-image" aria-hidden="true"/>
        <div className="stage-frame" aria-hidden="true"><i/><i/><i/><i/></div>
        <span className="side-poem" aria-hidden="true">月 是 故 乡 明 · 人 是 心 上 人</span>
        <div className="card-content" key={`${page}-${gift.audience}`}>
          {page === 0 && <div className="cover-layout">
            <div className="cover-copy">
              <div className="eyebrow"><span/> {theme.english}</div>
              <div className="recipient-line">致 <span>{gift.recipient || theme.label}</span><span className="small-seal">秋安</span></div>
              <h1>{theme.title[0]}<br/>{theme.title[1]}</h1>
              <p className="cover-description">{theme.subtitle[0]}<br/>{theme.subtitle[1]}</p>
              <button className="primary-button" onClick={() => navigate(1)}>拆开这份心意<ArrowRight size={18}/></button>
              <div className="cover-footnote"><Headphones size={13}/><span>一段音乐，让心慢下来</span></div>
              {needsGesture && <button className="sound-invite" onClick={() => { void audio.current?.play(); }}><Music2 size={14}/>轻触画面，开启音乐</button>}
            </div>
            <div className="cover-poem"><span>{theme.poem}</span><small>— {theme.poemAuthor}</small></div>
            <div className="round-seal" aria-hidden="true"><span>月圆</span><span>人安</span></div>
          </div>}
          {page === 1 && <div className="story-layout">
            <div className="eyebrow"><span/> THE MOMENTS WE REMEMBER</div>
            <span className="story-ornament">✦</span>
            <h2>{story.memoryTitle}</h2>
            {story.memory.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            <div className="story-line"/><small>月色很长，惦念也很长。</small>
            <button className="text-button" onClick={() => navigate(2)}>读一封写给你的信 <ArrowRight size={17}/></button>
          </div>}
          {page === 2 && <div className="letter-layout">
            <div className="eyebrow"><span/> A LETTER IN THE MOONLIGHT</div>
            <h2>有些心意，<br className="mobile-break"/>想说给你听。</h2>
            <div className="letter-salutation">{theme.opening}{gift.recipient || theme.label}：</div>
            <div className="letter-body">{gift.message || theme.message}</div>
            <div className="letter-signature"><span>愿人长久，月常圆</span><strong>{gift.sender || '一位惦念你的人'} <small>敬赠</small></strong></div>
            <button className="text-button" onClick={() => navigate(3)}>再收下三句祝愿 <ArrowRight size={17}/></button>
          </div>}
          {page === 3 && <div className="wishes-layout">
            <div className="eyebrow"><span/> THREE WISHES FOR YOU</div>
            <h2>愿你与美好，<br/>如约相逢。</h2>
            <div className="wish-list">{story.wishes.map(([title, copy], i) => <div className="wish-item" key={title}><span>0{i + 1}</span><div><h3>{title}</h3><p>{copy}</p></div><Moon size={24} strokeWidth={1}/></div>)}</div>
            <button className="text-button" onClick={() => navigate(4)}>把祝福放进今晚的月光 <ArrowRight size={17}/></button>
          </div>}
          {page === 4 && <div className="ritual-layout">
            <div className="ritual-moon"><Moon size={49} strokeWidth={.8}/></div>
            <div className="eyebrow"><span/> A MOMENT TO SLOW DOWN</div>
            <h2>{story.ritualTitle}</h2>
            <div className="ritual-steps">{story.ritual.map((line, i) => <div key={line}><span>0{i + 1}</span><p>{line}</p></div>)}</div>
            <p className="ritual-note">{story.ritualNote}</p>
            <button className="text-button" onClick={() => navigate(5)}>让音乐陪你一会儿 <ArrowRight size={17}/></button>
          </div>}
          {page === 5 && <div className="music-layout">
            <div className="music-intro"><div className="eyebrow"><span/> A MELODY JUST FOR YOU</div><h2>今夜，<br/>把时间留给自己。</h2><p>不必赶路，不必思量。<br/>听一曲清音，享片刻安宁。</p><div className={`vinyl ${playing ? 'is-playing' : ''}`}><div className="vinyl-center"><span>月下</span><span>清音</span></div></div><span className="music-note"><Headphones size={13}/>轻柔音量，聆听更舒适</span></div>
            <div className="track-list"><div className="track-list-heading"><span>为你选的静好时光</span><small>03 首轻音乐</small></div>{tracks.map((t, i) => <button key={t.title} className={`track-row ${gift.track === i ? 'selected' : ''}`} onClick={() => selectTrack(i)} aria-label={`${gift.track === i && playing ? '暂停' : gift.track === i ? '播放' : '选择'}${t.title}`}><span className="track-number">0{i + 1}</span><span className="track-art" style={{ backgroundColor: t.color }}><Music2 size={19}/></span><span className="track-details"><strong>{t.title}</strong><small>{t.original} · {t.artist}</small></span><span className="track-end"><small>{t.mood}</small>{gift.track === i && playing ? <Pause size={18}/> : <Play size={17}/>}</span></button>)}<p className="list-footer">让旋律轻轻流淌，也让心事慢慢放下。</p><a className="music-credit" href="/music-credits.html" target="_blank" rel="noreferrer">音乐来源与作者 <ArrowUpRight size={11}/></a><button className="text-button" onClick={() => navigate(6)}>把这份温柔，传给下一个人 <ArrowRight size={17}/></button></div>
          </div>}
          {page === 6 && <div className="ending-layout"><div className="ending-moon"><Moon size={36} strokeWidth={.8}/><span/></div><div className="eyebrow">GOOD WISHES ARE MEANT TO BE SHARED</div><h2>月光所至，<br/>皆是牵挂。</h2><p>{theme.thanks}<br/>也为你心里的人，写一张音乐祝福卡吧。</p><button className="primary-button" onClick={openMaker}><PenLine size={17}/>我也制作一张 <ArrowRight size={18}/></button><span className="ending-note">写下名字 · 选一段音乐 · 寄一份心意</span></div>}
        </div>
        <div className="card-page-number"><span>0{page + 1}</span> / 0{STEPS.length}</div>
        {hasMore && <div className="scroll-cue" aria-hidden="true">上滑继续阅读 <span>↓</span></div>}
      </section>

      <nav className="page-navigation" aria-label="卡片翻页"><button className="nav-arrow" disabled={page === 0} onClick={() => navigate(page - 1)} aria-label="上一页"><ArrowLeft size={18}/></button><div className="page-steps">{STEPS.map((s, i) => <button key={s} className={page === i ? 'active' : ''} aria-label={`第${i + 1}页：${s}`} aria-current={page === i ? 'step' : undefined} onClick={() => navigate(i)}><span className="step-dot"/><span className="step-label">{s}</span></button>)}</div><button className="nav-arrow nav-next" onClick={() => page === STEPS.length - 1 ? openMaker() : navigate(page + 1)} aria-label={page === STEPS.length - 1 ? '制作我的卡片' : '下一页'}><span className="nav-next-label">{page === STEPS.length - 1 ? '制作卡片' : '下一页'}</span><ArrowRight size={18}/></button></nav>

      <div className={`audio-player ${playing ? 'playing' : ''}`}>
        <button className="album-thumb" onClick={() => navigate(5)} aria-label="打开音乐列表"><Music2 size={23}/></button>
        <div className="player-track"><strong>{track.title}<span className="playing-bars" aria-hidden="true"><i/><i/><i/><i/></span></strong><small>{track.artist}</small></div>
        <button className="play-button" onClick={togglePlay} aria-label={playing ? '暂停音乐' : loading ? '取消加载' : '播放音乐'}>{loading ? <span className="loader"/> : playing ? <Pause size={17} fill="currentColor"/> : <Play size={17} fill="currentColor"/>}</button>
        <div className="progress-wrap"><span>{formatTime(elapsed)}</span><input type="range" aria-label="播放进度" min="0" max={duration || 132} step="0.1" value={elapsed} style={{ '--progress': `${elapsed / (duration || 132) * 100}%` } as React.CSSProperties} onChange={e => { if (audio.current && Number.isFinite(audio.current.duration)) audio.current.currentTime = Number(e.target.value); }}/><span>{formatTime(duration || track.duration)}</span></div>
        <div className="player-controls"><div className="popover-anchor volume-control"><button className="icon-button" onClick={() => { setVolumeOpen(!volumeOpen); setTimerOpen(false); }} aria-label="调整音量" aria-expanded={volumeOpen}>{volume === 0 ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>{volumeOpen && <div className="player-popover volume-popover"><label htmlFor="volume">音量 {Math.round(volume * 100)}%</label><input id="volume" type="range" min="0" max="1" step=".05" value={volume} onChange={e => setVolume(Number(e.target.value))}/></div>}</div><div className="popover-anchor"><button className={`timer-button ${timer ? 'timer-active' : ''}`} onClick={() => { setTimerOpen(!timerOpen); setVolumeOpen(false); }} aria-expanded={timerOpen} aria-label="定时关闭"><Timer size={17}/><span>{timer ? `${timer} 分钟` : '定时'}</span></button>{timerOpen && <div className="player-popover timer-popover"><strong>让音乐陪你一会儿</strong>{[0, 15, 30, 60].map(n => <button key={n} onClick={() => { setTimer(n); setTimerOpen(false); setToast(n ? `音乐将在 ${n} 分钟后停止。` : '已关闭定时，音乐将循环播放。'); }}>{n ? `${n} 分钟后停止` : '不设定时'}{timer === n && <Check size={14}/>}</button>)}</div>}</div></div>
      </div>
      <p className="below-player"><span>✧</span>{playing ? '此刻，只需要好好享受音乐' : '轻点播放，让这一刻慢下来'}<span>✧</span></p>
    </main>
    <footer className="site-footer"><span>愿每一份心意，都被温柔听见。</span><span>由 <strong>岩火AI教育</strong> 温暖支持</span></footer>
    <audio ref={audio} preload="auto" loop onTimeUpdate={e => setElapsed(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration)} onPlay={() => { setPlaying(true); setNeedsGesture(false); }} onPause={() => setPlaying(false)} onError={() => { setLoading(false); setPlaying(false); }}/>
    {maker && <Maker current={gift} onClose={() => setMaker(false)} onCreate={value => { void trackCardEvent('created', value); setShareGift(value); setGift(value); setPage(0); setReceived(true); history.replaceState(null, '', giftUrl(value)); setMaker(false); try { localStorage.setItem('moonlit-draft', JSON.stringify(value)); } catch { /* Optional draft storage. */ } }}/>} 
    {shareGift && <ShareDialog gift={shareGift} onClose={() => setShareGift(null)} notify={setToast}/>}
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
  </div>;
}

function Dialog({ children, onClose, title, className = '' }: { children: React.ReactNode; onClose: () => void; title: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,a[href],[tabindex="0"]') || []).filter(el => el.getClientRects().length);
        const first = elements[0]; const last = elements[elements.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handler); old?.focus(); };
  }, []);
  return <div className="dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className={`dialog ${className}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}><button className="dialog-close icon-button" onClick={onClose} aria-label="关闭"><X size={22}/></button>{children}</div></div>;
}

function Maker({ current, onClose, onCreate }: { current: Gift; onClose: () => void; onCreate: (gift: Gift) => void }) {
  const [draft, setDraft] = useState<Gift>({ ...freshGift(current.audience), sender: '', track: current.track });
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const theme = themes[draft.audience];
  const update = <K extends keyof Gift>(key: K, value: Gift[K]) => setDraft(d => ({ ...d, [key]: value }));
  const suggestions = [theme.short, '月圆是团圆的模样，惦念是最暖的陪伴。愿你心有所安，岁岁皆欢喜。', '把忙碌交给昨天，把宁静留给今夜。愿一曲轻音伴你，愿一轮明月照你，愿生活温柔待你。'];
  async function generateBlessing() {
    setGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/blessings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: draft.audience }),
      });
      const result = await response.json() as { message?: unknown; error?: unknown };
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '暂时无法生成祝福，请稍后重试。');
      if (typeof result.message !== 'string' || !result.message.trim()) throw new Error('DeepSeek 暂时没有写好，请稍后重试。');
      update('message', result.message.trim().slice(0, 240));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '网络暂时不稳定，请稍后重试。');
    } finally {
      setGenerating(false);
    }
  }
  return <Dialog onClose={onClose} title="制作音乐心意卡" className="maker-dialog"><div className="maker-intro"><div className="eyebrow"><span/> MAKE IT PERSONAL</div><h2>把你的心意，<br/>写进月光里。</h2><p>简单几笔，就是一份独一无二的祝福。</p><div className={`mini-card theme-${draft.audience}`}><span>一份专属心意</span><h3>致 {draft.recipient || theme.label}</h3><p>{draft.message || theme.short}</p><div className="mini-moon"/><small>{draft.sender || '你的名字'} 敬赠</small></div><span className="maker-preview-label">你的卡片预览</span></div><form className="maker-form" onSubmit={e => { e.preventDefault(); if (!draft.recipient.trim()) { setError('请写下收件人的名字或称呼。'); return; } if (!draft.sender.trim()) { setError('请留下你的署名，让对方知道你的心意。'); return; } onCreate({ ...draft, recipient: draft.recipient.trim(), sender: draft.sender.trim(), message: draft.message.trim() }); }}><fieldset className="maker-audience-choice"><legend>这张卡片送给谁？</legend><div className="maker-audience-options">{(['friend', 'elder', 'teacher'] as const).map(audience => <button type="button" key={audience} className={draft.audience === audience ? 'active' : ''} aria-pressed={draft.audience === audience} onClick={() => { setDraft(d => ({ ...d, audience, track: themes[audience].track })); setSuggestion(0); }}><span>{audience === 'friend' ? '朋友' : audience === 'elder' ? '长辈' : '师长'}</span></button>)}</div></fieldset><div className="maker-audience-note">已选择送给{draft.audience === 'elder' ? '长辈' : theme.label} · 可填写名字和专属祝福</div><div className="form-names"><label>对方的名字或称呼<input maxLength={16} placeholder="例如：王老师" value={draft.recipient} onChange={e => { update('recipient', e.target.value); setError(''); }} required/></label><label>你的署名<input maxLength={16} placeholder="例如：小林" value={draft.sender} onChange={e => { update('sender', e.target.value); setError(''); }} required/></label></div><label className="message-label"><span>想对 TA 说的话 <small>选填</small></span><textarea rows={4} maxLength={240} placeholder={theme.short} value={draft.message} onChange={e => update('message', e.target.value)}/></label><div className="message-actions"><div className="message-action-buttons"><button type="button" onClick={() => { update('message', suggestions[suggestion % suggestions.length]); setSuggestion(s => s + 1); }}><RotateCcw size={13}/>换一句范例</button><button type="button" className="deepseek-button" onClick={() => void generateBlessing()} disabled={generating}><Sparkles size={14}/>{generating ? 'DeepSeek 正在写…' : 'DeepSeek 帮我写'}</button></div><small>{draft.message.length}/240</small></div><label>选一首相伴的音乐<select value={draft.track} onChange={e => update('track', Number(e.target.value))}>{tracks.map((t, i) => <option key={t.title} value={i}>{t.title} · {t.mood}</option>)}</select></label>{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="primary-button"><Sparkles size={17}/>生成我的心意卡<ArrowRight size={18}/></button><p className="form-note">无需登录；仅发送祝福对象类别，不会上传姓名或你已写的内容。</p></form></Dialog>;
}

function ShareDialog({ gift, onClose, notify }: { gift: Gift; onClose: () => void; notify: (text: string) => void }) {
  const [qr, setQr] = useState('');
  const [poster, setPoster] = useState('');
  const [busy, setBusy] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const url = giftUrl(gift);
  const theme = themes[gift.audience];
  useEffect(() => { QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: '#344b3e', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setQr).catch(() => notify('二维码生成失败，可以先复制链接分享。')); }, [url]);
  async function copyLink() {
    try { await navigator.clipboard.writeText(url); void trackCardEvent('share_copy', gift); notify('链接已复制，去微信发给牵挂的人吧。'); }
    catch { setManualCopy(true); }
  }
  async function makePoster() {
    setBusy(true);
    try { const png = await renderPoster(gift, qr); setPoster(png); void trackCardEvent('share_poster', gift); }
    catch { notify('海报暂时没生成成功，请重试或先分享链接。'); }
    finally { setBusy(false); }
  }
  return <Dialog onClose={onClose} title="分享音乐心意卡" className="share-dialog">{poster ? <><h2>把心意，送到朋友手中。</h2><p>长按图片，分享这份心意。</p><img className="exported-poster" src={poster} alt={`送给${gift.recipient || theme.label}的音乐祝福海报，含可扫码打开卡片的二维码`}/><div className="poster-share-tip"><Hand size={17}/><span>长按图片分享给朋友<br/><small>若菜单中只有“保存图片”，保存后可在聊天中发送</small></span></div><button className="text-button" onClick={() => setPoster('')}><ArrowLeft size={15}/>返回分享</button></> : <><div className="share-mark"><Check size={27}/></div><div className="eyebrow">SEALED WITH A LITTLE MOONLIGHT</div><h2>你的心意，准备好了。</h2><p>送给 <strong>{gift.recipient || theme.label}</strong> 的这一份温柔，<br/>现在就可以出发。</p><div className="share-preview"><span className="share-preview-moon"><Moon size={26}/></span><div><strong>{theme.title.join('')}</strong><small>{gift.sender || '一位惦念你的人'} 敬赠 · {tracks[gift.track].title}</small></div>{qr ? <img src={qr} alt="扫码打开这张音乐祝福卡"/> : <span className="loader"/>}</div><div className="wechat-share-guide"><span className="wechat-menu-dots">···</span><span>点击右上角「···」<br/><strong>分享给微信好友</strong></span><ArrowUpRight size={18}/></div><div className="share-secondary"><button className="poster-action" onClick={makePoster} disabled={busy || !qr}><Download size={19}/><span><strong>{busy ? '正在制作海报…' : '制作心意海报'}</strong><small>生成图片后，长按即可分享给朋友</small></span><ArrowRight size={17}/></button><button className="copy-share-link" onClick={copyLink}><Copy size={15}/>复制卡片链接</button></div>{manualCopy && <label className="manual-copy">长按复制下方链接<input readOnly value={url} onFocus={e => e.target.select()}/></label>}<p className="share-help">{['localhost', '127.0.0.1'].includes(location.hostname) && <>当前为本机预览，公开发布后即可分享给朋友。<br/></>}分享后会以祝福卡链接和封面图展示，不会发送图片附件。<br/>收到的人也能继续制作自己的祝福。</p></>}</Dialog>;
}

async function renderPoster(gift: Gift, qr: string): Promise<string> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1600;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
  const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
  const [landscape, code] = await Promise.all([loadImage('/assets/moon-landscape.jpg'), loadImage(qr)]);
  const theme = themes[gift.audience];
  ctx.fillStyle = '#f5f2e9'; ctx.fillRect(0, 0, 1080, 1600);
  ctx.drawImage(landscape, 0, 0, 1080, 720);
  const fade = ctx.createLinearGradient(0, 430, 0, 745); fade.addColorStop(0, '#f5f2e900'); fade.addColorStop(1, '#f5f2e9'); ctx.fillStyle = fade; ctx.fillRect(0, 430, 1080, 320);
  ctx.strokeStyle = '#b9ab8c'; ctx.lineWidth = 2; ctx.strokeRect(36, 36, 1008, 1528);
  ctx.textAlign = 'center'; ctx.fillStyle = '#4d6251'; ctx.font = '32px "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif'; ctx.fillText('月 下 寄 心 意', 540, 110);
  ctx.font = '38px "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif'; ctx.fillText(`致 ${gift.recipient || theme.label}`, 540, 580);
  ctx.font = '68px "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif'; ctx.fillStyle = '#354d3e'; ctx.fillText(theme.title.join(''), 540, 675, 930);
  ctx.font = '31px "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif'; ctx.fillStyle = '#5d655b';
  const text = gift.message || theme.short;
  const lines: string[] = []; let line = '';
  for (const char of text) { if (char === '\n') { lines.push(line); line = ''; } else if (ctx.measureText(line + char).width > 820) { lines.push(line); line = char; } else line += char; }
  if (line) lines.push(line);
  const visible = lines.slice(0, 6); if (lines.length > 6) visible[5] = visible[5].slice(0, -1) + '…';
  visible.forEach((l, i) => ctx.fillText(l, 540, 760 + i * 50));
  ctx.font = '28px "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif'; ctx.fillText(`— ${gift.sender || '一位惦念你的人'} 敬赠`, 540, 1110);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(code, 400, 1130, 280, 280);
  ctx.fillStyle = '#354d3e'; ctx.font = '27px "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif'; ctx.fillText('长按识别 · 听一曲温柔的祝福', 540, 1445);
  ctx.fillStyle = '#85877b'; ctx.font = '22px sans-serif'; ctx.fillText('由 岩火AI教育 温暖支持', 540, 1515);
  return canvas.toDataURL('image/png');
}
