class CL{constructor(){this.s=new Set()}add(...v){v.forEach(x=>this.s.add(x))}remove(...v){v.forEach(x=>this.s.delete(x))}toggle(v,f){if(f===true){this.s.add(v);return true}if(f===false){this.s.delete(v);return false}this.s.has(v)?this.s.delete(v):this.s.add(v)}contains(v){return this.s.has(v)}}
const cx=new Proxy({}, {get:(t,k)=>t[k]||(t[k]=()=>{}),set:(t,k,v)=>(t[k]=v,true)});
class E{constructor(id=''){this.id=id;this.classList=new CL;this.style={};this.value='';this.textContent='';this.innerHTML='';this.disabled=false;this.checked=false;this.clientWidth=id==='cadCanvas'?800:100;this.clientHeight=id==='cadCanvas'?600:100;this.tagName='DIV';this.options=[]}addEventListener(){}append(...items){this.options.push(...items)}click(){}getContext(){return cx}getBoundingClientRect(){return{left:0,top:0,width:this.clientWidth,height:this.clientHeight}}setPointerCapture(){}}
const m=new Map, get=id=>m.has(id)?m.get(id):(m.set(id,new E(id)),m.get(id));
globalThis.document={body:new E('body'),activeElement:new E('active'),getElementById:get,querySelector:()=>new E,querySelectorAll:()=>[],createElement:t=>{const e=new E;e.tagName=t.toUpperCase();return e},createDocumentFragment:()=>new E};
globalThis.window={devicePixelRatio:1,addEventListener(){},confirm(){return true}}; Object.defineProperty(globalThis,'navigator',{value:{},configurable:true}); globalThis.requestAnimationFrame=cb=>(cb(),1); globalThis.ResizeObserver=class{observe(){}}; URL.createObjectURL=()=>''; URL.revokeObjectURL=()=>{};
await import('../app.js'); assertStatus();
function assertStatus(){if(get('projectStatus').textContent!=='ยังไม่ได้เปิดโปรเจกต์')throw new Error('init failed')}
console.log('app smoke test passed');
