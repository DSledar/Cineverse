import{initializeApp}from'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import{getAuth,GoogleAuthProvider,signInWithPopup,signOut as fbOut,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import{getFirestore,collection,doc,getDoc,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,query,orderBy,limit,serverTimestamp,increment}from'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

/* CONFIG — same Firebase, no changes */
const FB={apiKey:"AIzaSyCOq-h8IPakpUSi22rMHSgNSrrPtafjMWc",authDomain:"cineverse-61fab.firebaseapp.com",projectId:"cineverse-61fab",storageBucket:"cineverse-61fab.firebasestorage.app",messagingSenderId:"937731122165",appId:"1:937731122165:web:3567d97dd45e74e169b6bc"};
const ADMIN='abdulrahmanawl90@gmail.com';
const GENRES=['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Thriller','War','Western','Biography','Family','Musical','Sport','Kurdish','Arabic','English','Turkish','Korean','Japanese'];
const CATS={general:'General',movie:'Movies',series:'Series',kdrama:'K-Drama',anime:'Anime',animation:'Animation',kurdish:'Kurdish',arabic:'Arabic',turkish:'Turkish',documentary:'Documentary'};
const CAT_COLORS={general:'bar-r',movie:'bar-r',series:'bar-p',kdrama:'bar-c',anime:'bar-g',animation:'bar-b',kurdish:'bar-y',arabic:'bar-g',turkish:'bar-b',documentary:'bar-gr'};

const fbApp=initializeApp(FB);
const auth=getAuth(fbApp);
const db=getFirestore(fbApp);
const gProv=new GoogleAuthProvider();

/* STATE */
let user=null,prof=null,films=[],allUsers=[];
let pg='home',par={};
let lang=localStorage.getItem('cv_lang')||'en';
let editF=null,fType='movie',fVer='sub',ttMode='url',thB64=null;
let xSvrs=[],epL=[],selGenres=[];
let favs=[],later=[],watched=[],epWd={};
let ltab='fav',bFil='all',bGenFil='all',homFil='all',homGen='all';

/* TRANSLATIONS */
const T={en:{watchNow:'Watch Now',details:'Details',back:'Back',backToDetails:'Back',synopsis:'Synopsis',episodes:'Episodes',comments:'Comments',addComment:'Add a comment...',post:'Post',signIn:'Sign In',signOut:'Sign Out',noContent:'Nothing here yet',addFirst:'Add your first film',contentMgmt:'Content Management',addNew:'Add New',deleteConfirm:'Delete this film permanently?',updated:'Updated!',added:'Added!',deleted:'Deleted!',fillAll:'Please fill all required fields',titleRequired:'Title *',descRequired:'Description *',thumbRequired:'Thumbnail *',yearLabel:'Year',rating:'Rating',type:'Type',releaseYear:'Year',latestMovies:'Latest Movies',latestSeries:'Latest Series',cancel:'Cancel',save:'Save',update:'Update',addEpisode:'Add Episode',noVideo:'No video available',accessDenied:'Access Denied',featured:'Featured',noResults:'No results found',signInToComment:'Sign in to leave a comment',loading:'Loading...',mostViewed:'Most Viewed',topRated:'Top Rated',newReleases:'New Releases',},
ku:{watchNow:'ئێستا ببینە',details:'وردەکاری',back:'گەڕانەوە',backToDetails:'گەڕانەوە',synopsis:'کورتەبیر',episodes:'ئێپیزۆدەکان',comments:'کۆمێنتەکان',addComment:'کۆمێنتێک بنووسە...',post:'بنێرە',signIn:'داخلبوون',signOut:'چوونەدەرەوە',noContent:'هیچ ناوەڕۆکێک نییە',addFirst:'فیلمێک زیاد بکە',contentMgmt:'بەڕێوەبردنی ناوەڕۆک',addNew:'زیادکردنی نوێ',deleteConfirm:'دڵنیایت لە سڕینەوە؟',updated:'نوێکراوەتەوە!',added:'زیادکرا!',deleted:'سڕایەوە!',fillAll:'خانەکان پڕ بکەرەوە',titleRequired:'ناونیشان *',descRequired:'وەسف *',thumbRequired:'وێنە *',yearLabel:'ساڵ',rating:'هەڵسەنگاندن',type:'جۆر',releaseYear:'ساڵ',latestMovies:'دواتازەترین فیلمەکان',latestSeries:'دواتازەترین زنجیرەکان',cancel:'پاشگەز',save:'پاشەکەوت',update:'نوێکردنەوە',addEpisode:'زیادکردنی ئێپیزۆد',noVideo:'ڤیدیۆیەک نییە',accessDenied:'مۆڵەت نییە',featured:'تایبەت',noResults:'ئەنجامێک نەدۆزرایەوە',signInToComment:'بۆ کۆمێنت داخل بوو',loading:'چاوەڕوانبە...',mostViewed:'زیاترین بینراوەکان',topRated:'باشترین هەڵسەنگاوەکان',newReleases:'دواتازەکان',}};
const t=k=>T[lang][k]||k;

/* ROLES */
const isAdm=()=>user?.email===ADMIN||prof?.role==='admin';
const isDob=()=>isAdm()||['admin','dobber'].includes(prof?.role||'');
const isSub=()=>isAdm()||prof?.subscriber===true;

/* EMBED ENGINE — 18 hosts */
const emb=url=>{
  if(!url?.trim())return null;const u=url.trim();
  const yt=u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if(yt)return{t:'fr',s:`https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`,n:'YouTube'};
  const vm=u.match(/vimeo\.com\/(\d+)/);
  if(vm)return{t:'fr',s:`https://player.vimeo.com/video/${vm[1]}?autoplay=1`,n:'Vimeo'};
  const dm=u.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if(dm)return{t:'fr',s:`https://www.dailymotion.com/embed/video/${dm[1]}?autoplay=1`,n:'Dailymotion'};
  const st=u.match(/streamtape\.(?:com|net|to|cc|site)\/(?:v|e|play)\/([a-zA-Z0-9_-]+)/);
  if(st)return{t:'fr',s:`https://streamtape.com/e/${st[1]}/`,n:'Streamtape'};
  const dd=u.match(/dood(?:stream)?\.(?:com|watch|to|la|li|pm|re|sh|yt|ws|wf|cx|pro|pm)\/(?:e|d|f|p)\/([a-zA-Z0-9]+)/);
  if(dd)return{t:'fr',s:`https://dood.li/e/${dd[1]}`,n:'Doodstream'};
  const vml=u.match(/vidmoly\.(?:to|me|com|net)\/(?:embed-?)?([a-zA-Z0-9]+)/);
  if(vml)return{t:'fr',s:`https://vidmoly.to/embed-${vml[1]}.html`,n:'Vidmoly'};
  const mx=u.match(/mixdrop\.(?:co|to|bz|ch|gl|sx|ag|club)\/(?:e|f)\/([a-zA-Z0-9]+)/);
  if(mx)return{t:'fr',s:`https://mixdrop.ag/e/${mx[1]}`,n:'Mixdrop'};
  const up=u.match(/upstream\.to\/(?:embed-)?([a-zA-Z0-9]+)/);
  if(up)return{t:'fr',s:`https://upstream.to/embed-${up[1]}.html`,n:'Upstream'};
  const fm=u.match(/filemoon\.(?:sx|to|in|cc|mobi)\/e\/([a-zA-Z0-9]+)/);
  if(fm)return{t:'fr',s:`https://filemoon.sx/e/${fm[1]}/`,n:'Filemoon'};
  const sw=u.match(/streamwish\.(?:to|com|site|space)\/(?:e\/)?([a-zA-Z0-9]+)/);
  if(sw)return{t:'fr',s:`https://streamwish.to/e/${sw[1]}`,n:'Streamwish'};
  const gd=u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if(gd)return{t:'fr',s:`https://drive.google.com/file/d/${gd[1]}/preview`,n:'Google Drive'};
  const ok=u.match(/ok\.ru\/video(?:embed)?\/(\d+)/);
  if(ok)return{t:'fr',s:`https://ok.ru/videoembed/${ok[1]}`,n:'OK.ru'};
  if(/ok\.ru|odnoklassniki/i.test(u))return{t:'ext',s:u,n:'OK.ru'};
  if(/terabox\.com|1024tera\.com|teraboxapp/i.test(u))return{t:'ext',s:u,n:'Terabox'};
  if(/4shared\.com/i.test(u))return{t:'ext',s:u,n:'4shared'};
  if(/\.(mp4|webm|ogg)(\?|$)/i.test(u))return{t:'vid',s:u,n:'Direct'};
  if(/\.m3u8(\?|$)/i.test(u))return{t:'hls',s:u,n:'HLS'};
  return{t:'fr',s:u,n:'Player'};
};

const renderPl=(url,el)=>{
  const e=emb(url);
  if(!e){el.innerHTML=`<div class="d-flex flex-column align-items-center justify-content-center h-100 gap-3 p-4" style="color:var(--muted);background:#06080e"><i class="bi bi-camera-video-off" style="font-size:2.8rem"></i><p>${t('noVideo')}</p><p style="font-size:.75rem;color:var(--muted2)">Supported: YouTube, Streamtape, Vidmoly, OK.ru, Google Drive, .mp4, .m3u8 and more</p></div>`;return;}
  if(e.t==='fr'){el.innerHTML=`<iframe src="${e.s}" allowfullscreen allow="autoplay;fullscreen;picture-in-picture;encrypted-media" referrerpolicy="no-referrer" style="width:100%;height:100%;border:none"></iframe>`;}
  else if(e.t==='vid'){el.innerHTML=`<video src="${e.s}" controls autoplay style="width:100%;height:100%;background:#000"></video>`;}
  else if(e.t==='hls'){
    el.innerHTML=`<video id="hlsV" controls autoplay style="width:100%;height:100%;background:#000"></video>`;
    const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
    sc.onload=()=>{const v=document.getElementById('hlsV');if(typeof Hls!=='undefined'&&Hls.isSupported()){const h=new Hls();h.loadSource(e.s);h.attachMedia(v);h.on(Hls.Events.MANIFEST_PARSED,()=>v.play());}else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=e.s;v.play();}};
    document.head.appendChild(sc);
  } else {
    el.innerHTML=`<div class="d-flex flex-column align-items-center justify-content-center h-100 gap-4 p-4 text-center" style="background:#06080e"><div style="width:68px;height:68px;border-radius:50%;background:rgba(225,29,72,.1);border:2px solid rgba(225,29,72,.22);display:flex;align-items:center;justify-content:center;font-size:1.7rem;color:var(--red)"><i class="bi bi-box-arrow-up-right"></i></div><div><p style="font-weight:700;margin-bottom:.4rem">${e.n} — Cannot Embed</p><p style="color:var(--muted);font-size:.82rem;max-width:320px">This host blocks embedding. Open in a new tab.</p></div><a href="${e.s}" target="_blank" rel="noopener" class="bp"><i class="bi bi-box-arrow-up-right"></i> Open ${e.n}</a></div>`;
  }
};

