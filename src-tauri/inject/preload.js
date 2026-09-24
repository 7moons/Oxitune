(()=>{function Ct(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}var ri=1500;function si(e,t){let n=new URLSearchParams(e);if(!t||n.get("v")!==t)return;return n.get("list")||void 0}var Mt=(e)=>e.trim().replace(/\s+/g," ").toLowerCase();function ai(e,t){if(!e?.trim()||!t?.trim())return!0;return Mt(e)===Mt(t)}function li(e,t){if(!e)return"new";if(e.videoId&&t.videoId){if(e.videoId!==t.videoId)return"new"}else if(e.title!==t.title||e.artist!==t.artist)return"new";return e.title!==t.title||e.artist!==t.artist||!e.videoId&&!!t.videoId||!e.coverUrl&&!!t.coverUrl||!e.album&&!!t.album||t.durationSecs>0&&Math.abs(t.durationSecs-e.durationSecs)>1?"metadata":null}var ci=400;function di(e,t){return e-t>=ci}class Ge{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&di(Date.now(),this.lastTickMs))this.emitTick(n.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",s=i?.album||"",a="";if(i?.artwork&&i.artwork.length>0){let m=i.artwork[i.artwork.length-1];if(m&&m.src)a=m.src}if(!o){let m=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(m)o=m.textContent?.trim()||""}if(!r){let m=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(m){let T=(m.textContent?.trim()||"").split("•").map((E)=>E.trim());if(r=T[0]||"",T.length>1)s=T[1]}}if(!a){let m=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(m&&m.src)a=m.src}if(a.startsWith("//"))a=`https:${a}`;if(a.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(a))a=a.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let d=t?.getVideoData?.(),l=d?.video_id||new URLSearchParams(window.location.search).get("v")||void 0;if(l&&!ai(d?.title,i?.title)){let m=Date.now();if(this.titleMismatch?.videoId!==l)this.titleMismatch={videoId:l,sinceMs:m};if(m-this.titleMismatch.sinceMs<ri)return null}else this.titleMismatch=null;let c=0,y=0;if(t&&typeof t.getDuration==="function"){let m=t.getDuration();if(typeof m==="number"&&Number.isFinite(m)&&m>0)c=Math.floor(m)}if(t&&typeof t.getCurrentTime==="function"){let m=t.getCurrentTime();if(typeof m==="number"&&Number.isFinite(m)&&m>=0)y=Math.floor(m)}if(!c&&e&&Number.isFinite(e.duration)&&e.duration>0)c=Math.floor(e.duration);if(!y&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)y=Math.floor(e.currentTime);let f=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(f&&f.textContent){let m=f.textContent.split("/").map((b)=>b.trim());if(m.length===2){if(!y)y=Ct(m[0]);if(!c)c=Ct(m[1])}}if(!c){let b=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(b){let T=parseInt(b,10);if(!isNaN(T)&&T>0)c=T}}let g=e?!e.paused&&!e.ended:!1;if(!o)return null;let h=si(window.location.search,l)??(this.currentTrack?.videoId===l?this.currentTrack?.playlistId:void 0);return{title:o,artist:r||"Unknown Artist",album:s||void 0,coverUrl:a||void 0,durationSecs:c,currentTimeSecs:y,isPlaying:g,videoId:l,playlistId:h}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=li(this.currentTrack,e),n=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((i)=>i(e))}if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function Qe(){return document.getElementById("movie_player")}function It(e){for(let t of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let n=document.querySelector(t);if(!n||!("value"in n))continue;if("step"in n&&Number(n.step)>1)n.step=1;n.value=e}}function We(e){let t=Qe()?.getVolume?.(),n=typeof t==="number"&&Number.isFinite(t)?t:e.volume*100;return Math.max(0,Math.min(100,Math.round(n)))}function Lt(e){return Qe()?.isMuted?.()===!0||e.muted}function be(e,t){if(!Number.isFinite(e))return;let n=Math.max(0,Math.min(100,Math.round(e))),i=Qe();if(typeof i?.setVolume==="function"){if(i.setVolume(n),n>0&&i.isMuted?.())if(typeof i.unMute==="function")i.unMute();else t.muted=!1;It(n);return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1;It(n)}var At=!1;function Rt(e){At=e}function G(){return At}var Nt=null;function Ke(e){Nt=e}function Dt(){return Nt?.()??!1}class v{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){if(Dt())return;this.nextInYtm()}static nextInYtm(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)be(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}function ui(e,t){if(!t||typeof t!=="object"||!("ok"in t))throw Error(`Malformed response to ${e}`);let n=t;if(!n.ok)throw Error(n.error||`${e} failed`);return n.data??null}var mi=8000,O=(e,t={},n={})=>new Promise((i,o)=>{let r=window.__TAURI__;if(!r?.event?.emit){o(Error("Tauri bridge unavailable"));return}let s=Math.random().toString(36).slice(2)+Date.now().toString(36),a=null,d=setTimeout(()=>{if(a)a();o(Error(`Timed out waiting for ${e}`))},n.timeoutMs??mi);r.event.listen(`ytmd-response-${s}`,(l)=>{if(clearTimeout(d),a)a();try{i(ui(e,l.payload))}catch(c){o(c)}}).then((l)=>(a=l,r.event.emit("ytmd-invoke",{id:s,cmd:e,args:t}))).catch((l)=>{clearTimeout(d),o(l instanceof Error?l:Error(String(l)))})});var pi=15000,yi=100;function fi(e,t,n,i,o){if(i||o>pi)return"abandon";if(t&&t!==e.video_id)return"abandon";return t===e.video_id&&n?"apply":"wait"}var gi=()=>document.getElementById("movie_player")?.getVideoData?.()?.video_id||void 0;function Vt(){let e=location.pathname==="/watch"?new URLSearchParams(location.search).get("v"):null;if(!e)return;let t=!1,n=new Set,i=(d)=>{let l=d.target;if(t||!(l instanceof HTMLVideoElement)||l.muted)return;l.muted=!0,n.add(l)};document.addEventListener("loadstart",i,!0),document.addEventListener("play",i,!0);let o=()=>{if(t)return;t=!0,document.removeEventListener("loadstart",i,!0),document.removeEventListener("play",i,!0),n.forEach((d)=>d.muted=!1),n.clear()},r=(d,l)=>{let c=()=>{if(clearTimeout(y),l.removeEventListener("seeked",c),!d.autoplay)l.pause();o()},y=setTimeout(c,1000);if(l.addEventListener("seeked",c),l.currentTime=d.position_secs,d.autoplay)l.play().catch(()=>{return});else{l.pause();let f=()=>l.pause();l.addEventListener("play",f),setTimeout(()=>l.removeEventListener("play",f),1500)}},s=Date.now();(async()=>{for(let d=0;;d++)try{return await O("take_resume_session")}catch(l){if(d>=20||window.__TAURI__?.event?.emit)throw l;await new Promise((c)=>setTimeout(c,100))}})().then((d)=>{let l=d;if(!l||l.video_id!==e)return o();let c=setInterval(()=>{let y=document.querySelector("video"),f=fi(l,gi(),!!y&&y.readyState>=1,G(),Date.now()-s);if(f==="wait")return;if(clearInterval(c),f==="apply"&&y)r(l,y);else o()},yi)}).catch((d)=>{console.error("[YTMD] Resume failed:",d),o()})}class Je{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var ve=null,Q={adWasShowing:!1,preAdMuted:!1},Xe=new WeakSet,re=null,Bt=null,Ze=0,se=!0,hi=1000,bi=(e,t,n)=>e-t>=n,vi=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",Ti="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",wi=300,ki=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,xi=`
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
`,_i=ki+xi,Ei=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],Pi=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],Si=(e)=>Ei.some((t)=>e.includes(t)),Ci=(e,t)=>{let n=t.split("."),i=e;for(let r=0;r<n.length-1;r++){if(i===null||typeof i!=="object")return!1;i=i[n[r]]}let o=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,o))return delete i[o],!0;return!1},tt=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of Pi)if(Ci(e,n))t=!0;return t},Mi=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},qt=!1,Ii=()=>{if(qt)return;qt=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let o=await t(...i);if(!se||!Si(Mi(i[0])))return o;let r;try{r=await o.clone().json()}catch{return o}if(!tt(r))return o;let s=new Headers(o.headers);return s.delete("content-length"),s.delete("content-encoding"),new Response(JSON.stringify(r),{status:o.status,statusText:o.statusText,headers:s})};window.fetch=Object.assign(n,e)},zt=!1,Li=()=>{if(zt)return;zt=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(se)tt(n);return n}},Ht=!1,Ai=()=>{if(Ht)return;Ht=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(se)tt(t);e=t}})};if(typeof window<"u")Ii(),Li(),Ai();var Ri=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},Ni=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},nt=()=>document.getElementById("movie_player"),Di=()=>{let e=nt();if(!e)return!1;return Ri(e.classList)},et=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=Ni(Di(),Q,t.muted);if(Q=n,i!==null)t.muted=i},Ot=(e)=>{if(Xe.has(e))return;Xe.add(e),e.click()},Te=()=>{document.querySelectorAll(vi).forEach(Ot),document.querySelectorAll(Ti).forEach((e)=>{let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)Ot(t)})},Yt=(e)=>{let t=nt();if(Bt=t,!t)return;re?.disconnect(),re=new MutationObserver(()=>{et(e),Te()}),re.observe(t,{attributes:!0,attributeFilter:["class"]})},$t={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){se=!0,Q={adWasShowing:!1,preAdMuted:!1},Xe=new WeakSet,Ze=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=_i,document.head.appendChild(t);let n=null,i=new MutationObserver(()=>{if(n!==null)return;n=setTimeout(()=>{n=null,Te()},wi)});i.observe(document.body,{childList:!0,subtree:!0}),Yt(e),Te(),et(e),ve=()=>{if(se=!1,re?.disconnect(),re=null,i.disconnect(),n!==null)clearTimeout(n);document.getElementById("ytmd-adblock-styles")?.remove();let o=e.getVideoElement();if(o&&Q.adWasShowing)o.muted=Q.preAdMuted;Q={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(nt()!==Bt)Yt(t);et(t);let n=Date.now();if(bi(n,Ze,hi))Ze=n,Te()},onDestroy(){if(ve)ve(),ve=null}};var W=[],we="",it=new Set,Vi=(e,t)=>e===t,Ut={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){W=[],we="",it=new Set},onTrackChange(e){if(!e.videoId||e.videoId===we)return;let t=e.videoId;we=t,W=[],it=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(o)=>{if(!o.ok)return;let r=await o.json();if(!Vi(t,we))return;W=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!W||W.length===0||G())return;let n=it;for(let i of W){let[o,r]=i.segment;if(e>=o&&e<r-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let s=t.getVideoElement();if(s)s.currentTime=r,n.add(i.UUID);break}}}};function Ft(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function p(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var jt="ytmd-kit-styles",qi=`
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
`;function C(){if(document.getElementById(jt))return;let e=document.createElement("style");e.id=jt,e.textContent=qi,(document.head||document.documentElement).appendChild(e),zi()}var x={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function ae(e,t=24){return Ft(e,t,t)}function L(e){let t=p("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(ae(e.iconPath)),t}function Wt(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(ae(t))}function Kt(e,t){let n=e.querySelector("svg.ytmd-progress-ring");if(t===null){n?.remove();return}let i=17,o=2*Math.PI*i;if(!n){n=document.createElementNS("http://www.w3.org/2000/svg","svg"),n.setAttribute("class","ytmd-progress-ring"),n.setAttribute("viewBox","0 0 36 36");for(let a of["ytmd-progress-track","ytmd-progress-value"]){let d=document.createElementNS("http://www.w3.org/2000/svg","circle");d.setAttribute("class",a),d.setAttribute("cx","18"),d.setAttribute("cy","18"),d.setAttribute("r",String(i)),d.setAttribute("stroke-dasharray",String(o)),n.appendChild(d)}e.appendChild(n)}let r=Math.max(0,Math.min(1,t));n.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(o*(1-r)))}var Gt=!1;function zi(){if(Gt)return;Gt=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},o=(a)=>{let d=a.dataset.ytmdTooltip;if(!d)return;if(!e)e=p("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=d;let l=a.getBoundingClientRect(),c=e.getBoundingClientRect(),f=l.bottom+8+c.height<window.innerHeight?l.bottom+8:l.top-8-c.height,g=Math.max(8,Math.min(window.innerWidth-c.width-8,l.left+l.width/2-c.width/2));e.style.top=`${f}px`,e.style.left=`${g}px`,e.classList.add("ytmd-open")},r=(a)=>{let d=a.target?.closest?.("[data-ytmd-tooltip]");if(!d||d===n)return;i(),n=d,t=setTimeout(()=>o(d),250)},s=(a)=>{let d=a.relatedTarget;if(n&&d&&n.contains(d))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",s,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var Y=null;function w(e,t={}){C();let n=document.getElementById("ytmd-toast-host");if(!n)n=p("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),r=o?i:p("div",{className:"ytmd-toast"});if(t.id)r.dataset.toastId=t.id;let a=[p("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:l,onClick:c}=t.action,y=p("button",{className:"ytmd-button",text:l});y.type="button",y.addEventListener("click",()=>{Qt(),c()}),a.push(y)}if(r.replaceChildren(...a),!o)n.replaceChildren(r);if(Y!==null)clearTimeout(Y);Y=null;let d=t.durationMs??4000;if(d>0)Y=setTimeout(Qt,d)}var Hi=5,Oi=3000;function Jt(e,t){C();let n=document.getElementById("ytmd-reaction-host");if(!n)n=p("div",{id:"ytmd-reaction-host"}),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=p("div",{className:"ytmd-reaction"});i.append(p("span",{className:"ytmd-reaction-emoji",text:e}),p("span",{text:t})),n.appendChild(i);while(n.children.length>Hi)n.firstElementChild?.remove();setTimeout(()=>i.remove(),Oi)}function Qt(){if(Y!==null)clearTimeout(Y);Y=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function ke(e){C(),document.getElementById(e.id)?.remove();let t=p("div",{id:e.id,className:"ytmd-scrim"}),n=p("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=p("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),r=p("div",{className:"ytmd-dialog-body"});if(e.body)r.append(...e.body);let s=document.activeElement,a=()=>{document.removeEventListener("keydown",d,!0),t.remove(),s?.focus?.()},d=(c)=>{if(c.key==="Escape")c.stopPropagation(),a()};document.addEventListener("keydown",d,!0),t.addEventListener("click",(c)=>{if(c.target===t)a()});let l=p("div",{className:"ytmd-dialog-actions"});for(let c of e.actions){let y=p("button",{className:`ytmd-button${c.filled?" ytmd-button--filled":""}`,text:c.label});y.type="button",y.addEventListener("click",()=>c.onClick?c.onClick(a):a()),l.appendChild(y)}return n.append(o,r,l),t.appendChild(n),document.body.appendChild(t),l.querySelector("button")?.focus(),{close:a,body:r}}var Zt={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:(e,t,n)=>`${e} votes to skip (${t}/${n})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:(e,t)=>`From the shared queue: ${e} · ${t}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:(e)=>`${e} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:(e)=>`from ${e}`,syncQueuePlayNow:(e)=>`Play “${e}” now`,syncQueueRemove:(e)=>`Remove “${e}” from the queue`,syncQueueDrag:(e)=>`Move “${e}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",downloadNoTrack:"Play a song first to download it",downloadStarted:(e)=>`Downloading “${e}”`,downloadDone:(e)=>`Downloaded “${e}”`,downloadFailed:(e)=>`Download failed: ${e}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:(e)=>`Source: ${e}`,lyricsLocalFiles:"Local files",lyricsWrong:"Wrong lyrics?",lyricsPickTitle:"Choose lyrics",lyricsPickLoading:"Looking for other versions…",lyricsPickNone:"No other versions found",lyricsPickFailed:"Couldn’t switch the lyrics",lyricsTimed:"Timed",lyricsTextOnly:"Text only",lyricsCurrent:"Current",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`},Yi={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:(e,t,n)=>`${e} głosuje za pominięciem (${t}/${n})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:(e,t)=>`Ze wspólnej kolejki: ${e} · ${t}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:(e)=>`${e} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:(e)=>`od: ${e}`,syncQueuePlayNow:(e)=>`Zagraj teraz: „${e}”`,syncQueueRemove:(e)=>`Usuń z kolejki: „${e}”`,syncQueueDrag:(e)=>`Przesuń „${e}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:(e)=>`Pobieranie: „${e}”`,downloadDone:(e)=>`Pobrano: „${e}”`,downloadFailed:(e)=>`Nie udało się pobrać: ${e}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:(e)=>`Źródło: ${e}`,lyricsLocalFiles:"Pliki lokalne",lyricsWrong:"Zły tekst?",lyricsPickTitle:"Wybierz tekst",lyricsPickLoading:"Szukanie innych wersji…",lyricsPickNone:"Nie znaleziono innych wersji",lyricsPickFailed:"Nie udało się zmienić tekstu",lyricsTimed:"Z synchronizacją",lyricsTextOnly:"Sam tekst",lyricsCurrent:"Obecny",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`},Bi={en:Zt,pl:Yi};function $i(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return Bi[t]??Zt}var ot=null;function u(){if(!ot){let e=typeof document<"u"?document.documentElement.lang:"";ot=$i(e||(typeof navigator<"u"?navigator.language:"en"))}return ot}var le={video_id:null,provider:null,synced:[],plain:null,offset_secs:0,source_url:null};function Xt(e,t){let n=0,i=e.length-1,o=-1;while(n<=i){let r=n+i>>1;if(e[r].t<=t)o=r,n=r+1;else i=r-1}return o}function en(e,t,n){return Xt(e,t+n)}function tn(e,t,n){return e?.words?Xt(e.words,t+n):-1}function rt(e,t){switch(e){case"local":return t;case"lrclib":return"LRCLIB";case"musixmatch":return"Musixmatch";case"netease":return"NetEase";case"ytm":return"YouTube Music";case"genius":return"Genius";default:return e||""}}function xe(e){if(!e||typeof e!=="object")return{...le};let t=e;return{video_id:typeof t.video_id==="string"?t.video_id:null,provider:typeof t.provider==="string"?t.provider:null,synced:Array.isArray(t.synced)?t.synced.filter((n)=>typeof n?.t==="number"&&typeof n?.text==="string"):[],plain:typeof t.plain==="string"?t.plain:null,offset_secs:typeof t.offset_secs==="number"&&Number.isFinite(t.offset_secs)?t.offset_secs:0,source_url:typeof t.source_url==="string"?t.source_url:null}}var k={...le},R=!1,q=-1,B=-1,K="",Ee=0,at="",Pe=!1,A=null,_e=null,nn=(e,t)=>e===t,Ui=(e)=>e.videoId||`${e.title} - ${e.artist}`,rn={id:"lyrics",name:"Native Synced Lyrics",description:"Synchronized lyrics from several providers in the native Lyrics tab, with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){k={...le},R=!1,q=-1,B=-1,K="",at="",Pe=!1,A=null;let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=Fi,document.head.appendChild(t),C();let n=()=>{st(),eo(e),Gi(e)},i=()=>{setTimeout(()=>{st(),lt()},50),setTimeout(()=>{lt()},250)};document.addEventListener("click",i,!0);let o=window.setInterval(n,600);n(),Qi(e);let r=window.__TAURI__?.event?window.__TAURI__.event.listen("lyrics-changed",(s)=>{let a=xe(s.payload);if(!ji(a))return;ct(e,a)}):null;_e=()=>{clearInterval(o),document.removeEventListener("click",i,!0),r?.then((s)=>s()),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((s)=>s.remove())}},async onTrackChange(e,t){let n=Ui(e);if(A=e,n===K)return;K=n,k={...le,video_id:e.videoId??null},R=!0,q=-1,B=-1,at=an(),Pe=!1,st(),Ce(t),await sn(t,e,n,null)},onTick(e){Ee=e,Se(e,!0)},onDestroy(){if(_e)_e(),_e=null}},Fi=`
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
`;function ji(e){if(!A)return!1;if(e.video_id&&A.videoId)return e.video_id===A.videoId;return!e.video_id||e.video_id===A.videoId}async function sn(e,t,n,i){try{let o=xe(await e.invoke("fetch_lyrics",{videoId:t.videoId||null,artist:t.artist,title:t.title,albumName:t.album||null,duration:t.durationSecs||null,ytmPlain:i},{timeoutMs:15000}));if(!nn(n,K))return;R=!1,ct(e,o)}catch{if(!nn(n,K))return;R=!1,Ce(e)}}function ct(e,t){let n=t.provider!==null&&t.provider===k.provider&&t.synced.length===k.synced.length&&t.plain===k.plain&&t.video_id===k.video_id&&!R;if(R&&!t.provider&&t.offset_secs===k.offset_secs)return;if(k=t,R=!1,n){let i=document.querySelector(".ytmd-lyrics-offset-value");if(i)i.textContent=cn(t.offset_secs);Se(Ee,!1);return}q=-1,B=-1,Ce(e),Se(Ee,!1)}function Se(e,t){if(k.synced.length===0)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n)return;let i=n.querySelectorAll(".ytmd-native-lyric-line"),o=en(k.synced,e,k.offset_secs);if(o!==q){i[q]?.classList.remove("active"),i[q]?.querySelectorAll(".ytmd-sung").forEach((a)=>a.classList.remove("ytmd-sung")),q=o,B=-1;let s=i[o];if(s){s.classList.add("active");let a=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t&&a&&Ji(a))s.scrollIntoView({behavior:"smooth",block:"nearest"})}}let r=tn(k.synced[o],e,k.offset_secs);if(r!==B)i[o]?.querySelectorAll(".ytmd-lyric-word")?.forEach((a,d)=>a.classList.toggle("ytmd-sung",d<=r)),B=r}function an(){return document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description')?.textContent?.trim()||""}function Gi(e){if(Pe||R||!A||k.provider)return;let t=an();if(!t||t===at)return;Pe=!0,sn(e,A,K,t)}async function Qi(e){let t=Wi(),n=[...Ki(t)];if(n.length===0)return;try{await e.invoke("import_lyrics_offsets",{entries:n}),t?.removeItem?.(ln)}catch(i){console.warn("[YTMD Lyrics] Offset migration failed, will retry next start:",i)}}var ln="ytmd-lyrics-offsets";function Wi(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function Ki(e){try{let t=e?.getItem(ln);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function cn(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function Ji(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function Zi(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function st(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(Zi(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function Xi(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function lt(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=Xi();e.style.setProperty("display",t?"flex":"none","important")}function eo(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=p("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),q=-1,B=-1,Ce(e),Se(Ee,!1)}lt()}function ce(e,t,n){let i=p("button",{className:"ytmd-chip",text:e});return i.type="button",i.dataset.ytmdTooltip=t,i.setAttribute("aria-label",t),i.addEventListener("click",n),i}function to(){let e=u().lyricsSource(rt(k.provider,u().lyricsLocalFiles));if(k.source_url){let t=p("a",{className:"ytmd-lyrics-source",text:e});return t.href=k.source_url,t.target="_blank",t.rel="noopener noreferrer",t}return p("span",{className:"ytmd-lyrics-source",text:e})}function on(e,t){let n=p("div",{className:"ytmd-native-lyrics-footer"});if(n.append(to()),t){let i=p("span",{className:"ytmd-lyrics-offset-value",text:cn(k.offset_secs)}),o=(r)=>{let s=r===null?0:Math.round((k.offset_secs+r)*10)/10;e.invoke("set_lyrics_offset",{offsetSecs:s}).catch((a)=>console.warn("[YTMD Lyrics] offset:",a))};n.append(p("span",{text:u().lyricsOffset}),ce("−0.5 s",u().lyricsLater,()=>o(-0.5)),i,ce("+0.5 s",u().lyricsEarlier,()=>o(0.5)),ce(u().lyricsReset,u().lyricsReset,()=>o(null)))}return n.append(ce(u().lyricsWrong,u().lyricsPickTitle,()=>void dn(e))),n}async function dn(e){let t=p("div",{className:"ytmd-lyrics-pick-list"});t.append(p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsPickLoading}));let n=ke({id:"ytmd-lyrics-picker",title:u().lyricsPickTitle,body:[t],actions:[{label:u().close}]}),i=[];try{i=await e.invoke("list_lyrics_candidates",{},{timeoutMs:15000})||[]}catch{i=[]}if(!t.isConnected)return;if(i.length===0){t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsPickNone}));return}t.replaceChildren(...i.map((o)=>{let r=p("button",{className:"ytmd-menu-item"});r.type="button";let s=p("span",{className:"ytmd-menu-item-text"}),a=o.synced?u().lyricsTimed:u().lyricsTextOnly;if(s.append(p("span",{text:`${rt(o.provider,u().lyricsLocalFiles)} · ${a}`}),p("span",{className:"ytmd-menu-item-sub",text:`${o.title} — ${o.artist}`}),p("span",{className:"ytmd-menu-item-sub",text:o.preview})),r.append(s),o.selected)r.append(p("span",{className:"ytmd-menu-item-hint",text:u().lyricsCurrent}));return r.addEventListener("click",async()=>{n.close();try{ct(e,xe(await e.invoke("pick_lyrics",{provider:o.provider,id:o.id})))}catch{w(u().lyricsPickFailed)}}),r}))}function Ce(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(R)t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsLoading}));else if(k.synced.length>0)t.replaceChildren(...k.synced.map((n)=>{let i=p("div",{className:"ytmd-native-lyric-line"});if(n.words?.length)i.classList.add("ytmd-has-words"),i.append(...n.words.map((o)=>p("span",{className:"ytmd-lyric-word",text:o.text})));else i.textContent=n.text;return i.addEventListener("click",()=>{let o=e.getVideoElement();if(o)o.currentTime=Math.max(0,n.t-k.offset_secs)}),i}),on(e,!0));else if(k.plain)t.replaceChildren(...k.plain.split(`
`).map((n)=>p("div",{className:"ytmd-native-lyric-line ytmd-plain",text:n})),on(e,!1));else{let n=[p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsNone})];if(A)n.push(no(e));t.replaceChildren(...n)}}function no(e){let t=p("div",{className:"ytmd-native-lyrics-footer"});return t.append(p("span",{className:"ytmd-lyrics-source"}),ce(u().lyricsWrong,u().lyricsPickTitle,()=>void dn(e))),t}var de=null;function ue(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}var un={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){de?.(),C(),document.getElementById("ytmd-volume-indicator")?.remove();let t=p("div",{id:"ytmd-volume-indicator"});document.body.appendChild(t);let n=null,i=null,o=null,r=null,s=null,a=()=>{if(s!==null)window.clearTimeout(s);s=null,t.classList.remove("ytmd-visible")},d=()=>{if(s!==null)window.clearTimeout(s);t.classList.add("ytmd-visible"),s=window.setTimeout(()=>{s=null,t.classList.remove("ytmd-visible")},1800)},l=()=>{let m=e.getVideoElement();if(!m){r=null,a();return}let b=Lt(m)?0:We(m),T=r!==null&&b!==r;r=b;let E=document.querySelector("ytmusic-player-page #main-panel");if(!ue(E)){a();return}if(t.textContent!==`${b}%`)t.textContent=`${b}%`,t.setAttribute("aria-label",u().volumeLevel(b));let j=ue(document.querySelector("ytmusic-player-page #song-image")),V=ue(document.querySelector("ytmusic-player-page video"))||ue(document.querySelector("ytmusic-player-page #movie_player")),M=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?V||j:j||V)||ue(E);if(!M){a();return}let I=`${Math.max(8,M.left+12)}px`,S=`${Math.max(8,M.top+12)}px`;if(t.style.left!==I)t.style.left=I;if(t.style.top!==S)t.style.top=S;if(T)d()},c=()=>{let m=e.getVideoElement();if(m===n)return;n?.removeEventListener("volumechange",l),n=m,n?.addEventListener("volumechange",l),l()},y=()=>{let m=document.querySelector("ytmusic-player-page");if(m===i)return;if(o?.disconnect(),i=m,m)o=new MutationObserver(()=>window.requestAnimationFrame(l)),o.observe(m,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},f=(m)=>{let b=m.target;if(b instanceof Element&&b.closest("ytmusic-player-bar"))window.requestAnimationFrame(l)},g=(m)=>{if(m.deltaY===0||m.ctrlKey)return;let b=m.target;if(b instanceof Element&&b.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'))return;let T=(I)=>{if(!I)return!1;let S=I.getBoundingClientRect();return m.clientX>=S.left&&m.clientX<S.right&&m.clientY>=S.top&&m.clientY<S.bottom},E=T(document.querySelector("ytmusic-player-bar"))||T(document.querySelector("#player-bar-background")),j=e.config.wheel_volume_on_player_page===!0&&T(document.querySelector("ytmusic-player-page #main-panel"));if(!E&&!j)return;let V=e.getVideoElement();if(!V)return;let P=e.config.wheel_volume_step,M=typeof P==="number"&&Number.isFinite(P)&&P>0?Math.min(P,1):0.05;m.preventDefault(),be(We(V)+(m.deltaY<0?M:-M)*100,V),l()};window.addEventListener("wheel",g,{passive:!1}),window.addEventListener("resize",l),document.addEventListener("scroll",l,!0),document.addEventListener("input",f,!0),document.addEventListener("change",f,!0),y(),c();let h=window.setInterval(()=>{y(),c(),l()},500);de=()=>{window.removeEventListener("wheel",g),window.removeEventListener("resize",l),document.removeEventListener("scroll",l,!0),document.removeEventListener("input",f,!0),document.removeEventListener("change",f,!0),window.clearInterval(h),o?.disconnect(),n?.removeEventListener("volumechange",l),a(),t.remove()}},onDestroy(){if(de)de(),de=null}};var mn={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var Me=null,pn={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);Me=()=>{t?.remove()}},onDestroy(){if(Me)Me(),Me=null}};var Ie=[32,64,125,250,500,1000,2000,4000,8000,16000],dt={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function me(e){return Math.max(-24,Math.min(24,e))}function io(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function oo(e){return Math.max(0.5,Math.min(2,e))}class _{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=Ie.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!_.instance)_.instance=new _;return _.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=Ie.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===Ie.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=me(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=me(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=me(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,me(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=dt[e]||dt.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),io(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=oo(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??v.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class ut{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)_.getInstance().fadeIn(this.crossfadeSeconds);else _.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),_.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),_.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),v.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class mt{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=_.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,v.next()}else this.consecutiveSilentTicks=0}}var U=null,J=null,Le=null;function ro(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var yn={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=_.getInstance(),n=new ut,i=new mt;U=n,J=i;let o=e.config,r=null,s=()=>{if(r!==null)return;let d=e.getVideoElement();if(d){if(!t.isInitializedFor(d))t.init(d);return}r=window.setInterval(()=>{let l=e.getVideoElement();if(l){if(r!==null)clearInterval(r);r=null,t.init(l)}},500)};if(ro(o))s();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let a=[];if(window.__TAURI__?.event){let{listen:d}=window.__TAURI__.event;a.push(d("set-eq-band",(l)=>{s(),t.setBandGain(l.payload.bandIndex,l.payload.gain)}),d("set-eq-all",(l)=>{s(),t.setAllGains(l.payload.gains)}),d("set-eq-preset",(l)=>{s(),t.applyPreset(l.payload)}),d("set-preamp",(l)=>{s(),t.setPreamp(l.payload)}),d("set-loudness-normalization",(l)=>{if(l.payload)s();t.setLoudnessNormalization(l.payload)}),d("set-crossfade-seconds",(l)=>{if(l.payload>0)s();n.setCrossfadeSeconds(l.payload)}),d("set-skip-silence",(l)=>{if(l.payload)s();i.setEnabled(l.payload)}),d("set-playback-rate",(l)=>{t.setPlaybackRate(l.payload)}),d("set-preserves-pitch",(l)=>{t.setPreservesPitch(l.payload)}))}Le=()=>{if(r!==null)clearInterval(r),r=null;a.forEach((d)=>d.then((l)=>l())),U?.destroy(),U=null,J=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(_.getInstance().applyRateAndPitch(),U)U.onTrackChange(e);if(J)J.onTrackChange()},onTick(e,t){if(G())return;if(U)U.onTick(e,t.track);if(J)J.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(Le)Le(),Le=null}};var pt=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function fn(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let s=r.getImageData(0,0,16,16).data,a=0,d=0,l=0,c=0,y=0,f=0,g=0,h=0;for(let P=0;P<s.length;P+=4){let M=s[P],I=s[P+1],S=s[P+2];if(s[P+3]<128)continue;let St=(M+I+S)/3;if(St<20||St>240)continue;if(P<s.length/2)a+=M,d+=I,l+=S,c++;else y+=M,f+=I,g+=S,h++}if(c===0&&h===0){t(n);return}let m=c>0?Math.round(a/c):220,b=c>0?Math.round(d/c):38,T=c>0?Math.round(l/c):38,E=h>0?Math.round(y/h):24,j=h>0?Math.round(f/h):24,V=h>0?Math.round(g/h):27;t({primary:pt(m,b,T),secondary:pt(E,j,V),accent:pt(m+30,b+30,T+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var z=48,so=3,ao=3,lo=1.65,co=0.55;function uo(e,t,n,i){let o=new Float32Array(e.length),r=(s,a,d)=>{let l=d?n:t,c=d?t:n;for(let y=0;y<l;y++)for(let f=0;f<4;f++)for(let g=0;g<c;g++){let h=0,m=0;for(let T=Math.max(0,g-i);T<=Math.min(c-1,g+i);T++){let E=d?(y*t+T)*4+f:(T*t+y)*4+f;h+=s[E],m++}let b=d?(y*t+g)*4+f:(g*t+y)*4+f;a[b]=h/m}};r(e,o,!0),r(o,e,!1)}function mo(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],s=e[i+2],a=0.2126*o+0.7152*r+0.0722*s;e[i]=(a+(o-a)*t)*n,e[i+1]=(a+(r-a)*t)*n,e[i+2]=(a+(s-a)*t)*n}}async function gn(e,t=co){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=z,o.height=z;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,z,z);let s=r.getImageData(0,0,z,z);for(let a=0;a<ao;a++)uo(s.data,z,z,so);mo(s.data,lo,t),r.putImageData(s,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var Ae=null,Re=null,Ne,hn={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=p("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=p("img",{id:"ytmd-ambient-cover"});n.alt="";let i=p("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,s=document.createElement("style");s.id="ytmd-ambient-styles",s.textContent=`
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
    `,document.head.appendChild(s),Ae=(d)=>{if(t)t.style.opacity=String(d)};let a=[];if(window.__TAURI__?.event)a.push(window.__TAURI__.event.listen("set-ambient-intensity",(d)=>{Ae?.(d.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(d)=>{let l=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;Ae?.(d.payload?l:0)}));if(Re=()=>{a.forEach((d)=>d.then((l)=>l())),Ae=null,Ne=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===Ne)return;Ne=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await gn(t):null;if(t!==Ne)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await fn(t||""),o=document.documentElement.style;o.setProperty("--ytmd-accent",i.accent),o.setProperty("--ytmd-accent-primary",i.primary),o.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(Re)Re(),Re=null}};var bn=`
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

`,vn=`
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

`;var De=null,Tn={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(a)=>{let d=document.getElementById(a);if(!d){d=document.createElement("style"),d.id=a;let l=t();if(l)l.appendChild(d)}return d},i=(a)=>{let d=n("ytmd-active-theme");d.textContent=a?bn:vn},o=(a)=>{let d=n("ytmd-custom-css");if(d)d.textContent=a};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let s=[];if(window.__TAURI__?.event)s.push(window.__TAURI__.event.listen("set-ambient-enabled",(a)=>{i(a.payload)}),window.__TAURI__.event.listen("set-custom-css",(a)=>{o(a.payload)}));De=()=>{s.forEach((a)=>a.then((d)=>d()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(De)De(),De=null}};var Ve=null,wn={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=L({id:"ytmd-pip-btn",label:u().pipButton,iconPath:x.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(s){console.warn("[YTMD PiP] Could not enter PiP:",s),await e.invoke("toggle_mini_player").catch((a)=>console.error("[YTMD PiP] Mini player fallback failed:",a))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),Ve=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(Ve)Ve(),Ve=null}};function po(e){if(e.error)return"failed";if(e.output_path&&e.percent>=100)return"done";return"progress"}var ze="ytmd-download-btn",yo=3000,Z=new Map,yt=new Set,He=null,qe=null;function X(){let e=document.getElementById(ze);if(!e)return;let t=He?.videoId,n=t?Z.get(t):void 0;Kt(e,n?Math.max(0.05,n.fraction):null),Wt(e,t&&yt.has(t)?x.check:x.download),e.setAttribute("aria-disabled",t?"false":"true");let i=n?u().downloadInProgress:u().downloadButton;e.setAttribute("aria-label",i),e.dataset.ytmdTooltip=i}function ft(e,t){let n=Z.get(e);if(!n)return;if(Z.delete(e),t.ok)yt.add(e),setTimeout(()=>{yt.delete(e),X()},yo),w(u().downloadDone(n.title),{id:`download-${e}`});else w(u().downloadFailed(t.reason),{id:`download-${e}`,durationMs:8000});X()}function fo(e){let t=Z.get(e.video_id);if(!t)return;let n=po(e);if(n==="failed")ft(e.video_id,{ok:!1,reason:e.error||e.status});else if(n==="done")ft(e.video_id,{ok:!0});else t.fraction=e.percent/100,X()}function gt(e,t){let n=t?.videoId;if(!t||!n){w(u().downloadNoTrack);return}if(Z.has(n)){w(u().downloadInProgress);return}Z.set(n,{title:t.title,fraction:0}),X(),w(u().downloadStarted(t.title),{id:`download-${n}`}),e.invoke("download_track",{request:{video_id:n,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:e.config.download_format||"mp3",embed_lyrics:e.config.embed_lyrics!==!1}}).catch((i)=>{console.error("[YTMD Downloader] Download failed:",i),ft(n,{ok:!1,reason:i instanceof Error?i.message:String(i)})})}var kn={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){He=e.track;let t=()=>{if(document.getElementById(ze))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!o)return;let r=L({id:ze,label:u().downloadButton,iconPath:x.download});r.addEventListener("click",()=>{if(r.getAttribute("aria-disabled")==="true")return;gt(e,He)}),o.appendChild(r),X()},n=window.setInterval(t,1000);t();let i=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(o)=>fo(o.payload)):null;qe=()=>{clearInterval(n),i?.then((o)=>o()),document.getElementById(ze)?.remove()}},onTrackChange(e){He=e,X()},onDestroy(){if(qe)qe(),qe=null}};var xn={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};var Oe="ytmd-nav-slot",ht="ytmd-menu-btn",ye="ytmd-menu",_n="ytmd-sync-chip",Pn=[],pe=null,Sn=null,En=!1,go=`
  #${Oe} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function ho(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=go,document.head.appendChild(e)}function bo(e){if(!e)return;return`${u().syncInRoom} · ${u().syncListeners(e.listeners)}`}function Cn(e){Pn=e.items,Sn=e.onSyncChipClick}function bt(){if(document.getElementById(Oe)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;C(),ho();let t=p("div",{id:Oe}),n=L({id:ht,label:u().menuLabel,iconPath:x.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),To(n)}),t.appendChild(n),e.prepend(t),Mn(),ko()}function vt(e){pe=e,Mn();let t=document.getElementById(ye);if(t?.classList.contains("ytmd-open"))In(t)}function Mn(){let e=document.getElementById(Oe);if(!e)return;let t=document.getElementById(_n);if(!pe){t?.remove();return}if(!t)t=p("button",{id:_n,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>Sn?.()),e.prepend(t);let n=u().syncListeners(pe.listeners);t.replaceChildren(p("span",{className:"ytmd-chip-dot"}),ae(x.group,18),p("span",{text:n})),t.dataset.ytmdTooltip=`${u().syncInRoom} · ${pe.roomCode}`,t.setAttribute("aria-label",`${u().syncInRoom}, ${n}`)}function In(e){let t=[];for(let n of Pn){if(n.dividerBefore)t.push(p("div",{className:"ytmd-menu-divider"}));let i=p("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=p("span",{className:"ytmd-menu-item-text"});o.appendChild(p("span",{text:n.label}));let r=n.id==="sync"?bo(pe):void 0;if(r)o.appendChild(p("span",{className:"ytmd-menu-item-sub",text:r}));if(i.append(ae(n.iconPath),o),n.hint)i.appendChild(p("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{ee(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function vo(){let e=document.getElementById(ye);if(!e)e=p("div",{id:ye,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",wo),document.body.appendChild(e);return e}function To(e){let t=vo();if(t.classList.contains("ytmd-open")){ee();return}In(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function ee(){let e=document.getElementById(ye);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById(ht);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function wo(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),ee();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")ee()}function ko(){if(En)return;En=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(ye);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(ht)?.contains(n))return;ee()}),window.addEventListener("resize",ee)}function Ln(e){return e.is_host?"host":e.role??"dj"}function H(e){return e!=="listener"}function An(e){return Math.floor(e/2)+1}function xo(e,t,n){let i=0;return t.forEach((o,r)=>{if(r!==n&&e>o)i++}),i}var Ye=null;function Rn(e,t){if(!Ye)return;let n=[...e.querySelectorAll(t)].find((i)=>i.dataset.itemId===Ye);if(n)n.focus(),Ye=null}function Nn({list:e,rowSelector:t,handleSelector:n,onMove:i}){let o=()=>[...e.querySelectorAll(t)],r=()=>o().forEach((g)=>g.classList.remove("is-dragging","drop-before","drop-after")),s=null,a=(g,h)=>{let m=o().filter((b,T)=>T!==h);if(m.forEach((b)=>b.classList.remove("drop-before","drop-after")),g<m.length)m[g].classList.add("drop-before");else m[m.length-1]?.classList.add("drop-after")},d=(g)=>{if(g.button!==0||!(g.target instanceof Element))return;let h=g.target.closest(n),m=h?.closest(t);if(!h||!m||!h.dataset.itemId)return;let b=o().indexOf(m);if(b<0)return;g.preventDefault();try{h.setPointerCapture(g.pointerId)}catch{}s={from:b,itemId:h.dataset.itemId,to:b,pointerId:g.pointerId,handle:h},m.classList.add("is-dragging")},l=(g)=>{if(!s||g.pointerId!==s.pointerId)return;let h=o().map((m)=>{let b=m.getBoundingClientRect();return b.top+b.height/2});s.to=xo(g.clientY,h,s.from),a(s.to,s.from)},c=(g)=>{if(!s||g.pointerId!==s.pointerId)return;let{from:h,to:m,itemId:b,handle:T}=s;if(s=null,T.hasPointerCapture(g.pointerId))T.releasePointerCapture(g.pointerId);if(r(),m!==h)i(h,m,b)},y=(g)=>{if(g.key!=="ArrowUp"&&g.key!=="ArrowDown"||!(g.target instanceof Element))return;let h=g.target.closest(n),m=h?.closest(t);if(!h||!m||!h.dataset.itemId)return;g.preventDefault();let b=o(),T=b.indexOf(m),E=g.key==="ArrowUp"?T-1:T+1;if(T<0||E<0||E>=b.length)return;Ye=h.dataset.itemId,i(T,E,h.dataset.itemId)},f=()=>{s=null,r()};return e.addEventListener("pointerdown",d),e.addEventListener("pointermove",l),e.addEventListener("pointerup",c),e.addEventListener("pointercancel",f),e.addEventListener("keydown",y),()=>{e.removeEventListener("pointerdown",d),e.removeEventListener("pointermove",l),e.removeEventListener("pointerup",c),e.removeEventListener("pointercancel",f),e.removeEventListener("keydown",y)}}var Dn="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var ne="ytmd-sync-queue",Tt="ytmd-sync-queue-styles",Be="data-ytmd-sync-queue",fe="data-ytmd-sync-queue-tab",_o="M8 5v14l11-7z",Eo="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",Po=/^[A-Za-z0-9_-]{11}$/;function zn(e){if(typeof e!=="object"||e===null)return null;let t=e.serviceEndpoint?.queueAddEndpoint;if(typeof t!=="object"||t===null)return null;let{queueTarget:n,queueInsertPosition:i}=t;return{videoId:typeof n?.videoId==="string"&&Po.test(n.videoId)?n.videoId:null,next:i==="INSERT_AFTER_CURRENT_VIDEO"}}function So(e){return`
  html[${Be}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${Be}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(e)};
    font-size: 14px;
  }
  html[${fe}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${ne} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${fe}] #${ne} { display: block; }
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
`}function Co(e){C();let t=document.getElementById(Tt);if(!t)t=p("style",{id:Tt}),document.head.appendChild(t);let n=So(e);if(t.textContent!==n)t.textContent=n}var Hn=".ytmd-sq-handle",Mo=".ytmd-sq-queued";function Vn(e){let t=p("div",{className:"ytmd-sq-row"}),n=p("img",{className:"ytmd-sq-thumb"});n.alt="",n.loading="lazy",n.src=`https://i.ytimg.com/vi/${e.videoId}/default.jpg`;let i=p("div",{className:"ytmd-sq-text"});if(i.append(p("span",{className:"ytmd-sq-title",text:e.title}),p("span",{className:"ytmd-sq-sub",text:e.sub})),e.handle)t.appendChild(e.handle);if(t.append(n,i),e.actions.length){let o=p("div",{className:"ytmd-sq-actions"});o.append(...e.actions),t.appendChild(o)}return t}function qn(e,t,n){let i=L({label:e,iconPath:t,muted:!0});return i.addEventListener("click",(o)=>{o.stopPropagation(),n()}),i}function On(e,t,n){let i=u(),o=[];if(t.nowPlaying)o.push(p("div",{className:"ytmd-sq-heading",text:i.syncQueueNowPlaying})),o.push(Vn({...t.nowPlaying,sub:t.nowPlaying.artist,actions:[]}));if(o.push(p("div",{className:"ytmd-sq-heading",text:i.syncQueueTitle})),t.queue.length===0)o.push(p("p",{className:"ytmd-sq-hint",text:H(t.myRole)?i.syncQueueEmpty:i.syncQueueListenerHint}));let r=t.myRole==="host"||t.myRole==="moderator";for(let s of t.queue){let a=[];if(H(t.myRole))a.push(qn(i.syncQueuePlayNow(s.title),_o,()=>n.play(s.id)));if(r||s.added_by_id===t.myId)a.push(qn(i.syncQueueRemove(s.title),Eo,()=>n.remove(s.id)));let d;if(H(t.myRole)&&t.queue.length>1)d=L({label:i.syncQueueDrag(s.title),iconPath:Dn,muted:!0}),d.classList.add("ytmd-sq-handle"),d.dataset.itemId=s.id;let l=i.syncQueueFrom(s.added_by),c=Vn({videoId:s.video_id,title:s.title,sub:s.artist?`${s.artist} · ${l}`:l,actions:a,handle:d});c.classList.add("ytmd-sq-queued"),o.push(c)}e.replaceChildren(...o),Rn(e,Hn)}var te=null;function $e(){let e=document.documentElement;if(!te){e.removeAttribute(fe);return}let t=document.querySelector("ytmusic-player-page #side-panel"),n=document.getElementById(ne);if(t&&n?.parentElement!==t){if(!n)n=p("div",{id:ne}),Nn({list:n,rowSelector:Mo,handleSelector:Hn,onMove:(o,r,s)=>te?.actions.move(s,r)});n.setAttribute("role","region"),n.setAttribute("aria-label",u().syncQueueTitle),On(n,te.model,te.actions),t.insertBefore(n,t.querySelector(":scope > #tab-renderer"))}let i=document.querySelector("ytmusic-player-page tp-yt-paper-tab");e.toggleAttribute(fe,!!n?.isConnected&&i?.getAttribute("aria-selected")==="true")}function Yn(e,t){te={model:e,actions:t},Co(u().syncQueueTab),document.documentElement.setAttribute(Be,"");let n=document.getElementById(ne);if(n)On(n,e,t);$e()}function wt(){te=null,document.documentElement.removeAttribute(Be),document.documentElement.removeAttribute(fe),document.getElementById(ne)?.remove(),document.getElementById(Tt)?.remove()}function ie(e){if(e.is_host)return"host";let t=e.members.find((n)=>n.id===e.current_user_id);return t?Ln(t):"dj"}function Io(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var F=/^[A-Za-z0-9_-]{11}$/,Lo=2,Ao=0.25,Ro=0.05,No=3,Bn=0.1,Do=0.5,Vo=1,qo=1000,zo=1,$n=5000,Ho=4000,Un=15000,Oo=3,Yo=4000,Fn=1,Bo=1e4,$o=5,Uo=1e4,Fo=1.2;function jn(e,t){return Number.isFinite(t)&&t>Fn?Math.min(e,t-Fn):e}function jo(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(F.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>Do)i.seekTo=jn(e.current_time_secs,t.duration);return i}let o=e.current_time_secs+Math.min(Vo,Math.max(0,n)),r=o-t.currentTime;if(Math.abs(r)>Lo)i.seekTo=jn(o,t.duration);else if(Math.abs(r)>(t.correcting?Ro:Ao))i.playbackRate=1+Math.max(-Bn,Math.min(Bn,r/No));return i}class Gn{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function Go(e,t){return t!==null&&e<t&&t-e<Uo}function Qn(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var Qo=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function Wn(){return new URLSearchParams(window.location.search).get("v")}function Ue(e){let t=document.getElementById("movie_player"),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&F.test(n)&&typeof i==="number"&&Number.isFinite(i))return{videoId:n,currentTime:i};return{videoId:Wn(),currentTime:e?e.currentTime:0}}function kt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function xt(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class Kn{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor(e=w){this.notify=e}lastBroadcast=null;pendingNav=null;transit=new Gn;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;finished=null;rateCorrection=null;setRoomState(e,t,n=!0){let i=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,this.canControl=n,Rt(this.isGuest()),!i)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||kt())return;if(Go(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(F.test(e.video_id))this.hostVideoId=e.video_id;let o=this.requestedVideo;if(o){if(e.video_id!==o.videoId&&n-o.atMs<Ho)return;this.requestedVideo=null}let r=Ue(t);if(this.waitingForHostsNext(e,r.videoId,t,n)){this.endRateCorrection(),v.pause();return}let s={videoId:r.videoId,paused:t?t.paused:!0,currentTime:r.currentTime,duration:t?t.duration:NaN,correcting:this.rateCorrection!==null},a=jo(e,s,i);if(a.navigateTo){this.endRateCorrection();let d=this.pendingNav;if(d&&d.videoId===a.navigateTo&&n-d.atMs<$n)return;let l=d&&d.videoId===a.navigateTo?d.attempts+1:1;if(this.pendingNav={videoId:a.navigateTo,atMs:n,attempts:l},this.rememberOwnNav(a.navigateTo,n),v.pause(),l>1)window.location.href=`https://music.youtube.com/watch?v=${a.navigateTo}`;else xt(a.navigateTo);return}if(this.pendingNav=null,!t)return;if(a.setPlaying===!0)v.play();else if(a.setPlaying===!1)v.pause();if(a.seekTo!==null)this.endRateCorrection(),v.seekTo(a.seekTo);else this.setCatchUpRate(t,a.playbackRate)}waitingForHostsNext(e,t,n,i){let o=this.finished;return!!o&&e.video_id===o.videoId&&i-o.atMs<Bo&&o.duration-e.current_time_secs<$o&&(t!==o.videoId||!!n?.ended)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>Un)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;if(Number.isFinite(e.duration)&&e.duration>0&&e.duration-e.currentTime<Oo){this.nearEndAtMs=t;let{videoId:n}=Ue(e);if(n)this.finished={videoId:n,duration:e.duration,atMs:t}}}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!this.canControl||!e||!F.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<Un)return null;if(t-this.nearEndAtMs<Yo)return null;if(this.requestedVideo?.videoId===e)return null;return this.requestedVideo={videoId:e,atMs:t},{kind:"play_video",video_id:e}}requestControl(e,t){if(!this.canControl){if(e.kind!=="next"){this.notify(u().syncListenerOnly);return}t("vote_sync_skip").then(()=>this.notify(u().syncVotedSkip)).catch((n)=>{console.error("[YTMD Room Sync] vote failed:",n),this.notify(u().actionFailed)});return}t("send_sync_control",{action:e}).catch((n)=>{console.error("[YTMD Room Sync] control request failed:",n),this.notify(u().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n,source:i}=e,o=i?.kind==="vote"?u().syncVoteSkipped:i?.kind==="queue"?u().syncFromQueue(i.title,t):null;switch(n.kind){case"next":v.next(),this.notify(o??u().syncGuestNext(t));break;case"previous":v.previous(),this.notify(o??u().syncGuestPrevious(t));break;case"set_playing":{let r=v.getVideo();if(!r||r.paused!==n.playing)return;if(n.playing)v.play();else v.pause();this.notify(o??(n.playing?u().syncGuestResumed(t):u().syncGuestPaused(t)));break}case"play_video":if(!F.test(n.video_id)||n.video_id===Wn())return;xt(n.video_id),this.notify(o??u().syncGuestPicked(t));break}}advanceQueue(e,t,n){if(!t||kt())return;let i=t.duration-t.currentTime;if(!Number.isFinite(i)||i>Fo&&!t.ended)return;this.playNextFromQueue(e,n,t,!1)}playNextFromQueue(e,t,n=v.getVideo(),i=!0,o=Date.now()){if(!this.inRoom||!this.isHost||e===0)return!1;let{videoId:r}=Ue(n),s=this.queueAdvance;if(s&&s.from===r&&o-s.atMs<$n)return!0;this.queueAdvance={from:r,atMs:o};let a=()=>{if(i)v.nextInYtm()};return t("sync_queue_take_next").then((d)=>{let l=d;if(!l||!F.test(l.video_id)){a();return}v.pause(),xt(l.video_id),this.notify(u().syncFromQueue(l.title,l.added_by))}).catch((d)=>{console.error("[YTMD Room Sync] playing from the shared queue failed:",d),a()}),!0}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||kt())return;if(t.ended)return;let{videoId:o,currentTime:r}=Ue(t);if(!o)return;let s=Date.now(),a=this.lastBroadcast,d=a?a.position+(s-a.atMs)/1000*a.rate:0,l=!!a&&a.playing&&!t.paused&&Math.abs(r-d)>zo,c=!!a&&a.videoId!==o;if(!i&&!l&&!c&&a&&s-a.atMs<qo)return;this.lastBroadcast={atMs:s,videoId:o,position:r,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:o,title:e.title,artist:e.artist,current_time_secs:r,is_playing:!t.paused,timestamp_ms:s}}).catch((y)=>console.error("[YTMD Room Sync] broadcast failed:",y))}}var N=null,ge=null,Fe=null,D=null,Et=null,Wo=1000;function Jn(){let e=D,t=ge;if(!e||!t){wt();return}let n=Et,i=(o)=>(r)=>{t(o,{itemId:r}).catch((s)=>{console.error(`[YTMD Room Sync] ${o} failed:`,s),w(u().actionFailed)})};Yn({queue:e.queue??[],nowPlaying:n?.videoId&&F.test(n.videoId)?{videoId:n.videoId,title:n.title,artist:n.artist}:null,myId:e.current_user_id,myRole:ie(e)},{play:i("sync_queue_play"),remove:i("sync_queue_remove"),move:(o,r)=>{t("sync_queue_move",{itemId:o,toIndex:r}).catch((s)=>{console.error("[YTMD Room Sync] sync_queue_move failed:",s),w(u().actionFailed)})}})}function Ko(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function Jo(e,t){if(!D||!H(ie(D))){w(u().syncQueueListenerNo);return}if(!e.videoId){w(u().syncQueueSongsOnly);return}t("sync_queue_add",{input:e.videoId,next:e.next}).then(()=>w(e.next?u().syncQueuedNext:u().syncQueued)).catch((n)=>{console.error("[YTMD Room Sync] adding to the shared queue failed:",n),w(u().actionFailed)})}function Zn(e){let t=N;if(!t||!ge||!t.isGuest())return!1;let n=v.getVideo(),i=Qn(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,ge),!0}function _t(e,t,n="left"){let i=D;if(D=e,vt(e?{roomCode:e.room_code,listeners:e.members.length,isHost:e.is_host}:null),Jn(),!t)return;if(!e){if(!i)return;w(n==="kicked"?u().syncKicked:n==="lost"?u().syncLost:u().syncRoomClosed);return}if(!i||i.room_code!==e.room_code){if(!e.is_host)w(u().syncConnected);return}if(e.reconnecting){if(!i.reconnecting)w(u().syncReconnecting);return}let o=(y)=>y.members.find((f)=>f.is_host)?.id;if(o(i)!==o(e)){let y=e.members.find((f)=>f.is_host);if(e.is_host)w(u().syncYouHost);else if(y)w(u().syncNewHost(y.nickname));return}if(i.reconnecting)return;let{joined:r,left:s}=Io(i.members,e.members,e.current_user_id),a=[...r.map(u().syncJoined),...s.map(u().syncLeft)],d=e.skip_votes??[],l=d.filter((y)=>y!==e.current_user_id&&!(i.skip_votes??[]).includes(y));for(let y of l){let f=e.members.find((g)=>g.id===y)?.nickname;if(f)a.push(u().syncVoteProgress(f,d.length,An(e.members.length)))}let c=ie(e);if(c!==ie(i))a.push(c==="moderator"?u().syncRoleModerator:c==="listener"?u().syncRoleListener:u().syncRoleDj);if(a.length>0)w(a.join(" · "))}var Xn={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Kn;N=t,ge=e.invoke;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(r)=>{t.setRoomState(!0,r.payload.is_host,H(ie(r.payload))),_t(r.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",(r)=>{t.setRoomState(!1,!1),_t(null,!0,r.payload?.reason??"left")}),window.__TAURI__.event.listen("sync-playback-remote",(r)=>{t.handleRemotePlayback(r.payload,e.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(r)=>{t.applyRemoteControl(r.payload)}),window.__TAURI__.event.listen("sync-reaction",(r)=>{Jt(r.payload.emoji,r.payload.from)}));let i=(r)=>{if(!(r.target instanceof Element))return;let s=r.target;if(s.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout($e,0);if(t.isInRoom()){let c=s.closest("ytmusic-menu-service-item-renderer"),y=c?zn(c.data):null;if(y){r.preventDefault(),r.stopImmediatePropagation(),Ko(),Jo(y,e.invoke);return}}if(!r.isTrusted)return;if(t.isRoomHost()&&s.closest("ytmusic-player-bar .next-button")&&t.playNextFromQueue(D?.queue?.length??0,e.invoke)){r.preventDefault(),r.stopImmediatePropagation();return}if(!t.isGuest())return;let a=Qo.find(([c])=>s.closest(c));if(!a)return;let d=e.getVideoElement(),l=Qn(a[1],d?d.paused:!0);if(!l)return;r.preventDefault(),r.stopImmediatePropagation(),t.requestControl(l,e.invoke)};window.addEventListener("click",i,!0);let o=setInterval($e,Wo);Ke(()=>t.playNextFromQueue(D?.queue?.length??0,e.invoke)),e.invoke("get_sync_room_state").then((r)=>{if(N!==t||!r||typeof r!=="object")return;let s=r;if(t.setRoomState(!0,s.is_host,H(ie(s))),_t(s,!1),!s.is_host&&s.playback_state)t.handleRemotePlayback(s.playback_state,e.getVideoElement())}).catch((r)=>console.error("[YTMD Room Sync] failed to restore room state:",r)),Fe=()=>{n.forEach((r)=>r.then((s)=>s())),window.removeEventListener("click",i,!0),clearInterval(o),Ke(null),t.setRoomState(!1,!1),N=null,ge=null,D=null,Et=null,vt(null),wt()}},onTrackChange(e,t){let n=N;if(!n)return;Et=e,Jn(),n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){N?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();N?.broadcastLocalState(t.track,n,t.invoke),N?.noteLocalTick(n),N?.advanceQueue(D?.queue?.length??0,n,t.invoke)},onDestroy(){if(Fe)Fe(),Fe=null}};var je=null,Zo=(e,t)=>t&&e!==!1,ei={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,o=(f)=>{if(n===f)return;n=f,e.invoke("set_inhibit_sleep",{inhibit:f}).catch((g)=>{n=!f,console.error("[YTMD Power] set_inhibit_sleep failed:",g)})},r=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},s=()=>{t?.release().catch(()=>{}),t=null},a=()=>{let f=e.getVideoElement(),g=!!f&&!f.paused&&!f.ended,h=Zo(e.config.inhibit_sleep,g);if(o(h),h)r();else s()},d=(f)=>{for(let g of["play","playing","pause","ended"])f.addEventListener(g,a);i=f},l=(f)=>{for(let g of["play","playing","pause","ended"])f.removeEventListener(g,a)},c=e.getVideoElement();if(c)d(c);a();let y=window.setInterval(()=>{let f=e.getVideoElement();if(f&&f!==i){if(i)l(i);d(f),a()}},1000);je=()=>{if(clearInterval(y),i)l(i);i=null,s(),o(!1)}},onDestroy(){if(je)je(),je=null}};var ti={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>Pt(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},Xo=`
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
`;function er(){if(document.getElementById("ytmd-qr-styles"))return;let e=document.createElement("style");e.id="ytmd-qr-styles",e.textContent=Xo,document.head.appendChild(e)}async function Pt(e){er();let t=p("p",{text:u().remoteBody,style:"margin: 0;"}),n=p("div",{className:"ytmd-qr-frame",text:u().remoteLoading}),i=p("div",{className:"ytmd-qr-url"}),o=ke({id:"ytmd-remote-modal",title:u().remoteTitle,body:[t,n,i],actions:[{label:u().close}]});try{let r=await e.invoke("get_remote_info");if(!n.isConnected)return;if(r?.qr_svg){let s=p("img");s.src=`data:image/svg+xml;utf8,${encodeURIComponent(r.qr_svg)}`,s.alt=u().remoteTitle,n.replaceChildren(s)}else n.textContent=u().remoteUnavailable;if(r?.url)i.textContent=r.url}catch(r){if(console.error("[YTMD Remote] Error fetching remote info:",r),n.isConnected)n.textContent=u().remoteUnavailable}return o}var oi=null,he=null,oe=(e)=>{O(e).catch((t)=>{console.error(`[YTMD] ${e} failed:`,t),w(u().actionFailed)})};function tr(){Cn({onSyncChipClick:()=>oe("toggle_sync_window"),items:[{id:"settings",iconPath:x.tune,label:u().menuSettings,hint:"Ctrl+,",onSelect:()=>oe("toggle_settings_window")},{id:"local",iconPath:x.folderMusic,label:u().menuLocal,onSelect:()=>oe("toggle_local_library_window")},{id:"sync",iconPath:x.group,label:u().menuSync,onSelect:()=>oe("toggle_sync_window")},{id:"remote",iconPath:x.phone,label:u().menuRemote,onSelect:()=>{if(he)Pt(he)}},{id:"mini",iconPath:x.miniPlayer,label:u().menuMiniPlayer,onSelect:()=>oe("toggle_mini_player")},{id:"download",iconPath:x.download,label:u().menuDownload,dividerBefore:!0,onSelect:()=>{if(he)gt(he,oi)}}]})}var nr={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function ni(e){let t={};for(let[n,[i,o]]of Object.entries(nr)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}async function ii(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};tr(),bt();let t=setInterval(bt,1000);window.addEventListener("pagehide",()=>clearInterval(t));try{let c=await O("get_config");if(c&&typeof c==="object")Object.assign(e,c)}catch(c){console.error("[YTMD] Failed to load config, using defaults:",c)}let n={track:null,config:e,invoke:O,sendPlayerCommand:(c)=>{d(c)},getVideoElement:()=>v.getVideo()};he=n;let i=new Je(n);i.register($t),i.register(Ut),i.register(rn),i.register(un),i.register(mn),i.register(pn),i.register(yn),i.register(hn),i.register(Tn),i.register(wn),i.register(kn),i.register(xn),i.register(Xn),i.register(ei),i.register(ti);try{await i.initAll(ni(e))}catch(c){console.error("[YTMD] Registry init error:",c)}let o=new Ge,r=0,s=Date.now();async function a(c,y,f){try{await O("update_track_info",{track:{title:c.title,artist:c.artist,album:c.album||null,cover_url:c.coverUrl||null,duration_secs:Math.round(c.durationSecs||0),current_time_secs:Math.round(y),is_playing:f,video_id:c.videoId||null,playlist_id:c.playlistId||null,sampled_at_ms:Date.now()}})}catch(g){console.error("[YTMD] Failed to sync track info to backend:",g)}}o.onTrackChange(async(c)=>{oi=c,r=c.currentTimeSecs||0,s=Date.now(),i.handleTrackChange(c),await a(c,c.currentTimeSecs||0,c.isPlaying)}),o.onPlaybackChange(async(c)=>{i.handlePlaybackChange(c);let y=o.getCurrentTrack();if(y)y.isPlaying=c,r=y.currentTimeSecs||0,s=Date.now(),await a(y,y.currentTimeSecs||0,c)}),o.onTick((c)=>{i.handleTick(c);let y=o.getCurrentTrack();if(!y||!y.isPlaying)return;let f=Date.now(),g=(f-s)/1000,h=r+g;if(Math.abs(c-h)>2||g>=15)r=c,s=f,y.currentTimeSecs=Math.round(c),a(y,c,!0)});function d(c){if(Zn(c))return;switch(c){case"play":v.play();break;case"pause":v.pause();break;case"play_pause":v.playPause();break;case"next":v.next();break;case"previous":v.previous();break;case"like":v.toggleLike();break;case"dislike":v.toggleDislike();break;case"mute":v.toggleMute();break}}let l=(c,y)=>{let f=window.__TAURI__;if(f?.event?.listen)f.event.listen(c,(g)=>y(g.payload))};l("player-command",(c)=>d(c)),l("tray-command",(c)=>d(c)),l("mpris-command",(c)=>d(c)),l("global-shortcut-event",(c)=>d(c)),l("player-seek",(c)=>v.seekTo(c)),l("mpris-command-seek",(c)=>v.seekTo(c)),l("player-volume",(c)=>v.setVolume(c)),l("config-updated",(c)=>{if(!c||typeof c!=="object")return;Object.assign(e,c);let y=ni(e);for(let[f,g]of Object.entries(y))if(g)i.enable(f).catch((h)=>console.error(`[YTMD] Failed to enable plugin ${f}:`,h));else i.disable(f).catch((h)=>console.error(`[YTMD] Failed to disable plugin ${f}:`,h))}),window.addEventListener("keydown",(c)=>{if(c.ctrlKey&&c.key===","||c.key==="F2")c.preventDefault(),oe("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var ir=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(ir)if(Vt(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>ii());else ii();})();
