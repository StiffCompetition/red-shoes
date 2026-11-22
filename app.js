(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var LS={get:function(k,d){try{var v=localStorage.getItem("rs."+k);return v?JSON.parse(v):d}catch(e){return d}},set:function(k,v){try{localStorage.setItem("rs."+k,JSON.stringify(v))}catch(e){}}};

/* ---------- language ---------- */
var lang=LS.get("lang",null)||(function(){var l=(navigator.language||"en").slice(0,2);return I18N[l]?l:"en"})();
function T(k,v){var s=(I18N[lang]&&I18N[lang][k]!=null)?I18N[lang][k]:I18N.en[k];if(s==null)return k;if(typeof s==="string"&&v){Object.keys(v).forEach(function(x){s=s.replace("{"+x+"}",v[x])})}return s}
function typeLabel(t){var m=I18N[lang].t[t]||I18N.en.t[t];return m||String(t||"").replace(/_/g," ")}

/* ---------- interests ---------- */
var INTERESTS=[
 {k:"lgbtq",e:"",m:[["lgbtq","primary|yes|only"],["gay","yes"]]},
 {k:"beer",e:"",m:[["craft","brewery|beer"],["microbrewery","yes"],["shop","beer"],["amenity","biergarten"],["brewery",".+"]]},
 {k:"music",e:"🎸",m:[["amenity","music_venue|concert_hall|nightclub"]]},
 {k:"history",e:"🏛️",m:[["tourism","museum|gallery"],["amenity","theatre|arts_centre"],["historic","monument|castle|memorial|ruins|archaeological_site|fort|manor|city_gate"]]},
 {k:"nature",e:"🌳",m:[["leisure","park|nature_reserve|garden"],["natural","waterfall|beach|peak"],["waterway","waterfall"],["route","hiking|foot"],["highway","trailhead"]]},
 {k:"food",e:"🍽️",m:[["amenity","restaurant|cafe|food_court|pub|biergarten"]],extra:'["opening_hours"]'},
 {k:"active",e:"🏃",m:[["leisure","sports_centre|stadium|water_park|ice_rink|golf_course|marina"]]},
 {k:"shopping",e:"🛍️",m:[["amenity","marketplace"],["shop","mall|department_store"]]},
 {k:"photo",e:"📸",m:[["tourism","viewpoint|attraction"],["man_made","tower|lighthouse"],["building","cathedral|castle"]]},
 {k:"wellness",e:"🧘",m:[["natural","hot_spring"],["leisure","spa|sauna"],["amenity","public_bath"]]},
 {k:"secrets",e:"",m:[["tourism","artwork"],["historic","wayside_shrine|tomb|bunker|cannon|ruins|battlefield"],["man_made","tunnel|water_tower|windmill|watermill"]]}
];
var ORDER=["music","history","nature","food","beer","lgbtq","secrets","photo","active","shopping","wellness"];
var IBYK={};INTERESTS.forEach(function(d){IBYK[d.k]=d;d.re=d.m.map(function(p){return [p[0],new RegExp("^("+p[1]+")$")]})});
function classify(t,cats){for(var i=0;i<cats.length;i++){var d=cats[i];for(var j=0;j<d.re.length;j++){var v=t[d.re[j][0]];if(v&&d.re[j][1].test(v)){var ty=v;if(d.k==="lgbtq")ty="lgbtq";else if(d.k==="beer")ty=(t.craft==="brewery"||t.microbrewery==="yes"||t.brewery)?"brewery":"beerbar";else if(d.k==="secrets"&&t.tourism==="artwork")ty="artwork";return {cat:d.k,type:ty}}}}return null}

var PLANS={
 rushed:{n:8,slots:[["act","09:00"],["act","10:30"],["food","12:30"],["act","14:00"],["act","15:30"],["act","17:00"],["food","19:00"],["eve","21:00"]]},
 balanced:{n:6,slots:[["act","09:30"],["act","11:00"],["food","12:45"],["act","14:30"],["act","16:00"],["food","19:00"]]},
 chill:{n:4,slots:[["act","10:30"],["food","12:45"],["act","15:00"],["food","19:00"]]},
 verychill:{n:2,slots:[["act","11:00"],["food","13:00"]]}
};
var DAYCOL=["#d62b2b","#1f6fb2","#e0a21b","#1c9a78","#6a4fc2","#0f2a47","#e0662b"];

/* ---------- state ---------- */
var S={profile:LS.get("profile",null),trip:null,cands:[],items:[],days:[],wx:{},sel:"all",blocked:new Set(),wiz:{step:1,draft:null}};
var map,layer,markers={};

/* ---------- navigation ---------- */
function show(v){
  $$(".view").forEach(function(x){x.classList.toggle("on",x.id==="view-"+v)});
  $$("#tabs button").forEach(function(b){b.classList.toggle("on",b.dataset.nav===v)});
  if(v==="plan"&&map)setTimeout(function(){map.invalidateSize()},50);
  if(v==="profile")renderWizard();
  if(v==="about")renderAbout();
  try{history.replaceState(null,"",v==="plan"?location.pathname+location.search+(location.hash.indexOf("q=")>-1?location.hash:""):"#"+v)}catch(e){}
}
document.addEventListener("click",function(e){var n=e.target.closest("[data-nav]");if(n){e.preventDefault();if(!S.profile&&n.dataset.nav==="plan"){show("profile");return}show(n.dataset.nav)}});

/* ---------- static text ---------- */
function applyStatic(){
  document.documentElement.lang=lang;
  $$("[data-t]").forEach(function(el){el.textContent=T(el.dataset.t)});
  $$("[data-tp]").forEach(function(el){el.placeholder=T(el.dataset.tp)});
  $("#langSel").value=lang;
  renderProfileCard();renderOut();renderAbout();
  if($("#view-profile").classList.contains("on"))renderWizard();
}
$("#langSel").addEventListener("change",function(){lang=this.value;LS.set("lang",lang);applyStatic();if(S.items.length)renderOut()});

/* ---------- about ---------- */
function renderAbout(){$("#about").innerHTML="<h1>"+esc(T("about_h"))+"</h1><p><b>"+esc(T("tagline"))+"</b></p>"+T("about_p").map(function(p){return "<p>"+esc(p)+"</p>"}).join("")+'<p class="muted">&copy; OpenStreetMap contributors &middot; Open-Meteo</p>'}

/* ---------- profile wizard ---------- */
function newDraft(){var p=S.profile;var d=p?JSON.parse(JSON.stringify(p)):{interests:[],pace:"balanced",budget:["free","mid"],dislikes:[]};d.fav=d.fav||[];d.more=d.more||{};d.name=d.name||"";d.sub=d.sub||[];d.extra=d.extra||"";return d}
var SUBS={music:["music_venue","nightclub","concert_hall"],history:["museum","gallery","monument","castle"],nature:["park","garden","waterfall","beach","peak","hiking","trailhead"],food:["restaurant","cafe","food_court"],beer:["brewery","beerbar"],lgbtq:["gay_bar","gay_club","gay_sauna","gay_cafe"],secrets:["artwork","ruins","tunnel","water_tower","windmill","bunker","tomb"],photo:["viewpoint","attraction","tower","lighthouse"],active:["sports_centre","stadium","water_park","ice_rink","golf_course"],shopping:["marketplace","mall","department_store"],wellness:["spa","sauna","hot_spring","public_bath"]};
function kindL(t){t=t||{};var a=t.amenity||"",l=t.leisure||"";if(/^(bar|pub|biergarten)$/.test(a))return "gay_bar";if(a==="nightclub"||l==="nightclub")return "gay_club";if(/^(sauna|spa)$/.test(l)||a==="spa"||t.shop==="massage")return "gay_sauna";if(/^(cafe|restaurant|fast_food)$/.test(a))return "gay_cafe";return "gay_other"}
function subOK(cat,type){var o=SUBS[cat],sp=(S.profile&&S.profile.sub)||[];if(!o)return true;var sel=sp.filter(function(x){return o.indexOf(x)>-1});return !sel.length||sel.indexOf(type)>-1}
function subUI(d){
  var h="",rows=ORDER.filter(function(k){return SUBS[k]&&d.interests.indexOf(k)>-1});
  if(rows.length){h+='<div class="subs"><div class="muted">'+esc(T("narrow"))+"</div>"+rows.map(function(k){return '<div class="subrow"><b>'+esc(T("int_"+k))+'</b><div class="chips">'+SUBS[k].map(function(t){return '<button type="button" class="chip'+(d.sub.indexOf(t)>-1?" on":"")+'" data-sub="'+t+'">'+esc(typeLabel(t))+"</button>"}).join("")+"</div></div>"}).join("")+"</div>"}
  h+='<label class="nmf extra"><span>'+esc(T("extra_l"))+'</span><input id="pextra" maxlength="40" placeholder="'+esc(T("extra_ph"))+'" value="'+esc(d.extra||"")+'"></label>';
  return h;
}
function renderWizard(){
  if(!S.wiz.draft)S.wiz.draft=newDraft();
  var d=S.wiz.draft,s=S.wiz.step,h='<div class="wiz"><div class="stepno">'+esc(T("step",{n:s}))+'</div>';
  if(s===1){
    h+="<h1>"+esc(T("wiz_title"))+'</h1><label class="nmf"><span>'+esc(T("ask_name"))+'</span><input id="pname" maxlength="24" autocomplete="given-name" value="'+esc(d.name||"")+'"></label><h2>'+esc(T("q1"))+'</h2><div class="muted">'+esc(T("q1h"))+'</div><div class="grid">'+ORDER.map(function(k){var i=IBYK[k],on=d.interests.indexOf(k)>-1,fv=(d.fav||[]).indexOf(k)>-1;return '<button type="button" class="opt card'+(on?" on":"")+'" data-int="'+k+'"><span class="icw">'+ico(k,46)+'</span><span class="ct"><b>'+esc(T("int_"+k))+"</b><small>"+esc(T("im_"+k))+"</small></span>"+(on?'<span class="fav'+(fv?" on":"")+'" data-fav="'+k+'" role="button" aria-label="favourite">&#9733;</span>':"")+"</button>"}).join("")+"</div>"+(d.interests.length?'<div class="muted fvh">'+esc(T("fav_hint"))+"</div>":"");
    h+=subUI(d);
  }else if(s===2){
    h+="<h2>"+esc(T("q2"))+'</h2><div class="col">'+["rushed","balanced","chill","verychill"].map(function(p){return '<button type="button" class="opt'+(d.pace===p?" on":"")+'" data-pace="'+p+'"><span><b>'+esc(T("pace_"+p))+"</b><small>"+esc(T("pace_"+p+"_d"))+"</small></span></button>"}).join("")+"</div>";
  }else if(s===3){
    h+="<h2>"+esc(T("q3"))+'</h2><div class="muted">'+esc(T("q3h"))+'</div><div class="col">'+["free","mid","splurge"].map(function(b){return '<button type="button" class="opt'+(d.budget.indexOf(b)>-1?" on":"")+'" data-bud="'+b+'"><span><b>'+esc(T("bud_"+b))+"</b><small>"+esc(T("bud_"+b+"_d"))+"</small></span></button>"}).join("")+"</div>";
  }else{
    h+="<h2>"+esc(T("q4"))+'</h2><div class="muted">'+esc(T("q4h"))+'</div><div class="col">'+["crowds","commercial","loud"].map(function(x){return '<button type="button" class="opt'+(d.dislikes.indexOf(x)>-1?" on":"")+'" data-dis="'+x+'"><span><b>'+esc(T("dis_"+x))+"</b></span></button>"}).join("")+"</div>";
  }
  h+='<div class="warn" id="wwarn"></div><div class="wizbtns"><button class="btn" id="wBack"'+(s===1?" disabled":"")+">"+esc(T("back"))+'</button><button class="btn pri" id="wNext">'+esc(s===4?T("save"):T("next"))+"</button></div></div>";
  $("#wizard").innerHTML=h;
}
$("#wizard").addEventListener("input",function(e){if(e.target.id==="pname"&&S.wiz.draft)S.wiz.draft.name=e.target.value.trim();if(e.target.id==="pextra"&&S.wiz.draft)S.wiz.draft.extra=e.target.value.trim()});
$("#wizard").addEventListener("click",function(e){
  var d=S.wiz.draft,b=e.target.closest("button");if(!b||!d)return;
  var fb=e.target.closest("[data-fav]");if(fb){var k=fb.dataset.fav,fi=d.fav.indexOf(k);if(fi>-1)d.fav.splice(fi,1);else{if(d.fav.length>=3)d.fav.shift();d.fav.push(k)}renderWizard();return}
  function tog(a,v){var i=a.indexOf(v);if(i>-1)a.splice(i,1);else a.push(v)}
  if(b.dataset.int){tog(d.interests,b.dataset.int);d.fav=d.fav.filter(function(x){return d.interests.indexOf(x)>-1});d.sub=d.sub.filter(function(t){return Object.keys(SUBS).some(function(k){return d.interests.indexOf(k)>-1&&SUBS[k].indexOf(t)>-1})});renderWizard();return}
  if(b.dataset.sub){tog(d.sub,b.dataset.sub);renderWizard();return}
  if(b.dataset.pace){d.pace=b.dataset.pace;renderWizard();return}
  if(b.dataset.bud){tog(d.budget,b.dataset.bud);renderWizard();return}
  if(b.dataset.dis){tog(d.dislikes,b.dataset.dis);renderWizard();return}
  if(b.id==="wBack"){S.wiz.step=Math.max(1,S.wiz.step-1);renderWizard();return}
  if(b.id==="wNext"){
    if(S.wiz.step===1&&d.interests.length<1){$("#wwarn").textContent=T("need3");return}
    if(S.wiz.step===3&&!d.budget.length)d.budget=["free"];
    if(S.wiz.step<4){S.wiz.step++;renderWizard();return}
    var pk=function(q){return q?q.interests.slice().sort().join()+"|"+(q.sub||[]).slice().sort().join()+"|"+(q.extra||"").toLowerCase():""},oldI=pk(S.profile);S.profile=d;LS.set("profile",d);S.wiz={step:1,draft:null};renderProfileCard();show("plan");
    if(S.trip&&S.days&&S.days.length&&oldI!==pk(d)){run(S.trip,S.days[0],S.days[S.days.length-1]);return}
    if(S.trip&&S.cands.length){rebuild()}
  }
});
function styleLabel(p){var f=(p.fav||[]).concat(p.interests.filter(function(k){return (p.fav||[]).indexOf(k)<0})).slice(0,2);return f.length<2?T("style_1",{a:T("st_"+f[0])}):T("style_t",{a:T("st_"+f[0]),b:T("st_"+f[1])})}
function greet(p){return p.name?T("hi",{n:p.name}):T("yours")}
function boost(c,p){return ((p.fav||[]).indexOf(c.cat)>-1?1.5:0)+(p.more&&p.more[c.cat]||0)}
function renderProfileCard(){
  var el=$("#profileCard");if(!S.profile){el.hidden=true;return}
  var p=S.profile;el.hidden=false;
  el.innerHTML='<div class="t"><b>'+esc(greet(p))+'</b><span class="stl">'+esc(styleLabel(p))+'</span><span class="ics">'+p.interests.map(function(k){return ico(k,22)}).join("")+"</span>"+" &middot; "+esc(T("pace_"+p.pace))+" &middot; "+p.budget.map(function(b){return esc(T("bud_"+b))}).join(", ")+'</div><button class="btn" data-nav="profile">'+esc(T("edit"))+"</button>";
}

/* ---------- helpers ---------- */
function fmtDate(d){var x=new Date(d+"T12:00:00");return x.toLocaleDateString(lang,{weekday:"short",day:"numeric",month:"short"})}
function iso(d){var m=d.getMonth()+1,dd=d.getDate();return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(dd<10?"0":"")+dd}
function dayList(a,b){var out=[],x=new Date(a+"T12:00:00"),y=new Date(b+"T12:00:00");while(x<=y&&out.length<7){out.push(iso(x));x.setDate(x.getDate()+1)}return out}
function hav(a,b,c,d){var R=6371,t=Math.PI/180,dl=(c-a)*t,dn=(d-b)*t,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a*t)*Math.cos(c*t)*Math.sin(dn/2)*Math.sin(dn/2);return 2*R*Math.asin(Math.sqrt(x))}
function fmtKm(k){return k<1?Math.round(k*1000)+" m":k.toFixed(1)+" km"}
function toast(m){var t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(function(){t.hidden=true},2200)}
var PROG=null;
function stopProg(){if(PROG){clearInterval(PROG.t);PROG=null}}
function beginProg(){
  if(PROG)return;
  var s=$("#status"),t0=Date.now(),i=0,keys=["p1","p2","p3","p4"];
  s.hidden=false;s.className="status prog";
  s.innerHTML='<div class="progtxt" id="progTxt"></div><div class="progbar"><i></i><span class="progshoe"><img class="foot f1" src="img/shoe1.png" alt=""><img class="foot f2" src="img/shoe1.png" alt=""></span></div><div class="progsub" id="progSub"></div>';
  function tick(){
    var sec=(Date.now()-t0)/1000,el=$("#progTxt");if(!el){stopProg();return}
    var k=keys[Math.min(Math.floor(sec/3.5),keys.length-1)];
    if(sec>14)k="p_slow";
    el.textContent=T(k);
    $("#progSub").textContent=Math.floor(sec)+" s";
  }
  tick();PROG={t:setInterval(tick,500)};
}
function setStatus(m,err){var s=$("#status");stopProg();if(!m){s.hidden=true;return}s.hidden=false;s.className="status"+(err?" err":"");s.textContent=m}