/* UTILS */
const timeAgo=ts=>{if(!ts)return'';const d=ts.toDate?ts.toDate():new Date(ts);const s=Math.floor((Date.now()-d.getTime())/1000);if(s<60)return lang==='ku'?'ئێستا':'just now';if(s<3600)return lang==='ku'?`${Math.floor(s/60)}خ`:`${Math.floor(s/60)}m ago`;if(s<86400)return lang==='ku'?`${Math.floor(s/3600)}س`:`${Math.floor(s/3600)}h ago`;return lang==='ku'?`${Math.floor(s/86400)}ر`:`${Math.floor(s/86400)}d ago`;};
const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const toast=(msg,tp='s')=>{const c=document.getElementById('toasts');const el=document.createElement('div');el.className=`t-c ${tp}`;el.innerHTML=`${tp==='s'?'<i class="bi bi-check-circle-fill"></i>':tp==='e'?'<i class="bi bi-x-circle-fill"></i>':tp==='w'?'<i class="bi bi-exclamation-triangle-fill"></i>':''} ${msg}`;c.appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .25s';setTimeout(()=>el.remove(),250)},3200);};
const fmt=n=>n>=1000?`${(n/1000).toFixed(1)}K`:String(n||0);

/* EXPOSE GLOBALS */
Object.assign(window,{nav,signIn,signOut,openMdl,closeMdl,saveFilm,delFilm,toggleLang,closeDrw,setFT,setVer,setTT,prvTh,hndThFile,addEp,remEp,addXSvr,remXSvr,postCom,delCom,chRole,togUserSub,watchEp,setFil,setBFil,setLT,togFav,togWL,togWd,markEpWd,onSrch,sendContact,togGenFil,setGenBFil});

/* AUTH */
async function signIn(){try{await signInWithPopup(auth,gProv);toast(t('signIn'));}catch(e){if(e.code==='auth/unauthorized-domain')showAuthHelp();else toast(e.message,'e');}}
async function signOut(){await fbOut(auth);nav('home');toast(t('signOut'),'i');}
function showAuthHelp(){const dom=window.location.hostname;const m=document.createElement('div');m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:1rem';m.innerHTML=`<div style="max-width:500px;width:100%;background:#0c0f1a;border:1px solid rgba(225,29,72,.3);border-radius:20px;padding:2rem"><h3 style="font-family:var(--fd);font-size:1.5rem;letter-spacing:.06em;text-transform:uppercase;margin-bottom:1rem">🔒 Firebase Auth Error</h3><p style="color:rgba(255,255,255,.62);font-size:.86rem;line-height:1.7;margin-bottom:1rem">Domain <code style="background:rgba(225,29,72,.12);color:var(--red);padding:2px 8px;border-radius:5px">${dom}</code> not whitelisted.</p><ol style="color:rgba(255,255,255,.55);font-size:.83rem;line-height:2;padding-left:1.2rem;margin-bottom:1.2rem"><li>Go to <a href="https://console.firebase.google.com/project/cineverse-61fab/authentication/settings" target="_blank" style="color:#60a5fa">Firebase Console → Auth → Settings</a></li><li>Authorized domains → Add domain</li><li>Add: <code style="color:#4ade80;background:rgba(255,255,255,.07);padding:2px 8px;border-radius:4px">${dom}</code></li></ol><div class="d-flex gap-2"><a href="https://console.firebase.google.com/project/cineverse-61fab/authentication/settings" target="_blank" class="bp" style="flex:1;justify-content:center;font-size:.82rem;text-decoration:none"><i class="bi bi-box-arrow-up-right"></i> Open Console</a><button onclick="this.closest('div[style]').remove()" class="bs" style="padding:.65rem 1.2rem;font-size:.82rem">Close</button></div></div>`;document.body.appendChild(m);}

onAuthStateChanged(auth,async u=>{
  user=u;
  if(u){
    const ref=doc(db,'users',u.uid);const snap=await getDoc(ref);
    if(snap.exists()){prof=snap.data();if(u.email===ADMIN&&prof.role!=='admin'){await updateDoc(ref,{role:'admin'});prof.role='admin';}}
    else{prof={uid:u.uid,email:u.email||'',displayName:u.displayName||'',photoURL:u.photoURL||'',role:u.email===ADMIN?'admin':'viewer',subscriber:false,createdAt:serverTimestamp()};await setDoc(ref,prof);}
    await loadLists();
  } else{prof=null;favs=[];later=[];watched=[];epWd={};}
  renderUA();updNav();
  if(pg==='profile')renderProfile();
  if(pg==='mylist')renderML();
  if(pg==='film')renderDetUA();
});

async function loadLists(){if(!user)return;const s=await getDoc(doc(db,'users',user.uid));if(s.exists()){const d=s.data();favs=d.favs||[];later=d.later||[];watched=d.watched||[];epWd=d.epWd||{};}}
async function saveLists(){if(!user)return;try{await updateDoc(doc(db,'users',user.uid),{favs,later,watched,epWd});}catch(e){console.error(e);}}

function renderUA(){
  const el=document.getElementById('uArea');const mn=document.getElementById('mn-signin');
  if(user){el.innerHTML=`<div class="u-av" onclick="nav('profile')"><img src="${user.photoURL||''}" alt="" referrerpolicy="no-referrer"></div>`;if(mn)mn.style.display='none';}
  else{el.innerHTML=`<button class="bp" onclick="signIn()" style="padding:.34rem .95rem;font-size:.74rem"><i class="bi bi-google"></i> ${t('signIn')}</button>`;if(mn)mn.style.display='';}
}

function updNav(){
  const d=isDob(),a=isAdm(),u=!!user;
  const s=(id,v)=>{const e=document.getElementById(id);if(e)e.style.cssText=v?'':'display:none!important'};
  s('nl-manage',d);s('nl-admin',a);s('nl-mylist',u);s('n-addbtn',d);
  s('mn-manage',d);s('mn-admin',a);s('mn-mylist',u);
  ['emptyAdd','addMovBtn','addSerBtn'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display=d?'':'none';});
  const de=document.getElementById('dEdit');if(de)de.style.display=d?'':'none';
  const ap=document.getElementById('actPanel');if(ap)ap.style.display=u?'':'none';
}

/* FILMS LISTENER */
onSnapshot(query(collection(db,'films'),orderBy('createdAt','desc'),limit(500)),snap=>{
  films=snap.docs.map(d=>({id:d.id,...d.data()}));
  document.getElementById('gLoader').style.display='none';
  buildGenFils();
  renderCurPg();
  updNav();
  updStats();
},e=>console.error(e));

function updStats(){
  const ms=films.filter(f=>f.type==='movie').length;const ss=films.filter(f=>f.type==='series').length;
  document.getElementById('st-films').textContent=films.length;
  document.getElementById('st-movies').textContent=ms;
  document.getElementById('st-series').textContent=ss;
  document.getElementById('a-films').textContent=films.length;
  document.getElementById('a-movies').textContent=ms;
  document.getElementById('a-series').textContent=ss;
}

/* NAVIGATION */
function nav(p,pa={}){
  pg=p;par=pa;
  document.querySelectorAll('.pg').forEach(e=>e.classList.remove('on'));
  const el=document.getElementById(`pg-${p}`);if(el)el.classList.add('on');
  document.querySelectorAll('.nl').forEach(l=>l.classList.remove('on'));
  const nl=document.getElementById(`nl-${p}`);if(nl)nl.classList.add('on');
  else document.getElementById('nl-home')?.classList.add('on');
  closeDrw();window.scrollTo(0,0);
  renderCurPg();applyLang();
}
function renderCurPg(){
  const r={home:renderHome,browse:renderBrowse,film:renderDet,watch:renderWatch,profile:renderProfile,manage:renderManage,admin:renderAdmin,mylist:renderML,premium:()=>{},contact:()=>{}}
  r[pg]?.();
}
function closeDrw(){document.getElementById('mobDrawer').classList.remove('open');}

/* HOME */
function buildGenFils(){
  const gs=new Set();films.forEach(f=>(f.genres||[]).forEach(g=>gs.add(g)));
  const el=document.getElementById('genFils');if(!el)return;
  el.innerHTML=[...gs].slice(0,10).map(g=>`<button class="fp${homGen===g?' on':''}" onclick="togGenFil('${g}',this)">${g}</button>`).join('');
}
function togGenFil(g,btn){homGen=homGen===g?'all':g;document.querySelectorAll('#genFils .fp').forEach(b=>b.classList.remove('on'));if(homGen!=='all')btn.classList.add('on');renderHome();}
function setFil(v,btn){homFil=v;document.querySelectorAll('#filBar .fp[onclick^="setFil"]').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderHome();}

function sortArr(arr){
  const s=document.getElementById('sortSel')?.value||'newest';const a=[...arr];
  if(s==='rating')a.sort((x,y)=>(y.rating||0)-(x.rating||0));
  else if(s==='views')a.sort((x,y)=>(y.views||0)-(x.views||0));
  else if(s==='az')a.sort((x,y)=>x.title.localeCompare(y.title));
  else if(s==='year')a.sort((x,y)=>(y.year||0)-(x.year||0));
  return a;
}

function renderHome(){
  let all=[...films];
  if(homFil==='movie')all=all.filter(f=>f.type==='movie');
  else if(homFil==='series')all=all.filter(f=>f.type==='series');
  if(homGen!=='all')all=all.filter(f=>(f.genres||[]).includes(homGen));
  all=sortArr(all);

  document.getElementById('srchSec').style.display='none';
  document.getElementById('srchIn').value='';

  if(!films.length){document.getElementById('emptyEl').style.display='';document.getElementById('homeSections').innerHTML='';document.getElementById('statsRow').style.display='none';renderHeroSwiper([]);return;}
  document.getElementById('emptyEl').style.display='none';
  document.getElementById('statsRow').style.display='';

  // Hero swiper — top 5 newest
  renderHeroSwiper(films.slice(0,5));
  // Trending bar
  const topV=[...films].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,10);
  document.getElementById('trendBar').innerHTML=topV.map((f,i)=>`<div class="trend-chip" onclick="nav('film',{id:'${f.id}'})"><span class="tn">${i+1}</span>${esc(f.title)}</div>`).join('');

  // Build sections
  const sections=[];
  // New releases
  const newR=sortArr([...films]).slice(0,14);
  if(newR.length)sections.push({title:t('newReleases'),bar:'bar-r',films:newR,id:'new'});
  // Most viewed
  const topVw=[...films].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,14);
  if(topVw.some(f=>(f.views||0)>0))sections.push({title:t('mostViewed'),bar:'bar-c',films:topVw,id:'topview'});
  // Top rated
  const topRat=[...films].sort((a,b)=>(b.rating||0)-(a.rating||0)).filter(f=>f.rating).slice(0,14);
  if(topRat.length)sections.push({title:t('topRated'),bar:'bar-g',films:topRat,id:'toprat'});
  // By category
  const cats=['movie','series','kdrama','anime','animation','kurdish','arabic','turkish','documentary'];
  cats.forEach(cat=>{
    const fs=all.filter(f=>f.category===cat||f.type===cat);
    if(fs.length)sections.push({title:CATS[cat]||cat,bar:CAT_COLORS[cat]||'bar-r',films:fs.slice(0,14),id:cat});
  });
  // Sub / Dub
  const subF=all.filter(f=>['sub','both'].includes(f.version));
  if(subF.length)sections.push({title:'Subbed',bar:'bar-p',films:subF.slice(0,14),id:'sub'});
  const dubF=all.filter(f=>['dub','both'].includes(f.version));
  if(dubF.length)sections.push({title:'Dubbed',bar:'bar-b',films:dubF.slice(0,14),id:'dub'});
  // fallback: just movies and series if no categories
  if(!sections.find(s=>s.id==='movie')){
    const mv=all.filter(f=>f.type==='movie');if(mv.length)sections.push({title:t('latestMovies'),bar:'bar-r',films:mv.slice(0,14),id:'allmovies'});
  }
  if(!sections.find(s=>s.id==='series')){
    const sv=all.filter(f=>f.type==='series');if(sv.length)sections.push({title:t('latestSeries'),bar:'bar-p',films:sv.slice(0,14),id:'allseries'});
  }

  const container=document.getElementById('homeSections');
  container.innerHTML=sections.map(sec=>`
    <div class="sec">
      <div class="sec-h">
        <div class="sec-t"><span class="sec-bar ${sec.bar}"></span>${esc(sec.title)}</div>
        <button class="see-all" onclick="nav('browse')">See All <i class="bi bi-arrow-right"></i></button>
      </div>
      <div class="fg" id="sec-${sec.id}">${sec.films.map(f=>fcHTML(f)).join('')}</div>
    </div>`).join('');

  // Ad between sections
  const ad=`<div class="ad" style="min-height:78px;margin:1rem 0"><i class="bi bi-layout-text-window"></i><span>Your Ad Here — 728×90</span></div>`;
  if(sections.length>2){const c=document.getElementById('homeSections');const kids=[...c.children];if(kids[2])kids[2].insertAdjacentHTML('beforebegin',ad);}
  updNav();
}

