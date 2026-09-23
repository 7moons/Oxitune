function q1($){let Y=$.trim().split(":").map((q)=>parseInt(q,10));if(Y.some((q)=>isNaN(q)))return 0;if(Y.length===2)return Y[0]*60+Y[1];else if(Y.length===3)return Y[0]*3600+Y[1]*60+Y[2];return 0}var V5=400;function h5($,Y){return $-Y>=V5}class u0{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick($){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((Y)=>Y($))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange($){this.onTrackChangeCallbacks.push($)}onPlaybackChange($){this.onPlaybackChangeCallbacks.push($)}onTick($){this.onTickCallbacks.push($)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let q=navigator.mediaSession,J=q.metadata;try{Object.defineProperty(q,"metadata",{get:()=>J,set:(X)=>{J=X,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(X){}}this.syncVideoListeners();let $=!1,Y=()=>{if($)return;$=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),$=!1})};this.mutationObserver=new MutationObserver(Y),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let q=document.querySelector("video");if(q&&!q.paused&&h5(Date.now(),this.lastTickMs))this.emitTick(q.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let $=document.querySelector("ytmusic-player-bar")||document.body;if(!$||$===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe($,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=$}attachVideoListeners($){$.addEventListener("play",this.handleVideoPlay),$.addEventListener("playing",this.handleVideoPlay),$.addEventListener("pause",this.handleVideoPause),$.addEventListener("ended",this.handleVideoPause),$.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=$}detachVideoListeners($){$.removeEventListener("play",this.handleVideoPlay),$.removeEventListener("playing",this.handleVideoPlay),$.removeEventListener("pause",this.handleVideoPause),$.removeEventListener("ended",this.handleVideoPause),$.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let $=document.querySelector("video");if($&&$!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners($)}}extractTrackInfo(){let $=document.querySelector("video"),Y=document.getElementById("movie_player");if(Boolean(Y&&(typeof Y.getAdState==="function"&&Y.getAdState()===1||typeof Y.isAdPlaying==="function"&&Y.isAdPlaying()||Y.classList?.contains("ad-showing")||Y.classList?.contains("ad-interrupting"))))return null;let J=navigator.mediaSession?.metadata,X=J?.title||"",Z=J?.artist||"",H=J?.album||"",z="";if(J?.artwork&&J.artwork.length>0){let L=J.artwork[J.artwork.length-1];if(L&&L.src)z=L.src}if(!X){let L=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(L)X=L.textContent?.trim()||""}if(!Z){let L=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(L){let C=(L.textContent?.trim()||"").split("•").map((O)=>O.trim());if(Z=C[0]||"",C.length>1)H=C[1]}}if(!z){let L=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(L&&L.src)z=L.src}if(z.startsWith("//"))z=`https:${z}`;if(z.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(z))z=z.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let Q=new URLSearchParams(window.location.search).get("v")||void 0,G=0,V=0;if(Y&&typeof Y.getDuration==="function"){let L=Y.getDuration();if(typeof L==="number"&&Number.isFinite(L)&&L>0)G=Math.floor(L)}if(Y&&typeof Y.getCurrentTime==="function"){let L=Y.getCurrentTime();if(typeof L==="number"&&Number.isFinite(L)&&L>=0)V=Math.floor(L)}if(!G&&$&&Number.isFinite($.duration)&&$.duration>0)G=Math.floor($.duration);if(!V&&$&&Number.isFinite($.currentTime)&&$.currentTime>=0)V=Math.floor($.currentTime);let h=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(h&&h.textContent){let L=h.textContent.split("/").map((b)=>b.trim());if(L.length===2){if(!V)V=q1(L[0]);if(!G)G=q1(L[1])}}if(!G){let b=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(b){let C=parseInt(b,10);if(!isNaN(C)&&C>0)G=C}}let N=$?!$.paused&&!$.ended:!1;if(!X)return null;return{title:X,artist:Z||"Unknown Artist",album:H||void 0,coverUrl:z||void 0,durationSecs:G,currentTimeSecs:V,isPlaying:N,videoId:Q}}checkTrackUpdate(){let $=this.extractTrackInfo();if(!$)return;let Y=!this.currentTrack||this.currentTrack.title!==$.title||this.currentTrack.artist!==$.artist||this.currentTrack.videoId!==$.videoId,q=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&$.durationSecs>0||!this.currentTrack.coverUrl&&!!$.coverUrl||!this.currentTrack.album&&!!$.album||!this.currentTrack.videoId&&!!$.videoId),J=this.currentTrack!==null&&this.currentTrack.isPlaying!==$.isPlaying;if(this.currentTrack=$,Y||q){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((X)=>X($))}if(J)this.onPlaybackChangeCallbacks.forEach((X)=>X($.isPlaying))}handlePlaybackChange($){if($){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((Y)=>Y(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((Y)=>Y(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function R0(){return document.getElementById("movie_player")}function J1($){for(let Y of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let q=document.querySelector(Y);if(!q||!("value"in q))continue;if("step"in q&&Number(q.step)>1)q.step=1;q.value=$}}function f0($){let Y=R0()?.getVolume?.(),q=typeof Y==="number"&&Number.isFinite(Y)?Y:$.volume*100;return Math.max(0,Math.min(100,Math.round(q)))}function X1($){return R0()?.isMuted?.()===!0||$.muted}function Z0($,Y){if(!Number.isFinite($))return;let q=Math.max(0,Math.min(100,Math.round($))),J=R0();if(typeof J?.setVolume==="function"){if(J.setVolume(q),q>0&&J.isMuted?.())if(typeof J.unMute==="function")J.unMute();else Y.muted=!1;J1(q);return}if(Y.volume=q/100,q>0&&Y.muted)Y.muted=!1;J1(q)}class K{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let $=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if($){$.click();return}let Y=this.getVideo();if(Y)if(Y.paused)Y.play();else Y.pause()}static play(){let $=this.getVideo();if($&&$.paused)this.playPause()}static pause(){let $=this.getVideo();if($&&!$.paused)this.playPause()}static next(){let $=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if($)$.click()}static previous(){let $=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if($)$.click()}static seekTo($){let Y=this.getVideo();if(Y&&!isNaN($))Y.currentTime=Math.max(0,Math.min($,Y.duration||$))}static setVolume($){let Y=this.getVideo();if(Y)Z0($*100,Y)}static toggleLike(){let $=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if($)$.click()}static toggleDislike(){let $=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if($)$.click()}static toggleMute(){let $=document.querySelector("ytmusic-player-bar #volume-slider"),Y=this.getVideo();if(Y)Y.muted=!Y.muted;if($){let q=$.parentElement?.querySelector("paper-icon-button, #button");if(q)q.click()}}}class E0{plugins=new Map;enabledPlugins=new Set;context;constructor($){this.context=$}register($){if(this.plugins.set($.id,$),$.defaultEnabled)this.enabledPlugins.add($.id)}async initAll($){for(let[Y,q]of this.plugins)if($?.[Y]!==void 0?$[Y]:q.defaultEnabled){if(this.enabledPlugins.add(Y),q.onInit)try{await q.onInit(this.context)}catch(X){console.error(`[YTMD] Failed to init plugin ${Y}:`,X)}}else this.enabledPlugins.delete(Y)}async enable($){let Y=this.plugins.get($);if(Y&&!this.enabledPlugins.has($)){if(this.enabledPlugins.add($),Y.onInit)await Y.onInit(this.context)}}async disable($){let Y=this.plugins.get($);if(Y&&this.enabledPlugins.has($)){if(this.enabledPlugins.delete($),Y.onDestroy)await Y.onDestroy()}}handleTrackChange($){this.context.track=$;for(let Y of this.enabledPlugins){let q=this.plugins.get(Y);if(q?.onTrackChange)try{q.onTrackChange($,this.context)}catch(J){console.error(`[YTMD] Error in plugin ${Y} onTrackChange:`,J)}}}handlePlaybackChange($){for(let Y of this.enabledPlugins){let q=this.plugins.get(Y);if(q?.onPlaybackChange)try{q.onPlaybackChange($,this.context)}catch(J){console.error(`[YTMD] Error in plugin ${Y} onPlaybackChange:`,J)}}}handleTick($){for(let Y of this.enabledPlugins){let q=this.plugins.get(Y);if(q?.onTick)try{q.onTick($,this.context)}catch(J){console.error(`[YTMD] Error in plugin ${Y} onTick:`,J)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled($){return this.enabledPlugins.has($)}}var Q0=null,k={adWasShowing:!1,preAdMuted:!1},y0=new WeakSet,o=null,G1=null,T0=0,c=!0,F5=1000,L5=($,Y,q)=>$-Y>=q,b5=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",N5="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",K5=300,C5=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,B5=`
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
`,M5=C5+B5,O5=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],D5=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],U5=($)=>O5.some((Y)=>$.includes(Y)),A5=($,Y)=>{let q=Y.split("."),J=$;for(let Z=0;Z<q.length-1;Z++){if(J===null||typeof J!=="object")return!1;J=J[q[Z]]}let X=q[q.length-1];if(J!==null&&typeof J==="object"&&Object.prototype.hasOwnProperty.call(J,X))return delete J[X],!0;return!1},x0=($)=>{if($===null||typeof $!=="object")return!1;let Y=!1;for(let q of D5)if(A5($,q))Y=!0;return Y},P5=($)=>{if(typeof $==="string")return $;if($ instanceof URL)return $.href;return $.url},Z1=!1,_5=()=>{if(Z1)return;Z1=!0;let $=window.fetch,Y=$.bind(window),q=async(...J)=>{let X=await Y(...J);if(!c||!U5(P5(J[0])))return X;let Z;try{Z=await X.clone().json()}catch{return X}if(!x0(Z))return X;let H=new Headers(X.headers);return H.delete("content-length"),H.delete("content-encoding"),new Response(JSON.stringify(Z),{status:X.status,statusText:X.statusText,headers:H})};window.fetch=Object.assign(q,$)},Q1=!1,w5=()=>{if(Q1)return;Q1=!0;let $=JSON.parse;JSON.parse=(...Y)=>{let q=$(...Y);if(c)x0(q);return q}},z1=!1,u5=()=>{if(z1)return;z1=!0;let $;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>$,set:(Y)=>{if(c)x0(Y);$=Y}})};if(typeof window<"u")_5(),w5(),u5();var R5=($)=>{let Y=new Set($);return Y.has("ad-showing")||Y.has("ad-interrupting")},f5=($,Y,q)=>{if($&&!Y.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:q},setMutedTo:!0};if(!$&&Y.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:Y.preAdMuted},setMutedTo:Y.preAdMuted};return{nextState:Y,setMutedTo:null}},I0=()=>document.getElementById("movie_player"),E5=()=>{let $=I0();if(!$)return!1;return R5($.classList)},m0=($)=>{let Y=$.getVideoElement();if(!Y)return;let{nextState:q,setMutedTo:J}=f5(E5(),k,Y.muted);if(k=q,J!==null)Y.muted=J},W1=($)=>{if(y0.has($))return;y0.add($),$.click()},z0=()=>{document.querySelectorAll(b5).forEach(W1),document.querySelectorAll(N5).forEach(($)=>{let Y=$.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(Y)W1(Y)})},H1=($)=>{let Y=I0();if(G1=Y,!Y)return;o?.disconnect(),o=new MutationObserver(()=>{m0($),z0()}),o.observe(Y,{attributes:!0,attributeFilter:["class"]})},j1={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit($){c=!0,k={adWasShowing:!1,preAdMuted:!1},y0=new WeakSet,T0=0;let Y=document.createElement("style");Y.id="ytmd-adblock-styles",Y.textContent=M5,document.head.appendChild(Y);let q=null,J=new MutationObserver(()=>{if(q!==null)return;q=setTimeout(()=>{q=null,z0()},K5)});J.observe(document.body,{childList:!0,subtree:!0}),H1($),z0(),m0($),Q0=()=>{if(c=!1,o?.disconnect(),o=null,J.disconnect(),q!==null)clearTimeout(q);document.getElementById("ytmd-adblock-styles")?.remove();let X=$.getVideoElement();if(X&&k.adWasShowing)X.muted=k.preAdMuted;k={adWasShowing:!1,preAdMuted:!1}}},onTick($,Y){if(I0()!==G1)H1(Y);m0(Y);let q=Date.now();if(L5(q,T0,F5))T0=q,z0()},onDestroy(){if(Q0)Q0(),Q0=null}};var V1=!1;function h1($){V1=$}function W0(){return V1}var S=[],H0="",g0=new Set,T5=($,Y)=>$===Y,F1={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){S=[],H0="",g0=new Set},onTrackChange($){if(!$.videoId||$.videoId===H0)return;let Y=$.videoId;H0=Y,S=[],g0=new Set;let q=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),J=`https://sponsor.ajay.app/api/skipSegments?videoID=${Y}&categories=${encodeURIComponent(q)}`;fetch(J,{signal:AbortSignal.timeout(3000)}).then(async(X)=>{if(!X.ok)return;let Z=await X.json();if(!T5(Y,H0))return;S=Z,console.log(`[YTMD SponsorBlock] Loaded ${Z.length} segments for ${Y}`)}).catch(()=>{})},onTick($,Y){if(!S||S.length===0||W0())return;let q=g0;for(let J of S){let[X,Z]=J.segment;if($>=X&&$<Z-0.5&&!q.has(J.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${J.category}): ${X}s -> ${Z}s`);let H=Y.getVideoElement();if(H)H.currentTime=Z,q.add(J.UUID);break}}}};function L1($,Y=18,q=18,J="0 0 24 24"){let X=document.createElementNS("http://www.w3.org/2000/svg","svg");X.setAttribute("width",String(Y)),X.setAttribute("height",String(q)),X.setAttribute("viewBox",J),X.setAttribute("fill","currentColor");let Z=document.createElementNS("http://www.w3.org/2000/svg","path");return Z.setAttribute("d",$),X.appendChild(Z),X}function F($,Y){let q=document.createElement($);if(Y?.id)q.id=Y.id;if(Y?.className)q.className=Y.className;if(Y?.text!==void 0)q.textContent=Y.text;if(Y?.title)q.title=Y.title;if(Y?.style)q.style.cssText=Y.style;return q}var b1="ytmd-kit-styles",y5=`
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
`;function E(){if(document.getElementById(b1))return;let $=document.createElement("style");$.id=b1,$.textContent=y5,(document.head||document.documentElement).appendChild($),m5()}var M={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function s($,Y=24){return L1($,Y,Y)}function v($){let Y=F("button",{id:$.id,className:`ytmd-icon-btn${$.muted?" ytmd-icon-btn--muted":""}`});return Y.type="button",Y.setAttribute("aria-label",$.label),Y.dataset.ytmdTooltip=$.label,Y.appendChild(s($.iconPath)),Y}function C1($,Y){$.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(s(Y))}function B1($,Y){let q=$.querySelector("svg.ytmd-progress-ring");if(Y===null){q?.remove();return}let J=17,X=2*Math.PI*J;if(!q){q=document.createElementNS("http://www.w3.org/2000/svg","svg"),q.setAttribute("class","ytmd-progress-ring"),q.setAttribute("viewBox","0 0 36 36");for(let z of["ytmd-progress-track","ytmd-progress-value"]){let W=document.createElementNS("http://www.w3.org/2000/svg","circle");W.setAttribute("class",z),W.setAttribute("cx","18"),W.setAttribute("cy","18"),W.setAttribute("r",String(J)),W.setAttribute("stroke-dasharray",String(X)),q.appendChild(W)}$.appendChild(q)}let Z=Math.max(0,Math.min(1,Y));q.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(X*(1-Z)))}var N1=!1;function m5(){if(N1)return;N1=!0;let $=null,Y=null,q=null,J=()=>{if(Y!==null)clearTimeout(Y);Y=null,q=null,$?.classList.remove("ytmd-open")},X=(z)=>{let W=z.dataset.ytmdTooltip;if(!W)return;if(!$)$=F("div",{id:"ytmd-tooltip"}),$.setAttribute("role","tooltip"),document.body.appendChild($);$.textContent=W;let Q=z.getBoundingClientRect(),G=$.getBoundingClientRect(),h=Q.bottom+8+G.height<window.innerHeight?Q.bottom+8:Q.top-8-G.height,N=Math.max(8,Math.min(window.innerWidth-G.width-8,Q.left+Q.width/2-G.width/2));$.style.top=`${h}px`,$.style.left=`${N}px`,$.classList.add("ytmd-open")},Z=(z)=>{let W=z.target?.closest?.("[data-ytmd-tooltip]");if(!W||W===q)return;J(),q=W,Y=setTimeout(()=>X(W),250)},H=(z)=>{let W=z.relatedTarget;if(q&&W&&q.contains(W))return;J()};document.addEventListener("mouseover",Z,!0),document.addEventListener("mouseout",H,!0),document.addEventListener("focusin",Z,!0),document.addEventListener("focusout",J,!0),document.addEventListener("mousedown",J,!0)}var m=null;function B($,Y={}){E();let q=document.getElementById("ytmd-toast-host");if(!q)q=F("div",{id:"ytmd-toast-host"}),q.setAttribute("role","status"),q.setAttribute("aria-live","polite"),document.body.appendChild(q);let J=q.querySelector(".ytmd-toast"),X=J&&Y.id&&J.dataset.toastId===Y.id&&!J.classList.contains("ytmd-leaving"),Z=X?J:F("div",{className:"ytmd-toast"});if(Y.id)Z.dataset.toastId=Y.id;let z=[F("span",{className:"ytmd-toast-text",text:$})];if(Y.action){let{label:Q,onClick:G}=Y.action,V=F("button",{className:"ytmd-button",text:Q});V.type="button",V.addEventListener("click",()=>{K1(),G()}),z.push(V)}if(Z.replaceChildren(...z),!X)q.replaceChildren(Z);if(m!==null)clearTimeout(m);m=null;let W=Y.durationMs??4000;if(W>0)m=setTimeout(K1,W)}function K1(){if(m!==null)clearTimeout(m);m=null;let $=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!$)return;$.classList.add("ytmd-leaving"),setTimeout(()=>$.remove(),150)}function M1($){E(),document.getElementById($.id)?.remove();let Y=F("div",{id:$.id,className:"ytmd-scrim"}),q=F("div",{className:"ytmd-dialog"});q.setAttribute("role","dialog"),q.setAttribute("aria-modal","true");let J=`${$.id}-title`;q.setAttribute("aria-labelledby",J);let X=F("h2",{id:J,className:"ytmd-dialog-title",text:$.title}),Z=F("div",{className:"ytmd-dialog-body"});if($.body)Z.append(...$.body);let H=document.activeElement,z=()=>{document.removeEventListener("keydown",W,!0),Y.remove(),H?.focus?.()},W=(G)=>{if(G.key==="Escape")G.stopPropagation(),z()};document.addEventListener("keydown",W,!0),Y.addEventListener("click",(G)=>{if(G.target===Y)z()});let Q=F("div",{className:"ytmd-dialog-actions"});for(let G of $.actions){let V=F("button",{className:`ytmd-button${G.filled?" ytmd-button--filled":""}`,text:G.label});V.type="button",V.addEventListener("click",()=>G.onClick?G.onClick(z):z()),Q.appendChild(V)}return q.append(X,Z,Q),Y.appendChild(q),document.body.appendChild(Y),Q.querySelector("button")?.focus(),{close:z,body:Z}}var O1={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:($)=>$===1?"1 listener":`${$} listeners`,syncJoined:($)=>`${$} joined`,syncLeft:($)=>`${$} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:($)=>`${$} skipped to the next song`,syncGuestPrevious:($)=>`${$} went back a song`,syncGuestPaused:($)=>`${$} paused`,syncGuestResumed:($)=>`${$} resumed playback`,syncGuestPicked:($)=>`${$} picked a song`,downloadNoTrack:"Play a song first to download it",downloadStarted:($)=>`Downloading “${$}”`,downloadDone:($)=>`Downloaded “${$}”`,downloadFailed:($)=>`Download failed: ${$}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:"Source: LRCLIB",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:($)=>`Volume: ${$}%`},x5={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:($)=>{if($===1)return"1 słuchacz";let Y=$%100,q=$%10;return q>=2&&q<=4&&(Y<12||Y>14)?`${$} słuchacze`:`${$} słuchaczy`},syncJoined:($)=>`${$} dołącza do słuchania`,syncLeft:($)=>`${$} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:($)=>`${$} przełącza na następny utwór`,syncGuestPrevious:($)=>`${$} wraca do poprzedniego utworu`,syncGuestPaused:($)=>`${$} wstrzymuje odtwarzanie`,syncGuestResumed:($)=>`${$} wznawia odtwarzanie`,syncGuestPicked:($)=>`${$} włącza inny utwór`,downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:($)=>`Pobieranie: „${$}”`,downloadDone:($)=>`Pobrano: „${$}”`,downloadFailed:($)=>`Nie udało się pobrać: ${$}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:"Źródło: LRCLIB",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:($)=>`Głośność: ${$}%`},I5={en:O1,pl:x5};function g5($){let Y=($||"").toLowerCase().split(/[-_]/)[0];return I5[Y]??O1}var k0=null;function j(){if(!k0){let $=typeof document<"u"?document.documentElement.lang:"";k0=g5($||(typeof navigator<"u"?navigator.language:"en"))}return k0}var P=[],a=-1,t=null,w="",G0=null,i="",D1=($,Y)=>$===Y,P1={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit($){P=[],a=-1,t=null,w="",i="";let Y=document.createElement("style");Y.id="ytmd-native-lyrics-styles",Y.textContent=`
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
    `,document.head.appendChild(Y),E();let q=()=>{j0(),A1($)},J=()=>{setTimeout(()=>{j0(),v0()},50),setTimeout(()=>{v0()},250)};document.addEventListener("click",J,!0);let X=window.setInterval(q,600);q(),G0=()=>{clearInterval(X),document.removeEventListener("click",J,!0),Y.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((H)=>H.remove())}},async onTrackChange($,Y){let q=`${$.title} - ${$.artist}`;if(w===q&&P.length>0||i===q)return;w=q,i=q,P=[],a=-1,t=null,j0();let J=document.getElementById("ytmd-native-lyrics-wrapper");if(J)J.replaceChildren(F("div",{className:"ytmd-native-lyrics-status",text:j().lyricsLoading}));try{let X=await Y.invoke("fetch_lyrics",{artist:$.artist,title:$.title,albumName:$.album||null,duration:$.durationSecs||null});if(!D1(q,w))return;if(t=X,X?.syncedLyrics)P=r5(X.syncedLyrics);j0(),A1(Y),R1(Y)}catch{if(!D1(q,w))return;let X=document.getElementById("ytmd-native-lyrics-wrapper");if(X)X.replaceChildren(F("div",{className:"ytmd-native-lyrics-status",text:j().lyricsNone}))}finally{if(i===q)i=""}},onTick($){if(!P||P.length===0)return;let Y=V0(w),q=$+Y,J=-1;for(let X=0;X<P.length;X++)if(q>=P[X].timeSecs)J=X;else break;if(J!==a&&J>=0){a=J;let X=document.getElementById("ytmd-native-lyrics-wrapper");if(X){let Z=X.querySelectorAll(".ytmd-native-lyric-line");Z.forEach((z,W)=>{if(W===J)z.classList.add("active");else z.classList.remove("active")});let H=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(H&&l5(H)){let z=Z[J];if(z)z.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(G0)G0(),G0=null}},_1="ytmd-lyrics-offsets",k5=500;function w1(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function S5($){try{let Y=$?.getItem(_1);if(!Y)return new Map;let q=JSON.parse(Y);if(!Array.isArray(q))return new Map;return new Map(q.filter((J)=>Array.isArray(J)&&typeof J[0]==="string"&&typeof J[1]==="number"))}catch{return new Map}}function v5($,Y,q,J){if($.delete(Y),q!==0)$.set(Y,q);while($.size>k5){let X=$.keys().next().value;if(X===void 0)break;$.delete(X)}try{J?.setItem(_1,JSON.stringify([...$]))}catch{}}var S0=null;function u1(){if(!S0)S0=S5(w1());return S0}function V0($){return u1().get($)||0}function p5($,Y){v5(u1(),$,Y,w1())}function U1($){return`${$>0?"+":$<0?"−":""}${Math.abs($).toFixed(1)} s`}function l5($){if(!$||$.offsetParent===null||$.hasAttribute("hidden"))return!1;let Y=window.getComputedStyle($);return Y.display!=="none"&&Y.visibility!=="hidden"&&Y.opacity!=="0"}function d5($){return $.disabled!==!0&&!$.hasAttribute("disabled")&&$.getAttribute("aria-disabled")!=="true"&&!$.classList.contains("disabled")&&$.classList.contains("ytmd-lyrics-tab-unlocked")}function j0(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((Y)=>{let q=Y.textContent?.toLowerCase()||"";if(q.includes("tekst")||q.includes("lyrics")||q.includes("paroles")||q.includes("letras")){if(d5(Y))return;Y.disabled=!1,Y.removeAttribute("disabled"),Y.removeAttribute("aria-disabled"),Y.classList.remove("disabled"),Y.classList.add("ytmd-lyrics-tab-unlocked");let J={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!Y.endpoint)Y.endpoint=J;if(Y.data&&!Y.data.endpoint)Y.data.endpoint=J}})}function n5(){let $=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let q of Array.from($)){let J=q.textContent?.toLowerCase()||"";if(J.includes("tekst")||J.includes("lyrics")||J.includes("paroles")||J.includes("letras")){if(q.classList.contains("iron-selected")||q.getAttribute("aria-selected")==="true"||q.classList.contains("selected"))return!0}}let Y=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(Y){if((Y.classList.contains("iron-selected")||!Y.hasAttribute("hidden"))&&Y.getAttribute("aria-hidden")!=="true")return!0}return!1}function v0(){let $=document.getElementById("ytmd-native-lyrics-wrapper");if(!$)return;let Y=n5();$.style.setProperty("display",Y?"flex":"none","important")}function A1($){let Y=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!Y)return;let q=document.getElementById("ytmd-native-lyrics-wrapper");if(!q||!Y.contains(q)){if(!q)q=F("div",{id:"ytmd-native-lyrics-wrapper"});Y.appendChild(q),R1($)}v0()}function R1($){let Y=document.getElementById("ytmd-native-lyrics-wrapper");if(!Y)return;if(P&&P.length>0){let q=V0(w),J=F("span",{className:"ytmd-lyrics-offset-value",text:U1(q)}),X=(z)=>{let W=z===null?0:Math.round((V0(w)+z)*10)/10;p5(w,W),J.textContent=U1(W)},Z=(z,W,Q)=>{let G=F("button",{className:"ytmd-chip",text:z});return G.type="button",G.dataset.ytmdTooltip=W,G.setAttribute("aria-label",W),G.addEventListener("click",Q),G},H=F("div",{className:"ytmd-native-lyrics-footer"});H.append(F("span",{className:"ytmd-lyrics-source",text:j().lyricsSource}),F("span",{text:j().lyricsOffset}),Z("−0.5 s",j().lyricsLater,()=>X(-0.5)),J,Z("+0.5 s",j().lyricsEarlier,()=>X(0.5)),Z(j().lyricsReset,j().lyricsReset,()=>X(null))),Y.replaceChildren(...P.map((z,W)=>{let Q=F("div",{className:`ytmd-native-lyric-line${W===a?" active":""}`,text:z.text});return Q.addEventListener("click",()=>{let G=$.getVideoElement();if(G){let V=V0(w);G.currentTime=Math.max(0,z.timeSecs-V)}}),Q}),H)}else if(t?.plainLyrics){let q=t.plainLyrics.split(`
`);Y.replaceChildren(...q.map((J)=>F("div",{className:"ytmd-native-lyric-line ytmd-plain",text:J})),F("div",{className:"ytmd-native-lyrics-footer",text:j().lyricsSource}))}else Y.replaceChildren(F("div",{className:"ytmd-native-lyrics-status",text:j().lyricsNone}))}function r5($){let Y=$.split(`
`),q=[],J=0,X=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,Z=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let H of Y){let z=H.trim();if(!z)continue;let W=Z.exec(z);if(W){let V=parseInt(W[1],10);if(!isNaN(V))J=V/1000;continue}let Q=[],G;X.lastIndex=0;while((G=X.exec(z))!==null){let V=parseInt(G[1],10),h=parseInt(G[2],10),N=0;if(G[3])N=parseInt(G[3].padEnd(3,"0").slice(0,3),10);Q.push(V*60+h+N/1000)}if(Q.length>0){let V=z.replace(X,"").trim();if(V)for(let h of Q)q.push({timeSecs:Math.max(0,h-J),text:V})}}return q.sort((H,z)=>H.timeSecs-z.timeSecs)}var e=null;function $0($){if(!$)return null;let Y=$.getBoundingClientRect();if(Y.width<80||Y.height<80||Y.bottom<=0||Y.right<=0||Y.top>=window.innerHeight||Y.left>=window.innerWidth)return null;for(let q=$;q;q=q.parentElement){let J=getComputedStyle(q);if(J.display==="none"||J.visibility==="hidden"||Number(J.opacity)===0)return null}return Y}var f1={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit($){e?.(),E(),document.getElementById("ytmd-volume-indicator")?.remove();let Y=F("div",{id:"ytmd-volume-indicator"});document.body.appendChild(Y);let q=null,J=null,X=null,Z=null,H=null,z=()=>{if(H!==null)window.clearTimeout(H);H=null,Y.classList.remove("ytmd-visible")},W=()=>{if(H!==null)window.clearTimeout(H);Y.classList.add("ytmd-visible"),H=window.setTimeout(()=>{H=null,Y.classList.remove("ytmd-visible")},1800)},Q=()=>{let b=$.getVideoElement();if(!b){Z=null,z();return}let C=X1(b)?0:f0(b),O=Z!==null&&C!==Z;Z=C;let R=document.querySelector("ytmusic-player-page #main-panel");if(!$0(R)){z();return}if(Y.textContent!==`${C}%`)Y.textContent=`${C}%`,Y.setAttribute("aria-label",j().volumeLevel(C));let g=$0(document.querySelector("ytmusic-player-page #song-image")),f=$0(document.querySelector("ytmusic-player-page video"))||$0(document.querySelector("ytmusic-player-page #movie_player")),_=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?f||g:g||f)||$0(R);if(!_){z();return}let u=`${Math.max(8,_.left+12)}px`,A=`${Math.max(8,_.top+12)}px`;if(Y.style.left!==u)Y.style.left=u;if(Y.style.top!==A)Y.style.top=A;if(O)W()},G=()=>{let b=$.getVideoElement();if(b===q)return;q?.removeEventListener("volumechange",Q),q=b,q?.addEventListener("volumechange",Q),Q()},V=()=>{let b=document.querySelector("ytmusic-player-page");if(b===J)return;if(X?.disconnect(),J=b,b)X=new MutationObserver(()=>window.requestAnimationFrame(Q)),X.observe(b,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},h=(b)=>{let C=b.target;if(C instanceof Element&&C.closest("ytmusic-player-bar"))window.requestAnimationFrame(Q)},N=(b)=>{if(b.deltaY===0||b.ctrlKey)return;let C=b.target;if(C instanceof Element&&C.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'))return;let O=(u)=>{if(!u)return!1;let A=u.getBoundingClientRect();return b.clientX>=A.left&&b.clientX<A.right&&b.clientY>=A.top&&b.clientY<A.bottom},R=O(document.querySelector("ytmusic-player-bar"))||O(document.querySelector("#player-bar-background")),g=$.config.wheel_volume_on_player_page===!0&&O(document.querySelector("ytmusic-player-page #main-panel"));if(!R&&!g)return;let f=$.getVideoElement();if(!f)return;let U=$.config.wheel_volume_step,_=typeof U==="number"&&Number.isFinite(U)&&U>0?Math.min(U,1):0.05;b.preventDefault(),Z0(f0(f)+(b.deltaY<0?_:-_)*100,f),Q()};window.addEventListener("wheel",N,{passive:!1}),window.addEventListener("resize",Q),document.addEventListener("scroll",Q,!0),document.addEventListener("input",h,!0),document.addEventListener("change",h,!0),V(),G();let L=window.setInterval(()=>{V(),G(),Q()},500);e=()=>{window.removeEventListener("wheel",N),window.removeEventListener("resize",Q),document.removeEventListener("scroll",Q,!0),document.removeEventListener("input",h,!0),document.removeEventListener("change",h,!0),window.clearInterval(L),X?.disconnect(),q?.removeEventListener("volumechange",Q),z(),Y.remove()}},onDestroy(){if(e)e(),e=null}};var E1={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange($,Y){if(!Y.config?.notifications_enabled)return;if(!$.title||$.title==="No Track Playing")return;try{await Y.invoke("notify_track_change",{title:$.title,artist:$.artist})}catch(q){console.warn("[YTMD] Notification dispatch failed:",q)}}};var h0=null,T1={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit($){let Y=document.getElementById("ytmd-theme-styles");if(!Y)Y=document.createElement("style"),Y.id="ytmd-theme-styles";if(Y.textContent=`
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
    `,!Y.isConnected)document.head.appendChild(Y);h0=()=>{Y?.remove()}},onDestroy(){if(h0)h0(),h0=null}};var F0=[32,64,125,250,500,1000,2000,4000,8000,16000],p0={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function Y0($){return Math.max(-24,Math.min(24,$))}function o5($){if($.length===0)return-100;let Y=0;for(let J=0;J<$.length;J++)Y+=$[J]*$[J];let q=Math.sqrt(Y/$.length);if(q<=0.00001)return-100;return 20*Math.log10(q)}function c5($){return Math.max(0.5,Math.min(2,$))}class D{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=F0.map(()=>0);preampDb=0;isInitializedFor($){return this.isInitialized&&this.hookedVideo===$}static getInstance(){if(!D.instance)D.instance=new D;return D.instance}init($){if(this.isInitialized&&this.hookedVideo===$){this.resumeContext();return}try{let Y=window.AudioContext||window.webkitAudioContext;if(!Y){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new Y,this.hookedVideo=$,this.sourceNode=this.audioCtx.createMediaElementSource($),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=F0.map((J,X)=>{if(!this.audioCtx)throw Error("AudioContext missing");let Z=this.audioCtx.createBiquadFilter();if(X===0)Z.type="lowshelf";else if(X===F0.length-1)Z.type="highshelf";else Z.type="peaking",Z.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return Z.frequency.setValueAtTime(J,this.audioCtx.currentTime),Z.gain.setValueAtTime(0,this.audioCtx.currentTime),Z}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let q=()=>this.resumeContext();$.addEventListener("play",q),$.addEventListener("playing",q),document.addEventListener("click",q,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(Y){console.error("[YTMD DSP] Failed to initialize AudioEngine:",Y)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((Y)=>Y.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let $=this.sourceNode;if(this.isNormalizing)$.connect(this.compressorNode),$=this.compressorNode;for(let Y of this.filters)$.connect(Y),$=Y;$.connect(this.preampNode),$=this.preampNode,$.connect(this.fadeNode),$=this.fadeNode,$.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch($){console.error("[YTMD DSP] Graph rebuild error:",$)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain($,Y){if($<0||$>=this.gains.length)return;let q=Y0(Y);if(this.gains[$]=q,!this.audioCtx||$>=this.filters.length)return;this.filters[$].gain.setValueAtTime(q,this.audioCtx.currentTime)}setAllGains($){$.forEach((q,J)=>{if(J<this.gains.length)this.gains[J]=Y0(q)});let Y=this.audioCtx;if(!Y)return;this.gains.forEach((q,J)=>{if(J<this.filters.length)this.filters[J].gain.setValueAtTime(q,Y.currentTime)})}setPreamp($){if(this.preampDb=Y0($),!this.preampNode||!this.audioCtx)return;let Y=Math.pow(10,Y0($)/20);this.preampNode.gain.setValueAtTime(Y,this.audioCtx.currentTime)}setLoudnessNormalization($){if(this.isNormalizing!==$)this.isNormalizing=$,this.rebuildGraph()}applyPreset($){let Y=p0[$]||p0.flat;if(this.setAllGains(Y.gains),Y.preamp!==void 0)this.setPreamp(Y.preamp);return Y.gains}fadeIn($){if(!this.fadeNode||!this.audioCtx||$<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let Y=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(Y),this.fadeNode.gain.setValueAtTime(0.001,Y),this.fadeNode.gain.linearRampToValueAtTime(1,Y+$)}fadeOut($){if(!this.fadeNode||!this.audioCtx||$<=0)return;let Y=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(Y),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,Y),this.fadeNode.gain.linearRampToValueAtTime(0.001,Y+$)}resetFade(){if(this.fadeNode&&this.audioCtx){let $=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues($),this.fadeNode.gain.setValueAtTime(1,$)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),o5(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let $=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData($),$}setPlaybackRate($){this.playbackRate=c5($),this.applyRateAndPitch()}setPreservesPitch($){this.preservesPitch=$,this.applyRateAndPitch()}applyRateAndPitch(){let $=this.hookedVideo??K.getVideo();if(!$)return;if($.playbackRate!==this.playbackRate)$.playbackRate=this.playbackRate;if($.preservesPitch!==this.preservesPitch){$.preservesPitch=this.preservesPitch;let Y=$;Y.webkitPreservesPitch=this.preservesPitch}}}class l0{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds($){this.crossfadeSeconds=Math.max(0,Math.min(12,$))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange($){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=$.videoId||`${$.title}-${$.artist}`,this.crossfadeSeconds>0)D.getInstance().fadeIn(this.crossfadeSeconds);else D.getInstance().resetFade()}onTick($,Y){if(!Y||this.crossfadeSeconds<=0||Y.durationSecs<=0)return;let q=Y.durationSecs-$;if(this.fadeOutTriggered&&q>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),D.getInstance().resetFade();return}if(q<=this.crossfadeSeconds&&!this.fadeOutTriggered&&q>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${q.toFixed(1)}s remaining)...`),D.getInstance().fadeOut(q),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let J=Y.videoId||`${Y.title}-${Y.artist}`;if(this.currentTrackId===J)console.log("[YTMD Crossfade] Advancing to next track..."),K.next()},Math.max(100,(q-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class d0{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled($){this.enabled=$}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick($,Y,q){if(!this.enabled||!Y||!q||q.paused||q.ended)return;let J=D.getInstance().getAudioPowerDb();if(J===null)return;if(!this.checkedIntro&&$<15)if(J<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&$<12)console.log(`[YTMD Skip Silence] Intro silence detected (${J.toFixed(1)} dB). Fast forwarding...`),q.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(Y.durationSecs>15&&$>Y.durationSecs-10)if(J<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${J.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,K.next()}else this.consecutiveSilentTicks=0}}var x=null,p=null,L0=null;function s5($){let Y=$.equalizer_gains;return Boolean($.equalizer_enabled||$.loudness_normalization||$.skip_silence_enabled||typeof $.crossfade_seconds==="number"&&$.crossfade_seconds>0||typeof $.preamp_gain==="number"&&$.preamp_gain!==0||Array.isArray(Y)&&Y.some((q)=>q!==0))}var y1={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit($){let Y=D.getInstance(),q=new l0,J=new d0;x=q,p=J;let X=$.config,Z=null,H=()=>{if(Z!==null)return;let W=$.getVideoElement();if(W){if(!Y.isInitializedFor(W))Y.init(W);return}Z=window.setInterval(()=>{let Q=$.getVideoElement();if(Q){if(Z!==null)clearInterval(Z);Z=null,Y.init(Q)}},500)};if(s5(X))H();if(X.equalizer_gains&&Array.isArray(X.equalizer_gains))Y.setAllGains(X.equalizer_gains);else if(X.equalizer_preset&&typeof X.equalizer_preset==="string")Y.applyPreset(X.equalizer_preset);if(X.preamp_gain!==void 0)Y.setPreamp(X.preamp_gain);if(X.loudness_normalization!==void 0)Y.setLoudnessNormalization(Boolean(X.loudness_normalization));if(X.crossfade_seconds!==void 0)q.setCrossfadeSeconds(X.crossfade_seconds);if(X.skip_silence_enabled!==void 0)J.setEnabled(Boolean(X.skip_silence_enabled));if(X.playback_speed!==void 0)Y.setPlaybackRate(X.playback_speed);if(X.preserve_pitch!==void 0)Y.setPreservesPitch(Boolean(X.preserve_pitch));let z=[];if(window.__TAURI__?.event){let{listen:W}=window.__TAURI__.event;z.push(W("set-eq-band",(Q)=>{H(),Y.setBandGain(Q.payload.bandIndex,Q.payload.gain)}),W("set-eq-all",(Q)=>{H(),Y.setAllGains(Q.payload.gains)}),W("set-eq-preset",(Q)=>{H(),Y.applyPreset(Q.payload)}),W("set-preamp",(Q)=>{H(),Y.setPreamp(Q.payload)}),W("set-loudness-normalization",(Q)=>{if(Q.payload)H();Y.setLoudnessNormalization(Q.payload)}),W("set-crossfade-seconds",(Q)=>{if(Q.payload>0)H();q.setCrossfadeSeconds(Q.payload)}),W("set-skip-silence",(Q)=>{if(Q.payload)H();J.setEnabled(Q.payload)}),W("set-playback-rate",(Q)=>{Y.setPlaybackRate(Q.payload)}),W("set-preserves-pitch",(Q)=>{Y.setPreservesPitch(Q.payload)}))}L0=()=>{if(Z!==null)clearInterval(Z),Z=null;z.forEach((W)=>W.then((Q)=>Q())),x?.destroy(),x=null,p=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange($){if(D.getInstance().applyRateAndPitch(),x)x.onTrackChange($);if(p)p.onTrackChange()},onTick($,Y){if(W0())return;if(x)x.onTick($,Y.track);if(p)p.onTick($,Y.track,Y.getVideoElement())},onDestroy(){if(L0)L0(),L0=null}};var n0=($,Y,q)=>{let J=(Z)=>Math.max(0,Math.min(255,Math.round(Z))),X=(Z)=>J(Z).toString(16).padStart(2,"0");return`#${X($)}${X(Y)}${X(q)}`};async function m1($){return new Promise((Y)=>{let q={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!$){Y(q);return}let J=new Image;J.crossOrigin="anonymous",J.onload=()=>{try{let X=document.createElement("canvas");X.width=16,X.height=16;let Z=X.getContext("2d");if(!Z){Y(q);return}Z.drawImage(J,0,0,16,16);let H=Z.getImageData(0,0,16,16).data,z=0,W=0,Q=0,G=0,V=0,h=0,N=0,L=0;for(let U=0;U<H.length;U+=4){let _=H[U],u=H[U+1],A=H[U+2];if(H[U+3]<128)continue;let Y1=(_+u+A)/3;if(Y1<20||Y1>240)continue;if(U<H.length/2)z+=_,W+=u,Q+=A,G++;else V+=_,h+=u,N+=A,L++}if(G===0&&L===0){Y(q);return}let b=G>0?Math.round(z/G):220,C=G>0?Math.round(W/G):38,O=G>0?Math.round(Q/G):38,R=L>0?Math.round(V/L):24,g=L>0?Math.round(h/L):24,f=L>0?Math.round(N/L):27;Y({primary:n0(b,C,O),secondary:n0(R,g,f),accent:n0(b+30,C+30,O+30)})}catch{Y(q)}},J.onerror=()=>Y(q),J.src=$})}var T=48,i5=3,a5=3,t5=1.65,e5=0.55;function $8($,Y,q,J){let X=new Float32Array($.length),Z=(H,z,W)=>{let Q=W?q:Y,G=W?Y:q;for(let V=0;V<Q;V++)for(let h=0;h<4;h++)for(let N=0;N<G;N++){let L=0,b=0;for(let O=Math.max(0,N-J);O<=Math.min(G-1,N+J);O++){let R=W?(V*Y+O)*4+h:(O*Y+V)*4+h;L+=H[R],b++}let C=W?(V*Y+N)*4+h:(N*Y+V)*4+h;z[C]=L/b}};Z($,X,!0),Z(X,$,!1)}function Y8($,Y,q){for(let J=0;J<$.length;J+=4){let X=$[J],Z=$[J+1],H=$[J+2],z=0.2126*X+0.7152*Z+0.0722*H;$[J]=(z+(X-z)*Y)*q,$[J+1]=(z+(Z-z)*Y)*q,$[J+2]=(z+(H-z)*Y)*q}}async function x1($,Y=e5){if(!$)return null;return new Promise((q)=>{let J=new Image;J.crossOrigin="anonymous",J.onload=()=>{try{let X=document.createElement("canvas");X.width=T,X.height=T;let Z=X.getContext("2d");if(!Z)return q(null);Z.imageSmoothingQuality="high",Z.drawImage(J,0,0,T,T);let H=Z.getImageData(0,0,T,T);for(let z=0;z<a5;z++)$8(H.data,T,T,i5);Y8(H.data,t5,Y),Z.putImageData(H,0,0),q(X.toDataURL("image/png"))}catch{q(null)}},J.onerror=()=>q(null),J.src=$})}var b0=null,N0=null,K0,I1={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit($){let Y=document.getElementById("ytmd-ambient-backdrop");if(!Y)Y=F("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(Y);Y.replaceChildren();let q=F("img",{id:"ytmd-ambient-cover"});q.alt="";let J=F("div",{id:"ytmd-ambient-veil"});Y.appendChild(q),Y.appendChild(J);let X=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6,Z=$.config.ambient_lighting_enabled!==!1,H=document.createElement("style");H.id="ytmd-ambient-styles",H.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
        opacity: ${Z?X:0};
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
    `,document.head.appendChild(H),b0=(W)=>{if(Y)Y.style.opacity=String(W)};let z=[];if(window.__TAURI__?.event)z.push(window.__TAURI__.event.listen("set-ambient-intensity",(W)=>{b0?.(W.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(W)=>{let Q=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6;b0?.(W.payload?Q:0)}));if(N0=()=>{z.forEach((W)=>W.then((Q)=>Q())),b0=null,K0=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},$.track)this.onTrackChange($.track,$)},async onTrackChange($){let Y=$.coverUrl||null;if(Y===K0)return;K0=Y;let q=document.getElementById("ytmd-ambient-cover");if(q){let J=Y?await x1(Y):null;if(Y!==K0)return;if(q.style.opacity=J?"1":"0",J)q.src=J}try{let J=await m1(Y||""),X=document.documentElement.style;X.setProperty("--ytmd-accent",J.accent),X.setProperty("--ytmd-accent-primary",J.primary),X.setProperty("--ytmd-accent-secondary",J.secondary)}catch{}},onDestroy(){if(N0)N0(),N0=null}};var g1=`
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

`,k1=`
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

`;var C0=null,S1={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit($){let Y=()=>document.head||document.documentElement,q=(z)=>{let W=document.getElementById(z);if(!W){W=document.createElement("style"),W.id=z;let Q=Y();if(Q)Q.appendChild(W)}return W},J=(z)=>{let W=q("ytmd-active-theme");W.textContent=z?g1:k1},X=(z)=>{let W=q("ytmd-custom-css");if(W)W.textContent=z};J($.config.ambient_lighting_enabled!==!1);let Z=$.config.custom_css||"";X(Z);let H=[];if(window.__TAURI__?.event)H.push(window.__TAURI__.event.listen("set-ambient-enabled",(z)=>{J(z.payload)}),window.__TAURI__.event.listen("set-custom-css",(z)=>{X(z.payload)}));C0=()=>{H.forEach((z)=>z.then((W)=>W()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(C0)C0(),C0=null}};var B0=null,v1={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit($){let Y=()=>{if(document.getElementById("ytmd-pip-btn"))return;let J=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(J){let X=v({id:"ytmd-pip-btn",label:j().pipButton,iconPath:M.pip});X.addEventListener("click",async()=>{let Z=$.getVideoElement();if(!Z)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await Z.requestPictureInPicture();else await $.invoke("toggle_mini_player")}catch(H){console.warn("[YTMD PiP] Could not enter PiP:",H),await $.invoke("toggle_mini_player").catch((z)=>console.error("[YTMD PiP] Mini player fallback failed:",z))}}),J.appendChild(X)}},q=window.setInterval(Y,1000);Y(),B0=()=>{clearInterval(q),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(B0)B0(),B0=null}};function q8($){if($.error)return"failed";if($.output_path&&$.percent>=100)return"done";return"progress"}var O0="ytmd-download-btn",J8=3000,l=new Map,r0=new Set,D0=null,M0=null;function d(){let $=document.getElementById(O0);if(!$)return;let Y=D0?.videoId,q=Y?l.get(Y):void 0;B1($,q?Math.max(0.05,q.fraction):null),C1($,Y&&r0.has(Y)?M.check:M.download),$.setAttribute("aria-disabled",Y?"false":"true");let J=q?j().downloadInProgress:j().downloadButton;$.setAttribute("aria-label",J),$.dataset.ytmdTooltip=J}function o0($,Y){let q=l.get($);if(!q)return;if(l.delete($),Y.ok)r0.add($),setTimeout(()=>{r0.delete($),d()},J8),B(j().downloadDone(q.title),{id:`download-${$}`});else B(j().downloadFailed(Y.reason),{id:`download-${$}`,durationMs:8000});d()}function X8($){let Y=l.get($.video_id);if(!Y)return;let q=q8($);if(q==="failed")o0($.video_id,{ok:!1,reason:$.error||$.status});else if(q==="done")o0($.video_id,{ok:!0});else Y.fraction=$.percent/100,d()}function c0($,Y){let q=Y?.videoId;if(!Y||!q){B(j().downloadNoTrack);return}if(l.has(q)){B(j().downloadInProgress);return}l.set(q,{title:Y.title,fraction:0}),d(),B(j().downloadStarted(Y.title),{id:`download-${q}`}),$.invoke("download_track",{request:{video_id:q,title:Y.title,artist:Y.artist,album:Y.album||void 0,cover_url:Y.coverUrl||void 0,format:$.config.download_format||"mp3",embed_lyrics:$.config.embed_lyrics!==!1}}).catch((J)=>{console.error("[YTMD Downloader] Download failed:",J),o0(q,{ok:!1,reason:J instanceof Error?J.message:String(J)})})}var p1={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit($){D0=$.track;let Y=()=>{if(document.getElementById(O0))return;let X=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!X)return;let Z=v({id:O0,label:j().downloadButton,iconPath:M.download});Z.addEventListener("click",()=>{if(Z.getAttribute("aria-disabled")==="true")return;c0($,D0)}),X.appendChild(Z),d()},q=window.setInterval(Y,1000);Y();let J=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(X)=>X8(X.payload)):null;M0=()=>{clearInterval(q),J?.then((X)=>X()),document.getElementById(O0)?.remove()}},onTrackChange($){D0=$,d()},onDestroy(){if(M0)M0(),M0=null}};var l1={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit($){console.log("[YTMD] Local files module ready.")}};var U0="ytmd-nav-slot",s0="ytmd-menu-btn",J0="ytmd-menu",d1="ytmd-sync-chip",r1=[],q0=null,o1=null,n1=!1,Z8=`
  #${U0} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function Q8(){if(document.getElementById("ytmd-nav-slot-styles"))return;let $=document.createElement("style");$.id="ytmd-nav-slot-styles",$.textContent=Z8,document.head.appendChild($)}function z8($){if(!$)return;return`${j().syncInRoom} · ${j().syncListeners($.listeners)}`}function c1($){r1=$.items,o1=$.onSyncChipClick}function i0(){if(document.getElementById(U0)?.isConnected)return;let $=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!$)return;E(),Q8();let Y=F("div",{id:U0}),q=v({id:s0,label:j().menuLabel,iconPath:M.apps});q.setAttribute("aria-haspopup","menu"),q.setAttribute("aria-expanded","false"),q.addEventListener("click",(J)=>{J.stopPropagation(),H8(q)}),Y.appendChild(q),$.prepend(Y),s1(),j8()}function a0($){q0=$,s1();let Y=document.getElementById(J0);if(Y?.classList.contains("ytmd-open"))i1(Y)}function s1(){let $=document.getElementById(U0);if(!$)return;let Y=document.getElementById(d1);if(!q0){Y?.remove();return}if(!Y)Y=F("button",{id:d1,className:"ytmd-chip"}),Y.type="button",Y.addEventListener("click",()=>o1?.()),$.prepend(Y);let q=j().syncListeners(q0.listeners);Y.replaceChildren(F("span",{className:"ytmd-chip-dot"}),s(M.group,18),F("span",{text:q})),Y.dataset.ytmdTooltip=`${j().syncInRoom} · ${q0.roomCode}`,Y.setAttribute("aria-label",`${j().syncInRoom}, ${q}`)}function i1($){let Y=[];for(let q of r1){if(q.dividerBefore)Y.push(F("div",{className:"ytmd-menu-divider"}));let J=F("button",{className:"ytmd-menu-item"});J.type="button",J.setAttribute("role","menuitem"),J.dataset.itemId=q.id;let X=F("span",{className:"ytmd-menu-item-text"});X.appendChild(F("span",{text:q.label}));let Z=q.id==="sync"?z8(q0):void 0;if(Z)X.appendChild(F("span",{className:"ytmd-menu-item-sub",text:Z}));if(J.append(s(q.iconPath),X),q.hint)J.appendChild(F("span",{className:"ytmd-menu-item-hint",text:q.hint}));J.addEventListener("click",()=>{n(),q.onSelect()}),Y.push(J)}$.replaceChildren(...Y)}function W8(){let $=document.getElementById(J0);if(!$)$=F("div",{id:J0,className:"ytmd-menu"}),$.setAttribute("role","menu"),$.addEventListener("keydown",G8),document.body.appendChild($);return $}function H8($){let Y=W8();if(Y.classList.contains("ytmd-open")){n();return}i1(Y);let q=$.getBoundingClientRect();Y.style.top=`${q.bottom+4}px`,Y.style.right=`${Math.max(8,window.innerWidth-q.right)}px`,Y.classList.add("ytmd-open"),$.setAttribute("aria-expanded","true"),Y.querySelector(".ytmd-menu-item")?.focus()}function n(){let $=document.getElementById(J0);if(!$?.classList.contains("ytmd-open"))return;$.classList.remove("ytmd-open");let Y=document.getElementById(s0);if(Y?.setAttribute("aria-expanded","false"),$.contains(document.activeElement))Y?.focus()}function G8($){let Y=$.currentTarget,q=Array.from(Y.querySelectorAll(".ytmd-menu-item")),J=q.indexOf(document.activeElement);if($.key==="Escape")$.stopPropagation(),n();else if($.key==="ArrowDown")$.preventDefault(),q[(J+1)%q.length]?.focus();else if($.key==="ArrowUp")$.preventDefault(),q[(J-1+q.length)%q.length]?.focus();else if($.key==="Tab")n()}function j8(){if(n1)return;n1=!0,document.addEventListener("mousedown",($)=>{let Y=document.getElementById(J0);if(!Y?.classList.contains("ytmd-open"))return;let q=$.target;if(Y.contains(q)||document.getElementById(s0)?.contains(q))return;n()}),window.addEventListener("resize",n)}function V8($,Y,q){let J=new Set($.map((Z)=>Z.id)),X=new Set(Y.map((Z)=>Z.id));return{joined:Y.filter((Z)=>Z.id!==q&&!J.has(Z.id)).map((Z)=>Z.nickname),left:$.filter((Z)=>Z.id!==q&&!X.has(Z.id)).map((Z)=>Z.nickname)}}var P0=/^[A-Za-z0-9_-]{11}$/,h8=2,F8=0.25,L8=0.05,b8=3,a1=0.1,N8=0.5,K8=1,C8=1000,B8=1,M8=5000,O8=4000,t1=15000,D8=3,U8=4000,A8=1e4;function P8($,Y,q){let J={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(P0.test($.video_id)&&Y.videoId!==$.video_id)return J.navigateTo=$.video_id,J;if($.is_playing===Y.paused)J.setPlaying=$.is_playing;if(!$.is_playing){if(Math.abs(Y.currentTime-$.current_time_secs)>N8)J.seekTo=$.current_time_secs;return J}let X=$.current_time_secs+Math.min(K8,Math.max(0,q)),Z=X-Y.currentTime;if(Math.abs(Z)>h8)J.seekTo=X;else if(Math.abs(Z)>(Y.correcting?L8:F8))J.playbackRate=1+Math.max(-a1,Math.min(a1,Z/b8));return J}class q5{windowSize;samples=[];constructor($=30){this.windowSize=$}transitSecs($,Y){let q=Y-$;if(this.samples.push(q),this.samples.length>this.windowSize)this.samples.shift();return(q-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function _8($,Y){return Y!==null&&$<Y&&Y-$<A8}function J5($,Y){switch($){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:Y};default:return null}}var w8=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function e1(){return new URLSearchParams(window.location.search).get("v")}function $5(){let $=document.getElementById("movie_player");return!!$&&($.classList.contains("ad-showing")||$.classList.contains("ad-interrupting"))}function Y5($){let Y=document.querySelector("ytmusic-app");if(!Y){window.location.href=`https://music.youtube.com/watch?v=${$}`;return}Y.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:$}}}}))}class X5{isHost=!1;inRoom=!1;lastBroadcast=null;pendingNav=null;transit=new q5;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;rateCorrection=null;setRoomState($,Y){let q=$!==this.inRoom||Y!==this.isHost;if(this.inRoom=$,this.isHost=Y,h1(this.isGuest()),!q)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback($,Y,q=Date.now()){if(!this.isGuest()||$5())return;if(_8($.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=$.timestamp_ms;let J=this.transit.transitSecs($.timestamp_ms,q);if(P0.test($.video_id))this.hostVideoId=$.video_id;let X=this.requestedVideo;if(X){if($.video_id!==X.videoId&&q-X.atMs<O8)return;this.requestedVideo=null}let Z={videoId:e1(),paused:Y?Y.paused:!0,currentTime:Y?Y.currentTime:0,correcting:this.rateCorrection!==null},H=P8($,Z,J);if(H.navigateTo){this.endRateCorrection();let z=this.pendingNav;if(z&&z.videoId===H.navigateTo&&q-z.atMs<M8)return;let W=z&&z.videoId===H.navigateTo?z.attempts+1:1;if(this.pendingNav={videoId:H.navigateTo,atMs:q,attempts:W},this.rememberOwnNav(H.navigateTo,q),W>1)window.location.href=`https://music.youtube.com/watch?v=${H.navigateTo}`;else Y5(H.navigateTo);return}if(this.pendingNav=null,!Y)return;if(H.setPlaying===!0)K.play();else if(H.setPlaying===!1)K.pause();if(H.seekTo!==null)this.endRateCorrection(),K.seekTo(H.seekTo);else this.setCatchUpRate(Y,H.playbackRate)}rememberOwnNav($,Y){for(let[q,J]of this.ownNavs)if(Y-J>t1)this.ownNavs.delete(q);this.ownNavs.set($,Y)}setCatchUpRate($,Y){if(Y===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==$)this.endRateCorrection(),this.rateCorrection={video:$,rate:$.playbackRate,preservesPitch:$.preservesPitch};$.preservesPitch=!0,$.playbackRate=Y}endRateCorrection(){let $=this.rateCorrection;if(!$)return;this.rateCorrection=null,$.video.playbackRate=$.rate,$.video.preservesPitch=$.preservesPitch}noteLocalTick($,Y=Date.now()){if(!this.isGuest()||!$)return;if(Number.isFinite($.duration)&&$.duration>0&&$.duration-$.currentTime<D8)this.nearEndAtMs=Y}handleLocalTrackChange($,Y=Date.now()){if(!this.isGuest()||!$||!P0.test($))return null;if(this.hostVideoId===null||$===this.hostVideoId)return null;let q=this.ownNavs.get($);if(q!==void 0&&Y-q<t1)return null;if(Y-this.nearEndAtMs<U8)return null;if(this.requestedVideo?.videoId===$)return null;return this.requestedVideo={videoId:$,atMs:Y},{kind:"play_video",video_id:$}}requestControl($,Y){Y("send_sync_control",{action:$}).catch((q)=>{console.error("[YTMD Room Sync] control request failed:",q),B(j().actionFailed)})}applyRemoteControl($){if(!this.inRoom||!this.isHost)return;let{from:Y,action:q}=$;switch(q.kind){case"next":K.next(),B(j().syncGuestNext(Y));break;case"previous":K.previous(),B(j().syncGuestPrevious(Y));break;case"set_playing":{let J=K.getVideo();if(!J||J.paused!==q.playing)return;if(q.playing)K.play();else K.pause();B(q.playing?j().syncGuestResumed(Y):j().syncGuestPaused(Y));break}case"play_video":if(!P0.test(q.video_id)||q.video_id===e1())return;Y5(q.video_id),B(j().syncGuestPicked(Y));break}}broadcastLocalState($,Y,q,J=!1){if(!this.inRoom||!this.isHost||!$||!$.videoId||!Y||$5())return;let X=Date.now(),Z=this.lastBroadcast,H=Z?Z.position+(X-Z.atMs)/1000*Z.rate:0,z=!!Z&&Z.playing&&!Y.paused&&Math.abs(Y.currentTime-H)>B8;if(!J&&!z&&Z&&X-Z.atMs<C8)return;this.lastBroadcast={atMs:X,position:Y.currentTime,rate:Y.playbackRate,playing:!Y.paused},q("broadcast_sync_state",{playback:{video_id:$.videoId,title:$.title,artist:$.artist,current_time_secs:Y.currentTime,is_playing:!Y.paused,timestamp_ms:X}}).catch((W)=>console.error("[YTMD Room Sync] broadcast failed:",W))}}var y=null,_0=null,A0=null,e0=null;function Z5($){let Y=y;if(!Y||!_0||!Y.isGuest())return!1;let q=K.getVideo(),J=J5($,q?q.paused:!0);if(!J)return!1;return Y.requestControl(J,_0),!0}function t0($,Y){let q=e0;if(e0=$,a0($?{roomCode:$.room_code,listeners:$.members.length,isHost:$.is_host}:null),!Y)return;if(!$){if(q)B(j().syncRoomClosed);return}if(!q||q.room_code!==$.room_code){if(!$.is_host)B(j().syncConnected);return}let{joined:J,left:X}=V8(q.members,$.members,$.current_user_id),Z=[...J.map(j().syncJoined),...X.map(j().syncLeft)];if(Z.length>0)B(Z.join(" · "))}var Q5={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit($){let Y=new X5;y=Y,_0=$.invoke;let q=[];if(window.__TAURI__?.event)q.push(window.__TAURI__.event.listen("sync-room-updated",(X)=>{Y.setRoomState(!0,X.payload.is_host),t0(X.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",()=>{Y.setRoomState(!1,!1),t0(null,!0)}),window.__TAURI__.event.listen("sync-playback-remote",(X)=>{Y.handleRemotePlayback(X.payload,$.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(X)=>{Y.applyRemoteControl(X.payload)}));let J=(X)=>{if(!X.isTrusted||!Y.isGuest()||!(X.target instanceof Element))return;let Z=X.target,H=w8.find(([Q])=>Z.closest(Q));if(!H)return;let z=$.getVideoElement(),W=J5(H[1],z?z.paused:!0);if(!W)return;X.preventDefault(),X.stopImmediatePropagation(),Y.requestControl(W,$.invoke)};window.addEventListener("click",J,!0),$.invoke("get_sync_room_state").then((X)=>{if(y!==Y||!X||typeof X!=="object")return;let Z=X;if(Y.setRoomState(!0,Z.is_host),t0(Z,!1),!Z.is_host&&Z.playback_state)Y.handleRemotePlayback(Z.playback_state,$.getVideoElement())}).catch((X)=>console.error("[YTMD Room Sync] failed to restore room state:",X)),A0=()=>{q.forEach((X)=>X.then((Z)=>Z())),window.removeEventListener("click",J,!0),Y.setRoomState(!1,!1),y=null,_0=null,e0=null,a0(null)}},onTrackChange($,Y){let q=y;if(!q)return;q.broadcastLocalState($,Y.getVideoElement(),Y.invoke,!0);let J=q.handleLocalTrackChange($.videoId);if(J)q.requestControl(J,Y.invoke)},onPlaybackChange($,Y){y?.broadcastLocalState(Y.track,Y.getVideoElement(),Y.invoke,!0)},onTick($,Y){let q=Y.getVideoElement();y?.broadcastLocalState(Y.track,q,Y.invoke),y?.noteLocalTick(q)},onDestroy(){if(A0)A0(),A0=null}};var w0=null,u8=($,Y)=>Y&&$!==!1,z5={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit($){let Y=null,q=!1,J=null,X=(h)=>{if(q===h)return;q=h,$.invoke("set_inhibit_sleep",{inhibit:h}).catch((N)=>{q=!h,console.error("[YTMD Power] set_inhibit_sleep failed:",N)})},Z=async()=>{if(!("wakeLock"in navigator)||Y!==null)return;try{Y=await navigator.wakeLock.request("screen"),Y.addEventListener("release",()=>{Y=null})}catch{}},H=()=>{Y?.release().catch(()=>{}),Y=null},z=()=>{let h=$.getVideoElement(),N=!!h&&!h.paused&&!h.ended,L=u8($.config.inhibit_sleep,N);if(X(L),L)Z();else H()},W=(h)=>{for(let N of["play","playing","pause","ended"])h.addEventListener(N,z);J=h},Q=(h)=>{for(let N of["play","playing","pause","ended"])h.removeEventListener(N,z)},G=$.getVideoElement();if(G)W(G);z();let V=window.setInterval(()=>{let h=$.getVideoElement();if(h&&h!==J){if(J)Q(J);W(h),z()}},1000);w0=()=>{if(clearInterval(V),J)Q(J);J=null,H(),X(!1)}},onDestroy(){if(w0)w0(),w0=null}};var W5={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit($){window.__ytmd_show_remote_qr=()=>$1($),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},R8=`
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
`;function f8(){if(document.getElementById("ytmd-qr-styles"))return;let $=document.createElement("style");$.id="ytmd-qr-styles",$.textContent=R8,document.head.appendChild($)}async function $1($){f8();let Y=F("p",{text:j().remoteBody,style:"margin: 0;"}),q=F("div",{className:"ytmd-qr-frame",text:j().remoteLoading}),J=F("div",{className:"ytmd-qr-url"}),X=M1({id:"ytmd-remote-modal",title:j().remoteTitle,body:[Y,q,J],actions:[{label:j().close}]});try{let Z=await $.invoke("get_remote_info");if(!q.isConnected)return;if(Z?.qr_svg){let H=F("img");H.src=`data:image/svg+xml;utf8,${encodeURIComponent(Z.qr_svg)}`,H.alt=j().remoteTitle,q.replaceChildren(H)}else q.textContent=j().remoteUnavailable;if(Z?.url)J.textContent=Z.url}catch(Z){if(console.error("[YTMD Remote] Error fetching remote info:",Z),q.isConnected)q.textContent=j().remoteUnavailable}return X}function E8($,Y){if(!Y||typeof Y!=="object"||!("ok"in Y))throw Error(`Malformed response to ${$}`);let q=Y;if(!q.ok)throw Error(q.error||`${$} failed`);return q.data??null}var T8=8000,I=($,Y={},q={})=>{return new Promise((J,X)=>{let Z=window.__TAURI__;if(!Z?.event?.emit){X(Error("Tauri bridge unavailable"));return}let H=Math.random().toString(36).slice(2)+Date.now().toString(36),z=null,W=setTimeout(()=>{if(z)z();X(Error(`Timed out waiting for ${$}`))},q.timeoutMs??T8);Z.event.listen(`ytmd-response-${H}`,(Q)=>{if(clearTimeout(W),z)z();try{J(E8($,Q.payload))}catch(G){X(G)}}).then((Q)=>{return z=Q,Z.event.emit("ytmd-invoke",{id:H,cmd:$,args:Y})}).catch((Q)=>{clearTimeout(W),X(Q instanceof Error?Q:Error(String(Q)))})})};var j5=null,X0=null,r=($)=>{I($).catch((Y)=>{console.error(`[YTMD] ${$} failed:`,Y),B(j().actionFailed)})};function y8(){c1({onSyncChipClick:()=>r("toggle_sync_window"),items:[{id:"settings",iconPath:M.tune,label:j().menuSettings,hint:"Ctrl+,",onSelect:()=>r("toggle_settings_window")},{id:"local",iconPath:M.folderMusic,label:j().menuLocal,onSelect:()=>r("toggle_local_library_window")},{id:"sync",iconPath:M.group,label:j().menuSync,onSelect:()=>r("toggle_sync_window")},{id:"remote",iconPath:M.phone,label:j().menuRemote,onSelect:()=>{if(X0)$1(X0)}},{id:"mini",iconPath:M.miniPlayer,label:j().menuMiniPlayer,onSelect:()=>r("toggle_mini_player")},{id:"download",iconPath:M.download,label:j().menuDownload,dividerBefore:!0,onSelect:()=>{if(X0)c0(X0,j5)}}]})}var m8={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function H5($){let Y={};for(let[q,[J,X]]of Object.entries(m8)){let Z=$[J];Y[q]=typeof Z==="boolean"?Z:X}return Y}async function G5(){console.log("[YTMD] Initializing desktop integration bridge...");let $={};y8(),i0();let Y=setInterval(i0,1000);window.addEventListener("pagehide",()=>clearInterval(Y));try{let Q=await I("get_config");if(Q&&typeof Q==="object")Object.assign($,Q)}catch(Q){console.error("[YTMD] Failed to load config, using defaults:",Q)}let q={track:null,config:$,invoke:I,sendPlayerCommand:(Q)=>{z(Q)},getVideoElement:()=>K.getVideo()};X0=q;let J=new E0(q);J.register(j1),J.register(F1),J.register(P1),J.register(f1),J.register(E1),J.register(T1),J.register(y1),J.register(I1),J.register(S1),J.register(v1),J.register(p1),J.register(l1),J.register(Q5),J.register(z5),J.register(W5);try{await J.initAll(H5($))}catch(Q){console.error("[YTMD] Registry init error:",Q)}let X=new u0,Z=0,H=Date.now();X.onTrackChange(async(Q)=>{j5=Q,Z=Q.currentTimeSecs||0,H=Date.now(),J.handleTrackChange(Q);try{await I("update_track_info",{track:{title:Q.title,artist:Q.artist,album:Q.album||null,cover_url:Q.coverUrl||null,duration_secs:Math.round(Q.durationSecs||0),current_time_secs:Math.round(Q.currentTimeSecs||0),is_playing:Q.isPlaying,video_id:Q.videoId||null}})}catch(G){console.error("[YTMD] Failed to sync track info to backend:",G)}}),X.onPlaybackChange(async(Q)=>{J.handlePlaybackChange(Q);let G=X.getCurrentTrack();if(G){G.isPlaying=Q,Z=G.currentTimeSecs||0,H=Date.now();try{await I("update_track_info",{track:{title:G.title,artist:G.artist,album:G.album||null,cover_url:G.coverUrl||null,duration_secs:Math.round(G.durationSecs||0),current_time_secs:Math.round(G.currentTimeSecs||0),is_playing:Q,video_id:G.videoId||null}})}catch(V){console.error("[YTMD] Failed to sync playback status:",V)}}}),X.onTick((Q)=>{J.handleTick(Q);let G=X.getCurrentTrack();if(!G||!G.isPlaying)return;let V=Date.now(),h=(V-H)/1000,N=Z+h;if(Math.abs(Q-N)>2||h>=15)Z=Q,H=V,G.currentTimeSecs=Math.round(Q),I("update_track_info",{track:{title:G.title,artist:G.artist,album:G.album||null,cover_url:G.coverUrl||null,duration_secs:Math.round(G.durationSecs||0),current_time_secs:Math.round(Q),is_playing:!0,video_id:G.videoId||null}}).catch((b)=>console.error("[YTMD] Failed to sync seek/progress to backend:",b))});function z(Q){if(Z5(Q))return;switch(Q){case"play":K.play();break;case"pause":K.pause();break;case"play_pause":K.playPause();break;case"next":K.next();break;case"previous":K.previous();break;case"like":K.toggleLike();break;case"dislike":K.toggleDislike();break;case"mute":K.toggleMute();break}}let W=(Q,G)=>{let V=window.__TAURI__;if(V?.event?.listen)V.event.listen(Q,(h)=>G(h.payload))};W("player-command",(Q)=>z(Q)),W("tray-command",(Q)=>z(Q)),W("mpris-command",(Q)=>z(Q)),W("global-shortcut-event",(Q)=>z(Q)),W("player-seek",(Q)=>K.seekTo(Q)),W("mpris-command-seek",(Q)=>K.seekTo(Q)),W("player-volume",(Q)=>K.setVolume(Q)),W("config-updated",(Q)=>{if(!Q||typeof Q!=="object")return;Object.assign($,Q);let G=H5($);for(let[V,h]of Object.entries(G))if(h)J.enable(V).catch((N)=>console.error(`[YTMD] Failed to enable plugin ${V}:`,N));else J.disable(V).catch((N)=>console.error(`[YTMD] Failed to disable plugin ${V}:`,N))}),window.addEventListener("keydown",(Q)=>{if(Q.ctrlKey&&Q.key===","||Q.key==="F2")Q.preventDefault(),r("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var x8=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(x8)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>G5());else G5();
