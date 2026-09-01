'use client';

import { ArrowUpRight, Check, Copy, Eye, RotateCcw, Share2, Sparkles } from 'lucide-react';
import jsQR from 'jsqr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BloomCanvas, { type RendererStats } from './BloomCanvas';
import {
  BOUQUETS,
  DEFAULT_CONFIG,
  PALETTES,
  createRecipientUrl,
  getBouquet,
  getPalette,
  readBloomConfig,
  type BloomConfig,
  type BouquetId,
} from '@/lib/bloom/config';
import { drawQR, generateQRMatrix, validEventUrl } from '@/lib/bloom/qr';

const MORPH_DURATION = 860;
const EMPTY_STATS: RendererStats = { renderer: 'WebGL / Three.js', sceneObjects: 0, flowerInstances: 0, flowerHeads: 0, qrInstances: 0, fps: 0 };

function BouquetGlyph({ id, color }: { id: BouquetId; color: string }) {
  if (id === 'rose') return <svg viewBox="0 0 48 38" aria-hidden="true"><path d="M24 6c8 0 14 5 14 12 0 10-10 16-14 16S10 28 10 18C10 11 16 6 24 6Z" fill={color} opacity=".24"/><path d="M24 10c6 0 10 4 10 9 0 7-7 11-10 11s-10-4-10-11c0-5 4-9 10-9Z" fill="none" stroke={color} strokeWidth="3"/><path d="M18 20c2-7 12-7 12 0 0 5-8 6-8 1 0-3 4-3 5-1" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (id === 'lily') return <svg viewBox="0 0 48 38" aria-hidden="true"><g fill={color} opacity=".78" transform="translate(24 20)">{Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx="0" cy="-10" rx="4" ry="11" transform={`rotate(${i * 60})`}/>)}</g><circle cx="24" cy="20" r="3" fill="#e5ad35"/></svg>;
  if (id === 'tulip') return <svg viewBox="0 0 48 38" aria-hidden="true"><path d="M14 8c5 1 8 5 10 10 2-5 5-9 10-10 2 14-2 20-10 20S12 22 14 8Z" fill={color}/><path d="M24 27v9M16 36h16" stroke="#526f5b" strokeWidth="2"/></svg>;
  if (id === 'mixed') return <svg viewBox="0 0 48 38" aria-hidden="true"><circle cx="17" cy="18" r="9" fill={color}/><g fill={color} opacity=".72" transform="translate(31 16)">{Array.from({ length: 5 }, (_, i) => <ellipse key={i} cy="-6" rx="3" ry="7" transform={`rotate(${i * 72})`}/>)}</g><path d="M12 31c8-8 17-6 25 0" fill="none" stroke="#526f5b" strokeWidth="3"/></svg>;
  return <svg viewBox="0 0 48 38" aria-hidden="true"><g fill={color}>{[[24,18,9],[17,17,7],[31,17,7],[21,11,6],[27,11,6],[24,24,7]].map(([cx,cy,r], i)=><circle key={i} cx={cx} cy={cy} r={r} opacity={0.46 + i * 0.08}/>)}</g><circle cx="24" cy="18" r="5" fill={color}/></svg>;
}

function PerfectQR({ url, progress, primary, accent, qrRef }: { url: string; progress: number; primary: string; accent: string; qrRef: React.RefObject<HTMLCanvasElement | null> }) {
  useEffect(() => {
    if (qrRef.current) drawQR(qrRef.current, url, 1024, { primary, accent });
  }, [accent, primary, qrRef, url]);
  const opacity = Math.max(0, Math.min(1, (progress - 0.93) / 0.07));
  return <canvas ref={qrRef} className="perfect-qr" style={{ opacity }} aria-label="Scannable QR code for this JAZZHQ Bloom" />;
}

function SceneStage({ config, progress, onToggle, onStats, qrRef, className = '' }: { config: BloomConfig; progress: number; onToggle: () => void; onStats: (stats: RendererStats) => void; qrRef: React.RefObject<HTMLCanvasElement | null>; className?: string }) {
  const palette = getPalette(config.palette);
  return (
    <div className={`bloom-stage ${className}`}>
      <BloomCanvas bouquet={config.bouquet} palette={palette} destinationUrl={config.destinationUrl} progress={progress} interactive onToggle={onToggle} onStats={onStats} />
      <PerfectQR url={config.destinationUrl} progress={progress} primary={palette.qrPrimary} accent={palette.qrAccent} qrRef={qrRef} />
    </div>
  );
}

