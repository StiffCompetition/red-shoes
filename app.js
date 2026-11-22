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
 {k:"music",e:"🎸",m:[["amenity","music_venue|concert_hall|nightclub"]]},
 {k:"history",e:"🏛️",m:[["tourism","museum|gallery"],["amenity","theatre|arts_centre"],["historic","monument|castle|memorial|ruins|archaeological_site|fort|manor|city_gate"]]},
 {k:"nature",e:"🌳",m:[["leisure","park|nature_reserve|garden"],["natural","waterfall|beach|peak"],["waterway","waterfall"]]},
 {k:"food",e:"🍽️",m:[["amenity","restaurant|cafe|food_court|pub|biergarten"]],extra:'["opening_hours"]'},
 {k:"active",e:"🏃",m:[["leisure","sports_centre|stadium|water_park|ice_rink|golf_course|marina"]]},
 {k:"shopping",e:"🛍️",m:[["amenity","marketplace"],["shop","mall|department_store"]]},
 {k:"photo",e:"📸",m:[["tourism","viewpoint|attraction"],["man_made","tower|lighthouse"],["building","cathedral|castle"]]},
 {k:"wellness",e:"🧘",m:[["natural","hot_spring"],["leisure","spa|sauna"],["amenity","public_bath"]]}
];
var IBYK={};INTERESTS.forEach(function(d){IBYK[d.k]=d;d.re=d.m.map(function(p){return [p[0],new RegExp("^("+p[1]+")$")]})});
function classify(t,cats){for(var i=0;i<cats.length;i++){var d=cats[i];for(var j=0;j<d.re.length;j++){var v=t[d.re[j][0]];if(v&&d.re[j][1].test(v))return {cat:d.k,type:v}}}return null}

