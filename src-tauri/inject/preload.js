(()=>{function At(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}var bi=1500,Nt=(e)=>e.trim().replace(/\s+/g," ").toLowerCase();function vi(e,t){if(!e?.trim()||!t?.trim())return!0;return Nt(e)===Nt(t)}function wi(e,t){if(!e)return"new";if(e.videoId&&t.videoId){if(e.videoId!==t.videoId)return"new"}else if(e.title!==t.title||e.artist!==t.artist)return"new";return e.title!==t.title||e.artist!==t.artist||!e.videoId&&!!t.videoId||!e.coverUrl&&!!t.coverUrl||!e.album&&!!t.album||t.durationSecs>0&&Math.abs(t.durationSecs-e.durationSecs)>1?"metadata":null}var ki=400;function Ti(e,t){return e-t>=ki}class Ze{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&Ti(Date.now(),this.lastTickMs))this.emitTick(n.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",a=i?.album||"",s="";if(i?.artwork&&i.artwork.length>0){let p=i.artwork[i.artwork.length-1];if(p&&p.src)s=p.src}if(!o){let p=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(p)o=p.textContent?.trim()||""}if(!r){let p=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(p){let v=(p.textContent?.trim()||"").split("•").map((w)=>w.trim());if(r=v[0]||"",v.length>1)a=v[1]}}if(!s){let p=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(p&&p.src)s=p.src}if(s.startsWith("//"))s=`https:${s}`;if(s.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(s))s=s.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let c=t?.getVideoData?.(),u=c?.video_id||new URLSearchParams(window.location.search).get("v")||void 0;if(u&&!vi(c?.title,i?.title)){let p=Date.now();if(this.titleMismatch?.videoId!==u)this.titleMismatch={videoId:u,sinceMs:p};if(p-this.titleMismatch.sinceMs<bi)return null}else this.titleMismatch=null;let l=0,m=0;if(t&&typeof t.getDuration==="function"){let p=t.getDuration();if(typeof p==="number"&&Number.isFinite(p)&&p>0)l=Math.floor(p)}if(t&&typeof t.getCurrentTime==="function"){let p=t.getCurrentTime();if(typeof p==="number"&&Number.isFinite(p)&&p>=0)m=Math.floor(p)}if(!l&&e&&Number.isFinite(e.duration)&&e.duration>0)l=Math.floor(e.duration);if(!m&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)m=Math.floor(e.currentTime);let y=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(y&&y.textContent){let p=y.textContent.split("/").map((h)=>h.trim());if(p.length===2){if(!m)m=At(p[0]);if(!l)l=At(p[1])}}if(!l){let h=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(h){let v=parseInt(h,10);if(!isNaN(v)&&v>0)l=v}}let f=e?!e.paused&&!e.ended:!1;if(!o)return null;return{title:o,artist:r||"Unknown Artist",album:a||void 0,coverUrl:s||void 0,durationSecs:l,currentTimeSecs:m,isPlaying:f,videoId:u}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=wi(this.currentTrack,e),n=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((i)=>i(e))}if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function et(){return document.getElementById("movie_player")}function Dt(e){for(let t of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let n=document.querySelector(t);if(!n||!("value"in n))continue;if("step"in n&&Number(n.step)>1)n.step=1;n.value=e}}function ne(e){let t=et()?.getVolume?.(),n=typeof t==="number"&&Number.isFinite(t)?t:e.volume*100;return Math.max(0,Math.min(100,Math.round(n)))}function be(e){return et()?.isMuted?.()===!0||e.muted}function ve(e,t){if(!Number.isFinite(e))return;let n=Math.max(0,Math.min(100,Math.round(e))),i=et();if(typeof i?.setVolume==="function"){if(i.setVolume(n),n>0&&i.isMuted?.())if(typeof i.unMute==="function")i.unMute();else t.muted=!1;Dt(n);return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1;Dt(n)}var qt=!1;function Vt(e){qt=e}function we(){return qt}var Ot=null;function tt(e){Ot=e}function zt(){return Ot?.()??!1}class b{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){if(zt())return;this.nextInYtm()}static nextInYtm(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)ve(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static getLikeStatus(){let e=document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer")?.getAttribute("like-status");return e==="LIKE"?"like":e==="DISLIKE"?"dislike":"none"}static getRepeatMode(){let e=document.querySelector("ytmusic-player-bar")?.getAttribute("repeat-mode");return e==="ALL"?"all":e==="ONE"?"one":"none"}static isShuffleOn(){return document.querySelector("ytmusic-player-bar")?.hasAttribute("shuffle-on")??!1}static toggleShuffle(){document.querySelector("ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button")?.click()}static cycleRepeat(){document.querySelector("ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button")?.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class nt{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var ke=null,F={adWasShowing:!1,preAdMuted:!1},ot=new WeakSet,ie=null,Ft=null,it=0,oe=!0,xi=1000,Ei=(e,t,n)=>e-t>=n,_i=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",Pi="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",Si=300,Ci=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,Ii=`
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
`,Mi=Ci+Ii,Li=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],Ri=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],Ai=(e)=>Li.some((t)=>e.includes(t)),Ni=(e,t)=>{let n=t.split("."),i=e;for(let r=0;r<n.length-1;r++){if(i===null||typeof i!=="object")return!1;i=i[n[r]]}let o=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,o))return delete i[o],!0;return!1},st=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of Ri)if(Ni(e,n))t=!0;return t},Di=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},Ht=!1,qi=()=>{if(Ht)return;Ht=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let o=await t(...i);if(!oe||!Ai(Di(i[0])))return o;let r;try{r=await o.clone().json()}catch{return o}if(!st(r))return o;let a=new Headers(o.headers);return a.delete("content-length"),a.delete("content-encoding"),new Response(JSON.stringify(r),{status:o.status,statusText:o.statusText,headers:a})};window.fetch=Object.assign(n,e)},Bt=!1,Vi=()=>{if(Bt)return;Bt=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(oe)st(n);return n}},Yt=!1,Oi=()=>{if(Yt)return;Yt=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(oe)st(t);e=t}})};if(typeof window<"u")qi(),Vi(),Oi();var zi=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},Hi=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},at=()=>document.getElementById("movie_player"),Bi=()=>{let e=at();if(!e)return!1;return zi(e.classList)},rt=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=Hi(Bi(),F,t.muted);if(F=n,i!==null)t.muted=i},$t=(e)=>{if(ot.has(e))return;ot.add(e),e.click()},Te=()=>{document.querySelectorAll(_i).forEach($t),document.querySelectorAll(Pi).forEach((e)=>{let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)$t(t)})},Ut=(e)=>{let t=at();if(Ft=t,!t)return;ie?.disconnect(),ie=new MutationObserver(()=>{rt(e),Te()}),ie.observe(t,{attributes:!0,attributeFilter:["class"]})},Qt={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){oe=!0,F={adWasShowing:!1,preAdMuted:!1},ot=new WeakSet,it=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=Mi,document.head.appendChild(t);let n=null,i=new MutationObserver(()=>{if(n!==null)return;n=setTimeout(()=>{n=null,Te()},Si)});i.observe(document.body,{childList:!0,subtree:!0}),Ut(e),Te(),rt(e),ke=()=>{if(oe=!1,ie?.disconnect(),ie=null,i.disconnect(),n!==null)clearTimeout(n);document.getElementById("ytmd-adblock-styles")?.remove();let o=e.getVideoElement();if(o&&F.adWasShowing)o.muted=F.preAdMuted;F={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(at()!==Ft)Ut(t);rt(t);let n=Date.now();if(Ei(n,it,xi))it=n,Te()},onDestroy(){if(ke)ke(),ke=null}};var Q=[],xe="",lt=new Set,Yi=(e,t)=>e===t,jt={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){Q=[],xe="",lt=new Set},onTrackChange(e){if(!e.videoId||e.videoId===xe)return;let t=e.videoId;xe=t,Q=[],lt=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(o)=>{if(!o.ok)return;let r=await o.json();if(!Yi(t,xe))return;Q=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!Q||Q.length===0||we())return;let n=lt;for(let i of Q){let[o,r]=i.segment;if(e>=o&&e<r-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let a=t.getVideoElement();if(a)a.currentTime=r,n.add(i.UUID);break}}}};function Gt(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function g(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var Kt="ytmd-kit-styles",$i=`
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
`;function C(){if(document.getElementById(Kt))return;let e=document.createElement("style");e.id=Kt,e.textContent=$i,(document.head||document.documentElement).appendChild(e),Ui()}var x={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function re(e,t=24){return Gt(e,t,t)}function N(e){let t=g("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(re(e.iconPath)),t}function Xt(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(re(t))}function Zt(e,t){let n=e.querySelector("svg.ytmd-progress-ring");if(t===null){n?.remove();return}let i=17,o=2*Math.PI*i;if(!n){n=document.createElementNS("http://www.w3.org/2000/svg","svg"),n.setAttribute("class","ytmd-progress-ring"),n.setAttribute("viewBox","0 0 36 36");for(let s of["ytmd-progress-track","ytmd-progress-value"]){let c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("class",s),c.setAttribute("cx","18"),c.setAttribute("cy","18"),c.setAttribute("r",String(i)),c.setAttribute("stroke-dasharray",String(o)),n.appendChild(c)}e.appendChild(n)}let r=Math.max(0,Math.min(1,t));n.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(o*(1-r)))}var Wt=!1;function Ui(){if(Wt)return;Wt=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},o=(s)=>{let c=s.dataset.ytmdTooltip;if(!c)return;if(!e)e=g("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=c;let u=s.getBoundingClientRect(),l=e.getBoundingClientRect(),y=u.bottom+8+l.height<window.innerHeight?u.bottom+8:u.top-8-l.height,f=Math.max(8,Math.min(window.innerWidth-l.width-8,u.left+u.width/2-l.width/2));e.style.top=`${y}px`,e.style.left=`${f}px`,e.classList.add("ytmd-open")},r=(s)=>{let c=s.target?.closest?.("[data-ytmd-tooltip]");if(!c||c===n)return;i(),n=c,t=setTimeout(()=>o(c),250)},a=(s)=>{let c=s.relatedTarget;if(n&&c&&n.contains(c))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",a,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var z=null;function T(e,t={}){C();let n=document.getElementById("ytmd-toast-host");if(!n)n=g("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),r=o?i:g("div",{className:"ytmd-toast"});if(t.id)r.dataset.toastId=t.id;let s=[g("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:u,onClick:l}=t.action,m=g("button",{className:"ytmd-button",text:u});m.type="button",m.addEventListener("click",()=>{Jt(),l()}),s.push(m)}if(r.replaceChildren(...s),!o)n.replaceChildren(r);if(z!==null)clearTimeout(z);z=null;let c=t.durationMs??4000;if(c>0)z=setTimeout(Jt,c)}var Fi=5,Qi=3000;function en(e,t){C();let n=document.getElementById("ytmd-reaction-host");if(!n)n=g("div",{id:"ytmd-reaction-host"}),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=g("div",{className:"ytmd-reaction"});i.append(g("span",{className:"ytmd-reaction-emoji",text:e}),g("span",{text:t})),n.appendChild(i);while(n.children.length>Fi)n.firstElementChild?.remove();setTimeout(()=>i.remove(),Qi)}function Jt(){if(z!==null)clearTimeout(z);z=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function tn(e){C(),document.getElementById(e.id)?.remove();let t=g("div",{id:e.id,className:"ytmd-scrim"}),n=g("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=g("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),r=g("div",{className:"ytmd-dialog-body"});if(e.body)r.append(...e.body);let a=document.activeElement,s=()=>{document.removeEventListener("keydown",c,!0),t.remove(),a?.focus?.()},c=(l)=>{if(l.key==="Escape")l.stopPropagation(),s()};document.addEventListener("keydown",c,!0),t.addEventListener("click",(l)=>{if(l.target===t)s()});let u=g("div",{className:"ytmd-dialog-actions"});for(let l of e.actions){let m=g("button",{className:`ytmd-button${l.filled?" ytmd-button--filled":""}`,text:l.label});m.type="button",m.addEventListener("click",()=>l.onClick?l.onClick(s):s()),u.appendChild(m)}return n.append(o,r,u),t.appendChild(n),document.body.appendChild(t),u.querySelector("button")?.focus(),{close:s,body:r}}var nn={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:(e,t,n)=>`${e} votes to skip (${t}/${n})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:(e,t)=>`From the shared queue: ${e} · ${t}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:(e)=>`${e} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:(e)=>`from ${e}`,syncQueuePlayNow:(e)=>`Play “${e}” now`,syncQueueRemove:(e)=>`Remove “${e}” from the queue`,syncQueueDrag:(e)=>`Move “${e}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",downloadNoTrack:"Play a song first to download it",downloadStarted:(e)=>`Downloading “${e}”`,downloadDone:(e)=>`Downloaded “${e}”`,downloadFailed:(e)=>`Download failed: ${e}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:"Source: LRCLIB",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`},ji={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:(e,t,n)=>`${e} głosuje za pominięciem (${t}/${n})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:(e,t)=>`Ze wspólnej kolejki: ${e} · ${t}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:(e)=>`${e} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:(e)=>`od: ${e}`,syncQueuePlayNow:(e)=>`Zagraj teraz: „${e}”`,syncQueueRemove:(e)=>`Usuń z kolejki: „${e}”`,syncQueueDrag:(e)=>`Przesuń „${e}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:(e)=>`Pobieranie: „${e}”`,downloadDone:(e)=>`Pobrano: „${e}”`,downloadFailed:(e)=>`Nie udało się pobrać: ${e}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:"Źródło: LRCLIB",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`},Gi={en:nn,pl:ji};function Ki(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return Gi[t]??nn}var ct=null;function d(){if(!ct){let e=typeof document<"u"?document.documentElement.lang:"";ct=Ki(e||(typeof navigator<"u"?navigator.language:"en"))}return ct}var I=[],ae=-1,le=null,L="",Ee=null,se="",on=(e,t)=>e===t,an={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){I=[],ae=-1,le=null,L="",se="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
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
      .ytmd-lyrics-offset-value {
        min-width: 56px;
        text-align: center;
        font-variant-numeric: tabular-nums;
        color: var(--ytmd-text, #fff);
      }
    `,document.head.appendChild(t),C();let n=()=>{_e(),sn(e)},i=()=>{setTimeout(()=>{_e(),dt()},50),setTimeout(()=>{dt()},250)};document.addEventListener("click",i,!0);let o=window.setInterval(n,600);n(),Ee=()=>{clearInterval(o),document.removeEventListener("click",i,!0),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((a)=>a.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(L===n&&I.length>0||se===n)return;L=n,se=n,I=[],ae=-1,le=null,_e();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(g("div",{className:"ytmd-native-lyrics-status",text:d().lyricsLoading}));try{let o=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!on(n,L))return;if(le=o,o?.syncedLyrics)I=io(o.syncedLyrics);_e(),sn(t),dn(t)}catch{if(!on(n,L))return;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.replaceChildren(g("div",{className:"ytmd-native-lyrics-status",text:d().lyricsNone}))}finally{if(se===n)se=""}},onTick(e){if(!I||I.length===0)return;let t=Pe(L),n=e+t,i=-1;for(let o=0;o<I.length;o++)if(n>=I[o].timeSecs)i=o;else break;if(i!==ae&&i>=0){ae=i;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o){let r=o.querySelectorAll(".ytmd-native-lyric-line");r.forEach((s,c)=>{if(c===i)s.classList.add("active");else s.classList.remove("active")});let a=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(a&&eo(a)){let s=r[i];if(s)s.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(Ee)Ee(),Ee=null}},ln="ytmd-lyrics-offsets",Wi=500;function cn(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function Ji(e){try{let t=e?.getItem(ln);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function Xi(e,t,n,i){if(e.delete(t),n!==0)e.set(t,n);while(e.size>Wi){let o=e.keys().next().value;if(o===void 0)break;e.delete(o)}try{i?.setItem(ln,JSON.stringify([...e]))}catch{}}var ut=null;function un(){if(!ut)ut=Ji(cn());return ut}function Pe(e){return un().get(e)||0}function Zi(e,t){Xi(un(),e,t,cn())}function rn(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function eo(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function to(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function _e(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(to(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function no(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function dt(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=no();e.style.setProperty("display",t?"flex":"none","important")}function sn(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=g("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),dn(e)}dt()}function dn(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(I&&I.length>0){let n=Pe(L),i=g("span",{className:"ytmd-lyrics-offset-value",text:rn(n)}),o=(s)=>{let c=s===null?0:Math.round((Pe(L)+s)*10)/10;Zi(L,c),i.textContent=rn(c)},r=(s,c,u)=>{let l=g("button",{className:"ytmd-chip",text:s});return l.type="button",l.dataset.ytmdTooltip=c,l.setAttribute("aria-label",c),l.addEventListener("click",u),l},a=g("div",{className:"ytmd-native-lyrics-footer"});a.append(g("span",{className:"ytmd-lyrics-source",text:d().lyricsSource}),g("span",{text:d().lyricsOffset}),r("−0.5 s",d().lyricsLater,()=>o(-0.5)),i,r("+0.5 s",d().lyricsEarlier,()=>o(0.5)),r(d().lyricsReset,d().lyricsReset,()=>o(null))),t.replaceChildren(...I.map((s,c)=>{let u=g("div",{className:`ytmd-native-lyric-line${c===ae?" active":""}`,text:s.text});return u.addEventListener("click",()=>{let l=e.getVideoElement();if(l){let m=Pe(L);l.currentTime=Math.max(0,s.timeSecs-m)}}),u}),a)}else if(le?.plainLyrics){let n=le.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>g("div",{className:"ytmd-native-lyric-line ytmd-plain",text:i})),g("div",{className:"ytmd-native-lyrics-footer",text:d().lyricsSource}))}else t.replaceChildren(g("div",{className:"ytmd-native-lyrics-status",text:d().lyricsNone}))}function io(e){let t=e.split(`
`),n=[],i=0,o=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,r=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let a of t){let s=a.trim();if(!s)continue;let c=r.exec(s);if(c){let m=parseInt(c[1],10);if(!isNaN(m))i=m/1000;continue}let u=[],l;o.lastIndex=0;while((l=o.exec(s))!==null){let m=parseInt(l[1],10),y=parseInt(l[2],10),f=0;if(l[3])f=parseInt(l[3].padEnd(3,"0").slice(0,3),10);u.push(m*60+y+f/1000)}if(u.length>0){let m=s.replace(o,"").trim();if(m)for(let y of u)n.push({timeSecs:Math.max(0,y-i),text:m})}}return n.sort((a,s)=>a.timeSecs-s.timeSecs)}var ce=null;function ue(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}var mn={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){ce?.(),C(),document.getElementById("ytmd-volume-indicator")?.remove();let t=g("div",{id:"ytmd-volume-indicator"});document.body.appendChild(t);let n=null,i=null,o=null,r=null,a=null,s=()=>{if(a!==null)window.clearTimeout(a);a=null,t.classList.remove("ytmd-visible")},c=()=>{if(a!==null)window.clearTimeout(a);t.classList.add("ytmd-visible"),a=window.setTimeout(()=>{a=null,t.classList.remove("ytmd-visible")},1800)},u=()=>{let h=e.getVideoElement();if(!h){r=null,s();return}let v=be(h)?0:ne(h),w=r!==null&&v!==r;r=v;let P=document.querySelector("ytmusic-player-page #main-panel");if(!ue(P)){s();return}if(t.textContent!==`${v}%`)t.textContent=`${v}%`,t.setAttribute("aria-label",d().volumeLevel(v));let U=ue(document.querySelector("ytmusic-player-page #song-image")),q=ue(document.querySelector("ytmusic-player-page video"))||ue(document.querySelector("ytmusic-player-page #movie_player")),M=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?q||U:U||q)||ue(P);if(!M){s();return}let A=`${Math.max(8,M.left+12)}px`,S=`${Math.max(8,M.top+12)}px`;if(t.style.left!==A)t.style.left=A;if(t.style.top!==S)t.style.top=S;if(w)c()},l=()=>{let h=e.getVideoElement();if(h===n)return;n?.removeEventListener("volumechange",u),n=h,n?.addEventListener("volumechange",u),u()},m=()=>{let h=document.querySelector("ytmusic-player-page");if(h===i)return;if(o?.disconnect(),i=h,h)o=new MutationObserver(()=>window.requestAnimationFrame(u)),o.observe(h,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},y=(h)=>{let v=h.target;if(v instanceof Element&&v.closest("ytmusic-player-bar"))window.requestAnimationFrame(u)},f=(h)=>{if(h.deltaY===0||h.ctrlKey)return;let v=h.target;if(v instanceof Element&&v.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'))return;let w=(A)=>{if(!A)return!1;let S=A.getBoundingClientRect();return h.clientX>=S.left&&h.clientX<S.right&&h.clientY>=S.top&&h.clientY<S.bottom},P=w(document.querySelector("ytmusic-player-bar"))||w(document.querySelector("#player-bar-background")),U=e.config.wheel_volume_on_player_page===!0&&w(document.querySelector("ytmusic-player-page #main-panel"));if(!P&&!U)return;let q=e.getVideoElement();if(!q)return;let _=e.config.wheel_volume_step,M=typeof _==="number"&&Number.isFinite(_)&&_>0?Math.min(_,1):0.05;h.preventDefault(),ve(ne(q)+(h.deltaY<0?M:-M)*100,q),u()};window.addEventListener("wheel",f,{passive:!1}),window.addEventListener("resize",u),document.addEventListener("scroll",u,!0),document.addEventListener("input",y,!0),document.addEventListener("change",y,!0),m(),l();let p=window.setInterval(()=>{m(),l(),u()},500);ce=()=>{window.removeEventListener("wheel",f),window.removeEventListener("resize",u),document.removeEventListener("scroll",u,!0),document.removeEventListener("input",y,!0),document.removeEventListener("change",y,!0),window.clearInterval(p),o?.disconnect(),n?.removeEventListener("volumechange",u),s(),t.remove()}},onDestroy(){if(ce)ce(),ce=null}};var pn={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var Se=null,yn={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);Se=()=>{t?.remove()}},onDestroy(){if(Se)Se(),Se=null}};var Ce=[32,64,125,250,500,1000,2000,4000,8000,16000],mt={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function de(e){return Math.max(-24,Math.min(24,e))}function oo(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function ro(e){return Math.max(0.5,Math.min(2,e))}class E{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=Ce.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!E.instance)E.instance=new E;return E.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=Ce.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===Ce.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=de(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=de(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=de(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,de(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=mt[e]||mt.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),oo(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=ro(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??b.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class pt{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)E.getInstance().fadeIn(this.crossfadeSeconds);else E.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),E.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),E.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),b.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class yt{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=E.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,b.next()}else this.consecutiveSilentTicks=0}}var H=null,j=null,Ie=null;function so(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var gn={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=E.getInstance(),n=new pt,i=new yt;H=n,j=i;let o=e.config,r=null,a=()=>{if(r!==null)return;let c=e.getVideoElement();if(c){if(!t.isInitializedFor(c))t.init(c);return}r=window.setInterval(()=>{let u=e.getVideoElement();if(u){if(r!==null)clearInterval(r);r=null,t.init(u)}},500)};if(so(o))a();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let s=[];if(window.__TAURI__?.event){let{listen:c}=window.__TAURI__.event;s.push(c("set-eq-band",(u)=>{a(),t.setBandGain(u.payload.bandIndex,u.payload.gain)}),c("set-eq-all",(u)=>{a(),t.setAllGains(u.payload.gains)}),c("set-eq-preset",(u)=>{a(),t.applyPreset(u.payload)}),c("set-preamp",(u)=>{a(),t.setPreamp(u.payload)}),c("set-loudness-normalization",(u)=>{if(u.payload)a();t.setLoudnessNormalization(u.payload)}),c("set-crossfade-seconds",(u)=>{if(u.payload>0)a();n.setCrossfadeSeconds(u.payload)}),c("set-skip-silence",(u)=>{if(u.payload)a();i.setEnabled(u.payload)}),c("set-playback-rate",(u)=>{t.setPlaybackRate(u.payload)}),c("set-preserves-pitch",(u)=>{t.setPreservesPitch(u.payload)}))}Ie=()=>{if(r!==null)clearInterval(r),r=null;s.forEach((c)=>c.then((u)=>u())),H?.destroy(),H=null,j=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(E.getInstance().applyRateAndPitch(),H)H.onTrackChange(e);if(j)j.onTrackChange()},onTick(e,t){if(we())return;if(H)H.onTick(e,t.track);if(j)j.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(Ie)Ie(),Ie=null}};var gt=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function fn(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let a=r.getImageData(0,0,16,16).data,s=0,c=0,u=0,l=0,m=0,y=0,f=0,p=0;for(let _=0;_<a.length;_+=4){let M=a[_],A=a[_+1],S=a[_+2];if(a[_+3]<128)continue;let Rt=(M+A+S)/3;if(Rt<20||Rt>240)continue;if(_<a.length/2)s+=M,c+=A,u+=S,l++;else m+=M,y+=A,f+=S,p++}if(l===0&&p===0){t(n);return}let h=l>0?Math.round(s/l):220,v=l>0?Math.round(c/l):38,w=l>0?Math.round(u/l):38,P=p>0?Math.round(m/p):24,U=p>0?Math.round(y/p):24,q=p>0?Math.round(f/p):27;t({primary:gt(h,v,w),secondary:gt(P,U,q),accent:gt(h+30,v+30,w+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var V=48,ao=3,lo=3,co=1.65,uo=0.55;function mo(e,t,n,i){let o=new Float32Array(e.length),r=(a,s,c)=>{let u=c?n:t,l=c?t:n;for(let m=0;m<u;m++)for(let y=0;y<4;y++)for(let f=0;f<l;f++){let p=0,h=0;for(let w=Math.max(0,f-i);w<=Math.min(l-1,f+i);w++){let P=c?(m*t+w)*4+y:(w*t+m)*4+y;p+=a[P],h++}let v=c?(m*t+f)*4+y:(f*t+m)*4+y;s[v]=p/h}};r(e,o,!0),r(o,e,!1)}function po(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],a=e[i+2],s=0.2126*o+0.7152*r+0.0722*a;e[i]=(s+(o-s)*t)*n,e[i+1]=(s+(r-s)*t)*n,e[i+2]=(s+(a-s)*t)*n}}async function hn(e,t=uo){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=V,o.height=V;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,V,V);let a=r.getImageData(0,0,V,V);for(let s=0;s<lo;s++)mo(a.data,V,V,ao);po(a.data,co,t),r.putImageData(a,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var Me=null,Le=null,Re,bn={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=g("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=g("img",{id:"ytmd-ambient-cover"});n.alt="";let i=g("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,a=document.createElement("style");a.id="ytmd-ambient-styles",a.textContent=`
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
    `,document.head.appendChild(a),Me=(c)=>{if(t)t.style.opacity=String(c)};let s=[];if(window.__TAURI__?.event)s.push(window.__TAURI__.event.listen("set-ambient-intensity",(c)=>{Me?.(c.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(c)=>{let u=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;Me?.(c.payload?u:0)}));if(Le=()=>{s.forEach((c)=>c.then((u)=>u())),Me=null,Re=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===Re)return;Re=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await hn(t):null;if(t!==Re)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await fn(t||""),o=document.documentElement.style;o.setProperty("--ytmd-accent",i.accent),o.setProperty("--ytmd-accent-primary",i.primary),o.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(Le)Le(),Le=null}};var vn=`
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

`,wn=`
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

`;var Ae=null,kn={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let c=document.getElementById(s);if(!c){c=document.createElement("style"),c.id=s;let u=t();if(u)u.appendChild(c)}return c},i=(s)=>{let c=n("ytmd-active-theme");c.textContent=s?vn:wn},o=(s)=>{let c=n("ytmd-custom-css");if(c)c.textContent=s};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let a=[];if(window.__TAURI__?.event)a.push(window.__TAURI__.event.listen("set-ambient-enabled",(s)=>{i(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{o(s.payload)}));Ae=()=>{a.forEach((s)=>s.then((c)=>c()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(Ae)Ae(),Ae=null}};var Ne=null,Tn={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=N({id:"ytmd-pip-btn",label:d().pipButton,iconPath:x.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(a){console.warn("[YTMD PiP] Could not enter PiP:",a),await e.invoke("toggle_mini_player").catch((s)=>console.error("[YTMD PiP] Mini player fallback failed:",s))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),Ne=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(Ne)Ne(),Ne=null}};function yo(e){if(e.error)return"failed";if(e.output_path&&e.percent>=100)return"done";return"progress"}var qe="ytmd-download-btn",go=3000,G=new Map,ft=new Set,Ve=null,De=null;function K(){let e=document.getElementById(qe);if(!e)return;let t=Ve?.videoId,n=t?G.get(t):void 0;Zt(e,n?Math.max(0.05,n.fraction):null),Xt(e,t&&ft.has(t)?x.check:x.download),e.setAttribute("aria-disabled",t?"false":"true");let i=n?d().downloadInProgress:d().downloadButton;e.setAttribute("aria-label",i),e.dataset.ytmdTooltip=i}function ht(e,t){let n=G.get(e);if(!n)return;if(G.delete(e),t.ok)ft.add(e),setTimeout(()=>{ft.delete(e),K()},go),T(d().downloadDone(n.title),{id:`download-${e}`});else T(d().downloadFailed(t.reason),{id:`download-${e}`,durationMs:8000});K()}function fo(e){let t=G.get(e.video_id);if(!t)return;let n=yo(e);if(n==="failed")ht(e.video_id,{ok:!1,reason:e.error||e.status});else if(n==="done")ht(e.video_id,{ok:!0});else t.fraction=e.percent/100,K()}function bt(e,t){let n=t?.videoId;if(!t||!n){T(d().downloadNoTrack);return}if(G.has(n)){T(d().downloadInProgress);return}G.set(n,{title:t.title,fraction:0}),K(),T(d().downloadStarted(t.title),{id:`download-${n}`}),e.invoke("download_track",{request:{video_id:n,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:e.config.download_format||"mp3",embed_lyrics:e.config.embed_lyrics!==!1}}).catch((i)=>{console.error("[YTMD Downloader] Download failed:",i),ht(n,{ok:!1,reason:i instanceof Error?i.message:String(i)})})}var xn={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){Ve=e.track;let t=()=>{if(document.getElementById(qe))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!o)return;let r=N({id:qe,label:d().downloadButton,iconPath:x.download});r.addEventListener("click",()=>{if(r.getAttribute("aria-disabled")==="true")return;bt(e,Ve)}),o.appendChild(r),K()},n=window.setInterval(t,1000);t();let i=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(o)=>fo(o.payload)):null;De=()=>{clearInterval(n),i?.then((o)=>o()),document.getElementById(qe)?.remove()}},onTrackChange(e){Ve=e,K()},onDestroy(){if(De)De(),De=null}};var En={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};var Oe="ytmd-nav-slot",vt="ytmd-menu-btn",pe="ytmd-menu",_n="ytmd-sync-chip",Sn=[],me=null,Cn=null,Pn=!1,ho=`
  #${Oe} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function bo(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=ho,document.head.appendChild(e)}function vo(e){if(!e)return;return`${d().syncInRoom} · ${d().syncListeners(e.listeners)}`}function In(e){Sn=e.items,Cn=e.onSyncChipClick}function wt(){if(document.getElementById(Oe)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;C(),bo();let t=g("div",{id:Oe}),n=N({id:vt,label:d().menuLabel,iconPath:x.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),ko(n)}),t.appendChild(n),e.prepend(t),Mn(),xo()}function kt(e){me=e,Mn();let t=document.getElementById(pe);if(t?.classList.contains("ytmd-open"))Ln(t)}function Mn(){let e=document.getElementById(Oe);if(!e)return;let t=document.getElementById(_n);if(!me){t?.remove();return}if(!t)t=g("button",{id:_n,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>Cn?.()),e.prepend(t);let n=d().syncListeners(me.listeners);t.replaceChildren(g("span",{className:"ytmd-chip-dot"}),re(x.group,18),g("span",{text:n})),t.dataset.ytmdTooltip=`${d().syncInRoom} · ${me.roomCode}`,t.setAttribute("aria-label",`${d().syncInRoom}, ${n}`)}function Ln(e){let t=[];for(let n of Sn){if(n.dividerBefore)t.push(g("div",{className:"ytmd-menu-divider"}));let i=g("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=g("span",{className:"ytmd-menu-item-text"});o.appendChild(g("span",{text:n.label}));let r=n.id==="sync"?vo(me):void 0;if(r)o.appendChild(g("span",{className:"ytmd-menu-item-sub",text:r}));if(i.append(re(n.iconPath),o),n.hint)i.appendChild(g("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{W(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function wo(){let e=document.getElementById(pe);if(!e)e=g("div",{id:pe,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",To),document.body.appendChild(e);return e}function ko(e){let t=wo();if(t.classList.contains("ytmd-open")){W();return}Ln(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function W(){let e=document.getElementById(pe);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById(vt);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function To(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),W();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")W()}function xo(){if(Pn)return;Pn=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(pe);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(vt)?.contains(n))return;W()}),window.addEventListener("resize",W)}function Rn(e){return e.is_host?"host":e.role??"dj"}function O(e){return e!=="listener"}function An(e){return Math.floor(e/2)+1}function Eo(e,t,n){let i=0;return t.forEach((o,r)=>{if(r!==n&&e>o)i++}),i}var ze=null;function Nn(e,t){if(!ze)return;let n=[...e.querySelectorAll(t)].find((i)=>i.dataset.itemId===ze);if(n)n.focus(),ze=null}function Dn({list:e,rowSelector:t,handleSelector:n,onMove:i}){let o=()=>[...e.querySelectorAll(t)],r=()=>o().forEach((f)=>f.classList.remove("is-dragging","drop-before","drop-after")),a=null,s=(f,p)=>{let h=o().filter((v,w)=>w!==p);if(h.forEach((v)=>v.classList.remove("drop-before","drop-after")),f<h.length)h[f].classList.add("drop-before");else h[h.length-1]?.classList.add("drop-after")},c=(f)=>{if(f.button!==0||!(f.target instanceof Element))return;let p=f.target.closest(n),h=p?.closest(t);if(!p||!h||!p.dataset.itemId)return;let v=o().indexOf(h);if(v<0)return;f.preventDefault();try{p.setPointerCapture(f.pointerId)}catch{}a={from:v,itemId:p.dataset.itemId,to:v,pointerId:f.pointerId,handle:p},h.classList.add("is-dragging")},u=(f)=>{if(!a||f.pointerId!==a.pointerId)return;let p=o().map((h)=>{let v=h.getBoundingClientRect();return v.top+v.height/2});a.to=Eo(f.clientY,p,a.from),s(a.to,a.from)},l=(f)=>{if(!a||f.pointerId!==a.pointerId)return;let{from:p,to:h,itemId:v,handle:w}=a;if(a=null,w.hasPointerCapture(f.pointerId))w.releasePointerCapture(f.pointerId);if(r(),h!==p)i(p,h,v)},m=(f)=>{if(f.key!=="ArrowUp"&&f.key!=="ArrowDown"||!(f.target instanceof Element))return;let p=f.target.closest(n),h=p?.closest(t);if(!p||!h||!p.dataset.itemId)return;f.preventDefault();let v=o(),w=v.indexOf(h),P=f.key==="ArrowUp"?w-1:w+1;if(w<0||P<0||P>=v.length)return;ze=p.dataset.itemId,i(w,P,p.dataset.itemId)},y=()=>{a=null,r()};return e.addEventListener("pointerdown",c),e.addEventListener("pointermove",u),e.addEventListener("pointerup",l),e.addEventListener("pointercancel",y),e.addEventListener("keydown",m),()=>{e.removeEventListener("pointerdown",c),e.removeEventListener("pointermove",u),e.removeEventListener("pointerup",l),e.removeEventListener("pointercancel",y),e.removeEventListener("keydown",m)}}var qn="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var X="ytmd-sync-queue",Tt="ytmd-sync-queue-styles",He="data-ytmd-sync-queue",ye="data-ytmd-sync-queue-tab",_o="M8 5v14l11-7z",Po="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",So=/^[A-Za-z0-9_-]{11}$/;function zn(e){if(typeof e!=="object"||e===null)return null;let t=e.serviceEndpoint?.queueAddEndpoint;if(typeof t!=="object"||t===null)return null;let{queueTarget:n,queueInsertPosition:i}=t;return{videoId:typeof n?.videoId==="string"&&So.test(n.videoId)?n.videoId:null,next:i==="INSERT_AFTER_CURRENT_VIDEO"}}function Co(e){return`
  html[${He}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${He}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(e)};
    font-size: 14px;
  }
  html[${ye}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${X} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${ye}] #${X} { display: block; }
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
`}function Io(e){C();let t=document.getElementById(Tt);if(!t)t=g("style",{id:Tt}),document.head.appendChild(t);let n=Co(e);if(t.textContent!==n)t.textContent=n}var Hn=".ytmd-sq-handle",Mo=".ytmd-sq-queued";function Vn(e){let t=g("div",{className:"ytmd-sq-row"}),n=g("img",{className:"ytmd-sq-thumb"});n.alt="",n.loading="lazy",n.src=`https://i.ytimg.com/vi/${e.videoId}/default.jpg`;let i=g("div",{className:"ytmd-sq-text"});if(i.append(g("span",{className:"ytmd-sq-title",text:e.title}),g("span",{className:"ytmd-sq-sub",text:e.sub})),e.handle)t.appendChild(e.handle);if(t.append(n,i),e.actions.length){let o=g("div",{className:"ytmd-sq-actions"});o.append(...e.actions),t.appendChild(o)}return t}function On(e,t,n){let i=N({label:e,iconPath:t,muted:!0});return i.addEventListener("click",(o)=>{o.stopPropagation(),n()}),i}function Bn(e,t,n){let i=d(),o=[];if(t.nowPlaying)o.push(g("div",{className:"ytmd-sq-heading",text:i.syncQueueNowPlaying})),o.push(Vn({...t.nowPlaying,sub:t.nowPlaying.artist,actions:[]}));if(o.push(g("div",{className:"ytmd-sq-heading",text:i.syncQueueTitle})),t.queue.length===0)o.push(g("p",{className:"ytmd-sq-hint",text:O(t.myRole)?i.syncQueueEmpty:i.syncQueueListenerHint}));let r=t.myRole==="host"||t.myRole==="moderator";for(let a of t.queue){let s=[];if(O(t.myRole))s.push(On(i.syncQueuePlayNow(a.title),_o,()=>n.play(a.id)));if(r||a.added_by_id===t.myId)s.push(On(i.syncQueueRemove(a.title),Po,()=>n.remove(a.id)));let c;if(O(t.myRole)&&t.queue.length>1)c=N({label:i.syncQueueDrag(a.title),iconPath:qn,muted:!0}),c.classList.add("ytmd-sq-handle"),c.dataset.itemId=a.id;let u=i.syncQueueFrom(a.added_by),l=Vn({videoId:a.video_id,title:a.title,sub:a.artist?`${a.artist} · ${u}`:u,actions:s,handle:c});l.classList.add("ytmd-sq-queued"),o.push(l)}e.replaceChildren(...o),Nn(e,Hn)}var J=null;function Be(){let e=document.documentElement;if(!J){e.removeAttribute(ye);return}let t=document.querySelector("ytmusic-player-page #side-panel"),n=document.getElementById(X);if(t&&n?.parentElement!==t){if(!n)n=g("div",{id:X}),Dn({list:n,rowSelector:Mo,handleSelector:Hn,onMove:(o,r,a)=>J?.actions.move(a,r)});n.setAttribute("role","region"),n.setAttribute("aria-label",d().syncQueueTitle),Bn(n,J.model,J.actions),t.insertBefore(n,t.querySelector(":scope > #tab-renderer"))}let i=document.querySelector("ytmusic-player-page tp-yt-paper-tab");e.toggleAttribute(ye,!!n?.isConnected&&i?.getAttribute("aria-selected")==="true")}function Yn(e,t){J={model:e,actions:t},Io(d().syncQueueTab),document.documentElement.setAttribute(He,"");let n=document.getElementById(X);if(n)Bn(n,e,t);Be()}function xt(){J=null,document.documentElement.removeAttribute(He),document.documentElement.removeAttribute(ye),document.getElementById(X)?.remove(),document.getElementById(Tt)?.remove()}function Z(e){if(e.is_host)return"host";let t=e.members.find((n)=>n.id===e.current_user_id);return t?Rn(t):"dj"}function Lo(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var B=/^[A-Za-z0-9_-]{11}$/,Ro=2,Ao=0.25,No=0.05,Do=3,$n=0.1,qo=0.5,Vo=1,Oo=1000,zo=1,Un=5000,Ho=4000,Fn=15000,Bo=3,Yo=4000,Qn=1,$o=1e4,Uo=5,Fo=1e4,Qo=1.2;function jn(e,t){return Number.isFinite(t)&&t>Qn?Math.min(e,t-Qn):e}function jo(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(B.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>qo)i.seekTo=jn(e.current_time_secs,t.duration);return i}let o=e.current_time_secs+Math.min(Vo,Math.max(0,n)),r=o-t.currentTime;if(Math.abs(r)>Ro)i.seekTo=jn(o,t.duration);else if(Math.abs(r)>(t.correcting?No:Ao))i.playbackRate=1+Math.max(-$n,Math.min($n,r/Do));return i}class Gn{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function Go(e,t){return t!==null&&e<t&&t-e<Fo}function Kn(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var Ko=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function Wn(){return new URLSearchParams(window.location.search).get("v")}function Ye(e){let t=document.getElementById("movie_player"),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&B.test(n)&&typeof i==="number"&&Number.isFinite(i))return{videoId:n,currentTime:i};return{videoId:Wn(),currentTime:e?e.currentTime:0}}function Et(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function ge(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class Jn{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor(e=T){this.notify=e}lastBroadcast=null;pendingNav=null;transit=new Gn;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;finished=null;rateCorrection=null;setRoomState(e,t,n=!0){let i=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,this.canControl=n,Vt(this.isGuest()),!i)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||Et())return;if(Go(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(B.test(e.video_id))this.hostVideoId=e.video_id;let o=this.requestedVideo;if(o){if(e.video_id!==o.videoId&&n-o.atMs<Ho)return;this.requestedVideo=null}let r=Ye(t);if(this.waitingForHostsNext(e,r.videoId,t,n)){this.endRateCorrection(),b.pause();return}let a={videoId:r.videoId,paused:t?t.paused:!0,currentTime:r.currentTime,duration:t?t.duration:NaN,correcting:this.rateCorrection!==null},s=jo(e,a,i);if(s.navigateTo){this.endRateCorrection();let c=this.pendingNav;if(c&&c.videoId===s.navigateTo&&n-c.atMs<Un)return;let u=c&&c.videoId===s.navigateTo?c.attempts+1:1;if(this.pendingNav={videoId:s.navigateTo,atMs:n,attempts:u},this.rememberOwnNav(s.navigateTo,n),b.pause(),u>1)window.location.href=`https://music.youtube.com/watch?v=${s.navigateTo}`;else ge(s.navigateTo);return}if(this.pendingNav=null,!t)return;if(s.setPlaying===!0)b.play();else if(s.setPlaying===!1)b.pause();if(s.seekTo!==null)this.endRateCorrection(),b.seekTo(s.seekTo);else this.setCatchUpRate(t,s.playbackRate)}waitingForHostsNext(e,t,n,i){let o=this.finished;return!!o&&e.video_id===o.videoId&&i-o.atMs<$o&&o.duration-e.current_time_secs<Uo&&(t!==o.videoId||!!n?.ended)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>Fn)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;if(Number.isFinite(e.duration)&&e.duration>0&&e.duration-e.currentTime<Bo){this.nearEndAtMs=t;let{videoId:n}=Ye(e);if(n)this.finished={videoId:n,duration:e.duration,atMs:t}}}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!this.canControl||!e||!B.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<Fn)return null;if(t-this.nearEndAtMs<Yo)return null;if(this.requestedVideo?.videoId===e)return null;return this.requestedVideo={videoId:e,atMs:t},{kind:"play_video",video_id:e}}requestControl(e,t){if(!this.canControl){if(e.kind!=="next"){this.notify(d().syncListenerOnly);return}t("vote_sync_skip").then(()=>this.notify(d().syncVotedSkip)).catch((n)=>{console.error("[YTMD Room Sync] vote failed:",n),this.notify(d().actionFailed)});return}t("send_sync_control",{action:e}).catch((n)=>{console.error("[YTMD Room Sync] control request failed:",n),this.notify(d().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n,source:i}=e,o=i?.kind==="vote"?d().syncVoteSkipped:i?.kind==="queue"?d().syncFromQueue(i.title,t):null;switch(n.kind){case"next":b.next(),this.notify(o??d().syncGuestNext(t));break;case"previous":b.previous(),this.notify(o??d().syncGuestPrevious(t));break;case"set_playing":{let r=b.getVideo();if(!r||r.paused!==n.playing)return;if(n.playing)b.play();else b.pause();this.notify(o??(n.playing?d().syncGuestResumed(t):d().syncGuestPaused(t)));break}case"play_video":if(!B.test(n.video_id)||n.video_id===Wn())return;ge(n.video_id),this.notify(o??d().syncGuestPicked(t));break}}advanceQueue(e,t,n){if(!t||Et())return;let i=t.duration-t.currentTime;if(!Number.isFinite(i)||i>Qo&&!t.ended)return;this.playNextFromQueue(e,n,t,!1)}playNextFromQueue(e,t,n=b.getVideo(),i=!0,o=Date.now()){if(!this.inRoom||!this.isHost||e===0)return!1;let{videoId:r}=Ye(n),a=this.queueAdvance;if(a&&a.from===r&&o-a.atMs<Un)return!0;this.queueAdvance={from:r,atMs:o};let s=()=>{if(i)b.nextInYtm()};return t("sync_queue_take_next").then((c)=>{let u=c;if(!u||!B.test(u.video_id)){s();return}b.pause(),ge(u.video_id),this.notify(d().syncFromQueue(u.title,u.added_by))}).catch((c)=>{console.error("[YTMD Room Sync] playing from the shared queue failed:",c),s()}),!0}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||Et())return;if(t.ended)return;let{videoId:o,currentTime:r}=Ye(t);if(!o)return;let a=Date.now(),s=this.lastBroadcast,c=s?s.position+(a-s.atMs)/1000*s.rate:0,u=!!s&&s.playing&&!t.paused&&Math.abs(r-c)>zo,l=!!s&&s.videoId!==o;if(!i&&!u&&!l&&s&&a-s.atMs<Oo)return;this.lastBroadcast={atMs:a,videoId:o,position:r,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:o,title:e.title,artist:e.artist,current_time_secs:r,is_playing:!t.paused,timestamp_ms:a}}).catch((m)=>console.error("[YTMD Room Sync] broadcast failed:",m))}}var R=null,Y=null,$e=null,D=null,Pt=null,Wo=1000;function Xn(){let e=D,t=Y;if(!e||!t){xt();return}let n=Pt,i=(o)=>(r)=>{t(o,{itemId:r}).catch((a)=>{console.error(`[YTMD Room Sync] ${o} failed:`,a),T(d().actionFailed)})};Yn({queue:e.queue??[],nowPlaying:n?.videoId&&B.test(n.videoId)?{videoId:n.videoId,title:n.title,artist:n.artist}:null,myId:e.current_user_id,myRole:Z(e)},{play:i("sync_queue_play"),remove:i("sync_queue_remove"),move:(o,r)=>{t("sync_queue_move",{itemId:o,toIndex:r}).catch((a)=>{console.error("[YTMD Room Sync] sync_queue_move failed:",a),T(d().actionFailed)})}})}function Jo(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function Xo(e,t){if(!D||!O(Z(D))){T(d().syncQueueListenerNo);return}if(!e.videoId){T(d().syncQueueSongsOnly);return}t("sync_queue_add",{input:e.videoId,next:e.next}).then(()=>T(e.next?d().syncQueuedNext:d().syncQueued)).catch((n)=>{console.error("[YTMD Room Sync] adding to the shared queue failed:",n),T(d().actionFailed)})}function Zn(e){let t=R;if(!t||!Y||!t.isGuest())return!1;let n=b.getVideo(),i=Kn(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,Y),!0}function ei(e){let t=R;if(!t||!Y||!t.isGuest())return!1;return t.requestControl({kind:"play_video",video_id:e},Y),!0}function _t(e,t,n="left"){let i=D;if(D=e,kt(e?{roomCode:e.room_code,listeners:e.members.length,isHost:e.is_host}:null),Xn(),!t)return;if(!e){if(!i)return;T(n==="kicked"?d().syncKicked:n==="lost"?d().syncLost:d().syncRoomClosed);return}if(!i||i.room_code!==e.room_code){if(!e.is_host)T(d().syncConnected);return}if(e.reconnecting){if(!i.reconnecting)T(d().syncReconnecting);return}let o=(m)=>m.members.find((y)=>y.is_host)?.id;if(o(i)!==o(e)){let m=e.members.find((y)=>y.is_host);if(e.is_host)T(d().syncYouHost);else if(m)T(d().syncNewHost(m.nickname));return}if(i.reconnecting)return;let{joined:r,left:a}=Lo(i.members,e.members,e.current_user_id),s=[...r.map(d().syncJoined),...a.map(d().syncLeft)],c=e.skip_votes??[],u=c.filter((m)=>m!==e.current_user_id&&!(i.skip_votes??[]).includes(m));for(let m of u){let y=e.members.find((f)=>f.id===m)?.nickname;if(y)s.push(d().syncVoteProgress(y,c.length,An(e.members.length)))}let l=Z(e);if(l!==Z(i))s.push(l==="moderator"?d().syncRoleModerator:l==="listener"?d().syncRoleListener:d().syncRoleDj);if(s.length>0)T(s.join(" · "))}var ti={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Jn;R=t,Y=e.invoke;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(r)=>{t.setRoomState(!0,r.payload.is_host,O(Z(r.payload))),_t(r.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",(r)=>{t.setRoomState(!1,!1),_t(null,!0,r.payload?.reason??"left")}),window.__TAURI__.event.listen("sync-playback-remote",(r)=>{t.handleRemotePlayback(r.payload,e.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(r)=>{t.applyRemoteControl(r.payload)}),window.__TAURI__.event.listen("sync-reaction",(r)=>{en(r.payload.emoji,r.payload.from)}));let i=(r)=>{if(!(r.target instanceof Element))return;let a=r.target;if(a.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(Be,0);if(t.isInRoom()){let l=a.closest("ytmusic-menu-service-item-renderer"),m=l?zn(l.data):null;if(m){r.preventDefault(),r.stopImmediatePropagation(),Jo(),Xo(m,e.invoke);return}}if(!r.isTrusted)return;if(t.isRoomHost()&&a.closest("ytmusic-player-bar .next-button")&&t.playNextFromQueue(D?.queue?.length??0,e.invoke)){r.preventDefault(),r.stopImmediatePropagation();return}if(!t.isGuest())return;let s=Ko.find(([l])=>a.closest(l));if(!s)return;let c=e.getVideoElement(),u=Kn(s[1],c?c.paused:!0);if(!u)return;r.preventDefault(),r.stopImmediatePropagation(),t.requestControl(u,e.invoke)};window.addEventListener("click",i,!0);let o=setInterval(Be,Wo);tt(()=>t.playNextFromQueue(D?.queue?.length??0,e.invoke)),e.invoke("get_sync_room_state").then((r)=>{if(R!==t||!r||typeof r!=="object")return;let a=r;if(t.setRoomState(!0,a.is_host,O(Z(a))),_t(a,!1),!a.is_host&&a.playback_state)t.handleRemotePlayback(a.playback_state,e.getVideoElement())}).catch((r)=>console.error("[YTMD Room Sync] failed to restore room state:",r)),$e=()=>{n.forEach((r)=>r.then((a)=>a())),window.removeEventListener("click",i,!0),clearInterval(o),tt(null),t.setRoomState(!1,!1),R=null,Y=null,D=null,Pt=null,kt(null),xt()}},onTrackChange(e,t){let n=R;if(!n)return;Pt=e,Xn(),n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){R?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();R?.broadcastLocalState(t.track,n,t.invoke),R?.noteLocalTick(n),R?.advanceQueue(D?.queue?.length??0,n,t.invoke)},onDestroy(){if($e)$e(),$e=null}};var Ue=null,Zo=(e,t)=>t&&e!==!1,ni={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,o=(y)=>{if(n===y)return;n=y,e.invoke("set_inhibit_sleep",{inhibit:y}).catch((f)=>{n=!y,console.error("[YTMD Power] set_inhibit_sleep failed:",f)})},r=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},a=()=>{t?.release().catch(()=>{}),t=null},s=()=>{let y=e.getVideoElement(),f=!!y&&!y.paused&&!y.ended,p=Zo(e.config.inhibit_sleep,f);if(o(p),p)r();else a()},c=(y)=>{for(let f of["play","playing","pause","ended"])y.addEventListener(f,s);i=y},u=(y)=>{for(let f of["play","playing","pause","ended"])y.removeEventListener(f,s)},l=e.getVideoElement();if(l)c(l);s();let m=window.setInterval(()=>{let y=e.getVideoElement();if(y&&y!==i){if(i)u(i);c(y),s()}},1000);Ue=()=>{if(clearInterval(m),i)u(i);i=null,a(),o(!1)}},onDestroy(){if(Ue)Ue(),Ue=null}};var oi=(e)=>typeof e==="object"&&e!==null&&!Array.isArray(e),k=(e,...t)=>t.reduce((n,i)=>n==null?void 0:n[i],e),Qe=/^[A-Za-z0-9_-]{11}$/;function ee(e){let t=k(e,"runs");if(Array.isArray(t))return t.map((i)=>typeof k(i,"text")==="string"?k(i,"text"):"").join("");let n=k(e,"simpleText");return typeof n==="string"?n:""}function St(e){if(!Array.isArray(e)||e.length===0)return null;let t=k(e[e.length-1],"url");return typeof t==="string"?t:null}function ii(e,t){return ee(k(e,"flexColumns",t,"musicResponsiveListItemFlexColumnRenderer","text"))}function er(e){let t=k(e,"playlistItemData","videoId")??k(e,"overlay","musicItemThumbnailOverlayRenderer","content","musicPlayButtonRenderer","playNavigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Qe.test(t))return null;return{video_id:t,title:ii(e,0),subtitle:ii(e,1),thumbnail:St(k(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function tr(e){let t=k(e,"title","runs",0,"navigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Qe.test(t))return null;return{video_id:t,title:ee(k(e,"title")),subtitle:ee(k(e,"subtitle")),thumbnail:St(k(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function Ct(e,t=20){let n=[],i=new Set,o=(r,a)=>{if(n.length>=t||a>40)return;if(Array.isArray(r)){for(let s of r)o(s,a+1);return}if(!oi(r))return;for(let[s,c]of Object.entries(r)){let u=null;if(s==="musicResponsiveListItemRenderer")u=er(c);else if(s==="musicCardShelfRenderer")u=tr(c);if(u&&!i.has(u.video_id)){if(i.add(u.video_id),n.push(u),n.length>=t)return}o(c,a+1)}};return o(e,0),n}function Fe(e){let t=k(e,"playlistPanelVideoRenderer")??k(e,"playlistPanelVideoWrapperRenderer","primaryRenderer","playlistPanelVideoRenderer");return oi(t)?t:null}function ri(e){let t=[];return e.forEach((n,i)=>{let o=Fe(n),r=k(o,"videoId");if(!o||typeof r!=="string")return;t.push({id:`${i}:${r}`,video_id:r,title:ee(k(o,"title")),artist:ee(k(o,"shortBylineText"))||ee(k(o,"longBylineText")),thumbnail:St(k(o,"thumbnail","thumbnails")),current:k(o,"selected")===!0})}),t}function si(e,t){let n=t.indexOf(":");if(n<=0)return-1;let i=Number(t.slice(0,n)),o=t.slice(n+1),r=Number.isInteger(i)?Fe(e[i]):null;if(r&&k(r,"videoId")===o)return i;return e.findIndex((a)=>k(Fe(a),"videoId")===o)}function ai(e,t){if(!t)return e.length;let n=e.findIndex((i)=>k(Fe(i),"selected")===!0);return n>=0?n+1:e.length}function li(e,t,n=15000){if(!e)return!0;let{position_secs:i,sampled_at_ms:o,...r}=e,{position_secs:a,sampled_at_ms:s,...c}=t;if(JSON.stringify(r)!==JSON.stringify(c))return!0;if(s-o>=n)return!0;let u=e.playing?i+(s-o)/1000:i;return Math.abs(a-u)>1.5}var nr="EgWKAQIIAWoMEA4QChADEAQQCRAF",ir=1000,or=2000;function Mt(){return document.querySelector("#queue")}function Xe(){let e=Mt()?.queue?.store?.store?.getState().queue?.items;return Array.isArray(e)?e:[]}function je(e,t){let n=Mt();if(!n?.dispatch)throw Error("remote.error.noQueue");n.dispatch({type:e,payload:t})}function ui(){let e=document.querySelector("ytmusic-app")?.networkManager;if(!e||typeof e.fetch!=="function")throw Error("remote.error.unsupported");return e}async function rr(e){let t=ui(),n=Ct(await t.fetch("/search",{query:e,params:nr}));if(n.length===0)n=Ct(await t.fetch("/search",{query:e}));return n}async function sr(e,t){let n=Mt()?.queue?.store?.store;if(!n)throw Error("remote.error.noQueue");let i=n.getState().queue??{},r=(await ui().fetch("/music/get_queue",{queueContextParams:i.queueContextParams,queueInsertPosition:t?"INSERT_AFTER_CURRENT_VIDEO":"INSERT_AT_END",videoIds:[e]}))?.queueDatas,a=Array.isArray(r)?r.map((c)=>c&&typeof c==="object"&&("content"in c)?c.content:null).filter(Boolean):[];if(a.length===0)throw Error("remote.error.unsupported");let s=Xe();je("ADD_ITEMS",{nextQueueItemId:n.getState().queue?.nextQueueItemId,index:ai(s,t),items:a,shuffleEnabled:!1,shouldAssignIds:!0})}function It(e){let t=si(Xe(),e);if(t<0)throw Error("remote.error.gone");return t}function ar(){let e=getComputedStyle(document.documentElement),t=e.getPropertyValue("--ytmd-accent-primary").trim(),n=e.getPropertyValue("--ytmd-accent-secondary").trim(),i=e.getPropertyValue("--ytmd-accent").trim();return t&&n&&i?{primary:t,secondary:n,accent:i}:null}function lr(){let e=b.getVideo(),n=document.getElementById("movie_player")?.getCurrentTime?.();return{playing:!!e&&!e.paused&&!e.ended,position_secs:typeof n==="number"&&Number.isFinite(n)?n:e?.currentTime??0,sampled_at_ms:Date.now(),volume:e?ne(e)/100:1,muted:e?be(e):!1,like:b.getLikeStatus(),shuffle:b.isShuffleOn(),repeat:b.getRepeatMode(),accent:ar()}}async function cr(e,t){switch(t.kind){case"command":if(t.command==="shuffle")b.toggleShuffle();else if(t.command==="repeat")b.cycleRepeat();else e.sendPlayerCommand(t.command);return null;case"seek":return b.seekTo(t.position_secs),null;case"volume":return b.setVolume(t.volume),null;case"play":if(!Qe.test(t.video_id))throw Error("remote.error.invalid");if(!ei(t.video_id))ge(t.video_id);return null;case"search":return rr(t.query);case"enqueue":return await sr(t.video_id,t.next),null;case"queue_jump":return je("SET_INDEX",It(t.item_id)),null;case"queue_remove":return je("REMOVE_ITEM",It(t.item_id)),null;case"queue_move":{let n=It(t.item_id),i=Math.max(0,Math.min(t.to_index,Xe().length-1));return je("MOVE_ITEM",{fromIndex:n,toIndex:i}),null}}}var Ge=[],Ke=[],We=null,Je="";function di(){Ke.forEach((e)=>clearInterval(e)),Ke=[],We=null,Je=""}function ur(e){if(Ke.length>0)return;let t=()=>{let i=lr();if(!li(We,i))return;We=i,e.invoke("remote_publish",{kind:"state",data:i}).catch(()=>{return})},n=()=>{let i=ri(Xe()),o=JSON.stringify(i);if(o===Je)return;Je=o,e.invoke("remote_publish",{kind:"queue",data:i}).catch(()=>{return})};t(),n(),Ke.push(window.setInterval(t,ir),window.setInterval(n,or))}function ci(e,t){if(t>0)ur(e);else di()}function mi(e){let t=window.__TAURI__?.event;if(!t)return;t.listen("remote-action",({payload:n})=>{if(!n?.action)return;cr(e,n.action).then((i)=>{if(n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!0,data:i??null}).catch(()=>{return});We=null,Je=""},(i)=>{let o=i instanceof Error?i.message:String(i);if(console.warn("[YTMD Remote] action failed:",n.action.kind,o),n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!1,error:o}).catch(()=>{return})})}).then((n)=>Ge.push(n)),t.listen("remote-clients",({payload:n})=>ci(e,n)).then((n)=>Ge.push(n)),e.invoke("remote_clients").then((n)=>ci(e,typeof n==="number"?n:0)).catch(()=>{return})}function pi(){Ge.forEach((e)=>e()),Ge=[],di()}var yi={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>Lt(e),mi(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){pi(),window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},dr=`
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
`;function mr(){if(document.getElementById("ytmd-qr-styles"))return;let e=document.createElement("style");e.id="ytmd-qr-styles",e.textContent=dr,document.head.appendChild(e)}async function Lt(e){mr();let t=g("p",{text:d().remoteBody,style:"margin: 0;"}),n=g("div",{className:"ytmd-qr-frame",text:d().remoteLoading}),i=g("div",{className:"ytmd-qr-url"}),o=tn({id:"ytmd-remote-modal",title:d().remoteTitle,body:[t,n,i],actions:[{label:d().close}]});try{let r=await e.invoke("get_remote_info");if(!n.isConnected)return;if(r?.qr_svg){let a=g("img");a.src=`data:image/svg+xml;utf8,${encodeURIComponent(r.qr_svg)}`,a.alt=d().remoteTitle,n.replaceChildren(a)}else n.textContent=d().remoteUnavailable;if(r?.url)i.textContent=r.url}catch(r){if(console.error("[YTMD Remote] Error fetching remote info:",r),n.isConnected)n.textContent=d().remoteUnavailable}return o}function pr(e,t){if(!t||typeof t!=="object"||!("ok"in t))throw Error(`Malformed response to ${e}`);let n=t;if(!n.ok)throw Error(n.error||`${e} failed`);return n.data??null}var yr=8000,fe=(e,t={},n={})=>new Promise((i,o)=>{let r=window.__TAURI__;if(!r?.event?.emit){o(Error("Tauri bridge unavailable"));return}let a=Math.random().toString(36).slice(2)+Date.now().toString(36),s=null,c=setTimeout(()=>{if(s)s();o(Error(`Timed out waiting for ${e}`))},n.timeoutMs??yr);r.event.listen(`ytmd-response-${a}`,(u)=>{if(clearTimeout(c),s)s();try{i(pr(e,u.payload))}catch(l){o(l)}}).then((u)=>(s=u,r.event.emit("ytmd-invoke",{id:a,cmd:e,args:t}))).catch((u)=>{clearTimeout(c),o(u instanceof Error?u:Error(String(u)))})});var hi=null,he=null,te=(e)=>{fe(e).catch((t)=>{console.error(`[YTMD] ${e} failed:`,t),T(d().actionFailed)})};function gr(){In({onSyncChipClick:()=>te("toggle_sync_window"),items:[{id:"settings",iconPath:x.tune,label:d().menuSettings,hint:"Ctrl+,",onSelect:()=>te("toggle_settings_window")},{id:"local",iconPath:x.folderMusic,label:d().menuLocal,onSelect:()=>te("toggle_local_library_window")},{id:"sync",iconPath:x.group,label:d().menuSync,onSelect:()=>te("toggle_sync_window")},{id:"remote",iconPath:x.phone,label:d().menuRemote,onSelect:()=>{if(he)Lt(he)}},{id:"mini",iconPath:x.miniPlayer,label:d().menuMiniPlayer,onSelect:()=>te("toggle_mini_player")},{id:"download",iconPath:x.download,label:d().menuDownload,dividerBefore:!0,onSelect:()=>{if(he)bt(he,hi)}}]})}var fr={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function gi(e){let t={};for(let[n,[i,o]]of Object.entries(fr)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}async function fi(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};gr(),wt();let t=setInterval(wt,1000);window.addEventListener("pagehide",()=>clearInterval(t));try{let l=await fe("get_config");if(l&&typeof l==="object")Object.assign(e,l)}catch(l){console.error("[YTMD] Failed to load config, using defaults:",l)}let n={track:null,config:e,invoke:fe,sendPlayerCommand:(l)=>{c(l)},getVideoElement:()=>b.getVideo()};he=n;let i=new nt(n);i.register(Qt),i.register(jt),i.register(an),i.register(mn),i.register(pn),i.register(yn),i.register(gn),i.register(bn),i.register(kn),i.register(Tn),i.register(xn),i.register(En),i.register(ti),i.register(ni),i.register(yi);try{await i.initAll(gi(e))}catch(l){console.error("[YTMD] Registry init error:",l)}let o=new Ze,r=0,a=Date.now();async function s(l,m,y){try{await fe("update_track_info",{track:{title:l.title,artist:l.artist,album:l.album||null,cover_url:l.coverUrl||null,duration_secs:Math.round(l.durationSecs||0),current_time_secs:Math.round(m),is_playing:y,video_id:l.videoId||null,sampled_at_ms:Date.now()}})}catch(f){console.error("[YTMD] Failed to sync track info to backend:",f)}}o.onTrackChange(async(l)=>{hi=l,r=l.currentTimeSecs||0,a=Date.now(),i.handleTrackChange(l),await s(l,l.currentTimeSecs||0,l.isPlaying)}),o.onPlaybackChange(async(l)=>{i.handlePlaybackChange(l);let m=o.getCurrentTrack();if(m)m.isPlaying=l,r=m.currentTimeSecs||0,a=Date.now(),await s(m,m.currentTimeSecs||0,l)}),o.onTick((l)=>{i.handleTick(l);let m=o.getCurrentTrack();if(!m||!m.isPlaying)return;let y=Date.now(),f=(y-a)/1000,p=r+f;if(Math.abs(l-p)>2||f>=15)r=l,a=y,m.currentTimeSecs=Math.round(l),s(m,l,!0)});function c(l){if(Zn(l))return;switch(l){case"play":b.play();break;case"pause":b.pause();break;case"play_pause":b.playPause();break;case"next":b.next();break;case"previous":b.previous();break;case"like":b.toggleLike();break;case"dislike":b.toggleDislike();break;case"mute":b.toggleMute();break}}let u=(l,m)=>{let y=window.__TAURI__;if(y?.event?.listen)y.event.listen(l,(f)=>m(f.payload))};u("player-command",(l)=>c(l)),u("tray-command",(l)=>c(l)),u("mpris-command",(l)=>c(l)),u("global-shortcut-event",(l)=>c(l)),u("player-seek",(l)=>b.seekTo(l)),u("mpris-command-seek",(l)=>b.seekTo(l)),u("player-volume",(l)=>b.setVolume(l)),u("config-updated",(l)=>{if(!l||typeof l!=="object")return;Object.assign(e,l);let m=gi(e);for(let[y,f]of Object.entries(m))if(f)i.enable(y).catch((p)=>console.error(`[YTMD] Failed to enable plugin ${y}:`,p));else i.disable(y).catch((p)=>console.error(`[YTMD] Failed to disable plugin ${y}:`,p))}),window.addEventListener("keydown",(l)=>{if(l.ctrlKey&&l.key===","||l.key==="F2")l.preventDefault(),te("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var hr=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(hr)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>fi());else fi();})();
