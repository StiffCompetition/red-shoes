/* Red Shoes own icon set: navy line, red/gold/sky accents, a little hand-cut wobble */
(function(){
var N="#0f2a47",R="#d62b2b",G="#f0b429",S="#4aa8d8",W="#fff";
var P={
music:'<path d="M20 35V11l19-4v23" /><path d="M20 18l19-4" /><ellipse cx="14.5" cy="36" rx="6.5" ry="5.2" fill="'+R+'"/><ellipse cx="33.5" cy="31.5" rx="6.5" ry="5.2" fill="'+R+'"/><path d="M5 12l3 2M8 6l1 3" stroke="'+G+'"/>',
history:'<path d="M5 18L24 6l19 12z" fill="'+R+'"/><path d="M9 21v16M19 21v16M29 21v16M39 21v16" /><path d="M5 40h38M3 44h42" /><circle cx="24" cy="13" r="2" fill="'+W+'" stroke-width="1.6"/>',
nature:'<path d="M3 41L17 15l9 15 5-7 14 18z" fill="'+S+'" fill-opacity=".35"/><path d="M17 15l-4 7 4 2 3-3 3 2" fill="'+W+'"/><circle cx="37" cy="11" r="5" fill="'+G+'"/><path d="M5 41h40" />',
food:'<circle cx="24" cy="26" r="13" fill="'+W+'"/><circle cx="24" cy="26" r="7.5" fill="'+R+'" fill-opacity=".9"/><path d="M6 6v10c0 2 1 3 3 3v-3M9 6v13M12 6v10c0 2-1 3-3 3M9 19v23" /><path d="M42 6c-3 2-4 7-4 12h4V6zM42 18v24" />',
beer:'<path d="M10 14h22l-2 28H12z" fill="'+G+'"/><path d="M12 24h18" stroke-opacity=".35" /><path d="M32 18h4c4 0 5 3 5 6s-1 7-5 7h-5" /><path d="M9 14c-3-1-3-6 1-7 2-4 8-4 10-1 3-2 8-1 9 3 3 0 4 4 1 5z" fill="'+W+'"/><path d="M17 28v8M23 27v9" stroke="'+W+'" />',
lgbtq:'<path d="M4 38C4 22 13 12 24 12s20 10 20 26" stroke="'+R+'" stroke-width="3.2"/><path d="M10 38c0-12 6-20 14-20s14 8 14 20" stroke="'+G+'" stroke-width="3.2"/><path d="M16 38c0-8 3-14 8-14s8 6 8 14" stroke="'+S+'" stroke-width="3.2"/><path d="M2 40h14M32 40h14" />',
secrets:'<path d="M9 44V19c0-9 6-14 15-14s15 5 15 14v25z" fill="'+W+'"/><path d="M14 44V21c0-6 4-10 10-10s10 4 10 10v23" fill="'+N+'" fill-opacity=".1"/><circle cx="24" cy="28" r="3.4" fill="'+R+'"/><path d="M24 31l-2 7h4z" fill="'+R+'"/><path d="M40 6l1.5 3.5L45 11l-3.5 1.5L40 16l-1.5-3.5L35 11l3.5-1.5z" fill="'+G+'" stroke-width="1.6"/>',
photo:'<path d="M5 15h9l3-5h14l3 5h9v26H5z" fill="'+W+'"/><circle cx="24" cy="27" r="9" fill="'+R+'"/><circle cx="24" cy="27" r="4" fill="'+W+'" stroke-width="1.8"/><circle cx="38" cy="20" r="1.8" fill="'+G+'" stroke-width="1.4"/>',
active:'<circle cx="24" cy="28" r="15" fill="'+W+'"/><path d="M20 6h8M24 6v7" /><path d="M24 28V18" stroke="'+R+'" stroke-width="3.2"/><path d="M24 28l7 4" /><path d="M38 12l3-3" /><circle cx="24" cy="28" r="2" fill="'+N+'"/>',
shopping:'<path d="M8 17h32l-3 26H11z" fill="'+R+'"/><path d="M16 22v-6a8 8 0 0116 0v6" /><path d="M13 27h22" stroke="'+W+'" stroke-width="2" /><rect x="29" y="31" width="9" height="6" rx="1.5" fill="'+G+'" stroke-width="1.8"/>',
wellness:'<path d="M5 28h38c0 9-7 15-19 15S5 37 5 28z" fill="'+S+'" fill-opacity=".45"/><path d="M5 28h38" /><path d="M15 22c-3-3 3-5 0-9M24 22c-3-3 3-5 0-11M33 22c-3-3 3-5 0-9" stroke="'+R+'" stroke-width="3"/>'
};
window.ico=function(k,s){s=s||32;return '<svg class="ic" width="'+s+'" height="'+s+'" viewBox="0 0 48 48" fill="none" stroke="'+N+'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(P[k]||"")+'</svg>'};
})();
