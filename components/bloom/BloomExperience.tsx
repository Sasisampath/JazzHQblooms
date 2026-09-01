'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, RotateCcw, Download, Play, Pause, Check, Layers2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { BloomRenderer, DURATION } from '@/lib/bloom/renderer';
import { DEFAULT_URL, drawQR, generateQRMatrix, validEventUrl } from '@/lib/bloom/qr';
import jsQR from 'jsqr';

export default function BloomExperience() {
 const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<BloomRenderer|null>(null),frame=useRef(0),current=useRef(0),clock=useRef(0);
 const [progress,setProgress]=useState(0),[ready,setReady]=useState(false),[playing,setPlaying]=useState(false),[debug,setDebug]=useState(false),[overlay,setOverlay]=useState(false),[opacity,setOpacity]=useState(40),[compare,setCompare]=useState(true),[slow,setSlow]=useState(false),[url,setUrl]=useState(DEFAULT_URL),[input,setInput]=useState(DEFAULT_URL),[error,setError]=useState(''),[validation,setValidation]=useState(''),[fragments,setFragments]=useState(0),[reduced,setReduced]=useState(false),[gpuError,setGpuError]=useState('');
 const complete=progress>=.999;
 const qrSize=generateQRMatrix(url).size;
 useEffect(()=>{const q=new URLSearchParams(window.location.search);setDebug(q.get('debug')==='true'||q.get('reference')==='true');setOverlay(q.get('reference')==='true');const initial=q.get('url');if(initial&&validEventUrl(initial)){setUrl(initial);setInput(initial);}const m=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(m.matches);change();m.addEventListener('change',change);return()=>m.removeEventListener('change',change);},[]);
 useEffect(()=>{setReady(false);let disposed=false;const image=new Image();image.onload=()=>{if(disposed||!canvas.current)return;try{engine.current=new BloomRenderer(canvas.current,image,url);engine.current.draw(current.current);setFragments(engine.current.fragmentCount);setReady(true);}catch(e){setGpuError(e instanceof Error?e.message:'The animation could not load.');setReady(true);}};image.onerror=()=>{setGpuError('The bouquet could not load. You can still reveal the QR.');setReady(true);};image.src='/reference/bouquet.jpg';return()=>{disposed=true;cancelAnimationFrame(frame.current);engine.current?.dispose();engine.current=null;};},[url]);
 const draw=(p:number)=>{current.current=p;engine.current?.draw(p);setProgress(p);};
 const seek=(p:number)=>{cancelAnimationFrame(frame.current);setPlaying(false);draw(p);setValidation('');};
 const animate=(target:number)=>{cancelAnimationFrame(frame.current);setValidation('');if(reduced||gpuError){seek(target);return;}const from=current.current;clock.current=performance.now();setPlaying(true);const duration=DURATION*(slow?4:1)*Math.abs(target-from);const tick=(time:number)=>{const t=duration?Math.min(1,(time-clock.current)/duration):1;draw(from+(target-from)*t);if(t<1)frame.current=requestAnimationFrame(tick);else setPlaying(false);};frame.current=requestAnimationFrame(tick);};
 const setEvent=()=>{const next=validEventUrl(input.trim());if(!next){setError('Use a complete http or https URL, up to 700 characters.');return;}setError('');seek(0);setUrl(next);const loc=new URL(window.location.href);loc.searchParams.set('url',next);window.history.replaceState({},'',loc);};
 const download=()=>{const c=drawQR(document.createElement('canvas'),url);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='bloom-invite-qr.png';a.click();};
 const validate=()=>{seek(1);requestAnimationFrame(()=>{const out=document.createElement('canvas');if(gpuError){drawQR(out,url);}else{out.width=canvas.current!.width;out.height=canvas.current!.height;out.getContext('2d')!.drawImage(canvas.current!,0,0);}const image=out.getContext('2d')!.getImageData(0,0,out.width,out.height);const result=jsQR(image.data,image.width,image.height);setValidation(result?.data===url?`Decoded from the rendered QR: ${result.data}`:'The rendered QR did not decode. Try the downloaded QR or Open event.');});};
 const refIndex=Math.max(1,Math.min(11,Math.round(progress*10)+1));
 const refSrc=progress===0?'/reference/bouquet.jpg':`/reference/key-${String(refIndex).padStart(2,'0')}.jpg`;
 const phase=progress===0?'Bouquet':progress<.2?'First movement':progress<.4?'Floral breakup':progress<.62?'Finder emergence':progress<.88?'Grid lock':'Settled QR';
 return <main className={`experience ${debug?'study':''}`}>
  {debug&&<div className="study-heading"><span>JAZZHQ Bloom</span><span>Reference recreation · motion study</span></div>}
  <div className="personal"><span>For Monu</span><small>from Sasi</small></div>
  <div className={`stages ${debug&&compare?'comparison':''}`}>
   <div className="stage-wrap">
    {debug&&<div className="stage-caption"><span>Implementation</span><span>{phase}</span></div>}
    <div className="stage">
     {!ready&&<img className="loading-bouquet" src="/reference/bouquet.jpg" alt="Your magenta bouquet"/>}
     {gpuError&&<img src={complete?undefined:'/reference/bouquet.jpg'} className={complete?'hidden':''} alt="Your magenta bouquet"/>}
     <canvas ref={canvas} className={gpuError?'hidden':''} aria-label={complete?'Scannable QR code for your event':'Magenta bouquet transforming into an event QR'} role="img"/>
     {gpuError&&complete&&<FallbackQR url={url}/>}
     {overlay&&<img className="reference-overlay" src={refSrc} style={{opacity:opacity/100}} alt="Reference frame overlay"/>}
     <button className="stage-hit" aria-label={complete?'Gather the bouquet':ready?'Transform bouquet into QR':'Loading bouquet'} disabled={!ready||playing} onClick={()=>animate(complete?0:1)}/>
    </div>
   </div>
   {debug&&compare&&<div className="stage-wrap reference-view"><div className="stage-caption"><span>Supplied reference</span><span>{progress===0?'First frame':`${(1.05+progress*.55).toFixed(2)} s`}</span></div><div className="stage"><img src={refSrc} alt={`Reference at ${Math.round(progress*100)} percent of the first reveal`}/></div></div>}
  </div>
  <div className="experience-actions" aria-live="polite">
   {!complete?<Button variant="ghost" className="tap" onClick={()=>animate(1)} disabled={!ready||playing}>{playing?'Opening your bloom…':'Tap your bloom'}{!playing&&<ArrowUpRight size={14}/>}</Button>:<><div className="event-name">{url===DEFAULT_URL?'Unwind — Chennai':'Your invitation'}</div><p className="scan-hint">Scan to open the invitation</p><a className="open-event" href={url} target="_blank" rel="noopener noreferrer">Open event <ArrowUpRight size={14}/></a><div className="secondary-actions"><Button variant="ghost" onClick={()=>animate(0)} className="quiet"><RotateCcw size={13}/>Replay bloom</Button><Button variant="ghost" onClick={download} className="quiet"><Download size={13}/>Save QR</Button></div></>}
   {gpuError&&<p className="error" role="status">{gpuError}</p>}
   {reduced&&<p className="subtle">Reduced motion is on. Your bloom reveals instantly.</p>}
  </div>
  {debug&&<section className="debug-panel" aria-label="Animation development controls">
   <div className="progress-heading"><label id="morph-label">Morph Progress</label><output>{Math.round(progress*100)}%</output></div>
   <Slider aria-labelledby="morph-label" value={[Math.round(progress*100)]} min={0} max={100} step={1} onValueChange={v=>seek((Array.isArray(v)?v[0]:v)/100)}/>
   <div className="keyframes">{Array.from({length:11},(_,i)=><Button variant="ghost" aria-pressed={Math.round(progress*10)===i} className={Math.round(progress*10)===i?'selected':''} key={i} onClick={()=>seek(i/10)}>{i*10}%</Button>)}</div>
   <div className="control-row"><Button variant="outline" onClick={()=>playing?seek(current.current):animate(complete?0:1)}>{playing?<Pause/>:<Play/>}{playing?'Pause':complete?'Reverse':'Play'}</Button><Button variant="ghost" onClick={()=>seek(0)}><RotateCcw/>Reset</Button><label className="toggle"><input type="checkbox" checked={slow} onChange={e=>setSlow(e.target.checked)}/>¼ speed</label><label className="toggle"><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/>Side by side</label><Button variant={overlay?'secondary':'ghost'} onClick={()=>setOverlay(!overlay)} aria-pressed={overlay}><Layers2/>Overlay</Button></div>
   {overlay&&<div className="overlay-control"><label id="opacity-label">Reference opacity <output>{opacity}%</output></label><Slider aria-labelledby="opacity-label" value={[opacity]} min={0} max={100} step={1} onValueChange={v=>setOpacity(Array.isArray(v)?v[0]:v)}/></div>}
   <div className="event-control"><label htmlFor="event-url">QR destination</label><div><Input id="event-url" type="url" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')setEvent();}}/><Button variant="outline" onClick={setEvent}>Apply</Button></div>{error&&<p className="error" role="alert">{error}</p>}</div>
   <div className="validation-row"><span>{fragments.toLocaleString()} fragments · {qrSize} × {qrSize} QR · 550 ms</span><Button variant="ghost" onClick={validate}><ScanLine/>Validate QR</Button></div>
   {validation&&<p className="validation" role="status"><Check size={14}/>{validation}</p>}
   <details className="implementation-notes"><summary>Reference measurements & limitations</summary><p>First reveal: initial hold 0–1.05 s; vase/grid movement 1.05–1.15 s; flower breakup 1.15–1.25 s; finder recognition 1.25–1.35 s; final lock approximately 1.55–1.60 s. The player maps 0–100% to 1.05–1.60 s. The 0% overlay uses the exact opening frame.</p><p>The bouquet uses thousands of independently animated texture fragments extracted from the supplied video, including its vase, foliage and shadow. It is not a 3D reconstruction. Source flower sway, petal rotation in depth and exact occlusion cannot be recovered from one camera view; this implementation uses deterministic clustered paths with a rising, flattening QR plane. The midpoint is an approximation, not a pixel-exact recreation. QR geometry changes with the destination. A full QR image is never faded over the bouquet.</p><p>The attached polygonal flower images are alternate species references; they are not substituted into the video’s magenta bouquet. Creator, style variants and sharing are deferred while this recreation is reviewed. No code from the ZIP is redistributed.</p></details>
  </section>}
 </main>;
}
function FallbackQR({url}:{url:string}) {const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{if(ref.current)drawQR(ref.current,url);},[url]);return <canvas className="fallback-qr" ref={ref} role="img" aria-label="Scannable event QR code"/>;}
