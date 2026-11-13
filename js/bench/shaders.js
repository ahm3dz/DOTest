/* =========================================================
   DOTest — GPU shaders   © Ahmed Al-Zahrani
   WebGL: ray-marched Menger-sponge fractal (render test)
   WebGPU: FMA compute kernel (raw TFLOPS test)
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.shaders = {
  vertex: 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}',

  fragment: [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;uniform int uIter;uniform float uK;',
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
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
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
  ].join('\n'),

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
