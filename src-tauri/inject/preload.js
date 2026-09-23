(()=>{function ot(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}var hn=400;function bn(e,t){return e-t>=hn}class Ie{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&bn(Date.now(),this.lastTickMs))this.emitTick(n.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",c=i?.album||"",s="";if(i?.artwork&&i.artwork.length>0){let g=i.artwork[i.artwork.length-1];if(g&&g.src)s=g.src}if(!o){let g=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(g)o=g.textContent?.trim()||""}if(!r){let g=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(g){let v=(g.textContent?.trim()||"").split("•").map((w)=>w.trim());if(r=v[0]||"",v.length>1)c=v[1]}}if(!s){let g=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(g&&g.src)s=g.src}if(s.startsWith("//"))s=`https:${s}`;if(s.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(s))s=s.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let a=new URLSearchParams(window.location.search).get("v")||void 0,d=0,m=0;if(t&&typeof t.getDuration==="function"){let g=t.getDuration();if(typeof g==="number"&&Number.isFinite(g)&&g>0)d=Math.floor(g)}if(t&&typeof t.getCurrentTime==="function"){let g=t.getCurrentTime();if(typeof g==="number"&&Number.isFinite(g)&&g>=0)m=Math.floor(g)}if(!d&&e&&Number.isFinite(e.duration)&&e.duration>0)d=Math.floor(e.duration);if(!m&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)m=Math.floor(e.currentTime);let p=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(p&&p.textContent){let g=p.textContent.split("/").map((f)=>f.trim());if(g.length===2){if(!m)m=ot(g[0]);if(!d)d=ot(g[1])}}if(!d){let f=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(f){let v=parseInt(f,10);if(!isNaN(v)&&v>0)d=v}}let h=e?!e.paused&&!e.ended:!1;if(!o)return null;return{title:o,artist:r||"Unknown Artist",album:c||void 0,coverUrl:s||void 0,durationSecs:d,currentTimeSecs:m,isPlaying:h,videoId:a}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&e.durationSecs>0||!this.currentTrack.coverUrl&&!!e.coverUrl||!this.currentTrack.album&&!!e.album||!this.currentTrack.videoId&&!!e.videoId),i=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t||n){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((o)=>o(e))}if(i)this.onPlaybackChangeCallbacks.forEach((o)=>o(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function Le(){return document.getElementById("movie_player")}function rt(e){for(let t of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let n=document.querySelector(t);if(!n||!("value"in n))continue;if("step"in n&&Number(n.step)>1)n.step=1;n.value=e}}function Ae(e){let t=Le()?.getVolume?.(),n=typeof t==="number"&&Number.isFinite(t)?t:e.volume*100;return Math.max(0,Math.min(100,Math.round(n)))}function at(e){return Le()?.isMuted?.()===!0||e.muted}function se(e,t){if(!Number.isFinite(e))return;let n=Math.max(0,Math.min(100,Math.round(e))),i=Le();if(typeof i?.setVolume==="function"){if(i.setVolume(n),n>0&&i.isMuted?.())if(typeof i.unMute==="function")i.unMute();else t.muted=!1;rt(n);return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1;rt(n)}class b{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)se(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class Re{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var le=null,O={adWasShowing:!1,preAdMuted:!1},De=new WeakSet,W=null,mt=null,Ne=0,K=!0,vn=1000,Tn=(e,t,n)=>e-t>=n,kn=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",wn="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",xn=300,Sn=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,Pn=`
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
`,En=Sn+Pn,_n=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],Cn=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],Mn=(e)=>_n.some((t)=>e.includes(t)),In=(e,t)=>{let n=t.split("."),i=e;for(let r=0;r<n.length-1;r++){if(i===null||typeof i!=="object")return!1;i=i[n[r]]}let o=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,o))return delete i[o],!0;return!1},Be=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of Cn)if(In(e,n))t=!0;return t},Ln=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},st=!1,An=()=>{if(st)return;st=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let o=await t(...i);if(!K||!Mn(Ln(i[0])))return o;let r;try{r=await o.clone().json()}catch{return o}if(!Be(r))return o;let c=new Headers(o.headers);return c.delete("content-length"),c.delete("content-encoding"),new Response(JSON.stringify(r),{status:o.status,statusText:o.statusText,headers:c})};window.fetch=Object.assign(n,e)},lt=!1,Rn=()=>{if(lt)return;lt=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(K)Be(n);return n}},ct=!1,Nn=()=>{if(ct)return;ct=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(K)Be(t);e=t}})};if(typeof window<"u")An(),Rn(),Nn();var Dn=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},Vn=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},He=()=>document.getElementById("movie_player"),Bn=()=>{let e=He();if(!e)return!1;return Dn(e.classList)},Ve=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=Vn(Bn(),O,t.muted);if(O=n,i!==null)t.muted=i},dt=(e)=>{if(De.has(e))return;De.add(e),e.click()},ce=()=>{document.querySelectorAll(kn).forEach(dt),document.querySelectorAll(wn).forEach((e)=>{let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)dt(t)})},ut=(e)=>{let t=He();if(mt=t,!t)return;W?.disconnect(),W=new MutationObserver(()=>{Ve(e),ce()}),W.observe(t,{attributes:!0,attributeFilter:["class"]})},pt={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){K=!0,O={adWasShowing:!1,preAdMuted:!1},De=new WeakSet,Ne=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=En,document.head.appendChild(t);let n=null,i=new MutationObserver(()=>{if(n!==null)return;n=setTimeout(()=>{n=null,ce()},xn)});i.observe(document.body,{childList:!0,subtree:!0}),ut(e),ce(),Ve(e),le=()=>{if(K=!1,W?.disconnect(),W=null,i.disconnect(),n!==null)clearTimeout(n);document.getElementById("ytmd-adblock-styles")?.remove();let o=e.getVideoElement();if(o&&O.adWasShowing)o.muted=O.preAdMuted;O={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(He()!==mt)ut(t);Ve(t);let n=Date.now();if(Tn(n,Ne,vn))Ne=n,ce()},onDestroy(){if(le)le(),le=null}};var yt=!1;function gt(e){yt=e}function de(){return yt}var Y=[],ue="",Oe=new Set,Hn=(e,t)=>e===t,ft={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){Y=[],ue="",Oe=new Set},onTrackChange(e){if(!e.videoId||e.videoId===ue)return;let t=e.videoId;ue=t,Y=[],Oe=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(o)=>{if(!o.ok)return;let r=await o.json();if(!Hn(t,ue))return;Y=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!Y||Y.length===0||de())return;let n=Oe;for(let i of Y){let[o,r]=i.segment;if(e>=o&&e<r-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let c=t.getVideoElement();if(c)c.currentTime=r,n.add(i.UUID);break}}}};function ht(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function y(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var bt="ytmd-kit-styles",On=`
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

  @media (prefers-reduced-motion: reduce) {
    .ytmd-menu, .ytmd-toast, .ytmd-toast.ytmd-leaving, .ytmd-scrim { transition: none; animation: none; }
    #ytmd-volume-indicator { transition: none; }
  }
`;function A(){if(document.getElementById(bt))return;let e=document.createElement("style");e.id=bt,e.textContent=On,(document.head||document.documentElement).appendChild(e),Yn()}var k={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function Q(e,t=24){return ht(e,t,t)}function z(e){let t=y("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(Q(e.iconPath)),t}function kt(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(Q(t))}function wt(e,t){let n=e.querySelector("svg.ytmd-progress-ring");if(t===null){n?.remove();return}let i=17,o=2*Math.PI*i;if(!n){n=document.createElementNS("http://www.w3.org/2000/svg","svg"),n.setAttribute("class","ytmd-progress-ring"),n.setAttribute("viewBox","0 0 36 36");for(let s of["ytmd-progress-track","ytmd-progress-value"]){let l=document.createElementNS("http://www.w3.org/2000/svg","circle");l.setAttribute("class",s),l.setAttribute("cx","18"),l.setAttribute("cy","18"),l.setAttribute("r",String(i)),l.setAttribute("stroke-dasharray",String(o)),n.appendChild(l)}e.appendChild(n)}let r=Math.max(0,Math.min(1,t));n.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(o*(1-r)))}var vt=!1;function Yn(){if(vt)return;vt=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},o=(s)=>{let l=s.dataset.ytmdTooltip;if(!l)return;if(!e)e=y("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=l;let a=s.getBoundingClientRect(),d=e.getBoundingClientRect(),p=a.bottom+8+d.height<window.innerHeight?a.bottom+8:a.top-8-d.height,h=Math.max(8,Math.min(window.innerWidth-d.width-8,a.left+a.width/2-d.width/2));e.style.top=`${p}px`,e.style.left=`${h}px`,e.classList.add("ytmd-open")},r=(s)=>{let l=s.target?.closest?.("[data-ytmd-tooltip]");if(!l||l===n)return;i(),n=l,t=setTimeout(()=>o(l),250)},c=(s)=>{let l=s.relatedTarget;if(n&&l&&n.contains(l))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",c,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var D=null;function T(e,t={}){A();let n=document.getElementById("ytmd-toast-host");if(!n)n=y("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),r=o?i:y("div",{className:"ytmd-toast"});if(t.id)r.dataset.toastId=t.id;let s=[y("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:a,onClick:d}=t.action,m=y("button",{className:"ytmd-button",text:a});m.type="button",m.addEventListener("click",()=>{Tt(),d()}),s.push(m)}if(r.replaceChildren(...s),!o)n.replaceChildren(r);if(D!==null)clearTimeout(D);D=null;let l=t.durationMs??4000;if(l>0)D=setTimeout(Tt,l)}function Tt(){if(D!==null)clearTimeout(D);D=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function xt(e){A(),document.getElementById(e.id)?.remove();let t=y("div",{id:e.id,className:"ytmd-scrim"}),n=y("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=y("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),r=y("div",{className:"ytmd-dialog-body"});if(e.body)r.append(...e.body);let c=document.activeElement,s=()=>{document.removeEventListener("keydown",l,!0),t.remove(),c?.focus?.()},l=(d)=>{if(d.key==="Escape")d.stopPropagation(),s()};document.addEventListener("keydown",l,!0),t.addEventListener("click",(d)=>{if(d.target===t)s()});let a=y("div",{className:"ytmd-dialog-actions"});for(let d of e.actions){let m=y("button",{className:`ytmd-button${d.filled?" ytmd-button--filled":""}`,text:d.label});m.type="button",m.addEventListener("click",()=>d.onClick?d.onClick(s):s()),a.appendChild(m)}return n.append(o,r,a),t.appendChild(n),document.body.appendChild(t),a.querySelector("button")?.focus(),{close:s,body:r}}var St={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,downloadNoTrack:"Play a song first to download it",downloadStarted:(e)=>`Downloading “${e}”`,downloadDone:(e)=>`Downloaded “${e}”`,downloadFailed:(e)=>`Download failed: ${e}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:"Source: LRCLIB",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`},zn={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:(e)=>`Pobieranie: „${e}”`,downloadDone:(e)=>`Pobrano: „${e}”`,downloadFailed:(e)=>`Nie udało się pobrać: ${e}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:"Źródło: LRCLIB",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`},qn={en:St,pl:zn};function Un(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return qn[t]??St}var Ye=null;function u(){if(!Ye){let e=typeof document<"u"?document.documentElement.lang:"";Ye=Un(e||(typeof navigator<"u"?navigator.language:"en"))}return Ye}var E=[],X=-1,Z=null,C="",me=null,J="",Pt=(e,t)=>e===t,Ct={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){E=[],X=-1,Z=null,C="",J="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
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
    `,document.head.appendChild(t),A();let n=()=>{pe(),_t(e)},i=()=>{setTimeout(()=>{pe(),qe()},50),setTimeout(()=>{qe()},250)};document.addEventListener("click",i,!0);let o=window.setInterval(n,600);n(),me=()=>{clearInterval(o),document.removeEventListener("click",i,!0),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((c)=>c.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(C===n&&E.length>0||J===n)return;C=n,J=n,E=[],X=-1,Z=null,pe();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(y("div",{className:"ytmd-native-lyrics-status",text:u().lyricsLoading}));try{let o=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!Pt(n,C))return;if(Z=o,o?.syncedLyrics)E=Jn(o.syncedLyrics);pe(),_t(t),At(t)}catch{if(!Pt(n,C))return;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.replaceChildren(y("div",{className:"ytmd-native-lyrics-status",text:u().lyricsNone}))}finally{if(J===n)J=""}},onTick(e){if(!E||E.length===0)return;let t=ye(C),n=e+t,i=-1;for(let o=0;o<E.length;o++)if(n>=E[o].timeSecs)i=o;else break;if(i!==X&&i>=0){X=i;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o){let r=o.querySelectorAll(".ytmd-native-lyric-line");r.forEach((s,l)=>{if(l===i)s.classList.add("active");else s.classList.remove("active")});let c=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(c&&Wn(c)){let s=r[i];if(s)s.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(me)me(),me=null}},Mt="ytmd-lyrics-offsets",$n=500;function It(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function Fn(e){try{let t=e?.getItem(Mt);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function Gn(e,t,n,i){if(e.delete(t),n!==0)e.set(t,n);while(e.size>$n){let o=e.keys().next().value;if(o===void 0)break;e.delete(o)}try{i?.setItem(Mt,JSON.stringify([...e]))}catch{}}var ze=null;function Lt(){if(!ze)ze=Fn(It());return ze}function ye(e){return Lt().get(e)||0}function jn(e,t){Gn(Lt(),e,t,It())}function Et(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function Wn(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function Kn(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function pe(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(Kn(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function Qn(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function qe(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=Qn();e.style.setProperty("display",t?"flex":"none","important")}function _t(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=y("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),At(e)}qe()}function At(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(E&&E.length>0){let n=ye(C),i=y("span",{className:"ytmd-lyrics-offset-value",text:Et(n)}),o=(s)=>{let l=s===null?0:Math.round((ye(C)+s)*10)/10;jn(C,l),i.textContent=Et(l)},r=(s,l,a)=>{let d=y("button",{className:"ytmd-chip",text:s});return d.type="button",d.dataset.ytmdTooltip=l,d.setAttribute("aria-label",l),d.addEventListener("click",a),d},c=y("div",{className:"ytmd-native-lyrics-footer"});c.append(y("span",{className:"ytmd-lyrics-source",text:u().lyricsSource}),y("span",{text:u().lyricsOffset}),r("−0.5 s",u().lyricsLater,()=>o(-0.5)),i,r("+0.5 s",u().lyricsEarlier,()=>o(0.5)),r(u().lyricsReset,u().lyricsReset,()=>o(null))),t.replaceChildren(...E.map((s,l)=>{let a=y("div",{className:`ytmd-native-lyric-line${l===X?" active":""}`,text:s.text});return a.addEventListener("click",()=>{let d=e.getVideoElement();if(d){let m=ye(C);d.currentTime=Math.max(0,s.timeSecs-m)}}),a}),c)}else if(Z?.plainLyrics){let n=Z.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>y("div",{className:"ytmd-native-lyric-line ytmd-plain",text:i})),y("div",{className:"ytmd-native-lyrics-footer",text:u().lyricsSource}))}else t.replaceChildren(y("div",{className:"ytmd-native-lyrics-status",text:u().lyricsNone}))}function Jn(e){let t=e.split(`
`),n=[],i=0,o=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,r=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let c of t){let s=c.trim();if(!s)continue;let l=r.exec(s);if(l){let m=parseInt(l[1],10);if(!isNaN(m))i=m/1000;continue}let a=[],d;o.lastIndex=0;while((d=o.exec(s))!==null){let m=parseInt(d[1],10),p=parseInt(d[2],10),h=0;if(d[3])h=parseInt(d[3].padEnd(3,"0").slice(0,3),10);a.push(m*60+p+h/1000)}if(a.length>0){let m=s.replace(o,"").trim();if(m)for(let p of a)n.push({timeSecs:Math.max(0,p-i),text:m})}}return n.sort((c,s)=>c.timeSecs-s.timeSecs)}var ee=null;function te(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}var Rt={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){ee?.(),A(),document.getElementById("ytmd-volume-indicator")?.remove();let t=y("div",{id:"ytmd-volume-indicator"});document.body.appendChild(t);let n=null,i=null,o=null,r=null,c=null,s=()=>{if(c!==null)window.clearTimeout(c);c=null,t.classList.remove("ytmd-visible")},l=()=>{if(c!==null)window.clearTimeout(c);t.classList.add("ytmd-visible"),c=window.setTimeout(()=>{c=null,t.classList.remove("ytmd-visible")},1800)},a=()=>{let f=e.getVideoElement();if(!f){r=null,s();return}let v=at(f)?0:Ae(f),w=r!==null&&v!==r;r=v;let I=document.querySelector("ytmusic-player-page #main-panel");if(!te(I)){s();return}if(t.textContent!==`${v}%`)t.textContent=`${v}%`,t.setAttribute("aria-label",u().volumeLevel(v));let H=te(document.querySelector("ytmusic-player-page #song-image")),L=te(document.querySelector("ytmusic-player-page video"))||te(document.querySelector("ytmusic-player-page #movie_player")),_=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?L||H:H||L)||te(I);if(!_){s();return}let M=`${Math.max(8,_.left+12)}px`,P=`${Math.max(8,_.top+12)}px`;if(t.style.left!==M)t.style.left=M;if(t.style.top!==P)t.style.top=P;if(w)l()},d=()=>{let f=e.getVideoElement();if(f===n)return;n?.removeEventListener("volumechange",a),n=f,n?.addEventListener("volumechange",a),a()},m=()=>{let f=document.querySelector("ytmusic-player-page");if(f===i)return;if(o?.disconnect(),i=f,f)o=new MutationObserver(()=>window.requestAnimationFrame(a)),o.observe(f,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},p=(f)=>{let v=f.target;if(v instanceof Element&&v.closest("ytmusic-player-bar"))window.requestAnimationFrame(a)},h=(f)=>{if(f.deltaY===0||f.ctrlKey)return;let v=f.target;if(v instanceof Element&&v.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'))return;let w=(M)=>{if(!M)return!1;let P=M.getBoundingClientRect();return f.clientX>=P.left&&f.clientX<P.right&&f.clientY>=P.top&&f.clientY<P.bottom},I=w(document.querySelector("ytmusic-player-bar"))||w(document.querySelector("#player-bar-background")),H=e.config.wheel_volume_on_player_page===!0&&w(document.querySelector("ytmusic-player-page #main-panel"));if(!I&&!H)return;let L=e.getVideoElement();if(!L)return;let S=e.config.wheel_volume_step,_=typeof S==="number"&&Number.isFinite(S)&&S>0?Math.min(S,1):0.05;f.preventDefault(),se(Ae(L)+(f.deltaY<0?_:-_)*100,L),a()};window.addEventListener("wheel",h,{passive:!1}),window.addEventListener("resize",a),document.addEventListener("scroll",a,!0),document.addEventListener("input",p,!0),document.addEventListener("change",p,!0),m(),d();let g=window.setInterval(()=>{m(),d(),a()},500);ee=()=>{window.removeEventListener("wheel",h),window.removeEventListener("resize",a),document.removeEventListener("scroll",a,!0),document.removeEventListener("input",p,!0),document.removeEventListener("change",p,!0),window.clearInterval(g),o?.disconnect(),n?.removeEventListener("volumechange",a),s(),t.remove()}},onDestroy(){if(ee)ee(),ee=null}};var Nt={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var ge=null,Dt={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);ge=()=>{t?.remove()}},onDestroy(){if(ge)ge(),ge=null}};var fe=[32,64,125,250,500,1000,2000,4000,8000,16000],Ue={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function ne(e){return Math.max(-24,Math.min(24,e))}function Xn(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function Zn(e){return Math.max(0.5,Math.min(2,e))}class x{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=fe.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!x.instance)x.instance=new x;return x.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=fe.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===fe.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=ne(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=ne(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=ne(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,ne(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=Ue[e]||Ue.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),Xn(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=Zn(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??b.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class $e{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)x.getInstance().fadeIn(this.crossfadeSeconds);else x.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),x.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),x.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),b.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class Fe{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=x.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,b.next()}else this.consecutiveSilentTicks=0}}var V=null,q=null,he=null;function ei(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var Vt={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=x.getInstance(),n=new $e,i=new Fe;V=n,q=i;let o=e.config,r=null,c=()=>{if(r!==null)return;let l=e.getVideoElement();if(l){if(!t.isInitializedFor(l))t.init(l);return}r=window.setInterval(()=>{let a=e.getVideoElement();if(a){if(r!==null)clearInterval(r);r=null,t.init(a)}},500)};if(ei(o))c();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let s=[];if(window.__TAURI__?.event){let{listen:l}=window.__TAURI__.event;s.push(l("set-eq-band",(a)=>{c(),t.setBandGain(a.payload.bandIndex,a.payload.gain)}),l("set-eq-all",(a)=>{c(),t.setAllGains(a.payload.gains)}),l("set-eq-preset",(a)=>{c(),t.applyPreset(a.payload)}),l("set-preamp",(a)=>{c(),t.setPreamp(a.payload)}),l("set-loudness-normalization",(a)=>{if(a.payload)c();t.setLoudnessNormalization(a.payload)}),l("set-crossfade-seconds",(a)=>{if(a.payload>0)c();n.setCrossfadeSeconds(a.payload)}),l("set-skip-silence",(a)=>{if(a.payload)c();i.setEnabled(a.payload)}),l("set-playback-rate",(a)=>{t.setPlaybackRate(a.payload)}),l("set-preserves-pitch",(a)=>{t.setPreservesPitch(a.payload)}))}he=()=>{if(r!==null)clearInterval(r),r=null;s.forEach((l)=>l.then((a)=>a())),V?.destroy(),V=null,q=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(x.getInstance().applyRateAndPitch(),V)V.onTrackChange(e);if(q)q.onTrackChange()},onTick(e,t){if(de())return;if(V)V.onTick(e,t.track);if(q)q.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(he)he(),he=null}};var Ge=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function Bt(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let c=r.getImageData(0,0,16,16).data,s=0,l=0,a=0,d=0,m=0,p=0,h=0,g=0;for(let S=0;S<c.length;S+=4){let _=c[S],M=c[S+1],P=c[S+2];if(c[S+3]<128)continue;let it=(_+M+P)/3;if(it<20||it>240)continue;if(S<c.length/2)s+=_,l+=M,a+=P,d++;else m+=_,p+=M,h+=P,g++}if(d===0&&g===0){t(n);return}let f=d>0?Math.round(s/d):220,v=d>0?Math.round(l/d):38,w=d>0?Math.round(a/d):38,I=g>0?Math.round(m/g):24,H=g>0?Math.round(p/g):24,L=g>0?Math.round(h/g):27;t({primary:Ge(f,v,w),secondary:Ge(I,H,L),accent:Ge(f+30,v+30,w+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var R=48,ti=3,ni=3,ii=1.65,oi=0.55;function ri(e,t,n,i){let o=new Float32Array(e.length),r=(c,s,l)=>{let a=l?n:t,d=l?t:n;for(let m=0;m<a;m++)for(let p=0;p<4;p++)for(let h=0;h<d;h++){let g=0,f=0;for(let w=Math.max(0,h-i);w<=Math.min(d-1,h+i);w++){let I=l?(m*t+w)*4+p:(w*t+m)*4+p;g+=c[I],f++}let v=l?(m*t+h)*4+p:(h*t+m)*4+p;s[v]=g/f}};r(e,o,!0),r(o,e,!1)}function ai(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],c=e[i+2],s=0.2126*o+0.7152*r+0.0722*c;e[i]=(s+(o-s)*t)*n,e[i+1]=(s+(r-s)*t)*n,e[i+2]=(s+(c-s)*t)*n}}async function Ht(e,t=oi){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=R,o.height=R;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,R,R);let c=r.getImageData(0,0,R,R);for(let s=0;s<ni;s++)ri(c.data,R,R,ti);ai(c.data,ii,t),r.putImageData(c,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var be=null,ve=null,Te,Ot={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=y("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=y("img",{id:"ytmd-ambient-cover"});n.alt="";let i=y("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,c=document.createElement("style");c.id="ytmd-ambient-styles",c.textContent=`
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
    `,document.head.appendChild(c),be=(l)=>{if(t)t.style.opacity=String(l)};let s=[];if(window.__TAURI__?.event)s.push(window.__TAURI__.event.listen("set-ambient-intensity",(l)=>{be?.(l.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(l)=>{let a=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;be?.(l.payload?a:0)}));if(ve=()=>{s.forEach((l)=>l.then((a)=>a())),be=null,Te=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===Te)return;Te=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await Ht(t):null;if(t!==Te)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await Bt(t||""),o=document.documentElement.style;o.setProperty("--ytmd-accent",i.accent),o.setProperty("--ytmd-accent-primary",i.primary),o.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(ve)ve(),ve=null}};var Yt=`
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

`,zt=`
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

`;var ke=null,qt={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let l=document.getElementById(s);if(!l){l=document.createElement("style"),l.id=s;let a=t();if(a)a.appendChild(l)}return l},i=(s)=>{let l=n("ytmd-active-theme");l.textContent=s?Yt:zt},o=(s)=>{let l=n("ytmd-custom-css");if(l)l.textContent=s};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let c=[];if(window.__TAURI__?.event)c.push(window.__TAURI__.event.listen("set-ambient-enabled",(s)=>{i(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{o(s.payload)}));ke=()=>{c.forEach((s)=>s.then((l)=>l()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(ke)ke(),ke=null}};var we=null,Ut={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=z({id:"ytmd-pip-btn",label:u().pipButton,iconPath:k.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(c){console.warn("[YTMD PiP] Could not enter PiP:",c),await e.invoke("toggle_mini_player").catch((s)=>console.error("[YTMD PiP] Mini player fallback failed:",s))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),we=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(we)we(),we=null}};function si(e){if(e.error)return"failed";if(e.output_path&&e.percent>=100)return"done";return"progress"}var Se="ytmd-download-btn",li=3000,U=new Map,je=new Set,Pe=null,xe=null;function F(){let e=document.getElementById(Se);if(!e)return;let t=Pe?.videoId,n=t?U.get(t):void 0;wt(e,n?Math.max(0.05,n.fraction):null),kt(e,t&&je.has(t)?k.check:k.download),e.setAttribute("aria-disabled",t?"false":"true");let i=n?u().downloadInProgress:u().downloadButton;e.setAttribute("aria-label",i),e.dataset.ytmdTooltip=i}function We(e,t){let n=U.get(e);if(!n)return;if(U.delete(e),t.ok)je.add(e),setTimeout(()=>{je.delete(e),F()},li),T(u().downloadDone(n.title),{id:`download-${e}`});else T(u().downloadFailed(t.reason),{id:`download-${e}`,durationMs:8000});F()}function ci(e){let t=U.get(e.video_id);if(!t)return;let n=si(e);if(n==="failed")We(e.video_id,{ok:!1,reason:e.error||e.status});else if(n==="done")We(e.video_id,{ok:!0});else t.fraction=e.percent/100,F()}function Ke(e,t){let n=t?.videoId;if(!t||!n){T(u().downloadNoTrack);return}if(U.has(n)){T(u().downloadInProgress);return}U.set(n,{title:t.title,fraction:0}),F(),T(u().downloadStarted(t.title),{id:`download-${n}`}),e.invoke("download_track",{request:{video_id:n,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:e.config.download_format||"mp3",embed_lyrics:e.config.embed_lyrics!==!1}}).catch((i)=>{console.error("[YTMD Downloader] Download failed:",i),We(n,{ok:!1,reason:i instanceof Error?i.message:String(i)})})}var $t={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){Pe=e.track;let t=()=>{if(document.getElementById(Se))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!o)return;let r=z({id:Se,label:u().downloadButton,iconPath:k.download});r.addEventListener("click",()=>{if(r.getAttribute("aria-disabled")==="true")return;Ke(e,Pe)}),o.appendChild(r),F()},n=window.setInterval(t,1000);t();let i=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(o)=>ci(o.payload)):null;xe=()=>{clearInterval(n),i?.then((o)=>o()),document.getElementById(Se)?.remove()}},onTrackChange(e){Pe=e,F()},onDestroy(){if(xe)xe(),xe=null}};var Ft={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};var Ee="ytmd-nav-slot",Qe="ytmd-menu-btn",oe="ytmd-menu",Gt="ytmd-sync-chip",Wt=[],ie=null,Kt=null,jt=!1,di=`
  #${Ee} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function ui(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=di,document.head.appendChild(e)}function mi(e){if(!e)return;return`${u().syncInRoom} · ${u().syncListeners(e.listeners)}`}function Qt(e){Wt=e.items,Kt=e.onSyncChipClick}function Je(){if(document.getElementById(Ee)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;A(),ui();let t=y("div",{id:Ee}),n=z({id:Qe,label:u().menuLabel,iconPath:k.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),yi(n)}),t.appendChild(n),e.prepend(t),Jt(),fi()}function Xe(e){ie=e,Jt();let t=document.getElementById(oe);if(t?.classList.contains("ytmd-open"))Xt(t)}function Jt(){let e=document.getElementById(Ee);if(!e)return;let t=document.getElementById(Gt);if(!ie){t?.remove();return}if(!t)t=y("button",{id:Gt,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>Kt?.()),e.prepend(t);let n=u().syncListeners(ie.listeners);t.replaceChildren(y("span",{className:"ytmd-chip-dot"}),Q(k.group,18),y("span",{text:n})),t.dataset.ytmdTooltip=`${u().syncInRoom} · ${ie.roomCode}`,t.setAttribute("aria-label",`${u().syncInRoom}, ${n}`)}function Xt(e){let t=[];for(let n of Wt){if(n.dividerBefore)t.push(y("div",{className:"ytmd-menu-divider"}));let i=y("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=y("span",{className:"ytmd-menu-item-text"});o.appendChild(y("span",{text:n.label}));let r=n.id==="sync"?mi(ie):void 0;if(r)o.appendChild(y("span",{className:"ytmd-menu-item-sub",text:r}));if(i.append(Q(n.iconPath),o),n.hint)i.appendChild(y("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{G(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function pi(){let e=document.getElementById(oe);if(!e)e=y("div",{id:oe,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",gi),document.body.appendChild(e);return e}function yi(e){let t=pi();if(t.classList.contains("ytmd-open")){G();return}Xt(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function G(){let e=document.getElementById(oe);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById(Qe);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function gi(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),G();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")G()}function fi(){if(jt)return;jt=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(oe);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(Qe)?.contains(n))return;G()}),window.addEventListener("resize",G)}function hi(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var re=/^[A-Za-z0-9_-]{11}$/,bi=2,vi=0.25,Ti=0.05,ki=3,Zt=0.1,wi=0.5,xi=1,Si=1000,Pi=1,Ei=5000,_i=4000,en=15000,Ci=3,Mi=4000,tn=1,Ii=1e4,Li=5,Ai=1e4;function nn(e,t){return Number.isFinite(t)&&t>tn?Math.min(e,t-tn):e}function Ri(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(re.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>wi)i.seekTo=nn(e.current_time_secs,t.duration);return i}let o=e.current_time_secs+Math.min(xi,Math.max(0,n)),r=o-t.currentTime;if(Math.abs(r)>bi)i.seekTo=nn(o,t.duration);else if(Math.abs(r)>(t.correcting?Ti:vi))i.playbackRate=1+Math.max(-Zt,Math.min(Zt,r/ki));return i}class an{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function Ni(e,t){return t!==null&&e<t&&t-e<Ai}function sn(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var Di=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function ln(){return new URLSearchParams(window.location.search).get("v")}function Ze(e){let t=document.getElementById("movie_player"),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&re.test(n)&&typeof i==="number"&&Number.isFinite(i))return{videoId:n,currentTime:i};return{videoId:ln(),currentTime:e?e.currentTime:0}}function on(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function rn(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class cn{isHost=!1;inRoom=!1;lastBroadcast=null;pendingNav=null;transit=new an;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;finished=null;rateCorrection=null;setRoomState(e,t){let n=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,gt(this.isGuest()),!n)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||on())return;if(Ni(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(re.test(e.video_id))this.hostVideoId=e.video_id;let o=this.requestedVideo;if(o){if(e.video_id!==o.videoId&&n-o.atMs<_i)return;this.requestedVideo=null}let r=Ze(t);if(this.waitingForHostsNext(e,r.videoId,t,n)){this.endRateCorrection(),b.pause();return}let c={videoId:r.videoId,paused:t?t.paused:!0,currentTime:r.currentTime,duration:t?t.duration:NaN,correcting:this.rateCorrection!==null},s=Ri(e,c,i);if(s.navigateTo){this.endRateCorrection();let l=this.pendingNav;if(l&&l.videoId===s.navigateTo&&n-l.atMs<Ei)return;let a=l&&l.videoId===s.navigateTo?l.attempts+1:1;if(this.pendingNav={videoId:s.navigateTo,atMs:n,attempts:a},this.rememberOwnNav(s.navigateTo,n),b.pause(),a>1)window.location.href=`https://music.youtube.com/watch?v=${s.navigateTo}`;else rn(s.navigateTo);return}if(this.pendingNav=null,!t)return;if(s.setPlaying===!0)b.play();else if(s.setPlaying===!1)b.pause();if(s.seekTo!==null)this.endRateCorrection(),b.seekTo(s.seekTo);else this.setCatchUpRate(t,s.playbackRate)}waitingForHostsNext(e,t,n,i){let o=this.finished;return!!o&&e.video_id===o.videoId&&i-o.atMs<Ii&&o.duration-e.current_time_secs<Li&&(t!==o.videoId||!!n?.ended)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>en)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;if(Number.isFinite(e.duration)&&e.duration>0&&e.duration-e.currentTime<Ci){this.nearEndAtMs=t;let{videoId:n}=Ze(e);if(n)this.finished={videoId:n,duration:e.duration,atMs:t}}}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!e||!re.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<en)return null;if(t-this.nearEndAtMs<Mi)return null;if(this.requestedVideo?.videoId===e)return null;return this.requestedVideo={videoId:e,atMs:t},{kind:"play_video",video_id:e}}requestControl(e,t){t("send_sync_control",{action:e}).catch((n)=>{console.error("[YTMD Room Sync] control request failed:",n),T(u().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n}=e;switch(n.kind){case"next":b.next(),T(u().syncGuestNext(t));break;case"previous":b.previous(),T(u().syncGuestPrevious(t));break;case"set_playing":{let i=b.getVideo();if(!i||i.paused!==n.playing)return;if(n.playing)b.play();else b.pause();T(n.playing?u().syncGuestResumed(t):u().syncGuestPaused(t));break}case"play_video":if(!re.test(n.video_id)||n.video_id===ln())return;rn(n.video_id),T(u().syncGuestPicked(t));break}}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||on())return;if(t.ended)return;let{videoId:o,currentTime:r}=Ze(t);if(!o)return;let c=Date.now(),s=this.lastBroadcast,l=s?s.position+(c-s.atMs)/1000*s.rate:0,a=!!s&&s.playing&&!t.paused&&Math.abs(r-l)>Pi,d=!!s&&s.videoId!==o;if(!i&&!a&&!d&&s&&c-s.atMs<Si)return;this.lastBroadcast={atMs:c,videoId:o,position:r,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:o,title:e.title,artist:e.artist,current_time_secs:r,is_playing:!t.paused,timestamp_ms:c}}).catch((m)=>console.error("[YTMD Room Sync] broadcast failed:",m))}}var N=null,Ce=null,_e=null,tt=null;function dn(e){let t=N;if(!t||!Ce||!t.isGuest())return!1;let n=b.getVideo(),i=sn(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,Ce),!0}function et(e,t){let n=tt;if(tt=e,Xe(e?{roomCode:e.room_code,listeners:e.members.length,isHost:e.is_host}:null),!t)return;if(!e){if(n)T(u().syncRoomClosed);return}if(!n||n.room_code!==e.room_code){if(!e.is_host)T(u().syncConnected);return}let{joined:i,left:o}=hi(n.members,e.members,e.current_user_id),r=[...i.map(u().syncJoined),...o.map(u().syncLeft)];if(r.length>0)T(r.join(" · "))}var un={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new cn;N=t,Ce=e.invoke;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(o)=>{t.setRoomState(!0,o.payload.is_host),et(o.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1),et(null,!0)}),window.__TAURI__.event.listen("sync-playback-remote",(o)=>{t.handleRemotePlayback(o.payload,e.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(o)=>{t.applyRemoteControl(o.payload)}));let i=(o)=>{if(!o.isTrusted||!t.isGuest()||!(o.target instanceof Element))return;let r=o.target,c=Di.find(([a])=>r.closest(a));if(!c)return;let s=e.getVideoElement(),l=sn(c[1],s?s.paused:!0);if(!l)return;o.preventDefault(),o.stopImmediatePropagation(),t.requestControl(l,e.invoke)};window.addEventListener("click",i,!0),e.invoke("get_sync_room_state").then((o)=>{if(N!==t||!o||typeof o!=="object")return;let r=o;if(t.setRoomState(!0,r.is_host),et(r,!1),!r.is_host&&r.playback_state)t.handleRemotePlayback(r.playback_state,e.getVideoElement())}).catch((o)=>console.error("[YTMD Room Sync] failed to restore room state:",o)),_e=()=>{n.forEach((o)=>o.then((r)=>r())),window.removeEventListener("click",i,!0),t.setRoomState(!1,!1),N=null,Ce=null,tt=null,Xe(null)}},onTrackChange(e,t){let n=N;if(!n)return;n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){N?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();N?.broadcastLocalState(t.track,n,t.invoke),N?.noteLocalTick(n)},onDestroy(){if(_e)_e(),_e=null}};var Me=null,Vi=(e,t)=>t&&e!==!1,mn={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,o=(p)=>{if(n===p)return;n=p,e.invoke("set_inhibit_sleep",{inhibit:p}).catch((h)=>{n=!p,console.error("[YTMD Power] set_inhibit_sleep failed:",h)})},r=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},c=()=>{t?.release().catch(()=>{}),t=null},s=()=>{let p=e.getVideoElement(),h=!!p&&!p.paused&&!p.ended,g=Vi(e.config.inhibit_sleep,h);if(o(g),g)r();else c()},l=(p)=>{for(let h of["play","playing","pause","ended"])p.addEventListener(h,s);i=p},a=(p)=>{for(let h of["play","playing","pause","ended"])p.removeEventListener(h,s)},d=e.getVideoElement();if(d)l(d);s();let m=window.setInterval(()=>{let p=e.getVideoElement();if(p&&p!==i){if(i)a(i);l(p),s()}},1000);Me=()=>{if(clearInterval(m),i)a(i);i=null,c(),o(!1)}},onDestroy(){if(Me)Me(),Me=null}};var pn={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>nt(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},Bi=`
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
`;function Hi(){if(document.getElementById("ytmd-qr-styles"))return;let e=document.createElement("style");e.id="ytmd-qr-styles",e.textContent=Bi,document.head.appendChild(e)}async function nt(e){Hi();let t=y("p",{text:u().remoteBody,style:"margin: 0;"}),n=y("div",{className:"ytmd-qr-frame",text:u().remoteLoading}),i=y("div",{className:"ytmd-qr-url"}),o=xt({id:"ytmd-remote-modal",title:u().remoteTitle,body:[t,n,i],actions:[{label:u().close}]});try{let r=await e.invoke("get_remote_info");if(!n.isConnected)return;if(r?.qr_svg){let c=y("img");c.src=`data:image/svg+xml;utf8,${encodeURIComponent(r.qr_svg)}`,c.alt=u().remoteTitle,n.replaceChildren(c)}else n.textContent=u().remoteUnavailable;if(r?.url)i.textContent=r.url}catch(r){if(console.error("[YTMD Remote] Error fetching remote info:",r),n.isConnected)n.textContent=u().remoteUnavailable}return o}function Oi(e,t){if(!t||typeof t!=="object"||!("ok"in t))throw Error(`Malformed response to ${e}`);let n=t;if(!n.ok)throw Error(n.error||`${e} failed`);return n.data??null}var Yi=8000,B=(e,t={},n={})=>new Promise((i,o)=>{let r=window.__TAURI__;if(!r?.event?.emit){o(Error("Tauri bridge unavailable"));return}let c=Math.random().toString(36).slice(2)+Date.now().toString(36),s=null,l=setTimeout(()=>{if(s)s();o(Error(`Timed out waiting for ${e}`))},n.timeoutMs??Yi);r.event.listen(`ytmd-response-${c}`,(a)=>{if(clearTimeout(l),s)s();try{i(Oi(e,a.payload))}catch(d){o(d)}}).then((a)=>(s=a,r.event.emit("ytmd-invoke",{id:c,cmd:e,args:t}))).catch((a)=>{clearTimeout(l),o(a instanceof Error?a:Error(String(a)))})});var fn=null,ae=null,j=(e)=>{B(e).catch((t)=>{console.error(`[YTMD] ${e} failed:`,t),T(u().actionFailed)})};function zi(){Qt({onSyncChipClick:()=>j("toggle_sync_window"),items:[{id:"settings",iconPath:k.tune,label:u().menuSettings,hint:"Ctrl+,",onSelect:()=>j("toggle_settings_window")},{id:"local",iconPath:k.folderMusic,label:u().menuLocal,onSelect:()=>j("toggle_local_library_window")},{id:"sync",iconPath:k.group,label:u().menuSync,onSelect:()=>j("toggle_sync_window")},{id:"remote",iconPath:k.phone,label:u().menuRemote,onSelect:()=>{if(ae)nt(ae)}},{id:"mini",iconPath:k.miniPlayer,label:u().menuMiniPlayer,onSelect:()=>j("toggle_mini_player")},{id:"download",iconPath:k.download,label:u().menuDownload,dividerBefore:!0,onSelect:()=>{if(ae)Ke(ae,fn)}}]})}var qi={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function yn(e){let t={};for(let[n,[i,o]]of Object.entries(qi)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}async function gn(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};zi(),Je();let t=setInterval(Je,1000);window.addEventListener("pagehide",()=>clearInterval(t));try{let a=await B("get_config");if(a&&typeof a==="object")Object.assign(e,a)}catch(a){console.error("[YTMD] Failed to load config, using defaults:",a)}let n={track:null,config:e,invoke:B,sendPlayerCommand:(a)=>{s(a)},getVideoElement:()=>b.getVideo()};ae=n;let i=new Re(n);i.register(pt),i.register(ft),i.register(Ct),i.register(Rt),i.register(Nt),i.register(Dt),i.register(Vt),i.register(Ot),i.register(qt),i.register(Ut),i.register($t),i.register(Ft),i.register(un),i.register(mn),i.register(pn);try{await i.initAll(yn(e))}catch(a){console.error("[YTMD] Registry init error:",a)}let o=new Ie,r=0,c=Date.now();o.onTrackChange(async(a)=>{fn=a,r=a.currentTimeSecs||0,c=Date.now(),i.handleTrackChange(a);try{await B("update_track_info",{track:{title:a.title,artist:a.artist,album:a.album||null,cover_url:a.coverUrl||null,duration_secs:Math.round(a.durationSecs||0),current_time_secs:Math.round(a.currentTimeSecs||0),is_playing:a.isPlaying,video_id:a.videoId||null}})}catch(d){console.error("[YTMD] Failed to sync track info to backend:",d)}}),o.onPlaybackChange(async(a)=>{i.handlePlaybackChange(a);let d=o.getCurrentTrack();if(d){d.isPlaying=a,r=d.currentTimeSecs||0,c=Date.now();try{await B("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(d.currentTimeSecs||0),is_playing:a,video_id:d.videoId||null}})}catch(m){console.error("[YTMD] Failed to sync playback status:",m)}}}),o.onTick((a)=>{i.handleTick(a);let d=o.getCurrentTrack();if(!d||!d.isPlaying)return;let m=Date.now(),p=(m-c)/1000,h=r+p;if(Math.abs(a-h)>2||p>=15)r=a,c=m,d.currentTimeSecs=Math.round(a),B("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(a),is_playing:!0,video_id:d.videoId||null}}).catch((f)=>console.error("[YTMD] Failed to sync seek/progress to backend:",f))});function s(a){if(dn(a))return;switch(a){case"play":b.play();break;case"pause":b.pause();break;case"play_pause":b.playPause();break;case"next":b.next();break;case"previous":b.previous();break;case"like":b.toggleLike();break;case"dislike":b.toggleDislike();break;case"mute":b.toggleMute();break}}let l=(a,d)=>{let m=window.__TAURI__;if(m?.event?.listen)m.event.listen(a,(p)=>d(p.payload))};l("player-command",(a)=>s(a)),l("tray-command",(a)=>s(a)),l("mpris-command",(a)=>s(a)),l("global-shortcut-event",(a)=>s(a)),l("player-seek",(a)=>b.seekTo(a)),l("mpris-command-seek",(a)=>b.seekTo(a)),l("player-volume",(a)=>b.setVolume(a)),l("config-updated",(a)=>{if(!a||typeof a!=="object")return;Object.assign(e,a);let d=yn(e);for(let[m,p]of Object.entries(d))if(p)i.enable(m).catch((h)=>console.error(`[YTMD] Failed to enable plugin ${m}:`,h));else i.disable(m).catch((h)=>console.error(`[YTMD] Failed to disable plugin ${m}:`,h))}),window.addEventListener("keydown",(a)=>{if(a.ctrlKey&&a.key===","||a.key==="F2")a.preventDefault(),j("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var Ui=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(Ui)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>gn());else gn();})();