function DebugPanel({ config, progress, playing, stats, validation, onProgress, onAnimate, onBouquet, onValidate }: { config: BloomConfig; progress: number; playing: boolean; stats: RendererStats; validation: string; onProgress: (value: number) => void; onAnimate: (target: number) => void; onBouquet: (id: BouquetId) => void; onValidate: () => void }) {
  const matrix = generateQRMatrix(config.destinationUrl);
  return (
    <section className="three-debug" aria-label="Three.js development controls">
      <div className="debug-readout">
        <span><b>Renderer</b>{stats.renderer}</span><span><b>Scene objects</b>{stats.sceneObjects}</span><span><b>Bouquet</b>{getBouquet(config.bouquet).name}</span><span><b>Flower instances</b>{stats.flowerInstances}</span><span><b>QR instances</b>{stats.qrInstances}</span><span><b>FPS</b>{stats.fps || '—'}</span>
      </div>
      <label className="morph-range"><span>Morph</span><input type="range" min="0" max="100" value={Math.round(progress * 100)} onChange={(event) => onProgress(Number(event.target.value) / 100)} /><output>{Math.round(progress * 100)}%</output></label>
      <div className="debug-buttons"><button onClick={() => onProgress(0)}>Bouquet</button><button onClick={() => onProgress(0.25)}>25%</button><button onClick={() => onProgress(0.5)}>50%</button><button onClick={() => onProgress(0.75)}>75%</button><button onClick={() => onProgress(1)}>QR</button><button onClick={() => onAnimate(progress > 0.5 ? 0 : 1)}>{playing ? 'Playing…' : 'Reverse'}</button></div>
      <div className="debug-buttons bouquet-debug">{BOUQUETS.map((bouquet) => <button key={bouquet.id} className={config.bouquet === bouquet.id ? 'active' : ''} onClick={() => onBouquet(bouquet.id)}>{bouquet.name}</button>)}</div>
      <div className="debug-validation"><span>{matrix.size} × {matrix.size} matrix</span><button onClick={onValidate}>Validate final QR</button></div>
      {validation && <p className={validation.startsWith('Decoded') ? 'success' : 'error'}>{validation}</p>}
    </section>
  );
}