function renderHeroSwiper(featuredFilms){
  const sw=document.getElementById('heroSlides');
  if(!featuredFilms.length){sw.innerHTML='';return;}
  sw.innerHTML=featuredFilms.map(f=>`
    <div class="swiper-slide">
      <div class="hero-slide">
        <div class="h-bg"><img src="${esc(f.thumbnailUrl)}" alt="" referrerpolicy="no-referrer" loading="lazy" onload="this.classList.add('rdy')"></div>
        <div class="h-gr"></div>
        <div class="h-cnt">
          <div style="max-width:500px">
            <div class="h-badge"><i class="bi bi-star-fill"></i> ${esc(f.category?CATS[f.category]||f.category:t('featured'))}</div>
            <div class="h-meta">
              <span class="h-rat"><i class="bi bi-star-fill"></i> ${f.rating||'N/A'}</span>
              <span class="dot"></span><span>${f.year||''}</span>
              <span class="dot"></span><span style="text-transform:uppercase">${f.type||''}</span>
              ${f.genres?.length?`<span class="dot"></span><span style="color:var(--muted)">${f.genres.slice(0,2).join(' · ')}</span>`:''}
              ${f.views?`<span class="dot"></span><span style="color:var(--cyan)"><i class="bi bi-eye-fill"></i> ${fmt(f.views)}</span>`:''}
            </div>
            <h2 class="h-title">${esc(f.title)}</h2>
            <p class="h-desc">${esc(f.description)}</p>
            <div class="h-acts">
              <button class="bp" onclick="nav('watch',{id:'${f.id}'})"><i class="bi bi-play-fill"></i> ${t('watchNow')}</button>
              <button class="bs" onclick="nav('film',{id:'${f.id}'})"><i class="bi bi-info-circle"></i> ${t('details')}</button>
              ${user?`<button class="bi-btn y" onclick="togFavById('${f.id}')"><i class="bi bi-bookmark${favs.includes(f.id)?'-fill':''}"></i></button>`:''}
            </div>
          </div>
        </div>
      </div>
    </div>`).join('');
  // Reinit swiper
  if(window._heroSw)try{window._heroSw.destroy();}catch(e){}
  window._heroSw=new Swiper('#heroSwiper',{loop:featuredFilms.length>1,autoplay:{delay:5500,disableOnInteraction:false},pagination:{el:'.swiper-pagination',clickable:true},navigation:{nextEl:'.swiper-button-next',prevEl:'.swiper-button-prev'},effect:'fade',fadeEffect:{crossFade:true}});
}

/* FILM CARD HTML */
function fcHTML(f,rank){
  const isFav=favs.includes(f.id);const isWd=watched.includes(f.id);const d=isDob();const a=isAdm();
  return`<div class="fc" onclick="nav('film',{id:'${f.id}'})">
    ${isWd?`<div class="w-ribbon"><i class="bi bi-check"></i></div>`:''}
    ${f.quality?`<div class="hd-tag">${esc(f.quality)}</div>`:''}
    ${rank!==undefined?`<div class="top-num">${rank+1}</div>`:''}
    <img src="${esc(f.thumbnailUrl)}" alt="${esc(f.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%230c0f1a%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E'">
    <div class="ov"></div>
    <div class="bd">
      <div style="display:flex;align-items:center;gap:.3rem;flex-wrap:wrap;margin-bottom:.22rem">
        <span class="fc-tp${f.type==='series'?' s':''}">${f.type||'film'}</span>
        ${f.version?`<span class="fc-tp" style="background:${f.version==='sub'?'var(--purple)':'var(--blue)'}">${f.version}</span>`:''}
        ${f.category&&f.category!==f.type?`<span class="fc-tp" style="background:rgba(255,255,255,.14);color:#fff">${CATS[f.category]||f.category}</span>`:''}
      </div>
      <div class="fc-ti">${esc(f.title)}</div>
      <div class="fc-me">${f.year||''} · ⭐${f.rating||'?'}${f.views?` · 👁 ${fmt(f.views)}`:''}${isWd?' · <span style="color:var(--green)">✓</span>':''}</div>
      <div class="fc-ac">
        <button class="fc-w" onclick="event.stopPropagation();nav('watch',{id:'${f.id}'})"><i class="bi bi-play-fill"></i> ${t('watchNow')}</button>
        ${user?`<button class="fc-ib fv${isFav?' on':''}" onclick="event.stopPropagation();togFavById('${f.id}')"><i class="bi bi-bookmark${isFav?'-fill':''}"></i></button>`:''}
        ${d?`<button class="fc-ib" onclick="event.stopPropagation();openMdl('${f.id}')"><i class="bi bi-pencil"></i></button>`:''}
        ${a?`<button class="fc-ib del" onclick="event.stopPropagation();delFilm('${f.id}')"><i class="bi bi-trash3"></i></button>`:''}
      </div>
    </div>
  </div>`;
}

/* SEARCH */
function onSrch(v){
  const ss=document.getElementById('srchSec');const hs=document.getElementById('homeSections');const he=document.getElementById('heroSwiper');const fil=document.getElementById('filBar');const tb=document.querySelector('.trend-chip')?.parentElement?.parentElement;
  if(!v.trim()){ss.style.display='none';hs.style.display='';if(he)he.style.display='';if(fil)fil.style.display='';return;}
  const r=films.filter(f=>f.title.toLowerCase().includes(v.toLowerCase())||f.description?.toLowerCase().includes(v.toLowerCase())||(f.genres||[]).some(g=>g.toLowerCase().includes(v.toLowerCase()))||(f.category||'').toLowerCase().includes(v.toLowerCase()));
  ss.style.display='';hs.style.display='none';if(he)he.style.display='none';
  document.getElementById('srchCnt').textContent=`(${r.length})`;
  document.getElementById('srchGrid').innerHTML=r.length?r.map(f=>fcHTML(f)).join(''):`<div class="empty"><div class="empty-ico"><i class="bi bi-search"></i></div><p style="color:var(--muted)">${t('noResults')}</p></div>`;
}

/* BROWSE */
function setBFil(v,btn){bFil=v;document.querySelectorAll('#bFil .fp').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderBrowse();}
function setGenBFil(g,btn){bGenFil=bGenFil===g?'all':g;document.querySelectorAll('#browseGenFils .fp').forEach(b=>b.classList.remove('on'));if(bGenFil!=='all')btn.classList.add('on');renderBrowse();}
function renderBrowse(){
  let all=[...films];
  if(bFil==='movie')all=all.filter(f=>f.type==='movie');
  else if(bFil==='series')all=all.filter(f=>f.type==='series');
  else if(bFil==='sub')all=all.filter(f=>['sub','both'].includes(f.version));
  else if(bFil==='dub')all=all.filter(f=>['dub','both'].includes(f.version));
  if(bGenFil!=='all')all=all.filter(f=>(f.genres||[]).includes(bGenFil));
  const sv=document.getElementById('bSortSel')?.value||'newest';
  if(sv==='rating')all.sort((a,b)=>(b.rating||0)-(a.rating||0));
  else if(sv==='views')all.sort((a,b)=>(b.views||0)-(a.views||0));
  else if(sv==='az')all.sort((a,b)=>a.title.localeCompare(b.title));
  // Gen filters
  const gs=new Set();films.forEach(f=>(f.genres||[]).forEach(g=>gs.add(g)));
  document.getElementById('browseGenFils').innerHTML=[...gs].slice(0,15).map(g=>`<button class="fp${bGenFil===g?' on':''}" onclick="setGenBFil('${g}',this)">${g}</button>`).join('');
  document.getElementById('browseGrid').innerHTML=all.map(f=>fcHTML(f)).join('')||(all.length===0?`<div class="col-12 empty"><div class="empty-ico"><i class="bi bi-film"></i></div><p style="color:var(--muted)">${t('noResults')}</p></div>`:'');
}

