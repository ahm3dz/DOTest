/* =========================================================
   DOTest — GPU shaders   © Ahmed Al-Zahrani
   Scenes (WebGL):
     mandelbulb — rainbow 3D Mandelbulb fractal (default)
     menger     — Menger-sponge fractal
   Compute (WebGPU): FMA kernel for raw TFLOPS
   Add a new scene: add a fragment here + an entry in DOT.config.scenes
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.shaders = {
  vertex: 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}',

  /* Shared header: every scene receives the same uniforms */
  header: [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;uniform int uIter;uniform float uK;',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}'
  ].join('\n'),

  scenes: {
    /* ---------- Rainbow Mandelbulb (power 8) ---------- */
    mandelbulb: [
      'vec4 trap;',
      'float de(vec3 p){',
      '  vec3 z=p;float dr=1.0;float r=0.0;',
      '  trap=vec4(abs(z),dot(z,z));',
      '  for(int i=0;i<10;i++){',
      '    r=length(z);',
      '    if(r>2.0)break;',
      '    float th=acos(clamp(z.z/max(r,1e-6),-1.0,1.0))*8.0;',
      '    float ph=atan(z.y,z.x)*8.0;',
      '    float r7=r*r*r;r7=r7*r7*r;',
      '    dr=r7*8.0*dr+1.0;',
      '    z=r7*r*vec3(sin(th)*cos(ph),sin(th)*sin(ph),cos(th))+p;',
      '    trap=min(trap,vec4(abs(z),dot(z,z)));',
      '  }',
      '  return 0.5*log(max(r,1e-6))*r/dr;',
      '}',
      'vec3 nrm(vec3 p){vec2 k=vec2(1.0,-1.0);float h=0.0006;',
      '  return normalize(k.xyy*de(p+k.xyy*h)+k.yyx*de(p+k.yyx*h)+k.yxy*de(p+k.yxy*h)+k.xxx*de(p+k.xxx*h));}',
      'void main(){',
      '  vec2 uv=(gl_FragCoord.xy*2.0-uRes)/min(uRes.x,uRes.y);',
      '  float t=uTime*0.22;',
      '  vec3 ro=vec3(0.0,0.0,2.55);',
      '  ro.yz*=rot(0.5*sin(t*0.8)+0.25);ro.xz*=rot(t);',
      '  vec3 ww=normalize(-ro);vec3 uu=normalize(cross(ww,vec3(0.0,1.0,0.0)));vec3 vv=cross(uu,ww);',
      '  vec3 rd=normalize(uv.x*uu+uv.y*vv+1.8*ww);',
      '  vec3 col=vec3(0.0);',
      '  float b=dot(ro,rd),c=dot(ro,ro)-1.44,h=b*b-c;',
      '  float st=0.0,tt=0.0;bool hit=false;',
      '  if(h>0.0){',
      '    float sh=sqrt(h);tt=max(0.0,-b-sh);float tmax=-b+sh;',
      '    for(int i=0;i<1024;i++){',
      '      if(i>=uIter)break;',
      '      float d=de(ro+rd*tt);st+=1.0;',
      '      if(d<0.0005*tt||d<0.00015){hit=true;break;}',
      '      tt+=d;if(tt>tmax)break;',
      '    }',
      '  }',
      '  if(hit){',
      '    vec3 p=ro+rd*tt;de(p);vec4 tr=trap;vec3 n=nrm(p);',
      '    float hue=0.2+length(p)*1.7+sqrt(tr.w)*0.9+uTime*0.03;',
      '    vec3 base=clamp(abs(mod(hue*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);',
      '    base=base*base*(3.0-2.0*base);',
      '    vec3 l=normalize(vec3(0.5,0.75,0.6));',
      '    float dif=clamp(dot(n,l),0.0,1.0);',
      '    float amb=0.45+0.55*clamp(0.5+0.5*n.y,0.0,1.0);',
      '    float ao=clamp(pow(tr.w,0.25)*1.15,0.0,1.0)*clamp(1.0-st/float(uIter)*0.8,0.2,1.0);',
      '    float sp=pow(clamp(dot(reflect(rd,n),l),0.0,1.0),28.0);',
      '    float fr=pow(1.0-clamp(dot(-rd,n),0.0,1.0),3.0);',
      '    col=base*(0.3*amb+0.95*dif)*(0.25+0.75*ao)+sp*0.45+base*fr*0.5;',
      '  }',
      '  col=pow(clamp(col,0.0,1.0),vec3(0.4545));',
      '  gl_FragColor=vec4(col/uK,1.0/uK);',
      '}'
    ].join('\n'),

    /* ---------- Menger sponge ---------- */
    menger: [
      'float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}',
      'float de(vec3 p){',
      '  float d=sdBox(p,vec3(1.0));float s=1.0;',
      '  for(int m=0;m<4;m++){',
      '    vec3 a=mod(p*s,2.0)-1.0;s*=3.0;',
      '    vec3 r=abs(1.0-3.0*abs(a));',
      '    float da=max(r.x,r.y),db=max(r.y,r.z),dc=max(r.z,r.x);',
      '    float c=(min(da,min(db,dc))-1.0)/s;d=max(d,c);',
      '  }',
      '  return d;',
      '}',
      'vec3 nrm(vec3 p){vec2 e=vec2(0.0008,0.0);return normalize(vec3(de(p+e.xyy)-de(p-e.xyy),de(p+e.yxy)-de(p-e.yxy),de(p+e.yyx)-de(p-e.yyx)));}',
      'void main(){',
      '  vec2 uv=(gl_FragCoord.xy*2.0-uRes)/min(uRes.x,uRes.y);',
      '  float t=uTime*0.32;',
      '  vec3 ro=vec3(0.0,0.0,2.7);',
      '  ro.yz*=rot(0.45*sin(t*0.6)+0.3);ro.xz*=rot(t);',
      '  vec3 ww=normalize(-ro);vec3 uu=normalize(cross(ww,vec3(0.0,1.0,0.0)));vec3 vv=cross(uu,ww);',
      '  vec3 rd=normalize(uv.x*uu+uv.y*vv+1.5*ww);',
      '  float tt=0.0,st=0.0;bool hit=false;',
      '  for(int i=0;i<1024;i++){',
      '    if(i>=uIter)break;',
      '    float d=de(ro+rd*tt);st+=1.0;',
      '    if(d<0.0004*tt){hit=true;break;}',
      '    tt+=d*0.85;',
      '    if(tt>9.0)break;',
      '  }',
      '  float g=st/float(uIter);',
      '  vec3 col=mix(vec3(0.02,0.02,0.07),vec3(0.09,0.02,0.16),uv.y*0.5+0.5);',
      '  if(hit){',
      '    vec3 p=ro+rd*tt;vec3 n=nrm(p);',
      '    vec3 l=normalize(vec3(0.6,0.8,0.5));',
      '    float dif=max(dot(n,l),0.0);',
      '    float ao=clamp(1.0-g*1.6,0.0,1.0);',
      '    vec3 base=0.55+0.45*cos(vec3(0.0,2.1,4.2)+p.y*1.8+p.x*0.6+uTime*0.6);',
      '    float sp=pow(max(dot(n,normalize(l-rd)),0.0),40.0);',
      '    col=base*(0.12+0.88*dif)*(0.35+0.65*ao)+sp*0.7;',
      '    col=mix(col,vec3(0.0,0.9,1.0),0.12);',
      '  }',
      '  col+=vec3(0.0,0.75,1.0)*g*g*0.55+vec3(0.66,0.33,0.97)*g*0.12;',
      '  col=pow(clamp(col,0.0,1.0),vec3(0.4545));',
      '  gl_FragColor=vec4(col/uK,1.0/uK);',
      '}'
    ].join('\n')
  },

  fragment: function (scene) {
    return DOT.shaders.header + '\n' + (DOT.shaders.scenes[scene] || DOT.shaders.scenes.mandelbulb);
  },

  /* WebGPU compute: 8 independent vec4 FMA chains → 64 FLOPs per loop iteration */
  compute: function (iters) {
    return [
      '@group(0) @binding(0) var<storage, read_write> o: array<f32>;',
      '@compute @workgroup_size(256)',
      'fn main(@builtin(global_invocation_id) id: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {',
      '  let gid = id.x + id.y * nw.x * 256u;',
      '  let s = f32(gid & 1023u) * 0.0001;',
      '  var x0 = vec4<f32>(s, s + 0.1, s + 0.2, s + 0.3);',
      '  var x1 = x0 + 0.01; var x2 = x0 + 0.02; var x3 = x0 + 0.03;',
      '  var x4 = x0 + 0.04; var x5 = x0 + 0.05; var x6 = x0 + 0.06; var x7 = x0 + 0.07;',
      '  let m = vec4<f32>(0.9999, 0.99991, 0.99992, 0.99993);',
      '  let c = vec4<f32>(0.0001);',
      '  for (var i = 0u; i < ' + iters + 'u; i = i + 1u) {',
      '    x0 = fma(x0, m, c); x1 = fma(x1, m, c); x2 = fma(x2, m, c); x3 = fma(x3, m, c);',
      '    x4 = fma(x4, m, c); x5 = fma(x5, m, c); x6 = fma(x6, m, c); x7 = fma(x7, m, c);',
      '  }',
      '  let r = x0 + x1 + x2 + x3 + x4 + x5 + x6 + x7;',
      '  o[gid & 262143u] = r.x + r.y + r.z + r.w;',
      '}'
    ].join('\n');
  }
};