export default function BloomExperience() {
  const [config, setConfig] = useState<BloomConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<'creator' | 'recipient'>('creator');
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const frame = useRef(0);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [debug, setDebug] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [stats, setStats] = useState<RendererStats>(EMPTY_STATS);
  const [urlError, setUrlError] = useState('');
  const [createdLink, setCreatedLink] = useState('');
  const [copyState, setCopyState] = useState('');
  const [validation, setValidation] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setConfig(readBloomConfig(params));
      setView(params.get('view') === 'recipient' ? 'recipient' : 'creator');
      setDebug(params.get('debug') === 'true');
      updateMotion();
    });
    media.addEventListener('change', updateMotion);
    return () => { active = false; media.removeEventListener('change', updateMotion); };
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const setMorph = useCallback((value: number) => {
    cancelAnimationFrame(frame.current);
    setPlaying(false);
    progressRef.current = value;
    setProgress(value);
    setValidation('');
  }, []);

  const animateTo = (target: number) => {
    cancelAnimationFrame(frame.current);
    if (reducedMotion) { setMorph(target); return; }
    const from = progressRef.current;
    const start = performance.now();
    const duration = Math.max(180, MORPH_DURATION * Math.abs(target - from));
    setPlaying(true);
    const tick = (now: number) => {
      const linear = Math.min(1, (now - start) / duration);
      const eased = linear < 0.5 ? 4 * linear * linear * linear : 1 - Math.pow(-2 * linear + 2, 3) / 2;
      const value = from + (target - from) * eased;
      progressRef.current = value;
      setProgress(value);
      if (linear < 1) frame.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const toggleMorph = () => {
    if (!playing) animateTo(progressRef.current > 0.5 ? 0 : 1);
  };

  const handleStats = useCallback((next: RendererStats) => setStats(next), []);

  const updateConfig = <K extends keyof BloomConfig>(key: K, value: BloomConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setCreatedLink('');
    setCopyState('');
    if (key === 'bouquet' || key === 'palette') setMorph(0);
  };

  const createBloom = () => {
    const normalized = validEventUrl(config.destinationUrl.trim());
    if (!normalized) { setUrlError('Enter a complete http or https URL.'); return; }
    const completeConfig = { ...config, destinationUrl: normalized, to: config.to.trim() || 'Someone special', from: config.from.trim() || 'Someone' };
    setConfig(completeConfig);
    setUrlError('');
    setCreatedLink(createRecipientUrl(completeConfig, window.location));
  };

  const copyLink = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopyState('Copied');
  };

  const shareBloom = async () => {
    if (!createdLink) return;
    const text = `A JAZZHQ Bloom from ${config.from || 'someone special'} 🌸`;
    if (navigator.share) await navigator.share({ title: `A JAZZHQ Bloom for ${config.to}`, text, url: createdLink });
    else await copyLink();
  };

  const validateQR = () => {
    setMorph(1);
    requestAnimationFrame(() => {
      const canvas = qrRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(image.data, image.width, image.height);
      setValidation(decoded?.data === config.destinationUrl ? `Decoded successfully: ${decoded.data}` : 'The final QR did not decode.');
    });
  };

  const palette = useMemo(() => getPalette(config.palette), [config.palette]);
  const complete = progress >= 0.995;

  return (
    <main className={view === 'recipient' ? 'recipient-page' : 'creator-page'}>
      {view === 'creator' ? (
        <>
          <header className="creator-header"><div><strong>JAZZHQ Bloom</strong><span>Turn any link into a bloom</span></div><span className="renderer-chip">Three.js · interactive</span></header>
          <div className="creator-shell">
            <aside className="creator-panel">
              <div className="panel-heading"><span>01 / Create</span><h1>Create your<br />JAZZHQ Bloom</h1><p>Shape a living bouquet around any link, then send it to someone special.</p></div>
              <div className="form-grid">
                <label className="field field-wide"><span>Destination URL</span><input type="url" value={config.destinationUrl} onChange={(event) => updateConfig('destinationUrl', event.target.value)} placeholder="https://example.com" />{urlError && <small className="error">{urlError}</small>}</label>
                <label className="field"><span>To</span><input value={config.to} maxLength={60} onChange={(event) => updateConfig('to', event.target.value)} /></label>
                <label className="field"><span>From</span><input value={config.from} maxLength={60} onChange={(event) => updateConfig('from', event.target.value)} /></label>
                <label className="field field-wide"><span>Message <em>optional</em></span><input value={config.message} maxLength={140} onChange={(event) => updateConfig('message', event.target.value)} placeholder="See you there" /></label>
              </div>
              <fieldset className="picker"><legend>Bouquet</legend><div className="bouquet-options">{BOUQUETS.map((bouquet) => <button type="button" key={bouquet.id} className={config.bouquet === bouquet.id ? 'selected' : ''} onClick={() => updateConfig('bouquet', bouquet.id)} aria-pressed={config.bouquet === bouquet.id}><span className="bouquet-thumb"><BouquetGlyph id={bouquet.id} color={palette.flowerPrimary} /></span><span>{bouquet.name}</span></button>)}</div></fieldset>
              <fieldset className="picker"><legend>Color</legend><div className="palette-options">{PALETTES.map((option) => <button type="button" key={option.id} className={config.palette === option.id ? 'selected' : ''} onClick={() => updateConfig('palette', option.id)} aria-label={option.name} aria-pressed={config.palette === option.id}><span style={{ background: `linear-gradient(135deg, ${option.flowerSecondary} 0 48%, ${option.flowerPrimary} 49% 72%, ${option.flowerAccent} 73%)` }} /><small>{option.name}</small></button>)}</div></fieldset>
              <button className="primary-create" onClick={createBloom}><Sparkles size={16} />Create JAZZHQ Bloom</button>
              {createdLink && <div className="ready-card"><div><Check size={15} /><span>Your JAZZHQ Bloom is ready</span></div><p>{createdLink}</p><div><button onClick={copyLink}><Copy size={14} />{copyState || 'Copy link'}</button><button onClick={shareBloom}><Share2 size={14} />Share</button><button onClick={() => window.open(createdLink, '_blank', 'noopener,noreferrer')}><Eye size={14} />Preview</button></div></div>}
            </aside>
            <section className="creator-preview" aria-label="Live Three.js bouquet preview">
              <div className="preview-meta"><div><span>Live bouquet</span><strong>{getBouquet(config.bouquet).name} · {palette.name}</strong></div><span>Drag to rotate</span></div>
              <SceneStage config={config} progress={progress} onToggle={toggleMorph} onStats={handleStats} qrRef={qrRef} className="creator-scene" />
              <div className="preview-controls"><button className={complete ? 'active' : ''} onClick={() => animateTo(complete ? 0 : 1)}>{complete ? <><RotateCcw size={14}/>Gather bouquet</> : <>Preview QR<ArrowUpRight size={14}/></>}</button><span>↔ Drag to explore in 3D</span></div>
            </section>
          </div>
        </>
      ) : (
        <section className="recipient-experience">
          <div className="recipient-brand">JAZZHQ Bloom</div>
          <div className="recipient-personal"><span>For {config.to}</span><small>from {config.from}</small>{config.message && <p>{config.message}</p>}</div>
          <SceneStage config={config} progress={progress} onToggle={toggleMorph} onStats={handleStats} qrRef={qrRef} className="recipient-scene" />
          <div className="recipient-actions" aria-live="polite">
            {!complete ? <><span>↔ Drag to explore</span><button onClick={() => animateTo(1)} disabled={playing}>{playing ? 'Opening your bloom…' : 'Tap to reveal'}<ArrowUpRight size={14}/></button></> : <><strong>{config.to}&apos;s bloom</strong><span>Scan or tap to open</span><a href={config.destinationUrl} target="_blank" rel="noopener noreferrer">Open link <ArrowUpRight size={14}/></a><button className="gather" onClick={() => animateTo(0)}><RotateCcw size={13}/>Gather bouquet</button></>}
          </div>
        </section>
      )}
      {debug && <DebugPanel config={config} progress={progress} playing={playing} stats={stats} validation={validation} onProgress={setMorph} onAnimate={animateTo} onBouquet={(id) => updateConfig('bouquet', id)} onValidate={validateQR} />}
    </main>
  );
}