/* FILM DETAIL */
let cUnsub=null;
function renderDet(){
  const f=films.find(x=>x.id===par.id);if(!f)return;
  // Increment view count
  try{updateDoc(doc(db,'films',f.id),{views:increment(1)});}catch(e){}
  document.getElementById('dBg').src=f.thumbnailUrl||'';
  document.getElementById('dPoster').src=f.thumbnailUrl||'';
  document.getElementById('dTitle').textContent=f.title;
  document.getElementById('dDesc').textContent=f.description;
  const dt=document.getElementById('dType');dt.textContent=f.type;dt.className=`fc-tp${f.type==='series'?' s':''}`;
  document.getElementById('dRat').textContent=f.rating||'N/A';
  document.getElementById('dYr').textContent=f.year?`${f.year}`:'';
  document.getElementById('dDur').textContent=f.duration?`${f.duration} min`:'';
  document.getElementById('dLng').textContent=f.language||'';
  document.getElementById('dGenres').innerHTML=(f.genres||[]).map(g=>`<span style="font-size:.66rem;padding:.18rem .6rem;border-radius:50px;border:1px solid var(--border);color:var(--muted);background:var(--glass)">${g}</span>`).join('');
  document.getElementById('dWatch').onclick=()=>nav('watch',{id:f.id});
  document.getElementById('dEdit').onclick=()=>openMdl(f.id);
  // Meta
  document.getElementById('mYear').textContent=f.year||'—';
  document.getElementById('mType').textContent=f.type;
  document.getElementById('mRat').textContent=`${f.rating||'—'}/10 ⭐`;
  const epR=document.getElementById('mEpR'),vwR=document.getElementById('mVwR'),durR=document.getElementById('mDurR'),lngR=document.getElementById('mLngR'),dirR=document.getElementById('mDirR');
  if(f.type==='series'&&f.episodes?.length){epR.style.display='';document.getElementById('mEps').textContent=f.episodes.length;}else epR.style.display='none';
  if(f.views){vwR.style.display='';document.getElementById('mViews').textContent=fmt(f.views);}else vwR.style.display='none';
  if(f.duration){durR.style.display='';document.getElementById('mDur').textContent=`${f.duration} min`;}else durR.style.display='none';
  if(f.language){lngR.style.display='';document.getElementById('mLng').textContent=f.language;}else lngR.style.display='none';
  if(f.director){dirR.style.display='';document.getElementById('mDir').textContent=f.director;}else dirR.style.display='none';
  // Cast
  if(f.cast?.length){document.getElementById('dCastSec').style.display='';document.getElementById('dCast').textContent=f.cast.join(', ');}else document.getElementById('dCastSec').style.display='none';
  // Sub/Dub tabs
  const sdTabs=document.getElementById('dSubDubTabs');
  if(f.version==='both'){
    sdTabs.style.cssText='';
    sdTabs.innerHTML=`<button class="ql-tab on" id="dSD-sub" onclick="switchDetVer('sub')"><i class="bi bi-badge-cc"></i> Subbed</button><button class="ql-tab" id="dSD-dub" onclick="switchDetVer('dub')"><i class="bi bi-mic"></i> Dubbed</button>`;
  } else sdTabs.style.cssText='display:none!important';
  // Episodes
  const esec=document.getElementById('dEpSec'),egrid=document.getElementById('dEpGrid');
  if(f.type==='series'&&f.episodes?.length){
    esec.style.display='';
    egrid.innerHTML=f.episodes.map((ep,i)=>{const ew=epWd[f.id]?.includes(ep.id);return`<div class="col-12 col-sm-6"><button class="ep-btn w-100" onclick="nav('watch',{id:'${f.id}',ep:${i}})"><span class="ep-n">${i+1}</span><div style="flex:1;min-width:0;text-align:start"><div style="font-size:.86rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ep.title||`Episode ${i+1}`)}</div>${ew?`<div style="font-size:.62rem;color:var(--green);margin-top:.15rem"><i class="bi bi-check-circle-fill"></i> Watched</div>`:''}</div></button></div>`;}).join('');
  } else esec.style.display='none';
  // Comments
  loadComments(f.id);
  renderDetUA();updNav();
}
window.switchDetVer=(v)=>{document.querySelectorAll('[id^="dSD-"]').forEach(b=>b.classList.remove('on'));document.getElementById(`dSD-${v}`)?.classList.add('on');};

/* DETAIL USER ACTIONS */
function renderDetUA(){
  const f=films.find(x=>x.id===par.id);if(!f||!user)return;
  const fv=favs.includes(f.id),lt=later.includes(f.id),wd=watched.includes(f.id);
  const dfv=document.getElementById('dFav'),dwl=document.getElementById('dWL'),ddw=document.getElementById('dWd');
  if(dfv){dfv.style.background=fv?'var(--gold)':'';dfv.style.color=fv?'#000':'';}
  if(dwl){dwl.style.background=lt?'var(--green)':'';dwl.style.color=lt?'#fff':'';}
  if(ddw){ddw.style.background=wd?'rgba(16,185,129,.15)':'';ddw.style.color=wd?'var(--green)':'';}
  const af=document.getElementById('actFav'),awl=document.getElementById('actWL'),awd=document.getElementById('actWd');
  if(af)af.innerHTML=`<i class="bi bi-bookmark${fv?'-fill':''}"></i><span style="font-size:.7rem;margin-inline-start:.28rem">${fv?'Saved':'Favourite'}</span>`;
  if(awl)awl.innerHTML=`<i class="bi bi-clock${lt?'-fill':''}"></i><span style="font-size:.7rem;margin-inline-start:.28rem">${lt?'Added':'Watch Later'}</span>`;
  if(awd)awd.innerHTML=`<i class="bi bi-check2-circle"></i><span style="font-size:.7rem;margin-inline-start:.28rem">${wd?'Watched ✓':'Mark Watched'}</span>`;
}
async function togFav(){const f=films.find(x=>x.id===par.id);if(f)await togFavById(f.id);}
async function togFavById(id){if(!user){toast('Sign in to save favourites','w');return;}if(favs.includes(id)){favs=favs.filter(x=>x!==id);toast('Removed from Favourites','i');}else{favs.push(id);toast('Added to Favourites ⭐');}await saveLists();renderDetUA();if(pg==='home')renderHome();if(pg==='mylist')renderML();}
async function togWL(){if(!user){toast('Sign in first','w');return;}const id=par.id;if(!id)return;if(later.includes(id)){later=later.filter(x=>x!==id);toast('Removed','i');}else{later.push(id);toast('Added to Watch Later');}await saveLists();renderDetUA();}
async function togWd(){if(!user){toast('Sign in first','w');return;}const id=par.id;if(!id)return;if(watched.includes(id)){watched=watched.filter(x=>x!==id);toast('Removed','i');}else{watched.push(id);toast('Marked as Watched ✓');}await saveLists();renderDetUA();}
async function markEpWd(fid,eid){if(!user){toast('Sign in first','w');return;}if(!epWd[fid])epWd[fid]=[];if(epWd[fid].includes(eid)){epWd[fid]=epWd[fid].filter(x=>x!==eid);}else epWd[fid].push(eid);await saveLists();renderWatch();}

/* MY LIST */
function setLT(tab,btn){ltab=tab;document.querySelectorAll('.lt').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderML();}
function renderML(){
  if(!user){document.getElementById('mlGrid').innerHTML=`<div class="empty col-12"><div class="empty-ico"><i class="bi bi-person-lock"></i></div><p style="color:var(--muted)">Sign in to see your list</p></div>`;document.getElementById('mlEmpty').style.display='none';return;}
  const ids=ltab==='fav'?favs:ltab==='later'?later:watched;
  const mf=ids.map(id=>films.find(f=>f.id===id)).filter(Boolean);
  const g=document.getElementById('mlGrid'),e=document.getElementById('mlEmpty');
  if(!mf.length){g.innerHTML='';e.style.display='';}else{e.style.display='none';g.innerHTML=mf.map(f=>fcHTML(f)).join('');}
}

/* WATCH */
function renderWatch(){
  const f=films.find(x=>x.id===par.id);if(!f)return;
  const ei=par.ep||0;const ep=f.type==='series'?f.episodes?.[ei]:null;
  const vurl=f.type==='series'?ep?.videoUrl:f.videoUrl;
  const dubUrl=f.type==='series'?ep?.dubVideoUrl:f.dubVideoUrl;
  document.getElementById('wTitle').textContent=f.title;
  document.getElementById('wEpLbl').textContent=ep?`${t('episodes').replace('s','')} ${ei+1}: ${ep.title||''}` :'';
  document.getElementById('wBack').onclick=()=>nav('film',{id:f.id});
  // Sub/Dub tabs
  const wsd=document.getElementById('wSubDub');
  if(dubUrl||f.version==='both'){
    wsd.style.cssText='';
    let curVer=par.ver||'sub';
    wsd.innerHTML=`<button class="ql-tab${curVer==='sub'?' on':''}" onclick="switchWatchVer('sub')"><i class="bi bi-badge-cc"></i> Subbed</button><button class="ql-tab${curVer==='dub'?' on':''}" onclick="switchWatchVer('dub')"><i class="bi bi-mic"></i> Dubbed</button>`;
  } else wsd.style.cssText='display:none!important';
  // Build servers
  const svrs=[];
  const pu=ep?.videoUrl||f.videoUrl;if(pu)svrs.push({n:'Server 1',u:pu,vip:false});
  (ep?.servers||f.servers||[]).forEach((s,i)=>svrs.push({n:s.name||`Server ${i+2}`,u:s.url,vip:false}));
  const vu=ep?.vipUrl||f.vipUrl;if(vu)svrs.push({n:'⭐ VIP (No Ads)',u:vu,vip:true});
  const pEl=document.getElementById('wPlayer');
  const sTabs=document.getElementById('wSvrs');
  let actSvr=par.srv||0;
  if(svrs.length>1){
    sTabs.style.display='flex';
    const renderTabs=()=>{sTabs.innerHTML=svrs.map((s,i)=>`<button class="svr-t${s.vip?' vip':''}${i===actSvr?' on':''}" onclick="switchSvr(${i})">${esc(s.n)}${s.vip&&!isSub()?`<span style="font-size:.58rem;opacity:.45">(Sub)</span>`:''}</button>`).join('');};
    renderTabs();
    window.switchSvr=(i)=>{actSvr=i;renderTabs();const sv=svrs[i];if(sv.vip&&!isSub()){pEl.innerHTML=`<div class="d-flex flex-column align-items-center justify-content-center h-100 gap-4 p-4 text-center" style="background:#06080e"><div style="font-size:2.8rem">⭐</div><div><p style="font-weight:700;font-size:1.05rem;margin-bottom:.45rem">Subscribers Only</p><p style="color:var(--muted);font-size:.83rem;max-width:300px">This ad-free server is for subscribers only.</p></div><button onclick="nav('premium')" class="bp" style="background:var(--gold);box-shadow:0 6px 20px rgba(245,158,11,.3)"><i class="bi bi-star-fill"></i> Get Premium</button></div>`;}else renderPl(sv.u,pEl);};
    const curSvr=svrs[actSvr];if(curSvr?.vip&&!isSub())window.switchSvr(actSvr);else renderPl(curSvr?.u,pEl);
  } else{sTabs.style.display='none';renderPl(vurl,pEl);}
  window.switchWatchVer=(v)=>{par.ver=v;document.querySelectorAll('#wSubDub .ql-tab').forEach(b=>b.classList.remove('on'));document.querySelector(`#wSubDub .ql-tab:${v==='sub'?'first':'last'}-child`)?.classList.add('on');const nurl=v==='dub'?(ep?.dubVideoUrl||f.dubVideoUrl)||vurl:vurl;renderPl(nurl,pEl);};
  // Mark ep watched
  const meb=document.getElementById('wEpMark');
  if(ep&&user){const ew=epWd[f.id]?.includes(ep.id);meb.style.display='';meb.innerHTML=`<button onclick="markEpWd('${f.id}','${ep.id}')" class="bi-btn${ew?' g':''}" style="width:auto;padding:.42rem 1rem;font-size:.78rem;gap:.35rem;border-radius:50px"><i class="bi bi-check2-circle"></i> ${ew?'Episode Watched ✓':'Mark Episode Watched'}</button>`;}else meb.style.display='none';
  // Episodes
  const wes=document.getElementById('wEpSec'),wel=document.getElementById('wEpList');
  if(f.type==='series'&&f.episodes?.length){
    wes.style.display='';
    wel.innerHTML=f.episodes.map((e,i)=>{const ew=epWd[f.id]?.includes(e.id);return`<button class="ep-pill${i===ei?' on':''}" onclick="watchEp('${f.id}',${i})"><div class="ep-pn">Ep ${i+1}</div><div class="ep-pt">${esc(e.title||`Episode ${i+1}`)}</div>${ew?`<div class="ep-pc"><i class="bi bi-check-circle-fill"></i> Watched</div>`:''}</button>`;}).join('');
  } else wes.style.display='none';
}
function watchEp(fid,i){nav('watch',{id:fid,ep:i});}