/* ---------- data: places ---------- */
var BADNAME=/\b(adult|nude|nudist|xxx|strip|stripper|erotic|swinger|sex|massage parlou?r|brothel|escort)\b/i;
function isBad(t){return /^(brothel|stripclub|adult_gaming_centre)$/.test(t.amenity||"")||/adult/.test(t.leisure||"")||t.disused||t["disused:amenity"]||t.abandoned||t.access==="private"||t.access==="no"||BADNAME.test(t.name||"")}
function oq(lat,lon,r,cats,limit){
  var parts=[];cats.forEach(function(d){d.m.forEach(function(p){parts.push("nwr(around:"+r+","+lat+","+lon+')["'+p[0]+'"~"^('+p[1]+')$"]["name"]'+(d.extra||"")+";")})});
  return "[out:json][timeout:20];("+parts.join("")+");out center tags "+limit+";"
}
var OVP=["https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://maps.mail.ru/osm/tools/overpass/api/interpreter","https://overpass.openstreetmap.fr/api/interpreter"];
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function ovOne(u,q,ms,ctl){
  var tm=setTimeout(function(){ctl.abort()},ms);
  return fetch(u,{method:"POST",body:"data="+encodeURIComponent(q),headers:{"Content-Type":"application/x-www-form-urlencoded"},signal:ctl.signal}).then(function(r){
    clearTimeout(tm);if(!r.ok)throw new Error("HTTP "+r.status);return r.json();
  }).then(function(j){
    if(j.remark&&/error|timed out|memory/i.test(j.remark)&&!(j.elements&&j.elements.length))throw new Error("remark");
    return j.elements||[];
  },function(e){clearTimeout(tm);throw e});
}
/* hedged requests: start server 1 now, others 2.5 s apart; first good answer wins; hard stop at ~30 s */
function overpassRound(q,ms){
  return new Promise(function(resolve,reject){
    var ctls=[],done=false,fails=0,last,timers=[];
    function finish(){done=true;timers.forEach(clearTimeout);ctls.forEach(function(c){try{c.abort()}catch(e){}})}
    OVP.forEach(function(u,k){
      timers.push(setTimeout(function(){
        if(done)return;var ctl=new AbortController();ctls.push(ctl);
        ovOne(u,q,ms,ctl).then(function(els){if(!done){finish();resolve(els)}},function(e){last=e;fails++;if(!done&&fails>=OVP.length){finish();reject(last)}});
      },k*2500));
    });
  });
}
async function overpass(q){
  var err;
  for(var round=0;round<2;round++){
    try{return await overpassRound(q,round?12000:16000)}catch(e){err=e}
    await sleep(800);
  }
  throw err;
}
function wantsL(cats){return (cats||[]).some(function(d){return d.k==="lgbtq"})}
function isGay(t,n){t=t||{};return t.gay==="yes"||/^(primary|only|yes)$/.test(t.lgbtq||"")||/\b(gay|lgbt|lgbtq|queer|bear bar|gaysauna)\b/i.test(n||"")}
function norm(el,cats){
  var t=el.tags||{};if(isBad(t))return null;
  var gay=isGay(t,t.name),I=(S.profile&&S.profile.interests)||[],wantL=I.indexOf("lgbtq")>-1;
  if(gay&&!wantL)return null;
  var c=classify(t,cats);if(!c)return null;
  if(wantL&&!gay&&/^(pub|bar|nightclub|biergarten|brewery|beerbar)$/.test(c.type))return null;
  if(wantL){
    var O=I.filter(function(k){return /^(wellness|beer|music|food|shopping|active)$/.test(k)});
    if(O.length){
      if(gay){
        var oc=cats.filter(function(d){return d.k!=="lgbtq"&&O.indexOf(d.k)>-1}),c2=classify(t,oc);
        if(!c2&&O.indexOf("beer")>-1&&/^(bar|pub|biergarten|nightclub)$/.test(t.amenity||""))c2={cat:"beer",type:"beerbar"};
        if(!c2&&O.indexOf("music")>-1&&/^(nightclub|bar)$/.test(t.amenity||""))c2={cat:"music",type:"nightclub"};
        if(!c2||!subOK("lgbtq",kindL(t)))return null;c=c2;
      }else if(/^(wellness|beer|music|food|shopping|active)$/.test(c.cat))return null;
    }
  }
  if(!subOK(c.cat,c.cat==="lgbtq"?kindL(t):c.type))return null;
  var lat=el.lat!=null?el.lat:(el.center&&el.center.lat),lon=el.lon!=null?el.lon:(el.center&&el.center.lon);if(lat==null)return null;
  return {id:el.type+"/"+el.id,name:t["name:"+lang]||t.name,lat:lat,lon:lon,cat:c.cat,type:c.type,tags:t,src:"osm",url:t.website||t["contact:website"]||""};
}
function scoreOf(c,p){
  var t=c.tags||{},s=1;
  if(c.cat==="secrets"){s+=1.5+(t.tourism==="artwork"?1:0)}else{if(t.wikidata)s+=3;if(t.wikipedia)s+=2}if(t.website||t["contact:website"])s+=.5;if(t.opening_hours)s+=.5;if(t.image||t.wikimedia_commons)s+=.5;
  if(p.interests.indexOf(c.cat)>-1)s+=1.5;
  if(c.cat==="nature"){if(/^(hiking|trailhead|peak|waterfall)$/.test(c.type))s+=2.5;else if(c.type==="park")s-=.5}
  var free=p.budget.indexOf("free")>-1,paid=p.budget.indexOf("mid")>-1||p.budget.indexOf("splurge")>-1;
  if(t.fee==="no"||c.cat==="nature")s+=free?1:0;
  if(t.fee==="yes"&&!paid)s-=2;
  if(p.budget.length===1&&p.budget[0]==="free"&&c.cat==="shopping")s-=1;
  if(p.dislikes.indexOf("crowds")>-1&&t.tourism==="attraction"&&t.wikidata)s-=1.5;
  if(p.dislikes.indexOf("commercial")>-1&&(t.brand||t.shop||t.operator&&/ltd|inc|corp/i.test(t.operator)))s-=2;
  if(p.dislikes.indexOf("loud")>-1&&/^(nightclub|pub|biergarten)$/.test(c.type))s-=3;
  return s;
}
function hasCache(lat,lon,p){try{var c=JSON.parse(localStorage.getItem("rs_pl4_"+lat.toFixed(2)+"_"+lon.toFixed(2)+"_"+p.interests.slice().sort().join("")+"_"+(p.sub||[]).slice().sort().join("")+"_"+(p.extra||"").toLowerCase())||"null");return !!(c&&Date.now()-c.t<864e5&&c.d.length)}catch(e){return false}}
async function loadPlaces(lat,lon,p){
  lat=+lat;lon=+lon;var ck="rs_pl4_"+lat.toFixed(2)+"_"+lon.toFixed(2)+"_"+p.interests.slice().sort().join("")+"_"+(p.sub||[]).slice().sort().join("")+"_"+(p.extra||"").toLowerCase();
  try{var c=JSON.parse(localStorage.getItem(ck)||"null");if(c&&Date.now()-c.t<864e5&&c.d.length)return c.d.map(function(x){x.score=scoreOf(x,p)+(x.cat==="food"&&p.interests.indexOf("food")>-1?1:0);return x})}catch(e){}
  var res=await loadPlacesLive(lat,lon,p);
  if(!res.partial&&res.length)try{localStorage.setItem(ck,JSON.stringify({t:Date.now(),d:res}))}catch(e){}
  return res;
}
var lateHook=null;
async function loadPlacesLive(lat,lon,p,wide){
  var want=INTERESTS.filter(function(d){return p.interests.indexOf(d.k)>-1&&d.k!=="food"});
  var food=IBYK.food,all=want.concat([food]),groups=want.map(function(d){return [d]}).concat([[food]]);
  var seen={},results=[],pending=groups.length,deadline=false,hook=lateHook;
  function conv(els){var o=[];els.forEach(function(el){var c=norm(el,all);if(c&&!seen[c.id]){seen[c.id]=1;c.score=scoreOf(c,p)+(c.cat==="food"&&p.interests.indexOf("food")>-1?1:0);o.push(c)}});return o}
  function q(g){var nat=g[0].k==="nature";return overpass(oq(lat,lon,wide?(nat?45000:20000):(nat?30000:8000),g,wide?600:(g[0]===food?250:300)))}
  var ps=groups.map(function(g){
    return q(g).catch(function(){return sleep(2500).then(function(){return q(g)})}).catch(function(){return sleep(5000).then(function(){return q(g)})}).then(function(els){
      var c=conv(els);pending--;
      if(deadline){if(hook&&hook===lateHook&&c.length)hook(c)}else results=results.concat(c);
      return true;
    },function(){pending--;return false});
  });
  await Promise.race([Promise.all(ps),sleep(24000)]);
  if(!results.length){
    var first=new Promise(function(res){ps.forEach(function(pr){pr.then(function(ok){if(ok)res("ok")})})});
    var w=await Promise.race([Promise.all(ps).then(function(a){return a.some(Boolean)?"ok":"fail"}),first]);
    if(w==="fail")throw new Error("busy");
  }
  deadline=true;
  var out=results.slice();out.partial=pending>0;
  return out;
}

