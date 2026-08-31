import { generateQRMatrix, isFinder } from './qr';
// Original implementation. The supplied demo repository is not copied or ported.
// One progress value drives every textured fragment, grid subdivision and reverse.
export const WIDTH = 560, HEIGHT = 640, DURATION = 550;
const VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec2 corner;
layout(location=1) in vec4 source;
layout(location=2) in vec4 target;
layout(location=3) in vec4 motion;
layout(location=4) in vec3 color;
uniform float progress;
out vec2 uv;
out float geometric;
out vec3 ink;
out float visibility;
float ss(float a,float b,float x){return smoothstep(a,b,x);}
void main(){
 float p=progress;
 float local=ss(motion.x,motion.y,p);
 float shape=ss(motion.x+.09,motion.y+.05,p);
 vec2 cluster=floor(source.xy/28.)*28.+14.;
 float compact=1.-.11*ss(0.,.22,p)*(1.-ss(.24,.6,p));
 vec2 bouquet=vec2(280.,276.)+(cluster-vec2(280.,276.))*compact;
 bouquet+=(source.xy-cluster)*mix(1.,.9,ss(0.,.25,p));
 bouquet.y-=10.*ss(0.,.24,p)*(1.-local);
 float plane=ss(.02,.38,p);
 float angle=mix(-.15,0.,ss(.06,.65,p));
 vec2 qr=target.xy-vec2(280.,338.);
 qr.y*=mix(.24,1.,plane);
 qr=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*qr;
 qr+=vec2(280.,mix(562.,338.,plane));
 vec2 pos=mix(bouquet,qr,local);
 float arc=sin(local*3.14159265)*(1.-ss(.72,.96,p));
 pos+=vec2(motion.z*14.,motion.w*11.)*arc;
 float rotation=motion.z*.34*arc;
 vec2 size=mix(source.zw,target.zw,shape);
 if(color.b>color.r) size*=mix(1.,mix(.12,1.,ss(.12,.56,p)),local);
 vec2 v=corner*size;
 v=mat2(cos(rotation),sin(rotation),-sin(rotation),cos(rotation))*v;
 gl_Position=vec4((pos.x+v.x)/560.*2.-1.,1.-(pos.y+v.y)/640.*2.,0.,1.);
 uv=(source.xy+corner*source.zw)/vec2(560.,640.);
 geometric=color.b>color.r?ss(.02,.21,p):ss(motion.x+.035,motion.y+.025,p);
 ink=color;visibility=1.;
}`;
const FRAGMENT=`#version 300 es
precision highp float;
uniform sampler2D atlas;
in vec2 uv;
in float geometric;
in vec3 ink;
in float visibility;
out vec4 outputColor;
void main(){
 vec4 tex=texture(atlas,uv);
 float light=min(min(tex.r,tex.g),tex.b);
 float alpha=mix(1.-smoothstep(.90,.997,light),1.,geometric);
 outputColor=vec4(mix(tex.rgb,ink,geometric),alpha*visibility);
}`;
function noise(n:number){ const v=Math.sin(n*127.1+311.7)*43758.5453123;return v-Math.floor(v); }
type Piece={x:number;y:number;w:number;h:number;blue:boolean;group:number};
type Target={x:number;y:number;w:number;h:number;finder:boolean};
function shader(gl:WebGL2RenderingContext,type:number,source:string){ const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader error');return s; }
export class BloomRenderer {
  private gl:WebGL2RenderingContext; private program:WebGLProgram; private buffer:WebGLBuffer; private texture:WebGLTexture; private vao:WebGLVertexArrayObject; private uniform:WebGLUniformLocation|null; private quad:WebGLBuffer; private count=0; private image:HTMLImageElement; private progress=0; private disposed=false; private pieces:Piece[]=[]; private resize:ResizeObserver;
  constructor(private canvas:HTMLCanvasElement, image:HTMLImageElement, url:string){
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:true}); if(!gl)throw new Error('WebGL2 is unavailable. You can still open or download the QR.'); this.gl=gl;this.image=image;
    this.program=gl.createProgram()!; const vs=shader(gl,gl.VERTEX_SHADER,VERTEX),fs=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program)||'Link error');gl.useProgram(this.program);
    this.vao=gl.createVertexArray()!;gl.bindVertexArray(this.vao);
    this.quad=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,.5,-.5,-.5,.5,-.5,.5,.5,-.5,.5,.5]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer); const stride=15*4;
    for(let i=1;i<=4;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,i===4?3:4,gl.FLOAT,false,stride,(i-1)*16);gl.vertexAttribDivisor(i,1);}
    this.texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);this.uniform=gl.getUniformLocation(this.program,'progress');
    const sampler=document.createElement('canvas');sampler.width=WIDTH;sampler.height=HEIGHT;const ctx=sampler.getContext('2d')!;ctx.drawImage(image,0,0,WIDTH,HEIGHT);const pixels=ctx.getImageData(0,0,WIDTH,HEIGHT).data;
    // Six-pixel texture patches retain the exact flower distribution; adjacent
    // patches share a release time, so flowers detach as coherent local groups.
    for(let y=0;y<HEIGHT;y+=6)for(let x=0;x<WIDTH;x+=6){if(x>=546&&y<330)continue;let visible=false,blue=0;for(let yy=y;yy<Math.min(y+6,HEIGHT);yy++)for(let xx=x;xx<Math.min(x+6,WIDTH);xx++){const i=(yy*WIDTH+xx)*4;if(Math.min(pixels[i],pixels[i+1],pixels[i+2])<245){visible=true;if(pixels[i+2]>pixels[i]+12)blue++;}}if(visible)this.pieces.push({x:x+3,y:y+3,w:Math.min(6,WIDTH-x),h:Math.min(6,HEIGHT-y),blue:blue>8,group:Math.floor(x/28)+Math.floor(y/28)*21});}
    this.setUrl(url);this.resize=new ResizeObserver(()=>this.draw(this.progress));this.resize.observe(canvas);
  }
  get fragmentCount(){return this.count;}
  setUrl(url:string){
    const gl=this.gl,{size,data}=generateQRMatrix(url),unit=500/size,left=30,top=338-size*unit/2;
    const targets:Target[]=[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(data[y*size+x])targets.push({x:left+(x+.5)*unit,y:top+(y+.5)*unit,w:unit+.04,h:unit+.04,finder:isFinder(x,y,size)});
    // Balance texture fragments and QR submodules without leaving any dark cell
    // unassigned. Additional pieces share a destination and settle identically.
    const pieces=[...this.pieces];while(pieces.length<targets.length)pieces.push(this.pieces[Math.floor(noise(pieces.length)*this.pieces.length)]);
    const free=new Set(pieces.map((_,i)=>i)), assignments=new Map<number,number>();
    const targetOrder=targets.map((t,j)=>({t,j})).sort((a,b)=>Number(b.t.finder)-Number(a.t.finder));
    for(const {t,j} of targetOrder){let best=-1,score=Infinity;for(const i of free){const p=pieces[i];const d=(p.x-t.x)**2+(p.y-t.y)**2+(t.finder&&!p.blue?300000:0);if(d<score){score=d;best=i;}}assignments.set(best,j);free.delete(best);}
    for(const i of free){const p=pieces[i];let best=0,score=Infinity;for(let j=0;j<targets.length;j++){const t=targets[j];const d=(p.x-t.x)**2+(p.y-t.y)**2+(!p.blue&&t.finder?150000:0);if(d<score){score=d;best=j;}}assignments.set(i,best);}
    const attrs:number[]=[];pieces.forEach((p,i)=>{const t=targets[assignments.get(i)!],r=noise(p.group),vase=p.y>456;
      const tail=r>.72;
      const start=t.finder?.005:vase?.045:tail?.22:.115+r*.035;
      const end=t.finder?.265:vase?.31:tail?.70+r*.12:.32+r*.07;
      attrs.push(p.x,p.y,p.w,p.h,t.x,t.y,t.w,t.h,start,end,noise(p.group+7)*2-1,noise(p.group+81)*2-1,...(t.finder?[38/255,60/255,128/255]:[101/255,29/255,61/255]));
    });
    this.count=pieces.length;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(attrs),gl.STATIC_DRAW);this.draw(this.progress);
  }
  draw(progress:number){if(this.disposed)return;this.progress=progress;const gl=this.gl;const ratio=Math.min(window.devicePixelRatio||1,2);const w=Math.max(1,Math.round(this.canvas.clientWidth*ratio)),h=Math.max(1,Math.round(this.canvas.clientHeight*ratio));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}gl.viewport(0,0,w,h);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1f(this.uniform,progress);gl.drawArraysInstanced(gl.TRIANGLES,0,6,this.count);}
  dispose(){this.disposed=true;this.resize?.disconnect();this.gl.deleteTexture(this.texture);this.gl.deleteBuffer(this.buffer);this.gl.deleteBuffer(this.quad);this.gl.deleteVertexArray(this.vao);this.gl.deleteProgram(this.program);}
}