/* COMMENTS */
function loadComments(fid){
  if(cUnsub)cUnsub();
  const cf=document.getElementById('cForm');
  if(user){cf.innerHTML=`<div class="d-flex gap-3 mb-3"><div class="c-av flex-shrink-0"><img src="${user.photoURL||''}" alt="" referrerpolicy="no-referrer"></div><div style="flex:1"><textarea class="ca mb-2" id="cInp" placeholder="${t('addComment')}" rows="2"></textarea><div class="text-end"><button onclick="postCom()" class="bp" style="padding:.48rem 1.15rem;font-size:.8rem"><i class="bi bi-send"></i> ${t('post')}</button></div></div></div>`;}
  else cf.innerHTML=`<div class="gl p-4 rounded-3 text-center mb-3"><p style="color:var(--muted);margin-bottom:.65rem">${t('signInToComment')}</p><button onclick="signIn()" class="bp" style="padding:.48rem 1.15rem;font-size:.8rem"><i class="bi bi-google"></i> ${t('signIn')}</button></div>`;
  cUnsub=onSnapshot(query(collection(db,'films',fid,'comments'),orderBy('createdAt','desc')),snap=>{
    const cs=snap.docs.map(d=>({id:d.id,...d.data()}));
    document.getElementById('cCnt').textContent=cs.length;
    document.getElementById('cList').innerHTML=cs.length?cs.map(c=>{const cd=isAdm()||user?.uid===c.userId;return`<div class="c-card"><div class="c-av"><img src="${esc(c.userPhoto||'')}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'"></div><div style="flex:1"><div class="c-nm">${esc(c.userName||'User')}${c.userSubscriber?`<span class="c-sub-tag">⭐ VIP</span>`:''}<span class="c-time">${timeAgo(c.createdAt)}</span></div><p class="c-txt">${esc(c.text)}</p>${cd?`<button onclick="delCom('${fid}','${c.id}')" style="font-size:.7rem;color:rgba(225,29,72,.5);margin-top:.2rem"><i class="bi bi-trash3"></i> Delete</button>`:''}</div></div>`;}).join(''):`<p style="color:var(--muted);text-align:center;padding:2rem 0;font-size:.86rem">No comments yet. Be the first!</p>`;
  });
}
async function postCom(){if(!user)return;const inp=document.getElementById('cInp');const txt=inp.value.trim();if(!txt)return;try{await addDoc(collection(db,'films',par.id,'comments'),{filmId:par.id,userId:user.uid,userName:user.displayName||'User',userPhoto:user.photoURL||'',text:txt,userSubscriber:isSub(),createdAt:serverTimestamp()});inp.value='';}catch(e){toast(e.message,'e');}}
async function delCom(fid,cid){try{await deleteDoc(doc(db,'films',fid,'comments',cid));}catch(e){toast(e.message,'e');}}

/* MANAGE */
function renderManage(){
  if(!isDob()){document.getElementById('mngGrid').innerHTML=`<div class="col-12 empty"><div class="empty-ico"><i class="bi bi-lock-fill"></i></div><p style="color:var(--red);font-weight:700">${t('accessDenied')}</p></div>`;return;}
  const g=document.getElementById('mngGrid');
  if(!films.length){g.innerHTML=`<div class="col-12 empty"><div class="empty-ico"><i class="bi bi-film"></i></div><p style="color:var(--muted)">${t('noContent')}</p></div>`;return;}
  g.innerHTML=films.map(f=>`<div class="col-12 col-md-6 col-xl-4"><div class="glh rounded-3 p-3 d-flex gap-3 h-100"><img src="${esc(f.thumbnailUrl)}" style="width:68px;aspect-ratio:2/3;object-fit:cover;border-radius:9px;flex-shrink:0" referrerpolicy="no-referrer"><div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between"><div><div class="d-flex align-items-start justify-content-between gap-2 mb-1"><span style="font-weight:700;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.title)}</span><span class="fc-tp${f.type==='series'?' s':''}" style="flex-shrink:0">${f.type}</span></div>${f.category?`<span style="font-size:.65rem;color:var(--muted)">${CATS[f.category]||f.category}</span>`:''}${f.views?`<span style="font-size:.65rem;color:var(--cyan)"> · 👁 ${fmt(f.views)}</span>`:''}</div><div class="d-flex gap-2 mt-2"><button onclick="openMdl('${f.id}')" class="bs flex-grow-1 justify-content-center" style="padding:.42rem;font-size:.74rem"><i class="bi bi-pencil"></i> Edit</button>${isAdm()?`<button onclick="delFilm('${f.id}')" class="bi-btn r"><i class="bi bi-trash3"></i></button>`:''}</div></div></div></div></div>`).join('');
}

/* ADMIN */
let uUnsub=null;
function renderAdmin(){
  if(!isAdm())return;
  updStats();
  // Films table
  document.getElementById('aFBody').innerHTML=films.map(f=>`<tr><td><div class="d-flex align-items-center gap-2"><img src="${esc(f.thumbnailUrl)}" style="width:32px;aspect-ratio:2/3;object-fit:cover;border-radius:6px" referrerpolicy="no-referrer"><span style="font-weight:600;font-size:.82rem">${esc(f.title)}</span></div></td><td><span class="fc-tp${f.type==='series'?' s':''}">${f.type}</span></td><td style="color:var(--muted);font-size:.8rem">${CATS[f.category]||f.category||'—'}</td><td style="color:var(--cyan);font-size:.8rem">👁 ${fmt(f.views)}</td><td style="color:var(--gold);font-size:.8rem">⭐ ${f.rating||'—'}</td><td><div class="d-flex gap-1"><button onclick="openMdl('${f.id}')" class="bi-btn" style="width:28px;height:28px;border-radius:6px"><i class="bi bi-pencil" style="font-size:.68rem"></i></button><button onclick="delFilm('${f.id}')" class="bi-btn r" style="width:28px;height:28px;border-radius:6px"><i class="bi bi-trash3" style="font-size:.68rem"></i></button></div></td></tr>`).join('');
  // Users
  if(uUnsub)uUnsub();
  uUnsub=onSnapshot(collection(db,'users'),snap=>{
    allUsers=snap.docs.map(d=>d.data());
    document.getElementById('a-users').textContent=allUsers.length;
    document.getElementById('st-users').textContent=allUsers.length;
    document.getElementById('uBody').innerHTML=allUsers.map(u=>`<tr><td><div class="d-flex align-items-center gap-2"><img src="${esc(u.photoURL||'')}" style="width:30px;height:30px;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer"><span style="font-weight:600;font-size:.82rem">${esc(u.displayName||'—')}</span></div></td><td style="color:var(--muted);font-size:.78rem">${esc(u.email||'')}</td><td><span class="rb ${u.role==='admin'?'ad':u.role==='dobber'?'db':'vw'}">${u.role}</span></td><td><label style="display:flex;align-items:center;gap:.35rem;cursor:pointer;font-size:.78rem"><input type="checkbox" ${u.subscriber?'checked':''} onchange="togUserSub('${u.uid}',this.checked)" ${u.email===ADMIN?'disabled':''} style="accent-color:var(--gold)"><span style="color:var(--gold)">⭐ Sub</span></label></td><td><select class="cs" style="padding:.26rem .55rem;font-size:.74rem;width:auto;border-radius:7px" onchange="chRole('${u.uid}',this.value)" ${u.email===ADMIN?'disabled':''}><option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option><option value="dobber" ${u.role==='dobber'?'selected':''}>Editor</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select></td></tr>`).join('');
  });
}
async function chRole(uid,role){try{await updateDoc(doc(db,'users',uid),{role});toast('Role updated');}catch(e){toast(e.message,'e');}}
async function togUserSub(uid,v){try{await updateDoc(doc(db,'users',uid),{subscriber:v});toast(v?'Subscriber granted ⭐':'Removed','i');}catch(e){toast(e.message,'e');}}

/* PROFILE */
function renderProfile(){
  if(!user){nav('home');return;}
  document.getElementById('pfPhoto').src=user.photoURL||'';
  document.getElementById('pfName').textContent=user.displayName||'';
  document.getElementById('pfEmail').textContent=user.email||'';
  const r=prof?.role||'viewer';const rb=document.getElementById('pfRole');rb.textContent=r;rb.className=`rb ${r==='admin'?'ad':r==='dobber'?'db':'vw'}`;
  document.getElementById('pfSub').style.display=isSub()?'':'none';
  document.getElementById('pfFavC').textContent=favs.length;
  document.getElementById('pfWLC').textContent=later.length;
  document.getElementById('pfWdC').textContent=watched.length;
}

/* DELETE FILM */
async function delFilm(id){
  if(!isAdm()){toast(t('accessDenied'),'e');return;}
  if(!confirm(t('deleteConfirm')))return;
  try{await deleteDoc(doc(db,'films',id));toast(t('deleted'));if(pg==='film'&&par.id===id)nav('home');}
  catch(e){console.error(e);toast(e.message||'Delete failed','e');}
}

