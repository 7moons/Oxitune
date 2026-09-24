(()=>{function bt(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}var jn=1500,vt=(e)=>e.trim().replace(/\s+/g," ").toLowerCase();function Gn(e,t){if(!e?.trim()||!t?.trim())return!0;return vt(e)===vt(t)}function Qn(e,t){if(!e)return"new";if(e.videoId&&t.videoId){if(e.videoId!==t.videoId)return"new"}else if(e.title!==t.title||e.artist!==t.artist)return"new";return e.title!==t.title||e.artist!==t.artist||!e.videoId&&!!t.videoId||!e.coverUrl&&!!t.coverUrl||!e.album&&!!t.album||t.durationSecs>0&&Math.abs(t.durationSecs-e.durationSecs)>1?"metadata":null}var Kn=400;function Wn(e,t){return e-t>=Kn}class Oe{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&Wn(Date.now(),this.lastTickMs))this.emitTick(n.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",a=i?.album||"",s="";if(i?.artwork&&i.artwork.length>0){let p=i.artwork[i.artwork.length-1];if(p&&p.src)s=p.src}if(!o){let p=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(p)o=p.textContent?.trim()||""}if(!r){let p=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(p){let b=(p.textContent?.trim()||"").split("•").map((T)=>T.trim());if(r=b[0]||"",b.length>1)a=b[1]}}if(!s){let p=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(p&&p.src)s=p.src}if(s.startsWith("//"))s=`https:${s}`;if(s.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(s))s=s.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let c=t?.getVideoData?.(),d=c?.video_id||new URLSearchParams(window.location.search).get("v")||void 0;if(d&&!Gn(c?.title,i?.title)){let p=Date.now();if(this.titleMismatch?.videoId!==d)this.titleMismatch={videoId:d,sinceMs:p};if(p-this.titleMismatch.sinceMs<jn)return null}else this.titleMismatch=null;let l=0,m=0;if(t&&typeof t.getDuration==="function"){let p=t.getDuration();if(typeof p==="number"&&Number.isFinite(p)&&p>0)l=Math.floor(p)}if(t&&typeof t.getCurrentTime==="function"){let p=t.getCurrentTime();if(typeof p==="number"&&Number.isFinite(p)&&p>=0)m=Math.floor(p)}if(!l&&e&&Number.isFinite(e.duration)&&e.duration>0)l=Math.floor(e.duration);if(!m&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)m=Math.floor(e.currentTime);let y=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(y&&y.textContent){let p=y.textContent.split("/").map((h)=>h.trim());if(p.length===2){if(!m)m=bt(p[0]);if(!l)l=bt(p[1])}}if(!l){let h=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(h){let b=parseInt(h,10);if(!isNaN(b)&&b>0)l=b}}let f=e?!e.paused&&!e.ended:!1;if(!o)return null;return{title:o,artist:r||"Unknown Artist",album:a||void 0,coverUrl:s||void 0,durationSecs:l,currentTimeSecs:m,isPlaying:f,videoId:d}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=Qn(this.currentTrack,e),n=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((i)=>i(e))}if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function Be(){return document.getElementById("movie_player")}function Tt(e){for(let t of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let n=document.querySelector(t);if(!n||!("value"in n))continue;if("step"in n&&Number(n.step)>1)n.step=1;n.value=e}}function Ye(e){let t=Be()?.getVolume?.(),n=typeof t==="number"&&Number.isFinite(t)?t:e.volume*100;return Math.max(0,Math.min(100,Math.round(n)))}function wt(e){return Be()?.isMuted?.()===!0||e.muted}function ye(e,t){if(!Number.isFinite(e))return;let n=Math.max(0,Math.min(100,Math.round(e))),i=Be();if(typeof i?.setVolume==="function"){if(i.setVolume(n),n>0&&i.isMuted?.())if(typeof i.unMute==="function")i.unMute();else t.muted=!1;Tt(n);return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1;Tt(n)}var xt=!1;function kt(e){xt=e}function ge(){return xt}var Et=null;function $e(e){Et=e}function Pt(){return Et?.()??!1}class v{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){if(Pt())return;this.nextInYtm()}static nextInYtm(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)ye(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class Ue{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var fe=null,Y={adWasShowing:!1,preAdMuted:!1},je=new WeakSet,Z=null,Lt=null,Fe=0,ee=!0,Jn=1000,Xn=(e,t,n)=>e-t>=n,Zn=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",ei="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",ti=300,ni=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,ii=`
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
`,oi=ni+ii,ri=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],si=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],ai=(e)=>ri.some((t)=>e.includes(t)),li=(e,t)=>{let n=t.split("."),i=e;for(let r=0;r<n.length-1;r++){if(i===null||typeof i!=="object")return!1;i=i[n[r]]}let o=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,o))return delete i[o],!0;return!1},Qe=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of si)if(li(e,n))t=!0;return t},ci=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},St=!1,di=()=>{if(St)return;St=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let o=await t(...i);if(!ee||!ai(ci(i[0])))return o;let r;try{r=await o.clone().json()}catch{return o}if(!Qe(r))return o;let a=new Headers(o.headers);return a.delete("content-length"),a.delete("content-encoding"),new Response(JSON.stringify(r),{status:o.status,statusText:o.statusText,headers:a})};window.fetch=Object.assign(n,e)},_t=!1,ui=()=>{if(_t)return;_t=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(ee)Qe(n);return n}},Ct=!1,mi=()=>{if(Ct)return;Ct=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(ee)Qe(t);e=t}})};if(typeof window<"u")di(),ui(),mi();var pi=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},yi=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},Ke=()=>document.getElementById("movie_player"),gi=()=>{let e=Ke();if(!e)return!1;return pi(e.classList)},Ge=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=yi(gi(),Y,t.muted);if(Y=n,i!==null)t.muted=i},Mt=(e)=>{if(je.has(e))return;je.add(e),e.click()},he=()=>{document.querySelectorAll(Zn).forEach(Mt),document.querySelectorAll(ei).forEach((e)=>{let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)Mt(t)})},It=(e)=>{let t=Ke();if(Lt=t,!t)return;Z?.disconnect(),Z=new MutationObserver(()=>{Ge(e),he()}),Z.observe(t,{attributes:!0,attributeFilter:["class"]})},At={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){ee=!0,Y={adWasShowing:!1,preAdMuted:!1},je=new WeakSet,Fe=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=oi,document.head.appendChild(t);let n=null,i=new MutationObserver(()=>{if(n!==null)return;n=setTimeout(()=>{n=null,he()},ti)});i.observe(document.body,{childList:!0,subtree:!0}),It(e),he(),Ge(e),fe=()=>{if(ee=!1,Z?.disconnect(),Z=null,i.disconnect(),n!==null)clearTimeout(n);document.getElementById("ytmd-adblock-styles")?.remove();let o=e.getVideoElement();if(o&&Y.adWasShowing)o.muted=Y.preAdMuted;Y={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(Ke()!==Lt)It(t);Ge(t);let n=Date.now();if(Xn(n,Fe,Jn))Fe=n,he()},onDestroy(){if(fe)fe(),fe=null}};var U=[],be="",We=new Set,fi=(e,t)=>e===t,Rt={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){U=[],be="",We=new Set},onTrackChange(e){if(!e.videoId||e.videoId===be)return;let t=e.videoId;be=t,U=[],We=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(o)=>{if(!o.ok)return;let r=await o.json();if(!fi(t,be))return;U=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!U||U.length===0||ge())return;let n=We;for(let i of U){let[o,r]=i.segment;if(e>=o&&e<r-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let a=t.getVideoElement();if(a)a.currentTime=r,n.add(i.UUID);break}}}};function Nt(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function g(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var Dt="ytmd-kit-styles",hi=`
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
`;function _(){if(document.getElementById(Dt))return;let e=document.createElement("style");e.id=Dt,e.textContent=hi,(document.head||document.documentElement).appendChild(e),bi()}var x={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function te(e,t=24){return Nt(e,t,t)}function A(e){let t=g("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(te(e.iconPath)),t}function zt(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(te(t))}function Ht(e,t){let n=e.querySelector("svg.ytmd-progress-ring");if(t===null){n?.remove();return}let i=17,o=2*Math.PI*i;if(!n){n=document.createElementNS("http://www.w3.org/2000/svg","svg"),n.setAttribute("class","ytmd-progress-ring"),n.setAttribute("viewBox","0 0 36 36");for(let s of["ytmd-progress-track","ytmd-progress-value"]){let c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("class",s),c.setAttribute("cx","18"),c.setAttribute("cy","18"),c.setAttribute("r",String(i)),c.setAttribute("stroke-dasharray",String(o)),n.appendChild(c)}e.appendChild(n)}let r=Math.max(0,Math.min(1,t));n.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(o*(1-r)))}var Vt=!1;function bi(){if(Vt)return;Vt=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},o=(s)=>{let c=s.dataset.ytmdTooltip;if(!c)return;if(!e)e=g("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=c;let d=s.getBoundingClientRect(),l=e.getBoundingClientRect(),y=d.bottom+8+l.height<window.innerHeight?d.bottom+8:d.top-8-l.height,f=Math.max(8,Math.min(window.innerWidth-l.width-8,d.left+d.width/2-l.width/2));e.style.top=`${y}px`,e.style.left=`${f}px`,e.classList.add("ytmd-open")},r=(s)=>{let c=s.target?.closest?.("[data-ytmd-tooltip]");if(!c||c===n)return;i(),n=c,t=setTimeout(()=>o(c),250)},a=(s)=>{let c=s.relatedTarget;if(n&&c&&n.contains(c))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",a,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var z=null;function w(e,t={}){_();let n=document.getElementById("ytmd-toast-host");if(!n)n=g("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),r=o?i:g("div",{className:"ytmd-toast"});if(t.id)r.dataset.toastId=t.id;let s=[g("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:d,onClick:l}=t.action,m=g("button",{className:"ytmd-button",text:d});m.type="button",m.addEventListener("click",()=>{qt(),l()}),s.push(m)}if(r.replaceChildren(...s),!o)n.replaceChildren(r);if(z!==null)clearTimeout(z);z=null;let c=t.durationMs??4000;if(c>0)z=setTimeout(qt,c)}var vi=5,Ti=3000;function Ot(e,t){_();let n=document.getElementById("ytmd-reaction-host");if(!n)n=g("div",{id:"ytmd-reaction-host"}),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=g("div",{className:"ytmd-reaction"});i.append(g("span",{className:"ytmd-reaction-emoji",text:e}),g("span",{text:t})),n.appendChild(i);while(n.children.length>vi)n.firstElementChild?.remove();setTimeout(()=>i.remove(),Ti)}function qt(){if(z!==null)clearTimeout(z);z=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function Bt(e){_(),document.getElementById(e.id)?.remove();let t=g("div",{id:e.id,className:"ytmd-scrim"}),n=g("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=g("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),r=g("div",{className:"ytmd-dialog-body"});if(e.body)r.append(...e.body);let a=document.activeElement,s=()=>{document.removeEventListener("keydown",c,!0),t.remove(),a?.focus?.()},c=(l)=>{if(l.key==="Escape")l.stopPropagation(),s()};document.addEventListener("keydown",c,!0),t.addEventListener("click",(l)=>{if(l.target===t)s()});let d=g("div",{className:"ytmd-dialog-actions"});for(let l of e.actions){let m=g("button",{className:`ytmd-button${l.filled?" ytmd-button--filled":""}`,text:l.label});m.type="button",m.addEventListener("click",()=>l.onClick?l.onClick(s):s()),d.appendChild(m)}return n.append(o,r,d),t.appendChild(n),document.body.appendChild(t),d.querySelector("button")?.focus(),{close:s,body:r}}var Yt={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:(e,t,n)=>`${e} votes to skip (${t}/${n})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:(e,t)=>`From the shared queue: ${e} · ${t}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:(e)=>`${e} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:(e)=>`from ${e}`,syncQueuePlayNow:(e)=>`Play “${e}” now`,syncQueueRemove:(e)=>`Remove “${e}” from the queue`,syncQueueDrag:(e)=>`Move “${e}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",downloadNoTrack:"Play a song first to download it",downloadStarted:(e)=>`Downloading “${e}”`,downloadDone:(e)=>`Downloaded “${e}”`,downloadFailed:(e)=>`Download failed: ${e}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:"Source: LRCLIB",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`},wi={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:(e,t,n)=>`${e} głosuje za pominięciem (${t}/${n})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:(e,t)=>`Ze wspólnej kolejki: ${e} · ${t}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:(e)=>`${e} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:(e)=>`od: ${e}`,syncQueuePlayNow:(e)=>`Zagraj teraz: „${e}”`,syncQueueRemove:(e)=>`Usuń z kolejki: „${e}”`,syncQueueDrag:(e)=>`Przesuń „${e}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:(e)=>`Pobieranie: „${e}”`,downloadDone:(e)=>`Pobrano: „${e}”`,downloadFailed:(e)=>`Nie udało się pobrać: ${e}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:"Źródło: LRCLIB",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`},xi={en:Yt,pl:wi};function ki(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return xi[t]??Yt}var Je=null;function u(){if(!Je){let e=typeof document<"u"?document.documentElement.lang:"";Je=ki(e||(typeof navigator<"u"?navigator.language:"en"))}return Je}var C=[],ie=-1,oe=null,I="",ve=null,ne="",$t=(e,t)=>e===t,jt={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){C=[],ie=-1,oe=null,I="",ne="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
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
    `,document.head.appendChild(t),_();let n=()=>{Te(),Ft(e)},i=()=>{setTimeout(()=>{Te(),Ze()},50),setTimeout(()=>{Ze()},250)};document.addEventListener("click",i,!0);let o=window.setInterval(n,600);n(),ve=()=>{clearInterval(o),document.removeEventListener("click",i,!0),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((a)=>a.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(I===n&&C.length>0||ne===n)return;I=n,ne=n,C=[],ie=-1,oe=null,Te();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(g("div",{className:"ytmd-native-lyrics-status",text:u().lyricsLoading}));try{let o=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!$t(n,I))return;if(oe=o,o?.syncedLyrics)C=Li(o.syncedLyrics);Te(),Ft(t),Wt(t)}catch{if(!$t(n,I))return;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.replaceChildren(g("div",{className:"ytmd-native-lyrics-status",text:u().lyricsNone}))}finally{if(ne===n)ne=""}},onTick(e){if(!C||C.length===0)return;let t=we(I),n=e+t,i=-1;for(let o=0;o<C.length;o++)if(n>=C[o].timeSecs)i=o;else break;if(i!==ie&&i>=0){ie=i;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o){let r=o.querySelectorAll(".ytmd-native-lyric-line");r.forEach((s,c)=>{if(c===i)s.classList.add("active");else s.classList.remove("active")});let a=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(a&&Ci(a)){let s=r[i];if(s)s.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(ve)ve(),ve=null}},Gt="ytmd-lyrics-offsets",Ei=500;function Qt(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function Pi(e){try{let t=e?.getItem(Gt);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function Si(e,t,n,i){if(e.delete(t),n!==0)e.set(t,n);while(e.size>Ei){let o=e.keys().next().value;if(o===void 0)break;e.delete(o)}try{i?.setItem(Gt,JSON.stringify([...e]))}catch{}}var Xe=null;function Kt(){if(!Xe)Xe=Pi(Qt());return Xe}function we(e){return Kt().get(e)||0}function _i(e,t){Si(Kt(),e,t,Qt())}function Ut(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function Ci(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function Mi(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function Te(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(Mi(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function Ii(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function Ze(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=Ii();e.style.setProperty("display",t?"flex":"none","important")}function Ft(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=g("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),Wt(e)}Ze()}function Wt(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(C&&C.length>0){let n=we(I),i=g("span",{className:"ytmd-lyrics-offset-value",text:Ut(n)}),o=(s)=>{let c=s===null?0:Math.round((we(I)+s)*10)/10;_i(I,c),i.textContent=Ut(c)},r=(s,c,d)=>{let l=g("button",{className:"ytmd-chip",text:s});return l.type="button",l.dataset.ytmdTooltip=c,l.setAttribute("aria-label",c),l.addEventListener("click",d),l},a=g("div",{className:"ytmd-native-lyrics-footer"});a.append(g("span",{className:"ytmd-lyrics-source",text:u().lyricsSource}),g("span",{text:u().lyricsOffset}),r("−0.5 s",u().lyricsLater,()=>o(-0.5)),i,r("+0.5 s",u().lyricsEarlier,()=>o(0.5)),r(u().lyricsReset,u().lyricsReset,()=>o(null))),t.replaceChildren(...C.map((s,c)=>{let d=g("div",{className:`ytmd-native-lyric-line${c===ie?" active":""}`,text:s.text});return d.addEventListener("click",()=>{let l=e.getVideoElement();if(l){let m=we(I);l.currentTime=Math.max(0,s.timeSecs-m)}}),d}),a)}else if(oe?.plainLyrics){let n=oe.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>g("div",{className:"ytmd-native-lyric-line ytmd-plain",text:i})),g("div",{className:"ytmd-native-lyrics-footer",text:u().lyricsSource}))}else t.replaceChildren(g("div",{className:"ytmd-native-lyrics-status",text:u().lyricsNone}))}function Li(e){let t=e.split(`
`),n=[],i=0,o=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,r=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let a of t){let s=a.trim();if(!s)continue;let c=r.exec(s);if(c){let m=parseInt(c[1],10);if(!isNaN(m))i=m/1000;continue}let d=[],l;o.lastIndex=0;while((l=o.exec(s))!==null){let m=parseInt(l[1],10),y=parseInt(l[2],10),f=0;if(l[3])f=parseInt(l[3].padEnd(3,"0").slice(0,3),10);d.push(m*60+y+f/1000)}if(d.length>0){let m=s.replace(o,"").trim();if(m)for(let y of d)n.push({timeSecs:Math.max(0,y-i),text:m})}}return n.sort((a,s)=>a.timeSecs-s.timeSecs)}var re=null;function se(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}var Jt={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){re?.(),_(),document.getElementById("ytmd-volume-indicator")?.remove();let t=g("div",{id:"ytmd-volume-indicator"});document.body.appendChild(t);let n=null,i=null,o=null,r=null,a=null,s=()=>{if(a!==null)window.clearTimeout(a);a=null,t.classList.remove("ytmd-visible")},c=()=>{if(a!==null)window.clearTimeout(a);t.classList.add("ytmd-visible"),a=window.setTimeout(()=>{a=null,t.classList.remove("ytmd-visible")},1800)},d=()=>{let h=e.getVideoElement();if(!h){r=null,s();return}let b=wt(h)?0:Ye(h),T=r!==null&&b!==r;r=b;let P=document.querySelector("ytmusic-player-page #main-panel");if(!se(P)){s();return}if(t.textContent!==`${b}%`)t.textContent=`${b}%`,t.setAttribute("aria-label",u().volumeLevel(b));let B=se(document.querySelector("ytmusic-player-page #song-image")),D=se(document.querySelector("ytmusic-player-page video"))||se(document.querySelector("ytmusic-player-page #movie_player")),M=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?D||B:B||D)||se(P);if(!M){s();return}let L=`${Math.max(8,M.left+12)}px`,S=`${Math.max(8,M.top+12)}px`;if(t.style.left!==L)t.style.left=L;if(t.style.top!==S)t.style.top=S;if(T)c()},l=()=>{let h=e.getVideoElement();if(h===n)return;n?.removeEventListener("volumechange",d),n=h,n?.addEventListener("volumechange",d),d()},m=()=>{let h=document.querySelector("ytmusic-player-page");if(h===i)return;if(o?.disconnect(),i=h,h)o=new MutationObserver(()=>window.requestAnimationFrame(d)),o.observe(h,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},y=(h)=>{let b=h.target;if(b instanceof Element&&b.closest("ytmusic-player-bar"))window.requestAnimationFrame(d)},f=(h)=>{if(h.deltaY===0||h.ctrlKey)return;let b=h.target;if(b instanceof Element&&b.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'))return;let T=(L)=>{if(!L)return!1;let S=L.getBoundingClientRect();return h.clientX>=S.left&&h.clientX<S.right&&h.clientY>=S.top&&h.clientY<S.bottom},P=T(document.querySelector("ytmusic-player-bar"))||T(document.querySelector("#player-bar-background")),B=e.config.wheel_volume_on_player_page===!0&&T(document.querySelector("ytmusic-player-page #main-panel"));if(!P&&!B)return;let D=e.getVideoElement();if(!D)return;let E=e.config.wheel_volume_step,M=typeof E==="number"&&Number.isFinite(E)&&E>0?Math.min(E,1):0.05;h.preventDefault(),ye(Ye(D)+(h.deltaY<0?M:-M)*100,D),d()};window.addEventListener("wheel",f,{passive:!1}),window.addEventListener("resize",d),document.addEventListener("scroll",d,!0),document.addEventListener("input",y,!0),document.addEventListener("change",y,!0),m(),l();let p=window.setInterval(()=>{m(),l(),d()},500);re=()=>{window.removeEventListener("wheel",f),window.removeEventListener("resize",d),document.removeEventListener("scroll",d,!0),document.removeEventListener("input",y,!0),document.removeEventListener("change",y,!0),window.clearInterval(p),o?.disconnect(),n?.removeEventListener("volumechange",d),s(),t.remove()}},onDestroy(){if(re)re(),re=null}};var Xt={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var xe=null,Zt={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);xe=()=>{t?.remove()}},onDestroy(){if(xe)xe(),xe=null}};var ke=[32,64,125,250,500,1000,2000,4000,8000,16000],et={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function ae(e){return Math.max(-24,Math.min(24,e))}function Ai(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function Ri(e){return Math.max(0.5,Math.min(2,e))}class k{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=ke.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!k.instance)k.instance=new k;return k.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=ke.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===ke.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=ae(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=ae(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=ae(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,ae(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=et[e]||et.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),Ai(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=Ri(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??v.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class tt{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)k.getInstance().fadeIn(this.crossfadeSeconds);else k.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),k.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),k.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),v.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class nt{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=k.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,v.next()}else this.consecutiveSilentTicks=0}}var H=null,F=null,Ee=null;function Ni(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var en={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=k.getInstance(),n=new tt,i=new nt;H=n,F=i;let o=e.config,r=null,a=()=>{if(r!==null)return;let c=e.getVideoElement();if(c){if(!t.isInitializedFor(c))t.init(c);return}r=window.setInterval(()=>{let d=e.getVideoElement();if(d){if(r!==null)clearInterval(r);r=null,t.init(d)}},500)};if(Ni(o))a();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let s=[];if(window.__TAURI__?.event){let{listen:c}=window.__TAURI__.event;s.push(c("set-eq-band",(d)=>{a(),t.setBandGain(d.payload.bandIndex,d.payload.gain)}),c("set-eq-all",(d)=>{a(),t.setAllGains(d.payload.gains)}),c("set-eq-preset",(d)=>{a(),t.applyPreset(d.payload)}),c("set-preamp",(d)=>{a(),t.setPreamp(d.payload)}),c("set-loudness-normalization",(d)=>{if(d.payload)a();t.setLoudnessNormalization(d.payload)}),c("set-crossfade-seconds",(d)=>{if(d.payload>0)a();n.setCrossfadeSeconds(d.payload)}),c("set-skip-silence",(d)=>{if(d.payload)a();i.setEnabled(d.payload)}),c("set-playback-rate",(d)=>{t.setPlaybackRate(d.payload)}),c("set-preserves-pitch",(d)=>{t.setPreservesPitch(d.payload)}))}Ee=()=>{if(r!==null)clearInterval(r),r=null;s.forEach((c)=>c.then((d)=>d())),H?.destroy(),H=null,F=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(k.getInstance().applyRateAndPitch(),H)H.onTrackChange(e);if(F)F.onTrackChange()},onTick(e,t){if(ge())return;if(H)H.onTick(e,t.track);if(F)F.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(Ee)Ee(),Ee=null}};var it=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function tn(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let a=r.getImageData(0,0,16,16).data,s=0,c=0,d=0,l=0,m=0,y=0,f=0,p=0;for(let E=0;E<a.length;E+=4){let M=a[E],L=a[E+1],S=a[E+2];if(a[E+3]<128)continue;let ht=(M+L+S)/3;if(ht<20||ht>240)continue;if(E<a.length/2)s+=M,c+=L,d+=S,l++;else m+=M,y+=L,f+=S,p++}if(l===0&&p===0){t(n);return}let h=l>0?Math.round(s/l):220,b=l>0?Math.round(c/l):38,T=l>0?Math.round(d/l):38,P=p>0?Math.round(m/p):24,B=p>0?Math.round(y/p):24,D=p>0?Math.round(f/p):27;t({primary:it(h,b,T),secondary:it(P,B,D),accent:it(h+30,b+30,T+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var V=48,Di=3,Vi=3,qi=1.65,zi=0.55;function Hi(e,t,n,i){let o=new Float32Array(e.length),r=(a,s,c)=>{let d=c?n:t,l=c?t:n;for(let m=0;m<d;m++)for(let y=0;y<4;y++)for(let f=0;f<l;f++){let p=0,h=0;for(let T=Math.max(0,f-i);T<=Math.min(l-1,f+i);T++){let P=c?(m*t+T)*4+y:(T*t+m)*4+y;p+=a[P],h++}let b=c?(m*t+f)*4+y:(f*t+m)*4+y;s[b]=p/h}};r(e,o,!0),r(o,e,!1)}function Oi(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],a=e[i+2],s=0.2126*o+0.7152*r+0.0722*a;e[i]=(s+(o-s)*t)*n,e[i+1]=(s+(r-s)*t)*n,e[i+2]=(s+(a-s)*t)*n}}async function nn(e,t=zi){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=V,o.height=V;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,V,V);let a=r.getImageData(0,0,V,V);for(let s=0;s<Vi;s++)Hi(a.data,V,V,Di);Oi(a.data,qi,t),r.putImageData(a,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var Pe=null,Se=null,_e,on={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=g("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=g("img",{id:"ytmd-ambient-cover"});n.alt="";let i=g("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,a=document.createElement("style");a.id="ytmd-ambient-styles",a.textContent=`
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
    `,document.head.appendChild(a),Pe=(c)=>{if(t)t.style.opacity=String(c)};let s=[];if(window.__TAURI__?.event)s.push(window.__TAURI__.event.listen("set-ambient-intensity",(c)=>{Pe?.(c.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(c)=>{let d=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;Pe?.(c.payload?d:0)}));if(Se=()=>{s.forEach((c)=>c.then((d)=>d())),Pe=null,_e=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===_e)return;_e=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await nn(t):null;if(t!==_e)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await tn(t||""),o=document.documentElement.style;o.setProperty("--ytmd-accent",i.accent),o.setProperty("--ytmd-accent-primary",i.primary),o.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(Se)Se(),Se=null}};var rn=`
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

`,sn=`
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

`;var Ce=null,an={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let c=document.getElementById(s);if(!c){c=document.createElement("style"),c.id=s;let d=t();if(d)d.appendChild(c)}return c},i=(s)=>{let c=n("ytmd-active-theme");c.textContent=s?rn:sn},o=(s)=>{let c=n("ytmd-custom-css");if(c)c.textContent=s};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let a=[];if(window.__TAURI__?.event)a.push(window.__TAURI__.event.listen("set-ambient-enabled",(s)=>{i(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{o(s.payload)}));Ce=()=>{a.forEach((s)=>s.then((c)=>c()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(Ce)Ce(),Ce=null}};var Me=null,ln={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=A({id:"ytmd-pip-btn",label:u().pipButton,iconPath:x.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(a){console.warn("[YTMD PiP] Could not enter PiP:",a),await e.invoke("toggle_mini_player").catch((s)=>console.error("[YTMD PiP] Mini player fallback failed:",s))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),Me=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(Me)Me(),Me=null}};function Bi(e){if(e.error)return"failed";if(e.output_path&&e.percent>=100)return"done";return"progress"}var Le="ytmd-download-btn",Yi=3000,j=new Map,ot=new Set,Ae=null,Ie=null;function G(){let e=document.getElementById(Le);if(!e)return;let t=Ae?.videoId,n=t?j.get(t):void 0;Ht(e,n?Math.max(0.05,n.fraction):null),zt(e,t&&ot.has(t)?x.check:x.download),e.setAttribute("aria-disabled",t?"false":"true");let i=n?u().downloadInProgress:u().downloadButton;e.setAttribute("aria-label",i),e.dataset.ytmdTooltip=i}function rt(e,t){let n=j.get(e);if(!n)return;if(j.delete(e),t.ok)ot.add(e),setTimeout(()=>{ot.delete(e),G()},Yi),w(u().downloadDone(n.title),{id:`download-${e}`});else w(u().downloadFailed(t.reason),{id:`download-${e}`,durationMs:8000});G()}function $i(e){let t=j.get(e.video_id);if(!t)return;let n=Bi(e);if(n==="failed")rt(e.video_id,{ok:!1,reason:e.error||e.status});else if(n==="done")rt(e.video_id,{ok:!0});else t.fraction=e.percent/100,G()}function st(e,t){let n=t?.videoId;if(!t||!n){w(u().downloadNoTrack);return}if(j.has(n)){w(u().downloadInProgress);return}j.set(n,{title:t.title,fraction:0}),G(),w(u().downloadStarted(t.title),{id:`download-${n}`}),e.invoke("download_track",{request:{video_id:n,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:e.config.download_format||"mp3",embed_lyrics:e.config.embed_lyrics!==!1}}).catch((i)=>{console.error("[YTMD Downloader] Download failed:",i),rt(n,{ok:!1,reason:i instanceof Error?i.message:String(i)})})}var cn={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){Ae=e.track;let t=()=>{if(document.getElementById(Le))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!o)return;let r=A({id:Le,label:u().downloadButton,iconPath:x.download});r.addEventListener("click",()=>{if(r.getAttribute("aria-disabled")==="true")return;st(e,Ae)}),o.appendChild(r),G()},n=window.setInterval(t,1000);t();let i=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(o)=>$i(o.payload)):null;Ie=()=>{clearInterval(n),i?.then((o)=>o()),document.getElementById(Le)?.remove()}},onTrackChange(e){Ae=e,G()},onDestroy(){if(Ie)Ie(),Ie=null}};var dn={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};var Re="ytmd-nav-slot",at="ytmd-menu-btn",ce="ytmd-menu",un="ytmd-sync-chip",pn=[],le=null,yn=null,mn=!1,Ui=`
  #${Re} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function Fi(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=Ui,document.head.appendChild(e)}function ji(e){if(!e)return;return`${u().syncInRoom} · ${u().syncListeners(e.listeners)}`}function gn(e){pn=e.items,yn=e.onSyncChipClick}function lt(){if(document.getElementById(Re)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;_(),Fi();let t=g("div",{id:Re}),n=A({id:at,label:u().menuLabel,iconPath:x.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),Qi(n)}),t.appendChild(n),e.prepend(t),fn(),Wi()}function ct(e){le=e,fn();let t=document.getElementById(ce);if(t?.classList.contains("ytmd-open"))hn(t)}function fn(){let e=document.getElementById(Re);if(!e)return;let t=document.getElementById(un);if(!le){t?.remove();return}if(!t)t=g("button",{id:un,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>yn?.()),e.prepend(t);let n=u().syncListeners(le.listeners);t.replaceChildren(g("span",{className:"ytmd-chip-dot"}),te(x.group,18),g("span",{text:n})),t.dataset.ytmdTooltip=`${u().syncInRoom} · ${le.roomCode}`,t.setAttribute("aria-label",`${u().syncInRoom}, ${n}`)}function hn(e){let t=[];for(let n of pn){if(n.dividerBefore)t.push(g("div",{className:"ytmd-menu-divider"}));let i=g("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=g("span",{className:"ytmd-menu-item-text"});o.appendChild(g("span",{text:n.label}));let r=n.id==="sync"?ji(le):void 0;if(r)o.appendChild(g("span",{className:"ytmd-menu-item-sub",text:r}));if(i.append(te(n.iconPath),o),n.hint)i.appendChild(g("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{Q(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function Gi(){let e=document.getElementById(ce);if(!e)e=g("div",{id:ce,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",Ki),document.body.appendChild(e);return e}function Qi(e){let t=Gi();if(t.classList.contains("ytmd-open")){Q();return}hn(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function Q(){let e=document.getElementById(ce);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById(at);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function Ki(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),Q();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")Q()}function Wi(){if(mn)return;mn=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(ce);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(at)?.contains(n))return;Q()}),window.addEventListener("resize",Q)}function bn(e){return e.is_host?"host":e.role??"dj"}function q(e){return e!=="listener"}function vn(e){return Math.floor(e/2)+1}function Ji(e,t,n){let i=0;return t.forEach((o,r)=>{if(r!==n&&e>o)i++}),i}var Ne=null;function Tn(e,t){if(!Ne)return;let n=[...e.querySelectorAll(t)].find((i)=>i.dataset.itemId===Ne);if(n)n.focus(),Ne=null}function wn({list:e,rowSelector:t,handleSelector:n,onMove:i}){let o=()=>[...e.querySelectorAll(t)],r=()=>o().forEach((f)=>f.classList.remove("is-dragging","drop-before","drop-after")),a=null,s=(f,p)=>{let h=o().filter((b,T)=>T!==p);if(h.forEach((b)=>b.classList.remove("drop-before","drop-after")),f<h.length)h[f].classList.add("drop-before");else h[h.length-1]?.classList.add("drop-after")},c=(f)=>{if(f.button!==0||!(f.target instanceof Element))return;let p=f.target.closest(n),h=p?.closest(t);if(!p||!h||!p.dataset.itemId)return;let b=o().indexOf(h);if(b<0)return;f.preventDefault();try{p.setPointerCapture(f.pointerId)}catch{}a={from:b,itemId:p.dataset.itemId,to:b,pointerId:f.pointerId,handle:p},h.classList.add("is-dragging")},d=(f)=>{if(!a||f.pointerId!==a.pointerId)return;let p=o().map((h)=>{let b=h.getBoundingClientRect();return b.top+b.height/2});a.to=Ji(f.clientY,p,a.from),s(a.to,a.from)},l=(f)=>{if(!a||f.pointerId!==a.pointerId)return;let{from:p,to:h,itemId:b,handle:T}=a;if(a=null,T.hasPointerCapture(f.pointerId))T.releasePointerCapture(f.pointerId);if(r(),h!==p)i(p,h,b)},m=(f)=>{if(f.key!=="ArrowUp"&&f.key!=="ArrowDown"||!(f.target instanceof Element))return;let p=f.target.closest(n),h=p?.closest(t);if(!p||!h||!p.dataset.itemId)return;f.preventDefault();let b=o(),T=b.indexOf(h),P=f.key==="ArrowUp"?T-1:T+1;if(T<0||P<0||P>=b.length)return;Ne=p.dataset.itemId,i(T,P,p.dataset.itemId)},y=()=>{a=null,r()};return e.addEventListener("pointerdown",c),e.addEventListener("pointermove",d),e.addEventListener("pointerup",l),e.addEventListener("pointercancel",y),e.addEventListener("keydown",m),()=>{e.removeEventListener("pointerdown",c),e.removeEventListener("pointermove",d),e.removeEventListener("pointerup",l),e.removeEventListener("pointercancel",y),e.removeEventListener("keydown",m)}}var xn="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var W="ytmd-sync-queue",dt="ytmd-sync-queue-styles",De="data-ytmd-sync-queue",de="data-ytmd-sync-queue-tab",Xi="M8 5v14l11-7z",Zi="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",eo=/^[A-Za-z0-9_-]{11}$/;function Pn(e){if(typeof e!=="object"||e===null)return null;let t=e.serviceEndpoint?.queueAddEndpoint;if(typeof t!=="object"||t===null)return null;let{queueTarget:n,queueInsertPosition:i}=t;return{videoId:typeof n?.videoId==="string"&&eo.test(n.videoId)?n.videoId:null,next:i==="INSERT_AFTER_CURRENT_VIDEO"}}function to(e){return`
  html[${De}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${De}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(e)};
    font-size: 14px;
  }
  html[${de}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${W} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${de}] #${W} { display: block; }
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
`}function no(e){_();let t=document.getElementById(dt);if(!t)t=g("style",{id:dt}),document.head.appendChild(t);let n=to(e);if(t.textContent!==n)t.textContent=n}var Sn=".ytmd-sq-handle",io=".ytmd-sq-queued";function kn(e){let t=g("div",{className:"ytmd-sq-row"}),n=g("img",{className:"ytmd-sq-thumb"});n.alt="",n.loading="lazy",n.src=`https://i.ytimg.com/vi/${e.videoId}/default.jpg`;let i=g("div",{className:"ytmd-sq-text"});if(i.append(g("span",{className:"ytmd-sq-title",text:e.title}),g("span",{className:"ytmd-sq-sub",text:e.sub})),e.handle)t.appendChild(e.handle);if(t.append(n,i),e.actions.length){let o=g("div",{className:"ytmd-sq-actions"});o.append(...e.actions),t.appendChild(o)}return t}function En(e,t,n){let i=A({label:e,iconPath:t,muted:!0});return i.addEventListener("click",(o)=>{o.stopPropagation(),n()}),i}function _n(e,t,n){let i=u(),o=[];if(t.nowPlaying)o.push(g("div",{className:"ytmd-sq-heading",text:i.syncQueueNowPlaying})),o.push(kn({...t.nowPlaying,sub:t.nowPlaying.artist,actions:[]}));if(o.push(g("div",{className:"ytmd-sq-heading",text:i.syncQueueTitle})),t.queue.length===0)o.push(g("p",{className:"ytmd-sq-hint",text:q(t.myRole)?i.syncQueueEmpty:i.syncQueueListenerHint}));let r=t.myRole==="host"||t.myRole==="moderator";for(let a of t.queue){let s=[];if(q(t.myRole))s.push(En(i.syncQueuePlayNow(a.title),Xi,()=>n.play(a.id)));if(r||a.added_by_id===t.myId)s.push(En(i.syncQueueRemove(a.title),Zi,()=>n.remove(a.id)));let c;if(q(t.myRole)&&t.queue.length>1)c=A({label:i.syncQueueDrag(a.title),iconPath:xn,muted:!0}),c.classList.add("ytmd-sq-handle"),c.dataset.itemId=a.id;let d=i.syncQueueFrom(a.added_by),l=kn({videoId:a.video_id,title:a.title,sub:a.artist?`${a.artist} · ${d}`:d,actions:s,handle:c});l.classList.add("ytmd-sq-queued"),o.push(l)}e.replaceChildren(...o),Tn(e,Sn)}var K=null;function Ve(){let e=document.documentElement;if(!K){e.removeAttribute(de);return}let t=document.querySelector("ytmusic-player-page #side-panel"),n=document.getElementById(W);if(t&&n?.parentElement!==t){if(!n)n=g("div",{id:W}),wn({list:n,rowSelector:io,handleSelector:Sn,onMove:(o,r,a)=>K?.actions.move(a,r)});n.setAttribute("role","region"),n.setAttribute("aria-label",u().syncQueueTitle),_n(n,K.model,K.actions),t.insertBefore(n,t.querySelector(":scope > #tab-renderer"))}let i=document.querySelector("ytmusic-player-page tp-yt-paper-tab");e.toggleAttribute(de,!!n?.isConnected&&i?.getAttribute("aria-selected")==="true")}function Cn(e,t){K={model:e,actions:t},no(u().syncQueueTab),document.documentElement.setAttribute(De,"");let n=document.getElementById(W);if(n)_n(n,e,t);Ve()}function ut(){K=null,document.documentElement.removeAttribute(De),document.documentElement.removeAttribute(de),document.getElementById(W)?.remove(),document.getElementById(dt)?.remove()}function J(e){if(e.is_host)return"host";let t=e.members.find((n)=>n.id===e.current_user_id);return t?bn(t):"dj"}function oo(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var O=/^[A-Za-z0-9_-]{11}$/,ro=2,so=0.25,ao=0.05,lo=3,Mn=0.1,co=0.5,uo=1,mo=1000,po=1,In=5000,yo=4000,Ln=15000,go=3,fo=4000,An=1,ho=1e4,bo=5,vo=1e4,To=1.2;function Rn(e,t){return Number.isFinite(t)&&t>An?Math.min(e,t-An):e}function wo(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(O.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>co)i.seekTo=Rn(e.current_time_secs,t.duration);return i}let o=e.current_time_secs+Math.min(uo,Math.max(0,n)),r=o-t.currentTime;if(Math.abs(r)>ro)i.seekTo=Rn(o,t.duration);else if(Math.abs(r)>(t.correcting?ao:so))i.playbackRate=1+Math.max(-Mn,Math.min(Mn,r/lo));return i}class Nn{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function xo(e,t){return t!==null&&e<t&&t-e<vo}function Dn(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var ko=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function Vn(){return new URLSearchParams(window.location.search).get("v")}function qe(e){let t=document.getElementById("movie_player"),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&O.test(n)&&typeof i==="number"&&Number.isFinite(i))return{videoId:n,currentTime:i};return{videoId:Vn(),currentTime:e?e.currentTime:0}}function mt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function pt(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class qn{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor(e=w){this.notify=e}lastBroadcast=null;pendingNav=null;transit=new Nn;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;finished=null;rateCorrection=null;setRoomState(e,t,n=!0){let i=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,this.canControl=n,kt(this.isGuest()),!i)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||mt())return;if(xo(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(O.test(e.video_id))this.hostVideoId=e.video_id;let o=this.requestedVideo;if(o){if(e.video_id!==o.videoId&&n-o.atMs<yo)return;this.requestedVideo=null}let r=qe(t);if(this.waitingForHostsNext(e,r.videoId,t,n)){this.endRateCorrection(),v.pause();return}let a={videoId:r.videoId,paused:t?t.paused:!0,currentTime:r.currentTime,duration:t?t.duration:NaN,correcting:this.rateCorrection!==null},s=wo(e,a,i);if(s.navigateTo){this.endRateCorrection();let c=this.pendingNav;if(c&&c.videoId===s.navigateTo&&n-c.atMs<In)return;let d=c&&c.videoId===s.navigateTo?c.attempts+1:1;if(this.pendingNav={videoId:s.navigateTo,atMs:n,attempts:d},this.rememberOwnNav(s.navigateTo,n),v.pause(),d>1)window.location.href=`https://music.youtube.com/watch?v=${s.navigateTo}`;else pt(s.navigateTo);return}if(this.pendingNav=null,!t)return;if(s.setPlaying===!0)v.play();else if(s.setPlaying===!1)v.pause();if(s.seekTo!==null)this.endRateCorrection(),v.seekTo(s.seekTo);else this.setCatchUpRate(t,s.playbackRate)}waitingForHostsNext(e,t,n,i){let o=this.finished;return!!o&&e.video_id===o.videoId&&i-o.atMs<ho&&o.duration-e.current_time_secs<bo&&(t!==o.videoId||!!n?.ended)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>Ln)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;if(Number.isFinite(e.duration)&&e.duration>0&&e.duration-e.currentTime<go){this.nearEndAtMs=t;let{videoId:n}=qe(e);if(n)this.finished={videoId:n,duration:e.duration,atMs:t}}}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!this.canControl||!e||!O.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<Ln)return null;if(t-this.nearEndAtMs<fo)return null;if(this.requestedVideo?.videoId===e)return null;return this.requestedVideo={videoId:e,atMs:t},{kind:"play_video",video_id:e}}requestControl(e,t){if(!this.canControl){if(e.kind!=="next"){this.notify(u().syncListenerOnly);return}t("vote_sync_skip").then(()=>this.notify(u().syncVotedSkip)).catch((n)=>{console.error("[YTMD Room Sync] vote failed:",n),this.notify(u().actionFailed)});return}t("send_sync_control",{action:e}).catch((n)=>{console.error("[YTMD Room Sync] control request failed:",n),this.notify(u().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n,source:i}=e,o=i?.kind==="vote"?u().syncVoteSkipped:i?.kind==="queue"?u().syncFromQueue(i.title,t):null;switch(n.kind){case"next":v.next(),this.notify(o??u().syncGuestNext(t));break;case"previous":v.previous(),this.notify(o??u().syncGuestPrevious(t));break;case"set_playing":{let r=v.getVideo();if(!r||r.paused!==n.playing)return;if(n.playing)v.play();else v.pause();this.notify(o??(n.playing?u().syncGuestResumed(t):u().syncGuestPaused(t)));break}case"play_video":if(!O.test(n.video_id)||n.video_id===Vn())return;pt(n.video_id),this.notify(o??u().syncGuestPicked(t));break}}advanceQueue(e,t,n){if(!t||mt())return;let i=t.duration-t.currentTime;if(!Number.isFinite(i)||i>To&&!t.ended)return;this.playNextFromQueue(e,n,t,!1)}playNextFromQueue(e,t,n=v.getVideo(),i=!0,o=Date.now()){if(!this.inRoom||!this.isHost||e===0)return!1;let{videoId:r}=qe(n),a=this.queueAdvance;if(a&&a.from===r&&o-a.atMs<In)return!0;this.queueAdvance={from:r,atMs:o};let s=()=>{if(i)v.nextInYtm()};return t("sync_queue_take_next").then((c)=>{let d=c;if(!d||!O.test(d.video_id)){s();return}v.pause(),pt(d.video_id),this.notify(u().syncFromQueue(d.title,d.added_by))}).catch((c)=>{console.error("[YTMD Room Sync] playing from the shared queue failed:",c),s()}),!0}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||mt())return;if(t.ended)return;let{videoId:o,currentTime:r}=qe(t);if(!o)return;let a=Date.now(),s=this.lastBroadcast,c=s?s.position+(a-s.atMs)/1000*s.rate:0,d=!!s&&s.playing&&!t.paused&&Math.abs(r-c)>po,l=!!s&&s.videoId!==o;if(!i&&!d&&!l&&s&&a-s.atMs<mo)return;this.lastBroadcast={atMs:a,videoId:o,position:r,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:o,title:e.title,artist:e.artist,current_time_secs:r,is_playing:!t.paused,timestamp_ms:a}}).catch((m)=>console.error("[YTMD Room Sync] broadcast failed:",m))}}var R=null,ue=null,ze=null,N=null,gt=null,Eo=1000;function zn(){let e=N,t=ue;if(!e||!t){ut();return}let n=gt,i=(o)=>(r)=>{t(o,{itemId:r}).catch((a)=>{console.error(`[YTMD Room Sync] ${o} failed:`,a),w(u().actionFailed)})};Cn({queue:e.queue??[],nowPlaying:n?.videoId&&O.test(n.videoId)?{videoId:n.videoId,title:n.title,artist:n.artist}:null,myId:e.current_user_id,myRole:J(e)},{play:i("sync_queue_play"),remove:i("sync_queue_remove"),move:(o,r)=>{t("sync_queue_move",{itemId:o,toIndex:r}).catch((a)=>{console.error("[YTMD Room Sync] sync_queue_move failed:",a),w(u().actionFailed)})}})}function Po(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function So(e,t){if(!N||!q(J(N))){w(u().syncQueueListenerNo);return}if(!e.videoId){w(u().syncQueueSongsOnly);return}t("sync_queue_add",{input:e.videoId,next:e.next}).then(()=>w(e.next?u().syncQueuedNext:u().syncQueued)).catch((n)=>{console.error("[YTMD Room Sync] adding to the shared queue failed:",n),w(u().actionFailed)})}function Hn(e){let t=R;if(!t||!ue||!t.isGuest())return!1;let n=v.getVideo(),i=Dn(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,ue),!0}function yt(e,t,n="left"){let i=N;if(N=e,ct(e?{roomCode:e.room_code,listeners:e.members.length,isHost:e.is_host}:null),zn(),!t)return;if(!e){if(!i)return;w(n==="kicked"?u().syncKicked:n==="lost"?u().syncLost:u().syncRoomClosed);return}if(!i||i.room_code!==e.room_code){if(!e.is_host)w(u().syncConnected);return}if(e.reconnecting){if(!i.reconnecting)w(u().syncReconnecting);return}let o=(m)=>m.members.find((y)=>y.is_host)?.id;if(o(i)!==o(e)){let m=e.members.find((y)=>y.is_host);if(e.is_host)w(u().syncYouHost);else if(m)w(u().syncNewHost(m.nickname));return}if(i.reconnecting)return;let{joined:r,left:a}=oo(i.members,e.members,e.current_user_id),s=[...r.map(u().syncJoined),...a.map(u().syncLeft)],c=e.skip_votes??[],d=c.filter((m)=>m!==e.current_user_id&&!(i.skip_votes??[]).includes(m));for(let m of d){let y=e.members.find((f)=>f.id===m)?.nickname;if(y)s.push(u().syncVoteProgress(y,c.length,vn(e.members.length)))}let l=J(e);if(l!==J(i))s.push(l==="moderator"?u().syncRoleModerator:l==="listener"?u().syncRoleListener:u().syncRoleDj);if(s.length>0)w(s.join(" · "))}var On={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new qn;R=t,ue=e.invoke;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(r)=>{t.setRoomState(!0,r.payload.is_host,q(J(r.payload))),yt(r.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",(r)=>{t.setRoomState(!1,!1),yt(null,!0,r.payload?.reason??"left")}),window.__TAURI__.event.listen("sync-playback-remote",(r)=>{t.handleRemotePlayback(r.payload,e.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(r)=>{t.applyRemoteControl(r.payload)}),window.__TAURI__.event.listen("sync-reaction",(r)=>{Ot(r.payload.emoji,r.payload.from)}));let i=(r)=>{if(!(r.target instanceof Element))return;let a=r.target;if(a.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(Ve,0);if(t.isInRoom()){let l=a.closest("ytmusic-menu-service-item-renderer"),m=l?Pn(l.data):null;if(m){r.preventDefault(),r.stopImmediatePropagation(),Po(),So(m,e.invoke);return}}if(!r.isTrusted)return;if(t.isRoomHost()&&a.closest("ytmusic-player-bar .next-button")&&t.playNextFromQueue(N?.queue?.length??0,e.invoke)){r.preventDefault(),r.stopImmediatePropagation();return}if(!t.isGuest())return;let s=ko.find(([l])=>a.closest(l));if(!s)return;let c=e.getVideoElement(),d=Dn(s[1],c?c.paused:!0);if(!d)return;r.preventDefault(),r.stopImmediatePropagation(),t.requestControl(d,e.invoke)};window.addEventListener("click",i,!0);let o=setInterval(Ve,Eo);$e(()=>t.playNextFromQueue(N?.queue?.length??0,e.invoke)),e.invoke("get_sync_room_state").then((r)=>{if(R!==t||!r||typeof r!=="object")return;let a=r;if(t.setRoomState(!0,a.is_host,q(J(a))),yt(a,!1),!a.is_host&&a.playback_state)t.handleRemotePlayback(a.playback_state,e.getVideoElement())}).catch((r)=>console.error("[YTMD Room Sync] failed to restore room state:",r)),ze=()=>{n.forEach((r)=>r.then((a)=>a())),window.removeEventListener("click",i,!0),clearInterval(o),$e(null),t.setRoomState(!1,!1),R=null,ue=null,N=null,gt=null,ct(null),ut()}},onTrackChange(e,t){let n=R;if(!n)return;gt=e,zn(),n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){R?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();R?.broadcastLocalState(t.track,n,t.invoke),R?.noteLocalTick(n),R?.advanceQueue(N?.queue?.length??0,n,t.invoke)},onDestroy(){if(ze)ze(),ze=null}};var He=null,_o=(e,t)=>t&&e!==!1,Bn={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,o=(y)=>{if(n===y)return;n=y,e.invoke("set_inhibit_sleep",{inhibit:y}).catch((f)=>{n=!y,console.error("[YTMD Power] set_inhibit_sleep failed:",f)})},r=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},a=()=>{t?.release().catch(()=>{}),t=null},s=()=>{let y=e.getVideoElement(),f=!!y&&!y.paused&&!y.ended,p=_o(e.config.inhibit_sleep,f);if(o(p),p)r();else a()},c=(y)=>{for(let f of["play","playing","pause","ended"])y.addEventListener(f,s);i=y},d=(y)=>{for(let f of["play","playing","pause","ended"])y.removeEventListener(f,s)},l=e.getVideoElement();if(l)c(l);s();let m=window.setInterval(()=>{let y=e.getVideoElement();if(y&&y!==i){if(i)d(i);c(y),s()}},1000);He=()=>{if(clearInterval(m),i)d(i);i=null,a(),o(!1)}},onDestroy(){if(He)He(),He=null}};var Yn={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>ft(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},Co=`
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
`;function Mo(){if(document.getElementById("ytmd-qr-styles"))return;let e=document.createElement("style");e.id="ytmd-qr-styles",e.textContent=Co,document.head.appendChild(e)}async function ft(e){Mo();let t=g("p",{text:u().remoteBody,style:"margin: 0;"}),n=g("div",{className:"ytmd-qr-frame",text:u().remoteLoading}),i=g("div",{className:"ytmd-qr-url"}),o=Bt({id:"ytmd-remote-modal",title:u().remoteTitle,body:[t,n,i],actions:[{label:u().close}]});try{let r=await e.invoke("get_remote_info");if(!n.isConnected)return;if(r?.qr_svg){let a=g("img");a.src=`data:image/svg+xml;utf8,${encodeURIComponent(r.qr_svg)}`,a.alt=u().remoteTitle,n.replaceChildren(a)}else n.textContent=u().remoteUnavailable;if(r?.url)i.textContent=r.url}catch(r){if(console.error("[YTMD Remote] Error fetching remote info:",r),n.isConnected)n.textContent=u().remoteUnavailable}return o}function Io(e,t){if(!t||typeof t!=="object"||!("ok"in t))throw Error(`Malformed response to ${e}`);let n=t;if(!n.ok)throw Error(n.error||`${e} failed`);return n.data??null}var Lo=8000,me=(e,t={},n={})=>new Promise((i,o)=>{let r=window.__TAURI__;if(!r?.event?.emit){o(Error("Tauri bridge unavailable"));return}let a=Math.random().toString(36).slice(2)+Date.now().toString(36),s=null,c=setTimeout(()=>{if(s)s();o(Error(`Timed out waiting for ${e}`))},n.timeoutMs??Lo);r.event.listen(`ytmd-response-${a}`,(d)=>{if(clearTimeout(c),s)s();try{i(Io(e,d.payload))}catch(l){o(l)}}).then((d)=>(s=d,r.event.emit("ytmd-invoke",{id:a,cmd:e,args:t}))).catch((d)=>{clearTimeout(c),o(d instanceof Error?d:Error(String(d)))})});var Fn=null,pe=null,X=(e)=>{me(e).catch((t)=>{console.error(`[YTMD] ${e} failed:`,t),w(u().actionFailed)})};function Ao(){gn({onSyncChipClick:()=>X("toggle_sync_window"),items:[{id:"settings",iconPath:x.tune,label:u().menuSettings,hint:"Ctrl+,",onSelect:()=>X("toggle_settings_window")},{id:"local",iconPath:x.folderMusic,label:u().menuLocal,onSelect:()=>X("toggle_local_library_window")},{id:"sync",iconPath:x.group,label:u().menuSync,onSelect:()=>X("toggle_sync_window")},{id:"remote",iconPath:x.phone,label:u().menuRemote,onSelect:()=>{if(pe)ft(pe)}},{id:"mini",iconPath:x.miniPlayer,label:u().menuMiniPlayer,onSelect:()=>X("toggle_mini_player")},{id:"download",iconPath:x.download,label:u().menuDownload,dividerBefore:!0,onSelect:()=>{if(pe)st(pe,Fn)}}]})}var Ro={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function $n(e){let t={};for(let[n,[i,o]]of Object.entries(Ro)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}async function Un(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};Ao(),lt();let t=setInterval(lt,1000);window.addEventListener("pagehide",()=>clearInterval(t));try{let l=await me("get_config");if(l&&typeof l==="object")Object.assign(e,l)}catch(l){console.error("[YTMD] Failed to load config, using defaults:",l)}let n={track:null,config:e,invoke:me,sendPlayerCommand:(l)=>{c(l)},getVideoElement:()=>v.getVideo()};pe=n;let i=new Ue(n);i.register(At),i.register(Rt),i.register(jt),i.register(Jt),i.register(Xt),i.register(Zt),i.register(en),i.register(on),i.register(an),i.register(ln),i.register(cn),i.register(dn),i.register(On),i.register(Bn),i.register(Yn);try{await i.initAll($n(e))}catch(l){console.error("[YTMD] Registry init error:",l)}let o=new Oe,r=0,a=Date.now();async function s(l,m,y){try{await me("update_track_info",{track:{title:l.title,artist:l.artist,album:l.album||null,cover_url:l.coverUrl||null,duration_secs:Math.round(l.durationSecs||0),current_time_secs:Math.round(m),is_playing:y,video_id:l.videoId||null,sampled_at_ms:Date.now()}})}catch(f){console.error("[YTMD] Failed to sync track info to backend:",f)}}o.onTrackChange(async(l)=>{Fn=l,r=l.currentTimeSecs||0,a=Date.now(),i.handleTrackChange(l),await s(l,l.currentTimeSecs||0,l.isPlaying)}),o.onPlaybackChange(async(l)=>{i.handlePlaybackChange(l);let m=o.getCurrentTrack();if(m)m.isPlaying=l,r=m.currentTimeSecs||0,a=Date.now(),await s(m,m.currentTimeSecs||0,l)}),o.onTick((l)=>{i.handleTick(l);let m=o.getCurrentTrack();if(!m||!m.isPlaying)return;let y=Date.now(),f=(y-a)/1000,p=r+f;if(Math.abs(l-p)>2||f>=15)r=l,a=y,m.currentTimeSecs=Math.round(l),s(m,l,!0)});function c(l){if(Hn(l))return;switch(l){case"play":v.play();break;case"pause":v.pause();break;case"play_pause":v.playPause();break;case"next":v.next();break;case"previous":v.previous();break;case"like":v.toggleLike();break;case"dislike":v.toggleDislike();break;case"mute":v.toggleMute();break}}let d=(l,m)=>{let y=window.__TAURI__;if(y?.event?.listen)y.event.listen(l,(f)=>m(f.payload))};d("player-command",(l)=>c(l)),d("tray-command",(l)=>c(l)),d("mpris-command",(l)=>c(l)),d("global-shortcut-event",(l)=>c(l)),d("player-seek",(l)=>v.seekTo(l)),d("mpris-command-seek",(l)=>v.seekTo(l)),d("player-volume",(l)=>v.setVolume(l)),d("config-updated",(l)=>{if(!l||typeof l!=="object")return;Object.assign(e,l);let m=$n(e);for(let[y,f]of Object.entries(m))if(f)i.enable(y).catch((p)=>console.error(`[YTMD] Failed to enable plugin ${y}:`,p));else i.disable(y).catch((p)=>console.error(`[YTMD] Failed to disable plugin ${y}:`,p))}),window.addEventListener("keydown",(l)=>{if(l.ctrlKey&&l.key===","||l.key==="F2")l.preventDefault(),X("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var No=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(No)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>Un());else Un();})();
