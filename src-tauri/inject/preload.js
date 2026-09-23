function e0($){let Y=$.trim().split(":").map((q)=>parseInt(q,10));if(Y.some((q)=>isNaN(q)))return 0;if(Y.length===2)return Y[0]*60+Y[1];else if(Y.length===3)return Y[0]*3600+Y[1]*60+Y[2];return 0}var $5=400;function Y5($,Y){return $-Y>=$5}class P0{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick($){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((Y)=>Y($))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange($){this.onTrackChangeCallbacks.push($)}onPlaybackChange($){this.onPlaybackChangeCallbacks.push($)}onTick($){this.onTickCallbacks.push($)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let q=navigator.mediaSession,J=q.metadata;try{Object.defineProperty(q,"metadata",{get:()=>J,set:(X)=>{J=X,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(X){}}this.syncVideoListeners();let $=!1,Y=()=>{if($)return;$=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),$=!1})};this.mutationObserver=new MutationObserver(Y),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let q=document.querySelector("video");if(q&&!q.paused&&Y5(Date.now(),this.lastTickMs))this.emitTick(q.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let $=document.querySelector("ytmusic-player-bar")||document.body;if(!$||$===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe($,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=$}attachVideoListeners($){$.addEventListener("play",this.handleVideoPlay),$.addEventListener("playing",this.handleVideoPlay),$.addEventListener("pause",this.handleVideoPause),$.addEventListener("ended",this.handleVideoPause),$.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=$}detachVideoListeners($){$.removeEventListener("play",this.handleVideoPlay),$.removeEventListener("playing",this.handleVideoPlay),$.removeEventListener("pause",this.handleVideoPause),$.removeEventListener("ended",this.handleVideoPause),$.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let $=document.querySelector("video");if($&&$!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners($)}}extractTrackInfo(){let $=document.querySelector("video"),Y=document.getElementById("movie_player");if(Boolean(Y&&(typeof Y.getAdState==="function"&&Y.getAdState()===1||typeof Y.isAdPlaying==="function"&&Y.isAdPlaying()||Y.classList?.contains("ad-showing")||Y.classList?.contains("ad-interrupting"))))return null;let J=navigator.mediaSession?.metadata,X=J?.title||"",Z=J?.artist||"",z=J?.album||"",W="";if(J?.artwork&&J.artwork.length>0){let F=J.artwork[J.artwork.length-1];if(F&&F.src)W=F.src}if(!X){let F=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(F)X=F.textContent?.trim()||""}if(!Z){let F=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(F){let C=(F.textContent?.trim()||"").split("•").map((b)=>b.trim());if(Z=C[0]||"",C.length>1)z=C[1]}}if(!W){let F=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(F&&F.src)W=F.src}if(W.startsWith("//"))W=`https:${W}`;if(W.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(W))W=W.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let H=new URLSearchParams(window.location.search).get("v")||void 0,G=0,V=0;if(Y&&typeof Y.getDuration==="function"){let F=Y.getDuration();if(typeof F==="number"&&Number.isFinite(F)&&F>0)G=Math.floor(F)}if(Y&&typeof Y.getCurrentTime==="function"){let F=Y.getCurrentTime();if(typeof F==="number"&&Number.isFinite(F)&&F>=0)V=Math.floor(F)}if(!G&&$&&Number.isFinite($.duration)&&$.duration>0)G=Math.floor($.duration);if(!V&&$&&Number.isFinite($.currentTime)&&$.currentTime>=0)V=Math.floor($.currentTime);let N=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(N&&N.textContent){let F=N.textContent.split("/").map((M)=>M.trim());if(F.length===2){if(!V)V=e0(F[0]);if(!G)G=e0(F[1])}}if(!G){let M=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(M){let C=parseInt(M,10);if(!isNaN(C)&&C>0)G=C}}let L=$?!$.paused&&!$.ended:!1;if(!X)return null;return{title:X,artist:Z||"Unknown Artist",album:z||void 0,coverUrl:W||void 0,durationSecs:G,currentTimeSecs:V,isPlaying:L,videoId:H}}checkTrackUpdate(){let $=this.extractTrackInfo();if(!$)return;let Y=!this.currentTrack||this.currentTrack.title!==$.title||this.currentTrack.artist!==$.artist||this.currentTrack.videoId!==$.videoId,q=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&$.durationSecs>0||!this.currentTrack.coverUrl&&!!$.coverUrl||!this.currentTrack.album&&!!$.album||!this.currentTrack.videoId&&!!$.videoId),J=this.currentTrack!==null&&this.currentTrack.isPlaying!==$.isPlaying;if(this.currentTrack=$,Y||q){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((X)=>X($))}if(J)this.onPlaybackChangeCallbacks.forEach((X)=>X($.isPlaying))}handlePlaybackChange($){if($){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((Y)=>Y(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((Y)=>Y(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function U0(){return document.getElementById("movie_player")}function $1($){for(let Y of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let q=document.querySelector(Y);if(!q||!("value"in q))continue;if("step"in q&&Number(q.step)>1)q.step=1;q.value=$}}function w0($){let Y=U0()?.getVolume?.(),q=typeof Y==="number"&&Number.isFinite(Y)?Y:$.volume*100;return Math.max(0,Math.min(100,Math.round(q)))}function Y1($){return U0()?.isMuted?.()===!0||$.muted}function Z0($,Y){if(!Number.isFinite($))return;let q=Math.max(0,Math.min(100,Math.round($))),J=U0();if(typeof J?.setVolume==="function"){if(J.setVolume(q),q>0&&J.isMuted?.())if(typeof J.unMute==="function")J.unMute();else Y.muted=!1;$1(q);return}if(Y.volume=q/100,q>0&&Y.muted)Y.muted=!1;$1(q)}class K{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let $=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if($){$.click();return}let Y=this.getVideo();if(Y)if(Y.paused)Y.play();else Y.pause()}static play(){let $=this.getVideo();if($&&$.paused)this.playPause()}static pause(){let $=this.getVideo();if($&&!$.paused)this.playPause()}static next(){let $=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if($)$.click()}static previous(){let $=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if($)$.click()}static seekTo($){let Y=this.getVideo();if(Y&&!isNaN($))Y.currentTime=Math.max(0,Math.min($,Y.duration||$))}static setVolume($){let Y=this.getVideo();if(Y)Z0($*100,Y)}static toggleLike(){let $=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if($)$.click()}static toggleDislike(){let $=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if($)$.click()}static toggleMute(){let $=document.querySelector("ytmusic-player-bar #volume-slider"),Y=this.getVideo();if(Y)Y.muted=!Y.muted;if($){let q=$.parentElement?.querySelector("paper-icon-button, #button");if(q)q.click()}}}class R0{plugins=new Map;enabledPlugins=new Set;context;constructor($){this.context=$}register($){if(this.plugins.set($.id,$),$.defaultEnabled)this.enabledPlugins.add($.id)}async initAll($){for(let[Y,q]of this.plugins)if($?.[Y]!==void 0?$[Y]:q.defaultEnabled){if(this.enabledPlugins.add(Y),q.onInit)try{await q.onInit(this.context)}catch(X){console.error(`[YTMD] Failed to init plugin ${Y}:`,X)}}else this.enabledPlugins.delete(Y)}async enable($){let Y=this.plugins.get($);if(Y&&!this.enabledPlugins.has($)){if(this.enabledPlugins.add($),Y.onInit)await Y.onInit(this.context)}}async disable($){let Y=this.plugins.get($);if(Y&&this.enabledPlugins.has($)){if(this.enabledPlugins.delete($),Y.onDestroy)await Y.onDestroy()}}handleTrackChange($){this.context.track=$;for(let Y of this.enabledPlugins){let q=this.plugins.get(Y);if(q?.onTrackChange)try{q.onTrackChange($,this.context)}catch(J){console.error(`[YTMD] Error in plugin ${Y} onTrackChange:`,J)}}}handlePlaybackChange($){for(let Y of this.enabledPlugins){let q=this.plugins.get(Y);if(q?.onPlaybackChange)try{q.onPlaybackChange($,this.context)}catch(J){console.error(`[YTMD] Error in plugin ${Y} onPlaybackChange:`,J)}}}handleTick($){for(let Y of this.enabledPlugins){let q=this.plugins.get(Y);if(q?.onTick)try{q.onTick($,this.context)}catch(J){console.error(`[YTMD] Error in plugin ${Y} onTick:`,J)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled($){return this.enabledPlugins.has($)}}var H0=null,g={adWasShowing:!1,preAdMuted:!1},T0=new WeakSet,r=null,W1=null,E0=0,i=!0,q5=1000,J5=($,Y,q)=>$-Y>=q,X5=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",Z5="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",H5=300,W5=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,Q5=`
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
`,z5=W5+Q5,G5=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],V5=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],j5=($)=>G5.some((Y)=>$.includes(Y)),N5=($,Y)=>{let q=Y.split("."),J=$;for(let Z=0;Z<q.length-1;Z++){if(J===null||typeof J!=="object")return!1;J=J[q[Z]]}let X=q[q.length-1];if(J!==null&&typeof J==="object"&&Object.prototype.hasOwnProperty.call(J,X))return delete J[X],!0;return!1},m0=($)=>{if($===null||typeof $!=="object")return!1;let Y=!1;for(let q of V5)if(N5($,q))Y=!0;return Y},h5=($)=>{if(typeof $==="string")return $;if($ instanceof URL)return $.href;return $.url},q1=!1,F5=()=>{if(q1)return;q1=!0;let $=window.fetch,Y=$.bind(window),q=async(...J)=>{let X=await Y(...J);if(!i||!j5(h5(J[0])))return X;let Z;try{Z=await X.clone().json()}catch{return X}if(!m0(Z))return X;let z=new Headers(X.headers);return z.delete("content-length"),z.delete("content-encoding"),new Response(JSON.stringify(Z),{status:X.status,statusText:X.statusText,headers:z})};window.fetch=Object.assign(q,$)},J1=!1,M5=()=>{if(J1)return;J1=!0;let $=JSON.parse;JSON.parse=(...Y)=>{let q=$(...Y);if(i)m0(q);return q}},X1=!1,L5=()=>{if(X1)return;X1=!0;let $;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>$,set:(Y)=>{if(i)m0(Y);$=Y}})};if(typeof window<"u")F5(),M5(),L5();var C5=($)=>{let Y=new Set($);return Y.has("ad-showing")||Y.has("ad-interrupting")},K5=($,Y,q)=>{if($&&!Y.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:q},setMutedTo:!0};if(!$&&Y.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:Y.preAdMuted},setMutedTo:Y.preAdMuted};return{nextState:Y,setMutedTo:null}},f0=()=>document.getElementById("movie_player"),O5=()=>{let $=f0();if(!$)return!1;return C5($.classList)},u0=($)=>{let Y=$.getVideoElement();if(!Y)return;let{nextState:q,setMutedTo:J}=K5(O5(),g,Y.muted);if(g=q,J!==null)Y.muted=J},Z1=($)=>{if(T0.has($))return;T0.add($),$.click()},W0=()=>{document.querySelectorAll(X5).forEach(Z1),document.querySelectorAll(Z5).forEach(($)=>{let Y=$.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(Y)Z1(Y)})},H1=($)=>{let Y=f0();if(W1=Y,!Y)return;r?.disconnect(),r=new MutationObserver(()=>{u0($),W0()}),r.observe(Y,{attributes:!0,attributeFilter:["class"]})},Q1={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit($){i=!0,g={adWasShowing:!1,preAdMuted:!1},T0=new WeakSet,E0=0;let Y=document.createElement("style");Y.id="ytmd-adblock-styles",Y.textContent=z5,document.head.appendChild(Y);let q=null,J=new MutationObserver(()=>{if(q!==null)return;q=setTimeout(()=>{q=null,W0()},H5)});J.observe(document.body,{childList:!0,subtree:!0}),H1($),W0(),u0($),H0=()=>{if(i=!1,r?.disconnect(),r=null,J.disconnect(),q!==null)clearTimeout(q);document.getElementById("ytmd-adblock-styles")?.remove();let X=$.getVideoElement();if(X&&g.adWasShowing)X.muted=g.preAdMuted;g={adWasShowing:!1,preAdMuted:!1}}},onTick($,Y){if(f0()!==W1)H1(Y);u0(Y);let q=Date.now();if(J5(q,E0,q5))E0=q,W0()},onDestroy(){if(H0)H0(),H0=null}};var k=[],Q0="",y0=new Set,b5=($,Y)=>$===Y,z1={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){k=[],Q0="",y0=new Set},onTrackChange($){if(!$.videoId||$.videoId===Q0)return;let Y=$.videoId;Q0=Y,k=[],y0=new Set;let q=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),J=`https://sponsor.ajay.app/api/skipSegments?videoID=${Y}&categories=${encodeURIComponent(q)}`;fetch(J,{signal:AbortSignal.timeout(3000)}).then(async(X)=>{if(!X.ok)return;let Z=await X.json();if(!b5(Y,Q0))return;k=Z,console.log(`[YTMD SponsorBlock] Loaded ${Z.length} segments for ${Y}`)}).catch(()=>{})},onTick($,Y){if(!k||k.length===0)return;let q=y0;for(let J of k){let[X,Z]=J.segment;if($>=X&&$<Z-0.5&&!q.has(J.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${J.category}): ${X}s -> ${Z}s`);let z=Y.getVideoElement();if(z)z.currentTime=Z,q.add(J.UUID);break}}}};function G1($,Y=18,q=18,J="0 0 24 24"){let X=document.createElementNS("http://www.w3.org/2000/svg","svg");X.setAttribute("width",String(Y)),X.setAttribute("height",String(q)),X.setAttribute("viewBox",J),X.setAttribute("fill","currentColor");let Z=document.createElementNS("http://www.w3.org/2000/svg","path");return Z.setAttribute("d",$),X.appendChild(Z),X}function h($,Y){let q=document.createElement($);if(Y?.id)q.id=Y.id;if(Y?.className)q.className=Y.className;if(Y?.text!==void 0)q.textContent=Y.text;if(Y?.title)q.title=Y.title;if(Y?.style)q.style.cssText=Y.style;return q}var V1="ytmd-kit-styles",A5=`
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
`;function u(){if(document.getElementById(V1))return;let $=document.createElement("style");$.id=V1,$.textContent=A5,(document.head||document.documentElement).appendChild($),B5()}var O={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function c($,Y=24){return G1($,Y,Y)}function v($){let Y=h("button",{id:$.id,className:`ytmd-icon-btn${$.muted?" ytmd-icon-btn--muted":""}`});return Y.type="button",Y.setAttribute("aria-label",$.label),Y.dataset.ytmdTooltip=$.label,Y.appendChild(c($.iconPath)),Y}function h1($,Y){$.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(c(Y))}function F1($,Y){let q=$.querySelector("svg.ytmd-progress-ring");if(Y===null){q?.remove();return}let J=17,X=2*Math.PI*J;if(!q){q=document.createElementNS("http://www.w3.org/2000/svg","svg"),q.setAttribute("class","ytmd-progress-ring"),q.setAttribute("viewBox","0 0 36 36");for(let W of["ytmd-progress-track","ytmd-progress-value"]){let Q=document.createElementNS("http://www.w3.org/2000/svg","circle");Q.setAttribute("class",W),Q.setAttribute("cx","18"),Q.setAttribute("cy","18"),Q.setAttribute("r",String(J)),Q.setAttribute("stroke-dasharray",String(X)),q.appendChild(Q)}$.appendChild(q)}let Z=Math.max(0,Math.min(1,Y));q.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(X*(1-Z)))}var j1=!1;function B5(){if(j1)return;j1=!0;let $=null,Y=null,q=null,J=()=>{if(Y!==null)clearTimeout(Y);Y=null,q=null,$?.classList.remove("ytmd-open")},X=(W)=>{let Q=W.dataset.ytmdTooltip;if(!Q)return;if(!$)$=h("div",{id:"ytmd-tooltip"}),$.setAttribute("role","tooltip"),document.body.appendChild($);$.textContent=Q;let H=W.getBoundingClientRect(),G=$.getBoundingClientRect(),N=H.bottom+8+G.height<window.innerHeight?H.bottom+8:H.top-8-G.height,L=Math.max(8,Math.min(window.innerWidth-G.width-8,H.left+H.width/2-G.width/2));$.style.top=`${N}px`,$.style.left=`${L}px`,$.classList.add("ytmd-open")},Z=(W)=>{let Q=W.target?.closest?.("[data-ytmd-tooltip]");if(!Q||Q===q)return;J(),q=Q,Y=setTimeout(()=>X(Q),250)},z=(W)=>{let Q=W.relatedTarget;if(q&&Q&&q.contains(Q))return;J()};document.addEventListener("mouseover",Z,!0),document.addEventListener("mouseout",z,!0),document.addEventListener("focusin",Z,!0),document.addEventListener("focusout",J,!0),document.addEventListener("mousedown",J,!0)}var f=null;function D($,Y={}){u();let q=document.getElementById("ytmd-toast-host");if(!q)q=h("div",{id:"ytmd-toast-host"}),q.setAttribute("role","status"),q.setAttribute("aria-live","polite"),document.body.appendChild(q);let J=q.querySelector(".ytmd-toast"),X=J&&Y.id&&J.dataset.toastId===Y.id&&!J.classList.contains("ytmd-leaving"),Z=X?J:h("div",{className:"ytmd-toast"});if(Y.id)Z.dataset.toastId=Y.id;let W=[h("span",{className:"ytmd-toast-text",text:$})];if(Y.action){let{label:H,onClick:G}=Y.action,V=h("button",{className:"ytmd-button",text:H});V.type="button",V.addEventListener("click",()=>{N1(),G()}),W.push(V)}if(Z.replaceChildren(...W),!X)q.replaceChildren(Z);if(f!==null)clearTimeout(f);f=null;let Q=Y.durationMs??4000;if(Q>0)f=setTimeout(N1,Q)}function N1(){if(f!==null)clearTimeout(f);f=null;let $=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!$)return;$.classList.add("ytmd-leaving"),setTimeout(()=>$.remove(),150)}function M1($){u(),document.getElementById($.id)?.remove();let Y=h("div",{id:$.id,className:"ytmd-scrim"}),q=h("div",{className:"ytmd-dialog"});q.setAttribute("role","dialog"),q.setAttribute("aria-modal","true");let J=`${$.id}-title`;q.setAttribute("aria-labelledby",J);let X=h("h2",{id:J,className:"ytmd-dialog-title",text:$.title}),Z=h("div",{className:"ytmd-dialog-body"});if($.body)Z.append(...$.body);let z=document.activeElement,W=()=>{document.removeEventListener("keydown",Q,!0),Y.remove(),z?.focus?.()},Q=(G)=>{if(G.key==="Escape")G.stopPropagation(),W()};document.addEventListener("keydown",Q,!0),Y.addEventListener("click",(G)=>{if(G.target===Y)W()});let H=h("div",{className:"ytmd-dialog-actions"});for(let G of $.actions){let V=h("button",{className:`ytmd-button${G.filled?" ytmd-button--filled":""}`,text:G.label});V.type="button",V.addEventListener("click",()=>G.onClick?G.onClick(W):W()),H.appendChild(V)}return q.append(X,Z,H),Y.appendChild(q),document.body.appendChild(Y),H.querySelector("button")?.focus(),{close:W,body:Z}}var L1={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:($)=>$===1?"1 listener":`${$} listeners`,syncJoined:($)=>`${$} joined`,syncLeft:($)=>`${$} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",downloadNoTrack:"Play a song first to download it",downloadStarted:($)=>`Downloading “${$}”`,downloadDone:($)=>`Downloaded “${$}”`,downloadFailed:($)=>`Download failed: ${$}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:"Source: LRCLIB",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:($)=>`Volume: ${$}%`},D5={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:($)=>{if($===1)return"1 słuchacz";let Y=$%100,q=$%10;return q>=2&&q<=4&&(Y<12||Y>14)?`${$} słuchacze`:`${$} słuchaczy`},syncJoined:($)=>`${$} dołącza do słuchania`,syncLeft:($)=>`${$} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:($)=>`Pobieranie: „${$}”`,downloadDone:($)=>`Pobrano: „${$}”`,downloadFailed:($)=>`Nie udało się pobrać: ${$}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:"Źródło: LRCLIB",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:($)=>`Głośność: ${$}%`},_5={en:L1,pl:D5};function P5($){let Y=($||"").toLowerCase().split(/[-_]/)[0];return _5[Y]??L1}var I0=null;function j(){if(!I0){let $=typeof document<"u"?document.documentElement.lang:"";I0=P5($||(typeof navigator<"u"?navigator.language:"en"))}return I0}var P=[],a=-1,t=null,w="",z0=null,s="",C1=($,Y)=>$===Y,b1={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit($){P=[],a=-1,t=null,w="",s="";let Y=document.createElement("style");Y.id="ytmd-native-lyrics-styles",Y.textContent=`
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
    `,document.head.appendChild(Y),u();let q=()=>{G0(),O1($)},J=()=>{setTimeout(()=>{G0(),g0()},50),setTimeout(()=>{g0()},250)};document.addEventListener("click",J,!0);let X=window.setInterval(q,600);q(),z0=()=>{clearInterval(X),document.removeEventListener("click",J,!0),Y.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((z)=>z.remove())}},async onTrackChange($,Y){let q=`${$.title} - ${$.artist}`;if(w===q&&P.length>0||s===q)return;w=q,s=q,P=[],a=-1,t=null,G0();let J=document.getElementById("ytmd-native-lyrics-wrapper");if(J)J.replaceChildren(h("div",{className:"ytmd-native-lyrics-status",text:j().lyricsLoading}));try{let X=await Y.invoke("fetch_lyrics",{artist:$.artist,title:$.title,albumName:$.album||null,duration:$.durationSecs||null});if(!C1(q,w))return;if(t=X,X?.syncedLyrics)P=f5(X.syncedLyrics);G0(),O1(Y),_1(Y)}catch{if(!C1(q,w))return;let X=document.getElementById("ytmd-native-lyrics-wrapper");if(X)X.replaceChildren(h("div",{className:"ytmd-native-lyrics-status",text:j().lyricsNone}))}finally{if(s===q)s=""}},onTick($){if(!P||P.length===0)return;let Y=V0(w),q=$+Y,J=-1;for(let X=0;X<P.length;X++)if(q>=P[X].timeSecs)J=X;else break;if(J!==a&&J>=0){a=J;let X=document.getElementById("ytmd-native-lyrics-wrapper");if(X){let Z=X.querySelectorAll(".ytmd-native-lyric-line");Z.forEach((W,Q)=>{if(Q===J)W.classList.add("active");else W.classList.remove("active")});let z=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(z&&T5(z)){let W=Z[J];if(W)W.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(z0)z0(),z0=null}},A1="ytmd-lyrics-offsets",U5=500;function B1(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function w5($){try{let Y=$?.getItem(A1);if(!Y)return new Map;let q=JSON.parse(Y);if(!Array.isArray(q))return new Map;return new Map(q.filter((J)=>Array.isArray(J)&&typeof J[0]==="string"&&typeof J[1]==="number"))}catch{return new Map}}function R5($,Y,q,J){if($.delete(Y),q!==0)$.set(Y,q);while($.size>U5){let X=$.keys().next().value;if(X===void 0)break;$.delete(X)}try{J?.setItem(A1,JSON.stringify([...$]))}catch{}}var x0=null;function D1(){if(!x0)x0=w5(B1());return x0}function V0($){return D1().get($)||0}function E5($,Y){R5(D1(),$,Y,B1())}function K1($){return`${$>0?"+":$<0?"−":""}${Math.abs($).toFixed(1)} s`}function T5($){if(!$||$.offsetParent===null||$.hasAttribute("hidden"))return!1;let Y=window.getComputedStyle($);return Y.display!=="none"&&Y.visibility!=="hidden"&&Y.opacity!=="0"}function u5($){return $.disabled!==!0&&!$.hasAttribute("disabled")&&$.getAttribute("aria-disabled")!=="true"&&!$.classList.contains("disabled")&&$.classList.contains("ytmd-lyrics-tab-unlocked")}function G0(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((Y)=>{let q=Y.textContent?.toLowerCase()||"";if(q.includes("tekst")||q.includes("lyrics")||q.includes("paroles")||q.includes("letras")){if(u5(Y))return;Y.disabled=!1,Y.removeAttribute("disabled"),Y.removeAttribute("aria-disabled"),Y.classList.remove("disabled"),Y.classList.add("ytmd-lyrics-tab-unlocked");let J={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!Y.endpoint)Y.endpoint=J;if(Y.data&&!Y.data.endpoint)Y.data.endpoint=J}})}function m5(){let $=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let q of Array.from($)){let J=q.textContent?.toLowerCase()||"";if(J.includes("tekst")||J.includes("lyrics")||J.includes("paroles")||J.includes("letras")){if(q.classList.contains("iron-selected")||q.getAttribute("aria-selected")==="true"||q.classList.contains("selected"))return!0}}let Y=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(Y){if((Y.classList.contains("iron-selected")||!Y.hasAttribute("hidden"))&&Y.getAttribute("aria-hidden")!=="true")return!0}return!1}function g0(){let $=document.getElementById("ytmd-native-lyrics-wrapper");if(!$)return;let Y=m5();$.style.setProperty("display",Y?"flex":"none","important")}function O1($){let Y=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!Y)return;let q=document.getElementById("ytmd-native-lyrics-wrapper");if(!q||!Y.contains(q)){if(!q)q=h("div",{id:"ytmd-native-lyrics-wrapper"});Y.appendChild(q),_1($)}g0()}function _1($){let Y=document.getElementById("ytmd-native-lyrics-wrapper");if(!Y)return;if(P&&P.length>0){let q=V0(w),J=h("span",{className:"ytmd-lyrics-offset-value",text:K1(q)}),X=(W)=>{let Q=W===null?0:Math.round((V0(w)+W)*10)/10;E5(w,Q),J.textContent=K1(Q)},Z=(W,Q,H)=>{let G=h("button",{className:"ytmd-chip",text:W});return G.type="button",G.dataset.ytmdTooltip=Q,G.setAttribute("aria-label",Q),G.addEventListener("click",H),G},z=h("div",{className:"ytmd-native-lyrics-footer"});z.append(h("span",{className:"ytmd-lyrics-source",text:j().lyricsSource}),h("span",{text:j().lyricsOffset}),Z("−0.5 s",j().lyricsLater,()=>X(-0.5)),J,Z("+0.5 s",j().lyricsEarlier,()=>X(0.5)),Z(j().lyricsReset,j().lyricsReset,()=>X(null))),Y.replaceChildren(...P.map((W,Q)=>{let H=h("div",{className:`ytmd-native-lyric-line${Q===a?" active":""}`,text:W.text});return H.addEventListener("click",()=>{let G=$.getVideoElement();if(G){let V=V0(w);G.currentTime=Math.max(0,W.timeSecs-V)}}),H}),z)}else if(t?.plainLyrics){let q=t.plainLyrics.split(`
`);Y.replaceChildren(...q.map((J)=>h("div",{className:"ytmd-native-lyric-line ytmd-plain",text:J})),h("div",{className:"ytmd-native-lyrics-footer",text:j().lyricsSource}))}else Y.replaceChildren(h("div",{className:"ytmd-native-lyrics-status",text:j().lyricsNone}))}function f5($){let Y=$.split(`
`),q=[],J=0,X=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,Z=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let z of Y){let W=z.trim();if(!W)continue;let Q=Z.exec(W);if(Q){let V=parseInt(Q[1],10);if(!isNaN(V))J=V/1000;continue}let H=[],G;X.lastIndex=0;while((G=X.exec(W))!==null){let V=parseInt(G[1],10),N=parseInt(G[2],10),L=0;if(G[3])L=parseInt(G[3].padEnd(3,"0").slice(0,3),10);H.push(V*60+N+L/1000)}if(H.length>0){let V=W.replace(X,"").trim();if(V)for(let N of H)q.push({timeSecs:Math.max(0,N-J),text:V})}}return q.sort((z,W)=>z.timeSecs-W.timeSecs)}var e=null;function $0($){if(!$)return null;let Y=$.getBoundingClientRect();if(Y.width<80||Y.height<80||Y.bottom<=0||Y.right<=0||Y.top>=window.innerHeight||Y.left>=window.innerWidth)return null;for(let q=$;q;q=q.parentElement){let J=getComputedStyle(q);if(J.display==="none"||J.visibility==="hidden"||Number(J.opacity)===0)return null}return Y}var P1={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit($){e?.(),u(),document.getElementById("ytmd-volume-indicator")?.remove();let Y=h("div",{id:"ytmd-volume-indicator"});document.body.appendChild(Y);let q=null,J=null,X=null,Z=null,z=null,W=()=>{if(z!==null)window.clearTimeout(z);z=null,Y.classList.remove("ytmd-visible")},Q=()=>{if(z!==null)window.clearTimeout(z);Y.classList.add("ytmd-visible"),z=window.setTimeout(()=>{z=null,Y.classList.remove("ytmd-visible")},1800)},H=()=>{let M=$.getVideoElement();if(!M){Z=null,W();return}let C=Y1(M)?0:w0(M),b=Z!==null&&C!==Z;Z=C;let E=document.querySelector("ytmusic-player-page #main-panel");if(!$0(E)){W();return}if(Y.textContent!==`${C}%`)Y.textContent=`${C}%`,Y.setAttribute("aria-label",j().volumeLevel(C));let x=$0(document.querySelector("ytmusic-player-page #song-image")),T=$0(document.querySelector("ytmusic-player-page video"))||$0(document.querySelector("ytmusic-player-page #movie_player")),U=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?T||x:x||T)||$0(E);if(!U){W();return}let R=`${Math.max(8,U.left+12)}px`,_=`${Math.max(8,U.top+12)}px`;if(Y.style.left!==R)Y.style.left=R;if(Y.style.top!==_)Y.style.top=_;if(b)Q()},G=()=>{let M=$.getVideoElement();if(M===q)return;q?.removeEventListener("volumechange",H),q=M,q?.addEventListener("volumechange",H),H()},V=()=>{let M=document.querySelector("ytmusic-player-page");if(M===J)return;if(X?.disconnect(),J=M,M)X=new MutationObserver(()=>window.requestAnimationFrame(H)),X.observe(M,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},N=(M)=>{let C=M.target;if(C instanceof Element&&C.closest("ytmusic-player-bar"))window.requestAnimationFrame(H)},L=(M)=>{if(M.deltaY===0||M.ctrlKey)return;let C=M.target;if(C instanceof Element&&C.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'))return;let b=(R)=>{if(!R)return!1;let _=R.getBoundingClientRect();return M.clientX>=_.left&&M.clientX<_.right&&M.clientY>=_.top&&M.clientY<_.bottom},E=b(document.querySelector("ytmusic-player-bar"))||b(document.querySelector("#player-bar-background")),x=$.config.wheel_volume_on_player_page===!0&&b(document.querySelector("ytmusic-player-page #main-panel"));if(!E&&!x)return;let T=$.getVideoElement();if(!T)return;let B=$.config.wheel_volume_step,U=typeof B==="number"&&Number.isFinite(B)&&B>0?Math.min(B,1):0.05;M.preventDefault(),Z0(w0(T)+(M.deltaY<0?U:-U)*100,T),H()};window.addEventListener("wheel",L,{passive:!1}),window.addEventListener("resize",H),document.addEventListener("scroll",H,!0),document.addEventListener("input",N,!0),document.addEventListener("change",N,!0),V(),G();let F=window.setInterval(()=>{V(),G(),H()},500);e=()=>{window.removeEventListener("wheel",L),window.removeEventListener("resize",H),document.removeEventListener("scroll",H,!0),document.removeEventListener("input",N,!0),document.removeEventListener("change",N,!0),window.clearInterval(F),X?.disconnect(),q?.removeEventListener("volumechange",H),W(),Y.remove()}},onDestroy(){if(e)e(),e=null}};var U1={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange($,Y){if(!Y.config?.notifications_enabled)return;if(!$.title||$.title==="No Track Playing")return;try{await Y.invoke("notify_track_change",{title:$.title,artist:$.artist})}catch(q){console.warn("[YTMD] Notification dispatch failed:",q)}}};var j0=null,w1={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit($){let Y=document.getElementById("ytmd-theme-styles");if(!Y)Y=document.createElement("style"),Y.id="ytmd-theme-styles";if(Y.textContent=`
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
    `,!Y.isConnected)document.head.appendChild(Y);j0=()=>{Y?.remove()}},onDestroy(){if(j0)j0(),j0=null}};var N0=[32,64,125,250,500,1000,2000,4000,8000,16000],k0={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function Y0($){return Math.max(-12,Math.min(12,$))}function y5($){if($.length===0)return-100;let Y=0;for(let J=0;J<$.length;J++)Y+=$[J]*$[J];let q=Math.sqrt(Y/$.length);if(q<=0.00001)return-100;return 20*Math.log10(q)}function I5($){return Math.max(0.5,Math.min(2,$))}class A{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=N0.map(()=>0);preampDb=0;isInitializedFor($){return this.isInitialized&&this.hookedVideo===$}static getInstance(){if(!A.instance)A.instance=new A;return A.instance}init($){if(this.isInitialized&&this.hookedVideo===$){this.resumeContext();return}try{let Y=window.AudioContext||window.webkitAudioContext;if(!Y){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new Y,this.hookedVideo=$,this.sourceNode=this.audioCtx.createMediaElementSource($),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=N0.map((J,X)=>{if(!this.audioCtx)throw Error("AudioContext missing");let Z=this.audioCtx.createBiquadFilter();if(X===0)Z.type="lowshelf";else if(X===N0.length-1)Z.type="highshelf";else Z.type="peaking",Z.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return Z.frequency.setValueAtTime(J,this.audioCtx.currentTime),Z.gain.setValueAtTime(0,this.audioCtx.currentTime),Z}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let q=()=>this.resumeContext();$.addEventListener("play",q),$.addEventListener("playing",q),document.addEventListener("click",q,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(Y){console.error("[YTMD DSP] Failed to initialize AudioEngine:",Y)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((Y)=>Y.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let $=this.sourceNode;if(this.isNormalizing)$.connect(this.compressorNode),$=this.compressorNode;for(let Y of this.filters)$.connect(Y),$=Y;$.connect(this.preampNode),$=this.preampNode,$.connect(this.fadeNode),$=this.fadeNode,$.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch($){console.error("[YTMD DSP] Graph rebuild error:",$)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain($,Y){if($<0||$>=this.gains.length)return;let q=Y0(Y);if(this.gains[$]=q,!this.audioCtx||$>=this.filters.length)return;this.filters[$].gain.setValueAtTime(q,this.audioCtx.currentTime)}setAllGains($){$.forEach((q,J)=>{if(J<this.gains.length)this.gains[J]=Y0(q)});let Y=this.audioCtx;if(!Y)return;this.gains.forEach((q,J)=>{if(J<this.filters.length)this.filters[J].gain.setValueAtTime(q,Y.currentTime)})}setPreamp($){if(this.preampDb=Y0($),!this.preampNode||!this.audioCtx)return;let Y=Math.pow(10,Y0($)/20);this.preampNode.gain.setValueAtTime(Y,this.audioCtx.currentTime)}setLoudnessNormalization($){if(this.isNormalizing!==$)this.isNormalizing=$,this.rebuildGraph()}applyPreset($){let Y=k0[$]||k0.flat;if(this.setAllGains(Y.gains),Y.preamp!==void 0)this.setPreamp(Y.preamp);return Y.gains}fadeIn($){if(!this.fadeNode||!this.audioCtx||$<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let Y=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(Y),this.fadeNode.gain.setValueAtTime(0.001,Y),this.fadeNode.gain.linearRampToValueAtTime(1,Y+$)}fadeOut($){if(!this.fadeNode||!this.audioCtx||$<=0)return;let Y=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(Y),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,Y),this.fadeNode.gain.linearRampToValueAtTime(0.001,Y+$)}resetFade(){if(this.fadeNode&&this.audioCtx){let $=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues($),this.fadeNode.gain.setValueAtTime(1,$)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),y5(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let $=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData($),$}setPlaybackRate($){this.playbackRate=I5($),this.applyRateAndPitch()}setPreservesPitch($){this.preservesPitch=$,this.applyRateAndPitch()}applyRateAndPitch(){let $=this.hookedVideo??K.getVideo();if(!$)return;if($.playbackRate!==this.playbackRate)$.playbackRate=this.playbackRate;if($.preservesPitch!==this.preservesPitch){$.preservesPitch=this.preservesPitch;let Y=$;Y.webkitPreservesPitch=this.preservesPitch}}}class v0{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds($){this.crossfadeSeconds=Math.max(0,Math.min(12,$))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange($){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=$.videoId||`${$.title}-${$.artist}`,this.crossfadeSeconds>0)A.getInstance().fadeIn(this.crossfadeSeconds);else A.getInstance().resetFade()}onTick($,Y){if(!Y||this.crossfadeSeconds<=0||Y.durationSecs<=0)return;let q=Y.durationSecs-$;if(this.fadeOutTriggered&&q>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),A.getInstance().resetFade();return}if(q<=this.crossfadeSeconds&&!this.fadeOutTriggered&&q>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${q.toFixed(1)}s remaining)...`),A.getInstance().fadeOut(q),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let J=Y.videoId||`${Y.title}-${Y.artist}`;if(this.currentTrackId===J)console.log("[YTMD Crossfade] Advancing to next track..."),K.next()},Math.max(100,(q-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class S0{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled($){this.enabled=$}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick($,Y,q){if(!this.enabled||!Y||!q||q.paused||q.ended)return;let J=A.getInstance().getAudioPowerDb();if(J===null)return;if(!this.checkedIntro&&$<15)if(J<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&$<12)console.log(`[YTMD Skip Silence] Intro silence detected (${J.toFixed(1)} dB). Fast forwarding...`),q.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(Y.durationSecs>15&&$>Y.durationSecs-10)if(J<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${J.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,K.next()}else this.consecutiveSilentTicks=0}}var y=null,S=null,h0=null;function x5($){let Y=$.equalizer_gains;return Boolean($.equalizer_enabled||$.loudness_normalization||$.skip_silence_enabled||typeof $.crossfade_seconds==="number"&&$.crossfade_seconds>0||typeof $.preamp_gain==="number"&&$.preamp_gain!==0||Array.isArray(Y)&&Y.some((q)=>q!==0))}var R1={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit($){let Y=A.getInstance(),q=new v0,J=new S0;y=q,S=J;let X=$.config,Z=null,z=()=>{if(Z!==null)return;let Q=$.getVideoElement();if(Q){if(!Y.isInitializedFor(Q))Y.init(Q);return}Z=window.setInterval(()=>{let H=$.getVideoElement();if(H){if(Z!==null)clearInterval(Z);Z=null,Y.init(H)}},500)};if(x5(X))z();if(X.equalizer_gains&&Array.isArray(X.equalizer_gains))Y.setAllGains(X.equalizer_gains);else if(X.equalizer_preset&&typeof X.equalizer_preset==="string")Y.applyPreset(X.equalizer_preset);if(X.preamp_gain!==void 0)Y.setPreamp(X.preamp_gain);if(X.loudness_normalization!==void 0)Y.setLoudnessNormalization(Boolean(X.loudness_normalization));if(X.crossfade_seconds!==void 0)q.setCrossfadeSeconds(X.crossfade_seconds);if(X.skip_silence_enabled!==void 0)J.setEnabled(Boolean(X.skip_silence_enabled));if(X.playback_speed!==void 0)Y.setPlaybackRate(X.playback_speed);if(X.preserve_pitch!==void 0)Y.setPreservesPitch(Boolean(X.preserve_pitch));let W=[];if(window.__TAURI__?.event){let{listen:Q}=window.__TAURI__.event;W.push(Q("set-eq-band",(H)=>{z(),Y.setBandGain(H.payload.bandIndex,H.payload.gain)}),Q("set-eq-all",(H)=>{z(),Y.setAllGains(H.payload.gains)}),Q("set-eq-preset",(H)=>{z(),Y.applyPreset(H.payload)}),Q("set-preamp",(H)=>{z(),Y.setPreamp(H.payload)}),Q("set-loudness-normalization",(H)=>{if(H.payload)z();Y.setLoudnessNormalization(H.payload)}),Q("set-crossfade-seconds",(H)=>{if(H.payload>0)z();q.setCrossfadeSeconds(H.payload)}),Q("set-skip-silence",(H)=>{if(H.payload)z();J.setEnabled(H.payload)}),Q("set-playback-rate",(H)=>{Y.setPlaybackRate(H.payload)}),Q("set-preserves-pitch",(H)=>{Y.setPreservesPitch(H.payload)}))}h0=()=>{if(Z!==null)clearInterval(Z),Z=null;W.forEach((Q)=>Q.then((H)=>H())),y?.destroy(),y=null,S=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange($){if(A.getInstance().applyRateAndPitch(),y)y.onTrackChange($);if(S)S.onTrackChange()},onTick($,Y){if(y)y.onTick($,Y.track);if(S)S.onTick($,Y.track,Y.getVideoElement())},onDestroy(){if(h0)h0(),h0=null}};var p0=($,Y,q)=>{let J=(Z)=>Math.max(0,Math.min(255,Math.round(Z))),X=(Z)=>J(Z).toString(16).padStart(2,"0");return`#${X($)}${X(Y)}${X(q)}`};async function E1($){return new Promise((Y)=>{let q={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!$){Y(q);return}let J=new Image;J.crossOrigin="anonymous",J.onload=()=>{try{let X=document.createElement("canvas");X.width=16,X.height=16;let Z=X.getContext("2d");if(!Z){Y(q);return}Z.drawImage(J,0,0,16,16);let z=Z.getImageData(0,0,16,16).data,W=0,Q=0,H=0,G=0,V=0,N=0,L=0,F=0;for(let B=0;B<z.length;B+=4){let U=z[B],R=z[B+1],_=z[B+2];if(z[B+3]<128)continue;let t0=(U+R+_)/3;if(t0<20||t0>240)continue;if(B<z.length/2)W+=U,Q+=R,H+=_,G++;else V+=U,N+=R,L+=_,F++}if(G===0&&F===0){Y(q);return}let M=G>0?Math.round(W/G):220,C=G>0?Math.round(Q/G):38,b=G>0?Math.round(H/G):38,E=F>0?Math.round(V/F):24,x=F>0?Math.round(N/F):24,T=F>0?Math.round(L/F):27;Y({primary:p0(M,C,b),secondary:p0(E,x,T),accent:p0(M+30,C+30,b+30)})}catch{Y(q)}},J.onerror=()=>Y(q),J.src=$})}var m=48,g5=3,k5=3,v5=1.65,S5=0.55;function p5($,Y,q,J){let X=new Float32Array($.length),Z=(z,W,Q)=>{let H=Q?q:Y,G=Q?Y:q;for(let V=0;V<H;V++)for(let N=0;N<4;N++)for(let L=0;L<G;L++){let F=0,M=0;for(let b=Math.max(0,L-J);b<=Math.min(G-1,L+J);b++){let E=Q?(V*Y+b)*4+N:(b*Y+V)*4+N;F+=z[E],M++}let C=Q?(V*Y+L)*4+N:(L*Y+V)*4+N;W[C]=F/M}};Z($,X,!0),Z(X,$,!1)}function l5($,Y,q){for(let J=0;J<$.length;J+=4){let X=$[J],Z=$[J+1],z=$[J+2],W=0.2126*X+0.7152*Z+0.0722*z;$[J]=(W+(X-W)*Y)*q,$[J+1]=(W+(Z-W)*Y)*q,$[J+2]=(W+(z-W)*Y)*q}}async function T1($,Y=S5){if(!$)return null;return new Promise((q)=>{let J=new Image;J.crossOrigin="anonymous",J.onload=()=>{try{let X=document.createElement("canvas");X.width=m,X.height=m;let Z=X.getContext("2d");if(!Z)return q(null);Z.imageSmoothingQuality="high",Z.drawImage(J,0,0,m,m);let z=Z.getImageData(0,0,m,m);for(let W=0;W<k5;W++)p5(z.data,m,m,g5);l5(z.data,v5,Y),Z.putImageData(z,0,0),q(X.toDataURL("image/png"))}catch{q(null)}},J.onerror=()=>q(null),J.src=$})}var F0=null,M0=null,L0,u1={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit($){let Y=document.getElementById("ytmd-ambient-backdrop");if(!Y)Y=h("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(Y);Y.replaceChildren();let q=h("img",{id:"ytmd-ambient-cover"});q.alt="";let J=h("div",{id:"ytmd-ambient-veil"});Y.appendChild(q),Y.appendChild(J);let X=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6,Z=$.config.ambient_lighting_enabled!==!1,z=document.createElement("style");z.id="ytmd-ambient-styles",z.textContent=`
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
    `,document.head.appendChild(z),F0=(Q)=>{if(Y)Y.style.opacity=String(Q)};let W=[];if(window.__TAURI__?.event)W.push(window.__TAURI__.event.listen("set-ambient-intensity",(Q)=>{F0?.(Q.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(Q)=>{let H=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6;F0?.(Q.payload?H:0)}));if(M0=()=>{W.forEach((Q)=>Q.then((H)=>H())),F0=null,L0=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},$.track)this.onTrackChange($.track,$)},async onTrackChange($){let Y=$.coverUrl||null;if(Y===L0)return;L0=Y;let q=document.getElementById("ytmd-ambient-cover");if(q){let J=Y?await T1(Y):null;if(Y!==L0)return;if(q.style.opacity=J?"1":"0",J)q.src=J}try{let J=await E1(Y||""),X=document.documentElement.style;X.setProperty("--ytmd-accent",J.accent),X.setProperty("--ytmd-accent-primary",J.primary),X.setProperty("--ytmd-accent-secondary",J.secondary)}catch{}},onDestroy(){if(M0)M0(),M0=null}};var m1=`
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

`,f1=`
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

`;var C0=null,y1={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit($){let Y=()=>document.head||document.documentElement,q=(W)=>{let Q=document.getElementById(W);if(!Q){Q=document.createElement("style"),Q.id=W;let H=Y();if(H)H.appendChild(Q)}return Q},J=(W)=>{let Q=q("ytmd-active-theme");Q.textContent=W?m1:f1},X=(W)=>{let Q=q("ytmd-custom-css");if(Q)Q.textContent=W};J($.config.ambient_lighting_enabled!==!1);let Z=$.config.custom_css||"";X(Z);let z=[];if(window.__TAURI__?.event)z.push(window.__TAURI__.event.listen("set-ambient-enabled",(W)=>{J(W.payload)}),window.__TAURI__.event.listen("set-custom-css",(W)=>{X(W.payload)}));C0=()=>{z.forEach((W)=>W.then((Q)=>Q()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(C0)C0(),C0=null}};var K0=null,I1={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit($){let Y=()=>{if(document.getElementById("ytmd-pip-btn"))return;let J=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(J){let X=v({id:"ytmd-pip-btn",label:j().pipButton,iconPath:O.pip});X.addEventListener("click",async()=>{let Z=$.getVideoElement();if(!Z)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await Z.requestPictureInPicture();else await $.invoke("toggle_mini_player")}catch(z){console.warn("[YTMD PiP] Could not enter PiP:",z),await $.invoke("toggle_mini_player").catch((W)=>console.error("[YTMD PiP] Mini player fallback failed:",W))}}),J.appendChild(X)}},q=window.setInterval(Y,1000);Y(),K0=()=>{clearInterval(q),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(K0)K0(),K0=null}};function d5($){if($.error)return"failed";if($.output_path&&$.percent>=100)return"done";return"progress"}var b0="ytmd-download-btn",n5=3000,p=new Map,l0=new Set,A0=null,O0=null;function l(){let $=document.getElementById(b0);if(!$)return;let Y=A0?.videoId,q=Y?p.get(Y):void 0;F1($,q?Math.max(0.05,q.fraction):null),h1($,Y&&l0.has(Y)?O.check:O.download),$.setAttribute("aria-disabled",Y?"false":"true");let J=q?j().downloadInProgress:j().downloadButton;$.setAttribute("aria-label",J),$.dataset.ytmdTooltip=J}function d0($,Y){let q=p.get($);if(!q)return;if(p.delete($),Y.ok)l0.add($),setTimeout(()=>{l0.delete($),l()},n5),D(j().downloadDone(q.title),{id:`download-${$}`});else D(j().downloadFailed(Y.reason),{id:`download-${$}`,durationMs:8000});l()}function o5($){let Y=p.get($.video_id);if(!Y)return;let q=d5($);if(q==="failed")d0($.video_id,{ok:!1,reason:$.error||$.status});else if(q==="done")d0($.video_id,{ok:!0});else Y.fraction=$.percent/100,l()}function n0($,Y){let q=Y?.videoId;if(!Y||!q){D(j().downloadNoTrack);return}if(p.has(q)){D(j().downloadInProgress);return}p.set(q,{title:Y.title,fraction:0}),l(),D(j().downloadStarted(Y.title),{id:`download-${q}`}),$.invoke("download_track",{request:{video_id:q,title:Y.title,artist:Y.artist,album:Y.album||void 0,cover_url:Y.coverUrl||void 0,format:$.config.download_format||"mp3",embed_lyrics:$.config.embed_lyrics!==!1}}).catch((J)=>{console.error("[YTMD Downloader] Download failed:",J),d0(q,{ok:!1,reason:J instanceof Error?J.message:String(J)})})}var x1={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit($){A0=$.track;let Y=()=>{if(document.getElementById(b0))return;let X=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!X)return;let Z=v({id:b0,label:j().downloadButton,iconPath:O.download});Z.addEventListener("click",()=>{if(Z.getAttribute("aria-disabled")==="true")return;n0($,A0)}),X.appendChild(Z),l()},q=window.setInterval(Y,1000);Y();let J=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(X)=>o5(X.payload)):null;O0=()=>{clearInterval(q),J?.then((X)=>X()),document.getElementById(b0)?.remove()}},onTrackChange($){A0=$,l()},onDestroy(){if(O0)O0(),O0=null}};var g1={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit($){console.log("[YTMD] Local files module ready.")}};var B0="ytmd-nav-slot",o0="ytmd-menu-btn",J0="ytmd-menu",k1="ytmd-sync-chip",S1=[],q0=null,p1=null,v1=!1,r5=`
  #${B0} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function i5(){if(document.getElementById("ytmd-nav-slot-styles"))return;let $=document.createElement("style");$.id="ytmd-nav-slot-styles",$.textContent=r5,document.head.appendChild($)}function c5($){if(!$)return;return`${j().syncInRoom} · ${j().syncListeners($.listeners)}`}function l1($){S1=$.items,p1=$.onSyncChipClick}function r0(){if(document.getElementById(B0)?.isConnected)return;let $=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!$)return;u(),i5();let Y=h("div",{id:B0}),q=v({id:o0,label:j().menuLabel,iconPath:O.apps});q.setAttribute("aria-haspopup","menu"),q.setAttribute("aria-expanded","false"),q.addEventListener("click",(J)=>{J.stopPropagation(),a5(q)}),Y.appendChild(q),$.prepend(Y),d1(),e5()}function i0($){q0=$,d1();let Y=document.getElementById(J0);if(Y?.classList.contains("ytmd-open"))n1(Y)}function d1(){let $=document.getElementById(B0);if(!$)return;let Y=document.getElementById(k1);if(!q0){Y?.remove();return}if(!Y)Y=h("button",{id:k1,className:"ytmd-chip"}),Y.type="button",Y.addEventListener("click",()=>p1?.()),$.prepend(Y);let q=j().syncListeners(q0.listeners);Y.replaceChildren(h("span",{className:"ytmd-chip-dot"}),c(O.group,18),h("span",{text:q})),Y.dataset.ytmdTooltip=`${j().syncInRoom} · ${q0.roomCode}`,Y.setAttribute("aria-label",`${j().syncInRoom}, ${q}`)}function n1($){let Y=[];for(let q of S1){if(q.dividerBefore)Y.push(h("div",{className:"ytmd-menu-divider"}));let J=h("button",{className:"ytmd-menu-item"});J.type="button",J.setAttribute("role","menuitem"),J.dataset.itemId=q.id;let X=h("span",{className:"ytmd-menu-item-text"});X.appendChild(h("span",{text:q.label}));let Z=q.id==="sync"?c5(q0):void 0;if(Z)X.appendChild(h("span",{className:"ytmd-menu-item-sub",text:Z}));if(J.append(c(q.iconPath),X),q.hint)J.appendChild(h("span",{className:"ytmd-menu-item-hint",text:q.hint}));J.addEventListener("click",()=>{d(),q.onSelect()}),Y.push(J)}$.replaceChildren(...Y)}function s5(){let $=document.getElementById(J0);if(!$)$=h("div",{id:J0,className:"ytmd-menu"}),$.setAttribute("role","menu"),$.addEventListener("keydown",t5),document.body.appendChild($);return $}function a5($){let Y=s5();if(Y.classList.contains("ytmd-open")){d();return}n1(Y);let q=$.getBoundingClientRect();Y.style.top=`${q.bottom+4}px`,Y.style.right=`${Math.max(8,window.innerWidth-q.right)}px`,Y.classList.add("ytmd-open"),$.setAttribute("aria-expanded","true"),Y.querySelector(".ytmd-menu-item")?.focus()}function d(){let $=document.getElementById(J0);if(!$?.classList.contains("ytmd-open"))return;$.classList.remove("ytmd-open");let Y=document.getElementById(o0);if(Y?.setAttribute("aria-expanded","false"),$.contains(document.activeElement))Y?.focus()}function t5($){let Y=$.currentTarget,q=Array.from(Y.querySelectorAll(".ytmd-menu-item")),J=q.indexOf(document.activeElement);if($.key==="Escape")$.stopPropagation(),d();else if($.key==="ArrowDown")$.preventDefault(),q[(J+1)%q.length]?.focus();else if($.key==="ArrowUp")$.preventDefault(),q[(J-1+q.length)%q.length]?.focus();else if($.key==="Tab")d()}function e5(){if(v1)return;v1=!0,document.addEventListener("mousedown",($)=>{let Y=document.getElementById(J0);if(!Y?.classList.contains("ytmd-open"))return;let q=$.target;if(Y.contains(q)||document.getElementById(o0)?.contains(q))return;d()}),window.addEventListener("resize",d)}function $8($,Y,q){let J=new Set($.map((Z)=>Z.id)),X=new Set(Y.map((Z)=>Z.id));return{joined:Y.filter((Z)=>Z.id!==q&&!J.has(Z.id)).map((Z)=>Z.nickname),left:$.filter((Z)=>Z.id!==q&&!X.has(Z.id)).map((Z)=>Z.nickname)}}var Y8=/^[A-Za-z0-9_-]{11}$/,q8=1.5,J8=1,X8=1000,Z8=5000;function H8($,Y,q){let J={navigateTo:null,setPlaying:null,seekTo:null};if(Y8.test($.video_id)&&Y.videoId!==$.video_id)return J.navigateTo=$.video_id,J;if($.is_playing===Y.paused)J.setPlaying=$.is_playing;let X=Math.min(J8,Math.max(0,(q-$.timestamp_ms)/1000)),Z=$.is_playing?$.current_time_secs+X:$.current_time_secs;if(Math.abs(Y.currentTime-Z)>q8)J.seekTo=Z;return J}function W8(){return new URLSearchParams(window.location.search).get("v")}function o1(){let $=document.getElementById("movie_player");return!!$&&($.classList.contains("ad-showing")||$.classList.contains("ad-interrupting"))}function Q8($){let Y=document.querySelector("ytmusic-app");if(!Y){window.location.href=`https://music.youtube.com/watch?v=${$}`;return}Y.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:$}}}}))}class r1{isHost=!1;inRoom=!1;lastBroadcastMs=0;pendingNav=null;setRoomState($,Y){if(this.inRoom=$,this.isHost=Y,!$)this.pendingNav=null}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback($,Y){if(!this.inRoom||this.isHost||o1())return;let q=Date.now(),J={videoId:W8(),paused:Y?Y.paused:!0,currentTime:Y?Y.currentTime:0},X=H8($,J,q);if(X.navigateTo){let Z=this.pendingNav;if(Z&&Z.videoId===X.navigateTo&&q-Z.atMs<Z8)return;let z=Z&&Z.videoId===X.navigateTo?Z.attempts+1:1;if(this.pendingNav={videoId:X.navigateTo,atMs:q,attempts:z},z>1)window.location.href=`https://music.youtube.com/watch?v=${X.navigateTo}`;else Q8(X.navigateTo);return}if(this.pendingNav=null,!Y)return;if(X.setPlaying===!0)K.play();else if(X.setPlaying===!1)K.pause();if(X.seekTo!==null)K.seekTo(X.seekTo)}broadcastLocalState($,Y,q,J=!1){if(!this.inRoom||!this.isHost||!$||!$.videoId||!Y||o1())return;let X=Date.now();if(!J&&X-this.lastBroadcastMs<X8)return;this.lastBroadcastMs=X,q("broadcast_sync_state",{playback:{video_id:$.videoId,title:$.title,artist:$.artist,current_time_secs:Y.currentTime,is_playing:!Y.paused,timestamp_ms:X}}).catch((Z)=>console.error("[YTMD Room Sync] broadcast failed:",Z))}}var n=null,D0=null,s0=null;function c0($,Y){let q=s0;if(s0=$,i0($?{roomCode:$.room_code,listeners:$.members.length,isHost:$.is_host}:null),!Y)return;if(!$){if(q)D(j().syncRoomClosed);return}if(!q||q.room_code!==$.room_code){if(!$.is_host)D(j().syncConnected);return}let{joined:J,left:X}=$8(q.members,$.members,$.current_user_id),Z=[...J.map(j().syncJoined),...X.map(j().syncLeft)];if(Z.length>0)D(Z.join(" · "))}var i1={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit($){let Y=new r1;n=Y;let q=[];if(window.__TAURI__?.event)q.push(window.__TAURI__.event.listen("sync-room-updated",(J)=>{Y.setRoomState(!0,J.payload.is_host),c0(J.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",()=>{Y.setRoomState(!1,!1),c0(null,!0)}),window.__TAURI__.event.listen("sync-playback-remote",(J)=>{Y.handleRemotePlayback(J.payload,$.getVideoElement())}));$.invoke("get_sync_room_state").then((J)=>{if(n!==Y||!J||typeof J!=="object")return;let X=J;if(Y.setRoomState(!0,X.is_host),c0(X,!1),!X.is_host&&X.playback_state)Y.handleRemotePlayback(X.playback_state,$.getVideoElement())}).catch((J)=>console.error("[YTMD Room Sync] failed to restore room state:",J)),D0=()=>{q.forEach((J)=>J.then((X)=>X())),n=null,s0=null,i0(null)}},onTrackChange($,Y){n?.broadcastLocalState($,Y.getVideoElement(),Y.invoke,!0)},onPlaybackChange($,Y){n?.broadcastLocalState(Y.track,Y.getVideoElement(),Y.invoke,!0)},onTick($,Y){n?.broadcastLocalState(Y.track,Y.getVideoElement(),Y.invoke)},onDestroy(){if(D0)D0(),D0=null}};var _0=null,z8=($,Y)=>Y&&$!==!1,c1={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit($){let Y=null,q=!1,J=null,X=(N)=>{if(q===N)return;q=N,$.invoke("set_inhibit_sleep",{inhibit:N}).catch((L)=>{q=!N,console.error("[YTMD Power] set_inhibit_sleep failed:",L)})},Z=async()=>{if(!("wakeLock"in navigator)||Y!==null)return;try{Y=await navigator.wakeLock.request("screen"),Y.addEventListener("release",()=>{Y=null})}catch{}},z=()=>{Y?.release().catch(()=>{}),Y=null},W=()=>{let N=$.getVideoElement(),L=!!N&&!N.paused&&!N.ended,F=z8($.config.inhibit_sleep,L);if(X(F),F)Z();else z()},Q=(N)=>{for(let L of["play","playing","pause","ended"])N.addEventListener(L,W);J=N},H=(N)=>{for(let L of["play","playing","pause","ended"])N.removeEventListener(L,W)},G=$.getVideoElement();if(G)Q(G);W();let V=window.setInterval(()=>{let N=$.getVideoElement();if(N&&N!==J){if(J)H(J);Q(N),W()}},1000);_0=()=>{if(clearInterval(V),J)H(J);J=null,z(),X(!1)}},onDestroy(){if(_0)_0(),_0=null}};var s1={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit($){window.__ytmd_show_remote_qr=()=>a0($),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},G8=`
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
`;function V8(){if(document.getElementById("ytmd-qr-styles"))return;let $=document.createElement("style");$.id="ytmd-qr-styles",$.textContent=G8,document.head.appendChild($)}async function a0($){V8();let Y=h("p",{text:j().remoteBody,style:"margin: 0;"}),q=h("div",{className:"ytmd-qr-frame",text:j().remoteLoading}),J=h("div",{className:"ytmd-qr-url"}),X=M1({id:"ytmd-remote-modal",title:j().remoteTitle,body:[Y,q,J],actions:[{label:j().close}]});try{let Z=await $.invoke("get_remote_info");if(!q.isConnected)return;if(Z?.qr_svg){let z=h("img");z.src=`data:image/svg+xml;utf8,${encodeURIComponent(Z.qr_svg)}`,z.alt=j().remoteTitle,q.replaceChildren(z)}else q.textContent=j().remoteUnavailable;if(Z?.url)J.textContent=Z.url}catch(Z){if(console.error("[YTMD Remote] Error fetching remote info:",Z),q.isConnected)q.textContent=j().remoteUnavailable}return X}function j8($,Y){if(!Y||typeof Y!=="object"||!("ok"in Y))throw Error(`Malformed response to ${$}`);let q=Y;if(!q.ok)throw Error(q.error||`${$} failed`);return q.data??null}var N8=8000,I=($,Y={},q={})=>{return new Promise((J,X)=>{let Z=window.__TAURI__;if(!Z?.event?.emit){X(Error("Tauri bridge unavailable"));return}let z=Math.random().toString(36).slice(2)+Date.now().toString(36),W=null,Q=setTimeout(()=>{if(W)W();X(Error(`Timed out waiting for ${$}`))},q.timeoutMs??N8);Z.event.listen(`ytmd-response-${z}`,(H)=>{if(clearTimeout(Q),W)W();try{J(j8($,H.payload))}catch(G){X(G)}}).then((H)=>{return W=H,Z.event.emit("ytmd-invoke",{id:z,cmd:$,args:Y})}).catch((H)=>{clearTimeout(Q),X(H instanceof Error?H:Error(String(H)))})})};var e1=null,X0=null,o=($)=>{I($).catch((Y)=>{console.error(`[YTMD] ${$} failed:`,Y),D(j().actionFailed)})};function h8(){l1({onSyncChipClick:()=>o("toggle_sync_window"),items:[{id:"settings",iconPath:O.tune,label:j().menuSettings,hint:"Ctrl+,",onSelect:()=>o("toggle_settings_window")},{id:"local",iconPath:O.folderMusic,label:j().menuLocal,onSelect:()=>o("toggle_local_library_window")},{id:"sync",iconPath:O.group,label:j().menuSync,onSelect:()=>o("toggle_sync_window")},{id:"remote",iconPath:O.phone,label:j().menuRemote,onSelect:()=>{if(X0)a0(X0)}},{id:"mini",iconPath:O.miniPlayer,label:j().menuMiniPlayer,onSelect:()=>o("toggle_mini_player")},{id:"download",iconPath:O.download,label:j().menuDownload,dividerBefore:!0,onSelect:()=>{if(X0)n0(X0,e1)}}]})}var F8={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function a1($){let Y={};for(let[q,[J,X]]of Object.entries(F8)){let Z=$[J];Y[q]=typeof Z==="boolean"?Z:X}return Y}async function t1(){console.log("[YTMD] Initializing desktop integration bridge...");let $={};h8(),r0();let Y=setInterval(r0,1000);window.addEventListener("pagehide",()=>clearInterval(Y));try{let H=await I("get_config");if(H&&typeof H==="object")Object.assign($,H)}catch(H){console.error("[YTMD] Failed to load config, using defaults:",H)}let q={track:null,config:$,invoke:I,sendPlayerCommand:(H)=>{W(H)},getVideoElement:()=>K.getVideo()};X0=q;let J=new R0(q);J.register(Q1),J.register(z1),J.register(b1),J.register(P1),J.register(U1),J.register(w1),J.register(R1),J.register(u1),J.register(y1),J.register(I1),J.register(x1),J.register(g1),J.register(i1),J.register(c1),J.register(s1);try{await J.initAll(a1($))}catch(H){console.error("[YTMD] Registry init error:",H)}let X=new P0,Z=0,z=Date.now();X.onTrackChange(async(H)=>{e1=H,Z=H.currentTimeSecs||0,z=Date.now(),J.handleTrackChange(H);try{await I("update_track_info",{track:{title:H.title,artist:H.artist,album:H.album||null,cover_url:H.coverUrl||null,duration_secs:Math.round(H.durationSecs||0),current_time_secs:Math.round(H.currentTimeSecs||0),is_playing:H.isPlaying,video_id:H.videoId||null}})}catch(G){console.error("[YTMD] Failed to sync track info to backend:",G)}}),X.onPlaybackChange(async(H)=>{J.handlePlaybackChange(H);let G=X.getCurrentTrack();if(G){G.isPlaying=H,Z=G.currentTimeSecs||0,z=Date.now();try{await I("update_track_info",{track:{title:G.title,artist:G.artist,album:G.album||null,cover_url:G.coverUrl||null,duration_secs:Math.round(G.durationSecs||0),current_time_secs:Math.round(G.currentTimeSecs||0),is_playing:H,video_id:G.videoId||null}})}catch(V){console.error("[YTMD] Failed to sync playback status:",V)}}}),X.onTick((H)=>{J.handleTick(H);let G=X.getCurrentTrack();if(!G||!G.isPlaying)return;let V=Date.now(),N=(V-z)/1000,L=Z+N;if(Math.abs(H-L)>2||N>=15)Z=H,z=V,G.currentTimeSecs=Math.round(H),I("update_track_info",{track:{title:G.title,artist:G.artist,album:G.album||null,cover_url:G.coverUrl||null,duration_secs:Math.round(G.durationSecs||0),current_time_secs:Math.round(H),is_playing:!0,video_id:G.videoId||null}}).catch((M)=>console.error("[YTMD] Failed to sync seek/progress to backend:",M))});function W(H){switch(H){case"play":K.play();break;case"pause":K.pause();break;case"play_pause":K.playPause();break;case"next":K.next();break;case"previous":K.previous();break;case"like":K.toggleLike();break;case"dislike":K.toggleDislike();break;case"mute":K.toggleMute();break}}let Q=(H,G)=>{let V=window.__TAURI__;if(V?.event?.listen)V.event.listen(H,(N)=>G(N.payload))};Q("player-command",(H)=>W(H)),Q("tray-command",(H)=>W(H)),Q("mpris-command",(H)=>W(H)),Q("global-shortcut-event",(H)=>W(H)),Q("player-seek",(H)=>K.seekTo(H)),Q("mpris-command-seek",(H)=>K.seekTo(H)),Q("player-volume",(H)=>K.setVolume(H)),Q("config-updated",(H)=>{if(!H||typeof H!=="object")return;Object.assign($,H);let G=a1($);for(let[V,N]of Object.entries(G))if(N)J.enable(V).catch((L)=>console.error(`[YTMD] Failed to enable plugin ${V}:`,L));else J.disable(V).catch((L)=>console.error(`[YTMD] Failed to disable plugin ${V}:`,L))}),window.addEventListener("keydown",(H)=>{if(H.ctrlKey&&H.key===","||H.key==="F2")H.preventDefault(),o("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var M8=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(M8)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>t1());else t1();