/* FILM MODAL */
function openMdl(idOrNull){
  editF=null;thB64=null;xSvrs=[];epL=[];selGenres=[];
  if(idOrNull){editF=films.find(f=>f.id===idOrNull)||null;}
  const f=editF;
  document.getElementById('mHead').textContent=f?t('update'):t('addNew');
  document.getElementById('fTi').value=f?.title||'';
  document.getElementById('fDs').value=f?.description||'';
  document.getElementById('fTh').value=f?.thumbnailUrl||'';
  document.getElementById('fVid').value=f?.videoUrl||'';
  document.getElementById('fDubVid').value=f?.dubVideoUrl||'';
  document.getElementById('fVip').value=f?.vipUrl||'';
  document.getElementById('fYr').value=f?.year||new Date().getFullYear();
  document.getElementById('fRat').value=f?.rating||'';
  document.getElementById('fDur').value=f?.duration||'';
  document.getElementById('fLng').value=f?.language||'';
  document.getElementById('fDir').value=f?.director||'';
  document.getElementById('fCst').value=(f?.cast||[]).join(', ');
  document.getElementById('fTrl').value=f?.trailer||'';
  document.getElementById('fGnC').value='';
  document.getElementById('fCat').value=f?.category||'general';
  selGenres=[...(f?.genres||[])];
  xSvrs=[...(f?.servers||[])];
  rebuildXSvrs();
  if(f?.thumbnailUrl){document.getElementById('thPrv').src=f.thumbnailUrl;document.getElementById('thPrvW').style.display='';}else document.getElementById('thPrvW').style.display='none';
  setFT(f?.type||'movie');setVer(f?.version||'sub');setTT('url');
  epL=[...(f?.episodes||[]).map(e=>({...e}))];rebuildEpForm();buildGcGrid();
  document.getElementById('filmMdl').classList.add('open');
}
function closeMdl(){document.getElementById('filmMdl').classList.remove('open');}
function setFT(t){
  fType=t;
  document.getElementById('tMov').className=`ttb${t==='movie'?' on mv':''}`;
  document.getElementById('tSer').className=`ttb${t==='series'?' on sr':''}`;
  document.getElementById('vidUrlSec').style.display=t==='movie'?'':'none';
  document.getElementById('xSvrSec').style.display=t==='movie'?'':'none';
  document.getElementById('vipSec').style.display=t==='movie'?'':'none';
  document.getElementById('epFSec').style.display=t==='series'?'':'none';
  document.getElementById('dubSec').style.display=t==='movie'?'':'none';
}
function setVer(v){
  fVer=v;
  ['sub','dub','both'].forEach(k=>{const e=document.getElementById(`v${k.charAt(0).toUpperCase()+k.slice(1)}`);if(e)e.className=`ttb${v===k?' on mv':''} sr flex-fill`;});
  document.getElementById('dubSec').style.display=(v==='dub'||v==='both')&&fType==='movie'?'':'none';
}
function setTT(m){
  ttMode=m;
  document.getElementById('ttU').className=`th-tab${m==='url'?' on':''}`;
  document.getElementById('ttF').className=`th-tab${m==='file'?' on':''}`;
  document.getElementById('ttUrlD').style.display=m==='url'?'':'none';
  document.getElementById('ttFilD').style.display=m==='file'?'':'none';
}
function prvTh(u){if(u.trim()){document.getElementById('thPrv').src=u;document.getElementById('thPrvW').style.display='';}else document.getElementById('thPrvW').style.display='none';}
function hndThFile(inp){const file=inp.files[0];if(!file)return;if(file.size>5*1024*1024){toast('Image too large (max 5MB)','e');return;}const r=new FileReader();r.onload=e=>{thB64=e.target.result;document.getElementById('thPrv').src=thB64;document.getElementById('thPrvW').style.display='';};r.readAsDataURL(file);}
function buildGcGrid(){const el=document.getElementById('gcGrid');el.innerHTML=GENRES.map(g=>`<div class="gc${selGenres.includes(g)?' on':''}" onclick="togGc('${g}',this)">${g}</div>`).join('');}
window.togGc=(g,el)=>{if(selGenres.includes(g)){selGenres=selGenres.filter(x=>x!==g);el.classList.remove('on');}else{selGenres.push(g);el.classList.add('on');}};
function addXSvr(){xSvrs.push({name:'',url:''});rebuildXSvrs();}
function remXSvr(i){xSvrs.splice(i,1);rebuildXSvrs();}
function rebuildXSvrs(){document.getElementById('xSvrList').innerHTML=xSvrs.map((s,i)=>`<div class="d-flex gap-2"><input class="ci" style="flex:.38" placeholder="Name" value="${esc(s.name)}" oninput="xSvrs[${i}].name=this.value"><input class="ci" style="flex:1" type="url" placeholder="URL" value="${esc(s.url)}" oninput="xSvrs[${i}].url=this.value"><button onclick="remXSvr(${i})" class="bi-btn r" style="flex-shrink:0"><i class="bi bi-x"></i></button></div>`).join('');}
function addEp(){epL.push({id:Date.now().toString(),title:'',videoUrl:'',dubVideoUrl:'',vipUrl:'',servers:[]});rebuildEpForm();}
function remEp(i){epL.splice(i,1);rebuildEpForm();}
function rebuildEpForm(){document.getElementById('epFL').innerHTML=epL.map((ep,i)=>`<div class="p-3 rounded-2" style="background:rgba(255,255,255,.04);border:1px solid var(--border)"><div class="d-flex justify-content-between align-items-center mb-2"><span style="font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Episode ${i+1}</span><button onclick="remEp(${i})" class="bi-btn r" style="width:24px;height:24px;border-radius:6px"><i class="bi bi-x" style="font-size:.76rem"></i></button></div><div class="d-flex flex-column gap-2"><input class="ci" placeholder="Episode title" value="${esc(ep.title)}" oninput="epL[${i}].title=this.value" style="font-size:.84rem"><input class="ci" type="url" placeholder="Video URL (Sub)" value="${esc(ep.videoUrl)}" oninput="epL[${i}].videoUrl=this.value" style="font-size:.84rem"><input class="ci" type="url" placeholder="Video URL (Dub) — optional" value="${esc(ep.dubVideoUrl||'')}" oninput="epL[${i}].dubVideoUrl=this.value" style="font-size:.84rem"><input class="ci" type="url" placeholder="⭐ VIP URL" value="${esc(ep.vipUrl||'')}" oninput="epL[${i}].vipUrl=this.value" style="font-size:.84rem;border-color:rgba(245,158,11,.2)"></div></div>`).join('');}

/* SAVE FILM */
async function saveFilm(){
  const ti=document.getElementById('fTi').value.trim();const ds=document.getElementById('fDs').value.trim();const th=thB64||document.getElementById('fTh').value.trim();
  if(!ti||!ds||!th){toast(t('fillAll'),'e');return;}
  const cg=document.getElementById('fGnC').value.split(',').map(g=>g.trim()).filter(Boolean);
  const genres=[...new Set([...selGenres,...cg])];
  const cast=document.getElementById('fCst').value.split(',').map(c=>c.trim()).filter(Boolean);
  const data={title:ti,description:ds,thumbnailUrl:th,type:fType,version:fVer,category:document.getElementById('fCat').value,
    year:parseInt(document.getElementById('fYr').value)||new Date().getFullYear(),
    rating:parseFloat(document.getElementById('fRat').value)||null,
    duration:parseInt(document.getElementById('fDur').value)||null,
    language:document.getElementById('fLng').value.trim(),director:document.getElementById('fDir').value.trim(),
    cast,genres,trailer:document.getElementById('fTrl').value.trim(),
    views:editF?.views||0,};
  if(fType==='movie'){data.videoUrl=document.getElementById('fVid').value.trim();data.dubVideoUrl=document.getElementById('fDubVid').value.trim();data.vipUrl=document.getElementById('fVip').value.trim();data.servers=xSvrs.filter(s=>s.url);data.episodes=[];}
  else{data.videoUrl='';data.dubVideoUrl='';data.vipUrl='';data.servers=[];data.episodes=epL.filter(e=>e.title||e.videoUrl);}
  const btn=document.getElementById('savBtn');btn.disabled=true;btn.innerHTML='<i class="bi bi-hourglass-split"></i> Saving...';
  try{if(editF?.id){await updateDoc(doc(db,'films',editF.id),{...data,updatedAt:serverTimestamp()});toast(t('updated'));}else{await addDoc(collection(db,'films'),{...data,createdAt:serverTimestamp(),addedBy:user?.uid||''});toast(t('added'));}closeMdl();}
  catch(e){console.error(e);toast(e.message||'Error saving','e');}
  finally{btn.disabled=false;btn.innerHTML=t('save');}
}

