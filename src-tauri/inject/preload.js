function Ke(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}var Wt=400;function Qt(e,t){return e-t>=Wt}class xe{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&Qt(Date.now(),this.lastTickMs))this.emitTick(n.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",c=i?.album||"",s="";if(i?.artwork&&i.artwork.length>0){let y=i.artwork[i.artwork.length-1];if(y&&y.src)s=y.src}if(!o){let y=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(y)o=y.textContent?.trim()||""}if(!r){let y=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(y){let k=(y.textContent?.trim()||"").split("•").map((S)=>S.trim());if(r=k[0]||"",k.length>1)c=k[1]}}if(!s){let y=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(y&&y.src)s=y.src}if(s.startsWith("//"))s=`https:${s}`;if(s.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(s))s=s.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let a=new URLSearchParams(window.location.search).get("v")||void 0,d=0,u=0;if(t&&typeof t.getDuration==="function"){let y=t.getDuration();if(typeof y==="number"&&Number.isFinite(y)&&y>0)d=Math.floor(y)}if(t&&typeof t.getCurrentTime==="function"){let y=t.getCurrentTime();if(typeof y==="number"&&Number.isFinite(y)&&y>=0)u=Math.floor(y)}if(!d&&e&&Number.isFinite(e.duration)&&e.duration>0)d=Math.floor(e.duration);if(!u&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)u=Math.floor(e.currentTime);let g=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(g&&g.textContent){let y=g.textContent.split("/").map((T)=>T.trim());if(y.length===2){if(!u)u=Ke(y[0]);if(!d)d=Ke(y[1])}}if(!d){let T=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(T){let k=parseInt(T,10);if(!isNaN(k)&&k>0)d=k}}let h=e?!e.paused&&!e.ended:!1;if(!o)return null;return{title:o,artist:r||"Unknown Artist",album:c||void 0,coverUrl:s||void 0,durationSecs:d,currentTimeSecs:u,isPlaying:h,videoId:a}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&e.durationSecs>0||!this.currentTrack.coverUrl&&!!e.coverUrl||!this.currentTrack.album&&!!e.album||!this.currentTrack.videoId&&!!e.videoId),i=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t||n){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((o)=>o(e))}if(i)this.onPlaybackChangeCallbacks.forEach((o)=>o(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}class f{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class Pe{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var X=null,L={adWasShowing:!1,preAdMuted:!1},Ee=new WeakSet,O=null,et=null,Se=0,U=!0,Jt=1000,Xt=(e,t,n)=>e-t>=n,Zt=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",en="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",tn=300,nn=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,on=`
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
`,rn=nn+on,an=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],sn=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],ln=(e)=>an.some((t)=>e.includes(t)),cn=(e,t)=>{let n=t.split("."),i=e;for(let r=0;r<n.length-1;r++){if(i===null||typeof i!=="object")return!1;i=i[n[r]]}let o=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,o))return delete i[o],!0;return!1},_e=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of sn)if(cn(e,n))t=!0;return t},dn=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},We=!1,un=()=>{if(We)return;We=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let o=await t(...i);if(!U||!ln(dn(i[0])))return o;let r;try{r=await o.clone().json()}catch{return o}if(!_e(r))return o;let c=new Headers(o.headers);return c.delete("content-length"),c.delete("content-encoding"),new Response(JSON.stringify(r),{status:o.status,statusText:o.statusText,headers:c})};window.fetch=Object.assign(n,e)},Qe=!1,mn=()=>{if(Qe)return;Qe=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(U)_e(n);return n}},Je=!1,pn=()=>{if(Je)return;Je=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(U)_e(t);e=t}})};if(typeof window<"u")un(),mn(),pn();var yn=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},gn=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},Me=()=>document.getElementById("movie_player"),fn=()=>{let e=Me();if(!e)return!1;return yn(e.classList)},Ce=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=gn(fn(),L,t.muted);if(L=n,i!==null)t.muted=i},Xe=(e)=>{if(Ee.has(e))return;Ee.add(e),e.click()},Z=()=>{document.querySelectorAll(Zt).forEach(Xe),document.querySelectorAll(en).forEach((e)=>{let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)Xe(t)})},Ze=(e)=>{let t=Me();if(et=t,!t)return;O?.disconnect(),O=new MutationObserver(()=>{Ce(e),Z()}),O.observe(t,{attributes:!0,attributeFilter:["class"]})},tt={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){U=!0,L={adWasShowing:!1,preAdMuted:!1},Ee=new WeakSet,Se=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=rn,document.head.appendChild(t);let n=null,i=new MutationObserver(()=>{if(n!==null)return;n=setTimeout(()=>{n=null,Z()},tn)});i.observe(document.body,{childList:!0,subtree:!0}),Ze(e),Z(),Ce(e),X=()=>{if(U=!1,O?.disconnect(),O=null,i.disconnect(),n!==null)clearTimeout(n);document.getElementById("ytmd-adblock-styles")?.remove();let o=e.getVideoElement();if(o&&L.adWasShowing)o.muted=L.preAdMuted;L={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(Me()!==et)Ze(t);Ce(t);let n=Date.now();if(Xt(n,Se,Jt))Se=n,Z()},onDestroy(){if(X)X(),X=null}};var A=[],ee="",Ie=new Set,hn=(e,t)=>e===t,nt={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){A=[],ee="",Ie=new Set},onTrackChange(e){if(!e.videoId||e.videoId===ee)return;let t=e.videoId;ee=t,A=[],Ie=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(o)=>{if(!o.ok)return;let r=await o.json();if(!hn(t,ee))return;A=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!A||A.length===0)return;let n=Ie;for(let i of A){let[o,r]=i.segment;if(e>=o&&e<r-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let c=t.getVideoElement();if(c)c.currentTime=r,n.add(i.UUID);break}}}};function it(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function p(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var ot="ytmd-kit-styles",bn=`
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

  @media (prefers-reduced-motion: reduce) {
    .ytmd-menu, .ytmd-toast, .ytmd-toast.ytmd-leaving, .ytmd-scrim { transition: none; animation: none; }
  }
`;function R(){if(document.getElementById(ot))return;let e=document.createElement("style");e.id=ot,e.textContent=bn,(document.head||document.documentElement).appendChild(e),vn()}var b={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function q(e,t=24){return it(e,t,t)}function D(e){let t=p("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(q(e.iconPath)),t}function st(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(q(t))}function lt(e,t){let n=e.querySelector("svg.ytmd-progress-ring");if(t===null){n?.remove();return}let i=17,o=2*Math.PI*i;if(!n){n=document.createElementNS("http://www.w3.org/2000/svg","svg"),n.setAttribute("class","ytmd-progress-ring"),n.setAttribute("viewBox","0 0 36 36");for(let s of["ytmd-progress-track","ytmd-progress-value"]){let l=document.createElementNS("http://www.w3.org/2000/svg","circle");l.setAttribute("class",s),l.setAttribute("cx","18"),l.setAttribute("cy","18"),l.setAttribute("r",String(i)),l.setAttribute("stroke-dasharray",String(o)),n.appendChild(l)}e.appendChild(n)}let r=Math.max(0,Math.min(1,t));n.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(o*(1-r)))}var rt=!1;function vn(){if(rt)return;rt=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},o=(s)=>{let l=s.dataset.ytmdTooltip;if(!l)return;if(!e)e=p("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=l;let a=s.getBoundingClientRect(),d=e.getBoundingClientRect(),g=a.bottom+8+d.height<window.innerHeight?a.bottom+8:a.top-8-d.height,h=Math.max(8,Math.min(window.innerWidth-d.width-8,a.left+a.width/2-d.width/2));e.style.top=`${g}px`,e.style.left=`${h}px`,e.classList.add("ytmd-open")},r=(s)=>{let l=s.target?.closest?.("[data-ytmd-tooltip]");if(!l||l===n)return;i(),n=l,t=setTimeout(()=>o(l),250)},c=(s)=>{let l=s.relatedTarget;if(n&&l&&n.contains(l))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",c,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var _=null;function w(e,t={}){R();let n=document.getElementById("ytmd-toast-host");if(!n)n=p("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),r=o?i:p("div",{className:"ytmd-toast"});if(t.id)r.dataset.toastId=t.id;let s=[p("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:a,onClick:d}=t.action,u=p("button",{className:"ytmd-button",text:a});u.type="button",u.addEventListener("click",()=>{at(),d()}),s.push(u)}if(r.replaceChildren(...s),!o)n.replaceChildren(r);if(_!==null)clearTimeout(_);_=null;let l=t.durationMs??4000;if(l>0)_=setTimeout(at,l)}function at(){if(_!==null)clearTimeout(_);_=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function ct(e){R(),document.getElementById(e.id)?.remove();let t=p("div",{id:e.id,className:"ytmd-scrim"}),n=p("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=p("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),r=p("div",{className:"ytmd-dialog-body"});if(e.body)r.append(...e.body);let c=document.activeElement,s=()=>{document.removeEventListener("keydown",l,!0),t.remove(),c?.focus?.()},l=(d)=>{if(d.key==="Escape")d.stopPropagation(),s()};document.addEventListener("keydown",l,!0),t.addEventListener("click",(d)=>{if(d.target===t)s()});let a=p("div",{className:"ytmd-dialog-actions"});for(let d of e.actions){let u=p("button",{className:`ytmd-button${d.filled?" ytmd-button--filled":""}`,text:d.label});u.type="button",u.addEventListener("click",()=>d.onClick?d.onClick(s):s()),a.appendChild(u)}return n.append(o,r,a),t.appendChild(n),document.body.appendChild(t),a.querySelector("button")?.focus(),{close:s,body:r}}var dt={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",downloadNoTrack:"Play a song first to download it",downloadStarted:(e)=>`Downloading “${e}”`,downloadDone:(e)=>`Downloaded “${e}”`,downloadFailed:(e)=>`Download failed: ${e}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:"Source: LRCLIB",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again."},Tn={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:(e)=>`Pobieranie: „${e}”`,downloadDone:(e)=>`Pobrano: „${e}”`,downloadFailed:(e)=>`Nie udało się pobrać: ${e}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:"Źródło: LRCLIB",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie."},kn={en:dt,pl:Tn};function wn(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return kn[t]??dt}var Le=null;function m(){if(!Le){let e=typeof document<"u"?document.documentElement.lang:"";Le=wn(e||(typeof navigator<"u"?navigator.language:"en"))}return Le}var x=[],G=-1,j=null,P="",te=null,F="",ut=(e,t)=>e===t,yt={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){x=[],G=-1,j=null,P="",F="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
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
    `,document.head.appendChild(t),R();let n=()=>{ne(),pt(e)},i=()=>{setTimeout(()=>{ne(),Re()},50),setTimeout(()=>{Re()},250)};document.addEventListener("click",i,!0);let o=window.setInterval(n,600);n(),te=()=>{clearInterval(o),document.removeEventListener("click",i,!0),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((c)=>c.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(P===n&&x.length>0||F===n)return;P=n,F=n,x=[],G=-1,j=null,ne();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:m().lyricsLoading}));try{let o=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!ut(n,P))return;if(j=o,o?.syncedLyrics)x=In(o.syncedLyrics);ne(),pt(t),bt(t)}catch{if(!ut(n,P))return;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:m().lyricsNone}))}finally{if(F===n)F=""}},onTick(e){if(!x||x.length===0)return;let t=ie(P),n=e+t,i=-1;for(let o=0;o<x.length;o++)if(n>=x[o].timeSecs)i=o;else break;if(i!==G&&i>=0){G=i;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o){let r=o.querySelectorAll(".ytmd-native-lyric-line");r.forEach((s,l)=>{if(l===i)s.classList.add("active");else s.classList.remove("active")});let c=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(c&&Cn(c)){let s=r[i];if(s)s.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(te)te(),te=null}},gt="ytmd-lyrics-offsets",xn=500;function ft(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function Pn(e){try{let t=e?.getItem(gt);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function Sn(e,t,n,i){if(e.delete(t),n!==0)e.set(t,n);while(e.size>xn){let o=e.keys().next().value;if(o===void 0)break;e.delete(o)}try{i?.setItem(gt,JSON.stringify([...e]))}catch{}}var Ae=null;function ht(){if(!Ae)Ae=Pn(ft());return Ae}function ie(e){return ht().get(e)||0}function En(e,t){Sn(ht(),e,t,ft())}function mt(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function Cn(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function _n(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function ne(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(_n(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function Mn(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function Re(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=Mn();e.style.setProperty("display",t?"flex":"none","important")}function pt(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=p("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),bt(e)}Re()}function bt(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(x&&x.length>0){let n=ie(P),i=p("span",{className:"ytmd-lyrics-offset-value",text:mt(n)}),o=(s)=>{let l=s===null?0:Math.round((ie(P)+s)*10)/10;En(P,l),i.textContent=mt(l)},r=(s,l,a)=>{let d=p("button",{className:"ytmd-chip",text:s});return d.type="button",d.dataset.ytmdTooltip=l,d.setAttribute("aria-label",l),d.addEventListener("click",a),d},c=p("div",{className:"ytmd-native-lyrics-footer"});c.append(p("span",{className:"ytmd-lyrics-source",text:m().lyricsSource}),p("span",{text:m().lyricsOffset}),r("−0.5 s",m().lyricsLater,()=>o(-0.5)),i,r("+0.5 s",m().lyricsEarlier,()=>o(0.5)),r(m().lyricsReset,m().lyricsReset,()=>o(null))),t.replaceChildren(...x.map((s,l)=>{let a=p("div",{className:`ytmd-native-lyric-line${l===G?" active":""}`,text:s.text});return a.addEventListener("click",()=>{let d=e.getVideoElement();if(d){let u=ie(P);d.currentTime=Math.max(0,s.timeSecs-u)}}),a}),c)}else if(j?.plainLyrics){let n=j.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>p("div",{className:"ytmd-native-lyric-line ytmd-plain",text:i})),p("div",{className:"ytmd-native-lyrics-footer",text:m().lyricsSource}))}else t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:m().lyricsNone}))}function In(e){let t=e.split(`
`),n=[],i=0,o=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,r=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let c of t){let s=c.trim();if(!s)continue;let l=r.exec(s);if(l){let u=parseInt(l[1],10);if(!isNaN(u))i=u/1000;continue}let a=[],d;o.lastIndex=0;while((d=o.exec(s))!==null){let u=parseInt(d[1],10),g=parseInt(d[2],10),h=0;if(d[3])h=parseInt(d[3].padEnd(3,"0").slice(0,3),10);a.push(u*60+g+h/1000)}if(a.length>0){let u=s.replace(o,"").trim();if(u)for(let g of a)n.push({timeSecs:Math.max(0,g-i),text:u})}}return n.sort((c,s)=>c.timeSecs-s.timeSecs)}var oe=null,vt={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let i=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!i)return;let o=i.getBoundingClientRect();if(n.clientX>=o.left&&n.clientX<=o.right&&n.clientY>=o.top&&n.clientY<=o.bottom){n.preventDefault();let r=e.getVideoElement();if(r){let c=e.config.wheel_volume_step||0.05,s=n.deltaY<0?c:-c,l=Math.max(0,Math.min(1,r.volume+s));r.volume=l}}};window.addEventListener("wheel",t,{passive:!1}),oe=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(oe)oe(),oe=null}};var Tt={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var re=null,kt={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);re=()=>{t?.remove()}},onDestroy(){if(re)re(),re=null}};var ae=[32,64,125,250,500,1000,2000,4000,8000,16000],De={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function K(e){return Math.max(-12,Math.min(12,e))}function Ln(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function An(e){return Math.max(0.5,Math.min(2,e))}class v{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=ae.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!v.instance)v.instance=new v;return v.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=ae.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===ae.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=K(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=K(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=K(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,K(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=De[e]||De.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),Ln(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=An(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??f.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class Ne{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)v.getInstance().fadeIn(this.crossfadeSeconds);else v.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),v.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),v.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),f.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class Ve{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=v.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,f.next()}else this.consecutiveSilentTicks=0}}var M=null,N=null,se=null;function Rn(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var wt={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=v.getInstance(),n=new Ne,i=new Ve;M=n,N=i;let o=e.config,r=null,c=()=>{if(r!==null)return;let l=e.getVideoElement();if(l){if(!t.isInitializedFor(l))t.init(l);return}r=window.setInterval(()=>{let a=e.getVideoElement();if(a){if(r!==null)clearInterval(r);r=null,t.init(a)}},500)};if(Rn(o))c();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let s=[];if(window.__TAURI__?.event){let{listen:l}=window.__TAURI__.event;s.push(l("set-eq-band",(a)=>{c(),t.setBandGain(a.payload.bandIndex,a.payload.gain)}),l("set-eq-all",(a)=>{c(),t.setAllGains(a.payload.gains)}),l("set-eq-preset",(a)=>{c(),t.applyPreset(a.payload)}),l("set-preamp",(a)=>{c(),t.setPreamp(a.payload)}),l("set-loudness-normalization",(a)=>{if(a.payload)c();t.setLoudnessNormalization(a.payload)}),l("set-crossfade-seconds",(a)=>{if(a.payload>0)c();n.setCrossfadeSeconds(a.payload)}),l("set-skip-silence",(a)=>{if(a.payload)c();i.setEnabled(a.payload)}),l("set-playback-rate",(a)=>{t.setPlaybackRate(a.payload)}),l("set-preserves-pitch",(a)=>{t.setPreservesPitch(a.payload)}))}se=()=>{if(r!==null)clearInterval(r),r=null;s.forEach((l)=>l.then((a)=>a())),M?.destroy(),M=null,N=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(v.getInstance().applyRateAndPitch(),M)M.onTrackChange(e);if(N)N.onTrackChange()},onTick(e,t){if(M)M.onTick(e,t.track);if(N)N.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(se)se(),se=null}};var Be=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function xt(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let c=r.getImageData(0,0,16,16).data,s=0,l=0,a=0,d=0,u=0,g=0,h=0,y=0;for(let C=0;C<c.length;C+=4){let Te=c[C],ke=c[C+1],we=c[C+2];if(c[C+3]<128)continue;let je=(Te+ke+we)/3;if(je<20||je>240)continue;if(C<c.length/2)s+=Te,l+=ke,a+=we,d++;else u+=Te,g+=ke,h+=we,y++}if(d===0&&y===0){t(n);return}let T=d>0?Math.round(s/d):220,k=d>0?Math.round(l/d):38,S=d>0?Math.round(a/d):38,ve=y>0?Math.round(u/y):24,jt=y>0?Math.round(g/y):24,Kt=y>0?Math.round(h/y):27;t({primary:Be(T,k,S),secondary:Be(ve,jt,Kt),accent:Be(T+30,k+30,S+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var E=48,Dn=3,Nn=3,Vn=1.65,Bn=0.55;function Yn(e,t,n,i){let o=new Float32Array(e.length),r=(c,s,l)=>{let a=l?n:t,d=l?t:n;for(let u=0;u<a;u++)for(let g=0;g<4;g++)for(let h=0;h<d;h++){let y=0,T=0;for(let S=Math.max(0,h-i);S<=Math.min(d-1,h+i);S++){let ve=l?(u*t+S)*4+g:(S*t+u)*4+g;y+=c[ve],T++}let k=l?(u*t+h)*4+g:(h*t+u)*4+g;s[k]=y/T}};r(e,o,!0),r(o,e,!1)}function zn(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],c=e[i+2],s=0.2126*o+0.7152*r+0.0722*c;e[i]=(s+(o-s)*t)*n,e[i+1]=(s+(r-s)*t)*n,e[i+2]=(s+(c-s)*t)*n}}async function Pt(e,t=Bn){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=E,o.height=E;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,E,E);let c=r.getImageData(0,0,E,E);for(let s=0;s<Nn;s++)Yn(c.data,E,E,Dn);zn(c.data,Vn,t),r.putImageData(c,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var le=null,ce=null,de,St={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=p("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=p("img",{id:"ytmd-ambient-cover"});n.alt="";let i=p("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,c=document.createElement("style");c.id="ytmd-ambient-styles",c.textContent=`
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
    `,document.head.appendChild(c),le=(l)=>{if(t)t.style.opacity=String(l)};let s=[];if(window.__TAURI__?.event)s.push(window.__TAURI__.event.listen("set-ambient-intensity",(l)=>{le?.(l.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(l)=>{let a=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;le?.(l.payload?a:0)}));if(ce=()=>{s.forEach((l)=>l.then((a)=>a())),le=null,de=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===de)return;de=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await Pt(t):null;if(t!==de)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await xt(t||""),o=document.documentElement.style;o.setProperty("--ytmd-accent",i.accent),o.setProperty("--ytmd-accent-primary",i.primary),o.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(ce)ce(),ce=null}};var Et=`
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

`,Ct=`
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

`;var ue=null,_t={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let l=document.getElementById(s);if(!l){l=document.createElement("style"),l.id=s;let a=t();if(a)a.appendChild(l)}return l},i=(s)=>{let l=n("ytmd-active-theme");l.textContent=s?Et:Ct},o=(s)=>{let l=n("ytmd-custom-css");if(l)l.textContent=s};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let c=[];if(window.__TAURI__?.event)c.push(window.__TAURI__.event.listen("set-ambient-enabled",(s)=>{i(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{o(s.payload)}));ue=()=>{c.forEach((s)=>s.then((l)=>l()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(ue)ue(),ue=null}};var me=null,Mt={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=D({id:"ytmd-pip-btn",label:m().pipButton,iconPath:b.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(c){console.warn("[YTMD PiP] Could not enter PiP:",c),await e.invoke("toggle_mini_player").catch((s)=>console.error("[YTMD PiP] Mini player fallback failed:",s))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),me=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(me)me(),me=null}};function Hn(e){if(e.error)return"failed";if(e.output_path&&e.percent>=100)return"done";return"progress"}var ye="ytmd-download-btn",On=3000,V=new Map,Ye=new Set,ge=null,pe=null;function B(){let e=document.getElementById(ye);if(!e)return;let t=ge?.videoId,n=t?V.get(t):void 0;lt(e,n?Math.max(0.05,n.fraction):null),st(e,t&&Ye.has(t)?b.check:b.download),e.setAttribute("aria-disabled",t?"false":"true");let i=n?m().downloadInProgress:m().downloadButton;e.setAttribute("aria-label",i),e.dataset.ytmdTooltip=i}function ze(e,t){let n=V.get(e);if(!n)return;if(V.delete(e),t.ok)Ye.add(e),setTimeout(()=>{Ye.delete(e),B()},On),w(m().downloadDone(n.title),{id:`download-${e}`});else w(m().downloadFailed(t.reason),{id:`download-${e}`,durationMs:8000});B()}function Un(e){let t=V.get(e.video_id);if(!t)return;let n=Hn(e);if(n==="failed")ze(e.video_id,{ok:!1,reason:e.error||e.status});else if(n==="done")ze(e.video_id,{ok:!0});else t.fraction=e.percent/100,B()}function He(e,t){let n=t?.videoId;if(!t||!n){w(m().downloadNoTrack);return}if(V.has(n)){w(m().downloadInProgress);return}V.set(n,{title:t.title,fraction:0}),B(),w(m().downloadStarted(t.title),{id:`download-${n}`}),e.invoke("download_track",{request:{video_id:n,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:e.config.download_format||"mp3",embed_lyrics:e.config.embed_lyrics!==!1}}).catch((i)=>{console.error("[YTMD Downloader] Download failed:",i),ze(n,{ok:!1,reason:i instanceof Error?i.message:String(i)})})}var It={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){ge=e.track;let t=()=>{if(document.getElementById(ye))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!o)return;let r=D({id:ye,label:m().downloadButton,iconPath:b.download});r.addEventListener("click",()=>{if(r.getAttribute("aria-disabled")==="true")return;He(e,ge)}),o.appendChild(r),B()},n=window.setInterval(t,1000);t();let i=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(o)=>Un(o.payload)):null;pe=()=>{clearInterval(n),i?.then((o)=>o()),document.getElementById(ye)?.remove()}},onTrackChange(e){ge=e,B()},onDestroy(){if(pe)pe(),pe=null}};var Lt={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};var fe="ytmd-nav-slot",Oe="ytmd-menu-btn",Q="ytmd-menu",At="ytmd-sync-chip",Dt=[],W=null,Nt=null,Rt=!1,qn=`
  #${fe} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function $n(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=qn,document.head.appendChild(e)}function Fn(e){if(!e)return;return`${m().syncInRoom} · ${m().syncListeners(e.listeners)}`}function Vt(e){Dt=e.items,Nt=e.onSyncChipClick}function Ue(){if(document.getElementById(fe)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;R(),$n();let t=p("div",{id:fe}),n=D({id:Oe,label:m().menuLabel,iconPath:b.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),jn(n)}),t.appendChild(n),e.prepend(t),Bt(),Wn()}function qe(e){W=e,Bt();let t=document.getElementById(Q);if(t?.classList.contains("ytmd-open"))Yt(t)}function Bt(){let e=document.getElementById(fe);if(!e)return;let t=document.getElementById(At);if(!W){t?.remove();return}if(!t)t=p("button",{id:At,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>Nt?.()),e.prepend(t);let n=m().syncListeners(W.listeners);t.replaceChildren(p("span",{className:"ytmd-chip-dot"}),q(b.group,18),p("span",{text:n})),t.dataset.ytmdTooltip=`${m().syncInRoom} · ${W.roomCode}`,t.setAttribute("aria-label",`${m().syncInRoom}, ${n}`)}function Yt(e){let t=[];for(let n of Dt){if(n.dividerBefore)t.push(p("div",{className:"ytmd-menu-divider"}));let i=p("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=p("span",{className:"ytmd-menu-item-text"});o.appendChild(p("span",{text:n.label}));let r=n.id==="sync"?Fn(W):void 0;if(r)o.appendChild(p("span",{className:"ytmd-menu-item-sub",text:r}));if(i.append(q(n.iconPath),o),n.hint)i.appendChild(p("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{Y(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function Gn(){let e=document.getElementById(Q);if(!e)e=p("div",{id:Q,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",Kn),document.body.appendChild(e);return e}function jn(e){let t=Gn();if(t.classList.contains("ytmd-open")){Y();return}Yt(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function Y(){let e=document.getElementById(Q);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById(Oe);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function Kn(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),Y();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")Y()}function Wn(){if(Rt)return;Rt=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(Q);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(Oe)?.contains(n))return;Y()}),window.addEventListener("resize",Y)}function Qn(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var Jn=/^[A-Za-z0-9_-]{11}$/,Xn=1.5,Zn=1,ei=1000,ti=5000;function ni(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null};if(Jn.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;let o=Math.min(Zn,Math.max(0,(n-e.timestamp_ms)/1000)),r=e.is_playing?e.current_time_secs+o:e.current_time_secs;if(Math.abs(t.currentTime-r)>Xn)i.seekTo=r;return i}function ii(){return new URLSearchParams(window.location.search).get("v")}function zt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function oi(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class Ht{isHost=!1;inRoom=!1;lastBroadcastMs=0;pendingNav=null;setRoomState(e,t){if(this.inRoom=e,this.isHost=t,!e)this.pendingNav=null}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||zt())return;let n=Date.now(),i={videoId:ii(),paused:t?t.paused:!0,currentTime:t?t.currentTime:0},o=ni(e,i,n);if(o.navigateTo){let r=this.pendingNav;if(r&&r.videoId===o.navigateTo&&n-r.atMs<ti)return;let c=r&&r.videoId===o.navigateTo?r.attempts+1:1;if(this.pendingNav={videoId:o.navigateTo,atMs:n,attempts:c},c>1)window.location.href=`https://music.youtube.com/watch?v=${o.navigateTo}`;else oi(o.navigateTo);return}if(this.pendingNav=null,!t)return;if(o.setPlaying===!0)f.play();else if(o.setPlaying===!1)f.pause();if(o.seekTo!==null)f.seekTo(o.seekTo)}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t||zt())return;let o=Date.now();if(!i&&o-this.lastBroadcastMs<ei)return;this.lastBroadcastMs=o,n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:o}}).catch((r)=>console.error("[YTMD Room Sync] broadcast failed:",r))}}var z=null,he=null,Fe=null;function $e(e,t){let n=Fe;if(Fe=e,qe(e?{roomCode:e.room_code,listeners:e.members.length,isHost:e.is_host}:null),!t)return;if(!e){if(n)w(m().syncRoomClosed);return}if(!n||n.room_code!==e.room_code){if(!e.is_host)w(m().syncConnected);return}let{joined:i,left:o}=Qn(n.members,e.members,e.current_user_id),r=[...i.map(m().syncJoined),...o.map(m().syncLeft)];if(r.length>0)w(r.join(" · "))}var Ot={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Ht;z=t;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(i)=>{t.setRoomState(!0,i.payload.is_host),$e(i.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1),$e(null,!0)}),window.__TAURI__.event.listen("sync-playback-remote",(i)=>{t.handleRemotePlayback(i.payload,e.getVideoElement())}));e.invoke("get_sync_room_state").then((i)=>{if(z!==t||!i||typeof i!=="object")return;let o=i;if(t.setRoomState(!0,o.is_host),$e(o,!1),!o.is_host&&o.playback_state)t.handleRemotePlayback(o.playback_state,e.getVideoElement())}).catch((i)=>console.error("[YTMD Room Sync] failed to restore room state:",i)),he=()=>{n.forEach((i)=>i.then((o)=>o())),z=null,Fe=null,qe(null)}},onTrackChange(e,t){z?.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0)},onPlaybackChange(e,t){z?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){z?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)},onDestroy(){if(he)he(),he=null}};var be=null,ri=(e,t,n)=>e&&t&&!n,Ut={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=null,i=null,o=e.config.inhibit_sleep!==!1,r=async()=>{if(!o||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},c=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},s=(u)=>{u.addEventListener("play",r),u.addEventListener("playing",r),u.addEventListener("pause",c),u.addEventListener("ended",c),i=u},l=(u)=>{u.removeEventListener("play",r),u.removeEventListener("playing",r),u.removeEventListener("pause",c),u.removeEventListener("ended",c)},a=e.getVideoElement();if(a)s(a);n=window.setInterval(()=>{let u=e.getVideoElement();if(u&&u!==i){if(i)l(i);s(u)}},1000);let d=()=>{let u=e.getVideoElement();if(!u)return;if(ri(document.hidden,Boolean(e.config.pause_on_lock),u.paused))e.sendPlayerCommand("pause")};document.addEventListener("visibilitychange",d),be=()=>{if(n!==null)clearInterval(n),n=null;if(i)l(i),i=null;document.removeEventListener("visibilitychange",d),c()}},onDestroy(){if(be)be(),be=null}};var qt={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>Ge(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},ai=`
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
`;function si(){if(document.getElementById("ytmd-qr-styles"))return;let e=document.createElement("style");e.id="ytmd-qr-styles",e.textContent=ai,document.head.appendChild(e)}async function Ge(e){si();let t=p("p",{text:m().remoteBody,style:"margin: 0;"}),n=p("div",{className:"ytmd-qr-frame",text:m().remoteLoading}),i=p("div",{className:"ytmd-qr-url"}),o=ct({id:"ytmd-remote-modal",title:m().remoteTitle,body:[t,n,i],actions:[{label:m().close}]});try{let r=await e.invoke("get_remote_info");if(!n.isConnected)return;if(r?.qr_svg){let c=p("img");c.src=`data:image/svg+xml;utf8,${encodeURIComponent(r.qr_svg)}`,c.alt=m().remoteTitle,n.replaceChildren(c)}else n.textContent=m().remoteUnavailable;if(r?.url)i.textContent=r.url}catch(r){if(console.error("[YTMD Remote] Error fetching remote info:",r),n.isConnected)n.textContent=m().remoteUnavailable}return o}function li(e,t){if(!t||typeof t!=="object"||!("ok"in t))throw Error(`Malformed response to ${e}`);let n=t;if(!n.ok)throw Error(n.error||`${e} failed`);return n.data??null}var ci=8000,I=(e,t={},n={})=>new Promise((i,o)=>{let r=window.__TAURI__;if(!r?.event?.emit){o(Error("Tauri bridge unavailable"));return}let c=Math.random().toString(36).slice(2)+Date.now().toString(36),s=null,l=setTimeout(()=>{if(s)s();o(Error(`Timed out waiting for ${e}`))},n.timeoutMs??ci);r.event.listen(`ytmd-response-${c}`,(a)=>{if(clearTimeout(l),s)s();try{i(li(e,a.payload))}catch(d){o(d)}}).then((a)=>(s=a,r.event.emit("ytmd-invoke",{id:c,cmd:e,args:t}))).catch((a)=>{clearTimeout(l),o(a instanceof Error?a:Error(String(a)))})});var Gt=null,J=null,H=(e)=>{I(e).catch((t)=>{console.error(`[YTMD] ${e} failed:`,t),w(m().actionFailed)})};function di(){Vt({onSyncChipClick:()=>H("toggle_sync_window"),items:[{id:"settings",iconPath:b.tune,label:m().menuSettings,hint:"Ctrl+,",onSelect:()=>H("toggle_settings_window")},{id:"local",iconPath:b.folderMusic,label:m().menuLocal,onSelect:()=>H("toggle_local_library_window")},{id:"sync",iconPath:b.group,label:m().menuSync,onSelect:()=>H("toggle_sync_window")},{id:"remote",iconPath:b.phone,label:m().menuRemote,onSelect:()=>{if(J)Ge(J)}},{id:"mini",iconPath:b.miniPlayer,label:m().menuMiniPlayer,onSelect:()=>H("toggle_mini_player")},{id:"download",iconPath:b.download,label:m().menuDownload,dividerBefore:!0,onSelect:()=>{if(J)He(J,Gt)}}]})}var ui={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function $t(e){let t={};for(let[n,[i,o]]of Object.entries(ui)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}async function Ft(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};di(),Ue();let t=setInterval(Ue,1000);window.addEventListener("pagehide",()=>clearInterval(t));try{let a=await I("get_config");if(a&&typeof a==="object")Object.assign(e,a)}catch(a){console.error("[YTMD] Failed to load config, using defaults:",a)}let n={track:null,config:e,invoke:I,sendPlayerCommand:(a)=>{s(a)},getVideoElement:()=>f.getVideo()};J=n;let i=new Pe(n);i.register(tt),i.register(nt),i.register(yt),i.register(vt),i.register(Tt),i.register(kt),i.register(wt),i.register(St),i.register(_t),i.register(Mt),i.register(It),i.register(Lt),i.register(Ot),i.register(Ut),i.register(qt);try{await i.initAll($t(e))}catch(a){console.error("[YTMD] Registry init error:",a)}let o=new xe,r=0,c=Date.now();o.onTrackChange(async(a)=>{Gt=a,r=a.currentTimeSecs||0,c=Date.now(),i.handleTrackChange(a);try{await I("update_track_info",{track:{title:a.title,artist:a.artist,album:a.album||null,cover_url:a.coverUrl||null,duration_secs:Math.round(a.durationSecs||0),current_time_secs:Math.round(a.currentTimeSecs||0),is_playing:a.isPlaying,video_id:a.videoId||null}})}catch(d){console.error("[YTMD] Failed to sync track info to backend:",d)}}),o.onPlaybackChange(async(a)=>{i.handlePlaybackChange(a);let d=o.getCurrentTrack();if(d){d.isPlaying=a,r=d.currentTimeSecs||0,c=Date.now();try{await I("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(d.currentTimeSecs||0),is_playing:a,video_id:d.videoId||null}})}catch(u){console.error("[YTMD] Failed to sync playback status:",u)}}}),o.onTick((a)=>{i.handleTick(a);let d=o.getCurrentTrack();if(!d||!d.isPlaying)return;let u=Date.now(),g=(u-c)/1000,h=r+g;if(Math.abs(a-h)>2||g>=15)r=a,c=u,d.currentTimeSecs=Math.round(a),I("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(a),is_playing:!0,video_id:d.videoId||null}}).catch((T)=>console.error("[YTMD] Failed to sync seek/progress to backend:",T))});function s(a){switch(a){case"play":f.play();break;case"pause":f.pause();break;case"play_pause":f.playPause();break;case"next":f.next();break;case"previous":f.previous();break;case"like":f.toggleLike();break;case"dislike":f.toggleDislike();break;case"mute":f.toggleMute();break}}let l=(a,d)=>{let u=window.__TAURI__;if(u?.event?.listen)u.event.listen(a,(g)=>d(g.payload))};l("player-command",(a)=>s(a)),l("tray-command",(a)=>s(a)),l("mpris-command",(a)=>s(a)),l("global-shortcut-event",(a)=>s(a)),l("player-seek",(a)=>f.seekTo(a)),l("mpris-command-seek",(a)=>f.seekTo(a)),l("player-volume",(a)=>f.setVolume(a)),l("config-updated",(a)=>{if(!a||typeof a!=="object")return;Object.assign(e,a);let d=$t(e);for(let[u,g]of Object.entries(d))if(g)i.enable(u).catch((h)=>console.error(`[YTMD] Failed to enable plugin ${u}:`,h));else i.disable(u).catch((h)=>console.error(`[YTMD] Failed to disable plugin ${u}:`,h))}),window.addEventListener("keydown",(a)=>{if(a.ctrlKey&&a.key===","||a.key==="F2")a.preventDefault(),H("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var mi=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(mi)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>Ft());else Ft();