/* ---------- data: events (optional) ---------- */
var SEG={"Music":"music","Sports":"active","Arts & Theatre":"history"};
function tmPrice(r){var p=r&&r[0];if(!p||p.min==null)return "";var c=p.currency||"";return (p.max!=null&&p.max>p.min?Math.round(p.min)+"-"+Math.round(p.max):String(Math.round(p.min)))+" "+c}
var FREE_T=/^(hiking|trailhead|park|nature_reserve|garden|waterfall|beach|peak|viewpoint|artwork|monument|memorial|ruins|marketplace|cathedral|lighthouse|attraction)$/;
var TIER={cafe:"$",food_court:"$",pub:"$$",beerbar:"$$",brewery:"$$",biergarten:"$$",restaurant:"$$",museum:"$$",gallery:"$",theatre:"$$",arts_centre:"$",castle:"$$",fort:"$",tower:"$$",hot_spring:"$$",spa:"$$$",sauna:"$$",public_bath:"$$",music_venue:"$$",concert_hall:"$$$",nightclub:"$$",lgbtq:"$$",sports_centre:"$$",stadium:"$$$",water_park:"$$$",ice_rink:"$$",golf_course:"$$$",mall:"$",department_store:"$$"};
var BEST={viewpoint:"b_sunset",park:"b_morning",garden:"b_morning",nature_reserve:"b_morning",beach:"b_morning",waterfall:"b_morning",peak:"b_morning",hiking:"b_morning",trailhead:"b_morning",museum:"b_wkam",gallery:"b_wkam",castle:"b_wkam",fort:"b_wkam",monument:"b_day",tower:"b_sunset",attraction:"b_wkam",lighthouse:"b_sunset",cathedral:"b_morning",marketplace:"b_morning",mall:"b_wkpm",department_store:"b_wkpm",cafe:"b_morning",pub:"b_eve",beerbar:"b_eve",brewery:"b_eve",biergarten:"b_eve",lgbtq:"b_eve",gay_bar:"b_eve",nightclub:"b_late",music_venue:"b_late",theatre:"b_eve",concert_hall:"b_eve",spa:"b_wkpm",sauna:"b_wkpm",hot_spring:"b_wkam",public_bath:"b_wkpm",artwork:"b_day",ruins:"b_day",windmill:"b_day",water_tower:"b_day"};
function bestOf(it){if(it.src==="tm"||it.src==="event")return "";return BEST[it.type]||""}
function priceOf(it){var t=it.tags||{};if(it.price)return T("from_p",{p:it.price});if(t.charge&&String(t.charge).length<30)return T("entry_p",{p:t.charge});if(t.fee==="yes")return T("paid_tag");if(t.fee==="no")return T("free_tag");if(it.src==="event")return "";if(FREE_T.test(it.type||"")&&t.fee!=="yes")return T("free_tag");if(TIER[it.type])return T("typ_p",{p:TIER[it.type]});return ""}
async function loadEvents(lat,lon,from,to,p){
  var key=window.RS_CONFIG&&window.RS_CONFIG.ticketmasterKey;if(!key)return [];
  try{
    var u="https://app.ticketmaster.com/discovery/v2/events.json?apikey="+encodeURIComponent(key)+"&latlong="+lat+","+lon+"&radius=25&unit=km&startDateTime="+from+"T00:00:00Z&endDateTime="+to+"T23:59:59Z&size=100&sort=date,asc";
    var r=await fetch(u);if(!r.ok)return [];var j=await r.json();var ev=(j._embedded&&j._embedded.events)||[],out=[];
    ev.forEach(function(e){
      var seg=e.classifications&&e.classifications[0]&&e.classifications[0].segment&&e.classifications[0].segment.name,cat=SEG[seg];
      if(!cat||p.interests.indexOf(cat)<0)return;
      var st=e.dates&&e.dates.status&&e.dates.status.code;if(/cancel|postpone|offsale/i.test(st||""))return;
      if(BADNAME.test(e.name||"")||/18\+|adult/i.test(e.name||""))return;
      var v=e._embedded&&e._embedded.venues&&e._embedded.venues[0],loc=v&&v.location;if(!loc)return;
      out.push({id:"tm/"+e.id,name:e.name,lat:+loc.latitude,lon:+loc.longitude,cat:cat,type:"event",tags:{},src:"tm",url:e.url,date:e.dates.start.localDate,evtime:(e.dates.start.localTime||"").slice(0,5),score:6,venue:v.name,price:tmPrice(e.priceRanges)});
    });
    return out;
  }catch(e){return []}
}