/* CONTACT */
async function sendContact(){
  const name=document.getElementById('ctName').value.trim();const email=document.getElementById('ctEmail').value.trim();const subj=document.getElementById('ctSubject').value;const msg=document.getElementById('ctMsg').value.trim();
  if(!name||!email||!msg){toast('Please fill all fields','w');return;}
  try{
    await addDoc(collection(db,'contact'),{name,email,subject:subj,message:msg,createdAt:serverTimestamp(),read:false});
    toast('Message sent! We\'ll get back to you soon. ✉️');
    ['ctName','ctEmail','ctMsg'].forEach(id=>document.getElementById(id).value='');document.getElementById('ctSubject').value='';
  }catch(e){
    // Fallback: open email client
    window.open(`mailto:${ADMIN}?subject=${encodeURIComponent(subj||'CineVerse Contact')}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${msg`)}`);
    toast('Opening email client...','i');
  }
}

/* LANG */
function toggleLang(){lang=lang==='en'?'ku':'en';localStorage.setItem('cv_lang',lang);document.documentElement.dir=lang==='ku'?'rtl':'ltr';document.body.classList.toggle('rtl',lang==='ku');document.getElementById('langBtn').textContent=lang==='en'?'کوردی':'EN';applyLang();renderCurPg();}
function applyLang(){document.querySelectorAll('[data-k]').forEach(el=>{const k=el.dataset.k;if(T[lang][k])el.textContent=T[lang][k];});const si=document.getElementById('srchIn');if(si)si.placeholder=t('featured');}

/* INIT */
document.getElementById('fyear').textContent=new Date().getFullYear();
if(lang==='ku'){document.documentElement.dir='rtl';document.body.classList.add('rtl');}
document.getElementById('langBtn').textContent=lang==='en'?'کوردی':'EN';
if(!FB.apiKey||FB.apiKey==='YOUR_KEY')document.getElementById('cfg').style.display='';
nav('home');

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import { getAuth,GoogleAuthProvider,signInWithPopup,signOut as fbOut,onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { getFirestore,collection,doc,getDoc,setDoc,addDoc,updateDoc,deleteDoc,
  onSnapshot,query,orderBy,limit,serverTimestamp,arrayUnion,arrayRemove,getDocs,increment }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

/* ── CONFIG ── */
const FB = {
  apiKey:"AIzaSyCOq-h8IPakpUSi22rMHSgNSrrPtafjMWc",
  authDomain:"cineverse-61fab.firebaseapp.com",
  projectId:"cineverse-61fab",
  storageBucket:"cineverse-61fab.firebasestorage.app",
  messagingSenderId:"937731122165",
  appId:"1:937731122165:web:3567d97dd45e74e169b6bc"
};
const ADMIN_EMAIL = 'abdulrahmanawl90@gmail.com';
// Optional: Firebase Functions resolver endpoint (set after you deploy functions)
// Example:
// const RESOLVER_ENDPOINT = 'https://us-central1-<your-project>.cloudfunctions.net/resolve';
const RESOLVER_ENDPOINT = '';
// Optional: Firebase Functions contact endpoint
// const CONTACT_ENDPOINT = 'https://us-central1-<your-project>.cloudfunctions.net/contact';
const CONTACT_ENDPOINT = '';
const GENRES = ['Action','Adventure','Animation','Anime','Comedy','Crime','Documentary','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Thriller','War','Western','Biography','Family','Musical','Sport','K-Drama','Kurdish','Arabic','English'];

const app = initializeApp(FB);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/* ── STATE ── */
let user=null, prof=null, films=[], allUsers=[];
let page='home', params={};
let lang = localStorage.getItem('cv_lang')||'en';
let editingFilm=null, filmType='movie', thumbMode='url', thumbBase64=null;
let extraServers=[], epList=[];
let selectedGenres=[], filterType='all', filterGenre='all';
let userFavs=[], userLater=[], userWatched=[], userEpWatched={};
let listTab='fav';

/* ── TRANSLATIONS ── */
const T={en:{watchNow:'Watch Now',details:'Details',back:'Back',backToDetails:'Back',synopsis:'Synopsis',
episodes:'Episodes',comments:'Comments',addComment:'Add a comment...',post:'Post',
signIn:'Sign In',signOut:'Sign Out',noContent:'Nothing here yet',addFirst:'Add your first film',
contentMgmt:'Content Management',addNew:'Add New',deleteConfirm:'Delete this film permanently?',
updated:'Updated!',added:'Added!',deleted:'Deleted!',fillAll:'Fill all required fields',
titleRequired:'Title *',descRequired:'Description *',thumbRequired:'Thumbnail *',videoRequired:'Video URL',
yearLabel:'Year',rating:'Rating',type:'Type',releaseYear:'Year',
latestMovies:'Latest Movies',latestSeries:'Latest Series',cancel:'Cancel',save:'Save',
update:'Update',addEpisode:'Add Episode',noVideo:'No video available',accessDenied:'Access Denied',
featured:'Featured',searchPlaceholder:'Search films...',noResults:'No results found',
signInToComment:'Sign in to leave a comment',
},
ku:{watchNow:'ئێستا ببینە',details:'وردەکاری',back:'گەڕانەوە',backToDetails:'گەڕانەوە',synopsis:'کورتەبیر',
episodes:'ئێپیزۆدەکان',comments:'کۆمێنتەکان',addComment:'کۆمێنتێک بنووسە...',post:'بنێرە',
signIn:'داخلبوون',signOut:'چوونەدەرەوە',noContent:'هیچ ناوەڕۆکێک نییە',addFirst:'فیلمێک زیاد بکە',
contentMgmt:'بەڕێوەبردنی ناوەڕۆک',addNew:'زیادکردنی نوێ',deleteConfirm:'دڵنیایت لە سڕینەوە؟',
updated:'نوێکراوەتەوە!',added:'زیادکرا!',deleted:'سڕایەوە!',fillAll:'خانەکان پڕ بکەرەوە',
titleRequired:'ناونیشان *',descRequired:'وەسف *',thumbRequired:'وێنە *',videoRequired:'بەستەری ڤیدیۆ',
yearLabel:'ساڵ',rating:'هەڵسەنگاندن',type:'جۆر',releaseYear:'ساڵ',
latestMovies:'دواتازەترین فیلمەکان',latestSeries:'دواتازەترین زنجیرەکان',cancel:'پاشگەز',save:'پاشەکەوت',
update:'نوێکردنەوە',addEpisode:'زیادکردنی ئێپیزۆد',noVideo:'ڤیدیۆیەک نییە',accessDenied:'مۆڵەت نییە',
featured:'تایبەت',searchPlaceholder:'گەڕان...',noResults:'ئەنجامێک نەدۆزرایەوە',
signInToComment:'بۆ کۆمێنت داخل بوو',
}};
const t=k=>T[lang][k]||k;

/* ── ROLES ── */
const isAdmin=()=>user?.email===ADMIN_EMAIL||prof?.role==='admin';
const isDobber=()=>isAdmin()||['admin','dobber'].includes(prof?.role||'');
const isSubscriber=()=>isAdmin()||prof?.subscriber===true||prof?.role==='subscriber';

/* ── EMBED ENGINE ── (supports 15+ hosts) */
const normalizeUrl=(raw)=>{
  if(!raw)return'';
  let u=String(raw).trim();
  // remove whitespace/newlines in copied URLs
  u=u.replace(/\s+/g,'');
  // decode once (safe best-effort)
  try{u=decodeURIComponent(u);}catch{}
  return u;
};
const embed=url=>{
  const u=normalizeUrl(url);
  if(!u)return null;
  // YouTube
  const yt=u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if(yt)return{t:'iframe',s:`https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`,n:'YouTube'};
  // Vimeo
  const vm=u.match(/vimeo\.com\/(\d+)/);
  if(vm)return{t:'iframe',s:`https://player.vimeo.com/video/${vm[1]}?autoplay=1`,n:'Vimeo'};
  // Dailymotion
  const dm=u.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if(dm)return{t:'iframe',s:`https://www.dailymotion.com/embed/video/${dm[1]}?autoplay=1`,n:'Dailymotion'};
  // Streamtape
  const st=u.match(/streamtape\.(?:com|net|to)\/(?:v|e|play)\/([a-zA-Z0-9_-]+)/);
  if(st)return{t:'iframe',s:`https://streamtape.com/e/${st[1]}/`,n:'Streamtape'};
  // Doodstream
  const dd=u.match(/dood(?:stream)?\.(?:com|watch|to|la|li|pm|re|sh|yt|ws|wf|cx)\/(?:e|d|f|p)\/([a-zA-Z0-9]+)/);
  if(dd)return{t:'iframe',s:`https://dood.li/e/${dd[1]}`,n:'Doodstream'};
  // Mixdrop
  const mx=u.match(/mixdrop\.(?:co|to|bz|ch|gl|sx|ag)\/(?:e|f)\/([a-zA-Z0-9]+)/);
  if(mx)return{t:'iframe',s:`https://mixdrop.ag/e/${mx[1]}`,n:'Mixdrop'};
  // Vidmoly
  const vml=u.match(/vidmoly\.(?:to|me|com)\/(?:embed-)?([a-zA-Z0-9]+)/);
  if(vml)return{t:'iframe',s:`https://vidmoly.to/embed-${vml[1]}.html`,n:'Vidmoly'};
  // Upstream
  const up=u.match(/upstream\.to\/(?:embed-)?([a-zA-Z0-9]+)/);
  if(up)return{t:'iframe',s:`https://upstream.to/embed-${up[1]}.html`,n:'Upstream'};
  // Filemoon
  const fm=u.match(/filemoon\.(?:sx|to|in|cc)\/e\/([a-zA-Z0-9]+)/);
  if(fm)return{t:'iframe',s:`https://filemoon.sx/e/${fm[1]}/`,n:'Filemoon'};
  // Streamwish
  const sw=u.match(/streamwish\.(?:to|com|site)\/(?:e\/)?([a-zA-Z0-9]+)/);
  if(sw)return{t:'iframe',s:`https://streamwish.to/e/${sw[1]}`,n:'Streamwish'};
  // Google Drive
  const gd=u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|uc\?export=download&id=)([a-zA-Z0-9_-]+)/);
  if(gd)return{t:'iframe',s:`https://drive.google.com/file/d/${gd[1]}/preview`,n:'Google Drive'};
  // Terabox
  if(/terabox\.com|1024tera\.com|teraboxapp\.com/i.test(u))return{t:'ext',s:u,n:'Terabox'};
  // ok.ru
  if(/ok\.ru|odnoklassniki/i.test(u)){
    const m=u.match(/ok\.ru\/(?:video|videoembed)\/([0-9]+)/i);
    if(m)return{t:'iframe',s:`https://ok.ru/videoembed/${m[1]}`,n:'OK.ru'};
    return{t:'iframe',s:u,n:'OK.ru'};
  }
  // Direct MP4/WEBM
  if(/\.(mp4|webm|ogg)(\?|$)/i.test(u))return{t:'video',s:u,n:'Direct Video'};
  // M3U8 HLS
  if(/\.m3u8(\?|$)/i.test(u))return{t:'hls',s:u,n:'HLS Stream'};
  // Fallback iframe
  return{t:'iframe',s:u,n:'External Player'};
};

/* ── RENDER PLAYER ── */
const renderPlayer=(url,el,opt={})=>{
  const e=embed(url);
  if(!e){el.innerHTML=`<div class="d-flex flex-column align-items-center justify-content-center h-100 gap-3" style="color:var(--muted);background:#07090f"><i class="bi bi-camera-video-off" style="font-size:3rem"></i><p>${t('noVideo')}</p></div>`;return;}
  if(e.t==='iframe'){
    el.innerHTML=`<iframe src="${e.s}" allowfullscreen allow="autoplay;fullscreen;picture-in-picture;encrypted-media" referrerpolicy="no-referrer" style="width:100%;height:100%;border:none"></iframe>`;
    const iframe=el.querySelector('iframe');
    let done=false;
    const ok=()=>{if(done)return;done=true;opt?.onSuccess?.(e);};
    const fail=()=>{if(done)return;done=true;opt?.onFail?.(e);};
    const to=setTimeout(async()=>{
      if(RESOLVER_ENDPOINT&&opt?.allowResolve!==false){
        try{
          const r=await fetch(`${RESOLVER_ENDPOINT}?url=${encodeURIComponent(e.s)}`,{method:'GET'});
          if(r.ok){
            const j=await r.json();
            if(j?.url&&j.url!==e.s){
              return renderPlayer(j.url,el,{...opt,allowResolve:false});
            }
          }
        }catch{}
      }
      fail();
    },12000);
    iframe?.addEventListener('load',()=>{clearTimeout(to);ok();},{once:true});
  }
  else if(e.t==='video'){
    el.innerHTML=`<video src="${e.s}" controls autoplay style="width:100%;height:100%;background:#000"></video>`;
    const v=el.querySelector('video');
    v?.addEventListener('canplay',()=>opt?.onSuccess?.(e),{once:true});
    v?.addEventListener('error',()=>opt?.onFail?.(e),{once:true});
  }
  else if(e.t==='hls'){
    el.innerHTML=`<video id="hlsVid" controls autoplay style="width:100%;height:100%;background:#000"></video>`;
    const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
    s.onload=()=>{const v=document.getElementById('hlsVid');if(typeof Hls!=='undefined'&&Hls.isSupported()){const h=new Hls();h.loadSource(e.s);h.attachMedia(v);h.on(Hls.Events.MANIFEST_PARSED,()=>v.play());}else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=e.s;v.play();}};
    document.head.appendChild(s);
  } else {
    el.innerHTML=`<div class="d-flex flex-column align-items-center justify-content-center h-100 gap-4 p-4 text-center" style="background:#07090f">
      <div style="width:72px;height:72px;border-radius:50%;background:rgba(225,29,72,.1);border:2px solid rgba(225,29,72,.25);display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:var(--red)"><i class="bi bi-box-arrow-up-right"></i></div>
      <div><p style="font-weight:700;margin-bottom:.4rem">${e.n} cannot be embedded</p>
      <p style="color:var(--muted);font-size:.82rem;max-width:340px">This video host blocks embedding. Open it in a new tab.</p></div>
      <a href="${e.s}" target="_blank" rel="noopener" class="btn-primary-cv"><i class="bi bi-box-arrow-up-right"></i> Open ${e.n}</a></div>`;
    opt?.onFail?.(e);
  }
};

