(()=>{function ft(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}var Vn=400;function qn(e,t){return e-t>=Vn}class Be{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&qn(Date.now(),this.lastTickMs))this.emitTick(n.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",l=i?.album||"",a="";if(i?.artwork&&i.artwork.length>0){let g=i.artwork[i.artwork.length-1];if(g&&g.src)a=g.src}if(!o){let g=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(g)o=g.textContent?.trim()||""}if(!r){let g=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(g){let v=(g.textContent?.trim()||"").split("•").map((k)=>k.trim());if(r=v[0]||"",v.length>1)l=v[1]}}if(!a){let g=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(g&&g.src)a=g.src}if(a.startsWith("//"))a=`https:${a}`;if(a.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(a))a=a.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let s=new URLSearchParams(window.location.search).get("v")||void 0,d=0,m=0;if(t&&typeof t.getDuration==="function"){let g=t.getDuration();if(typeof g==="number"&&Number.isFinite(g)&&g>0)d=Math.floor(g)}if(t&&typeof t.getCurrentTime==="function"){let g=t.getCurrentTime();if(typeof g==="number"&&Number.isFinite(g)&&g>=0)m=Math.floor(g)}if(!d&&e&&Number.isFinite(e.duration)&&e.duration>0)d=Math.floor(e.duration);if(!m&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)m=Math.floor(e.currentTime);let y=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(y&&y.textContent){let g=y.textContent.split("/").map((f)=>f.trim());if(g.length===2){if(!m)m=ft(g[0]);if(!d)d=ft(g[1])}}if(!d){let f=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(f){let v=parseInt(f,10);if(!isNaN(v)&&v>0)d=v}}let h=e?!e.paused&&!e.ended:!1;if(!o)return null;return{title:o,artist:r||"Unknown Artist",album:l||void 0,coverUrl:a||void 0,durationSecs:d,currentTimeSecs:m,isPlaying:h,videoId:s}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&e.durationSecs>0||!this.currentTrack.coverUrl&&!!e.coverUrl||!this.currentTrack.album&&!!e.album||!this.currentTrack.videoId&&!!e.videoId),i=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t||n){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((o)=>o(e))}if(i)this.onPlaybackChangeCallbacks.forEach((o)=>o(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function Oe(){return document.getElementById("movie_player")}function ht(e){for(let t of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let n=document.querySelector(t);if(!n||!("value"in n))continue;if("step"in n&&Number(n.step)>1)n.step=1;n.value=e}}function He(e){let t=Oe()?.getVolume?.(),n=typeof t==="number"&&Number.isFinite(t)?t:e.volume*100;return Math.max(0,Math.min(100,Math.round(n)))}function bt(e){return Oe()?.isMuted?.()===!0||e.muted}function ye(e,t){if(!Number.isFinite(e))return;let n=Math.max(0,Math.min(100,Math.round(e))),i=Oe();if(typeof i?.setVolume==="function"){if(i.setVolume(n),n>0&&i.isMuted?.())if(typeof i.unMute==="function")i.unMute();else t.muted=!1;ht(n);return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1;ht(n)}class b{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)ye(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class Ye{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var ge=null,U={adWasShowing:!1,preAdMuted:!1},Ue=new WeakSet,Z=null,Pt=null,$e=0,ee=!0,zn=1000,Bn=(e,t,n)=>e-t>=n,On=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",Hn="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",Yn=300,$n=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,Un=`
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
`,Fn=$n+Un,jn=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],Gn=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],Qn=(e)=>jn.some((t)=>e.includes(t)),Kn=(e,t)=>{let n=t.split("."),i=e;for(let r=0;r<n.length-1;r++){if(i===null||typeof i!=="object")return!1;i=i[n[r]]}let o=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,o))return delete i[o],!0;return!1},je=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of Gn)if(Kn(e,n))t=!0;return t},Wn=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},vt=!1,Jn=()=>{if(vt)return;vt=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let o=await t(...i);if(!ee||!Qn(Wn(i[0])))return o;let r;try{r=await o.clone().json()}catch{return o}if(!je(r))return o;let l=new Headers(o.headers);return l.delete("content-length"),l.delete("content-encoding"),new Response(JSON.stringify(r),{status:o.status,statusText:o.statusText,headers:l})};window.fetch=Object.assign(n,e)},Tt=!1,Xn=()=>{if(Tt)return;Tt=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(ee)je(n);return n}},wt=!1,Zn=()=>{if(wt)return;wt=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(ee)je(t);e=t}})};if(typeof window<"u")Jn(),Xn(),Zn();var ei=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},ti=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},Ge=()=>document.getElementById("movie_player"),ni=()=>{let e=Ge();if(!e)return!1;return ei(e.classList)},Fe=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=ti(ni(),U,t.muted);if(U=n,i!==null)t.muted=i},kt=(e)=>{if(Ue.has(e))return;Ue.add(e),e.click()},fe=()=>{document.querySelectorAll(On).forEach(kt),document.querySelectorAll(Hn).forEach((e)=>{let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)kt(t)})},xt=(e)=>{let t=Ge();if(Pt=t,!t)return;Z?.disconnect(),Z=new MutationObserver(()=>{Fe(e),fe()}),Z.observe(t,{attributes:!0,attributeFilter:["class"]})},St={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){ee=!0,U={adWasShowing:!1,preAdMuted:!1},Ue=new WeakSet,$e=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=Fn,document.head.appendChild(t);let n=null,i=new MutationObserver(()=>{if(n!==null)return;n=setTimeout(()=>{n=null,fe()},Yn)});i.observe(document.body,{childList:!0,subtree:!0}),xt(e),fe(),Fe(e),ge=()=>{if(ee=!1,Z?.disconnect(),Z=null,i.disconnect(),n!==null)clearTimeout(n);document.getElementById("ytmd-adblock-styles")?.remove();let o=e.getVideoElement();if(o&&U.adWasShowing)o.muted=U.preAdMuted;U={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(Ge()!==Pt)xt(t);Fe(t);let n=Date.now();if(Bn(n,$e,zn))$e=n,fe()},onDestroy(){if(ge)ge(),ge=null}};var _t=!1;function Et(e){_t=e}function he(){return _t}var F=[],be="",Qe=new Set,ii=(e,t)=>e===t,Ct={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){F=[],be="",Qe=new Set},onTrackChange(e){if(!e.videoId||e.videoId===be)return;let t=e.videoId;be=t,F=[],Qe=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(o)=>{if(!o.ok)return;let r=await o.json();if(!ii(t,be))return;F=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!F||F.length===0||he())return;let n=Qe;for(let i of F){let[o,r]=i.segment;if(e>=o&&e<r-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let l=t.getVideoElement();if(l)l.currentTime=r,n.add(i.UUID);break}}}};function Mt(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function p(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var It="ytmd-kit-styles",oi=`
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
`;function _(){if(document.getElementById(It))return;let e=document.createElement("style");e.id=It,e.textContent=oi,(document.head||document.documentElement).appendChild(e),ri()}var w={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function te(e,t=24){return Mt(e,t,t)}function N(e){let t=p("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(te(e.iconPath)),t}function Rt(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(te(t))}function Nt(e,t){let n=e.querySelector("svg.ytmd-progress-ring");if(t===null){n?.remove();return}let i=17,o=2*Math.PI*i;if(!n){n=document.createElementNS("http://www.w3.org/2000/svg","svg"),n.setAttribute("class","ytmd-progress-ring"),n.setAttribute("viewBox","0 0 36 36");for(let a of["ytmd-progress-track","ytmd-progress-value"]){let c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("class",a),c.setAttribute("cx","18"),c.setAttribute("cy","18"),c.setAttribute("r",String(i)),c.setAttribute("stroke-dasharray",String(o)),n.appendChild(c)}e.appendChild(n)}let r=Math.max(0,Math.min(1,t));n.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(o*(1-r)))}var Lt=!1;function ri(){if(Lt)return;Lt=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},o=(a)=>{let c=a.dataset.ytmdTooltip;if(!c)return;if(!e)e=p("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=c;let s=a.getBoundingClientRect(),d=e.getBoundingClientRect(),y=s.bottom+8+d.height<window.innerHeight?s.bottom+8:s.top-8-d.height,h=Math.max(8,Math.min(window.innerWidth-d.width-8,s.left+s.width/2-d.width/2));e.style.top=`${y}px`,e.style.left=`${h}px`,e.classList.add("ytmd-open")},r=(a)=>{let c=a.target?.closest?.("[data-ytmd-tooltip]");if(!c||c===n)return;i(),n=c,t=setTimeout(()=>o(c),250)},l=(a)=>{let c=a.relatedTarget;if(n&&c&&n.contains(c))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",l,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var V=null;function T(e,t={}){_();let n=document.getElementById("ytmd-toast-host");if(!n)n=p("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),r=o?i:p("div",{className:"ytmd-toast"});if(t.id)r.dataset.toastId=t.id;let a=[p("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:s,onClick:d}=t.action,m=p("button",{className:"ytmd-button",text:s});m.type="button",m.addEventListener("click",()=>{At(),d()}),a.push(m)}if(r.replaceChildren(...a),!o)n.replaceChildren(r);if(V!==null)clearTimeout(V);V=null;let c=t.durationMs??4000;if(c>0)V=setTimeout(At,c)}var si=5,ai=3000;function Dt(e,t){_();let n=document.getElementById("ytmd-reaction-host");if(!n)n=p("div",{id:"ytmd-reaction-host"}),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=p("div",{className:"ytmd-reaction"});i.append(p("span",{className:"ytmd-reaction-emoji",text:e}),p("span",{text:t})),n.appendChild(i);while(n.children.length>si)n.firstElementChild?.remove();setTimeout(()=>i.remove(),ai)}function At(){if(V!==null)clearTimeout(V);V=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function Vt(e){_(),document.getElementById(e.id)?.remove();let t=p("div",{id:e.id,className:"ytmd-scrim"}),n=p("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=p("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),r=p("div",{className:"ytmd-dialog-body"});if(e.body)r.append(...e.body);let l=document.activeElement,a=()=>{document.removeEventListener("keydown",c,!0),t.remove(),l?.focus?.()},c=(d)=>{if(d.key==="Escape")d.stopPropagation(),a()};document.addEventListener("keydown",c,!0),t.addEventListener("click",(d)=>{if(d.target===t)a()});let s=p("div",{className:"ytmd-dialog-actions"});for(let d of e.actions){let m=p("button",{className:`ytmd-button${d.filled?" ytmd-button--filled":""}`,text:d.label});m.type="button",m.addEventListener("click",()=>d.onClick?d.onClick(a):a()),s.appendChild(m)}return n.append(o,r,s),t.appendChild(n),document.body.appendChild(t),s.querySelector("button")?.focus(),{close:a,body:r}}var qt={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:(e,t,n)=>`${e} votes to skip (${t}/${n})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:(e,t)=>`From the shared queue: ${e} · ${t}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:(e)=>`${e} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:(e)=>`from ${e}`,syncQueuePlayNow:(e)=>`Play “${e}” now`,syncQueueRemove:(e)=>`Remove “${e}” from the queue`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",downloadNoTrack:"Play a song first to download it",downloadStarted:(e)=>`Downloading “${e}”`,downloadDone:(e)=>`Downloaded “${e}”`,downloadFailed:(e)=>`Download failed: ${e}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:"Source: LRCLIB",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`},li={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:(e,t,n)=>`${e} głosuje za pominięciem (${t}/${n})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:(e,t)=>`Ze wspólnej kolejki: ${e} · ${t}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:(e)=>`${e} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:(e)=>`od: ${e}`,syncQueuePlayNow:(e)=>`Zagraj teraz: „${e}”`,syncQueueRemove:(e)=>`Usuń z kolejki: „${e}”`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:(e)=>`Pobieranie: „${e}”`,downloadDone:(e)=>`Pobrano: „${e}”`,downloadFailed:(e)=>`Nie udało się pobrać: ${e}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:"Źródło: LRCLIB",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`},ci={en:qt,pl:li};function di(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return ci[t]??qt}var Ke=null;function u(){if(!Ke){let e=typeof document<"u"?document.documentElement.lang:"";Ke=di(e||(typeof navigator<"u"?navigator.language:"en"))}return Ke}var E=[],ie=-1,oe=null,M="",ve=null,ne="",zt=(e,t)=>e===t,Ht={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){E=[],ie=-1,oe=null,M="",ne="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
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
    `,document.head.appendChild(t),_();let n=()=>{Te(),Ot(e)},i=()=>{setTimeout(()=>{Te(),Je()},50),setTimeout(()=>{Je()},250)};document.addEventListener("click",i,!0);let o=window.setInterval(n,600);n(),ve=()=>{clearInterval(o),document.removeEventListener("click",i,!0),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((l)=>l.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(M===n&&E.length>0||ne===n)return;M=n,ne=n,E=[],ie=-1,oe=null,Te();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsLoading}));try{let o=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!zt(n,M))return;if(oe=o,o?.syncedLyrics)E=bi(o.syncedLyrics);Te(),Ot(t),Ft(t)}catch{if(!zt(n,M))return;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsNone}))}finally{if(ne===n)ne=""}},onTick(e){if(!E||E.length===0)return;let t=we(M),n=e+t,i=-1;for(let o=0;o<E.length;o++)if(n>=E[o].timeSecs)i=o;else break;if(i!==ie&&i>=0){ie=i;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o){let r=o.querySelectorAll(".ytmd-native-lyric-line");r.forEach((a,c)=>{if(c===i)a.classList.add("active");else a.classList.remove("active")});let l=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(l&&gi(l)){let a=r[i];if(a)a.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(ve)ve(),ve=null}},Yt="ytmd-lyrics-offsets",ui=500;function $t(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function mi(e){try{let t=e?.getItem(Yt);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function pi(e,t,n,i){if(e.delete(t),n!==0)e.set(t,n);while(e.size>ui){let o=e.keys().next().value;if(o===void 0)break;e.delete(o)}try{i?.setItem(Yt,JSON.stringify([...e]))}catch{}}var We=null;function Ut(){if(!We)We=mi($t());return We}function we(e){return Ut().get(e)||0}function yi(e,t){pi(Ut(),e,t,$t())}function Bt(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function gi(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function fi(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function Te(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(fi(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function hi(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function Je(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=hi();e.style.setProperty("display",t?"flex":"none","important")}function Ot(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=p("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),Ft(e)}Je()}function Ft(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(E&&E.length>0){let n=we(M),i=p("span",{className:"ytmd-lyrics-offset-value",text:Bt(n)}),o=(a)=>{let c=a===null?0:Math.round((we(M)+a)*10)/10;yi(M,c),i.textContent=Bt(c)},r=(a,c,s)=>{let d=p("button",{className:"ytmd-chip",text:a});return d.type="button",d.dataset.ytmdTooltip=c,d.setAttribute("aria-label",c),d.addEventListener("click",s),d},l=p("div",{className:"ytmd-native-lyrics-footer"});l.append(p("span",{className:"ytmd-lyrics-source",text:u().lyricsSource}),p("span",{text:u().lyricsOffset}),r("−0.5 s",u().lyricsLater,()=>o(-0.5)),i,r("+0.5 s",u().lyricsEarlier,()=>o(0.5)),r(u().lyricsReset,u().lyricsReset,()=>o(null))),t.replaceChildren(...E.map((a,c)=>{let s=p("div",{className:`ytmd-native-lyric-line${c===ie?" active":""}`,text:a.text});return s.addEventListener("click",()=>{let d=e.getVideoElement();if(d){let m=we(M);d.currentTime=Math.max(0,a.timeSecs-m)}}),s}),l)}else if(oe?.plainLyrics){let n=oe.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>p("div",{className:"ytmd-native-lyric-line ytmd-plain",text:i})),p("div",{className:"ytmd-native-lyrics-footer",text:u().lyricsSource}))}else t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsNone}))}function bi(e){let t=e.split(`
`),n=[],i=0,o=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,r=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let l of t){let a=l.trim();if(!a)continue;let c=r.exec(a);if(c){let m=parseInt(c[1],10);if(!isNaN(m))i=m/1000;continue}let s=[],d;o.lastIndex=0;while((d=o.exec(a))!==null){let m=parseInt(d[1],10),y=parseInt(d[2],10),h=0;if(d[3])h=parseInt(d[3].padEnd(3,"0").slice(0,3),10);s.push(m*60+y+h/1000)}if(s.length>0){let m=a.replace(o,"").trim();if(m)for(let y of s)n.push({timeSecs:Math.max(0,y-i),text:m})}}return n.sort((l,a)=>l.timeSecs-a.timeSecs)}var re=null;function se(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}var jt={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){re?.(),_(),document.getElementById("ytmd-volume-indicator")?.remove();let t=p("div",{id:"ytmd-volume-indicator"});document.body.appendChild(t);let n=null,i=null,o=null,r=null,l=null,a=()=>{if(l!==null)window.clearTimeout(l);l=null,t.classList.remove("ytmd-visible")},c=()=>{if(l!==null)window.clearTimeout(l);t.classList.add("ytmd-visible"),l=window.setTimeout(()=>{l=null,t.classList.remove("ytmd-visible")},1800)},s=()=>{let f=e.getVideoElement();if(!f){r=null,a();return}let v=bt(f)?0:He(f),k=r!==null&&v!==r;r=v;let A=document.querySelector("ytmusic-player-page #main-panel");if(!se(A)){a();return}if(t.textContent!==`${v}%`)t.textContent=`${v}%`,t.setAttribute("aria-label",u().volumeLevel(v));let Y=se(document.querySelector("ytmusic-player-page #song-image")),R=se(document.querySelector("ytmusic-player-page video"))||se(document.querySelector("ytmusic-player-page #movie_player")),C=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?R||Y:Y||R)||se(A);if(!C){a();return}let I=`${Math.max(8,C.left+12)}px`,S=`${Math.max(8,C.top+12)}px`;if(t.style.left!==I)t.style.left=I;if(t.style.top!==S)t.style.top=S;if(k)c()},d=()=>{let f=e.getVideoElement();if(f===n)return;n?.removeEventListener("volumechange",s),n=f,n?.addEventListener("volumechange",s),s()},m=()=>{let f=document.querySelector("ytmusic-player-page");if(f===i)return;if(o?.disconnect(),i=f,f)o=new MutationObserver(()=>window.requestAnimationFrame(s)),o.observe(f,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},y=(f)=>{let v=f.target;if(v instanceof Element&&v.closest("ytmusic-player-bar"))window.requestAnimationFrame(s)},h=(f)=>{if(f.deltaY===0||f.ctrlKey)return;let v=f.target;if(v instanceof Element&&v.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'))return;let k=(I)=>{if(!I)return!1;let S=I.getBoundingClientRect();return f.clientX>=S.left&&f.clientX<S.right&&f.clientY>=S.top&&f.clientY<S.bottom},A=k(document.querySelector("ytmusic-player-bar"))||k(document.querySelector("#player-bar-background")),Y=e.config.wheel_volume_on_player_page===!0&&k(document.querySelector("ytmusic-player-page #main-panel"));if(!A&&!Y)return;let R=e.getVideoElement();if(!R)return;let P=e.config.wheel_volume_step,C=typeof P==="number"&&Number.isFinite(P)&&P>0?Math.min(P,1):0.05;f.preventDefault(),ye(He(R)+(f.deltaY<0?C:-C)*100,R),s()};window.addEventListener("wheel",h,{passive:!1}),window.addEventListener("resize",s),document.addEventListener("scroll",s,!0),document.addEventListener("input",y,!0),document.addEventListener("change",y,!0),m(),d();let g=window.setInterval(()=>{m(),d(),s()},500);re=()=>{window.removeEventListener("wheel",h),window.removeEventListener("resize",s),document.removeEventListener("scroll",s,!0),document.removeEventListener("input",y,!0),document.removeEventListener("change",y,!0),window.clearInterval(g),o?.disconnect(),n?.removeEventListener("volumechange",s),a(),t.remove()}},onDestroy(){if(re)re(),re=null}};var Gt={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var ke=null,Qt={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);ke=()=>{t?.remove()}},onDestroy(){if(ke)ke(),ke=null}};var xe=[32,64,125,250,500,1000,2000,4000,8000,16000],Xe={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function ae(e){return Math.max(-24,Math.min(24,e))}function vi(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function Ti(e){return Math.max(0.5,Math.min(2,e))}class x{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=xe.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!x.instance)x.instance=new x;return x.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=xe.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===xe.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=ae(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=ae(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=ae(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,ae(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=Xe[e]||Xe.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),vi(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=Ti(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??b.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class Ze{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)x.getInstance().fadeIn(this.crossfadeSeconds);else x.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),x.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),x.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),b.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class et{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=x.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,b.next()}else this.consecutiveSilentTicks=0}}var q=null,j=null,Pe=null;function wi(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var Kt={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=x.getInstance(),n=new Ze,i=new et;q=n,j=i;let o=e.config,r=null,l=()=>{if(r!==null)return;let c=e.getVideoElement();if(c){if(!t.isInitializedFor(c))t.init(c);return}r=window.setInterval(()=>{let s=e.getVideoElement();if(s){if(r!==null)clearInterval(r);r=null,t.init(s)}},500)};if(wi(o))l();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let a=[];if(window.__TAURI__?.event){let{listen:c}=window.__TAURI__.event;a.push(c("set-eq-band",(s)=>{l(),t.setBandGain(s.payload.bandIndex,s.payload.gain)}),c("set-eq-all",(s)=>{l(),t.setAllGains(s.payload.gains)}),c("set-eq-preset",(s)=>{l(),t.applyPreset(s.payload)}),c("set-preamp",(s)=>{l(),t.setPreamp(s.payload)}),c("set-loudness-normalization",(s)=>{if(s.payload)l();t.setLoudnessNormalization(s.payload)}),c("set-crossfade-seconds",(s)=>{if(s.payload>0)l();n.setCrossfadeSeconds(s.payload)}),c("set-skip-silence",(s)=>{if(s.payload)l();i.setEnabled(s.payload)}),c("set-playback-rate",(s)=>{t.setPlaybackRate(s.payload)}),c("set-preserves-pitch",(s)=>{t.setPreservesPitch(s.payload)}))}Pe=()=>{if(r!==null)clearInterval(r),r=null;a.forEach((c)=>c.then((s)=>s())),q?.destroy(),q=null,j=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(x.getInstance().applyRateAndPitch(),q)q.onTrackChange(e);if(j)j.onTrackChange()},onTick(e,t){if(he())return;if(q)q.onTick(e,t.track);if(j)j.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(Pe)Pe(),Pe=null}};var tt=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function Wt(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let l=r.getImageData(0,0,16,16).data,a=0,c=0,s=0,d=0,m=0,y=0,h=0,g=0;for(let P=0;P<l.length;P+=4){let C=l[P],I=l[P+1],S=l[P+2];if(l[P+3]<128)continue;let gt=(C+I+S)/3;if(gt<20||gt>240)continue;if(P<l.length/2)a+=C,c+=I,s+=S,d++;else m+=C,y+=I,h+=S,g++}if(d===0&&g===0){t(n);return}let f=d>0?Math.round(a/d):220,v=d>0?Math.round(c/d):38,k=d>0?Math.round(s/d):38,A=g>0?Math.round(m/g):24,Y=g>0?Math.round(y/g):24,R=g>0?Math.round(h/g):27;t({primary:tt(f,v,k),secondary:tt(A,Y,R),accent:tt(f+30,v+30,k+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var D=48,ki=3,xi=3,Pi=1.65,Si=0.55;function _i(e,t,n,i){let o=new Float32Array(e.length),r=(l,a,c)=>{let s=c?n:t,d=c?t:n;for(let m=0;m<s;m++)for(let y=0;y<4;y++)for(let h=0;h<d;h++){let g=0,f=0;for(let k=Math.max(0,h-i);k<=Math.min(d-1,h+i);k++){let A=c?(m*t+k)*4+y:(k*t+m)*4+y;g+=l[A],f++}let v=c?(m*t+h)*4+y:(h*t+m)*4+y;a[v]=g/f}};r(e,o,!0),r(o,e,!1)}function Ei(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],l=e[i+2],a=0.2126*o+0.7152*r+0.0722*l;e[i]=(a+(o-a)*t)*n,e[i+1]=(a+(r-a)*t)*n,e[i+2]=(a+(l-a)*t)*n}}async function Jt(e,t=Si){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=D,o.height=D;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,D,D);let l=r.getImageData(0,0,D,D);for(let a=0;a<xi;a++)_i(l.data,D,D,ki);Ei(l.data,Pi,t),r.putImageData(l,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var Se=null,_e=null,Ee,Xt={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=p("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=p("img",{id:"ytmd-ambient-cover"});n.alt="";let i=p("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,l=document.createElement("style");l.id="ytmd-ambient-styles",l.textContent=`
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
    `,document.head.appendChild(l),Se=(c)=>{if(t)t.style.opacity=String(c)};let a=[];if(window.__TAURI__?.event)a.push(window.__TAURI__.event.listen("set-ambient-intensity",(c)=>{Se?.(c.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(c)=>{let s=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;Se?.(c.payload?s:0)}));if(_e=()=>{a.forEach((c)=>c.then((s)=>s())),Se=null,Ee=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===Ee)return;Ee=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await Jt(t):null;if(t!==Ee)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await Wt(t||""),o=document.documentElement.style;o.setProperty("--ytmd-accent",i.accent),o.setProperty("--ytmd-accent-primary",i.primary),o.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(_e)_e(),_e=null}};var Zt=`
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

`,en=`
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

`;var Ce=null,tn={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(a)=>{let c=document.getElementById(a);if(!c){c=document.createElement("style"),c.id=a;let s=t();if(s)s.appendChild(c)}return c},i=(a)=>{let c=n("ytmd-active-theme");c.textContent=a?Zt:en},o=(a)=>{let c=n("ytmd-custom-css");if(c)c.textContent=a};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let l=[];if(window.__TAURI__?.event)l.push(window.__TAURI__.event.listen("set-ambient-enabled",(a)=>{i(a.payload)}),window.__TAURI__.event.listen("set-custom-css",(a)=>{o(a.payload)}));Ce=()=>{l.forEach((a)=>a.then((c)=>c()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(Ce)Ce(),Ce=null}};var Me=null,nn={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=N({id:"ytmd-pip-btn",label:u().pipButton,iconPath:w.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(l){console.warn("[YTMD PiP] Could not enter PiP:",l),await e.invoke("toggle_mini_player").catch((a)=>console.error("[YTMD PiP] Mini player fallback failed:",a))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),Me=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(Me)Me(),Me=null}};function Ci(e){if(e.error)return"failed";if(e.output_path&&e.percent>=100)return"done";return"progress"}var Le="ytmd-download-btn",Mi=3000,G=new Map,nt=new Set,Ae=null,Ie=null;function Q(){let e=document.getElementById(Le);if(!e)return;let t=Ae?.videoId,n=t?G.get(t):void 0;Nt(e,n?Math.max(0.05,n.fraction):null),Rt(e,t&&nt.has(t)?w.check:w.download),e.setAttribute("aria-disabled",t?"false":"true");let i=n?u().downloadInProgress:u().downloadButton;e.setAttribute("aria-label",i),e.dataset.ytmdTooltip=i}function it(e,t){let n=G.get(e);if(!n)return;if(G.delete(e),t.ok)nt.add(e),setTimeout(()=>{nt.delete(e),Q()},Mi),T(u().downloadDone(n.title),{id:`download-${e}`});else T(u().downloadFailed(t.reason),{id:`download-${e}`,durationMs:8000});Q()}function Ii(e){let t=G.get(e.video_id);if(!t)return;let n=Ci(e);if(n==="failed")it(e.video_id,{ok:!1,reason:e.error||e.status});else if(n==="done")it(e.video_id,{ok:!0});else t.fraction=e.percent/100,Q()}function ot(e,t){let n=t?.videoId;if(!t||!n){T(u().downloadNoTrack);return}if(G.has(n)){T(u().downloadInProgress);return}G.set(n,{title:t.title,fraction:0}),Q(),T(u().downloadStarted(t.title),{id:`download-${n}`}),e.invoke("download_track",{request:{video_id:n,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:e.config.download_format||"mp3",embed_lyrics:e.config.embed_lyrics!==!1}}).catch((i)=>{console.error("[YTMD Downloader] Download failed:",i),it(n,{ok:!1,reason:i instanceof Error?i.message:String(i)})})}var on={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){Ae=e.track;let t=()=>{if(document.getElementById(Le))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!o)return;let r=N({id:Le,label:u().downloadButton,iconPath:w.download});r.addEventListener("click",()=>{if(r.getAttribute("aria-disabled")==="true")return;ot(e,Ae)}),o.appendChild(r),Q()},n=window.setInterval(t,1000);t();let i=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(o)=>Ii(o.payload)):null;Ie=()=>{clearInterval(n),i?.then((o)=>o()),document.getElementById(Le)?.remove()}},onTrackChange(e){Ae=e,Q()},onDestroy(){if(Ie)Ie(),Ie=null}};var rn={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};var Re="ytmd-nav-slot",rt="ytmd-menu-btn",ce="ytmd-menu",sn="ytmd-sync-chip",ln=[],le=null,cn=null,an=!1,Li=`
  #${Re} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function Ai(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=Li,document.head.appendChild(e)}function Ri(e){if(!e)return;return`${u().syncInRoom} · ${u().syncListeners(e.listeners)}`}function dn(e){ln=e.items,cn=e.onSyncChipClick}function st(){if(document.getElementById(Re)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;_(),Ai();let t=p("div",{id:Re}),n=N({id:rt,label:u().menuLabel,iconPath:w.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),Di(n)}),t.appendChild(n),e.prepend(t),un(),qi()}function at(e){le=e,un();let t=document.getElementById(ce);if(t?.classList.contains("ytmd-open"))mn(t)}function un(){let e=document.getElementById(Re);if(!e)return;let t=document.getElementById(sn);if(!le){t?.remove();return}if(!t)t=p("button",{id:sn,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>cn?.()),e.prepend(t);let n=u().syncListeners(le.listeners);t.replaceChildren(p("span",{className:"ytmd-chip-dot"}),te(w.group,18),p("span",{text:n})),t.dataset.ytmdTooltip=`${u().syncInRoom} · ${le.roomCode}`,t.setAttribute("aria-label",`${u().syncInRoom}, ${n}`)}function mn(e){let t=[];for(let n of ln){if(n.dividerBefore)t.push(p("div",{className:"ytmd-menu-divider"}));let i=p("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=p("span",{className:"ytmd-menu-item-text"});o.appendChild(p("span",{text:n.label}));let r=n.id==="sync"?Ri(le):void 0;if(r)o.appendChild(p("span",{className:"ytmd-menu-item-sub",text:r}));if(i.append(te(n.iconPath),o),n.hint)i.appendChild(p("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{K(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function Ni(){let e=document.getElementById(ce);if(!e)e=p("div",{id:ce,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",Vi),document.body.appendChild(e);return e}function Di(e){let t=Ni();if(t.classList.contains("ytmd-open")){K();return}mn(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function K(){let e=document.getElementById(ce);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById(rt);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function Vi(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),K();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")K()}function qi(){if(an)return;an=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(ce);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(rt)?.contains(n))return;K()}),window.addEventListener("resize",K)}function pn(e){return e.is_host?"host":e.role??"dj"}function z(e){return e!=="listener"}function yn(e){return Math.floor(e/2)+1}var W="ytmd-sync-queue",lt="ytmd-sync-queue-styles",Ne="data-ytmd-sync-queue",ue="data-ytmd-sync-queue-tab",zi="M8 5v14l11-7z",Bi="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",Oi=/^[A-Za-z0-9_-]{11}$/;function hn(e){if(typeof e!=="object"||e===null)return null;let t=e.serviceEndpoint?.queueAddEndpoint;if(typeof t!=="object"||t===null)return null;let{queueTarget:n,queueInsertPosition:i}=t;return{videoId:typeof n?.videoId==="string"&&Oi.test(n.videoId)?n.videoId:null,next:i==="INSERT_AFTER_CURRENT_VIDEO"}}function Hi(e){return`
  html[${Ne}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${Ne}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(e)};
    font-size: 14px;
  }
  html[${ue}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${W} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${ue}] #${W} { display: block; }
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
  .ytmd-sq-actions { display: flex; flex: 0 0 auto; max-width: 0; overflow: hidden; }
  .ytmd-sq-row:hover .ytmd-sq-actions, .ytmd-sq-row:focus-within .ytmd-sq-actions { max-width: 80px; }
`}function Yi(e){_();let t=document.getElementById(lt);if(!t)t=p("style",{id:lt}),document.head.appendChild(t);let n=Hi(e);if(t.textContent!==n)t.textContent=n}function gn(e){let t=p("div",{className:"ytmd-sq-row"}),n=p("img",{className:"ytmd-sq-thumb"});n.alt="",n.loading="lazy",n.src=`https://i.ytimg.com/vi/${e.videoId}/default.jpg`;let i=p("div",{className:"ytmd-sq-text"});if(i.append(p("span",{className:"ytmd-sq-title",text:e.title}),p("span",{className:"ytmd-sq-sub",text:e.sub})),t.append(n,i),e.actions.length){let o=p("div",{className:"ytmd-sq-actions"});o.append(...e.actions),t.appendChild(o)}return t}function fn(e,t,n){let i=N({label:e,iconPath:t,muted:!0});return i.addEventListener("click",(o)=>{o.stopPropagation(),n()}),i}function bn(e,t,n){let i=u(),o=[];if(t.nowPlaying)o.push(p("div",{className:"ytmd-sq-heading",text:i.syncQueueNowPlaying})),o.push(gn({...t.nowPlaying,sub:t.nowPlaying.artist,actions:[]}));if(o.push(p("div",{className:"ytmd-sq-heading",text:i.syncQueueTitle})),t.queue.length===0)o.push(p("p",{className:"ytmd-sq-hint",text:z(t.myRole)?i.syncQueueEmpty:i.syncQueueListenerHint}));let r=t.myRole==="host"||t.myRole==="moderator";for(let l of t.queue){let a=[];if(z(t.myRole))a.push(fn(i.syncQueuePlayNow(l.title),zi,()=>n.play(l.id)));if(r||l.added_by_id===t.myId)a.push(fn(i.syncQueueRemove(l.title),Bi,()=>n.remove(l.id)));let c=i.syncQueueFrom(l.added_by);o.push(gn({videoId:l.video_id,title:l.title,sub:l.artist?`${l.artist} · ${c}`:c,actions:a}))}e.replaceChildren(...o)}var de=null;function De(){let e=document.documentElement;if(!de){e.removeAttribute(ue);return}let t=document.querySelector("ytmusic-player-page #side-panel"),n=document.getElementById(W);if(t&&n?.parentElement!==t)n??=p("div",{id:W}),n.setAttribute("role","region"),n.setAttribute("aria-label",u().syncQueueTitle),bn(n,de.model,de.actions),t.insertBefore(n,t.querySelector(":scope > #tab-renderer"));let i=document.querySelector("ytmusic-player-page tp-yt-paper-tab");e.toggleAttribute(ue,!!n?.isConnected&&i?.getAttribute("aria-selected")==="true")}function vn(e,t){de={model:e,actions:t},Yi(u().syncQueueTab),document.documentElement.setAttribute(Ne,"");let n=document.getElementById(W);if(n)bn(n,e,t);De()}function ct(){de=null,document.documentElement.removeAttribute(Ne),document.documentElement.removeAttribute(ue),document.getElementById(W)?.remove(),document.getElementById(lt)?.remove()}function J(e){if(e.is_host)return"host";let t=e.members.find((n)=>n.id===e.current_user_id);return t?pn(t):"dj"}function $i(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var B=/^[A-Za-z0-9_-]{11}$/,Ui=2,Fi=0.25,ji=0.05,Gi=3,Tn=0.1,Qi=0.5,Ki=1,Wi=1000,Ji=1,Xi=5000,Zi=4000,wn=15000,eo=3,to=4000,kn=1,no=1e4,io=5,oo=1e4,ro=1.2;function xn(e,t){return Number.isFinite(t)&&t>kn?Math.min(e,t-kn):e}function so(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(B.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>Qi)i.seekTo=xn(e.current_time_secs,t.duration);return i}let o=e.current_time_secs+Math.min(Ki,Math.max(0,n)),r=o-t.currentTime;if(Math.abs(r)>Ui)i.seekTo=xn(o,t.duration);else if(Math.abs(r)>(t.correcting?ji:Fi))i.playbackRate=1+Math.max(-Tn,Math.min(Tn,r/Gi));return i}class Pn{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function ao(e,t){return t!==null&&e<t&&t-e<oo}function Sn(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var lo=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function _n(){return new URLSearchParams(window.location.search).get("v")}function Ve(e){let t=document.getElementById("movie_player"),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&B.test(n)&&typeof i==="number"&&Number.isFinite(i))return{videoId:n,currentTime:i};return{videoId:_n(),currentTime:e?e.currentTime:0}}function dt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function ut(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class En{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvancedFrom=null;constructor(e=T){this.notify=e}lastBroadcast=null;pendingNav=null;transit=new Pn;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;finished=null;rateCorrection=null;setRoomState(e,t,n=!0){let i=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,this.canControl=n,Et(this.isGuest()),!i)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||dt())return;if(ao(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(B.test(e.video_id))this.hostVideoId=e.video_id;let o=this.requestedVideo;if(o){if(e.video_id!==o.videoId&&n-o.atMs<Zi)return;this.requestedVideo=null}let r=Ve(t);if(this.waitingForHostsNext(e,r.videoId,t,n)){this.endRateCorrection(),b.pause();return}let l={videoId:r.videoId,paused:t?t.paused:!0,currentTime:r.currentTime,duration:t?t.duration:NaN,correcting:this.rateCorrection!==null},a=so(e,l,i);if(a.navigateTo){this.endRateCorrection();let c=this.pendingNav;if(c&&c.videoId===a.navigateTo&&n-c.atMs<Xi)return;let s=c&&c.videoId===a.navigateTo?c.attempts+1:1;if(this.pendingNav={videoId:a.navigateTo,atMs:n,attempts:s},this.rememberOwnNav(a.navigateTo,n),b.pause(),s>1)window.location.href=`https://music.youtube.com/watch?v=${a.navigateTo}`;else ut(a.navigateTo);return}if(this.pendingNav=null,!t)return;if(a.setPlaying===!0)b.play();else if(a.setPlaying===!1)b.pause();if(a.seekTo!==null)this.endRateCorrection(),b.seekTo(a.seekTo);else this.setCatchUpRate(t,a.playbackRate)}waitingForHostsNext(e,t,n,i){let o=this.finished;return!!o&&e.video_id===o.videoId&&i-o.atMs<no&&o.duration-e.current_time_secs<io&&(t!==o.videoId||!!n?.ended)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>wn)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;if(Number.isFinite(e.duration)&&e.duration>0&&e.duration-e.currentTime<eo){this.nearEndAtMs=t;let{videoId:n}=Ve(e);if(n)this.finished={videoId:n,duration:e.duration,atMs:t}}}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!this.canControl||!e||!B.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<wn)return null;if(t-this.nearEndAtMs<to)return null;if(this.requestedVideo?.videoId===e)return null;return this.requestedVideo={videoId:e,atMs:t},{kind:"play_video",video_id:e}}requestControl(e,t){if(!this.canControl){if(e.kind!=="next"){this.notify(u().syncListenerOnly);return}t("vote_sync_skip").then(()=>this.notify(u().syncVotedSkip)).catch((n)=>{console.error("[YTMD Room Sync] vote failed:",n),this.notify(u().actionFailed)});return}t("send_sync_control",{action:e}).catch((n)=>{console.error("[YTMD Room Sync] control request failed:",n),this.notify(u().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n,source:i}=e,o=i?.kind==="vote"?u().syncVoteSkipped:i?.kind==="queue"?u().syncFromQueue(i.title,t):null;switch(n.kind){case"next":b.next(),this.notify(o??u().syncGuestNext(t));break;case"previous":b.previous(),this.notify(o??u().syncGuestPrevious(t));break;case"set_playing":{let r=b.getVideo();if(!r||r.paused!==n.playing)return;if(n.playing)b.play();else b.pause();this.notify(o??(n.playing?u().syncGuestResumed(t):u().syncGuestPaused(t)));break}case"play_video":if(!B.test(n.video_id)||n.video_id===_n())return;ut(n.video_id),this.notify(o??u().syncGuestPicked(t));break}}advanceQueue(e,t,n){if(!this.inRoom||!this.isHost||e===0||!t||dt())return;let i=t.duration-t.currentTime;if(!Number.isFinite(i)||i>ro&&!t.ended)return;let{videoId:o}=Ve(t);if(!o||this.queueAdvancedFrom===o)return;this.queueAdvancedFrom=o,n("sync_queue_take_next").then((r)=>{let l=r;if(!l||!B.test(l.video_id))return;b.pause(),ut(l.video_id),this.notify(u().syncFromQueue(l.title,l.added_by))}).catch((r)=>console.error("[YTMD Room Sync] queue advance failed:",r))}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||dt())return;if(t.ended)return;let{videoId:o,currentTime:r}=Ve(t);if(!o)return;let l=Date.now(),a=this.lastBroadcast,c=a?a.position+(l-a.atMs)/1000*a.rate:0,s=!!a&&a.playing&&!t.paused&&Math.abs(r-c)>Ji,d=!!a&&a.videoId!==o;if(!i&&!s&&!d&&a&&l-a.atMs<Wi)return;this.lastBroadcast={atMs:l,videoId:o,position:r,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:o,title:e.title,artist:e.artist,current_time_secs:r,is_playing:!t.paused,timestamp_ms:l}}).catch((m)=>console.error("[YTMD Room Sync] broadcast failed:",m))}}var L=null,me=null,qe=null,O=null,pt=null,co=1000;function Cn(){let e=O,t=me;if(!e||!t){ct();return}let n=pt,i=(o)=>(r)=>{t(o,{itemId:r}).catch((l)=>{console.error(`[YTMD Room Sync] ${o} failed:`,l),T(u().actionFailed)})};vn({queue:e.queue??[],nowPlaying:n?.videoId&&B.test(n.videoId)?{videoId:n.videoId,title:n.title,artist:n.artist}:null,myId:e.current_user_id,myRole:J(e)},{play:i("sync_queue_play"),remove:i("sync_queue_remove")})}function uo(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function mo(e,t){if(!O||!z(J(O))){T(u().syncQueueListenerNo);return}if(!e.videoId){T(u().syncQueueSongsOnly);return}t("sync_queue_add",{input:e.videoId,next:e.next}).then(()=>T(e.next?u().syncQueuedNext:u().syncQueued)).catch((n)=>{console.error("[YTMD Room Sync] adding to the shared queue failed:",n),T(u().actionFailed)})}function Mn(e){let t=L;if(!t||!me||!t.isGuest())return!1;let n=b.getVideo(),i=Sn(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,me),!0}function mt(e,t,n="left"){let i=O;if(O=e,at(e?{roomCode:e.room_code,listeners:e.members.length,isHost:e.is_host}:null),Cn(),!t)return;if(!e){if(!i)return;T(n==="kicked"?u().syncKicked:n==="lost"?u().syncLost:u().syncRoomClosed);return}if(!i||i.room_code!==e.room_code){if(!e.is_host)T(u().syncConnected);return}if(e.reconnecting){if(!i.reconnecting)T(u().syncReconnecting);return}let o=(m)=>m.members.find((y)=>y.is_host)?.id;if(o(i)!==o(e)){let m=e.members.find((y)=>y.is_host);if(e.is_host)T(u().syncYouHost);else if(m)T(u().syncNewHost(m.nickname));return}if(i.reconnecting)return;let{joined:r,left:l}=$i(i.members,e.members,e.current_user_id),a=[...r.map(u().syncJoined),...l.map(u().syncLeft)],c=e.skip_votes??[],s=c.filter((m)=>m!==e.current_user_id&&!(i.skip_votes??[]).includes(m));for(let m of s){let y=e.members.find((h)=>h.id===m)?.nickname;if(y)a.push(u().syncVoteProgress(y,c.length,yn(e.members.length)))}let d=J(e);if(d!==J(i))a.push(d==="moderator"?u().syncRoleModerator:d==="listener"?u().syncRoleListener:u().syncRoleDj);if(a.length>0)T(a.join(" · "))}var In={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new En;L=t,me=e.invoke;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(r)=>{t.setRoomState(!0,r.payload.is_host,z(J(r.payload))),mt(r.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",(r)=>{t.setRoomState(!1,!1),mt(null,!0,r.payload?.reason??"left")}),window.__TAURI__.event.listen("sync-playback-remote",(r)=>{t.handleRemotePlayback(r.payload,e.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(r)=>{t.applyRemoteControl(r.payload)}),window.__TAURI__.event.listen("sync-reaction",(r)=>{Dt(r.payload.emoji,r.payload.from)}));let i=(r)=>{if(!(r.target instanceof Element))return;let l=r.target;if(l.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(De,0);if(t.isInRoom()){let d=l.closest("ytmusic-menu-service-item-renderer"),m=d?hn(d.data):null;if(m){r.preventDefault(),r.stopImmediatePropagation(),uo(),mo(m,e.invoke);return}}if(!r.isTrusted||!t.isGuest())return;let a=lo.find(([d])=>l.closest(d));if(!a)return;let c=e.getVideoElement(),s=Sn(a[1],c?c.paused:!0);if(!s)return;r.preventDefault(),r.stopImmediatePropagation(),t.requestControl(s,e.invoke)};window.addEventListener("click",i,!0);let o=setInterval(De,co);e.invoke("get_sync_room_state").then((r)=>{if(L!==t||!r||typeof r!=="object")return;let l=r;if(t.setRoomState(!0,l.is_host,z(J(l))),mt(l,!1),!l.is_host&&l.playback_state)t.handleRemotePlayback(l.playback_state,e.getVideoElement())}).catch((r)=>console.error("[YTMD Room Sync] failed to restore room state:",r)),qe=()=>{n.forEach((r)=>r.then((l)=>l())),window.removeEventListener("click",i,!0),clearInterval(o),t.setRoomState(!1,!1),L=null,me=null,O=null,pt=null,at(null),ct()}},onTrackChange(e,t){let n=L;if(!n)return;pt=e,Cn(),n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){L?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();L?.broadcastLocalState(t.track,n,t.invoke),L?.noteLocalTick(n),L?.advanceQueue(O?.queue?.length??0,n,t.invoke)},onDestroy(){if(qe)qe(),qe=null}};var ze=null,po=(e,t)=>t&&e!==!1,Ln={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,o=(y)=>{if(n===y)return;n=y,e.invoke("set_inhibit_sleep",{inhibit:y}).catch((h)=>{n=!y,console.error("[YTMD Power] set_inhibit_sleep failed:",h)})},r=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},l=()=>{t?.release().catch(()=>{}),t=null},a=()=>{let y=e.getVideoElement(),h=!!y&&!y.paused&&!y.ended,g=po(e.config.inhibit_sleep,h);if(o(g),g)r();else l()},c=(y)=>{for(let h of["play","playing","pause","ended"])y.addEventListener(h,a);i=y},s=(y)=>{for(let h of["play","playing","pause","ended"])y.removeEventListener(h,a)},d=e.getVideoElement();if(d)c(d);a();let m=window.setInterval(()=>{let y=e.getVideoElement();if(y&&y!==i){if(i)s(i);c(y),a()}},1000);ze=()=>{if(clearInterval(m),i)s(i);i=null,l(),o(!1)}},onDestroy(){if(ze)ze(),ze=null}};var An={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>yt(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},yo=`
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
`;function go(){if(document.getElementById("ytmd-qr-styles"))return;let e=document.createElement("style");e.id="ytmd-qr-styles",e.textContent=yo,document.head.appendChild(e)}async function yt(e){go();let t=p("p",{text:u().remoteBody,style:"margin: 0;"}),n=p("div",{className:"ytmd-qr-frame",text:u().remoteLoading}),i=p("div",{className:"ytmd-qr-url"}),o=Vt({id:"ytmd-remote-modal",title:u().remoteTitle,body:[t,n,i],actions:[{label:u().close}]});try{let r=await e.invoke("get_remote_info");if(!n.isConnected)return;if(r?.qr_svg){let l=p("img");l.src=`data:image/svg+xml;utf8,${encodeURIComponent(r.qr_svg)}`,l.alt=u().remoteTitle,n.replaceChildren(l)}else n.textContent=u().remoteUnavailable;if(r?.url)i.textContent=r.url}catch(r){if(console.error("[YTMD Remote] Error fetching remote info:",r),n.isConnected)n.textContent=u().remoteUnavailable}return o}function fo(e,t){if(!t||typeof t!=="object"||!("ok"in t))throw Error(`Malformed response to ${e}`);let n=t;if(!n.ok)throw Error(n.error||`${e} failed`);return n.data??null}var ho=8000,H=(e,t={},n={})=>new Promise((i,o)=>{let r=window.__TAURI__;if(!r?.event?.emit){o(Error("Tauri bridge unavailable"));return}let l=Math.random().toString(36).slice(2)+Date.now().toString(36),a=null,c=setTimeout(()=>{if(a)a();o(Error(`Timed out waiting for ${e}`))},n.timeoutMs??ho);r.event.listen(`ytmd-response-${l}`,(s)=>{if(clearTimeout(c),a)a();try{i(fo(e,s.payload))}catch(d){o(d)}}).then((s)=>(a=s,r.event.emit("ytmd-invoke",{id:l,cmd:e,args:t}))).catch((s)=>{clearTimeout(c),o(s instanceof Error?s:Error(String(s)))})});var Dn=null,pe=null,X=(e)=>{H(e).catch((t)=>{console.error(`[YTMD] ${e} failed:`,t),T(u().actionFailed)})};function bo(){dn({onSyncChipClick:()=>X("toggle_sync_window"),items:[{id:"settings",iconPath:w.tune,label:u().menuSettings,hint:"Ctrl+,",onSelect:()=>X("toggle_settings_window")},{id:"local",iconPath:w.folderMusic,label:u().menuLocal,onSelect:()=>X("toggle_local_library_window")},{id:"sync",iconPath:w.group,label:u().menuSync,onSelect:()=>X("toggle_sync_window")},{id:"remote",iconPath:w.phone,label:u().menuRemote,onSelect:()=>{if(pe)yt(pe)}},{id:"mini",iconPath:w.miniPlayer,label:u().menuMiniPlayer,onSelect:()=>X("toggle_mini_player")},{id:"download",iconPath:w.download,label:u().menuDownload,dividerBefore:!0,onSelect:()=>{if(pe)ot(pe,Dn)}}]})}var vo={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function Rn(e){let t={};for(let[n,[i,o]]of Object.entries(vo)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}async function Nn(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};bo(),st();let t=setInterval(st,1000);window.addEventListener("pagehide",()=>clearInterval(t));try{let s=await H("get_config");if(s&&typeof s==="object")Object.assign(e,s)}catch(s){console.error("[YTMD] Failed to load config, using defaults:",s)}let n={track:null,config:e,invoke:H,sendPlayerCommand:(s)=>{a(s)},getVideoElement:()=>b.getVideo()};pe=n;let i=new Ye(n);i.register(St),i.register(Ct),i.register(Ht),i.register(jt),i.register(Gt),i.register(Qt),i.register(Kt),i.register(Xt),i.register(tn),i.register(nn),i.register(on),i.register(rn),i.register(In),i.register(Ln),i.register(An);try{await i.initAll(Rn(e))}catch(s){console.error("[YTMD] Registry init error:",s)}let o=new Be,r=0,l=Date.now();o.onTrackChange(async(s)=>{Dn=s,r=s.currentTimeSecs||0,l=Date.now(),i.handleTrackChange(s);try{await H("update_track_info",{track:{title:s.title,artist:s.artist,album:s.album||null,cover_url:s.coverUrl||null,duration_secs:Math.round(s.durationSecs||0),current_time_secs:Math.round(s.currentTimeSecs||0),is_playing:s.isPlaying,video_id:s.videoId||null}})}catch(d){console.error("[YTMD] Failed to sync track info to backend:",d)}}),o.onPlaybackChange(async(s)=>{i.handlePlaybackChange(s);let d=o.getCurrentTrack();if(d){d.isPlaying=s,r=d.currentTimeSecs||0,l=Date.now();try{await H("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(d.currentTimeSecs||0),is_playing:s,video_id:d.videoId||null}})}catch(m){console.error("[YTMD] Failed to sync playback status:",m)}}}),o.onTick((s)=>{i.handleTick(s);let d=o.getCurrentTrack();if(!d||!d.isPlaying)return;let m=Date.now(),y=(m-l)/1000,h=r+y;if(Math.abs(s-h)>2||y>=15)r=s,l=m,d.currentTimeSecs=Math.round(s),H("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(s),is_playing:!0,video_id:d.videoId||null}}).catch((f)=>console.error("[YTMD] Failed to sync seek/progress to backend:",f))});function a(s){if(Mn(s))return;switch(s){case"play":b.play();break;case"pause":b.pause();break;case"play_pause":b.playPause();break;case"next":b.next();break;case"previous":b.previous();break;case"like":b.toggleLike();break;case"dislike":b.toggleDislike();break;case"mute":b.toggleMute();break}}let c=(s,d)=>{let m=window.__TAURI__;if(m?.event?.listen)m.event.listen(s,(y)=>d(y.payload))};c("player-command",(s)=>a(s)),c("tray-command",(s)=>a(s)),c("mpris-command",(s)=>a(s)),c("global-shortcut-event",(s)=>a(s)),c("player-seek",(s)=>b.seekTo(s)),c("mpris-command-seek",(s)=>b.seekTo(s)),c("player-volume",(s)=>b.setVolume(s)),c("config-updated",(s)=>{if(!s||typeof s!=="object")return;Object.assign(e,s);let d=Rn(e);for(let[m,y]of Object.entries(d))if(y)i.enable(m).catch((h)=>console.error(`[YTMD] Failed to enable plugin ${m}:`,h));else i.disable(m).catch((h)=>console.error(`[YTMD] Failed to disable plugin ${m}:`,h))}),window.addEventListener("keydown",(s)=>{if(s.ctrlKey&&s.key===","||s.key==="F2")s.preventDefault(),X("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var To=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(To)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>Nn());else Nn();})();
