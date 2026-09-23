function Je(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}var ln=400;function cn(e,t){return e-t>=ln}class Ce{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&cn(Date.now(),this.lastTickMs))this.emitTick(n.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",c=i?.album||"",s="";if(i?.artwork&&i.artwork.length>0){let g=i.artwork[i.artwork.length-1];if(g&&g.src)s=g.src}if(!o){let g=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(g)o=g.textContent?.trim()||""}if(!r){let g=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(g){let w=(g.textContent?.trim()||"").split("•").map((P)=>P.trim());if(r=w[0]||"",w.length>1)c=w[1]}}if(!s){let g=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(g&&g.src)s=g.src}if(s.startsWith("//"))s=`https:${s}`;if(s.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(s))s=s.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let a=new URLSearchParams(window.location.search).get("v")||void 0,d=0,m=0;if(t&&typeof t.getDuration==="function"){let g=t.getDuration();if(typeof g==="number"&&Number.isFinite(g)&&g>0)d=Math.floor(g)}if(t&&typeof t.getCurrentTime==="function"){let g=t.getCurrentTime();if(typeof g==="number"&&Number.isFinite(g)&&g>=0)m=Math.floor(g)}if(!d&&e&&Number.isFinite(e.duration)&&e.duration>0)d=Math.floor(e.duration);if(!m&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)m=Math.floor(e.currentTime);let y=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(y&&y.textContent){let g=y.textContent.split("/").map((k)=>k.trim());if(g.length===2){if(!m)m=Je(g[0]);if(!d)d=Je(g[1])}}if(!d){let k=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(k){let w=parseInt(k,10);if(!isNaN(w)&&w>0)d=w}}let f=e?!e.paused&&!e.ended:!1;if(!o)return null;return{title:o,artist:r||"Unknown Artist",album:c||void 0,coverUrl:s||void 0,durationSecs:d,currentTimeSecs:m,isPlaying:f,videoId:a}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&e.durationSecs>0||!this.currentTrack.coverUrl&&!!e.coverUrl||!this.currentTrack.album&&!!e.album||!this.currentTrack.videoId&&!!e.videoId),i=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t||n){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((o)=>o(e))}if(i)this.onPlaybackChangeCallbacks.forEach((o)=>o(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}class h{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class _e{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var X=null,L={adWasShowing:!1,preAdMuted:!1},Me=new WeakSet,H=null,it=null,Ee=0,q=!0,dn=1000,un=(e,t,n)=>e-t>=n,mn=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",pn="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",yn=300,gn=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,fn=`
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
`,hn=gn+fn,bn=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],vn=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],Tn=(e)=>bn.some((t)=>e.includes(t)),kn=(e,t)=>{let n=t.split("."),i=e;for(let r=0;r<n.length-1;r++){if(i===null||typeof i!=="object")return!1;i=i[n[r]]}let o=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,o))return delete i[o],!0;return!1},Ae=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of vn)if(kn(e,n))t=!0;return t},wn=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},Xe=!1,xn=()=>{if(Xe)return;Xe=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let o=await t(...i);if(!q||!Tn(wn(i[0])))return o;let r;try{r=await o.clone().json()}catch{return o}if(!Ae(r))return o;let c=new Headers(o.headers);return c.delete("content-length"),c.delete("content-encoding"),new Response(JSON.stringify(r),{status:o.status,statusText:o.statusText,headers:c})};window.fetch=Object.assign(n,e)},Ze=!1,Sn=()=>{if(Ze)return;Ze=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(q)Ae(n);return n}},et=!1,Pn=()=>{if(et)return;et=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(q)Ae(t);e=t}})};if(typeof window<"u")xn(),Sn(),Pn();var Cn=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},_n=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},Le=()=>document.getElementById("movie_player"),En=()=>{let e=Le();if(!e)return!1;return Cn(e.classList)},Ie=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=_n(En(),L,t.muted);if(L=n,i!==null)t.muted=i},tt=(e)=>{if(Me.has(e))return;Me.add(e),e.click()},Z=()=>{document.querySelectorAll(mn).forEach(tt),document.querySelectorAll(pn).forEach((e)=>{let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)tt(t)})},nt=(e)=>{let t=Le();if(it=t,!t)return;H?.disconnect(),H=new MutationObserver(()=>{Ie(e),Z()}),H.observe(t,{attributes:!0,attributeFilter:["class"]})},ot={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){q=!0,L={adWasShowing:!1,preAdMuted:!1},Me=new WeakSet,Ee=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=hn,document.head.appendChild(t);let n=null,i=new MutationObserver(()=>{if(n!==null)return;n=setTimeout(()=>{n=null,Z()},yn)});i.observe(document.body,{childList:!0,subtree:!0}),nt(e),Z(),Ie(e),X=()=>{if(q=!1,H?.disconnect(),H=null,i.disconnect(),n!==null)clearTimeout(n);document.getElementById("ytmd-adblock-styles")?.remove();let o=e.getVideoElement();if(o&&L.adWasShowing)o.muted=L.preAdMuted;L={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(Le()!==it)nt(t);Ie(t);let n=Date.now();if(un(n,Ee,dn))Ee=n,Z()},onDestroy(){if(X)X(),X=null}};var rt=!1;function at(e){rt=e}function ee(){return rt}var R=[],te="",Re=new Set,Mn=(e,t)=>e===t,st={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){R=[],te="",Re=new Set},onTrackChange(e){if(!e.videoId||e.videoId===te)return;let t=e.videoId;te=t,R=[],Re=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(o)=>{if(!o.ok)return;let r=await o.json();if(!Mn(t,te))return;R=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!R||R.length===0||ee())return;let n=Re;for(let i of R){let[o,r]=i.segment;if(e>=o&&e<r-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let c=t.getVideoElement();if(c)c.currentTime=r,n.add(i.UUID);break}}}};function lt(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function p(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var ct="ytmd-kit-styles",In=`
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
`;function N(){if(document.getElementById(ct))return;let e=document.createElement("style");e.id=ct,e.textContent=In,(document.head||document.documentElement).appendChild(e),An()}var v={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function U(e,t=24){return lt(e,t,t)}function D(e){let t=p("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(U(e.iconPath)),t}function mt(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(U(t))}function pt(e,t){let n=e.querySelector("svg.ytmd-progress-ring");if(t===null){n?.remove();return}let i=17,o=2*Math.PI*i;if(!n){n=document.createElementNS("http://www.w3.org/2000/svg","svg"),n.setAttribute("class","ytmd-progress-ring"),n.setAttribute("viewBox","0 0 36 36");for(let s of["ytmd-progress-track","ytmd-progress-value"]){let l=document.createElementNS("http://www.w3.org/2000/svg","circle");l.setAttribute("class",s),l.setAttribute("cx","18"),l.setAttribute("cy","18"),l.setAttribute("r",String(i)),l.setAttribute("stroke-dasharray",String(o)),n.appendChild(l)}e.appendChild(n)}let r=Math.max(0,Math.min(1,t));n.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(o*(1-r)))}var dt=!1;function An(){if(dt)return;dt=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},o=(s)=>{let l=s.dataset.ytmdTooltip;if(!l)return;if(!e)e=p("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=l;let a=s.getBoundingClientRect(),d=e.getBoundingClientRect(),y=a.bottom+8+d.height<window.innerHeight?a.bottom+8:a.top-8-d.height,f=Math.max(8,Math.min(window.innerWidth-d.width-8,a.left+a.width/2-d.width/2));e.style.top=`${y}px`,e.style.left=`${f}px`,e.classList.add("ytmd-open")},r=(s)=>{let l=s.target?.closest?.("[data-ytmd-tooltip]");if(!l||l===n)return;i(),n=l,t=setTimeout(()=>o(l),250)},c=(s)=>{let l=s.relatedTarget;if(n&&l&&n.contains(l))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",c,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var M=null;function b(e,t={}){N();let n=document.getElementById("ytmd-toast-host");if(!n)n=p("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),r=o?i:p("div",{className:"ytmd-toast"});if(t.id)r.dataset.toastId=t.id;let s=[p("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:a,onClick:d}=t.action,m=p("button",{className:"ytmd-button",text:a});m.type="button",m.addEventListener("click",()=>{ut(),d()}),s.push(m)}if(r.replaceChildren(...s),!o)n.replaceChildren(r);if(M!==null)clearTimeout(M);M=null;let l=t.durationMs??4000;if(l>0)M=setTimeout(ut,l)}function ut(){if(M!==null)clearTimeout(M);M=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function yt(e){N(),document.getElementById(e.id)?.remove();let t=p("div",{id:e.id,className:"ytmd-scrim"}),n=p("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=p("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),r=p("div",{className:"ytmd-dialog-body"});if(e.body)r.append(...e.body);let c=document.activeElement,s=()=>{document.removeEventListener("keydown",l,!0),t.remove(),c?.focus?.()},l=(d)=>{if(d.key==="Escape")d.stopPropagation(),s()};document.addEventListener("keydown",l,!0),t.addEventListener("click",(d)=>{if(d.target===t)s()});let a=p("div",{className:"ytmd-dialog-actions"});for(let d of e.actions){let m=p("button",{className:`ytmd-button${d.filled?" ytmd-button--filled":""}`,text:d.label});m.type="button",m.addEventListener("click",()=>d.onClick?d.onClick(s):s()),a.appendChild(m)}return n.append(o,r,a),t.appendChild(n),document.body.appendChild(t),a.querySelector("button")?.focus(),{close:s,body:r}}var gt={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,downloadNoTrack:"Play a song first to download it",downloadStarted:(e)=>`Downloading “${e}”`,downloadDone:(e)=>`Downloaded “${e}”`,downloadFailed:(e)=>`Download failed: ${e}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:"Source: LRCLIB",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again."},Ln={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:(e)=>`Pobieranie: „${e}”`,downloadDone:(e)=>`Pobrano: „${e}”`,downloadFailed:(e)=>`Nie udało się pobrać: ${e}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:"Źródło: LRCLIB",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie."},Rn={en:gt,pl:Ln};function Nn(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return Rn[t]??gt}var Ne=null;function u(){if(!Ne){let e=typeof document<"u"?document.documentElement.lang:"";Ne=Nn(e||(typeof navigator<"u"?navigator.language:"en"))}return Ne}var x=[],F=-1,j=null,S="",ne=null,G="",ft=(e,t)=>e===t,vt={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){x=[],F=-1,j=null,S="",G="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
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
    `,document.head.appendChild(t),N();let n=()=>{ie(),bt(e)},i=()=>{setTimeout(()=>{ie(),Ve()},50),setTimeout(()=>{Ve()},250)};document.addEventListener("click",i,!0);let o=window.setInterval(n,600);n(),ne=()=>{clearInterval(o),document.removeEventListener("click",i,!0),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((c)=>c.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(S===n&&x.length>0||G===n)return;S=n,G=n,x=[],F=-1,j=null,ie();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsLoading}));try{let o=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!ft(n,S))return;if(j=o,o?.syncedLyrics)x=qn(o.syncedLyrics);ie(),bt(t),xt(t)}catch{if(!ft(n,S))return;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsNone}))}finally{if(G===n)G=""}},onTick(e){if(!x||x.length===0)return;let t=oe(S),n=e+t,i=-1;for(let o=0;o<x.length;o++)if(n>=x[o].timeSecs)i=o;else break;if(i!==F&&i>=0){F=i;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o){let r=o.querySelectorAll(".ytmd-native-lyric-line");r.forEach((s,l)=>{if(l===i)s.classList.add("active");else s.classList.remove("active")});let c=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(c&&zn(c)){let s=r[i];if(s)s.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(ne)ne(),ne=null}},Tt="ytmd-lyrics-offsets",Dn=500;function kt(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function Vn(e){try{let t=e?.getItem(Tt);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function Bn(e,t,n,i){if(e.delete(t),n!==0)e.set(t,n);while(e.size>Dn){let o=e.keys().next().value;if(o===void 0)break;e.delete(o)}try{i?.setItem(Tt,JSON.stringify([...e]))}catch{}}var De=null;function wt(){if(!De)De=Vn(kt());return De}function oe(e){return wt().get(e)||0}function Yn(e,t){Bn(wt(),e,t,kt())}function ht(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function zn(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function On(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function ie(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(On(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function Hn(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function Ve(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=Hn();e.style.setProperty("display",t?"flex":"none","important")}function bt(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=p("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),xt(e)}Ve()}function xt(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(x&&x.length>0){let n=oe(S),i=p("span",{className:"ytmd-lyrics-offset-value",text:ht(n)}),o=(s)=>{let l=s===null?0:Math.round((oe(S)+s)*10)/10;Yn(S,l),i.textContent=ht(l)},r=(s,l,a)=>{let d=p("button",{className:"ytmd-chip",text:s});return d.type="button",d.dataset.ytmdTooltip=l,d.setAttribute("aria-label",l),d.addEventListener("click",a),d},c=p("div",{className:"ytmd-native-lyrics-footer"});c.append(p("span",{className:"ytmd-lyrics-source",text:u().lyricsSource}),p("span",{text:u().lyricsOffset}),r("−0.5 s",u().lyricsLater,()=>o(-0.5)),i,r("+0.5 s",u().lyricsEarlier,()=>o(0.5)),r(u().lyricsReset,u().lyricsReset,()=>o(null))),t.replaceChildren(...x.map((s,l)=>{let a=p("div",{className:`ytmd-native-lyric-line${l===F?" active":""}`,text:s.text});return a.addEventListener("click",()=>{let d=e.getVideoElement();if(d){let m=oe(S);d.currentTime=Math.max(0,s.timeSecs-m)}}),a}),c)}else if(j?.plainLyrics){let n=j.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>p("div",{className:"ytmd-native-lyric-line ytmd-plain",text:i})),p("div",{className:"ytmd-native-lyrics-footer",text:u().lyricsSource}))}else t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:u().lyricsNone}))}function qn(e){let t=e.split(`
`),n=[],i=0,o=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,r=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let c of t){let s=c.trim();if(!s)continue;let l=r.exec(s);if(l){let m=parseInt(l[1],10);if(!isNaN(m))i=m/1000;continue}let a=[],d;o.lastIndex=0;while((d=o.exec(s))!==null){let m=parseInt(d[1],10),y=parseInt(d[2],10),f=0;if(d[3])f=parseInt(d[3].padEnd(3,"0").slice(0,3),10);a.push(m*60+y+f/1000)}if(a.length>0){let m=s.replace(o,"").trim();if(m)for(let y of a)n.push({timeSecs:Math.max(0,y-i),text:m})}}return n.sort((c,s)=>c.timeSecs-s.timeSecs)}var re=null,St={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let i=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!i)return;let o=i.getBoundingClientRect();if(n.clientX>=o.left&&n.clientX<=o.right&&n.clientY>=o.top&&n.clientY<=o.bottom){n.preventDefault();let r=e.getVideoElement();if(r){let c=e.config.wheel_volume_step||0.05,s=n.deltaY<0?c:-c,l=Math.max(0,Math.min(1,r.volume+s));r.volume=l}}};window.addEventListener("wheel",t,{passive:!1}),re=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(re)re(),re=null}};var Pt={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var ae=null,Ct={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);ae=()=>{t?.remove()}},onDestroy(){if(ae)ae(),ae=null}};var se=[32,64,125,250,500,1000,2000,4000,8000,16000],Be={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function W(e){return Math.max(-24,Math.min(24,e))}function Un(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function $n(e){return Math.max(0.5,Math.min(2,e))}class T{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=se.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!T.instance)T.instance=new T;return T.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=se.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===se.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=W(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=W(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=W(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,W(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=Be[e]||Be.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),Un(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=$n(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??h.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class Ye{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)T.getInstance().fadeIn(this.crossfadeSeconds);else T.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),T.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),T.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),h.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class ze{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=T.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,h.next()}else this.consecutiveSilentTicks=0}}var I=null,V=null,le=null;function Gn(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var _t={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=T.getInstance(),n=new Ye,i=new ze;I=n,V=i;let o=e.config,r=null,c=()=>{if(r!==null)return;let l=e.getVideoElement();if(l){if(!t.isInitializedFor(l))t.init(l);return}r=window.setInterval(()=>{let a=e.getVideoElement();if(a){if(r!==null)clearInterval(r);r=null,t.init(a)}},500)};if(Gn(o))c();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let s=[];if(window.__TAURI__?.event){let{listen:l}=window.__TAURI__.event;s.push(l("set-eq-band",(a)=>{c(),t.setBandGain(a.payload.bandIndex,a.payload.gain)}),l("set-eq-all",(a)=>{c(),t.setAllGains(a.payload.gains)}),l("set-eq-preset",(a)=>{c(),t.applyPreset(a.payload)}),l("set-preamp",(a)=>{c(),t.setPreamp(a.payload)}),l("set-loudness-normalization",(a)=>{if(a.payload)c();t.setLoudnessNormalization(a.payload)}),l("set-crossfade-seconds",(a)=>{if(a.payload>0)c();n.setCrossfadeSeconds(a.payload)}),l("set-skip-silence",(a)=>{if(a.payload)c();i.setEnabled(a.payload)}),l("set-playback-rate",(a)=>{t.setPlaybackRate(a.payload)}),l("set-preserves-pitch",(a)=>{t.setPreservesPitch(a.payload)}))}le=()=>{if(r!==null)clearInterval(r),r=null;s.forEach((l)=>l.then((a)=>a())),I?.destroy(),I=null,V=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(T.getInstance().applyRateAndPitch(),I)I.onTrackChange(e);if(V)V.onTrackChange()},onTick(e,t){if(ee())return;if(I)I.onTick(e,t.track);if(V)V.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(le)le(),le=null}};var Oe=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function Et(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let c=r.getImageData(0,0,16,16).data,s=0,l=0,a=0,d=0,m=0,y=0,f=0,g=0;for(let E=0;E<c.length;E+=4){let xe=c[E],Se=c[E+1],Pe=c[E+2];if(c[E+3]<128)continue;let Qe=(xe+Se+Pe)/3;if(Qe<20||Qe>240)continue;if(E<c.length/2)s+=xe,l+=Se,a+=Pe,d++;else m+=xe,y+=Se,f+=Pe,g++}if(d===0&&g===0){t(n);return}let k=d>0?Math.round(s/d):220,w=d>0?Math.round(l/d):38,P=d>0?Math.round(a/d):38,we=g>0?Math.round(m/g):24,an=g>0?Math.round(y/g):24,sn=g>0?Math.round(f/g):27;t({primary:Oe(k,w,P),secondary:Oe(we,an,sn),accent:Oe(k+30,w+30,P+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var C=48,Fn=3,jn=3,Wn=1.65,Kn=0.55;function Qn(e,t,n,i){let o=new Float32Array(e.length),r=(c,s,l)=>{let a=l?n:t,d=l?t:n;for(let m=0;m<a;m++)for(let y=0;y<4;y++)for(let f=0;f<d;f++){let g=0,k=0;for(let P=Math.max(0,f-i);P<=Math.min(d-1,f+i);P++){let we=l?(m*t+P)*4+y:(P*t+m)*4+y;g+=c[we],k++}let w=l?(m*t+f)*4+y:(f*t+m)*4+y;s[w]=g/k}};r(e,o,!0),r(o,e,!1)}function Jn(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],c=e[i+2],s=0.2126*o+0.7152*r+0.0722*c;e[i]=(s+(o-s)*t)*n,e[i+1]=(s+(r-s)*t)*n,e[i+2]=(s+(c-s)*t)*n}}async function Mt(e,t=Kn){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=C,o.height=C;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,C,C);let c=r.getImageData(0,0,C,C);for(let s=0;s<jn;s++)Qn(c.data,C,C,Fn);Jn(c.data,Wn,t),r.putImageData(c,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var ce=null,de=null,ue,It={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=p("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=p("img",{id:"ytmd-ambient-cover"});n.alt="";let i=p("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,c=document.createElement("style");c.id="ytmd-ambient-styles",c.textContent=`
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
    `,document.head.appendChild(c),ce=(l)=>{if(t)t.style.opacity=String(l)};let s=[];if(window.__TAURI__?.event)s.push(window.__TAURI__.event.listen("set-ambient-intensity",(l)=>{ce?.(l.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(l)=>{let a=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;ce?.(l.payload?a:0)}));if(de=()=>{s.forEach((l)=>l.then((a)=>a())),ce=null,ue=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===ue)return;ue=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await Mt(t):null;if(t!==ue)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await Et(t||""),o=document.documentElement.style;o.setProperty("--ytmd-accent",i.accent),o.setProperty("--ytmd-accent-primary",i.primary),o.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(de)de(),de=null}};var At=`
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

`,Lt=`
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

`;var me=null,Rt={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let l=document.getElementById(s);if(!l){l=document.createElement("style"),l.id=s;let a=t();if(a)a.appendChild(l)}return l},i=(s)=>{let l=n("ytmd-active-theme");l.textContent=s?At:Lt},o=(s)=>{let l=n("ytmd-custom-css");if(l)l.textContent=s};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let c=[];if(window.__TAURI__?.event)c.push(window.__TAURI__.event.listen("set-ambient-enabled",(s)=>{i(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{o(s.payload)}));me=()=>{c.forEach((s)=>s.then((l)=>l()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(me)me(),me=null}};var pe=null,Nt={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=D({id:"ytmd-pip-btn",label:u().pipButton,iconPath:v.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(c){console.warn("[YTMD PiP] Could not enter PiP:",c),await e.invoke("toggle_mini_player").catch((s)=>console.error("[YTMD PiP] Mini player fallback failed:",s))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),pe=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(pe)pe(),pe=null}};function Xn(e){if(e.error)return"failed";if(e.output_path&&e.percent>=100)return"done";return"progress"}var ge="ytmd-download-btn",Zn=3000,B=new Map,He=new Set,fe=null,ye=null;function Y(){let e=document.getElementById(ge);if(!e)return;let t=fe?.videoId,n=t?B.get(t):void 0;pt(e,n?Math.max(0.05,n.fraction):null),mt(e,t&&He.has(t)?v.check:v.download),e.setAttribute("aria-disabled",t?"false":"true");let i=n?u().downloadInProgress:u().downloadButton;e.setAttribute("aria-label",i),e.dataset.ytmdTooltip=i}function qe(e,t){let n=B.get(e);if(!n)return;if(B.delete(e),t.ok)He.add(e),setTimeout(()=>{He.delete(e),Y()},Zn),b(u().downloadDone(n.title),{id:`download-${e}`});else b(u().downloadFailed(t.reason),{id:`download-${e}`,durationMs:8000});Y()}function ei(e){let t=B.get(e.video_id);if(!t)return;let n=Xn(e);if(n==="failed")qe(e.video_id,{ok:!1,reason:e.error||e.status});else if(n==="done")qe(e.video_id,{ok:!0});else t.fraction=e.percent/100,Y()}function Ue(e,t){let n=t?.videoId;if(!t||!n){b(u().downloadNoTrack);return}if(B.has(n)){b(u().downloadInProgress);return}B.set(n,{title:t.title,fraction:0}),Y(),b(u().downloadStarted(t.title),{id:`download-${n}`}),e.invoke("download_track",{request:{video_id:n,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:e.config.download_format||"mp3",embed_lyrics:e.config.embed_lyrics!==!1}}).catch((i)=>{console.error("[YTMD Downloader] Download failed:",i),qe(n,{ok:!1,reason:i instanceof Error?i.message:String(i)})})}var Dt={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){fe=e.track;let t=()=>{if(document.getElementById(ge))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!o)return;let r=D({id:ge,label:u().downloadButton,iconPath:v.download});r.addEventListener("click",()=>{if(r.getAttribute("aria-disabled")==="true")return;Ue(e,fe)}),o.appendChild(r),Y()},n=window.setInterval(t,1000);t();let i=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(o)=>ei(o.payload)):null;ye=()=>{clearInterval(n),i?.then((o)=>o()),document.getElementById(ge)?.remove()}},onTrackChange(e){fe=e,Y()},onDestroy(){if(ye)ye(),ye=null}};var Vt={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};var he="ytmd-nav-slot",$e="ytmd-menu-btn",Q="ytmd-menu",Bt="ytmd-sync-chip",zt=[],K=null,Ot=null,Yt=!1,ti=`
  #${he} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function ni(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=ti,document.head.appendChild(e)}function ii(e){if(!e)return;return`${u().syncInRoom} · ${u().syncListeners(e.listeners)}`}function Ht(e){zt=e.items,Ot=e.onSyncChipClick}function Ge(){if(document.getElementById(he)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;N(),ni();let t=p("div",{id:he}),n=D({id:$e,label:u().menuLabel,iconPath:v.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),ri(n)}),t.appendChild(n),e.prepend(t),qt(),si()}function Fe(e){K=e,qt();let t=document.getElementById(Q);if(t?.classList.contains("ytmd-open"))Ut(t)}function qt(){let e=document.getElementById(he);if(!e)return;let t=document.getElementById(Bt);if(!K){t?.remove();return}if(!t)t=p("button",{id:Bt,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>Ot?.()),e.prepend(t);let n=u().syncListeners(K.listeners);t.replaceChildren(p("span",{className:"ytmd-chip-dot"}),U(v.group,18),p("span",{text:n})),t.dataset.ytmdTooltip=`${u().syncInRoom} · ${K.roomCode}`,t.setAttribute("aria-label",`${u().syncInRoom}, ${n}`)}function Ut(e){let t=[];for(let n of zt){if(n.dividerBefore)t.push(p("div",{className:"ytmd-menu-divider"}));let i=p("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=p("span",{className:"ytmd-menu-item-text"});o.appendChild(p("span",{text:n.label}));let r=n.id==="sync"?ii(K):void 0;if(r)o.appendChild(p("span",{className:"ytmd-menu-item-sub",text:r}));if(i.append(U(n.iconPath),o),n.hint)i.appendChild(p("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{z(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function oi(){let e=document.getElementById(Q);if(!e)e=p("div",{id:Q,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",ai),document.body.appendChild(e);return e}function ri(e){let t=oi();if(t.classList.contains("ytmd-open")){z();return}Ut(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function z(){let e=document.getElementById(Q);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById($e);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function ai(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),z();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")z()}function si(){if(Yt)return;Yt=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(Q);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById($e)?.contains(n))return;z()}),window.addEventListener("resize",z)}function li(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var ve=/^[A-Za-z0-9_-]{11}$/,ci=2,di=0.25,ui=0.05,mi=3,$t=0.1,pi=0.5,yi=1,gi=1000,fi=1,hi=5000,bi=4000,Gt=15000,vi=3,Ti=4000,ki=1e4;function wi(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(ve.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>pi)i.seekTo=e.current_time_secs;return i}let o=e.current_time_secs+Math.min(yi,Math.max(0,n)),r=o-t.currentTime;if(Math.abs(r)>ci)i.seekTo=o;else if(Math.abs(r)>(t.correcting?ui:di))i.playbackRate=1+Math.max(-$t,Math.min($t,r/mi));return i}class Kt{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function xi(e,t){return t!==null&&e<t&&t-e<ki}function Qt(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var Si=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function Ft(){return new URLSearchParams(window.location.search).get("v")}function jt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function Wt(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class Jt{isHost=!1;inRoom=!1;lastBroadcast=null;pendingNav=null;transit=new Kt;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;rateCorrection=null;setRoomState(e,t){let n=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,at(this.isGuest()),!n)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||jt())return;if(xi(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(ve.test(e.video_id))this.hostVideoId=e.video_id;let o=this.requestedVideo;if(o){if(e.video_id!==o.videoId&&n-o.atMs<bi)return;this.requestedVideo=null}let r={videoId:Ft(),paused:t?t.paused:!0,currentTime:t?t.currentTime:0,correcting:this.rateCorrection!==null},c=wi(e,r,i);if(c.navigateTo){this.endRateCorrection();let s=this.pendingNav;if(s&&s.videoId===c.navigateTo&&n-s.atMs<hi)return;let l=s&&s.videoId===c.navigateTo?s.attempts+1:1;if(this.pendingNav={videoId:c.navigateTo,atMs:n,attempts:l},this.rememberOwnNav(c.navigateTo,n),l>1)window.location.href=`https://music.youtube.com/watch?v=${c.navigateTo}`;else Wt(c.navigateTo);return}if(this.pendingNav=null,!t)return;if(c.setPlaying===!0)h.play();else if(c.setPlaying===!1)h.pause();if(c.seekTo!==null)this.endRateCorrection(),h.seekTo(c.seekTo);else this.setCatchUpRate(t,c.playbackRate)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>Gt)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;if(Number.isFinite(e.duration)&&e.duration>0&&e.duration-e.currentTime<vi)this.nearEndAtMs=t}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!e||!ve.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<Gt)return null;if(t-this.nearEndAtMs<Ti)return null;if(this.requestedVideo?.videoId===e)return null;return this.requestedVideo={videoId:e,atMs:t},{kind:"play_video",video_id:e}}requestControl(e,t){t("send_sync_control",{action:e}).catch((n)=>{console.error("[YTMD Room Sync] control request failed:",n),b(u().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n}=e;switch(n.kind){case"next":h.next(),b(u().syncGuestNext(t));break;case"previous":h.previous(),b(u().syncGuestPrevious(t));break;case"set_playing":{let i=h.getVideo();if(!i||i.paused!==n.playing)return;if(n.playing)h.play();else h.pause();b(n.playing?u().syncGuestResumed(t):u().syncGuestPaused(t));break}case"play_video":if(!ve.test(n.video_id)||n.video_id===Ft())return;Wt(n.video_id),b(u().syncGuestPicked(t));break}}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t||jt())return;let o=Date.now(),r=this.lastBroadcast,c=r?r.position+(o-r.atMs)/1000*r.rate:0,s=!!r&&r.playing&&!t.paused&&Math.abs(t.currentTime-c)>fi;if(!i&&!s&&r&&o-r.atMs<gi)return;this.lastBroadcast={atMs:o,position:t.currentTime,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:o}}).catch((l)=>console.error("[YTMD Room Sync] broadcast failed:",l))}}var _=null,Te=null,be=null,We=null;function Xt(e){let t=_;if(!t||!Te||!t.isGuest())return!1;let n=h.getVideo(),i=Qt(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,Te),!0}function je(e,t){let n=We;if(We=e,Fe(e?{roomCode:e.room_code,listeners:e.members.length,isHost:e.is_host}:null),!t)return;if(!e){if(n)b(u().syncRoomClosed);return}if(!n||n.room_code!==e.room_code){if(!e.is_host)b(u().syncConnected);return}let{joined:i,left:o}=li(n.members,e.members,e.current_user_id),r=[...i.map(u().syncJoined),...o.map(u().syncLeft)];if(r.length>0)b(r.join(" · "))}var Zt={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Jt;_=t,Te=e.invoke;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(o)=>{t.setRoomState(!0,o.payload.is_host),je(o.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1),je(null,!0)}),window.__TAURI__.event.listen("sync-playback-remote",(o)=>{t.handleRemotePlayback(o.payload,e.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(o)=>{t.applyRemoteControl(o.payload)}));let i=(o)=>{if(!o.isTrusted||!t.isGuest()||!(o.target instanceof Element))return;let r=o.target,c=Si.find(([a])=>r.closest(a));if(!c)return;let s=e.getVideoElement(),l=Qt(c[1],s?s.paused:!0);if(!l)return;o.preventDefault(),o.stopImmediatePropagation(),t.requestControl(l,e.invoke)};window.addEventListener("click",i,!0),e.invoke("get_sync_room_state").then((o)=>{if(_!==t||!o||typeof o!=="object")return;let r=o;if(t.setRoomState(!0,r.is_host),je(r,!1),!r.is_host&&r.playback_state)t.handleRemotePlayback(r.playback_state,e.getVideoElement())}).catch((o)=>console.error("[YTMD Room Sync] failed to restore room state:",o)),be=()=>{n.forEach((o)=>o.then((r)=>r())),window.removeEventListener("click",i,!0),t.setRoomState(!1,!1),_=null,Te=null,We=null,Fe(null)}},onTrackChange(e,t){let n=_;if(!n)return;n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){_?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();_?.broadcastLocalState(t.track,n,t.invoke),_?.noteLocalTick(n)},onDestroy(){if(be)be(),be=null}};var ke=null,Pi=(e,t)=>t&&e!==!1,en={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,o=(y)=>{if(n===y)return;n=y,e.invoke("set_inhibit_sleep",{inhibit:y}).catch((f)=>{n=!y,console.error("[YTMD Power] set_inhibit_sleep failed:",f)})},r=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},c=()=>{t?.release().catch(()=>{}),t=null},s=()=>{let y=e.getVideoElement(),f=!!y&&!y.paused&&!y.ended,g=Pi(e.config.inhibit_sleep,f);if(o(g),g)r();else c()},l=(y)=>{for(let f of["play","playing","pause","ended"])y.addEventListener(f,s);i=y},a=(y)=>{for(let f of["play","playing","pause","ended"])y.removeEventListener(f,s)},d=e.getVideoElement();if(d)l(d);s();let m=window.setInterval(()=>{let y=e.getVideoElement();if(y&&y!==i){if(i)a(i);l(y),s()}},1000);ke=()=>{if(clearInterval(m),i)a(i);i=null,c(),o(!1)}},onDestroy(){if(ke)ke(),ke=null}};var tn={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>Ke(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},Ci=`
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
`;function _i(){if(document.getElementById("ytmd-qr-styles"))return;let e=document.createElement("style");e.id="ytmd-qr-styles",e.textContent=Ci,document.head.appendChild(e)}async function Ke(e){_i();let t=p("p",{text:u().remoteBody,style:"margin: 0;"}),n=p("div",{className:"ytmd-qr-frame",text:u().remoteLoading}),i=p("div",{className:"ytmd-qr-url"}),o=yt({id:"ytmd-remote-modal",title:u().remoteTitle,body:[t,n,i],actions:[{label:u().close}]});try{let r=await e.invoke("get_remote_info");if(!n.isConnected)return;if(r?.qr_svg){let c=p("img");c.src=`data:image/svg+xml;utf8,${encodeURIComponent(r.qr_svg)}`,c.alt=u().remoteTitle,n.replaceChildren(c)}else n.textContent=u().remoteUnavailable;if(r?.url)i.textContent=r.url}catch(r){if(console.error("[YTMD Remote] Error fetching remote info:",r),n.isConnected)n.textContent=u().remoteUnavailable}return o}function Ei(e,t){if(!t||typeof t!=="object"||!("ok"in t))throw Error(`Malformed response to ${e}`);let n=t;if(!n.ok)throw Error(n.error||`${e} failed`);return n.data??null}var Mi=8000,A=(e,t={},n={})=>new Promise((i,o)=>{let r=window.__TAURI__;if(!r?.event?.emit){o(Error("Tauri bridge unavailable"));return}let c=Math.random().toString(36).slice(2)+Date.now().toString(36),s=null,l=setTimeout(()=>{if(s)s();o(Error(`Timed out waiting for ${e}`))},n.timeoutMs??Mi);r.event.listen(`ytmd-response-${c}`,(a)=>{if(clearTimeout(l),s)s();try{i(Ei(e,a.payload))}catch(d){o(d)}}).then((a)=>(s=a,r.event.emit("ytmd-invoke",{id:c,cmd:e,args:t}))).catch((a)=>{clearTimeout(l),o(a instanceof Error?a:Error(String(a)))})});var rn=null,J=null,O=(e)=>{A(e).catch((t)=>{console.error(`[YTMD] ${e} failed:`,t),b(u().actionFailed)})};function Ii(){Ht({onSyncChipClick:()=>O("toggle_sync_window"),items:[{id:"settings",iconPath:v.tune,label:u().menuSettings,hint:"Ctrl+,",onSelect:()=>O("toggle_settings_window")},{id:"local",iconPath:v.folderMusic,label:u().menuLocal,onSelect:()=>O("toggle_local_library_window")},{id:"sync",iconPath:v.group,label:u().menuSync,onSelect:()=>O("toggle_sync_window")},{id:"remote",iconPath:v.phone,label:u().menuRemote,onSelect:()=>{if(J)Ke(J)}},{id:"mini",iconPath:v.miniPlayer,label:u().menuMiniPlayer,onSelect:()=>O("toggle_mini_player")},{id:"download",iconPath:v.download,label:u().menuDownload,dividerBefore:!0,onSelect:()=>{if(J)Ue(J,rn)}}]})}var Ai={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function nn(e){let t={};for(let[n,[i,o]]of Object.entries(Ai)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}async function on(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};Ii(),Ge();let t=setInterval(Ge,1000);window.addEventListener("pagehide",()=>clearInterval(t));try{let a=await A("get_config");if(a&&typeof a==="object")Object.assign(e,a)}catch(a){console.error("[YTMD] Failed to load config, using defaults:",a)}let n={track:null,config:e,invoke:A,sendPlayerCommand:(a)=>{s(a)},getVideoElement:()=>h.getVideo()};J=n;let i=new _e(n);i.register(ot),i.register(st),i.register(vt),i.register(St),i.register(Pt),i.register(Ct),i.register(_t),i.register(It),i.register(Rt),i.register(Nt),i.register(Dt),i.register(Vt),i.register(Zt),i.register(en),i.register(tn);try{await i.initAll(nn(e))}catch(a){console.error("[YTMD] Registry init error:",a)}let o=new Ce,r=0,c=Date.now();o.onTrackChange(async(a)=>{rn=a,r=a.currentTimeSecs||0,c=Date.now(),i.handleTrackChange(a);try{await A("update_track_info",{track:{title:a.title,artist:a.artist,album:a.album||null,cover_url:a.coverUrl||null,duration_secs:Math.round(a.durationSecs||0),current_time_secs:Math.round(a.currentTimeSecs||0),is_playing:a.isPlaying,video_id:a.videoId||null}})}catch(d){console.error("[YTMD] Failed to sync track info to backend:",d)}}),o.onPlaybackChange(async(a)=>{i.handlePlaybackChange(a);let d=o.getCurrentTrack();if(d){d.isPlaying=a,r=d.currentTimeSecs||0,c=Date.now();try{await A("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(d.currentTimeSecs||0),is_playing:a,video_id:d.videoId||null}})}catch(m){console.error("[YTMD] Failed to sync playback status:",m)}}}),o.onTick((a)=>{i.handleTick(a);let d=o.getCurrentTrack();if(!d||!d.isPlaying)return;let m=Date.now(),y=(m-c)/1000,f=r+y;if(Math.abs(a-f)>2||y>=15)r=a,c=m,d.currentTimeSecs=Math.round(a),A("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(a),is_playing:!0,video_id:d.videoId||null}}).catch((k)=>console.error("[YTMD] Failed to sync seek/progress to backend:",k))});function s(a){if(Xt(a))return;switch(a){case"play":h.play();break;case"pause":h.pause();break;case"play_pause":h.playPause();break;case"next":h.next();break;case"previous":h.previous();break;case"like":h.toggleLike();break;case"dislike":h.toggleDislike();break;case"mute":h.toggleMute();break}}let l=(a,d)=>{let m=window.__TAURI__;if(m?.event?.listen)m.event.listen(a,(y)=>d(y.payload))};l("player-command",(a)=>s(a)),l("tray-command",(a)=>s(a)),l("mpris-command",(a)=>s(a)),l("global-shortcut-event",(a)=>s(a)),l("player-seek",(a)=>h.seekTo(a)),l("mpris-command-seek",(a)=>h.seekTo(a)),l("player-volume",(a)=>h.setVolume(a)),l("config-updated",(a)=>{if(!a||typeof a!=="object")return;Object.assign(e,a);let d=nn(e);for(let[m,y]of Object.entries(d))if(y)i.enable(m).catch((f)=>console.error(`[YTMD] Failed to enable plugin ${m}:`,f));else i.disable(m).catch((f)=>console.error(`[YTMD] Failed to disable plugin ${m}:`,f))}),window.addEventListener("keydown",(a)=>{if(a.ctrlKey&&a.key===","||a.key==="F2")a.preventDefault(),O("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var Li=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(Li)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>on());else on();
