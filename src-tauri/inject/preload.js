(()=>{function $t(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}var Li=1500;function Ri(e,t){let n=new URLSearchParams(e);if(!t||n.get("v")!==t)return;return n.get("list")||void 0}var Ut=(e)=>e.trim().replace(/\s+/g," ").toLowerCase();function Ai(e,t){if(!e?.trim()||!t?.trim())return!0;return Ut(e)===Ut(t)}function Ni(e,t){if(!e)return"new";if(e.videoId&&t.videoId){if(e.videoId!==t.videoId)return"new"}else if(e.title!==t.title||e.artist!==t.artist)return"new";return e.title!==t.title||e.artist!==t.artist||!e.videoId&&!!t.videoId||!e.coverUrl&&!!t.coverUrl||!e.album&&!!t.album||t.durationSecs>0&&Math.abs(t.durationSecs-e.durationSecs)>1?"metadata":null}var Di=400;function qi(e,t){return e-t>=Di}class st{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&qi(Date.now(),this.lastTickMs))this.emitTick(n.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",s=i?.album||"",a="";if(i?.artwork&&i.artwork.length>0){let m=i.artwork[i.artwork.length-1];if(m&&m.src)a=m.src}if(!o){let m=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(m)o=m.textContent?.trim()||""}if(!r){let m=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(m){let w=(m.textContent?.trim()||"").split("•").map((P)=>P.trim());if(r=w[0]||"",w.length>1)s=w[1]}}if(!a){let m=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(m&&m.src)a=m.src}if(a.startsWith("//"))a=`https:${a}`;if(a.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(a))a=a.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let c=t?.getVideoData?.(),l=c?.video_id||new URLSearchParams(window.location.search).get("v")||void 0;if(l&&!Ai(c?.title,i?.title)){let m=Date.now();if(this.titleMismatch?.videoId!==l)this.titleMismatch={videoId:l,sinceMs:m};if(m-this.titleMismatch.sinceMs<Li)return null}else this.titleMismatch=null;let u=0,y=0;if(t&&typeof t.getDuration==="function"){let m=t.getDuration();if(typeof m==="number"&&Number.isFinite(m)&&m>0)u=Math.floor(m)}if(t&&typeof t.getCurrentTime==="function"){let m=t.getCurrentTime();if(typeof m==="number"&&Number.isFinite(m)&&m>=0)y=Math.floor(m)}if(!u&&e&&Number.isFinite(e.duration)&&e.duration>0)u=Math.floor(e.duration);if(!y&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)y=Math.floor(e.currentTime);let f=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(f&&f.textContent){let m=f.textContent.split("/").map((v)=>v.trim());if(m.length===2){if(!y)y=$t(m[0]);if(!u)u=$t(m[1])}}if(!u){let v=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(v){let w=parseInt(v,10);if(!isNaN(w)&&w>0)u=w}}let g=e?!e.paused&&!e.ended:!1;if(!o)return null;let h=Ri(window.location.search,l)??(this.currentTrack?.videoId===l?this.currentTrack?.playlistId:void 0);return{title:o,artist:r||"Unknown Artist",album:s||void 0,coverUrl:a||void 0,durationSecs:u,currentTimeSecs:y,isPlaying:g,videoId:l,playlistId:h}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=Ni(this.currentTrack,e),n=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((i)=>i(e))}if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function at(){return document.getElementById("movie_player")}function Ft(e){for(let t of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let n=document.querySelector(t);if(!n||!("value"in n))continue;if("step"in n&&Number(n.step)>1)n.step=1;n.value=e}}function le(e){let t=at()?.getVolume?.(),n=typeof t==="number"&&Number.isFinite(t)?t:e.volume*100;return Math.max(0,Math.min(100,Math.round(n)))}function ke(e){return at()?.isMuted?.()===!0||e.muted}function xe(e,t){if(!Number.isFinite(e))return;let n=Math.max(0,Math.min(100,Math.round(e))),i=at();if(typeof i?.setVolume==="function"){if(i.setVolume(n),n>0&&i.isMuted?.())if(typeof i.unMute==="function")i.unMute();else t.muted=!1;Ft(n);return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1;Ft(n)}var jt=!1;function Qt(e){jt=e}function W(){return jt}var Gt=null;function lt(e){Gt=e}function Wt(){return Gt?.()??!1}class b{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){if(Wt())return;this.nextInYtm()}static nextInYtm(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)xe(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static getLikeStatus(){let e=document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer")?.getAttribute("like-status");return e==="LIKE"?"like":e==="DISLIKE"?"dislike":"none"}static getRepeatMode(){let e=document.querySelector("ytmusic-player-bar")?.getAttribute("repeat-mode");return e==="ALL"?"all":e==="ONE"?"one":"none"}static isShuffleOn(){return document.querySelector("ytmusic-player-bar")?.hasAttribute("shuffle-on")??!1}static toggleShuffle(){document.querySelector("ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button")?.click()}static cycleRepeat(){document.querySelector("ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button")?.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}function Vi(e,t){if(!t||typeof t!=="object"||!("ok"in t))throw Error(`Malformed response to ${e}`);let n=t;if(!n.ok)throw Error(n.error||`${e} failed`);return n.data??null}var Hi=8000,B=(e,t={},n={})=>new Promise((i,o)=>{let r=window.__TAURI__;if(!r?.event?.emit){o(Error("Tauri bridge unavailable"));return}let s=Math.random().toString(36).slice(2)+Date.now().toString(36),a=null,c=setTimeout(()=>{if(a)a();o(Error(`Timed out waiting for ${e}`))},n.timeoutMs??Hi);r.event.listen(`ytmd-response-${s}`,(l)=>{if(clearTimeout(c),a)a();try{i(Vi(e,l.payload))}catch(u){o(u)}}).then((l)=>(a=l,r.event.emit("ytmd-invoke",{id:s,cmd:e,args:t}))).catch((l)=>{clearTimeout(c),o(l instanceof Error?l:Error(String(l)))})});var Oi=15000,zi=100;function Bi(e,t,n,i,o){if(i||o>Oi)return"abandon";if(t&&t!==e.video_id)return"abandon";return t===e.video_id&&n?"apply":"wait"}var Yi=()=>document.getElementById("movie_player")?.getVideoData?.()?.video_id||void 0;function Kt(){let e=location.pathname==="/watch"?new URLSearchParams(location.search).get("v"):null;if(!e)return;let t=!1,n=new Set,i=(c)=>{let l=c.target;if(t||!(l instanceof HTMLVideoElement)||l.muted)return;l.muted=!0,n.add(l)};document.addEventListener("loadstart",i,!0),document.addEventListener("play",i,!0);let o=()=>{if(t)return;t=!0,document.removeEventListener("loadstart",i,!0),document.removeEventListener("play",i,!0),n.forEach((c)=>c.muted=!1),n.clear()},r=(c,l)=>{let u=()=>{if(clearTimeout(y),l.removeEventListener("seeked",u),!c.autoplay)l.pause();o()},y=setTimeout(u,1000);if(l.addEventListener("seeked",u),l.currentTime=c.position_secs,c.autoplay)l.play().catch(()=>{return});else{l.pause();let f=()=>l.pause();l.addEventListener("play",f),setTimeout(()=>l.removeEventListener("play",f),1500)}},s=Date.now();(async()=>{for(let c=0;;c++)try{return await B("take_resume_session")}catch(l){if(c>=20||window.__TAURI__?.event?.emit)throw l;await new Promise((u)=>setTimeout(u,100))}})().then((c)=>{let l=c;if(!l||l.video_id!==e)return o();let u=setInterval(()=>{let y=document.querySelector("video"),f=Bi(l,Yi(),!!y&&y.readyState>=1,W(),Date.now()-s);if(f==="wait")return;if(clearInterval(u),f==="apply"&&y)r(l,y);else o()},zi)}).catch((c)=>{console.error("[YTMD] Resume failed:",c),o()})}class ct{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var _e=null,K={adWasShowing:!1,preAdMuted:!1},dt=new WeakSet,ce=null,nn=null,ut=0,ue=!0,$i=1000,Ui=(e,t,n)=>e-t>=n,Fi=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",ji="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",Qi=300,Gi=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,Wi=`
  .ytp-ad-player-overlay,
  .ytp-ad-overlay-container,
  .ytp-ad-module,
  ytmusic-mealbar-promo-renderer,
  ytmusic-upsell-dialog-renderer,
  .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
  #premium-badge,
  .companion-ad-container {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }
`,Ki=Gi+Wi,Ji=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],Zi=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],Xi=(e)=>Ji.some((t)=>e.includes(t)),eo=(e,t)=>{let n=t.split("."),i=e;for(let r=0;r<n.length-1;r++){if(i===null||typeof i!=="object")return!1;i=i[n[r]]}let o=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,o))return delete i[o],!0;return!1},pt=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of Zi)if(eo(e,n))t=!0;return t},to=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},Jt=!1,no=()=>{if(Jt)return;Jt=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let o=await t(...i);if(!ue||!Xi(to(i[0])))return o;let r;try{r=await o.clone().json()}catch{return o}if(!pt(r))return o;let s=new Headers(o.headers);return s.delete("content-length"),s.delete("content-encoding"),new Response(JSON.stringify(r),{status:o.status,statusText:o.statusText,headers:s})};window.fetch=Object.assign(n,e)},Zt=!1,io=()=>{if(Zt)return;Zt=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(ue)pt(n);return n}},Xt=!1,oo=()=>{if(Xt)return;Xt=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(ue)pt(t);e=t}})};if(typeof window<"u")no(),io(),oo();var ro=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},so=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},yt=()=>document.getElementById("movie_player"),ao=()=>{let e=yt();if(!e)return!1;return ro(e.classList)},mt=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=so(ao(),K,t.muted);if(K=n,i!==null)t.muted=i},en=(e)=>{if(dt.has(e))return;dt.add(e),e.click()},Ee=()=>{document.querySelectorAll(Fi).forEach(en),document.querySelectorAll(ji).forEach((e)=>{let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)en(t)})},tn=(e)=>{let t=yt();if(nn=t,!t)return;ce?.disconnect(),ce=new MutationObserver(()=>{mt(e),Ee()}),ce.observe(t,{attributes:!0,attributeFilter:["class"]})},on={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){ue=!0,K={adWasShowing:!1,preAdMuted:!1},dt=new WeakSet,ut=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=Ki,document.head.appendChild(t);let n=null,i=new MutationObserver(()=>{if(n!==null)return;n=setTimeout(()=>{n=null,Ee()},Qi)});i.observe(document.body,{childList:!0,subtree:!0}),tn(e),Ee(),mt(e),_e=()=>{if(ue=!1,ce?.disconnect(),ce=null,i.disconnect(),n!==null)clearTimeout(n);document.getElementById("ytmd-adblock-styles")?.remove();let o=e.getVideoElement();if(o&&K.adWasShowing)o.muted=K.preAdMuted;K={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(yt()!==nn)tn(t);mt(t);let n=Date.now();if(Ui(n,ut,$i))ut=n,Ee()},onDestroy(){if(_e)_e(),_e=null}};var J=[],Pe="",ft=new Set,lo=(e,t)=>e===t,rn={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){J=[],Pe="",ft=new Set},onTrackChange(e){if(!e.videoId||e.videoId===Pe)return;let t=e.videoId;Pe=t,J=[],ft=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(o)=>{if(!o.ok)return;let r=await o.json();if(!lo(t,Pe))return;J=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!J||J.length===0||W())return;let n=ft;for(let i of J){let[o,r]=i.segment;if(e>=o&&e<r-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let s=t.getVideoElement();if(s)s.currentTime=r,n.add(i.UUID);break}}}};function sn(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function p(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var an="ytmd-kit-styles",co=`
  :root {
    --ytmd-font: Roboto, "Noto Naskh Arabic UI", Arial, sans-serif;
    --ytmd-font-display: "YouTube Sans", Roboto, Arial, sans-serif;
    --ytmd-text: var(--yt-sys-color-baseline--text-primary, #fff);
    --ytmd-text-secondary: var(--yt-sys-color-baseline--text-secondary, rgba(255, 255, 255, 0.7));
    --ytmd-text-disabled: rgba(255, 255, 255, 0.5);
    --ytmd-surface: var(--yt-sys-color-baseline--menu-background, #212121);
    --ytmd-hover: rgba(255, 255, 255, 0.1);
    --ytmd-pressed: rgba(255, 255, 255, 0.2);
    --ytmd-divider: rgba(255, 255, 255, 0.1);
    --ytmd-accent-color: var(--ytmd-accent, var(--yt-sys-color-baseline--call-to-action, #fff));
    --ytmd-player-bar-height: 72px;
  }

  .ytmd-icon-btn {
    all: unset;
    box-sizing: border-box;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--ytmd-text);
    cursor: pointer;
    position: relative;
    transition: background-color 0.1s linear;
  }
  .ytmd-icon-btn:hover { background: var(--ytmd-hover); }
  .ytmd-icon-btn:active { background: var(--ytmd-pressed); }
  .ytmd-icon-btn:focus-visible { outline: 2px solid var(--ytmd-text); outline-offset: -2px; }
  .ytmd-icon-btn[aria-disabled="true"] { color: var(--ytmd-text-disabled); cursor: default; background: none; }
  .ytmd-icon-btn svg { width: 24px; height: 24px; pointer-events: none; }
  .ytmd-icon-btn.ytmd-icon-btn--muted { color: var(--ytmd-text-secondary); }
  .ytmd-icon-btn.ytmd-icon-btn--muted:hover { color: var(--ytmd-text); }

  /* Circular progress drawn around an icon button (e.g. a download). */
  .ytmd-progress-ring {
    position: absolute;
    inset: 2px;
    width: calc(100% - 4px) !important;
    height: calc(100% - 4px) !important;
    transform: rotate(-90deg);
    pointer-events: none;
  }
  .ytmd-progress-ring circle { fill: none; stroke-width: 2.5; }
  .ytmd-progress-ring .ytmd-progress-track { stroke: var(--ytmd-divider); }
  .ytmd-progress-ring .ytmd-progress-value {
    stroke: var(--ytmd-accent-color);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }

  .ytmd-menu {
    position: fixed;
    z-index: 2202;
    min-width: 240px;
    max-width: 320px;
    padding: 8px 0;
    box-sizing: border-box;
    background: var(--ytmd-surface);
    border-radius: 12px;
    box-shadow: 0 4px 32px rgba(0, 0, 0, 0.4);
    font-family: var(--ytmd-font);
    color: var(--ytmd-text);
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 0.12s ease, transform 0.12s ease;
  }
  .ytmd-menu.ytmd-open { opacity: 1; transform: none; pointer-events: auto; }
  .ytmd-menu-item {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 40px;
    padding: 0 16px 0 12px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
    cursor: pointer;
  }
  .ytmd-menu-item:hover, .ytmd-menu-item:focus-visible { background: var(--ytmd-hover); }
  .ytmd-menu-item svg { width: 24px; height: 24px; flex: 0 0 24px; }
  .ytmd-menu-item-text { flex: 1; display: flex; flex-direction: column; padding: 8px 0; }
  .ytmd-menu-item-sub { font-size: 12px; line-height: 16px; color: var(--ytmd-text-secondary); }
  .ytmd-menu-item-hint { font-size: 12px; color: var(--ytmd-text-secondary); }
  .ytmd-menu-divider { height: 1px; margin: 8px 0; background: var(--ytmd-divider); }

  .ytmd-chip {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    background: var(--ytmd-hover);
    font: 500 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.1s linear;
  }
  .ytmd-chip:hover { background: var(--ytmd-pressed); }
  .ytmd-chip:focus-visible { outline: 2px solid var(--ytmd-text); outline-offset: 2px; }
  .ytmd-chip svg { width: 18px; height: 18px; }
  .ytmd-chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ytmd-accent-color);
  }

  .ytmd-button {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 16px;
    border-radius: 18px;
    font: 500 14px/36px var(--ytmd-font);
    color: var(--ytmd-text);
    cursor: pointer;
    transition: background-color 0.1s linear;
  }
  .ytmd-button:hover { background: var(--ytmd-hover); }
  .ytmd-button:focus-visible { outline: 2px solid var(--ytmd-text); outline-offset: 2px; }
  .ytmd-button--filled { background: var(--ytmd-text); color: #0f0f0f; }
  .ytmd-button--filled:hover { background: rgba(255, 255, 255, 0.85); }

  #ytmd-toast-host {
    position: fixed;
    left: 24px;
    bottom: calc(var(--ytmd-player-bar-height) + 16px);
    z-index: 2202;
    pointer-events: none;
  }
  .ytmd-toast {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 288px;
    max-width: 568px;
    min-height: 48px;
    padding: 8px 8px 8px 16px;
    background: var(--ytmd-surface);
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
    pointer-events: auto;
    animation: ytmd-toast-in 0.2s ease-out;
  }
  .ytmd-toast.ytmd-leaving { animation: ytmd-toast-out 0.15s ease-in forwards; }
  .ytmd-toast-text { flex: 1; padding: 6px 8px 6px 0; }
  .ytmd-toast .ytmd-button { color: var(--ytmd-accent-color); }
  @keyframes ytmd-toast-in { from { opacity: 0; transform: translateY(16px); } }
  @keyframes ytmd-toast-out { to { opacity: 0; transform: translateY(16px); } }

  .ytmd-scrim {
    position: fixed;
    inset: 0;
    z-index: 2203;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    animation: ytmd-fade-in 0.15s ease-out;
  }
  .ytmd-dialog {
    box-sizing: border-box;
    width: min(400px, calc(100vw - 48px));
    padding: 24px;
    background: var(--ytmd-surface);
    border-radius: 12px;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.5);
    font-family: var(--ytmd-font);
    color: var(--ytmd-text);
  }
  .ytmd-dialog-title { margin: 0 0 8px; font: 700 20px/28px var(--ytmd-font-display); }
  .ytmd-dialog-body { font-size: 14px; line-height: 20px; color: var(--ytmd-text-secondary); }
  .ytmd-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
  @keyframes ytmd-fade-in { from { opacity: 0; } }

  #ytmd-tooltip {
    position: fixed;
    z-index: 2204;
    padding: 6px 8px;
    border-radius: 4px;
    background: rgba(97, 97, 97, 0.92);
    font: 400 12px/16px var(--ytmd-font);
    color: #fff;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.1s linear;
  }
  #ytmd-tooltip.ytmd-open { opacity: 1; }

  #ytmd-volume-indicator {
    position: fixed;
    z-index: 2201;
    visibility: hidden;
    opacity: 0;
    box-sizing: border-box;
    min-width: 58px;
    padding: 8px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--ytmd-surface) 82%, transparent);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
    color: var(--ytmd-text);
    font: 700 24px/28px var(--ytmd-font-display);
    font-variant-numeric: tabular-nums;
    text-align: center;
    pointer-events: none;
    transition: opacity 0.35s ease, visibility 0s linear 0.35s;
  }
  #ytmd-volume-indicator.ytmd-visible {
    visibility: visible;
    opacity: 1;
    transition: opacity 0.12s ease, visibility 0s;
  }

  #ytmd-reaction-host {
    position: fixed;
    right: 24px;
    bottom: calc(var(--ytmd-player-bar-height) + 16px);
    z-index: 2202;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    pointer-events: none;
  }
  .ytmd-reaction {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 14px 0 8px;
    border-radius: 18px;
    background: var(--ytmd-surface);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    font: 500 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
    animation: ytmd-reaction 3s ease-out forwards;
  }
  .ytmd-reaction-emoji { font-size: 22px; line-height: 1; }
  @keyframes ytmd-reaction {
    0% { opacity: 0; transform: translateY(12px) scale(0.9); }
    10%, 75% { opacity: 1; transform: none; }
    100% { opacity: 0; transform: translateY(-24px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .ytmd-menu, .ytmd-toast, .ytmd-toast.ytmd-leaving, .ytmd-scrim, .ytmd-reaction { transition: none; animation: none; }
    #ytmd-volume-indicator { transition: none; }
  }
`;function I(){if(document.getElementById(an))return;let e=document.createElement("style");e.id=an,e.textContent=co,(document.head||document.documentElement).appendChild(e),uo()}var _={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function de(e,t=24){return sn(e,t,t)}function A(e){let t=p("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(de(e.iconPath)),t}function un(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(de(t))}function dn(e,t){let n=e.querySelector("svg.ytmd-progress-ring");if(t===null){n?.remove();return}let i=17,o=2*Math.PI*i;if(!n){n=document.createElementNS("http://www.w3.org/2000/svg","svg"),n.setAttribute("class","ytmd-progress-ring"),n.setAttribute("viewBox","0 0 36 36");for(let a of["ytmd-progress-track","ytmd-progress-value"]){let c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("class",a),c.setAttribute("cx","18"),c.setAttribute("cy","18"),c.setAttribute("r",String(i)),c.setAttribute("stroke-dasharray",String(o)),n.appendChild(c)}e.appendChild(n)}let r=Math.max(0,Math.min(1,t));n.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(o*(1-r)))}var ln=!1;function uo(){if(ln)return;ln=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},o=(a)=>{let c=a.dataset.ytmdTooltip;if(!c)return;if(!e)e=p("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=c;let l=a.getBoundingClientRect(),u=e.getBoundingClientRect(),f=l.bottom+8+u.height<window.innerHeight?l.bottom+8:l.top-8-u.height,g=Math.max(8,Math.min(window.innerWidth-u.width-8,l.left+l.width/2-u.width/2));e.style.top=`${f}px`,e.style.left=`${g}px`,e.classList.add("ytmd-open")},r=(a)=>{let c=a.target?.closest?.("[data-ytmd-tooltip]");if(!c||c===n)return;i(),n=c,t=setTimeout(()=>o(c),250)},s=(a)=>{let c=a.relatedTarget;if(n&&c&&n.contains(c))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",s,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var Y=null;function T(e,t={}){I();let n=document.getElementById("ytmd-toast-host");if(!n)n=p("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),r=o?i:p("div",{className:"ytmd-toast"});if(t.id)r.dataset.toastId=t.id;let a=[p("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:l,onClick:u}=t.action,y=p("button",{className:"ytmd-button",text:l});y.type="button",y.addEventListener("click",()=>{cn(),u()}),a.push(y)}if(r.replaceChildren(...a),!o)n.replaceChildren(r);if(Y!==null)clearTimeout(Y);Y=null;let c=t.durationMs??4000;if(c>0)Y=setTimeout(cn,c)}var mo=5,po=3000;function mn(e,t){I();let n=document.getElementById("ytmd-reaction-host");if(!n)n=p("div",{id:"ytmd-reaction-host"}),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=p("div",{className:"ytmd-reaction"});i.append(p("span",{className:"ytmd-reaction-emoji",text:e}),p("span",{text:t})),n.appendChild(i);while(n.children.length>mo)n.firstElementChild?.remove();setTimeout(()=>i.remove(),po)}function cn(){if(Y!==null)clearTimeout(Y);Y=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function Se(e){I(),document.getElementById(e.id)?.remove();let t=p("div",{id:e.id,className:"ytmd-scrim"}),n=p("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=p("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),r=p("div",{className:"ytmd-dialog-body"});if(e.body)r.append(...e.body);let s=document.activeElement,a=()=>{document.removeEventListener("keydown",c,!0),t.remove(),s?.focus?.()},c=(u)=>{if(u.key==="Escape")u.stopPropagation(),a()};document.addEventListener("keydown",c,!0),t.addEventListener("click",(u)=>{if(u.target===t)a()});let l=p("div",{className:"ytmd-dialog-actions"});for(let u of e.actions){let y=p("button",{className:`ytmd-button${u.filled?" ytmd-button--filled":""}`,text:u.label});y.type="button",y.addEventListener("click",()=>u.onClick?u.onClick(a):a()),l.appendChild(y)}return n.append(o,r,l),t.appendChild(n),document.body.appendChild(t),l.querySelector("button")?.focus(),{close:a,body:r}}var pn={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:(e,t,n)=>`${e} votes to skip (${t}/${n})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:(e,t)=>`From the shared queue: ${e} · ${t}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:(e)=>`${e} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:(e)=>`from ${e}`,syncQueuePlayNow:(e)=>`Play “${e}” now`,syncQueueRemove:(e)=>`Remove “${e}” from the queue`,syncQueueDrag:(e)=>`Move “${e}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",downloadNoTrack:"Play a song first to download it",downloadStarted:(e)=>`Downloading “${e}”`,downloadDone:(e)=>`Downloaded “${e}”`,downloadFailed:(e)=>`Download failed: ${e}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:(e)=>`Source: ${e}`,lyricsLocalFiles:"Local files",lyricsWrong:"Wrong lyrics?",lyricsPickTitle:"Choose lyrics",lyricsPickLoading:"Looking for other versions…",lyricsPickNone:"No other versions found",lyricsPickFailed:"Couldn’t switch the lyrics",lyricsTimed:"Timed",lyricsTextOnly:"Text only",lyricsCurrent:"Current",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`},yo={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:(e,t,n)=>`${e} głosuje za pominięciem (${t}/${n})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:(e,t)=>`Ze wspólnej kolejki: ${e} · ${t}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:(e)=>`${e} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:(e)=>`od: ${e}`,syncQueuePlayNow:(e)=>`Zagraj teraz: „${e}”`,syncQueueRemove:(e)=>`Usuń z kolejki: „${e}”`,syncQueueDrag:(e)=>`Przesuń „${e}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:(e)=>`Pobieranie: „${e}”`,downloadDone:(e)=>`Pobrano: „${e}”`,downloadFailed:(e)=>`Nie udało się pobrać: ${e}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:(e)=>`Źródło: ${e}`,lyricsLocalFiles:"Pliki lokalne",lyricsWrong:"Zły tekst?",lyricsPickTitle:"Wybierz tekst",lyricsPickLoading:"Szukanie innych wersji…",lyricsPickNone:"Nie znaleziono innych wersji",lyricsPickFailed:"Nie udało się zmienić tekstu",lyricsTimed:"Z synchronizacją",lyricsTextOnly:"Sam tekst",lyricsCurrent:"Obecny",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`},fo={en:pn,pl:yo};function go(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return fo[t]??pn}var gt=null;function d(){if(!gt){let e=typeof document<"u"?document.documentElement.lang:"";gt=go(e||(typeof navigator<"u"?navigator.language:"en"))}return gt}var me={video_id:null,provider:null,synced:[],plain:null,offset_secs:0,source_url:null};function yn(e,t){let n=0,i=e.length-1,o=-1;while(n<=i){let r=n+i>>1;if(e[r].t<=t)o=r,n=r+1;else i=r-1}return o}function fn(e,t,n){return yn(e,t+n)}function gn(e,t,n){return e?.words?yn(e.words,t+n):-1}function ht(e,t){switch(e){case"local":return t;case"lrclib":return"LRCLIB";case"musixmatch":return"Musixmatch";case"netease":return"NetEase";case"ytm":return"YouTube Music";case"genius":return"Genius";default:return e||""}}function Ce(e){if(!e||typeof e!=="object")return{...me};let t=e;return{video_id:typeof t.video_id==="string"?t.video_id:null,provider:typeof t.provider==="string"?t.provider:null,synced:Array.isArray(t.synced)?t.synced.filter((n)=>typeof n?.t==="number"&&typeof n?.text==="string"):[],plain:typeof t.plain==="string"?t.plain:null,offset_secs:typeof t.offset_secs==="number"&&Number.isFinite(t.offset_secs)?t.offset_secs:0,source_url:typeof t.source_url==="string"?t.source_url:null}}var k={...me},D=!1,H=-1,U=-1,Z="",Me=0,vt="",Le=!1,N=null,Ie=null,hn=(e,t)=>e===t,ho=(e)=>e.videoId||`${e.title} - ${e.artist}`,vn={id:"lyrics",name:"Native Synced Lyrics",description:"Synchronized lyrics from several providers in the native Lyrics tab, with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){k={...me},D=!1,H=-1,U=-1,Z="",vt="",Le=!1,N=null;let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=bo,document.head.appendChild(t),I();let n=()=>{bt(),So(e),wo(e)},i=()=>{setTimeout(()=>{bt(),wt()},50),setTimeout(()=>{wt()},250)};document.addEventListener("click",i,!0);let o=window.setInterval(n,600);n(),To(e);let r=window.__TAURI__?.event?window.__TAURI__.event.listen("lyrics-changed",(s)=>{let a=Ce(s.payload);if(!vo(a))return;Tt(e,a)}):null;Ie=()=>{clearInterval(o),document.removeEventListener("click",i,!0),r?.then((s)=>s()),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((s)=>s.remove())}},async onTrackChange(e,t){let n=ho(e);if(N=e,n===Z)return;Z=n,k={...me,video_id:e.videoId??null},D=!0,H=-1,U=-1,vt=Tn(),Le=!1,bt(),Ae(t),await wn(t,e,n,null)},onTick(e){Me=e,Re(e,!0)},onDestroy(){if(Ie)Ie(),Ie=null}},bo=`
  /* Scoped to tabs unlockLyricsTabHeader() has explicitly matched by
     label — NOT blind tab position (nth-of-type), since a layout where
     "Tekst"/"Lyrics" isn't the 2nd tab would otherwise force
     pointer-events:auto on some unrelated tab. */
  .ytmd-lyrics-tab-unlocked {
    pointer-events: auto !important;
    cursor: pointer !important;
  }
  .ytmd-lyrics-tab-unlocked[disabled],
  .ytmd-lyrics-tab-unlocked[aria-disabled="true"] {
    opacity: 1 !important;
    color: var(--ytmd-text, #fff) !important;
  }

  /* Hide default un-synced text, spinners and unavailable messages inside lyrics tab ONLY */
  #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
  #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
  #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] tp-yt-paper-spinner,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] tp-yt-paper-spinner {
    display: none !important;
  }

  #ytmd-native-lyrics-wrapper {
    display: none !important;
    flex-direction: column;
    gap: 8px;
    padding: 24px 0 160px;
    max-width: 760px;
    margin: 0 auto;
    box-sizing: border-box;
    width: 100%;
  }

  /* Strict visibility: show ONLY inside the active lyrics tab renderer */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"].iron-selected #ytmd-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]:not([hidden]):not([aria-hidden="true"]) #ytmd-native-lyrics-wrapper {
    display: flex !important;
  }

  /* Never show inside queue / related / hidden tabs */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][hidden] #ytmd-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][aria-hidden="true"] #ytmd-native-lyrics-wrapper,
  ytmusic-tab-renderer:not([page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]) #ytmd-native-lyrics-wrapper,
  ytmusic-player-page ytmusic-tab-renderer:not(.iron-selected) #ytmd-native-lyrics-wrapper {
    display: none !important;
  }
  /* Same treatment as YTM's own timed lyrics: large display type,
     upcoming/past lines dimmed, the current line full white. Size and
     weight never change between states, so the text doesn't reflow
     as the active line moves. */
  .ytmd-native-lyric-line {
    font: 700 24px/32px var(--ytmd-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 4px 0;
    user-select: none;
    word-break: break-word;
    transition: color 0.2s ease;
  }
  .ytmd-native-lyric-line:hover { color: rgba(255, 255, 255, 0.7); }
  .ytmd-native-lyric-line.active { color: #fff; }
  .ytmd-native-lyric-line.ytmd-plain { cursor: default; color: #fff; }
  /* Word-by-word: in the active line, words light up as they are sung. */
  .ytmd-native-lyric-line.active.ytmd-has-words .ytmd-lyric-word { color: rgba(255, 255, 255, 0.4); transition: color 0.1s linear; }
  .ytmd-native-lyric-line.active.ytmd-has-words .ytmd-lyric-word.ytmd-sung { color: #fff; }
  .ytmd-native-lyrics-status {
    padding: 48px 0;
    text-align: center;
    font: 400 16px/24px var(--ytmd-font, Roboto, Arial, sans-serif);
    color: var(--ytmd-text-secondary, rgba(255, 255, 255, 0.7));
  }
  .ytmd-native-lyrics-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 32px;
    font: 400 12px/16px var(--ytmd-font, Roboto, Arial, sans-serif);
    color: var(--ytmd-text-secondary, rgba(255, 255, 255, 0.7));
  }
  .ytmd-native-lyrics-footer .ytmd-lyrics-source { flex: 1; min-width: 120px; }
  .ytmd-native-lyrics-footer a.ytmd-lyrics-source { color: inherit; text-decoration: none; }
  .ytmd-native-lyrics-footer a.ytmd-lyrics-source:hover { text-decoration: underline; }
  .ytmd-lyrics-offset-value {
    min-width: 56px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--ytmd-text, #fff);
  }
  .ytmd-lyrics-pick-list { display: flex; flex-direction: column; margin: 8px -24px 0; max-height: 50vh; overflow-y: auto; }
  .ytmd-lyrics-pick-list .ytmd-menu-item { width: 100%; text-align: left; }
`;function vo(e){if(!N)return!1;if(e.video_id&&N.videoId)return e.video_id===N.videoId;return!e.video_id||e.video_id===N.videoId}async function wn(e,t,n,i){try{let o=Ce(await e.invoke("fetch_lyrics",{videoId:t.videoId||null,artist:t.artist,title:t.title,albumName:t.album||null,duration:t.durationSecs||null,ytmPlain:i},{timeoutMs:15000}));if(!hn(n,Z))return;D=!1,Tt(e,o)}catch{if(!hn(n,Z))return;D=!1,Ae(e)}}function Tt(e,t){let n=t.provider!==null&&t.provider===k.provider&&t.synced.length===k.synced.length&&t.plain===k.plain&&t.video_id===k.video_id&&!D;if(D&&!t.provider&&t.offset_secs===k.offset_secs)return;if(k=t,D=!1,n){let i=document.querySelector(".ytmd-lyrics-offset-value");if(i)i.textContent=xn(t.offset_secs);Re(Me,!1);return}H=-1,U=-1,Ae(e),Re(Me,!1)}function Re(e,t){if(k.synced.length===0)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n)return;let i=n.querySelectorAll(".ytmd-native-lyric-line"),o=fn(k.synced,e,k.offset_secs);if(o!==H){i[H]?.classList.remove("active"),i[H]?.querySelectorAll(".ytmd-sung").forEach((a)=>a.classList.remove("ytmd-sung")),H=o,U=-1;let s=i[o];if(s){s.classList.add("active");let a=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t&&a&&_o(a))s.scrollIntoView({behavior:"smooth",block:"nearest"})}}let r=gn(k.synced[o],e,k.offset_secs);if(r!==U)i[o]?.querySelectorAll(".ytmd-lyric-word")?.forEach((a,c)=>a.classList.toggle("ytmd-sung",c<=r)),U=r}function Tn(){return document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description')?.textContent?.trim()||""}function wo(e){if(Le||D||!N||k.provider)return;let t=Tn();if(!t||t===vt)return;Le=!0,wn(e,N,Z,t)}async function To(e){let t=ko(),n=[...xo(t)];if(n.length===0)return;try{await e.invoke("import_lyrics_offsets",{entries:n}),t?.removeItem?.(kn)}catch(i){console.warn("[YTMD Lyrics] Offset migration failed, will retry next start:",i)}}var kn="ytmd-lyrics-offsets";function ko(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function xo(e){try{let t=e?.getItem(kn);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function xn(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function _o(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function Eo(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function bt(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(Eo(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function Po(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function wt(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=Po();e.style.setProperty("display",t?"flex":"none","important")}function So(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=p("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),H=-1,U=-1,Ae(e),Re(Me,!1)}wt()}function pe(e,t,n){let i=p("button",{className:"ytmd-chip",text:e});return i.type="button",i.dataset.ytmdTooltip=t,i.setAttribute("aria-label",t),i.addEventListener("click",n),i}function Co(){let e=d().lyricsSource(ht(k.provider,d().lyricsLocalFiles));if(k.source_url){let t=p("a",{className:"ytmd-lyrics-source",text:e});return t.href=k.source_url,t.target="_blank",t.rel="noopener noreferrer",t}return p("span",{className:"ytmd-lyrics-source",text:e})}function bn(e,t){let n=p("div",{className:"ytmd-native-lyrics-footer"});if(n.append(Co()),t){let i=p("span",{className:"ytmd-lyrics-offset-value",text:xn(k.offset_secs)}),o=(r)=>{let s=r===null?0:Math.round((k.offset_secs+r)*10)/10;e.invoke("set_lyrics_offset",{offsetSecs:s}).catch((a)=>console.warn("[YTMD Lyrics] offset:",a))};n.append(p("span",{text:d().lyricsOffset}),pe("−0.5 s",d().lyricsLater,()=>o(-0.5)),i,pe("+0.5 s",d().lyricsEarlier,()=>o(0.5)),pe(d().lyricsReset,d().lyricsReset,()=>o(null)))}return n.append(pe(d().lyricsWrong,d().lyricsPickTitle,()=>void _n(e))),n}async function _n(e){let t=p("div",{className:"ytmd-lyrics-pick-list"});t.append(p("div",{className:"ytmd-native-lyrics-status",text:d().lyricsPickLoading}));let n=Se({id:"ytmd-lyrics-picker",title:d().lyricsPickTitle,body:[t],actions:[{label:d().close}]}),i=[];try{i=await e.invoke("list_lyrics_candidates",{},{timeoutMs:15000})||[]}catch{i=[]}if(!t.isConnected)return;if(i.length===0){t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:d().lyricsPickNone}));return}t.replaceChildren(...i.map((o)=>{let r=p("button",{className:"ytmd-menu-item"});r.type="button";let s=p("span",{className:"ytmd-menu-item-text"}),a=o.synced?d().lyricsTimed:d().lyricsTextOnly;if(s.append(p("span",{text:`${ht(o.provider,d().lyricsLocalFiles)} · ${a}`}),p("span",{className:"ytmd-menu-item-sub",text:`${o.title} — ${o.artist}`}),p("span",{className:"ytmd-menu-item-sub",text:o.preview})),r.append(s),o.selected)r.append(p("span",{className:"ytmd-menu-item-hint",text:d().lyricsCurrent}));return r.addEventListener("click",async()=>{n.close();try{Tt(e,Ce(await e.invoke("pick_lyrics",{provider:o.provider,id:o.id})))}catch{T(d().lyricsPickFailed)}}),r}))}function Ae(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(D)t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:d().lyricsLoading}));else if(k.synced.length>0)t.replaceChildren(...k.synced.map((n)=>{let i=p("div",{className:"ytmd-native-lyric-line"});if(n.words?.length)i.classList.add("ytmd-has-words"),i.append(...n.words.map((o)=>p("span",{className:"ytmd-lyric-word",text:o.text})));else i.textContent=n.text;return i.addEventListener("click",()=>{let o=e.getVideoElement();if(o)o.currentTime=Math.max(0,n.t-k.offset_secs)}),i}),bn(e,!0));else if(k.plain)t.replaceChildren(...k.plain.split(`
`).map((n)=>p("div",{className:"ytmd-native-lyric-line ytmd-plain",text:n})),bn(e,!1));else{let n=[p("div",{className:"ytmd-native-lyrics-status",text:d().lyricsNone})];if(N)n.push(Io(e));t.replaceChildren(...n)}}function Io(e){let t=p("div",{className:"ytmd-native-lyrics-footer"});return t.append(p("span",{className:"ytmd-lyrics-source"}),pe(d().lyricsWrong,d().lyricsPickTitle,()=>void _n(e))),t}var ye=null;function fe(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}var En={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){ye?.(),I(),document.getElementById("ytmd-volume-indicator")?.remove();let t=p("div",{id:"ytmd-volume-indicator"});document.body.appendChild(t);let n=null,i=null,o=null,r=null,s=null,a=()=>{if(s!==null)window.clearTimeout(s);s=null,t.classList.remove("ytmd-visible")},c=()=>{if(s!==null)window.clearTimeout(s);t.classList.add("ytmd-visible"),s=window.setTimeout(()=>{s=null,t.classList.remove("ytmd-visible")},1800)},l=()=>{let m=e.getVideoElement();if(!m){r=null,a();return}let v=ke(m)?0:le(m),w=r!==null&&v!==r;r=v;let P=document.querySelector("ytmusic-player-page #main-panel");if(!fe(P)){a();return}if(t.textContent!==`${v}%`)t.textContent=`${v}%`,t.setAttribute("aria-label",d().volumeLevel(v));let G=fe(document.querySelector("ytmusic-player-page #song-image")),V=fe(document.querySelector("ytmusic-player-page video"))||fe(document.querySelector("ytmusic-player-page #movie_player")),M=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?V||G:G||V)||fe(P);if(!M){a();return}let R=`${Math.max(8,M.left+12)}px`,C=`${Math.max(8,M.top+12)}px`;if(t.style.left!==R)t.style.left=R;if(t.style.top!==C)t.style.top=C;if(w)c()},u=()=>{let m=e.getVideoElement();if(m===n)return;n?.removeEventListener("volumechange",l),n=m,n?.addEventListener("volumechange",l),l()},y=()=>{let m=document.querySelector("ytmusic-player-page");if(m===i)return;if(o?.disconnect(),i=m,m)o=new MutationObserver(()=>window.requestAnimationFrame(l)),o.observe(m,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},f=(m)=>{let v=m.target;if(v instanceof Element&&v.closest("ytmusic-player-bar"))window.requestAnimationFrame(l)},g=(m)=>{if(m.deltaY===0||m.ctrlKey)return;let v=m.target;if(v instanceof Element&&v.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'))return;let w=(R)=>{if(!R)return!1;let C=R.getBoundingClientRect();return m.clientX>=C.left&&m.clientX<C.right&&m.clientY>=C.top&&m.clientY<C.bottom},P=w(document.querySelector("ytmusic-player-bar"))||w(document.querySelector("#player-bar-background")),G=e.config.wheel_volume_on_player_page===!0&&w(document.querySelector("ytmusic-player-page #main-panel"));if(!P&&!G)return;let V=e.getVideoElement();if(!V)return;let S=e.config.wheel_volume_step,M=typeof S==="number"&&Number.isFinite(S)&&S>0?Math.min(S,1):0.05;m.preventDefault(),xe(le(V)+(m.deltaY<0?M:-M)*100,V),l()};window.addEventListener("wheel",g,{passive:!1}),window.addEventListener("resize",l),document.addEventListener("scroll",l,!0),document.addEventListener("input",f,!0),document.addEventListener("change",f,!0),y(),u();let h=window.setInterval(()=>{y(),u(),l()},500);ye=()=>{window.removeEventListener("wheel",g),window.removeEventListener("resize",l),document.removeEventListener("scroll",l,!0),document.removeEventListener("input",f,!0),document.removeEventListener("change",f,!0),window.clearInterval(h),o?.disconnect(),n?.removeEventListener("volumechange",l),a(),t.remove()}},onDestroy(){if(ye)ye(),ye=null}};var Pn={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var Ne=null,Sn={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
      /* Deliberately NOT overriding ::-webkit-scrollbar width/height.
         YouTube Music's own layout code reserves gutter space sized for the
         native (wider) scrollbar; shrinking the rendered scrollbar to a
         custom width leaves a stale gap the size of the difference wherever
         that reserved space gets exposed (e.g. when focusing/expanding the
         now-playing view triggers a layout recalc) — seen as empty space
         where the scrollbar used to be. */
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: #27272a;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #3f3f46;
      }
    `,!t.isConnected)document.head.appendChild(t);Ne=()=>{t?.remove()}},onDestroy(){if(Ne)Ne(),Ne=null}};var De=[32,64,125,250,500,1000,2000,4000,8000,16000],kt={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function ge(e){return Math.max(-24,Math.min(24,e))}function Mo(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function Lo(e){return Math.max(0.5,Math.min(2,e))}class E{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=De.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!E.instance)E.instance=new E;return E.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=De.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===De.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=ge(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=ge(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=ge(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,ge(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=kt[e]||kt.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),Mo(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=Lo(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??b.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class xt{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)E.getInstance().fadeIn(this.crossfadeSeconds);else E.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),E.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),E.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),b.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class _t{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=E.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,b.next()}else this.consecutiveSilentTicks=0}}var F=null,X=null,qe=null;function Ro(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var Cn={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=E.getInstance(),n=new xt,i=new _t;F=n,X=i;let o=e.config,r=null,s=()=>{if(r!==null)return;let c=e.getVideoElement();if(c){if(!t.isInitializedFor(c))t.init(c);return}r=window.setInterval(()=>{let l=e.getVideoElement();if(l){if(r!==null)clearInterval(r);r=null,t.init(l)}},500)};if(Ro(o))s();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let a=[];if(window.__TAURI__?.event){let{listen:c}=window.__TAURI__.event;a.push(c("set-eq-band",(l)=>{s(),t.setBandGain(l.payload.bandIndex,l.payload.gain)}),c("set-eq-all",(l)=>{s(),t.setAllGains(l.payload.gains)}),c("set-eq-preset",(l)=>{s(),t.applyPreset(l.payload)}),c("set-preamp",(l)=>{s(),t.setPreamp(l.payload)}),c("set-loudness-normalization",(l)=>{if(l.payload)s();t.setLoudnessNormalization(l.payload)}),c("set-crossfade-seconds",(l)=>{if(l.payload>0)s();n.setCrossfadeSeconds(l.payload)}),c("set-skip-silence",(l)=>{if(l.payload)s();i.setEnabled(l.payload)}),c("set-playback-rate",(l)=>{t.setPlaybackRate(l.payload)}),c("set-preserves-pitch",(l)=>{t.setPreservesPitch(l.payload)}))}qe=()=>{if(r!==null)clearInterval(r),r=null;a.forEach((c)=>c.then((l)=>l())),F?.destroy(),F=null,X=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(E.getInstance().applyRateAndPitch(),F)F.onTrackChange(e);if(X)X.onTrackChange()},onTick(e,t){if(W())return;if(F)F.onTick(e,t.track);if(X)X.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(qe)qe(),qe=null}};var Et=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function In(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let s=r.getImageData(0,0,16,16).data,a=0,c=0,l=0,u=0,y=0,f=0,g=0,h=0;for(let S=0;S<s.length;S+=4){let M=s[S],R=s[S+1],C=s[S+2];if(s[S+3]<128)continue;let Yt=(M+R+C)/3;if(Yt<20||Yt>240)continue;if(S<s.length/2)a+=M,c+=R,l+=C,u++;else y+=M,f+=R,g+=C,h++}if(u===0&&h===0){t(n);return}let m=u>0?Math.round(a/u):220,v=u>0?Math.round(c/u):38,w=u>0?Math.round(l/u):38,P=h>0?Math.round(y/h):24,G=h>0?Math.round(f/h):24,V=h>0?Math.round(g/h):27;t({primary:Et(m,v,w),secondary:Et(P,G,V),accent:Et(m+30,v+30,w+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var O=48,Ao=3,No=3,Do=1.65,qo=0.55;function Vo(e,t,n,i){let o=new Float32Array(e.length),r=(s,a,c)=>{let l=c?n:t,u=c?t:n;for(let y=0;y<l;y++)for(let f=0;f<4;f++)for(let g=0;g<u;g++){let h=0,m=0;for(let w=Math.max(0,g-i);w<=Math.min(u-1,g+i);w++){let P=c?(y*t+w)*4+f:(w*t+y)*4+f;h+=s[P],m++}let v=c?(y*t+g)*4+f:(g*t+y)*4+f;a[v]=h/m}};r(e,o,!0),r(o,e,!1)}function Ho(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],s=e[i+2],a=0.2126*o+0.7152*r+0.0722*s;e[i]=(a+(o-a)*t)*n,e[i+1]=(a+(r-a)*t)*n,e[i+2]=(a+(s-a)*t)*n}}async function Mn(e,t=qo){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=O,o.height=O;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,O,O);let s=r.getImageData(0,0,O,O);for(let a=0;a<No;a++)Vo(s.data,O,O,Ao);Ho(s.data,Do,t),r.putImageData(s,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var Ve=null,He=null,Oe,Ln={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=p("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=p("img",{id:"ytmd-ambient-cover"});n.alt="";let i=p("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,s=document.createElement("style");s.id="ytmd-ambient-styles",s.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
        opacity: ${r?o:0};
        transition: opacity 0.8s ease;
      }
      /* Full-bleed blurred cover, so nav bar/player bar/sidebar going
         translucent (theme_engine's Ambient CSS) reveals something rich.
         The src is a small bitmap blurred once per track in JS
         (renderAmbientWash) and stretched here — deliberately no CSS
         filter and no animation: a live blur(64px) on a full-window layer
         plus an infinite transform animation made WebKit re-blur the whole
         window every frame, which stuttered scrolling and playback. */
      #ytmd-ambient-cover {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        opacity: 0;
        transition: opacity 1.1s ease;
      }
      #ytmd-ambient-veil {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse 70% 55% at 20% 0%, color-mix(in srgb, var(--ytmd-accent-primary, #3a2f1f) 45%, transparent) 0%, transparent 60%),
          radial-gradient(ellipse 65% 60% at 100% 100%, color-mix(in srgb, var(--ytmd-accent-secondary, #0e0c11) 40%, transparent) 0%, transparent 65%),
          linear-gradient(180deg, rgba(7, 6, 10, 0.35) 0%, rgba(7, 6, 10, 0.75) 100%);
      }
      /* Ensure YouTube Music transparent backgrounds let the wash pass through */
      ytmusic-app-layout, #browse-page, ytmusic-browse-response {
        background-color: transparent !important;
      }
    `,document.head.appendChild(s),Ve=(c)=>{if(t)t.style.opacity=String(c)};let a=[];if(window.__TAURI__?.event)a.push(window.__TAURI__.event.listen("set-ambient-intensity",(c)=>{Ve?.(c.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(c)=>{let l=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;Ve?.(c.payload?l:0)}));if(He=()=>{a.forEach((c)=>c.then((l)=>l())),Ve=null,Oe=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===Oe)return;Oe=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await Mn(t):null;if(t!==Oe)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await In(t||""),o=document.documentElement.style;o.setProperty("--ytmd-accent",i.accent),o.setProperty("--ytmd-accent-primary",i.primary),o.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(He)He(),He=null}};var Rn=`
  html {
    --ytmusic-call-to-action: var(--ytmd-accent, #e8b06b) !important;
    --yt-sys-color-baseline--call-to-action: var(--ytmd-accent, #e8b06b) !important;
    --yt-sys-color-baseline--call-to-action-inverse: var(--ytmd-accent, #e8b06b) !important;
    --yt-sys-color-baseline--overlay-call-to-action: var(--ytmd-accent, #e8b06b) !important;
    --yt-sys-color-baseline--call-to-action-hover: color-mix(in srgb, var(--ytmd-accent, #e8b06b) 100%, white 18%) !important;
    --yt-sys-color-baseline--overlay-call-to-action-hover: color-mix(in srgb, var(--ytmd-accent, #e8b06b) 100%, white 18%) !important;
    --paper-input-container-focus-color: ${"var(--ytmd-accent, #e8b06b)"} !important;

    --ytmusic-brand-background-solid: color-mix(in srgb, #121016 70%, transparent) !important;
    --yt-sys-color-baseline--raised-background: color-mix(in srgb, #121016 78%, transparent) !important;
    --yt-sys-color-baseline--menu-background: color-mix(in srgb, #121016 90%, transparent) !important;
    --paper-menu-background-color: color-mix(in srgb, #121016 90%, transparent) !important;
    --paper-dialog-background-color: color-mix(in srgb, #121016 90%, transparent) !important;
    --yt-live-chat-dialog-background-color: color-mix(in srgb, #121016 90%, transparent) !important;
    --ytmusic-badge-chip-background: color-mix(in srgb, white 7%, transparent) !important;
    --ytmusic-explore-chip-background: color-mix(in srgb, white 7%, transparent) !important;
  }

  /* Only the true root canvas is forced opaque here. ytmusic-app-layout,
     #browse-page and ytmusic-browse-response are transparent by default in
     YouTube Music's own CSS (they already show html/body through), and
     AmbientLightingPlugin owns keeping them that way so the glow orb behind
     them is visible — forcing it here too would just be a second,
     redundant source of truth for the same rule. */
  html, body {
    background-color: #08070b !important;
  }

  /* The chrome users look at constantly — nav bar, player bar, sidebar —
     goes translucent glass instead of a flat opaque box, so the ambient
     wash actually shows through it instead of stopping at its edges. */
  ytmusic-nav-bar, ytmusic-player-bar {
    background: color-mix(in srgb, #0c0a10 62%, transparent) !important;
    backdrop-filter: blur(20px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  /* Large surfaces get a denser tint instead of a live backdrop blur.
     WebKit recomputes a backdrop-filter every frame the content under it
     repaints; over the full-height sidebar and the full-window player
     page (lyrics scrolling, progress, queue) that was a steady per-frame
     GPU cost. What's behind them is the already-blurred ambient wash, so
     a tint reads nearly the same. */
  ytmusic-player-page {
    background: color-mix(in srgb, #0c0a10 84%, transparent) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  ytmusic-guide-renderer {
    background: color-mix(in srgb, #0a0910 62%, transparent) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  }
  tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
    background-color: ${"var(--ytmd-accent, #e8b06b)"} !important;
  }
  
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

`,An=`
  html {
    --ytmusic-background: #0d0c11 !important;
    --yt-sys-color-baseline--base-background: #0d0c11 !important;

    --ytmusic-brand-background-solid: #141319 !important;
    --yt-sys-color-baseline--raised-background: #141319 !important;
    --yt-sys-color-baseline--menu-background: #17151d !important;
    --paper-menu-background-color: #17151d !important;
    --paper-dialog-background-color: #17151d !important;
    --yt-live-chat-dialog-background-color: #17151d !important;
    --ytmusic-badge-chip-background: #1c1a22 !important;
    --ytmusic-explore-chip-background: #1c1a22 !important;

    --ytmusic-call-to-action: #e8b06b !important;
    --yt-sys-color-baseline--call-to-action: #e8b06b !important;
    --yt-sys-color-baseline--call-to-action-inverse: #e8b06b !important;
    --yt-sys-color-baseline--overlay-call-to-action: #e8b06b !important;
    --yt-sys-color-baseline--call-to-action-hover: #f0bd85 !important;
    --yt-sys-color-baseline--overlay-call-to-action-hover: #f0bd85 !important;
    --paper-input-container-focus-color: #e8b06b !important;
  }
  html, body {
    background-color: #0d0c11 !important;
  }
  ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
    background: #141319 !important;
    border-color: #242229 !important;
  }
  ytmusic-guide-renderer {
    background-color: #0d0c11 !important;
    border-right: 1px solid #242229 !important;
  }
  tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
    background-color: #e8b06b !important;
  }
  
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

`;var ze=null,Nn={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(a)=>{let c=document.getElementById(a);if(!c){c=document.createElement("style"),c.id=a;let l=t();if(l)l.appendChild(c)}return c},i=(a)=>{let c=n("ytmd-active-theme");c.textContent=a?Rn:An},o=(a)=>{let c=n("ytmd-custom-css");if(c)c.textContent=a};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let s=[];if(window.__TAURI__?.event)s.push(window.__TAURI__.event.listen("set-ambient-enabled",(a)=>{i(a.payload)}),window.__TAURI__.event.listen("set-custom-css",(a)=>{o(a.payload)}));ze=()=>{s.forEach((a)=>a.then((c)=>c()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(ze)ze(),ze=null}};var Be=null,Dn={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=A({id:"ytmd-pip-btn",label:d().pipButton,iconPath:_.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(s){console.warn("[YTMD PiP] Could not enter PiP:",s),await e.invoke("toggle_mini_player").catch((a)=>console.error("[YTMD PiP] Mini player fallback failed:",a))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),Be=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(Be)Be(),Be=null}};function Oo(e){if(e.error)return"failed";if(e.output_path&&e.percent>=100)return"done";return"progress"}var $e="ytmd-download-btn",zo=3000,ee=new Map,Pt=new Set,Ue=null,Ye=null;function te(){let e=document.getElementById($e);if(!e)return;let t=Ue?.videoId,n=t?ee.get(t):void 0;dn(e,n?Math.max(0.05,n.fraction):null),un(e,t&&Pt.has(t)?_.check:_.download),e.setAttribute("aria-disabled",t?"false":"true");let i=n?d().downloadInProgress:d().downloadButton;e.setAttribute("aria-label",i),e.dataset.ytmdTooltip=i}function St(e,t){let n=ee.get(e);if(!n)return;if(ee.delete(e),t.ok)Pt.add(e),setTimeout(()=>{Pt.delete(e),te()},zo),T(d().downloadDone(n.title),{id:`download-${e}`});else T(d().downloadFailed(t.reason),{id:`download-${e}`,durationMs:8000});te()}function Bo(e){let t=ee.get(e.video_id);if(!t)return;let n=Oo(e);if(n==="failed")St(e.video_id,{ok:!1,reason:e.error||e.status});else if(n==="done")St(e.video_id,{ok:!0});else t.fraction=e.percent/100,te()}function Ct(e,t){let n=t?.videoId;if(!t||!n){T(d().downloadNoTrack);return}if(ee.has(n)){T(d().downloadInProgress);return}ee.set(n,{title:t.title,fraction:0}),te(),T(d().downloadStarted(t.title),{id:`download-${n}`}),e.invoke("download_track",{request:{video_id:n,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:e.config.download_format||"mp3",embed_lyrics:e.config.embed_lyrics!==!1}}).catch((i)=>{console.error("[YTMD Downloader] Download failed:",i),St(n,{ok:!1,reason:i instanceof Error?i.message:String(i)})})}var qn={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){Ue=e.track;let t=()=>{if(document.getElementById($e))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!o)return;let r=A({id:$e,label:d().downloadButton,iconPath:_.download});r.addEventListener("click",()=>{if(r.getAttribute("aria-disabled")==="true")return;Ct(e,Ue)}),o.appendChild(r),te()},n=window.setInterval(t,1000);t();let i=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(o)=>Bo(o.payload)):null;Ye=()=>{clearInterval(n),i?.then((o)=>o()),document.getElementById($e)?.remove()}},onTrackChange(e){Ue=e,te()},onDestroy(){if(Ye)Ye(),Ye=null}};var Vn={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};var Fe="ytmd-nav-slot",It="ytmd-menu-btn",be="ytmd-menu",Hn="ytmd-sync-chip",zn=[],he=null,Bn=null,On=!1,Yo=`
  #${Fe} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function $o(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=Yo,document.head.appendChild(e)}function Uo(e){if(!e)return;return`${d().syncInRoom} · ${d().syncListeners(e.listeners)}`}function Yn(e){zn=e.items,Bn=e.onSyncChipClick}function Mt(){if(document.getElementById(Fe)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;I(),$o();let t=p("div",{id:Fe}),n=A({id:It,label:d().menuLabel,iconPath:_.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),jo(n)}),t.appendChild(n),e.prepend(t),$n(),Go()}function Lt(e){he=e,$n();let t=document.getElementById(be);if(t?.classList.contains("ytmd-open"))Un(t)}function $n(){let e=document.getElementById(Fe);if(!e)return;let t=document.getElementById(Hn);if(!he){t?.remove();return}if(!t)t=p("button",{id:Hn,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>Bn?.()),e.prepend(t);let n=d().syncListeners(he.listeners);t.replaceChildren(p("span",{className:"ytmd-chip-dot"}),de(_.group,18),p("span",{text:n})),t.dataset.ytmdTooltip=`${d().syncInRoom} · ${he.roomCode}`,t.setAttribute("aria-label",`${d().syncInRoom}, ${n}`)}function Un(e){let t=[];for(let n of zn){if(n.dividerBefore)t.push(p("div",{className:"ytmd-menu-divider"}));let i=p("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=p("span",{className:"ytmd-menu-item-text"});o.appendChild(p("span",{text:n.label}));let r=n.id==="sync"?Uo(he):void 0;if(r)o.appendChild(p("span",{className:"ytmd-menu-item-sub",text:r}));if(i.append(de(n.iconPath),o),n.hint)i.appendChild(p("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{ne(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function Fo(){let e=document.getElementById(be);if(!e)e=p("div",{id:be,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",Qo),document.body.appendChild(e);return e}function jo(e){let t=Fo();if(t.classList.contains("ytmd-open")){ne();return}Un(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function ne(){let e=document.getElementById(be);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById(It);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function Qo(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),ne();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")ne()}function Go(){if(On)return;On=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(be);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(It)?.contains(n))return;ne()}),window.addEventListener("resize",ne)}function Fn(e){return e.is_host?"host":e.role??"dj"}function z(e){return e!=="listener"}function jn(e){return Math.floor(e/2)+1}function Wo(e,t,n){let i=0;return t.forEach((o,r)=>{if(r!==n&&e>o)i++}),i}var je=null;function Qn(e,t){if(!je)return;let n=[...e.querySelectorAll(t)].find((i)=>i.dataset.itemId===je);if(n)n.focus(),je=null}function Gn({list:e,rowSelector:t,handleSelector:n,onMove:i}){let o=()=>[...e.querySelectorAll(t)],r=()=>o().forEach((g)=>g.classList.remove("is-dragging","drop-before","drop-after")),s=null,a=(g,h)=>{let m=o().filter((v,w)=>w!==h);if(m.forEach((v)=>v.classList.remove("drop-before","drop-after")),g<m.length)m[g].classList.add("drop-before");else m[m.length-1]?.classList.add("drop-after")},c=(g)=>{if(g.button!==0||!(g.target instanceof Element))return;let h=g.target.closest(n),m=h?.closest(t);if(!h||!m||!h.dataset.itemId)return;let v=o().indexOf(m);if(v<0)return;g.preventDefault();try{h.setPointerCapture(g.pointerId)}catch{}s={from:v,itemId:h.dataset.itemId,to:v,pointerId:g.pointerId,handle:h},m.classList.add("is-dragging")},l=(g)=>{if(!s||g.pointerId!==s.pointerId)return;let h=o().map((m)=>{let v=m.getBoundingClientRect();return v.top+v.height/2});s.to=Wo(g.clientY,h,s.from),a(s.to,s.from)},u=(g)=>{if(!s||g.pointerId!==s.pointerId)return;let{from:h,to:m,itemId:v,handle:w}=s;if(s=null,w.hasPointerCapture(g.pointerId))w.releasePointerCapture(g.pointerId);if(r(),m!==h)i(h,m,v)},y=(g)=>{if(g.key!=="ArrowUp"&&g.key!=="ArrowDown"||!(g.target instanceof Element))return;let h=g.target.closest(n),m=h?.closest(t);if(!h||!m||!h.dataset.itemId)return;g.preventDefault();let v=o(),w=v.indexOf(m),P=g.key==="ArrowUp"?w-1:w+1;if(w<0||P<0||P>=v.length)return;je=h.dataset.itemId,i(w,P,h.dataset.itemId)},f=()=>{s=null,r()};return e.addEventListener("pointerdown",c),e.addEventListener("pointermove",l),e.addEventListener("pointerup",u),e.addEventListener("pointercancel",f),e.addEventListener("keydown",y),()=>{e.removeEventListener("pointerdown",c),e.removeEventListener("pointermove",l),e.removeEventListener("pointerup",u),e.removeEventListener("pointercancel",f),e.removeEventListener("keydown",y)}}var Wn="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var oe="ytmd-sync-queue",Rt="ytmd-sync-queue-styles",Qe="data-ytmd-sync-queue",ve="data-ytmd-sync-queue-tab",Ko="M8 5v14l11-7z",Jo="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",Zo=/^[A-Za-z0-9_-]{11}$/;function Zn(e){if(typeof e!=="object"||e===null)return null;let t=e.serviceEndpoint?.queueAddEndpoint;if(typeof t!=="object"||t===null)return null;let{queueTarget:n,queueInsertPosition:i}=t;return{videoId:typeof n?.videoId==="string"&&Zo.test(n.videoId)?n.videoId:null,next:i==="INSERT_AFTER_CURRENT_VIDEO"}}function Xo(e){return`
  html[${Qe}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${Qe}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(e)};
    font-size: 14px;
  }
  html[${ve}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${oe} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${ve}] #${oe} { display: block; }
  .ytmd-sq-heading {
    margin: 16px 0 4px;
    font: 700 16px/24px var(--ytmd-font-display);
  }
  .ytmd-sq-heading:first-child { margin-top: 8px; }
  .ytmd-sq-hint { margin: 8px 0; color: var(--ytmd-text-secondary); }
  .ytmd-sq-row {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 0 8px;
    border-radius: 8px;
  }
  .ytmd-sq-row:hover { background: var(--ytmd-hover); }
  .ytmd-sq-thumb {
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    background: var(--ytmd-hover);
  }
  .ytmd-sq-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .ytmd-sq-title, .ytmd-sq-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ytmd-sq-title { font-weight: 500; }
  .ytmd-sq-sub { color: var(--ytmd-text-secondary); }
  /* Like YTM's own queue rows: actions only take room on hover or focus,
     so titles use the full width otherwise (still reachable by Tab). */
  .ytmd-sq-handle.ytmd-icon-btn { flex: 0 0 24px; width: 24px; cursor: grab; touch-action: none; }
  .ytmd-sq-handle.ytmd-icon-btn:hover { background: none; }
  .ytmd-sq-row.is-dragging { opacity: 0.5; }
  .ytmd-sq-row.is-dragging .ytmd-sq-handle { cursor: grabbing; }
  .ytmd-sq-row.drop-before { box-shadow: inset 0 2px 0 var(--ytmd-accent-color); }
  .ytmd-sq-row.drop-after { box-shadow: inset 0 -2px 0 var(--ytmd-accent-color); }
  .ytmd-sq-actions { display: flex; flex: 0 0 auto; max-width: 0; overflow: hidden; }
  .ytmd-sq-row:hover .ytmd-sq-actions, .ytmd-sq-row:focus-within .ytmd-sq-actions { max-width: 80px; }
`}function er(e){I();let t=document.getElementById(Rt);if(!t)t=p("style",{id:Rt}),document.head.appendChild(t);let n=Xo(e);if(t.textContent!==n)t.textContent=n}var Xn=".ytmd-sq-handle",tr=".ytmd-sq-queued";function Kn(e){let t=p("div",{className:"ytmd-sq-row"}),n=p("img",{className:"ytmd-sq-thumb"});n.alt="",n.loading="lazy",n.src=`https://i.ytimg.com/vi/${e.videoId}/default.jpg`;let i=p("div",{className:"ytmd-sq-text"});if(i.append(p("span",{className:"ytmd-sq-title",text:e.title}),p("span",{className:"ytmd-sq-sub",text:e.sub})),e.handle)t.appendChild(e.handle);if(t.append(n,i),e.actions.length){let o=p("div",{className:"ytmd-sq-actions"});o.append(...e.actions),t.appendChild(o)}return t}function Jn(e,t,n){let i=A({label:e,iconPath:t,muted:!0});return i.addEventListener("click",(o)=>{o.stopPropagation(),n()}),i}function ei(e,t,n){let i=d(),o=[];if(t.nowPlaying)o.push(p("div",{className:"ytmd-sq-heading",text:i.syncQueueNowPlaying})),o.push(Kn({...t.nowPlaying,sub:t.nowPlaying.artist,actions:[]}));if(o.push(p("div",{className:"ytmd-sq-heading",text:i.syncQueueTitle})),t.queue.length===0)o.push(p("p",{className:"ytmd-sq-hint",text:z(t.myRole)?i.syncQueueEmpty:i.syncQueueListenerHint}));let r=t.myRole==="host"||t.myRole==="moderator";for(let s of t.queue){let a=[];if(z(t.myRole))a.push(Jn(i.syncQueuePlayNow(s.title),Ko,()=>n.play(s.id)));if(r||s.added_by_id===t.myId)a.push(Jn(i.syncQueueRemove(s.title),Jo,()=>n.remove(s.id)));let c;if(z(t.myRole)&&t.queue.length>1)c=A({label:i.syncQueueDrag(s.title),iconPath:Wn,muted:!0}),c.classList.add("ytmd-sq-handle"),c.dataset.itemId=s.id;let l=i.syncQueueFrom(s.added_by),u=Kn({videoId:s.video_id,title:s.title,sub:s.artist?`${s.artist} · ${l}`:l,actions:a,handle:c});u.classList.add("ytmd-sq-queued"),o.push(u)}e.replaceChildren(...o),Qn(e,Xn)}var ie=null;function Ge(){let e=document.documentElement;if(!ie){e.removeAttribute(ve);return}let t=document.querySelector("ytmusic-player-page #side-panel"),n=document.getElementById(oe);if(t&&n?.parentElement!==t){if(!n)n=p("div",{id:oe}),Gn({list:n,rowSelector:tr,handleSelector:Xn,onMove:(o,r,s)=>ie?.actions.move(s,r)});n.setAttribute("role","region"),n.setAttribute("aria-label",d().syncQueueTitle),ei(n,ie.model,ie.actions),t.insertBefore(n,t.querySelector(":scope > #tab-renderer"))}let i=document.querySelector("ytmusic-player-page tp-yt-paper-tab");e.toggleAttribute(ve,!!n?.isConnected&&i?.getAttribute("aria-selected")==="true")}function ti(e,t){ie={model:e,actions:t},er(d().syncQueueTab),document.documentElement.setAttribute(Qe,"");let n=document.getElementById(oe);if(n)ei(n,e,t);Ge()}function At(){ie=null,document.documentElement.removeAttribute(Qe),document.documentElement.removeAttribute(ve),document.getElementById(oe)?.remove(),document.getElementById(Rt)?.remove()}function re(e){if(e.is_host)return"host";let t=e.members.find((n)=>n.id===e.current_user_id);return t?Fn(t):"dj"}function nr(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var j=/^[A-Za-z0-9_-]{11}$/,ir=2,or=0.25,rr=0.05,sr=3,ni=0.1,ar=0.5,lr=1,cr=1000,ur=1,ii=5000,dr=4000,oi=15000,mr=3,pr=4000,ri=1,yr=1e4,fr=5,gr=1e4,hr=1.2;function si(e,t){return Number.isFinite(t)&&t>ri?Math.min(e,t-ri):e}function br(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(j.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>ar)i.seekTo=si(e.current_time_secs,t.duration);return i}let o=e.current_time_secs+Math.min(lr,Math.max(0,n)),r=o-t.currentTime;if(Math.abs(r)>ir)i.seekTo=si(o,t.duration);else if(Math.abs(r)>(t.correcting?rr:or))i.playbackRate=1+Math.max(-ni,Math.min(ni,r/sr));return i}class ai{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function vr(e,t){return t!==null&&e<t&&t-e<gr}function li(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var wr=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function ci(){return new URLSearchParams(window.location.search).get("v")}function We(e){let t=document.getElementById("movie_player"),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&j.test(n)&&typeof i==="number"&&Number.isFinite(i))return{videoId:n,currentTime:i};return{videoId:ci(),currentTime:e?e.currentTime:0}}function Nt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function we(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class ui{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor(e=T){this.notify=e}lastBroadcast=null;pendingNav=null;transit=new ai;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;finished=null;rateCorrection=null;setRoomState(e,t,n=!0){let i=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,this.canControl=n,Qt(this.isGuest()),!i)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||Nt())return;if(vr(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(j.test(e.video_id))this.hostVideoId=e.video_id;let o=this.requestedVideo;if(o){if(e.video_id!==o.videoId&&n-o.atMs<dr)return;this.requestedVideo=null}let r=We(t);if(this.waitingForHostsNext(e,r.videoId,t,n)){this.endRateCorrection(),b.pause();return}let s={videoId:r.videoId,paused:t?t.paused:!0,currentTime:r.currentTime,duration:t?t.duration:NaN,correcting:this.rateCorrection!==null},a=br(e,s,i);if(a.navigateTo){this.endRateCorrection();let c=this.pendingNav;if(c&&c.videoId===a.navigateTo&&n-c.atMs<ii)return;let l=c&&c.videoId===a.navigateTo?c.attempts+1:1;if(this.pendingNav={videoId:a.navigateTo,atMs:n,attempts:l},this.rememberOwnNav(a.navigateTo,n),b.pause(),l>1)window.location.href=`https://music.youtube.com/watch?v=${a.navigateTo}`;else we(a.navigateTo);return}if(this.pendingNav=null,!t)return;if(a.setPlaying===!0)b.play();else if(a.setPlaying===!1)b.pause();if(a.seekTo!==null)this.endRateCorrection(),b.seekTo(a.seekTo);else this.setCatchUpRate(t,a.playbackRate)}waitingForHostsNext(e,t,n,i){let o=this.finished;return!!o&&e.video_id===o.videoId&&i-o.atMs<yr&&o.duration-e.current_time_secs<fr&&(t!==o.videoId||!!n?.ended)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>oi)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;if(Number.isFinite(e.duration)&&e.duration>0&&e.duration-e.currentTime<mr){this.nearEndAtMs=t;let{videoId:n}=We(e);if(n)this.finished={videoId:n,duration:e.duration,atMs:t}}}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!this.canControl||!e||!j.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<oi)return null;if(t-this.nearEndAtMs<pr)return null;if(this.requestedVideo?.videoId===e)return null;return this.requestedVideo={videoId:e,atMs:t},{kind:"play_video",video_id:e}}requestControl(e,t){if(!this.canControl){if(e.kind!=="next"){this.notify(d().syncListenerOnly);return}t("vote_sync_skip").then(()=>this.notify(d().syncVotedSkip)).catch((n)=>{console.error("[YTMD Room Sync] vote failed:",n),this.notify(d().actionFailed)});return}t("send_sync_control",{action:e}).catch((n)=>{console.error("[YTMD Room Sync] control request failed:",n),this.notify(d().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n,source:i}=e,o=i?.kind==="vote"?d().syncVoteSkipped:i?.kind==="queue"?d().syncFromQueue(i.title,t):null;switch(n.kind){case"next":b.next(),this.notify(o??d().syncGuestNext(t));break;case"previous":b.previous(),this.notify(o??d().syncGuestPrevious(t));break;case"set_playing":{let r=b.getVideo();if(!r||r.paused!==n.playing)return;if(n.playing)b.play();else b.pause();this.notify(o??(n.playing?d().syncGuestResumed(t):d().syncGuestPaused(t)));break}case"play_video":if(!j.test(n.video_id)||n.video_id===ci())return;we(n.video_id),this.notify(o??d().syncGuestPicked(t));break}}advanceQueue(e,t,n){if(!t||Nt())return;let i=t.duration-t.currentTime;if(!Number.isFinite(i)||i>hr&&!t.ended)return;this.playNextFromQueue(e,n,t,!1)}playNextFromQueue(e,t,n=b.getVideo(),i=!0,o=Date.now()){if(!this.inRoom||!this.isHost||e===0)return!1;let{videoId:r}=We(n),s=this.queueAdvance;if(s&&s.from===r&&o-s.atMs<ii)return!0;this.queueAdvance={from:r,atMs:o};let a=()=>{if(i)b.nextInYtm()};return t("sync_queue_take_next").then((c)=>{let l=c;if(!l||!j.test(l.video_id)){a();return}b.pause(),we(l.video_id),this.notify(d().syncFromQueue(l.title,l.added_by))}).catch((c)=>{console.error("[YTMD Room Sync] playing from the shared queue failed:",c),a()}),!0}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||Nt())return;if(t.ended)return;let{videoId:o,currentTime:r}=We(t);if(!o)return;let s=Date.now(),a=this.lastBroadcast,c=a?a.position+(s-a.atMs)/1000*a.rate:0,l=!!a&&a.playing&&!t.paused&&Math.abs(r-c)>ur,u=!!a&&a.videoId!==o;if(!i&&!l&&!u&&a&&s-a.atMs<cr)return;this.lastBroadcast={atMs:s,videoId:o,position:r,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:o,title:e.title,artist:e.artist,current_time_secs:r,is_playing:!t.paused,timestamp_ms:s}}).catch((y)=>console.error("[YTMD Room Sync] broadcast failed:",y))}}var L=null,Q=null,Ke=null,q=null,qt=null,Tr=1000;function di(){let e=q,t=Q;if(!e||!t){At();return}let n=qt,i=(o)=>(r)=>{t(o,{itemId:r}).catch((s)=>{console.error(`[YTMD Room Sync] ${o} failed:`,s),T(d().actionFailed)})};ti({queue:e.queue??[],nowPlaying:n?.videoId&&j.test(n.videoId)?{videoId:n.videoId,title:n.title,artist:n.artist}:null,myId:e.current_user_id,myRole:re(e)},{play:i("sync_queue_play"),remove:i("sync_queue_remove"),move:(o,r)=>{t("sync_queue_move",{itemId:o,toIndex:r}).catch((s)=>{console.error("[YTMD Room Sync] sync_queue_move failed:",s),T(d().actionFailed)})}})}function kr(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function xr(e,t){if(!q||!z(re(q))){T(d().syncQueueListenerNo);return}if(!e.videoId){T(d().syncQueueSongsOnly);return}t("sync_queue_add",{input:e.videoId,next:e.next}).then(()=>T(e.next?d().syncQueuedNext:d().syncQueued)).catch((n)=>{console.error("[YTMD Room Sync] adding to the shared queue failed:",n),T(d().actionFailed)})}function mi(e){let t=L;if(!t||!Q||!t.isGuest())return!1;let n=b.getVideo(),i=li(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,Q),!0}function pi(e){let t=L;if(!t||!Q||!t.isGuest())return!1;return t.requestControl({kind:"play_video",video_id:e},Q),!0}function Dt(e,t,n="left"){let i=q;if(q=e,Lt(e?{roomCode:e.room_code,listeners:e.members.length,isHost:e.is_host}:null),di(),!t)return;if(!e){if(!i)return;T(n==="kicked"?d().syncKicked:n==="lost"?d().syncLost:d().syncRoomClosed);return}if(!i||i.room_code!==e.room_code){if(!e.is_host)T(d().syncConnected);return}if(e.reconnecting){if(!i.reconnecting)T(d().syncReconnecting);return}let o=(y)=>y.members.find((f)=>f.is_host)?.id;if(o(i)!==o(e)){let y=e.members.find((f)=>f.is_host);if(e.is_host)T(d().syncYouHost);else if(y)T(d().syncNewHost(y.nickname));return}if(i.reconnecting)return;let{joined:r,left:s}=nr(i.members,e.members,e.current_user_id),a=[...r.map(d().syncJoined),...s.map(d().syncLeft)],c=e.skip_votes??[],l=c.filter((y)=>y!==e.current_user_id&&!(i.skip_votes??[]).includes(y));for(let y of l){let f=e.members.find((g)=>g.id===y)?.nickname;if(f)a.push(d().syncVoteProgress(f,c.length,jn(e.members.length)))}let u=re(e);if(u!==re(i))a.push(u==="moderator"?d().syncRoleModerator:u==="listener"?d().syncRoleListener:d().syncRoleDj);if(a.length>0)T(a.join(" · "))}var yi={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new ui;L=t,Q=e.invoke;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(r)=>{t.setRoomState(!0,r.payload.is_host,z(re(r.payload))),Dt(r.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",(r)=>{t.setRoomState(!1,!1),Dt(null,!0,r.payload?.reason??"left")}),window.__TAURI__.event.listen("sync-playback-remote",(r)=>{t.handleRemotePlayback(r.payload,e.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(r)=>{t.applyRemoteControl(r.payload)}),window.__TAURI__.event.listen("sync-reaction",(r)=>{mn(r.payload.emoji,r.payload.from)}));let i=(r)=>{if(!(r.target instanceof Element))return;let s=r.target;if(s.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(Ge,0);if(t.isInRoom()){let u=s.closest("ytmusic-menu-service-item-renderer"),y=u?Zn(u.data):null;if(y){r.preventDefault(),r.stopImmediatePropagation(),kr(),xr(y,e.invoke);return}}if(!r.isTrusted)return;if(t.isRoomHost()&&s.closest("ytmusic-player-bar .next-button")&&t.playNextFromQueue(q?.queue?.length??0,e.invoke)){r.preventDefault(),r.stopImmediatePropagation();return}if(!t.isGuest())return;let a=wr.find(([u])=>s.closest(u));if(!a)return;let c=e.getVideoElement(),l=li(a[1],c?c.paused:!0);if(!l)return;r.preventDefault(),r.stopImmediatePropagation(),t.requestControl(l,e.invoke)};window.addEventListener("click",i,!0);let o=setInterval(Ge,Tr);lt(()=>t.playNextFromQueue(q?.queue?.length??0,e.invoke)),e.invoke("get_sync_room_state").then((r)=>{if(L!==t||!r||typeof r!=="object")return;let s=r;if(t.setRoomState(!0,s.is_host,z(re(s))),Dt(s,!1),!s.is_host&&s.playback_state)t.handleRemotePlayback(s.playback_state,e.getVideoElement())}).catch((r)=>console.error("[YTMD Room Sync] failed to restore room state:",r)),Ke=()=>{n.forEach((r)=>r.then((s)=>s())),window.removeEventListener("click",i,!0),clearInterval(o),lt(null),t.setRoomState(!1,!1),L=null,Q=null,q=null,qt=null,Lt(null),At()}},onTrackChange(e,t){let n=L;if(!n)return;qt=e,di(),n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){L?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();L?.broadcastLocalState(t.track,n,t.invoke),L?.noteLocalTick(n),L?.advanceQueue(q?.queue?.length??0,n,t.invoke)},onDestroy(){if(Ke)Ke(),Ke=null}};var Je=null,_r=(e,t)=>t&&e!==!1,fi={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,o=(f)=>{if(n===f)return;n=f,e.invoke("set_inhibit_sleep",{inhibit:f}).catch((g)=>{n=!f,console.error("[YTMD Power] set_inhibit_sleep failed:",g)})},r=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},s=()=>{t?.release().catch(()=>{}),t=null},a=()=>{let f=e.getVideoElement(),g=!!f&&!f.paused&&!f.ended,h=_r(e.config.inhibit_sleep,g);if(o(h),h)r();else s()},c=(f)=>{for(let g of["play","playing","pause","ended"])f.addEventListener(g,a);i=f},l=(f)=>{for(let g of["play","playing","pause","ended"])f.removeEventListener(g,a)},u=e.getVideoElement();if(u)c(u);a();let y=window.setInterval(()=>{let f=e.getVideoElement();if(f&&f!==i){if(i)l(i);c(f),a()}},1000);Je=()=>{if(clearInterval(y),i)l(i);i=null,s(),o(!1)}},onDestroy(){if(Je)Je(),Je=null}};var hi=(e)=>typeof e==="object"&&e!==null&&!Array.isArray(e),x=(e,...t)=>t.reduce((n,i)=>n==null?void 0:n[i],e),Xe=/^[A-Za-z0-9_-]{11}$/;function se(e){let t=x(e,"runs");if(Array.isArray(t))return t.map((i)=>typeof x(i,"text")==="string"?x(i,"text"):"").join("");let n=x(e,"simpleText");return typeof n==="string"?n:""}function Vt(e){if(!Array.isArray(e)||e.length===0)return null;let t=x(e[e.length-1],"url");return typeof t==="string"?t:null}function gi(e,t){return se(x(e,"flexColumns",t,"musicResponsiveListItemFlexColumnRenderer","text"))}function Er(e){let t=x(e,"playlistItemData","videoId")??x(e,"overlay","musicItemThumbnailOverlayRenderer","content","musicPlayButtonRenderer","playNavigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Xe.test(t))return null;return{video_id:t,title:gi(e,0),subtitle:gi(e,1),thumbnail:Vt(x(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function Pr(e){let t=x(e,"title","runs",0,"navigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Xe.test(t))return null;return{video_id:t,title:se(x(e,"title")),subtitle:se(x(e,"subtitle")),thumbnail:Vt(x(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function Ht(e,t=20){let n=[],i=new Set,o=(r,s)=>{if(n.length>=t||s>40)return;if(Array.isArray(r)){for(let a of r)o(a,s+1);return}if(!hi(r))return;for(let[a,c]of Object.entries(r)){let l=null;if(a==="musicResponsiveListItemRenderer")l=Er(c);else if(a==="musicCardShelfRenderer")l=Pr(c);if(l&&!i.has(l.video_id)){if(i.add(l.video_id),n.push(l),n.length>=t)return}o(c,s+1)}};return o(e,0),n}function Ze(e){let t=x(e,"playlistPanelVideoRenderer")??x(e,"playlistPanelVideoWrapperRenderer","primaryRenderer","playlistPanelVideoRenderer");return hi(t)?t:null}function bi(e){let t=[];return e.forEach((n,i)=>{let o=Ze(n),r=x(o,"videoId");if(!o||typeof r!=="string")return;t.push({id:`${i}:${r}`,video_id:r,title:se(x(o,"title")),artist:se(x(o,"shortBylineText"))||se(x(o,"longBylineText")),thumbnail:Vt(x(o,"thumbnail","thumbnails")),current:x(o,"selected")===!0})}),t}function vi(e,t){let n=t.indexOf(":");if(n<=0)return-1;let i=Number(t.slice(0,n)),o=t.slice(n+1),r=Number.isInteger(i)?Ze(e[i]):null;if(r&&x(r,"videoId")===o)return i;return e.findIndex((s)=>x(Ze(s),"videoId")===o)}function wi(e,t){if(!t)return e.length;let n=e.findIndex((i)=>x(Ze(i),"selected")===!0);return n>=0?n+1:e.length}function Ti(e,t,n=15000){if(!e)return!0;let{position_secs:i,sampled_at_ms:o,...r}=e,{position_secs:s,sampled_at_ms:a,...c}=t;if(JSON.stringify(r)!==JSON.stringify(c))return!0;if(a-o>=n)return!0;let l=e.playing?i+(a-o)/1000:i;return Math.abs(s-l)>1.5}var Sr="EgWKAQIIAWoMEA4QChADEAQQCRAF",Cr=1000,Ir=2000;function zt(){return document.querySelector("#queue")}function rt(){let e=zt()?.queue?.store?.store?.getState().queue?.items;return Array.isArray(e)?e:[]}function et(e,t){let n=zt();if(!n?.dispatch)throw Error("remote.error.noQueue");n.dispatch({type:e,payload:t})}function xi(){let e=document.querySelector("ytmusic-app")?.networkManager;if(!e||typeof e.fetch!=="function")throw Error("remote.error.unsupported");return e}async function Mr(e){let t=xi(),n=Ht(await t.fetch("/search",{query:e,params:Sr}));if(n.length===0)n=Ht(await t.fetch("/search",{query:e}));return n}async function Lr(e,t){let n=zt()?.queue?.store?.store;if(!n)throw Error("remote.error.noQueue");let i=n.getState().queue??{},r=(await xi().fetch("/music/get_queue",{queueContextParams:i.queueContextParams,queueInsertPosition:t?"INSERT_AFTER_CURRENT_VIDEO":"INSERT_AT_END",videoIds:[e]}))?.queueDatas,s=Array.isArray(r)?r.map((c)=>c&&typeof c==="object"&&("content"in c)?c.content:null).filter(Boolean):[];if(s.length===0)throw Error("remote.error.unsupported");let a=rt();et("ADD_ITEMS",{nextQueueItemId:n.getState().queue?.nextQueueItemId,index:wi(a,t),items:s,shuffleEnabled:!1,shouldAssignIds:!0})}function Ot(e){let t=vi(rt(),e);if(t<0)throw Error("remote.error.gone");return t}function Rr(){let e=getComputedStyle(document.documentElement),t=e.getPropertyValue("--ytmd-accent-primary").trim(),n=e.getPropertyValue("--ytmd-accent-secondary").trim(),i=e.getPropertyValue("--ytmd-accent").trim();return t&&n&&i?{primary:t,secondary:n,accent:i}:null}function Ar(){let e=b.getVideo(),n=document.getElementById("movie_player")?.getCurrentTime?.();return{playing:!!e&&!e.paused&&!e.ended,position_secs:typeof n==="number"&&Number.isFinite(n)?n:e?.currentTime??0,sampled_at_ms:Date.now(),volume:e?le(e)/100:1,muted:e?ke(e):!1,like:b.getLikeStatus(),shuffle:b.isShuffleOn(),repeat:b.getRepeatMode(),accent:Rr()}}async function Nr(e,t){switch(t.kind){case"command":if(t.command==="shuffle")b.toggleShuffle();else if(t.command==="repeat")b.cycleRepeat();else e.sendPlayerCommand(t.command);return null;case"seek":return b.seekTo(t.position_secs),null;case"volume":return b.setVolume(t.volume),null;case"play":if(!Xe.test(t.video_id))throw Error("remote.error.invalid");if(!pi(t.video_id))we(t.video_id);return null;case"search":return Mr(t.query);case"enqueue":return await Lr(t.video_id,t.next),null;case"queue_jump":return et("SET_INDEX",Ot(t.item_id)),null;case"queue_remove":return et("REMOVE_ITEM",Ot(t.item_id)),null;case"queue_move":{let n=Ot(t.item_id),i=Math.max(0,Math.min(t.to_index,rt().length-1));return et("MOVE_ITEM",{fromIndex:n,toIndex:i}),null}}}var tt=[],nt=[],it=null,ot="";function _i(){nt.forEach((e)=>clearInterval(e)),nt=[],it=null,ot=""}function Dr(e){if(nt.length>0)return;let t=()=>{let i=Ar();if(!Ti(it,i))return;it=i,e.invoke("remote_publish",{kind:"state",data:i}).catch(()=>{return})},n=()=>{let i=bi(rt()),o=JSON.stringify(i);if(o===ot)return;ot=o,e.invoke("remote_publish",{kind:"queue",data:i}).catch(()=>{return})};t(),n(),nt.push(window.setInterval(t,Cr),window.setInterval(n,Ir))}function ki(e,t){if(t>0)Dr(e);else _i()}function Ei(e){let t=window.__TAURI__?.event;if(!t)return;t.listen("remote-action",({payload:n})=>{if(!n?.action)return;Nr(e,n.action).then((i)=>{if(n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!0,data:i??null}).catch(()=>{return});it=null,ot=""},(i)=>{let o=i instanceof Error?i.message:String(i);if(console.warn("[YTMD Remote] action failed:",n.action.kind,o),n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!1,error:o}).catch(()=>{return})})}).then((n)=>tt.push(n)),t.listen("remote-clients",({payload:n})=>ki(e,n)).then((n)=>tt.push(n)),e.invoke("remote_clients").then((n)=>ki(e,typeof n==="number"?n:0)).catch(()=>{return})}function Pi(){tt.forEach((e)=>e()),tt=[],_i()}var Si={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>Bt(e),Ei(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){Pi(),window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},qr=`
  .ytmd-qr-frame {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 212px;
    height: 212px;
    margin: 20px auto 12px;
    padding: 16px;
    box-sizing: border-box;
    border-radius: 12px;
    background: #fff;
    color: #606060;
    font-size: 12px;
    text-align: center;
  }
  .ytmd-qr-frame img { display: block; width: 180px; height: 180px; }
  .ytmd-qr-url {
    text-align: center;
    font-size: 14px;
    color: var(--ytmd-text);
    word-break: break-all;
    user-select: all;
  }
`;function Vr(){if(document.getElementById("ytmd-qr-styles"))return;let e=document.createElement("style");e.id="ytmd-qr-styles",e.textContent=qr,document.head.appendChild(e)}async function Bt(e){Vr();let t=p("p",{text:d().remoteBody,style:"margin: 0;"}),n=p("div",{className:"ytmd-qr-frame",text:d().remoteLoading}),i=p("div",{className:"ytmd-qr-url"}),o=Se({id:"ytmd-remote-modal",title:d().remoteTitle,body:[t,n,i],actions:[{label:d().close}]});try{let r=await e.invoke("get_remote_info");if(!n.isConnected)return;if(r?.qr_svg){let s=p("img");s.src=`data:image/svg+xml;utf8,${encodeURIComponent(r.qr_svg)}`,s.alt=d().remoteTitle,n.replaceChildren(s)}else n.textContent=d().remoteUnavailable;if(r?.url)i.textContent=r.url}catch(r){if(console.error("[YTMD Remote] Error fetching remote info:",r),n.isConnected)n.textContent=d().remoteUnavailable}return o}var Mi=null,Te=null,ae=(e)=>{B(e).catch((t)=>{console.error(`[YTMD] ${e} failed:`,t),T(d().actionFailed)})};function Hr(){Yn({onSyncChipClick:()=>ae("toggle_sync_window"),items:[{id:"settings",iconPath:_.tune,label:d().menuSettings,hint:"Ctrl+,",onSelect:()=>ae("toggle_settings_window")},{id:"local",iconPath:_.folderMusic,label:d().menuLocal,onSelect:()=>ae("toggle_local_library_window")},{id:"sync",iconPath:_.group,label:d().menuSync,onSelect:()=>ae("toggle_sync_window")},{id:"remote",iconPath:_.phone,label:d().menuRemote,onSelect:()=>{if(Te)Bt(Te)}},{id:"mini",iconPath:_.miniPlayer,label:d().menuMiniPlayer,onSelect:()=>ae("toggle_mini_player")},{id:"download",iconPath:_.download,label:d().menuDownload,dividerBefore:!0,onSelect:()=>{if(Te)Ct(Te,Mi)}}]})}var Or={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function Ci(e){let t={};for(let[n,[i,o]]of Object.entries(Or)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}async function Ii(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};Hr(),Mt();let t=setInterval(Mt,1000);window.addEventListener("pagehide",()=>clearInterval(t));try{let u=await B("get_config");if(u&&typeof u==="object")Object.assign(e,u)}catch(u){console.error("[YTMD] Failed to load config, using defaults:",u)}let n={track:null,config:e,invoke:B,sendPlayerCommand:(u)=>{c(u)},getVideoElement:()=>b.getVideo()};Te=n;let i=new ct(n);i.register(on),i.register(rn),i.register(vn),i.register(En),i.register(Pn),i.register(Sn),i.register(Cn),i.register(Ln),i.register(Nn),i.register(Dn),i.register(qn),i.register(Vn),i.register(yi),i.register(fi),i.register(Si);try{await i.initAll(Ci(e))}catch(u){console.error("[YTMD] Registry init error:",u)}let o=new st,r=0,s=Date.now();async function a(u,y,f){try{await B("update_track_info",{track:{title:u.title,artist:u.artist,album:u.album||null,cover_url:u.coverUrl||null,duration_secs:Math.round(u.durationSecs||0),current_time_secs:Math.round(y),is_playing:f,video_id:u.videoId||null,playlist_id:u.playlistId||null,sampled_at_ms:Date.now()}})}catch(g){console.error("[YTMD] Failed to sync track info to backend:",g)}}o.onTrackChange(async(u)=>{Mi=u,r=u.currentTimeSecs||0,s=Date.now(),i.handleTrackChange(u),await a(u,u.currentTimeSecs||0,u.isPlaying)}),o.onPlaybackChange(async(u)=>{i.handlePlaybackChange(u);let y=o.getCurrentTrack();if(y)y.isPlaying=u,r=y.currentTimeSecs||0,s=Date.now(),await a(y,y.currentTimeSecs||0,u)}),o.onTick((u)=>{i.handleTick(u);let y=o.getCurrentTrack();if(!y||!y.isPlaying)return;let f=Date.now(),g=(f-s)/1000,h=r+g;if(Math.abs(u-h)>2||g>=15)r=u,s=f,y.currentTimeSecs=Math.round(u),a(y,u,!0)});function c(u){if(mi(u))return;switch(u){case"play":b.play();break;case"pause":b.pause();break;case"play_pause":b.playPause();break;case"next":b.next();break;case"previous":b.previous();break;case"like":b.toggleLike();break;case"dislike":b.toggleDislike();break;case"mute":b.toggleMute();break}}let l=(u,y)=>{let f=window.__TAURI__;if(f?.event?.listen)f.event.listen(u,(g)=>y(g.payload))};l("player-command",(u)=>c(u)),l("tray-command",(u)=>c(u)),l("mpris-command",(u)=>c(u)),l("global-shortcut-event",(u)=>c(u)),l("player-seek",(u)=>b.seekTo(u)),l("mpris-command-seek",(u)=>b.seekTo(u)),l("player-volume",(u)=>b.setVolume(u)),l("config-updated",(u)=>{if(!u||typeof u!=="object")return;Object.assign(e,u);let y=Ci(e);for(let[f,g]of Object.entries(y))if(g)i.enable(f).catch((h)=>console.error(`[YTMD] Failed to enable plugin ${f}:`,h));else i.disable(f).catch((h)=>console.error(`[YTMD] Failed to disable plugin ${f}:`,h))}),window.addEventListener("keydown",(u)=>{if(u.ctrlKey&&u.key===","||u.key==="F2")u.preventDefault(),ae("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var zr=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(zr)if(Kt(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>Ii());else Ii();})();