/* ---------- data: weather ---------- */
async function loadWeather(lat,lon,from,to){
  try{
    var r=await fetch("https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lon+"&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date="+from+"&end_date="+to);
    if(!r.ok)return {};var j=await r.json(),o={},d=j.daily;if(!d||!d.time)return {};
    d.time.forEach(function(t,i){o[t]={code:d.weathercode[i],hi:Math.round(d.temperature_2m_max[i]),lo:Math.round(d.temperature_2m_min[i]),pop:d.precipitation_probability_max[i]||0}});
    return o;
  }catch(e){return {}}
}
function wxIcon(c){return c===0?"☀️":c<=3?"⛅":c<=48?"🌫️":c<=67?"🌧️":c<=77?"❄️":c<=82?"🌦️":"⛈️"}

/* ---------- geocode ---------- */
async function geocode(q){
  var r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&accept-language="+lang+"&q="+encodeURIComponent(q));
  if(!r.ok)throw new Error("geo");var j=await r.json();
  return j.map(function(x){return {name:x.display_name,lat:+x.lat,lon:+x.lon}});
}

/* ---------- agenda builder ---------- */
var BT={b_morning:["09:30",function(h){return h<=12?2:h>=15?-3:0}],b_sunset:["17:45",function(h){return h>=16.5?2:h<16?-3:0}],b_eve:["18:30",function(h){return h>=17?2:h<15?-3:0}],b_late:["22:00",function(h){return h>=20?2:h<18?-4:0}],b_wkam:["10:00",function(h){return h<=12?1.5:h>=16?-2:0}],b_wkpm:["15:00",function(h){return h>=13&&h<=17?1:h<11?-1.5:0}],b_day:["11:00",function(h){return h>=19?-2:0}]};
function hrOf(t){var a=String(t).split(":");return +a[0]+(+a[1]||0)/60}
function timeFit(c,t){var b=bestOf(c);return b&&BT[b]?BT[b][1](hrOf(t)):0}
function build(){
  var p=S.profile,plan=PLANS[p.pace],center=[S.trip.lat,S.trip.lon],used=new Set(S.blocked),items=[];(S.manual||[]).forEach(function(m){used.add(m.id)});
  S.cands.forEach(function(c){if(c.b0==null)c.b0=c.score;c.score=c.b0+boost(c,p)});
  var slots=plan.slots.slice();if(p.pace!=="verychill")slots.push(["sec",p.pace==="rushed"?"20:00":"17:30"]);
  var nA=S.cands.filter(function(c){return !c.date&&c.cat!=="food"&&!used.has(c.id)}).length,nF=S.cands.filter(function(c){return !c.date&&c.cat==="food"&&!used.has(c.id)}).length,qA=Math.ceil(nA/S.days.length),qF=Math.ceil(nF/S.days.length);
  S.days.forEach(function(d,di){
    var wx=S.wx[d],rain=wx&&wx.pop>=60,prev=center,cc={},last=null,day=[],gA=0,gF=0,parks=0;
    slots.forEach(function(sl){
      var kind=sl[0];if(kind==="food"&&!day.some(function(x){return x.cat!=="food"}))return;if(kind==="food"?gF>=qF&&nF>0:gA>=qA&&nA>0&&!S.cands.some(function(c){return c.date===d&&!used.has(c.id)}))return;
      var pool=S.cands.filter(function(c){
        if(used.has(c.id))return false;if(c.date&&c.date!==d)return false;
        if(kind!=="food"&&c.type==="park"&&parks>=1&&S.cands.some(function(h){return /^(hiking|trailhead|peak|waterfall)$/.test(h.type)&&!used.has(h.id)}))return false;
        if(kind==="food")return c.cat==="food"&&!c.date;
        if(kind==="eve")return c.cat!=="food";
        if(kind==="sec")return c.cat!=="food"&&(c.cat==="secrets"||!(c.tags&&c.tags.wikidata));
        return c.cat!=="food";
      });
      var best=null,bv=-1e9;
      pool.forEach(function(c){
        var v=c.score+(c.date?3:0)-hav(prev[0],prev[1],c.lat,c.lon)*0.7-((cc[c.cat]||0)>=Math.ceil(plan.n/3)&&kind!=="food"?2:0)-(last&&last.cat===c.cat&&kind!=="food"?1.5:0)-(rain&&(c.cat==="nature"||c.cat==="active")?3:0)+(kind==="eve"&&c.cat==="music"?2:0)+(kind==="sec"&&c.cat==="secrets"?3:0)+(c.evtime?0:timeFit(c,sl[1]));
        if(v>bv){bv=v;best=c}
      });
      if(!best)return;
      used.add(best.id);cc[best.cat]=(cc[best.cat]||0)+1;last=best;
      if(best.type==="park")parks++;
      if(best.cat==="food")gF++;else if(!best.date)gA++;
      var it=Object.assign({},best,{time:best.evtime||(timeFit(best,sl[1])<0?BT[bestOf(best)][0]:sl[1]),dayIdx:di,day:d,distPrev:hav(prev[0],prev[1],best.lat,best.lon),surprise:kind==="sec"});
      day.push(it);prev=[best.lat,best.lon];
    });
    (S.manual||[]).filter(function(m){return m.di===di&&!S.blocked.has(m.id)}).forEach(function(m){var c=S.cands.filter(function(x){return x.id===m.id})[0];if(c)day.push(Object.assign({},c,{time:m.time,dayIdx:di,day:d,distPrev:0,surprise:false}))});
    day.sort(function(a,b){return a.time<b.time?-1:a.time>b.time?1:0});
    day.forEach(function(x,i){x.n=i+1});
    items=items.concat(day);
  });
  S.items=items;
}
function rebuild(){build();renderOut();drawMap()}

/* ---------- render agenda ---------- */
function ideasHTML(){
  if(!S.trip||!S.items)return "";
  var inUse=new Set(S.items.map(function(x){return x.id}));
  var pool=S.cands.filter(function(c){return !inUse.has(c.id)&&!S.blocked.has(c.id)&&!c.date});
  var h='<div class="ideas"><h2>'+esc(T("ideas_h"))+'</h2><div class="muted">'+esc(T("ideas_sub"))+"</div>";
  ORDER.forEach(function(k){
    var g=pool.filter(function(c){return c.cat===k}).sort(function(a,b){return b.score-a.score}).slice(0,8);
    if(!g.length)return;
    h+='<h3 class="igh">'+ico(k,18)+" "+esc(T("int_"+k))+"</h3>";
    g.forEach(function(c){
      var open=S.addId===c.id,pr=priceOf(c),bt=bestOf(c);
      h+='<div class="idea'+(open?" open":"")+'"><div class="irow"><div><span class="nm">'+esc(c.name)+'</span><div class="meta">'+esc(typeLabel(c.type))+(pr?" &middot; "+esc(pr):"")+(bt?" &middot; "+esc(T("best_p",{w:T(bt)})):"")+'</div></div><button type="button" class="btn sm" data-addopen="'+esc(c.id)+'">'+esc(T("add_sched"))+"</button></div>";
      if(open){h+='<div class="addf"><select class="ad">'+S.days.map(function(d,i){return '<option value="'+i+'">'+esc(T("day",{n:i+1}))+" &middot; "+esc(fmtDate(d))+"</option>"}).join("")+'</select><input class="at" type="time" value="'+(bt&&BT[bt]?BT[bt][0]:"12:00")+'"><button type="button" class="btn pri sm" data-addgo="'+esc(c.id)+'">'+esc(T("add_go"))+'</button><button type="button" class="btn sm" data-addcancel="1">'+esc(T("add_cancel"))+"</button></div>"}
      h+="</div>";
    });
  });
  h+='<button type="button" class="btn pri" data-sm="1" style="margin-top:12px">'+esc(T("sm_btn"))+"</button></div>";
  return h;
}
async function searchMore(){
  if(!S.trip||S.moreBusy)return;S.moreBusy=true;
  var st=$("#status");st.hidden=false;st.className="status";st.textContent=T("sm_busy");
  try{
    var res=await loadPlacesLive(S.trip.lat,S.trip.lon,S.profile,true),n0=S.cands.length;
    S.cands=dedupe(S.cands.concat(res));rebuild();
    setStatus("");var s2=$("#status");s2.hidden=false;s2.className="status";s2.textContent=T("sm_done",{n:S.cands.length-n0});
  }catch(e){setStatus(T("data_fail"),true)}
  S.moreBusy=false;
}
function renderOut(){
  var out=$("#out");
  if(!S.trip||!S.items){out.innerHTML='<div class="empty"><img class="hero" src="img/shoes.png" alt="" width="160" height="115"><h2>'+esc(T("empty_title"))+"</h2><p>"+esc(T("empty_text"))+"</p></div>";return}
  var h='<div class="dtabs"><button data-day="all" class="'+(S.sel==="all"?"on":"")+'">'+esc(T("all_days"))+"</button>"+S.days.map(function(d,i){return '<button data-day="'+i+'" class="'+(S.sel===i?"on":"")+'">'+esc(T("day",{n:i+1}))+"</button>"}).join("")+'</div><div class="tools"><button id="shareBtn">'+esc(T("share"))+'</button><button id="printBtn">'+esc(T("print"))+"</button></div>";
  if(S.items.length<6)h+='<div class="status">'+esc(T("few"))+"</div>";
  S.days.forEach(function(d,di){
    if(S.sel!=="all"&&S.sel!==di)return;
    var wx=S.wx[d],its=S.items.filter(function(x){return x.dayIdx===di});
    h+='<div class="dayhead"><h2>'+esc(T("day",{n:di+1}))+' <span class="muted" style="font-size:14px;font-weight:400">'+esc(fmtDate(d))+"</span></h2>"+(wx?'<span class="wx">'+wxIcon(wx.code)+" "+wx.hi+"° / "+wx.lo+"°</span>":"")+"</div>";
    if(wx&&wx.pop>=60)h+='<div class="rainnote">'+esc(T("rain"))+"</div>";
    if(!its.length)h+='<div class="status" style="margin:8px 0">'+esc(T("none_day"))+"</div>";
    its.forEach(function(it){
      var t=it.tags||{};
      h+='<div class="item" data-id="'+esc(it.id)+'"><div class="num" style="background:'+DAYCOL[di%DAYCOL.length]+'">'+it.n+'</div><div class="b"><div class="t1"><span class="time">'+esc(it.time)+'</span><span class="nm">'+esc(it.name)+"</span>"+(it.surprise?'<span class="tag sur">'+esc(T("surprise"))+"</span>":"")+(t.fee==="no"?'<span class="tag">'+esc(T("free_tag"))+"</span>":"")+'</div><div class="meta">'+ico(it.cat,16)+(isGay(t,it.name)&&it.cat!=="lgbtq"?ico("lgbtq",16):"")+" "+esc(typeLabel(it.type))+(it.venue?" &middot; "+esc(it.venue):"")+(it.distPrev>0.05?" &middot; "+esc(T("away",{d:fmtKm(it.distPrev)})):"")+(priceOf(it)?' &middot; <b class="pr">'+esc(priceOf(it))+"</b>":"")+(bestOf(it)?" &middot; <b class=\"bt\">"+esc(T("best_p",{w:T(bestOf(it))}))+"</b>":"")+'</div>'+(t.opening_hours?'<div class="hrs">'+esc(T("hours_l"))+": "+esc(t.opening_hours.slice(0,140))+"</div>":"")+'<div class="fresh">'+esc(it.src==="tm"?T("src_tm"):it.src==="wiki"?T("src_wiki"):T("src_osm"))+'</div><div class="acts"><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination='+it.lat+","+it.lon+'">'+esc(T("directions"))+"</a>"+(it.url?'<a target="_blank" rel="noopener" href="'+esc(it.url)+'">'+esc(T("website"))+"</a>":"")+(BOOKTYPE.test(it.type||"")&&it.src!=="tm"?bookUrls(it).map(function(b){return '<a class="book" target="_blank" rel="sponsored noopener" href="'+esc(b[1])+'">'+esc(T("book"))+" "+esc(b[0])+"</a>"}).join(""):"")+'<button data-more="'+esc(it.cat)+'">'+esc(T("more"))+"</button>"+'<button data-skip="'+esc(it.id)+'">'+esc(T("skip"))+"</button></div></div></div>";
    });
  });
  if(/class="pr"/.test(h))h+='<div class="fresh" style="margin:10px 0">'+esc(T("price_guide"))+"</div>";
  h+=ideasHTML();
  out.innerHTML=h;
}
$("#out").addEventListener("click",function(e){
  var b=e.target.closest("button"),a=e.target.closest("a");
  if(b&&b.dataset.day!=null){S.sel=b.dataset.day==="all"?"all":+b.dataset.day;renderOut();drawMap();return}
  if(b&&b.dataset.more){var pr=S.profile;pr.more=pr.more||{};pr.more[b.dataset.more]=Math.min(3,(pr.more[b.dataset.more]||0)+1);LS.set("profile",pr);S.blocked.clear&&0;rebuild();return}
  if(b&&b.dataset.skip){S.blocked.add(b.dataset.skip);S.manual=(S.manual||[]).filter(function(m){return m.id!==b.dataset.skip});rebuild();return}
  if(b&&b.dataset.addopen){S.addId=b.dataset.addopen;renderOut();var ar=$("#out").querySelector(".idea.open");if(ar)ar.scrollIntoView({block:"center"});return}
  if(b&&b.dataset.addcancel!=null){S.addId=null;renderOut();return}
  if(b&&b.dataset.addgo){var row=b.closest(".idea"),di=+row.querySelector(".ad").value,tm=row.querySelector(".at").value||"12:00";S.manual=(S.manual||[]).filter(function(m){return m.id!==b.dataset.addgo});S.manual.push({id:b.dataset.addgo,di:di,time:tm});S.addId=null;S.sel=di;rebuild();return}
  if(b&&b.dataset.sm!=null){searchMore();return}
  if(b&&b.id==="shareBtn"){shareLink();return}
  if(b&&b.id==="printBtn"){window.print();return}
  if(a)return;
  var it=e.target.closest(".item");if(it){var m=markers[it.dataset.id];if(m){map.setView(m.getLatLng(),Math.max(map.getZoom(),15));m.openPopup();if(window.innerWidth<=760){var mc=$(".mapcol");if(mc)mc.scrollIntoView({block:"center",behavior:"smooth"})}if(0)$(".planwrap").classList.add("mapmode")}}
});

/* ---------- map ---------- */
function initMap(){
  map=L.map("map",{zoomControl:true}).setView([43.6532,-79.3832],12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}).addTo(map);
  layer=L.layerGroup().addTo(map);
}
function drawMap(){
  layer.clearLayers();markers={};if(!S.trip)return;
  var pts=[];
  S.days.forEach(function(d,di){
    if(S.sel!=="all"&&S.sel!==di)return;
    var its=S.items.filter(function(x){return x.dayIdx===di}),col=DAYCOL[di%DAYCOL.length],line=[];
    its.forEach(function(it){
      var ic=L.divIcon({className:"",html:'<div class="rs-pin" style="background:'+col+';width:26px;height:26px">'+it.n+(isGay(it.tags,it.name)&&it.cat!=="lgbtq"?'<span class="rs-pb">'+ico("lgbtq",12)+"</span>":"")+"</div>",iconSize:[26,26],iconAnchor:[13,13]});
      var m=L.marker([it.lat,it.lon],{icon:ic}).addTo(layer);
      m.bindPopup("<b>"+esc(it.name)+"</b><br>"+esc(typeLabel(it.type))+" &middot; "+esc(it.time));
      m.on("click",function(){var el=$('.item[data-id="'+it.id+'"]');if(el){$$(".item.hl").forEach(function(x){x.classList.remove("hl")});el.classList.add("hl");el.scrollIntoView({block:"center",behavior:"smooth"})}});
      markers[it.id]=m;pts.push([it.lat,it.lon]);line.push([it.lat,it.lon]);
    });
    if(line.length>1)L.polyline(line,{color:col,weight:3,opacity:.55,dashArray:"6 6"}).addTo(layer);
  });
  L.circleMarker([S.trip.lat,S.trip.lon],{radius:5,color:"#0f2a47",fillColor:"#fff",fillOpacity:1}).addTo(layer);
  if(pts.length)map.fitBounds(pts,{padding:[40,40],maxZoom:16});else map.setView([S.trip.lat,S.trip.lon],13);
}