var PLANS={
 rushed:{n:8,slots:[["act","09:00"],["act","10:30"],["food","12:30"],["act","14:00"],["act","15:30"],["act","17:00"],["food","19:00"],["eve","21:00"]]},
 balanced:{n:6,slots:[["act","09:30"],["act","11:00"],["food","12:45"],["act","14:30"],["act","16:00"],["food","19:00"]]},
 chill:{n:4,slots:[["act","10:30"],["food","12:45"],["act","15:00"],["food","19:00"]]},
 verychill:{n:2,slots:[["act","11:00"],["food","13:00"]]}
};
var DAYCOL=["#ff3d81","#3a5bff","#ff8a00","#12b886","#9b5de5","#0aa5c0","#c4165a"];

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
function newDraft(){var p=S.profile;return p?JSON.parse(JSON.stringify(p)):{interests:[],pace:"balanced",budget:["free","mid"],dislikes:[]}}
function renderWizard(){
  if(!S.wiz.draft)S.wiz.draft=newDraft();
  var d=S.wiz.draft,s=S.wiz.step,h='<div class="wiz"><div class="stepno">'+esc(T("step",{n:s}))+'</div>';
  if(s===1){
    h+="<h1>"+esc(T("wiz_title"))+"</h1><h2>"+esc(T("q1"))+"</h2><div class=\"muted\">"+esc(T("q1h"))+"</div><div class=\"grid\">"+INTERESTS.map(function(i){return '<button type="button" class="opt'+(d.interests.indexOf(i.k)>-1?" on":"")+'" data-int="'+i.k+'"><span class="em">'+i.e+"</span><span>"+esc(T("int_"+i.k))+"</span></button>"}).join("")+"</div>";
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
$("#wizard").addEventListener("click",function(e){
  var d=S.wiz.draft,b=e.target.closest("button");if(!b||!d)return;
  function tog(a,v){var i=a.indexOf(v);if(i>-1)a.splice(i,1);else a.push(v)}
  if(b.dataset.int){tog(d.interests,b.dataset.int);renderWizard();return}
  if(b.dataset.pace){d.pace=b.dataset.pace;renderWizard();return}
  if(b.dataset.bud){tog(d.budget,b.dataset.bud);renderWizard();return}
  if(b.dataset.dis){tog(d.dislikes,b.dataset.dis);renderWizard();return}
  if(b.id==="wBack"){S.wiz.step=Math.max(1,S.wiz.step-1);renderWizard();return}
  if(b.id==="wNext"){
    if(S.wiz.step===1&&d.interests.length<3){$("#wwarn").textContent=T("need3");return}
    if(S.wiz.step===3&&!d.budget.length)d.budget=["free"];
    if(S.wiz.step<4){S.wiz.step++;renderWizard();return}
    S.profile=d;LS.set("profile",d);S.wiz={step:1,draft:null};renderProfileCard();show("plan");
    if(S.trip&&S.cands.length){rebuild()}
  }
});
function renderProfileCard(){
  var el=$("#profileCard");if(!S.profile){el.hidden=true;return}
  var p=S.profile;el.hidden=false;
  el.innerHTML='<div class="t"><b>'+esc(T("yours"))+"</b>"+p.interests.map(function(k){return IBYK[k].e}).join(" ")+" &middot; "+esc(T("pace_"+p.pace))+" &middot; "+p.budget.map(function(b){return esc(T("bud_"+b))}).join(", ")+'</div><button class="btn" data-nav="profile">'+esc(T("edit"))+"</button>";
}

/* ---------- helpers ---------- */
function fmtDate(d){var x=new Date(d+"T12:00:00");return x.toLocaleDateString(lang,{weekday:"short",day:"numeric",month:"short"})}
function iso(d){var m=d.getMonth()+1,dd=d.getDate();return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(dd<10?"0":"")+dd}
function dayList(a,b){var out=[],x=new Date(a+"T12:00:00"),y=new Date(b+"T12:00:00");while(x<=y&&out.length<7){out.push(iso(x));x.setDate(x.getDate()+1)}return out}
function hav(a,b,c,d){var R=6371,t=Math.PI/180,dl=(c-a)*t,dn=(d-b)*t,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a*t)*Math.cos(c*t)*Math.sin(dn/2)*Math.sin(dn/2);return 2*R*Math.asin(Math.sqrt(x))}
function fmtKm(k){return k<1?Math.round(k*1000)+" m":k.toFixed(1)+" km"}
function toast(m){var t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(function(){t.hidden=true},2200)}
function setStatus(m,err){var s=$("#status");if(!m){s.hidden=true;return}s.hidden=false;s.className="status"+(err?" err":"");s.textContent=m}

/* ---------- data: places ---------- */
var BADNAME=/\b(adult|nude|nudist|xxx|strip|stripper|erotic|swinger|sex|massage parlou?r|brothel|escort)\b/i;
function isBad(t){return /^(brothel|stripclub|adult_gaming_centre)$/.test(t.amenity||"")||/adult/.test(t.leisure||"")||t.disused||t["disused:amenity"]||t.abandoned||t.access==="private"||t.access==="no"||BADNAME.test(t.name||"")}
function oq(lat,lon,r,cats,limit){
  var parts=[];cats.forEach(function(d){d.m.forEach(function(p){parts.push("nwr(around:"+r+","+lat+","+lon+')["'+p[0]+'"~"^('+p[1]+')$"]["name"]'+(d.extra||"")+";")})});
  return "[out:json][timeout:30];("+parts.join("")+");out center tags "+limit+";"
}
var OVP=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
async function overpass(q){
  var err;
  for(var i=0;i<OVP.length;i++){
    try{var r=await fetch(OVP[i],{method:"POST",body:"data="+encodeURIComponent(q),headers:{"Content-Type":"application/x-www-form-urlencoded"}});if(!r.ok)throw new Error("HTTP "+r.status);var j=await r.json();return j.elements||[]}catch(e){err=e}
  }
  throw err;
}
function norm(el,cats){
  var t=el.tags||{};if(isBad(t))return null;
  var c=classify(t,cats);if(!c)return null;
  var lat=el.lat!=null?el.lat:(el.center&&el.center.lat),lon=el.lon!=null?el.lon:(el.center&&el.center.lon);if(lat==null)return null;
  return {id:el.type+"/"+el.id,name:t["name:"+lang]||t.name,lat:lat,lon:lon,cat:c.cat,type:c.type,tags:t,src:"osm",url:t.website||t["contact:website"]||""};
}
function scoreOf(c,p){
  var t=c.tags||{},s=1;
  if(t.wikidata)s+=3;if(t.wikipedia)s+=2;if(t.website||t["contact:website"])s+=.5;if(t.opening_hours)s+=.5;if(t.image||t.wikimedia_commons)s+=.5;
  if(p.interests.indexOf(c.cat)>-1)s+=1.5;
  var free=p.budget.indexOf("free")>-1,paid=p.budget.indexOf("mid")>-1||p.budget.indexOf("splurge")>-1;
  if(t.fee==="no"||c.cat==="nature")s+=free?1:0;
  if(t.fee==="yes"&&!paid)s-=2;
  if(p.budget.length===1&&p.budget[0]==="free"&&c.cat==="shopping")s-=1;
  if(p.dislikes.indexOf("crowds")>-1&&t.tourism==="attraction"&&t.wikidata)s-=1.5;
  if(p.dislikes.indexOf("commercial")>-1&&(t.brand||t.shop||t.operator&&/ltd|inc|corp/i.test(t.operator)))s-=2;
  if(p.dislikes.indexOf("loud")>-1&&/^(nightclub|pub|biergarten)$/.test(c.type))s-=3;
  return s;
}
async function loadPlaces(lat,lon,p){
  var want=INTERESTS.filter(function(d){return p.interests.indexOf(d.k)>-1&&d.k!=="food"});
  var food=[IBYK.food],all=want.concat(food);
  var out=[],r=6000;
  for(var pass=0;pass<2;pass++){
    var els=[];
    var a=want.length?await overpass(oq(lat,lon,r,want,500)):[];
    var b=await overpass(oq(lat,lon,r,food,250));
    els=a.concat(b);
    out=[];var seen={};
    els.forEach(function(el){var c=norm(el,all);if(c&&!seen[c.id]){seen[c.id]=1;out.push(c)}});
    if(out.length>=40||pass===1)break;
    r=14000;
  }
  out.forEach(function(c){c.score=scoreOf(c,p)+(c.cat==="food"&&p.interests.indexOf("food")>-1?1:0)});
  return out;
}

/* ---------- data: events (optional) ---------- */
var SEG={"Music":"music","Sports":"active","Arts & Theatre":"history"};
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
      out.push({id:"tm/"+e.id,name:e.name,lat:+loc.latitude,lon:+loc.longitude,cat:cat,type:"event",tags:{},src:"tm",url:e.url,date:e.dates.start.localDate,evtime:(e.dates.start.localTime||"").slice(0,5),score:6,venue:v.name});
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
function build(){
  var p=S.profile,plan=PLANS[p.pace],center=[S.trip.lat,S.trip.lon],used=new Set(S.blocked),items=[];
  S.days.forEach(function(d,di){
    var wx=S.wx[d],rain=wx&&wx.pop>=60,prev=center,cc={},last=null,day=[];
    plan.slots.forEach(function(sl){
      var kind=sl[0],pool=S.cands.filter(function(c){
        if(used.has(c.id))return false;if(c.date&&c.date!==d)return false;
        if(kind==="food")return c.cat==="food"&&!c.date;
        if(kind==="eve")return c.cat!=="food";
        return c.cat!=="food";
      });
      var best=null,bv=-1e9;
      pool.forEach(function(c){
        var v=c.score+(c.date?3:0)-hav(prev[0],prev[1],c.lat,c.lon)*0.7-((cc[c.cat]||0)>=Math.ceil(plan.n/3)&&kind!=="food"?2:0)-(last&&last.cat===c.cat&&kind!=="food"?1.5:0)-(rain&&(c.cat==="nature"||c.cat==="active")?3:0)+(kind==="eve"&&c.cat==="music"?2:0);
        if(v>bv){bv=v;best=c}
      });
      if(!best)return;
      used.add(best.id);cc[best.cat]=(cc[best.cat]||0)+1;last=best;
      var it=Object.assign({},best,{time:best.evtime||sl[1],dayIdx:di,day:d,distPrev:hav(prev[0],prev[1],best.lat,best.lon)});
      day.push(it);prev=[best.lat,best.lon];
    });
    day.sort(function(a,b){return a.time<b.time?-1:a.time>b.time?1:0});
    day.forEach(function(x,i){x.n=i+1});
    items=items.concat(day);
  });
  S.items=items;
}
function rebuild(){build();renderOut();drawMap()}

/* ---------- render agenda ---------- */
function renderOut(){
  var out=$("#out");
  if(!S.trip||!S.items){out.innerHTML='<div class="empty"><h2>'+esc(T("empty_title"))+"</h2><p>"+esc(T("empty_text"))+"</p></div>";return}
  var h='<div class="dtabs"><button data-day="all" class="'+(S.sel==="all"?"on":"")+'">'+esc(T("all_days"))+"</button>"+S.days.map(function(d,i){return '<button data-day="'+i+'" class="'+(S.sel===i?"on":"")+'">'+esc(T("day",{n:i+1}))+"</button>"}).join("")+'</div><div class="tools"><button id="shareBtn">'+esc(T("share"))+'</button><button id="printBtn">'+esc(T("print"))+"</button></div>";
  if(S.items.length<6)h+='<div class="status">'+esc(T("few"))+"</div>";
  S.days.forEach(function(d,di){
    if(S.sel!=="all"&&S.sel!==di)return;
    var wx=S.wx[d],its=S.items.filter(function(x){return x.dayIdx===di});
    h+='<div class="dayhead"><h2>'+esc(T("day",{n:di+1}))+' <span class="muted" style="font-size:14px;font-weight:400">'+esc(fmtDate(d))+"</span></h2>"+(wx?'<span class="wx">'+wxIcon(wx.code)+" "+wx.hi+"° / "+wx.lo+"°</span>":"")+"</div>";
    if(wx&&wx.pop>=60)h+='<div class="rainnote">'+esc(T("rain"))+"</div>";
    its.forEach(function(it){
      var t=it.tags||{};
      h+='<div class="item" data-id="'+esc(it.id)+'"><div class="num" style="background:'+DAYCOL[di%DAYCOL.length]+'">'+it.n+'</div><div class="b"><div class="t1"><span class="time">'+esc(it.time)+'</span><span class="nm">'+esc(it.name)+"</span>"+(t.fee==="no"?'<span class="tag">'+esc(T("free_tag"))+"</span>":"")+'</div><div class="meta">'+IBYK[it.cat].e+" "+esc(typeLabel(it.type))+(it.venue?" &middot; "+esc(it.venue):"")+(it.distPrev>0.05?" &middot; "+esc(T("away",{d:fmtKm(it.distPrev)})):"")+(t.opening_hours?" &middot; "+esc(t.opening_hours.length>40?t.opening_hours.slice(0,40)+"...":t.opening_hours):"")+'</div><div class="fresh">'+esc(it.src==="tm"?T("src_tm"):T("src_osm"))+'</div><div class="acts"><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination='+it.lat+","+it.lon+'">'+esc(T("directions"))+"</a>"+(it.url?'<a target="_blank" rel="noopener" href="'+esc(it.url)+'">'+esc(T("website"))+"</a>":"")+'<button data-skip="'+esc(it.id)+'">'+esc(T("skip"))+"</button></div></div></div>";
    });
  });
  out.innerHTML=h;
}
$("#out").addEventListener("click",function(e){
  var b=e.target.closest("button"),a=e.target.closest("a");
  if(b&&b.dataset.day!=null){S.sel=b.dataset.day==="all"?"all":+b.dataset.day;renderOut();drawMap();return}
  if(b&&b.dataset.skip){S.blocked.add(b.dataset.skip);rebuild();return}
  if(b&&b.id==="shareBtn"){shareLink();return}
  if(b&&b.id==="printBtn"){window.print();return}
  if(a)return;
  var it=e.target.closest(".item");if(it){var m=markers[it.dataset.id];if(m){map.setView(m.getLatLng(),Math.max(map.getZoom(),15));m.openPopup();if(window.innerWidth<=760)$(".planwrap").classList.add("mapmode")}}
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
      var ic=L.divIcon({className:"",html:'<div class="rs-pin" style="background:'+col+';width:26px;height:26px">'+it.n+"</div>",iconSize:[26,26],iconAnchor:[13,13]});
      var m=L.marker([it.lat,it.lon],{icon:ic}).addTo(layer);
      m.bindPopup("<b>"+esc(it.name)+"</b><br>"+esc(typeLabel(it.type))+" &middot; "+esc(it.time));
      m.on("click",function(){var el=$('.item[data-id="'+it.id+'"]');if(el){$$(".item.hl").forEach(function(x){x.classList.remove("hl")});el.classList.add("hl");el.scrollIntoView({block:"center",behavior:"smooth"})}});
      markers[it.id]=m;pts.push([it.lat,it.lon]);line.push([it.lat,it.lon]);
    });
    if(line.length>1)L.polyline(line,{color:col,weight:3,opacity:.55,dashArray:"6 6"}).addTo(layer);
  });
  L.circleMarker([S.trip.lat,S.trip.lon],{radius:5,color:"#14110f",fillColor:"#fff",fillOpacity:1}).addTo(layer);
  if(pts.length)map.fitBounds(pts,{padding:[40,40],maxZoom:16});else map.setView([S.trip.lat,S.trip.lon],13);
}