/* ── UTILS ── */
const timeAgo=ts=>{if(!ts)return'';const d=ts.toDate?ts.toDate():new Date(ts);const s=Math.floor((Date.now()-d.getTime())/1000);if(s<60)return lang==='ku'?'ئێستا':'just now';if(s<3600)return lang==='ku'?`${Math.floor(s/60)}خ`:`${Math.floor(s/60)}m ago`;if(s<86400)return lang==='ku'?`${Math.floor(s/3600)}س`:`${Math.floor(s/3600)}h ago`;return lang==='ku'?`${Math.floor(s/86400)}ر`:`${Math.floor(s/86400)}d ago`;};
const toast=(msg,type='success')=>{const c=document.getElementById('toasts');const el=document.createElement('div');el.className=`toast-cv ${type}`;el.innerHTML=`${type==='success'?'<i class="bi bi-check-circle-fill"></i>':type==='error'?'<i class="bi bi-x-circle-fill"></i>':type==='warn'?'<i class="bi bi-exclamation-triangle-fill"></i>':''} ${msg}`;c.appendChild(el);setTimeout(()=>{el.style.animation='none';el.style.opacity='0';el.style.transition='opacity .25s';setTimeout(()=>el.remove(),250)},3200);};
const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Track views (debounced per film per day)
async function trackView(filmId){
  if(!filmId)return;
  const d=new Date();
  const dayKey=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const k=`cv_view_${filmId}`;
  if(localStorage.getItem(k)===dayKey)return;
  localStorage.setItem(k,dayKey);
  try{
    await updateDoc(doc(db,'films',filmId),{views:increment(1)});
  }catch(e){
    console.warn('trackView failed',e?.message||e);
  }
}

/* ── EXPOSE GLOBALS ── */
Object.assign(window,{navigate,signIn,signOut,openModal,closeModal,saveFilm,deleteFilm,
  toggleLang,toggleMobNav,closeMobNav,setType,setThumbTab,previewThumb,handleThumbFile,
  addEpisode,removeEpisode,addExtraServer,removeExtraServer,postComment,deleteComment,
  changeUserRole,toggleUserSub,watchEp,setFilter,setListTab,toggleFav,toggleWatchLater,
  toggleWatched,markEpWatched,onSearch,sendContactEmail});

/* ── AUTH ── */
async function signIn(){
  try{await signInWithPopup(auth,provider);toast(t('signIn'),'success');}
  catch(e){
    if(e.code==='auth/unauthorized-domain')showAuthHelp();
    else toast(e.message,'error');
  }
}
async function signOut(){await fbOut(auth);navigate('home');toast(t('signOut'),'info');}

function showAuthHelp(){
  const dom=window.location.hostname;
  const m=document.createElement('div');
  m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:1rem';
  m.innerHTML=`<div style="max-width:520px;width:100%;background:#0d1017;border:1px solid rgba(225,29,72,.3);border-radius:22px;padding:2rem">
    <h3 style="font-family:var(--display);font-size:1.6rem;letter-spacing:.06em;text-transform:uppercase;margin-bottom:1rem">🔒 Firebase Auth Error</h3>
    <p style="color:rgba(255,255,255,.65);font-size:.88rem;line-height:1.7;margin-bottom:1rem">Your domain <code style="background:rgba(225,29,72,.12);color:var(--red);padding:2px 8px;border-radius:5px">${dom}</code> is not whitelisted in Firebase.</p>
    <ol style="color:rgba(255,255,255,.6);font-size:.85rem;line-height:2;padding-left:1.25rem;margin-bottom:1.25rem">
      <li>Go to <a href="https://console.firebase.google.com/project/cineverse-61fab/authentication/settings" target="_blank" style="color:#60a5fa">Firebase Console → Auth → Settings</a></li>
      <li>Click <b style="color:#fff">Authorized domains → Add domain</b></li>
      <li>Add: <code style="background:rgba(255,255,255,.08);padding:2px 8px;border-radius:5px;color:#4ade80">${dom}</code></li>
    </ol>
    <div class="d-flex gap-2">
      <a href="https://console.firebase.google.com/project/cineverse-61fab/authentication/settings" target="_blank" class="btn-primary-cv" style="flex:1;justify-content:center;font-size:.84rem;text-decoration:none"><i class="bi bi-box-arrow-up-right"></i> Open Console</a>
      <button onclick="this.closest('div[style]').remove()" class="btn-secondary-cv" style="padding:.7rem 1.2rem;font-size:.84rem">Close</button>
    </div></div>`;
  document.body.appendChild(m);
}

onAuthStateChanged(auth,async u=>{
  user=u;
  if(u){
    const ref=doc(db,'users',u.uid);
    const snap=await getDoc(ref);
    if(snap.exists()){
      prof=snap.data();
      if(u.email===ADMIN_EMAIL&&prof.role!=='admin'){await updateDoc(ref,{role:'admin'});prof.role='admin';}
    } else {
      prof={uid:u.uid,email:u.email||'',displayName:u.displayName||'',photoURL:u.photoURL||'',
        role:u.email===ADMIN_EMAIL?'admin':'viewer',subscriber:false,createdAt:serverTimestamp()};
      await setDoc(ref,prof);
    }
    await loadUserLists();
  } else {prof=null;userFavs=[];userLater=[];userWatched=[];userEpWatched={};}
  renderUserArea();
  updateNavVis();
  if(page==='profile')renderProfile();
  if(page==='mylist')renderMyList();
  if(page==='film')renderDetailUserActions();
});

async function loadUserLists(){
  if(!user)return;
  const ref=doc(db,'users',user.uid);
  const snap=await getDoc(ref);
  if(snap.exists()){
    const d=snap.data();
    userFavs=d.favs||[];userLater=d.later||[];userWatched=d.watched||[];userEpWatched=d.epWatched||{};
  }
}

function renderUserArea(){
  const el=document.getElementById('userArea');
  if(user){
    el.innerHTML=`<div class="user-avatar" onclick="navigate('profile')"><img src="${user.photoURL||''}" alt="" referrerpolicy="no-referrer"></div>`;
  } else {
    el.innerHTML=`<button class="btn-primary-cv" onclick="signIn()" style="padding:.38rem 1rem;font-size:.78rem"><i class="bi bi-google"></i> ${t('signIn')}</button>`;
  }
}

function updateNavVis(){
  const d=isDobber(),a=isAdmin();
  const show=(id,v)=>{const e=document.getElementById(id);if(e)e.style.cssText=v?'':'display:none!important'};
  show('nl-manage',d);show('nl-admin',a);show('nl-mylist',!!user);show('navAddBtn',d);
  show('mobManage',d);show('mobAdmin',a);show('mobMyList',!!user);
  const ab=document.getElementById('addMovieBtn');if(ab)ab.style.cssText=d?'':'display:none!important';
  const as=document.getElementById('addSeriesBtn');if(as)as.style.cssText=d?'':'display:none!important';
  const ha=document.getElementById('emptyAddBtn');if(ha)ha.style.display=d?'':'none';
  const deb=document.getElementById('detailEditBtn');if(deb)deb.style.display=d?'':'none';
  const uap=document.getElementById('userActionsPanel');if(uap)uap.style.display=user?'':'none';
}

/* ── FILMS LISTENER ── */
const fq=query(collection(db,'films'),orderBy('createdAt','desc'),limit(300));
onSnapshot(fq,snap=>{
  films=snap.docs.map(d=>({id:d.id,...d.data()}));
  document.getElementById('loader').style.display='none';
  buildGenreFilters();
  renderCurrentPage();
  updateNavVis();
},err=>console.error(err));

/* ── NAVIGATION ── */
function navigate(pg,p={}){
  page=pg;params=p;
  document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));
  const el=document.getElementById(`pg-${pg}`);
  if(el)el.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  const nl=document.getElementById(`nl-${pg}`);
  if(nl)nl.classList.add('active');
  else document.getElementById('nl-home')?.classList.add('active');
  closeMobNav();
  window.scrollTo(0,0);
  renderCurrentPage();
  applyLang();
}

function renderCurrentPage(){
  switch(page){
    case'home':renderHome();break;
    case'film':renderDetail();break;
    case'watch':renderWatch();break;
    case'profile':renderProfile();break;
    case'premium':renderPremium();break;
    case'contact':renderContact();break;
    case'manage':renderManage();break;
    case'admin':renderAdmin();break;
    case'mylist':renderMyList();break;
  }
}

function renderPremium(){/* static page */}
function renderContact(){/* static page */}

function sendContactEmail(){
  const name=document.getElementById('cName')?.value?.trim()||'';
  const email=document.getElementById('cEmail')?.value?.trim()||'';
  const subject=document.getElementById('cSubject')?.value?.trim()||'';
  const msg=document.getElementById('cMessage')?.value?.trim()||'';
  if(CONTACT_ENDPOINT){
    fetch(CONTACT_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,email,subject,message:msg})
    }).then(r=>r.ok?toast('Sent!','success'):toast('Send failed','error')).catch(()=>toast('Send failed','error'));
    return;
  }
  const s=encodeURIComponent(subject||'CineVerse Contact');
  const body=encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${msg}`);
  window.location.href=`mailto:${ADMIN_EMAIL}?subject=${s}&body=${body}`;
}

// ... (rest of original inline code remains identical in index.html for now)

/* ── INIT ── */
document.getElementById('footerYear').textContent=new Date().getFullYear();
if(lang==='ku'){document.documentElement.dir='rtl';document.body.classList.add('rtl');}
document.getElementById('langBtn').textContent=lang==='en'?'کوردی':'EN';
navigate('home');