/* ---------- run a trip ---------- */

/* ---------- data: Wikipedia GeoSearch (fast first source) ---------- */
var WCAT=[
 ["music",/(music|concert|nightclub|jazz|opera house|club de|sala de concierto)/,"music_venue"],
 ["history",/(museum|mus[eé]e|museo|gallery|galer[ií]e|galer[ií]a|cathedral|cath[eé]drale|catedral|church|[eé]glise|iglesia|basilica|basilique|basílica|chapel|temple|mosque|synagogue|castle|ch[aâ]teau|castillo|fort\b|fortress|palace|palais|palacio|monument|memorial|historic|historique|hist[oó]rico|archaeolog|ruins|theatre|theater|th[eé][aâ]tre|teatro|library|biblioth[eè]que|biblioteca|national historic|heritage)/,"monument"],
 ["nature",/(park\b|parc\b|parque|garden|jardin|jard[ií]n|nature reserve|r[eé]serve|reserva|beach|plage|playa|waterfall|chute|cascada|mountain|montagne|monta[nñ]a|hill\b|island|[iî]le\b|isla|lake|lac\b|lago|river|forest|zoo|botanical)/,"park"],
 ["active",/(stadium|stade|estadio|arena|sports|ice rink|golf|velodrome|racetrack)/,"stadium"],
 ["shopping",/(market|march[eé]|mercado|shopping|mall|centre commercial|department store)/,"marketplace"],
 ["photo",/(tower|tour\b|torre|bridge|pont\b|puente|lighthouse|phare|faro|viewpoint|skyscraper|gratte-ciel|rascacielos|square|place\b|plaza|landmark|fountain|statue|observation|clock)/,"attraction"]
];
var WBAD=/(school|[eé]cole|escuela|university|universit[eé]|universidad|college|hospital|h[oô]pital|hotel|h[oô]tel|street|rue\b|calle|avenue|road|station|gare|estaci[oó]n|neighbou?rhood|quartier|barrio|district|borough|arrondissement|municipality|village|city\b|ville\b|ciudad|metro|subway|airport|company|corporation|apartment|condominium|residential|office|bank\b|shopping street|county|province|region)/;