/* ---------- run a trip ---------- */
async function run(place,from,to){
  if(!S.profile){show("profile");return}
  var btn=$("#goBtn");btn.disabled=true;$("#alts").hidden=true;setStatus(T("loading"));
  try{
    S.trip=place;S.days=dayList(from,to);S.blocked=new Set();S.sel="all";
    map.setView([place.lat,place.lon],13);
    var res=await Promise.all([loadPlaces(place.lat,place.lon,S.profile),loadEvents(place.lat,place.lon,from,to,S.profile),loadWeather(place.lat,place.lon,from,S.days[S.days.length-1])]);
    S.cands=res[0].concat(res[1]);S.wx=res[2];
    build();renderOut();drawMap();setStatus("");
    try{history.replaceState(null,"","#q="+encodeURIComponent(place.short||place.name)+"&lat="+place.lat.toFixed(4)+"&lon="+place.lon.toFixed(4)+"&from="+from+"&to="+to)}catch(e){}
    if(window.innerWidth<=760)$(".planwrap").classList.remove("mapmode");
  }catch(e){setStatus(T("data_fail"),true)}
  btn.disabled=false;
}
$("#tripForm").addEventListener("submit",async function(e){
  e.preventDefault();
  var q=$("#where").value.trim(),f=$("#from").value,t=$("#to").value;if(!q||!f||!t)return;
  if(t<f){$("#to").value=t=f}
  setStatus(T("loading"));
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
  setStatus(T("loading"));
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
    if(o.lat&&o.lon&&o.from&&o.to){$("#where").value=o.q||"";$("#from").value=o.from;$("#to").value=o.to;if(S.profile){run({name:o.q,short:o.q,lat:+o.lat,lon:+o.lon},o.from,o.to)}else show("profile")}
  }else if(h==="profile"||!S.profile){show("profile")}
  else if(h==="about")show("about");
}
init();
})();