/* ---------- Photon (Komoot): OpenStreetMap search on separate servers, fast ---------- */
var PQ={nature:["park","hiking trail","mirador"],beer:["brewery","craft beer"],lgbtq:["gay bar","lgbtq bar"],secrets:["street art","mural"],food:["restaurant"],music:["live music"],history:["museum"],photo:["viewpoint"],active:["swimming pool"],shopping:["market"],wellness:["hot spring"]};
async function loadPhoton(lat,lon,p){
  try{
    var cats=INTERESTS.filter(function(d){return p.interests.indexOf(d.k)>-1||d.k==="food"});
    var terms=[];cats.forEach(function(d){(PQ[d.k]||[]).forEach(function(q){terms.push([d.k,q])})});
    (p.extra||"").split(",").slice(0,2).forEach(function(q){q=q.trim();if(q.length>2)terms.push(["extra",q])});
    if(p.interests.indexOf("lgbtq")>-1){var X={wellness:["gay sauna","gay spa"],music:["gay club"],food:["gay restaurant"],shopping:["gay shop"]};p.interests.forEach(function(k){(X[k]||[]).forEach(function(q){terms.push(["lgbtq",q])})})}
    var res=await Promise.all(terms.slice(0,10).map(function(tq){
      var ctl=new AbortController(),tm=setTimeout(function(){ctl.abort()},8000);
      return fetch("https://photon.komoot.io/api/?limit=15&lat="+lat+"&lon="+lon+"&q="+encodeURIComponent(tq[1]),{signal:ctl.signal}).then(function(r){clearTimeout(tm);return r.ok?r.json():{features:[]}}).then(function(j){return {k:tq[0],f:j.features||[]}},function(){clearTimeout(tm);return {k:tq[0],f:[]}});
    }));
    var out=[],seen={};
    res.forEach(function(x){x.f.forEach(function(f){
      var pr=f.properties||{},g=f.geometry&&f.geometry.coordinates;if(!pr.name||!g||!pr.osm_key)return;
      if(hav(lat,lon,g[1],g[0])>15)return;
      var t={name:pr.name},v=pr.osm_value;t[pr.osm_key]=v;
      if(x.k==="beer"&&/^(pub|bar|brewery|biergarten|restaurant|cafe|nightclub)$/.test(v))t.craft=v==="brewery"?"brewery":"beer";
      if(x.k==="lgbtq"&&/^(bar|pub|nightclub|club|cafe|restaurant)$/.test(v))t.lgbtq="primary";
      else if(x.k==="lgbtq"&&isGay({},pr.name))t.lgbtq="primary";
      var c=norm({type:pr.osm_type==="N"?"node":pr.osm_type==="W"?"way":"relation",id:pr.osm_id,lat:g[1],lon:g[0],tags:t},cats);
      if(!c&&x.k==="extra"&&!(p.interests.indexOf("lgbtq")<0&&isGay({},pr.name))&&p.interests.length){var ek=p.interests.filter(function(k){return k!=="lgbtq"})[0]||"secrets";c={id:"ph/"+pr.osm_id,name:pr.name,lat:g[1],lon:g[0],cat:ek,type:"attraction",tags:t,src:"photon",url:""}}
      if(c&&!seen[c.id]){seen[c.id]=1;c.src="photon";c.score=scoreOf(c,p)+(c.cat==="food"&&p.interests.indexOf("food")>-1?1:0);out.push(c)}
    })});
    return out;
  }catch(e){return []}
}
function dedupe(list){var s={},o=[];list.forEach(function(c){var k=String(c.name||"").toLowerCase().replace(/[^a-z0-9]/g,"")+"|"+c.lat.toFixed(3)+"|"+c.lon.toFixed(3);if(!s[k]){s[k]=1;o.push(c)}});return o}
/* ---------- commission links (shown only when an ID is set in config.js) ---------- */
function bookUrls(it){
  var C=window.RS_CONFIG||{},q=encodeURIComponent((it.name||"")+" "+(S.trip&&(S.trip.short||S.trip.name)||"")),o=[];
  if(C.viatorPid)o.push(["Viator","https://www.viator.com/searchResults/all?text="+q+"&pid="+encodeURIComponent(C.viatorPid)+"&mcid=42383&medium=link"]);
  if(C.gygPartnerId)o.push(["GetYourGuide","https://www.getyourguide.com/s/?q="+q+"&partner_id="+encodeURIComponent(C.gygPartnerId)+"&utm_medium=online_publisher"]);
  return o;
}
var BOOKTYPE=/^(museum|gallery|castle|fort|tower|attraction|monument|cathedral|lighthouse|ruins|waterfall|peak|hot_spring|spa|sauna|public_bath|water_park|ice_rink|theatre|arts_centre|concert_hall|stadium|garden|nature_reserve|beach|viewpoint|golf_course|sports_centre)$/;
async function loadWiki(lat,lon,p){
  try{
    var u="https://"+lang+".wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord="+lat+"%7C"+lon+"&ggsradius=9000&ggslimit=60&prop=description%7Ccoordinates&colimit=60&format=json&formatversion=2&origin=*";
    var ctl=new AbortController(),tm=setTimeout(function(){ctl.abort()},9000);
    var r=await fetch(u,{signal:ctl.signal});clearTimeout(tm);if(!r.ok)return [];
    var j=await r.json(),pages=(j.query&&j.query.pages)||[],out=[],all=INTERESTS;
    pages.forEach(function(pg){
      var d=(pg.description||"").toLowerCase(),c=pg.coordinates&&pg.coordinates[0];if(!c||!d||WBAD.test(d))return;
      if(BADNAME.test(pg.title))return;
      if(p.interests.indexOf("lgbtq")<0&&isGay({},pg.title+" "+d))return;
      for(var i=0;i<WCAT.length;i++){
        if(WCAT[i][1].test(d)){
          if(p.interests.indexOf(WCAT[i][0])<0||!subOK(WCAT[i][0],WCAT[i][2]))break;
          var it={id:"wp/"+pg.pageid,name:pg.title,lat:c.lat,lon:c.lon,cat:WCAT[i][0],type:WCAT[i][2],tags:{wikipedia:"1",wikidata:"1"},src:"wiki",url:"https://"+lang+".wikipedia.org/?curid="+pg.pageid,desc:pg.description};
          it.score=scoreOf(it,p);out.push(it);break;
        }
      }
    });
    return out;
  }catch(e){return []}
}
async function run(place,from,to,quiet){
  if(!S.profile){show("profile");return}
  var btn=$("#goBtn");btn.disabled=true;$("#alts").hidden=true;if(!quiet)beginProg();
  try{
    S.trip=place;S.days=dayList(from,to);S.blocked=new Set();S.manual=[];S.addId=null;S.sel="all";
    map.setView([place.lat,place.lon],13);
    var evP=loadEvents(place.lat,place.lon,from,to,S.profile),wxP=loadWeather(place.lat,place.lon,from,S.days[S.days.length-1]);
    var myHook=function(c){if(lateHook!==myHook)return;S.cands=dedupe(S.cands.concat(c));build();renderOut();drawMap()};lateHook=myHook;
    var osmP=loadPlaces(place.lat,place.lon,S.profile).then(function(x){return {ok:true,v:x}},function(e){return {ok:false,e:e}});
    var wk=dedupe([].concat.apply([],await Promise.all([loadPhoton(place.lat,place.lon,S.profile),loadWiki(place.lat,place.lon,S.profile)])));
    var ev=await evP;S.wx=await wxP;
    var osm=null;
    if(wk.length>=4){
      /* show Wikipedia places at once, add restaurants and more when OpenStreetMap answers */
      S.cands=wk.concat(ev);build();renderOut();drawMap();
      setStatus("");var st=$("#status");st.hidden=false;st.className="status";st.textContent=T("adding");
      osm=await osmP;
      if(osm.ok){S.cands=dedupe(osm.v.concat(wk,ev));build();renderOut();drawMap();setStatus("")}
      else setStatus(T("osm_late"));
    }else{
      osm=await osmP;
      if(!osm.ok&&!wk.length)throw osm.e;
      S.cands=dedupe((osm.ok?osm.v:[]).concat(wk,ev));build();renderOut();drawMap();setStatus("");
    }
    try{history.replaceState(null,"","#q="+encodeURIComponent(place.short||place.name)+"&lat="+place.lat.toFixed(4)+"&lon="+place.lon.toFixed(4)+"&from="+from+"&to="+to)}catch(e){}
    if(window.innerWidth<=760)$(".planwrap").classList.remove("mapmode");
  }catch(e){console.error("rs:",e&&e.message);setStatus(T("data_fail"),true)}
  btn.disabled=false;
}
$("#tripForm").addEventListener("submit",async function(e){
  e.preventDefault();
  var q=$("#where").value.trim(),f=$("#from").value,t=$("#to").value;if(!q||!f||!t)return;
  if(t<f){$("#to").value=t=f}
  beginProg();
  try{
    var g=await geocode(q);
    if(!g.length){setStatus(T("geo_fail"),true);return}
    var first=g[0];first.short=q;
    if(g.length>1){var al=$("#alts");al.hidden=false;al.innerHTML=esc(T("wrong"))+" "+g.slice(1).map(function(x,i){return '<button type="button" data-alt="'+(i+1)+'">'+esc(x.name.split(",").slice(0,2).join(","))+"</button>"}).join("");al._g=g}
    await run(first,f,t);
  }catch(err){setStatus(T("geo_fail"),true)}
});
$("#alts").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var g=this._g[+b.dataset.alt];g.short=g.name.split(",")[0];$("#where").value=g.short;run(g,$("#from").value,$("#to").value)});
$("#quick").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;$("#where").value=b.dataset.city;$("#tripForm").requestSubmit()});
$("#nearBtn").addEventListener("click",function(){
  if(!navigator.geolocation){setStatus(T("geo_fail"),true);return}
  beginProg();
  navigator.geolocation.getCurrentPosition(function(pos){
    var f=$("#from").value||iso(new Date()),t=$("#to").value||f;
    run({name:T("near"),short:T("near"),lat:pos.coords.latitude,lon:pos.coords.longitude},f,t);
  },function(){setStatus(T("geo_fail"),true)},{timeout:10000});
});
function shareLink(){var u=location.href;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(function(){toast(T("copied"))},function(){toast(u)})}else toast(u)}
$("#mtList").addEventListener("click",function(){$(".planwrap").classList.remove("mapmode");this.classList.add("on");$("#mtMap").classList.remove("on")});
$("#mtMap").addEventListener("click",function(){$(".planwrap").classList.add("mapmode");this.classList.add("on");$("#mtList").classList.remove("on");setTimeout(function(){map.invalidateSize()},50)});

/* ---------- init ---------- */
function init(){
  var td=new Date(),e=new Date();e.setDate(e.getDate()+2);
  $("#from").value=iso(td);$("#to").value=iso(e);
  $("#from").addEventListener("change",function(){if($("#to").value<this.value)$("#to").value=this.value});
  initMap();applyStatic();
  var h=location.hash.replace(/^#/,"");
  if(h.indexOf("q=")>-1){
    var o={};h.split("&").forEach(function(x){var p=x.split("=");o[p[0]]=decodeURIComponent(p[1]||"")});
    if(o.lat&&o.lon&&o.from&&o.to){$("#where").value=o.q||"";$("#from").value=o.from;$("#to").value=o.to;if(!S.profile)show("profile");}
  }else if(h==="profile"||!S.profile){show("profile")}
  else if(h==="about")show("about");
}
init();
})();

(function(){
  var mq=window.matchMedia("(max-width:760px)");
  function place(){
    var mc=document.querySelector(".mapcol"),wrap=document.querySelector(".planwrap"),side=document.getElementById("side"),out=document.getElementById("out");
    if(!mc||!wrap||!side||!out)return;
    if(mq.matches){if(mc.parentNode!==side||mc.previousElementSibling!==out)side.appendChild(mc)}
    else if(mc.parentNode!==wrap)wrap.appendChild(mc);
    setTimeout(function(){try{map.invalidateSize()}catch(e){}},80);
  }
  if(mq.addEventListener)mq.addEventListener("change",place);else mq.addListener(place);
  place();
})();
