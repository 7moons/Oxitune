(()=>{function t1($){let X=$.trim().split(":").map((J)=>parseInt(J,10));if(X.some((J)=>isNaN(J)))return 0;if(X.length===2)return X[0]*60+X[1];else if(X.length===3)return X[0]*3600+X[1]*60+X[2];return 0}var s8=1500;function l8($,X){let J=new URLSearchParams($);if(!X||J.get("v")!==X)return;return J.get("list")||void 0}var e1=($)=>$.trim().replace(/\s+/g," ").toLowerCase();function n8($,X){if(!$?.trim()||!X?.trim())return!0;return e1($)===e1(X)}function r8($,X){if(!$)return"new";if($.videoId&&X.videoId){if($.videoId!==X.videoId)return"new"}else if($.title!==X.title||$.artist!==X.artist)return"new";return $.title!==X.title||$.artist!==X.artist||!$.videoId&&!!X.videoId||!$.coverUrl&&!!X.coverUrl||!$.album&&!!X.album||X.durationSecs>0&&Math.abs(X.durationSecs-$.durationSecs)>1?"metadata":null}var a8=400;function i8($,X){return $-X>=a8}class V1{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick($){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((X)=>X($))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange($){this.onTrackChangeCallbacks.push($)}onPlaybackChange($){this.onPlaybackChangeCallbacks.push($)}onTick($){this.onTickCallbacks.push($)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let J=navigator.mediaSession,Z=J.metadata;try{Object.defineProperty(J,"metadata",{get:()=>Z,set:(z)=>{Z=z,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(z){}}this.syncVideoListeners();let $=!1,X=()=>{if($)return;$=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),$=!1})};this.mutationObserver=new MutationObserver(X),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let J=document.querySelector("video");if(J&&!J.paused&&i8(Date.now(),this.lastTickMs))this.emitTick(J.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let $=document.querySelector("ytmusic-player-bar")||document.body;if(!$||$===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe($,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=$}attachVideoListeners($){$.addEventListener("play",this.handleVideoPlay),$.addEventListener("playing",this.handleVideoPlay),$.addEventListener("pause",this.handleVideoPause),$.addEventListener("ended",this.handleVideoPause),$.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=$}detachVideoListeners($){$.removeEventListener("play",this.handleVideoPlay),$.removeEventListener("playing",this.handleVideoPlay),$.removeEventListener("pause",this.handleVideoPause),$.removeEventListener("ended",this.handleVideoPause),$.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let $=document.querySelector("video");if($&&$!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners($)}}extractTrackInfo(){let $=document.querySelector("video"),X=document.getElementById("movie_player");if(Boolean(X&&(typeof X.getAdState==="function"&&X.getAdState()===1||typeof X.isAdPlaying==="function"&&X.isAdPlaying()||X.classList?.contains("ad-showing")||X.classList?.contains("ad-interrupting"))))return null;let Z=navigator.mediaSession?.metadata,z=Z?.title||"",Y=Z?.artist||"",G=Z?.album||"",j="";if(Z?.artwork&&Z.artwork.length>0){let N=Z.artwork[Z.artwork.length-1];if(N&&N.src)j=N.src}if(!z){let N=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(N)z=N.textContent?.trim()||""}if(!Y){let N=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(N){let M=(N.textContent?.trim()||"").split("•").map((h)=>h.trim());if(Y=M[0]||"",M.length>1)G=M[1]}}if(!j){let N=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(N&&N.src)j=N.src}if(j.startsWith("//"))j=`https:${j}`;if(j.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(j))j=j.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let Q=X?.getVideoData?.(),H=Q?.video_id||new URLSearchParams(window.location.search).get("v")||void 0;if(H&&!n8(Q?.title,Z?.title)){let N=Date.now();if(this.titleMismatch?.videoId!==H)this.titleMismatch={videoId:H,sinceMs:N};if(N-this.titleMismatch.sinceMs<s8)return null}else this.titleMismatch=null;let F=0,K=0;if(X&&typeof X.getDuration==="function"){let N=X.getDuration();if(typeof N==="number"&&Number.isFinite(N)&&N>0)F=Math.floor(N)}if(X&&typeof X.getCurrentTime==="function"){let N=X.getCurrentTime();if(typeof N==="number"&&Number.isFinite(N)&&N>=0)K=Math.floor(N)}if(!F&&$&&Number.isFinite($.duration)&&$.duration>0)F=Math.floor($.duration);if(!K&&$&&Number.isFinite($.currentTime)&&$.currentTime>=0)K=Math.floor($.currentTime);let V=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(V&&V.textContent){let N=V.textContent.split("/").map((D)=>D.trim());if(N.length===2){if(!K)K=t1(N[0]);if(!F)F=t1(N[1])}}if(!F){let D=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(D){let M=parseInt(D,10);if(!isNaN(M)&&M>0)F=M}}let U=$?!$.paused&&!$.ended:!1;if(!z)return null;let L=l8(window.location.search,H)??(this.currentTrack?.videoId===H?this.currentTrack?.playlistId:void 0);return{title:z,artist:Y||"Unknown Artist",album:G||void 0,coverUrl:j||void 0,durationSecs:F,currentTimeSecs:K,isPlaying:U,videoId:H,playlistId:L}}checkTrackUpdate(){let $=this.extractTrackInfo();if(!$)return;let X=r8(this.currentTrack,$),J=this.currentTrack!==null&&this.currentTrack.isPlaying!==$.isPlaying;if(this.currentTrack=$,X){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((Z)=>Z($))}if(J)this.onPlaybackChangeCallbacks.forEach((Z)=>Z($.isPlaying))}handlePlaybackChange($){if($){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((X)=>X(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((X)=>X(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function N1(){return document.getElementById("movie_player")}function $5($){for(let X of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let J=document.querySelector(X);if(!J||!("value"in J))continue;if("step"in J&&Number(J.step)>1)J.step=1;J.value=$}}function q0($){let X=N1()?.getVolume?.(),J=typeof X==="number"&&Number.isFinite(X)?X:$.volume*100;return Math.max(0,Math.min(100,Math.round(J)))}function w0($){return N1()?.isMuted?.()===!0||$.muted}function E0($,X){if(!Number.isFinite($))return;let J=Math.max(0,Math.min(100,Math.round($))),Z=N1();if(typeof Z?.setVolume==="function"){if(Z.setVolume(J),J>0&&Z.isMuted?.())if(typeof Z.unMute==="function")Z.unMute();else X.muted=!1;$5(J);return}if(X.volume=J/100,J>0&&X.muted)X.muted=!1;$5(J)}var X5=!1;function J5($){X5=$}function t(){return X5}var Z5=null;function L1($){Z5=$}function z5(){return Z5?.()??!1}class C{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let $=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if($){$.click();return}let X=this.getVideo();if(X)if(X.paused)X.play();else X.pause()}static play(){let $=this.getVideo();if($&&$.paused)this.playPause()}static pause(){let $=this.getVideo();if($&&!$.paused)this.playPause()}static next(){if(z5())return;this.nextInYtm()}static nextInYtm(){let $=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if($)$.click()}static previous(){let $=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if($)$.click()}static seekTo($){let X=this.getVideo();if(X&&!isNaN($))X.currentTime=Math.max(0,Math.min($,X.duration||$))}static setVolume($){let X=this.getVideo();if(X)E0($*100,X)}static toggleLike(){let $=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if($)$.click()}static toggleDislike(){let $=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if($)$.click()}static getLikeStatus(){let $=document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer")?.getAttribute("like-status");return $==="LIKE"?"like":$==="DISLIKE"?"dislike":"none"}static getRepeatMode(){let $=document.querySelector("ytmusic-player-bar")?.getAttribute("repeat-mode");return $==="ALL"?"all":$==="ONE"?"one":"none"}static isShuffleOn(){return document.querySelector("ytmusic-player-bar")?.hasAttribute("shuffle-on")??!1}static toggleShuffle(){document.querySelector("ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button")?.click()}static cycleRepeat(){document.querySelector("ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button")?.click()}static toggleMute(){let $=document.querySelector("ytmusic-player-bar #volume-slider"),X=this.getVideo();if(X)X.muted=!X.muted;if($){let J=$.parentElement?.querySelector("paper-icon-button, #button");if(J)J.click()}}}function o8($,X){if(!X||typeof X!=="object"||!("ok"in X))throw Error(`Malformed response to ${$}`);let J=X;if(!J.ok)throw Error(J.error||`${$} failed`);return J.data??null}var t8=8000,s=($,X={},J={})=>{return new Promise((Z,z)=>{let Y=window.__TAURI__;if(!Y?.event?.emit){z(Error("Tauri bridge unavailable"));return}let G=Math.random().toString(36).slice(2)+Date.now().toString(36),j=null,Q=setTimeout(()=>{if(j)j();z(Error(`Timed out waiting for ${$}`))},J.timeoutMs??t8);Y.event.listen(`ytmd-response-${G}`,(H)=>{if(clearTimeout(Q),j)j();try{Z(o8($,H.payload))}catch(F){z(F)}}).then((H)=>{return j=H,Y.event.emit("ytmd-invoke",{id:G,cmd:$,args:X})}).catch((H)=>{clearTimeout(Q),z(H instanceof Error?H:Error(String(H)))})})};var e8=15000,$6=100;function X6($,X,J,Z,z){if(Z||z>e8)return"abandon";if(X&&X!==$.video_id)return"abandon";return X===$.video_id&&J?"apply":"wait"}var J6=500,C1=!1,Y5=-1/0;function G5(){return C1||performance.now()-Y5<J6}var Z6=()=>document.getElementById("movie_player")?.getVideoData?.()?.video_id||void 0;function j5(){let $=location.pathname==="/watch"?new URLSearchParams(location.search).get("v"):null;if(!$)return;let X=!1,J=new Set,Z=(Q)=>{let H=Q.target;if(X||!(H instanceof HTMLVideoElement)||H.muted)return;C1=!0,H.muted=!0,J.add(H)};document.addEventListener("loadstart",Z,!0),document.addEventListener("play",Z,!0);let z=()=>{if(X)return;if(X=!0,document.removeEventListener("loadstart",Z,!0),document.removeEventListener("play",Z,!0),J.forEach((Q)=>Q.muted=!1),J.size>0)Y5=performance.now();J.clear(),C1=!1},Y=(Q,H)=>{let F=()=>{if(clearTimeout(K),H.removeEventListener("seeked",F),!Q.autoplay)H.pause();z()},K=setTimeout(F,1000);if(H.addEventListener("seeked",F),H.currentTime=Q.position_secs,Q.autoplay)H.play().catch(()=>{return});else{H.pause();let V=()=>H.pause();H.addEventListener("play",V),setTimeout(()=>H.removeEventListener("play",V),1500)}},G=Date.now();(async()=>{for(let Q=0;;Q++)try{return await s("take_resume_session")}catch(H){if(Q>=20||window.__TAURI__?.event?.emit)throw H;await new Promise((F)=>setTimeout(F,100))}})().then((Q)=>{let H=Q;if(!H||H.video_id!==$)return z();let F=setInterval(()=>{let K=document.querySelector("video"),V=X6(H,Z6(),!!K&&K.readyState>=1,t(),Date.now()-G);if(V==="wait")return;if(clearInterval(F),V==="apply"&&K)Y(H,K);else z()},$6)}).catch((Q)=>{console.error("[YTMD] Resume failed:",Q),z()})}class D1{plugins=new Map;enabledPlugins=new Set;context;constructor($){this.context=$}register($){if(this.plugins.set($.id,$),$.defaultEnabled)this.enabledPlugins.add($.id)}async initAll($){for(let[X,J]of this.plugins)if($?.[X]!==void 0?$[X]:J.defaultEnabled){if(this.enabledPlugins.add(X),J.onInit)try{await J.onInit(this.context)}catch(z){console.error(`[YTMD] Failed to init plugin ${X}:`,z)}}else this.enabledPlugins.delete(X)}async enable($){let X=this.plugins.get($);if(X&&!this.enabledPlugins.has($)){if(this.enabledPlugins.add($),X.onInit)await X.onInit(this.context)}}async disable($){let X=this.plugins.get($);if(X&&this.enabledPlugins.has($)){if(this.enabledPlugins.delete($),X.onDestroy)await X.onDestroy()}}handleTrackChange($){this.context.track=$;for(let X of this.enabledPlugins){let J=this.plugins.get(X);if(J?.onTrackChange)try{J.onTrackChange($,this.context)}catch(Z){console.error(`[YTMD] Error in plugin ${X} onTrackChange:`,Z)}}}handlePlaybackChange($){for(let X of this.enabledPlugins){let J=this.plugins.get(X);if(J?.onPlaybackChange)try{J.onPlaybackChange($,this.context)}catch(Z){console.error(`[YTMD] Error in plugin ${X} onPlaybackChange:`,Z)}}}handleTick($){for(let X of this.enabledPlugins){let J=this.plugins.get(X);if(J?.onTick)try{J.onTick($,this.context)}catch(Z){console.error(`[YTMD] Error in plugin ${X} onTick:`,Z)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled($){return this.enabledPlugins.has($)}}var h0=null,e={adWasShowing:!1,preAdMuted:!1},O1=new WeakSet,U0=null,q5=null,M1=0,V0=!0,z6=1000,Y6=($,X,J)=>$-X>=J,G6=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",j6="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",Q6=300,H6=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,K6=`
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
`,W6=H6+K6,F6=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],q6=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],U6=($)=>F6.some((X)=>$.includes(X)),V6=($,X)=>{let J=X.split("."),Z=$;for(let Y=0;Y<J.length-1;Y++){if(Z===null||typeof Z!=="object")return!1;Z=Z[J[Y]]}let z=J[J.length-1];if(Z!==null&&typeof Z==="object"&&Object.prototype.hasOwnProperty.call(Z,z))return delete Z[z],!0;return!1},A1=($)=>{if($===null||typeof $!=="object")return!1;let X=!1;for(let J of q6)if(V6($,J))X=!0;return X},N6=($)=>{if(typeof $==="string")return $;if($ instanceof URL)return $.href;return $.url},Q5=!1,L6=()=>{if(Q5)return;Q5=!0;let $=window.fetch,X=$.bind(window),J=async(...Z)=>{let z=await X(...Z);if(!V0||!U6(N6(Z[0])))return z;let Y;try{Y=await z.clone().json()}catch{return z}if(!A1(Y))return z;let G=new Headers(z.headers);return G.delete("content-length"),G.delete("content-encoding"),new Response(JSON.stringify(Y),{status:z.status,statusText:z.statusText,headers:G})};window.fetch=Object.assign(J,$)},H5=!1,C6=()=>{if(H5)return;H5=!0;let $=JSON.parse;JSON.parse=(...X)=>{let J=$(...X);if(V0)A1(J);return J}},K5=!1,D6=()=>{if(K5)return;K5=!0;let $;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>$,set:(X)=>{if(V0)A1(X);$=X}})};if(typeof window<"u")L6(),C6(),D6();var M6=($)=>{let X=new Set($);return X.has("ad-showing")||X.has("ad-interrupting")},O6=($,X,J)=>{if($&&!X.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:J},setMutedTo:!0};if(!$&&X.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:X.preAdMuted},setMutedTo:X.preAdMuted};return{nextState:X,setMutedTo:null}},P1=()=>document.getElementById("movie_player"),B6=()=>{let $=P1();if(!$)return!1;return M6($.classList)},B1=($)=>{let X=$.getVideoElement();if(!X)return;let{nextState:J,setMutedTo:Z}=O6(B6(),e,X.muted);if(e=J,Z!==null)X.muted=Z},W5=($)=>{if(O1.has($))return;O1.add($),$.click()},T0=()=>{document.querySelectorAll(G6).forEach(W5),document.querySelectorAll(j6).forEach(($)=>{let X=$.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(X)W5(X)})},F5=($)=>{let X=P1();if(q5=X,!X)return;U0?.disconnect(),U0=new MutationObserver(()=>{B1($),T0()}),U0.observe(X,{attributes:!0,attributeFilter:["class"]})},U5={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit($){V0=!0,e={adWasShowing:!1,preAdMuted:!1},O1=new WeakSet,M1=0;let X=document.createElement("style");X.id="ytmd-adblock-styles",X.textContent=W6,document.head.appendChild(X);let J=null,Z=new MutationObserver(()=>{if(J!==null)return;J=setTimeout(()=>{J=null,T0()},Q6)});Z.observe(document.body,{childList:!0,subtree:!0}),F5($),T0(),B1($),h0=()=>{if(V0=!1,U0?.disconnect(),U0=null,Z.disconnect(),J!==null)clearTimeout(J);document.getElementById("ytmd-adblock-styles")?.remove();let z=$.getVideoElement();if(z&&e.adWasShowing)z.muted=e.preAdMuted;e={adWasShowing:!1,preAdMuted:!1}}},onTick($,X){if(P1()!==q5)F5(X);B1(X);let J=Date.now();if(Y6(J,M1,z6))M1=J,T0()},onDestroy(){if(h0)h0(),h0=null}};var $0=[],k0="",_1=new Set,A6=($,X)=>$===X,V5={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){$0=[],k0="",_1=new Set},onTrackChange($){if(!$.videoId||$.videoId===k0)return;let X=$.videoId;k0=X,$0=[],_1=new Set;let J=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),Z=`https://sponsor.ajay.app/api/skipSegments?videoID=${X}&categories=${encodeURIComponent(J)}`;fetch(Z,{signal:AbortSignal.timeout(3000)}).then(async(z)=>{if(!z.ok)return;let Y=await z.json();if(!A6(X,k0))return;$0=Y,console.log(`[YTMD SponsorBlock] Loaded ${Y.length} segments for ${X}`)}).catch(()=>{})},onTick($,X){if(!$0||$0.length===0||t())return;let J=_1;for(let Z of $0){let[z,Y]=Z.segment;if($>=z&&$<Y-0.5&&!J.has(Z.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${Z.category}): ${z}s -> ${Y}s`);let G=X.getVideoElement();if(G)G.currentTime=Y,J.add(Z.UUID);break}}}};function N5($,X=18,J=18,Z="0 0 24 24"){let z=document.createElementNS("http://www.w3.org/2000/svg","svg");z.setAttribute("width",String(X)),z.setAttribute("height",String(J)),z.setAttribute("viewBox",Z),z.setAttribute("fill","currentColor");let Y=document.createElementNS("http://www.w3.org/2000/svg","path");return Y.setAttribute("d",$),z.appendChild(Y),z}function q($,X){let J=document.createElement($);if(X?.id)J.id=X.id;if(X?.className)J.className=X.className;if(X?.text!==void 0)J.textContent=X.text;if(X?.title)J.title=X.title;if(X?.style)J.style.cssText=X.style;return J}var L5="ytmd-kit-styles",P6=`
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
`;function w(){if(document.getElementById(L5))return;let $=document.createElement("style");$.id=L5,$.textContent=P6,(document.head||document.documentElement).appendChild($),_6()}var b={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function N0($,X=24){return N5($,X,X)}function E($){let X=q("button",{id:$.id,className:`ytmd-icon-btn${$.muted?" ytmd-icon-btn--muted":""}`});return X.type="button",X.setAttribute("aria-label",$.label),X.dataset.ytmdTooltip=$.label,X.appendChild(N0($.iconPath)),X}function S0($,X){$.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(N0(X))}function M5($,X){let J=$.querySelector("svg.ytmd-progress-ring");if(X===null){J?.remove();return}let Z=17,z=2*Math.PI*Z;if(!J){J=document.createElementNS("http://www.w3.org/2000/svg","svg"),J.setAttribute("class","ytmd-progress-ring"),J.setAttribute("viewBox","0 0 36 36");for(let j of["ytmd-progress-track","ytmd-progress-value"]){let Q=document.createElementNS("http://www.w3.org/2000/svg","circle");Q.setAttribute("class",j),Q.setAttribute("cx","18"),Q.setAttribute("cy","18"),Q.setAttribute("r",String(Z)),Q.setAttribute("stroke-dasharray",String(z)),J.appendChild(Q)}$.appendChild(J)}let Y=Math.max(0,Math.min(1,X));J.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(z*(1-Y)))}var C5=!1;function _6(){if(C5)return;C5=!0;let $=null,X=null,J=null,Z=()=>{if(X!==null)clearTimeout(X);X=null,J=null,$?.classList.remove("ytmd-open")},z=(j)=>{let Q=j.dataset.ytmdTooltip;if(!Q)return;if(!$)$=q("div",{id:"ytmd-tooltip"}),$.setAttribute("role","tooltip"),document.body.appendChild($);$.textContent=Q;let H=j.getBoundingClientRect(),F=$.getBoundingClientRect(),V=H.bottom+8+F.height<window.innerHeight?H.bottom+8:H.top-8-F.height,U=Math.max(8,Math.min(window.innerWidth-F.width-8,H.left+H.width/2-F.width/2));$.style.top=`${V}px`,$.style.left=`${U}px`,$.classList.add("ytmd-open")},Y=(j)=>{let Q=j.target?.closest?.("[data-ytmd-tooltip]");if(!Q||Q===J)return;Z(),J=Q,X=setTimeout(()=>z(Q),250)},G=(j)=>{let Q=j.relatedTarget;if(J&&Q&&J.contains(Q))return;Z()};document.addEventListener("mouseover",Y,!0),document.addEventListener("mouseout",G,!0),document.addEventListener("focusin",Y,!0),document.addEventListener("focusout",Z,!0),document.addEventListener("mousedown",Z,!0)}var l=null;function B($,X={}){w();let J=document.getElementById("ytmd-toast-host");if(!J)J=q("div",{id:"ytmd-toast-host"}),J.setAttribute("role","status"),J.setAttribute("aria-live","polite"),document.body.appendChild(J);let Z=J.querySelector(".ytmd-toast"),z=Z&&X.id&&Z.dataset.toastId===X.id&&!Z.classList.contains("ytmd-leaving"),Y=z?Z:q("div",{className:"ytmd-toast"});if(X.id)Y.dataset.toastId=X.id;let j=[q("span",{className:"ytmd-toast-text",text:$})];if(X.action){let{label:H,onClick:F}=X.action,K=q("button",{className:"ytmd-button",text:H});K.type="button",K.addEventListener("click",()=>{D5(),F()}),j.push(K)}if(Y.replaceChildren(...j),!z)J.replaceChildren(Y);if(l!==null)clearTimeout(l);l=null;let Q=X.durationMs??4000;if(Q>0)l=setTimeout(D5,Q)}var b6=5,R6=3000;function O5($,X){w();let J=document.getElementById("ytmd-reaction-host");if(!J)J=q("div",{id:"ytmd-reaction-host"}),J.setAttribute("aria-live","polite"),document.body.appendChild(J);let Z=q("div",{className:"ytmd-reaction"});Z.append(q("span",{className:"ytmd-reaction-emoji",text:$}),q("span",{text:X})),J.appendChild(Z);while(J.children.length>b6)J.firstElementChild?.remove();setTimeout(()=>Z.remove(),R6)}function D5(){if(l!==null)clearTimeout(l);l=null;let $=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!$)return;$.classList.add("ytmd-leaving"),setTimeout(()=>$.remove(),150)}function I0($){w(),document.getElementById($.id)?.remove();let X=q("div",{id:$.id,className:"ytmd-scrim"}),J=q("div",{className:"ytmd-dialog"});J.setAttribute("role","dialog"),J.setAttribute("aria-modal","true");let Z=`${$.id}-title`;J.setAttribute("aria-labelledby",Z);let z=q("h2",{id:Z,className:"ytmd-dialog-title",text:$.title}),Y=q("div",{className:"ytmd-dialog-body"});if($.body)Y.append(...$.body);let G=document.activeElement,j=()=>{document.removeEventListener("keydown",Q,!0),X.remove(),G?.focus?.()},Q=(F)=>{if(F.key==="Escape")F.stopPropagation(),j()};document.addEventListener("keydown",Q,!0),X.addEventListener("click",(F)=>{if(F.target===X)j()});let H=q("div",{className:"ytmd-dialog-actions"});for(let F of $.actions){let K=q("button",{className:`ytmd-button${F.filled?" ytmd-button--filled":""}`,text:F.label});K.type="button",K.addEventListener("click",()=>F.onClick?F.onClick(j):j()),H.appendChild(K)}return J.append(z,Y,H),X.appendChild(J),document.body.appendChild(X),H.querySelector("button")?.focus(),{close:j,body:Y}}var B5={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:($)=>$===1?"1 listener":`${$} listeners`,syncJoined:($)=>`${$} joined`,syncLeft:($)=>`${$} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:($)=>`${$} skipped to the next song`,syncGuestPrevious:($)=>`${$} went back a song`,syncGuestPaused:($)=>`${$} paused`,syncGuestResumed:($)=>`${$} resumed playback`,syncGuestPicked:($)=>`${$} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:($,X,J)=>`${$} votes to skip (${X}/${J})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:($,X)=>`From the shared queue: ${$} · ${X}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:($)=>`${$} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:($)=>`from ${$}`,syncQueuePlayNow:($)=>`Play “${$}” now`,syncQueueRemove:($)=>`Remove “${$}” from the queue`,syncQueueDrag:($)=>`Move “${$}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",downloadNoTrack:"Play a song first to download it",downloadStarted:($)=>`Downloading “${$}”`,downloadDone:($)=>`Downloaded “${$}”`,downloadFailed:($)=>`Download failed: ${$}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:($)=>`Source: ${$}`,lyricsLocalFiles:"Local files",lyricsWrong:"Wrong lyrics?",lyricsPickTitle:"Choose lyrics",lyricsPickLoading:"Looking for other versions…",lyricsPickNone:"No other versions found",lyricsPickFailed:"Couldn’t switch the lyrics",lyricsTimed:"Timed",lyricsTextOnly:"Text only",lyricsCurrent:"Current",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:($)=>`Volume: ${$}%`,windowMinimize:"Minimize",windowMaximize:"Maximize",windowRestore:"Restore down",windowClose:"Close"},f6={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:($)=>{if($===1)return"1 słuchacz";let X=$%100,J=$%10;return J>=2&&J<=4&&(X<12||X>14)?`${$} słuchacze`:`${$} słuchaczy`},syncJoined:($)=>`${$} dołącza do słuchania`,syncLeft:($)=>`${$} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:($)=>`${$} przełącza na następny utwór`,syncGuestPrevious:($)=>`${$} wraca do poprzedniego utworu`,syncGuestPaused:($)=>`${$} wstrzymuje odtwarzanie`,syncGuestResumed:($)=>`${$} wznawia odtwarzanie`,syncGuestPicked:($)=>`${$} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:($,X,J)=>`${$} głosuje za pominięciem (${X}/${J})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:($,X)=>`Ze wspólnej kolejki: ${$} · ${X}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:($)=>`${$} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:($)=>`od: ${$}`,syncQueuePlayNow:($)=>`Zagraj teraz: „${$}”`,syncQueueRemove:($)=>`Usuń z kolejki: „${$}”`,syncQueueDrag:($)=>`Przesuń „${$}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:($)=>`Pobieranie: „${$}”`,downloadDone:($)=>`Pobrano: „${$}”`,downloadFailed:($)=>`Nie udało się pobrać: ${$}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:($)=>`Źródło: ${$}`,lyricsLocalFiles:"Pliki lokalne",lyricsWrong:"Zły tekst?",lyricsPickTitle:"Wybierz tekst",lyricsPickLoading:"Szukanie innych wersji…",lyricsPickNone:"Nie znaleziono innych wersji",lyricsPickFailed:"Nie udało się zmienić tekstu",lyricsTimed:"Z synchronizacją",lyricsTextOnly:"Sam tekst",lyricsCurrent:"Obecny",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:($)=>`Głośność: ${$}%`,windowMinimize:"Minimalizuj",windowMaximize:"Maksymalizuj",windowRestore:"Przywróć w dół",windowClose:"Zamknij"},w6={en:B5,pl:f6};function E6($){let X=($||"").toLowerCase().split(/[-_]/)[0];return w6[X]??B5}var b1=null;function W(){if(!b1){let $=typeof document<"u"?document.documentElement.lang:"";b1=E6($||(typeof navigator<"u"?navigator.language:"en"))}return b1}var L0={video_id:null,provider:null,synced:[],plain:null,offset_secs:0,source_url:null};function A5($,X){let J=0,Z=$.length-1,z=-1;while(J<=Z){let Y=J+Z>>1;if($[Y].t<=X)z=Y,J=Y+1;else Z=Y-1}return z}function P5($,X,J){return A5($,X+J)}function _5($,X,J){return $?.words?A5($.words,X+J):-1}function R1($,X){switch($){case"local":return X;case"lrclib":return"LRCLIB";case"musixmatch":return"Musixmatch";case"netease":return"NetEase";case"ytm":return"YouTube Music";case"genius":return"Genius";default:return $||""}}function g0($){if(!$||typeof $!=="object")return{...L0};let X=$;return{video_id:typeof X.video_id==="string"?X.video_id:null,provider:typeof X.provider==="string"?X.provider:null,synced:Array.isArray(X.synced)?X.synced.filter((J)=>typeof J?.t==="number"&&typeof J?.text==="string"):[],plain:typeof X.plain==="string"?X.plain:null,offset_secs:typeof X.offset_secs==="number"&&Number.isFinite(X.offset_secs)?X.offset_secs:0,source_url:typeof X.source_url==="string"?X.source_url:null}}var A={...L0},g=!1,p=-1,n=-1,X0="",y0=0,w1="",v0=!1,I=null,x0=null,b5=($,X)=>$===X,h6=($)=>$.videoId||`${$.title} - ${$.artist}`,f5={id:"lyrics",name:"Native Synced Lyrics",description:"Synchronized lyrics from several providers in the native Lyrics tab, with active highlighting and seek-on-click",defaultEnabled:!0,onInit($){A={...L0},g=!1,p=-1,n=-1,X0="",w1="",v0=!1,I=null;let X=document.createElement("style");X.id="ytmd-native-lyrics-styles",X.textContent=T6,document.head.appendChild(X),w();let J=()=>{f1(),u6($),S6($)},Z=()=>{setTimeout(()=>{f1(),E1()},50),setTimeout(()=>{E1()},250)};document.addEventListener("click",Z,!0);let z=window.setInterval(J,600);J(),I6($);let Y=window.__TAURI__?.event?window.__TAURI__.event.listen("lyrics-changed",(G)=>{let j=g0(G.payload);if(!k6(j))return;h1($,j)}):null;x0=()=>{clearInterval(z),document.removeEventListener("click",Z,!0),Y?.then((G)=>G()),X.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((G)=>G.remove())}},async onTrackChange($,X){let J=h6($);if(I=$,J===X0)return;X0=J,A={...L0,video_id:$.videoId??null},g=!0,p=-1,n=-1,w1=E5(),v0=!1,f1(),u0(X),await w5(X,$,J,null)},onTick($){y0=$,p0($,!0)},onDestroy(){if(x0)x0(),x0=null}},T6=`
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
`;function k6($){if(!I)return!1;if($.video_id&&I.videoId)return $.video_id===I.videoId;return!$.video_id||$.video_id===I.videoId}async function w5($,X,J,Z){try{let z=g0(await $.invoke("fetch_lyrics",{videoId:X.videoId||null,artist:X.artist,title:X.title,albumName:X.album||null,duration:X.durationSecs||null,ytmPlain:Z},{timeoutMs:15000}));if(!b5(J,X0))return;g=!1,h1($,z)}catch{if(!b5(J,X0))return;g=!1,u0($)}}function h1($,X){let J=X.provider!==null&&X.provider===A.provider&&X.synced.length===A.synced.length&&X.plain===A.plain&&X.video_id===A.video_id&&!g;if(g&&!X.provider&&X.offset_secs===A.offset_secs)return;if(A=X,g=!1,J){let Z=document.querySelector(".ytmd-lyrics-offset-value");if(Z)Z.textContent=T5(X.offset_secs);p0(y0,!1);return}p=-1,n=-1,u0($),p0(y0,!1)}function p0($,X){if(A.synced.length===0)return;let J=document.getElementById("ytmd-native-lyrics-wrapper");if(!J)return;let Z=J.querySelectorAll(".ytmd-native-lyric-line"),z=P5(A.synced,$,A.offset_secs);if(z!==p){Z[p]?.classList.remove("active"),Z[p]?.querySelectorAll(".ytmd-sung").forEach((j)=>j.classList.remove("ytmd-sung")),p=z,n=-1;let G=Z[z];if(G){G.classList.add("active");let j=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(X&&j&&y6(j))G.scrollIntoView({behavior:"smooth",block:"nearest"})}}let Y=_5(A.synced[z],$,A.offset_secs);if(Y!==n)Z[z]?.querySelectorAll(".ytmd-lyric-word")?.forEach((j,Q)=>j.classList.toggle("ytmd-sung",Q<=Y)),n=Y}function E5(){return document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description')?.textContent?.trim()||""}function S6($){if(v0||g||!I||A.provider)return;let X=E5();if(!X||X===w1)return;v0=!0,w5($,I,X0,X)}async function I6($){let X=g6(),J=[...x6(X)];if(J.length===0)return;try{await $.invoke("import_lyrics_offsets",{entries:J}),X?.removeItem?.(h5)}catch(Z){console.warn("[YTMD Lyrics] Offset migration failed, will retry next start:",Z)}}var h5="ytmd-lyrics-offsets";function g6(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function x6($){try{let X=$?.getItem(h5);if(!X)return new Map;let J=JSON.parse(X);if(!Array.isArray(J))return new Map;return new Map(J.filter((Z)=>Array.isArray(Z)&&typeof Z[0]==="string"&&typeof Z[1]==="number"))}catch{return new Map}}function T5($){return`${$>0?"+":$<0?"−":""}${Math.abs($).toFixed(1)} s`}function y6($){if(!$||$.offsetParent===null||$.hasAttribute("hidden"))return!1;let X=window.getComputedStyle($);return X.display!=="none"&&X.visibility!=="hidden"&&X.opacity!=="0"}function v6($){return $.disabled!==!0&&!$.hasAttribute("disabled")&&$.getAttribute("aria-disabled")!=="true"&&!$.classList.contains("disabled")&&$.classList.contains("ytmd-lyrics-tab-unlocked")}function f1(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((X)=>{let J=X.textContent?.toLowerCase()||"";if(J.includes("tekst")||J.includes("lyrics")||J.includes("paroles")||J.includes("letras")){if(v6(X))return;X.disabled=!1,X.removeAttribute("disabled"),X.removeAttribute("aria-disabled"),X.classList.remove("disabled"),X.classList.add("ytmd-lyrics-tab-unlocked");let Z={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!X.endpoint)X.endpoint=Z;if(X.data&&!X.data.endpoint)X.data.endpoint=Z}})}function p6(){let $=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let J of Array.from($)){let Z=J.textContent?.toLowerCase()||"";if(Z.includes("tekst")||Z.includes("lyrics")||Z.includes("paroles")||Z.includes("letras")){if(J.classList.contains("iron-selected")||J.getAttribute("aria-selected")==="true"||J.classList.contains("selected"))return!0}}let X=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(X){if((X.classList.contains("iron-selected")||!X.hasAttribute("hidden"))&&X.getAttribute("aria-hidden")!=="true")return!0}return!1}function E1(){let $=document.getElementById("ytmd-native-lyrics-wrapper");if(!$)return;let X=p6();$.style.setProperty("display",X?"flex":"none","important")}function u6($){let X=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!X)return;let J=document.getElementById("ytmd-native-lyrics-wrapper");if(!J||!X.contains(J)){if(!J)J=q("div",{id:"ytmd-native-lyrics-wrapper"});X.appendChild(J),p=-1,n=-1,u0($),p0(y0,!1)}E1()}function C0($,X,J){let Z=q("button",{className:"ytmd-chip",text:$});return Z.type="button",Z.dataset.ytmdTooltip=X,Z.setAttribute("aria-label",X),Z.addEventListener("click",J),Z}function m6(){let $=W().lyricsSource(R1(A.provider,W().lyricsLocalFiles));if(A.source_url){let X=q("a",{className:"ytmd-lyrics-source",text:$});return X.href=A.source_url,X.target="_blank",X.rel="noopener noreferrer",X}return q("span",{className:"ytmd-lyrics-source",text:$})}function R5($,X){let J=q("div",{className:"ytmd-native-lyrics-footer"});if(J.append(m6()),X){let Z=q("span",{className:"ytmd-lyrics-offset-value",text:T5(A.offset_secs)}),z=(Y)=>{let G=Y===null?0:Math.round((A.offset_secs+Y)*10)/10;$.invoke("set_lyrics_offset",{offsetSecs:G}).catch((j)=>console.warn("[YTMD Lyrics] offset:",j))};J.append(q("span",{text:W().lyricsOffset}),C0("−0.5 s",W().lyricsLater,()=>z(-0.5)),Z,C0("+0.5 s",W().lyricsEarlier,()=>z(0.5)),C0(W().lyricsReset,W().lyricsReset,()=>z(null)))}return J.append(C0(W().lyricsWrong,W().lyricsPickTitle,()=>void k5($))),J}async function k5($){let X=q("div",{className:"ytmd-lyrics-pick-list"});X.append(q("div",{className:"ytmd-native-lyrics-status",text:W().lyricsPickLoading}));let J=I0({id:"ytmd-lyrics-picker",title:W().lyricsPickTitle,body:[X],actions:[{label:W().close}]}),Z=[];try{Z=await $.invoke("list_lyrics_candidates",{},{timeoutMs:15000})||[]}catch{Z=[]}if(!X.isConnected)return;if(Z.length===0){X.replaceChildren(q("div",{className:"ytmd-native-lyrics-status",text:W().lyricsPickNone}));return}X.replaceChildren(...Z.map((z)=>{let Y=q("button",{className:"ytmd-menu-item"});Y.type="button";let G=q("span",{className:"ytmd-menu-item-text"}),j=z.synced?W().lyricsTimed:W().lyricsTextOnly;if(G.append(q("span",{text:`${R1(z.provider,W().lyricsLocalFiles)} · ${j}`}),q("span",{className:"ytmd-menu-item-sub",text:`${z.title} — ${z.artist}`}),q("span",{className:"ytmd-menu-item-sub",text:z.preview})),Y.append(G),z.selected)Y.append(q("span",{className:"ytmd-menu-item-hint",text:W().lyricsCurrent}));return Y.addEventListener("click",async()=>{J.close();try{h1($,g0(await $.invoke("pick_lyrics",{provider:z.provider,id:z.id})))}catch{B(W().lyricsPickFailed)}}),Y}))}function u0($){let X=document.getElementById("ytmd-native-lyrics-wrapper");if(!X)return;if(g)X.replaceChildren(q("div",{className:"ytmd-native-lyrics-status",text:W().lyricsLoading}));else if(A.synced.length>0)X.replaceChildren(...A.synced.map((J)=>{let Z=q("div",{className:"ytmd-native-lyric-line"});if(J.words?.length)Z.classList.add("ytmd-has-words"),Z.append(...J.words.map((z)=>q("span",{className:"ytmd-lyric-word",text:z.text})));else Z.textContent=J.text;return Z.addEventListener("click",()=>{let z=$.getVideoElement();if(z)z.currentTime=Math.max(0,J.t-A.offset_secs)}),Z}),R5($,!0));else if(A.plain)X.replaceChildren(...A.plain.split(`
`).map((J)=>q("div",{className:"ytmd-native-lyric-line ytmd-plain",text:J})),R5($,!1));else{let J=[q("div",{className:"ytmd-native-lyrics-status",text:W().lyricsNone})];if(I)J.push(c6($));X.replaceChildren(...J)}}function c6($){let X=q("div",{className:"ytmd-native-lyrics-footer"});return X.append(q("span",{className:"ytmd-lyrics-source"}),C0(W().lyricsWrong,W().lyricsPickTitle,()=>void k5($))),X}var D0=null;function J0($){if(!$)return null;let X=$.getBoundingClientRect();if(X.width<80||X.height<80||X.bottom<=0||X.right<=0||X.top>=window.innerHeight||X.left>=window.innerWidth)return null;for(let J=$;J;J=J.parentElement){let Z=getComputedStyle(J);if(Z.display==="none"||Z.visibility==="hidden"||Number(Z.opacity)===0)return null}return X}function d6($,X){let J=Math.max($.left,X.left),Z=Math.max($.top,X.top);if(J>=Math.min($.right,X.right)||Z>=Math.min($.bottom,X.bottom))return X;return{left:J,top:Z}}function S5(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var I5={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit($){D0?.(),w(),document.getElementById("ytmd-volume-indicator")?.remove();let X=q("div",{id:"ytmd-volume-indicator"});document.body.appendChild(X);let J=null,Z=null,z=null,Y=null,G=null,j=null,Q=()=>{if(j!==null)window.cancelAnimationFrame(j);j=null},H=()=>{if(G!==null)window.clearTimeout(G);G=null,Q(),X.classList.remove("ytmd-visible")},F=()=>{let O=document.querySelector("ytmusic-player-page #main-panel");if(!S5()&&!J0(O))return!1;let _=J0(document.querySelector("ytmusic-player-page #song-image")),R=J0(document.querySelector("ytmusic-player-page video"))||J0(document.querySelector("ytmusic-player-page #movie_player")),S=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?R||_:_||R)||J0(O);if(!S)return!1;let v=J0(document.querySelector("ytmusic-player-page #player")),d=v?d6(S,v):S,T=`${Math.max(8,d.left+12)}px`,F0=`${Math.max(8,d.top+12)}px`;if(X.style.left!==T)X.style.left=T;if(X.style.top!==F0)X.style.top=F0;return!0},K=()=>{if(j=null,!X.classList.contains("ytmd-visible"))return;if(!F()){H();return}j=window.requestAnimationFrame(K)},V=()=>{if(G!==null)window.clearTimeout(G);if(X.classList.add("ytmd-visible"),j===null)j=window.requestAnimationFrame(K);G=window.setTimeout(H,1800)},U=()=>{let O=$.getVideoElement();if(!O){Y=null,H();return}let _=w0(O)?0:q0(O),R=Y!==null&&_!==Y&&!G5();if(Y=_,X.textContent!==`${_}%`)X.textContent=`${_}%`,X.setAttribute("aria-label",W().volumeLevel(_));if(!F()){H();return}if(R)V()},L=()=>{let O=$.getVideoElement();if(O===J)return;J?.removeEventListener("volumechange",U),J=O,J?.addEventListener("volumechange",U),U()},N=()=>{let O=document.querySelector("ytmusic-player-page");if(O===Z)return;if(z?.disconnect(),Z=O,O)z=new MutationObserver(()=>window.requestAnimationFrame(U)),z.observe(O,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},D=(O)=>{let _=O.target;if(_ instanceof Element&&_.closest("ytmusic-player-bar"))window.requestAnimationFrame(U)},M=(O)=>{if(O.deltaY===0||O.ctrlKey)return;let _=O.target,R=_ instanceof Element?_.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'):null;if(R&&R.tagName!=="YTMUSIC-PLAYER")return;let y=(o1)=>{if(!o1)return!1;let f0=o1.getBoundingClientRect();return O.clientX>=f0.left&&O.clientX<f0.right&&O.clientY>=f0.top&&O.clientY<f0.bottom},S=y(document.querySelector("ytmusic-player-bar"))||y(document.querySelector("#player-bar-background")),v=$.config.wheel_volume_on_player_page===!0&&(S5()||y(document.querySelector("ytmusic-player-page #main-panel")));if(!S&&!v)return;let d=$.getVideoElement();if(!d)return;let T=$.config.wheel_volume_step,F0=typeof T==="number"&&Number.isFinite(T)&&T>0?Math.min(T,1):0.05;O.preventDefault(),E0(q0(d)+(O.deltaY<0?F0:-F0)*100,d),U()};window.addEventListener("wheel",M,{passive:!1,capture:!0}),window.addEventListener("resize",U),document.addEventListener("scroll",U,!0),document.addEventListener("input",D,!0),document.addEventListener("change",D,!0),N(),L();let h=window.setInterval(()=>{N(),L(),U()},500);D0=()=>{window.removeEventListener("wheel",M,{capture:!0}),window.removeEventListener("resize",U),document.removeEventListener("scroll",U,!0),document.removeEventListener("input",D,!0),document.removeEventListener("change",D,!0),window.clearInterval(h),z?.disconnect(),J?.removeEventListener("volumechange",U),H(),X.remove()}},onDestroy(){if(D0)D0(),D0=null}};var g5={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange($,X){if(!X.config?.notifications_enabled)return;if(!$.title||$.title==="No Track Playing")return;try{await X.invoke("notify_track_change",{title:$.title,artist:$.artist})}catch(J){console.warn("[YTMD] Notification dispatch failed:",J)}}};var m0=null,x5={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit($){let X=document.getElementById("ytmd-theme-styles");if(!X)X=document.createElement("style"),X.id="ytmd-theme-styles";if(X.textContent=`
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
    `,!X.isConnected)document.head.appendChild(X);m0=()=>{X?.remove()}},onDestroy(){if(m0)m0(),m0=null}};var c0=[32,64,125,250,500,1000,2000,4000,8000,16000],T1={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function M0($){return Math.max(-24,Math.min(24,$))}function s6($){if($.length===0)return-100;let X=0;for(let Z=0;Z<$.length;Z++)X+=$[Z]*$[Z];let J=Math.sqrt(X/$.length);if(J<=0.00001)return-100;return 20*Math.log10(J)}function l6($){return Math.max(0.5,Math.min(2,$))}class f{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=c0.map(()=>0);preampDb=0;isInitializedFor($){return this.isInitialized&&this.hookedVideo===$}static getInstance(){if(!f.instance)f.instance=new f;return f.instance}init($){if(this.isInitialized&&this.hookedVideo===$){this.resumeContext();return}try{let X=window.AudioContext||window.webkitAudioContext;if(!X){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new X,this.hookedVideo=$,this.sourceNode=this.audioCtx.createMediaElementSource($),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=c0.map((Z,z)=>{if(!this.audioCtx)throw Error("AudioContext missing");let Y=this.audioCtx.createBiquadFilter();if(z===0)Y.type="lowshelf";else if(z===c0.length-1)Y.type="highshelf";else Y.type="peaking",Y.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return Y.frequency.setValueAtTime(Z,this.audioCtx.currentTime),Y.gain.setValueAtTime(0,this.audioCtx.currentTime),Y}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let J=()=>this.resumeContext();$.addEventListener("play",J),$.addEventListener("playing",J),document.addEventListener("click",J,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(X){console.error("[YTMD DSP] Failed to initialize AudioEngine:",X)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((X)=>X.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let $=this.sourceNode;if(this.isNormalizing)$.connect(this.compressorNode),$=this.compressorNode;for(let X of this.filters)$.connect(X),$=X;$.connect(this.preampNode),$=this.preampNode,$.connect(this.fadeNode),$=this.fadeNode,$.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch($){console.error("[YTMD DSP] Graph rebuild error:",$)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain($,X){if($<0||$>=this.gains.length)return;let J=M0(X);if(this.gains[$]=J,!this.audioCtx||$>=this.filters.length)return;this.filters[$].gain.setValueAtTime(J,this.audioCtx.currentTime)}setAllGains($){$.forEach((J,Z)=>{if(Z<this.gains.length)this.gains[Z]=M0(J)});let X=this.audioCtx;if(!X)return;this.gains.forEach((J,Z)=>{if(Z<this.filters.length)this.filters[Z].gain.setValueAtTime(J,X.currentTime)})}setPreamp($){if(this.preampDb=M0($),!this.preampNode||!this.audioCtx)return;let X=Math.pow(10,M0($)/20);this.preampNode.gain.setValueAtTime(X,this.audioCtx.currentTime)}setLoudnessNormalization($){if(this.isNormalizing!==$)this.isNormalizing=$,this.rebuildGraph()}applyPreset($){let X=T1[$]||T1.flat;if(this.setAllGains(X.gains),X.preamp!==void 0)this.setPreamp(X.preamp);return X.gains}fadeIn($){if(!this.fadeNode||!this.audioCtx||$<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let X=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(X),this.fadeNode.gain.setValueAtTime(0.001,X),this.fadeNode.gain.linearRampToValueAtTime(1,X+$)}fadeOut($){if(!this.fadeNode||!this.audioCtx||$<=0)return;let X=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(X),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,X),this.fadeNode.gain.linearRampToValueAtTime(0.001,X+$)}resetFade(){if(this.fadeNode&&this.audioCtx){let $=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues($),this.fadeNode.gain.setValueAtTime(1,$)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),s6(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let $=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData($),$}setPlaybackRate($){this.playbackRate=l6($),this.applyRateAndPitch()}setPreservesPitch($){this.preservesPitch=$,this.applyRateAndPitch()}applyRateAndPitch(){let $=this.hookedVideo??C.getVideo();if(!$)return;if($.playbackRate!==this.playbackRate)$.playbackRate=this.playbackRate;if($.preservesPitch!==this.preservesPitch){$.preservesPitch=this.preservesPitch;let X=$;X.webkitPreservesPitch=this.preservesPitch}}}class k1{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds($){this.crossfadeSeconds=Math.max(0,Math.min(12,$))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange($){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=$.videoId||`${$.title}-${$.artist}`,this.crossfadeSeconds>0)f.getInstance().fadeIn(this.crossfadeSeconds);else f.getInstance().resetFade()}onTick($,X){if(!X||this.crossfadeSeconds<=0||X.durationSecs<=0)return;let J=X.durationSecs-$;if(this.fadeOutTriggered&&J>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),f.getInstance().resetFade();return}if(J<=this.crossfadeSeconds&&!this.fadeOutTriggered&&J>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${J.toFixed(1)}s remaining)...`),f.getInstance().fadeOut(J),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let Z=X.videoId||`${X.title}-${X.artist}`;if(this.currentTrackId===Z)console.log("[YTMD Crossfade] Advancing to next track..."),C.next()},Math.max(100,(J-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class S1{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled($){this.enabled=$}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick($,X,J){if(!this.enabled||!X||!J||J.paused||J.ended)return;let Z=f.getInstance().getAudioPowerDb();if(Z===null)return;if(!this.checkedIntro&&$<15)if(Z<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&$<12)console.log(`[YTMD Skip Silence] Intro silence detected (${Z.toFixed(1)} dB). Fast forwarding...`),J.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(X.durationSecs>15&&$>X.durationSecs-10)if(Z<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${Z.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,C.next()}else this.consecutiveSilentTicks=0}}var r=null,Z0=null,d0=null;function n6($){let X=$.equalizer_gains;return Boolean($.equalizer_enabled||$.loudness_normalization||$.skip_silence_enabled||typeof $.crossfade_seconds==="number"&&$.crossfade_seconds>0||typeof $.preamp_gain==="number"&&$.preamp_gain!==0||Array.isArray(X)&&X.some((J)=>J!==0))}var y5={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit($){let X=f.getInstance(),J=new k1,Z=new S1;r=J,Z0=Z;let z=$.config,Y=null,G=()=>{if(Y!==null)return;let Q=$.getVideoElement();if(Q){if(!X.isInitializedFor(Q))X.init(Q);return}Y=window.setInterval(()=>{let H=$.getVideoElement();if(H){if(Y!==null)clearInterval(Y);Y=null,X.init(H)}},500)};if(n6(z))G();if(z.equalizer_gains&&Array.isArray(z.equalizer_gains))X.setAllGains(z.equalizer_gains);else if(z.equalizer_preset&&typeof z.equalizer_preset==="string")X.applyPreset(z.equalizer_preset);if(z.preamp_gain!==void 0)X.setPreamp(z.preamp_gain);if(z.loudness_normalization!==void 0)X.setLoudnessNormalization(Boolean(z.loudness_normalization));if(z.crossfade_seconds!==void 0)J.setCrossfadeSeconds(z.crossfade_seconds);if(z.skip_silence_enabled!==void 0)Z.setEnabled(Boolean(z.skip_silence_enabled));if(z.playback_speed!==void 0)X.setPlaybackRate(z.playback_speed);if(z.preserve_pitch!==void 0)X.setPreservesPitch(Boolean(z.preserve_pitch));let j=[];if(window.__TAURI__?.event){let{listen:Q}=window.__TAURI__.event;j.push(Q("set-eq-band",(H)=>{G(),X.setBandGain(H.payload.bandIndex,H.payload.gain)}),Q("set-eq-all",(H)=>{G(),X.setAllGains(H.payload.gains)}),Q("set-eq-preset",(H)=>{G(),X.applyPreset(H.payload)}),Q("set-preamp",(H)=>{G(),X.setPreamp(H.payload)}),Q("set-loudness-normalization",(H)=>{if(H.payload)G();X.setLoudnessNormalization(H.payload)}),Q("set-crossfade-seconds",(H)=>{if(H.payload>0)G();J.setCrossfadeSeconds(H.payload)}),Q("set-skip-silence",(H)=>{if(H.payload)G();Z.setEnabled(H.payload)}),Q("set-playback-rate",(H)=>{X.setPlaybackRate(H.payload)}),Q("set-preserves-pitch",(H)=>{X.setPreservesPitch(H.payload)}))}d0=()=>{if(Y!==null)clearInterval(Y),Y=null;j.forEach((Q)=>Q.then((H)=>H())),r?.destroy(),r=null,Z0=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange($){if(f.getInstance().applyRateAndPitch(),r)r.onTrackChange($);if(Z0)Z0.onTrackChange()},onTick($,X){if(t())return;if(r)r.onTick($,X.track);if(Z0)Z0.onTick($,X.track,X.getVideoElement())},onDestroy(){if(d0)d0(),d0=null}};var I1=($,X,J)=>{let Z=(Y)=>Math.max(0,Math.min(255,Math.round(Y))),z=(Y)=>Z(Y).toString(16).padStart(2,"0");return`#${z($)}${z(X)}${z(J)}`};async function v5($){return new Promise((X)=>{let J={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!$){X(J);return}let Z=new Image;Z.crossOrigin="anonymous",Z.onload=()=>{try{let z=document.createElement("canvas");z.width=16,z.height=16;let Y=z.getContext("2d");if(!Y){X(J);return}Y.drawImage(Z,0,0,16,16);let G=Y.getImageData(0,0,16,16).data,j=0,Q=0,H=0,F=0,K=0,V=0,U=0,L=0;for(let R=0;R<G.length;R+=4){let y=G[R],S=G[R+1],v=G[R+2];if(G[R+3]<128)continue;let T=(y+S+v)/3;if(T<20||T>240)continue;if(R<G.length/2)j+=y,Q+=S,H+=v,F++;else K+=y,V+=S,U+=v,L++}if(F===0&&L===0){X(J);return}let N=F>0?Math.round(j/F):220,D=F>0?Math.round(Q/F):38,M=F>0?Math.round(H/F):38,h=L>0?Math.round(K/L):24,O=L>0?Math.round(V/L):24,_=L>0?Math.round(U/L):27;X({primary:I1(N,D,M),secondary:I1(h,O,_),accent:I1(N+30,D+30,M+30)})}catch{X(J)}},Z.onerror=()=>X(J),Z.src=$})}var u=48,r6=3,a6=3,i6=1.65,o6=0.55;function t6($,X,J,Z){let z=new Float32Array($.length),Y=(G,j,Q)=>{let H=Q?J:X,F=Q?X:J;for(let K=0;K<H;K++)for(let V=0;V<4;V++)for(let U=0;U<F;U++){let L=0,N=0;for(let M=Math.max(0,U-Z);M<=Math.min(F-1,U+Z);M++){let h=Q?(K*X+M)*4+V:(M*X+K)*4+V;L+=G[h],N++}let D=Q?(K*X+U)*4+V:(U*X+K)*4+V;j[D]=L/N}};Y($,z,!0),Y(z,$,!1)}function e6($,X,J){for(let Z=0;Z<$.length;Z+=4){let z=$[Z],Y=$[Z+1],G=$[Z+2],j=0.2126*z+0.7152*Y+0.0722*G;$[Z]=(j+(z-j)*X)*J,$[Z+1]=(j+(Y-j)*X)*J,$[Z+2]=(j+(G-j)*X)*J}}async function p5($,X=o6){if(!$)return null;return new Promise((J)=>{let Z=new Image;Z.crossOrigin="anonymous",Z.onload=()=>{try{let z=document.createElement("canvas");z.width=u,z.height=u;let Y=z.getContext("2d");if(!Y)return J(null);Y.imageSmoothingQuality="high",Y.drawImage(Z,0,0,u,u);let G=Y.getImageData(0,0,u,u);for(let j=0;j<a6;j++)t6(G.data,u,u,r6);e6(G.data,i6,X),Y.putImageData(G,0,0),J(z.toDataURL("image/png"))}catch{J(null)}},Z.onerror=()=>J(null),Z.src=$})}var s0=null,l0=null,n0,u5={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit($){let X=document.getElementById("ytmd-ambient-backdrop");if(!X)X=q("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(X);X.replaceChildren();let J=q("img",{id:"ytmd-ambient-cover"});J.alt="";let Z=q("div",{id:"ytmd-ambient-veil"});X.appendChild(J),X.appendChild(Z);let z=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6,Y=$.config.ambient_lighting_enabled!==!1,G=document.createElement("style");G.id="ytmd-ambient-styles",G.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
        opacity: ${Y?z:0};
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
    `,document.head.appendChild(G),s0=(Q)=>{if(X)X.style.opacity=String(Q)};let j=[];if(window.__TAURI__?.event)j.push(window.__TAURI__.event.listen("set-ambient-intensity",(Q)=>{s0?.(Q.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(Q)=>{let H=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6;s0?.(Q.payload?H:0)}));if(l0=()=>{j.forEach((Q)=>Q.then((H)=>H())),s0=null,n0=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},$.track)this.onTrackChange($.track,$)},async onTrackChange($){let X=$.coverUrl||null;if(X===n0)return;n0=X;let J=document.getElementById("ytmd-ambient-cover");if(J){let Z=X?await p5(X):null;if(X!==n0)return;if(J.style.opacity=Z?"1":"0",Z)J.src=Z}try{let Z=await v5(X||""),z=document.documentElement.style;z.setProperty("--ytmd-accent",Z.accent),z.setProperty("--ytmd-accent-primary",Z.primary),z.setProperty("--ytmd-accent-secondary",Z.secondary)}catch{}},onDestroy(){if(l0)l0(),l0=null}};var m5=`
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

  /* Playlist/album pages wrap their header in .background-gradient, a
     60%-black to opaque #030303 fade only as tall as the header (over
     YTM's own blurred-art #background). Scrolled down, its opaque bottom
     edge cut straight across the ambient wash as a hard band. The wash
     already plays that role, so both go. */
  ytmusic-browse-response .background-gradient {
    background: transparent !important;
  }
  ytmusic-browse-response #background.immersive-background {
    display: none !important;
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

`,c5=`
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

`;var r0=null,d5={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit($){let X=()=>document.head||document.documentElement,J=(j)=>{let Q=document.getElementById(j);if(!Q){Q=document.createElement("style"),Q.id=j;let H=X();if(H)H.appendChild(Q)}return Q},Z=(j)=>{let Q=J("ytmd-active-theme");Q.textContent=j?m5:c5},z=(j)=>{let Q=J("ytmd-custom-css");if(Q)Q.textContent=j};Z($.config.ambient_lighting_enabled!==!1);let Y=$.config.custom_css||"";z(Y);let G=[];if(window.__TAURI__?.event)G.push(window.__TAURI__.event.listen("set-ambient-enabled",(j)=>{Z(j.payload)}),window.__TAURI__.event.listen("set-custom-css",(j)=>{z(j.payload)}));r0=()=>{G.forEach((j)=>j.then((Q)=>Q()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(r0)r0(),r0=null}};var a0=null,s5={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit($){let X=()=>{if(document.getElementById("ytmd-pip-btn"))return;let Z=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(Z){let z=E({id:"ytmd-pip-btn",label:W().pipButton,iconPath:b.pip});z.addEventListener("click",async()=>{let Y=$.getVideoElement();if(!Y)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await Y.requestPictureInPicture();else await $.invoke("toggle_mini_player")}catch(G){console.warn("[YTMD PiP] Could not enter PiP:",G),await $.invoke("toggle_mini_player").catch((j)=>console.error("[YTMD PiP] Mini player fallback failed:",j))}}),Z.appendChild(z)}},J=window.setInterval(X,1000);X(),a0=()=>{clearInterval(J),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(a0)a0(),a0=null}};function $$($){if($.error)return"failed";if($.output_path&&$.percent>=100)return"done";return"progress"}var o0="ytmd-download-btn",X$=3000,z0=new Map,g1=new Set,t0=null,i0=null;function Y0(){let $=document.getElementById(o0);if(!$)return;let X=t0?.videoId,J=X?z0.get(X):void 0;M5($,J?Math.max(0.05,J.fraction):null),S0($,X&&g1.has(X)?b.check:b.download),$.setAttribute("aria-disabled",X?"false":"true");let Z=J?W().downloadInProgress:W().downloadButton;$.setAttribute("aria-label",Z),$.dataset.ytmdTooltip=Z}function x1($,X){let J=z0.get($);if(!J)return;if(z0.delete($),X.ok)g1.add($),setTimeout(()=>{g1.delete($),Y0()},X$),B(W().downloadDone(J.title),{id:`download-${$}`});else B(W().downloadFailed(X.reason),{id:`download-${$}`,durationMs:8000});Y0()}function J$($){let X=z0.get($.video_id);if(!X)return;let J=$$($);if(J==="failed")x1($.video_id,{ok:!1,reason:$.error||$.status});else if(J==="done")x1($.video_id,{ok:!0});else X.fraction=$.percent/100,Y0()}function y1($,X){let J=X?.videoId;if(!X||!J){B(W().downloadNoTrack);return}if(z0.has(J)){B(W().downloadInProgress);return}z0.set(J,{title:X.title,fraction:0}),Y0(),B(W().downloadStarted(X.title),{id:`download-${J}`}),$.invoke("download_track",{request:{video_id:J,title:X.title,artist:X.artist,album:X.album||void 0,cover_url:X.coverUrl||void 0,format:$.config.download_format||"mp3",embed_lyrics:$.config.embed_lyrics!==!1}}).catch((Z)=>{console.error("[YTMD Downloader] Download failed:",Z),x1(J,{ok:!1,reason:Z instanceof Error?Z.message:String(Z)})})}var l5={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit($){t0=$.track;let X=()=>{if(document.getElementById(o0))return;let z=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!z)return;let Y=E({id:o0,label:W().downloadButton,iconPath:b.download});Y.addEventListener("click",()=>{if(Y.getAttribute("aria-disabled")==="true")return;y1($,t0)}),z.appendChild(Y),Y0()},J=window.setInterval(X,1000);X();let Z=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(z)=>J$(z.payload)):null;i0=()=>{clearInterval(J),Z?.then((z)=>z()),document.getElementById(o0)?.remove()}},onTrackChange($){t0=$,Y0()},onDestroy(){if(i0)i0(),i0=null}};var n5={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit($){console.log("[YTMD] Local files module ready.")}};var e0="ytmd-nav-slot",v1="ytmd-menu-btn",B0="ytmd-menu",r5="ytmd-sync-chip",i5=[],O0=null,o5=null,a5=!1,Z$=`
  #${e0} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function z$(){if(document.getElementById("ytmd-nav-slot-styles"))return;let $=document.createElement("style");$.id="ytmd-nav-slot-styles",$.textContent=Z$,document.head.appendChild($)}function Y$($){if(!$)return;return`${W().syncInRoom} · ${W().syncListeners($.listeners)}`}function t5($){i5=$.items,o5=$.onSyncChipClick}function e5(){if(document.getElementById(e0)?.isConnected)return;let $=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!$)return;w(),z$();let X=q("div",{id:e0}),J=E({id:v1,label:W().menuLabel,iconPath:b.apps});J.setAttribute("aria-haspopup","menu"),J.setAttribute("aria-expanded","false"),J.addEventListener("click",(Z)=>{Z.stopPropagation(),j$(J)}),X.appendChild(J),$.prepend(X),$8(),H$()}function p1($){O0=$,$8();let X=document.getElementById(B0);if(X?.classList.contains("ytmd-open"))X8(X)}function $8(){let $=document.getElementById(e0);if(!$)return;let X=document.getElementById(r5);if(!O0){X?.remove();return}if(!X)X=q("button",{id:r5,className:"ytmd-chip"}),X.type="button",X.addEventListener("click",()=>o5?.()),$.prepend(X);let J=W().syncListeners(O0.listeners);X.replaceChildren(q("span",{className:"ytmd-chip-dot"}),N0(b.group,18),q("span",{text:J})),X.dataset.ytmdTooltip=`${W().syncInRoom} · ${O0.roomCode}`,X.setAttribute("aria-label",`${W().syncInRoom}, ${J}`)}function X8($){let X=[];for(let J of i5){if(J.dividerBefore)X.push(q("div",{className:"ytmd-menu-divider"}));let Z=q("button",{className:"ytmd-menu-item"});Z.type="button",Z.setAttribute("role","menuitem"),Z.dataset.itemId=J.id;let z=q("span",{className:"ytmd-menu-item-text"});z.appendChild(q("span",{text:J.label}));let Y=J.id==="sync"?Y$(O0):void 0;if(Y)z.appendChild(q("span",{className:"ytmd-menu-item-sub",text:Y}));if(Z.append(N0(J.iconPath),z),J.hint)Z.appendChild(q("span",{className:"ytmd-menu-item-hint",text:J.hint}));Z.addEventListener("click",()=>{G0(),J.onSelect()}),X.push(Z)}$.replaceChildren(...X)}function G$(){let $=document.getElementById(B0);if(!$)$=q("div",{id:B0,className:"ytmd-menu"}),$.setAttribute("role","menu"),$.addEventListener("keydown",Q$),document.body.appendChild($);return $}function j$($){let X=G$();if(X.classList.contains("ytmd-open")){G0();return}X8(X);let J=$.getBoundingClientRect();X.style.top=`${J.bottom+4}px`,X.style.right=`${Math.max(8,window.innerWidth-J.right)}px`,X.classList.add("ytmd-open"),$.setAttribute("aria-expanded","true"),X.querySelector(".ytmd-menu-item")?.focus()}function G0(){let $=document.getElementById(B0);if(!$?.classList.contains("ytmd-open"))return;$.classList.remove("ytmd-open");let X=document.getElementById(v1);if(X?.setAttribute("aria-expanded","false"),$.contains(document.activeElement))X?.focus()}function Q$($){let X=$.currentTarget,J=Array.from(X.querySelectorAll(".ytmd-menu-item")),Z=J.indexOf(document.activeElement);if($.key==="Escape")$.stopPropagation(),G0();else if($.key==="ArrowDown")$.preventDefault(),J[(Z+1)%J.length]?.focus();else if($.key==="ArrowUp")$.preventDefault(),J[(Z-1+J.length)%J.length]?.focus();else if($.key==="Tab")G0()}function H$(){if(a5)return;a5=!0,document.addEventListener("mousedown",($)=>{let X=document.getElementById(B0);if(!X?.classList.contains("ytmd-open"))return;let J=$.target;if(X.contains(J)||document.getElementById(v1)?.contains(J))return;G0()}),window.addEventListener("resize",G0)}function J8($){return $.is_host?"host":$.role??"dj"}function m($){return $!=="listener"}function Z8($){return Math.floor($/2)+1}function K$($,X,J){let Z=0;return X.forEach((z,Y)=>{if(Y!==J&&$>z)Z++}),Z}var $1=null;function z8($,X){if(!$1)return;let J=[...$.querySelectorAll(X)].find((Z)=>Z.dataset.itemId===$1);if(J)J.focus(),$1=null}function Y8({list:$,rowSelector:X,handleSelector:J,onMove:Z}){let z=()=>[...$.querySelectorAll(X)],Y=()=>z().forEach((U)=>U.classList.remove("is-dragging","drop-before","drop-after")),G=null,j=(U,L)=>{let N=z().filter((D,M)=>M!==L);if(N.forEach((D)=>D.classList.remove("drop-before","drop-after")),U<N.length)N[U].classList.add("drop-before");else N[N.length-1]?.classList.add("drop-after")},Q=(U)=>{if(U.button!==0||!(U.target instanceof Element))return;let L=U.target.closest(J),N=L?.closest(X);if(!L||!N||!L.dataset.itemId)return;let D=z().indexOf(N);if(D<0)return;U.preventDefault();try{L.setPointerCapture(U.pointerId)}catch{}G={from:D,itemId:L.dataset.itemId,to:D,pointerId:U.pointerId,handle:L},N.classList.add("is-dragging")},H=(U)=>{if(!G||U.pointerId!==G.pointerId)return;let L=z().map((N)=>{let D=N.getBoundingClientRect();return D.top+D.height/2});G.to=K$(U.clientY,L,G.from),j(G.to,G.from)},F=(U)=>{if(!G||U.pointerId!==G.pointerId)return;let{from:L,to:N,itemId:D,handle:M}=G;if(G=null,M.hasPointerCapture(U.pointerId))M.releasePointerCapture(U.pointerId);if(Y(),N!==L)Z(L,N,D)},K=(U)=>{if(U.key!=="ArrowUp"&&U.key!=="ArrowDown"||!(U.target instanceof Element))return;let L=U.target.closest(J),N=L?.closest(X);if(!L||!N||!L.dataset.itemId)return;U.preventDefault();let D=z(),M=D.indexOf(N),h=U.key==="ArrowUp"?M-1:M+1;if(M<0||h<0||h>=D.length)return;$1=L.dataset.itemId,Z(M,h,L.dataset.itemId)},V=()=>{G=null,Y()};return $.addEventListener("pointerdown",Q),$.addEventListener("pointermove",H),$.addEventListener("pointerup",F),$.addEventListener("pointercancel",V),$.addEventListener("keydown",K),()=>{$.removeEventListener("pointerdown",Q),$.removeEventListener("pointermove",H),$.removeEventListener("pointerup",F),$.removeEventListener("pointercancel",V),$.removeEventListener("keydown",K)}}var G8="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var Q0="ytmd-sync-queue",u1="ytmd-sync-queue-styles",X1="data-ytmd-sync-queue",A0="data-ytmd-sync-queue-tab",W$="M8 5v14l11-7z",F$="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",q$=/^[A-Za-z0-9_-]{11}$/;function H8($){if(typeof $!=="object"||$===null)return null;let X=$.serviceEndpoint?.queueAddEndpoint;if(typeof X!=="object"||X===null)return null;let{queueTarget:J,queueInsertPosition:Z}=X;return{videoId:typeof J?.videoId==="string"&&q$.test(J.videoId)?J.videoId:null,next:Z==="INSERT_AFTER_CURRENT_VIDEO"}}function U$($){return`
  html[${X1}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${X1}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify($)};
    font-size: 14px;
  }
  html[${A0}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${Q0} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${A0}] #${Q0} { display: block; }
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
`}function V$($){w();let X=document.getElementById(u1);if(!X)X=q("style",{id:u1}),document.head.appendChild(X);let J=U$($);if(X.textContent!==J)X.textContent=J}var K8=".ytmd-sq-handle",N$=".ytmd-sq-queued";function j8($){let X=q("div",{className:"ytmd-sq-row"}),J=q("img",{className:"ytmd-sq-thumb"});J.alt="",J.loading="lazy",J.src=`https://i.ytimg.com/vi/${$.videoId}/default.jpg`;let Z=q("div",{className:"ytmd-sq-text"});if(Z.append(q("span",{className:"ytmd-sq-title",text:$.title}),q("span",{className:"ytmd-sq-sub",text:$.sub})),$.handle)X.appendChild($.handle);if(X.append(J,Z),$.actions.length){let z=q("div",{className:"ytmd-sq-actions"});z.append(...$.actions),X.appendChild(z)}return X}function Q8($,X,J){let Z=E({label:$,iconPath:X,muted:!0});return Z.addEventListener("click",(z)=>{z.stopPropagation(),J()}),Z}function W8($,X,J){let Z=W(),z=[];if(X.nowPlaying)z.push(q("div",{className:"ytmd-sq-heading",text:Z.syncQueueNowPlaying})),z.push(j8({...X.nowPlaying,sub:X.nowPlaying.artist,actions:[]}));if(z.push(q("div",{className:"ytmd-sq-heading",text:Z.syncQueueTitle})),X.queue.length===0)z.push(q("p",{className:"ytmd-sq-hint",text:m(X.myRole)?Z.syncQueueEmpty:Z.syncQueueListenerHint}));let Y=X.myRole==="host"||X.myRole==="moderator";for(let G of X.queue){let j=[];if(m(X.myRole))j.push(Q8(Z.syncQueuePlayNow(G.title),W$,()=>J.play(G.id)));if(Y||G.added_by_id===X.myId)j.push(Q8(Z.syncQueueRemove(G.title),F$,()=>J.remove(G.id)));let Q;if(m(X.myRole)&&X.queue.length>1)Q=E({label:Z.syncQueueDrag(G.title),iconPath:G8,muted:!0}),Q.classList.add("ytmd-sq-handle"),Q.dataset.itemId=G.id;let H=Z.syncQueueFrom(G.added_by),F=j8({videoId:G.video_id,title:G.title,sub:G.artist?`${G.artist} · ${H}`:H,actions:j,handle:Q});F.classList.add("ytmd-sq-queued"),z.push(F)}$.replaceChildren(...z),z8($,K8)}var j0=null;function J1(){let $=document.documentElement;if(!j0){$.removeAttribute(A0);return}let X=document.querySelector("ytmusic-player-page #side-panel"),J=document.getElementById(Q0);if(X&&J?.parentElement!==X){if(!J)J=q("div",{id:Q0}),Y8({list:J,rowSelector:N$,handleSelector:K8,onMove:(z,Y,G)=>j0?.actions.move(G,Y)});J.setAttribute("role","region"),J.setAttribute("aria-label",W().syncQueueTitle),W8(J,j0.model,j0.actions),X.insertBefore(J,X.querySelector(":scope > #tab-renderer"))}let Z=document.querySelector("ytmusic-player-page tp-yt-paper-tab");$.toggleAttribute(A0,!!J?.isConnected&&Z?.getAttribute("aria-selected")==="true")}function F8($,X){j0={model:$,actions:X},V$(W().syncQueueTab),document.documentElement.setAttribute(X1,"");let J=document.getElementById(Q0);if(J)W8(J,$,X);J1()}function m1(){j0=null,document.documentElement.removeAttribute(X1),document.documentElement.removeAttribute(A0),document.getElementById(Q0)?.remove(),document.getElementById(u1)?.remove()}function H0($){if($.is_host)return"host";let X=$.members.find((J)=>J.id===$.current_user_id);return X?J8(X):"dj"}function L$($,X,J){let Z=new Set($.map((Y)=>Y.id)),z=new Set(X.map((Y)=>Y.id));return{joined:X.filter((Y)=>Y.id!==J&&!Z.has(Y.id)).map((Y)=>Y.nickname),left:$.filter((Y)=>Y.id!==J&&!z.has(Y.id)).map((Y)=>Y.nickname)}}var a=/^[A-Za-z0-9_-]{11}$/,C$=2,D$=0.25,M$=0.05,O$=3,q8=0.1,B$=0.5,A$=1,P$=1000,_$=1,U8=5000,b$=4000,V8=15000,R$=3,f$=4000,N8=1,w$=1e4,E$=5,h$=1e4,T$=1.2;function L8($,X){return Number.isFinite(X)&&X>N8?Math.min($,X-N8):$}function k$($,X,J){let Z={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(a.test($.video_id)&&X.videoId!==$.video_id)return Z.navigateTo=$.video_id,Z;if($.is_playing===X.paused)Z.setPlaying=$.is_playing;if(!$.is_playing){if(Math.abs(X.currentTime-$.current_time_secs)>B$)Z.seekTo=L8($.current_time_secs,X.duration);return Z}let z=$.current_time_secs+Math.min(A$,Math.max(0,J)),Y=z-X.currentTime;if(Math.abs(Y)>C$)Z.seekTo=L8(z,X.duration);else if(Math.abs(Y)>(X.correcting?M$:D$))Z.playbackRate=1+Math.max(-q8,Math.min(q8,Y/O$));return Z}class C8{windowSize;samples=[];constructor($=30){this.windowSize=$}transitSecs($,X){let J=X-$;if(this.samples.push(J),this.samples.length>this.windowSize)this.samples.shift();return(J-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function S$($,X){return X!==null&&$<X&&X-$<h$}function D8($,X){switch($){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:X};default:return null}}var I$=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function M8(){return new URLSearchParams(window.location.search).get("v")}function Z1($){let X=document.getElementById("movie_player"),J=X?.getVideoData?.()?.video_id,Z=X?.getCurrentTime?.();if(J&&a.test(J)&&typeof Z==="number"&&Number.isFinite(Z))return{videoId:J,currentTime:Z};return{videoId:M8(),currentTime:$?$.currentTime:0}}function c1(){let $=document.getElementById("movie_player");return!!$&&($.classList.contains("ad-showing")||$.classList.contains("ad-interrupting"))}function P0($){let X=document.querySelector("ytmusic-app");if(!X){window.location.href=`https://music.youtube.com/watch?v=${$}`;return}X.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:$}}}}))}class O8{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor($=B){this.notify=$}lastBroadcast=null;pendingNav=null;transit=new C8;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;finished=null;rateCorrection=null;setRoomState($,X,J=!0){let Z=$!==this.inRoom||X!==this.isHost;if(this.inRoom=$,this.isHost=X,this.canControl=J,J5(this.isGuest()),!Z)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback($,X,J=Date.now()){if(!this.isGuest()||c1())return;if(S$($.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=$.timestamp_ms;let Z=this.transit.transitSecs($.timestamp_ms,J);if(a.test($.video_id))this.hostVideoId=$.video_id;let z=this.requestedVideo;if(z){if($.video_id!==z.videoId&&J-z.atMs<b$)return;this.requestedVideo=null}let Y=Z1(X);if(this.waitingForHostsNext($,Y.videoId,X,J)){this.endRateCorrection(),C.pause();return}let G={videoId:Y.videoId,paused:X?X.paused:!0,currentTime:Y.currentTime,duration:X?X.duration:NaN,correcting:this.rateCorrection!==null},j=k$($,G,Z);if(j.navigateTo){this.endRateCorrection();let Q=this.pendingNav;if(Q&&Q.videoId===j.navigateTo&&J-Q.atMs<U8)return;let H=Q&&Q.videoId===j.navigateTo?Q.attempts+1:1;if(this.pendingNav={videoId:j.navigateTo,atMs:J,attempts:H},this.rememberOwnNav(j.navigateTo,J),C.pause(),H>1)window.location.href=`https://music.youtube.com/watch?v=${j.navigateTo}`;else P0(j.navigateTo);return}if(this.pendingNav=null,!X)return;if(j.setPlaying===!0)C.play();else if(j.setPlaying===!1)C.pause();if(j.seekTo!==null)this.endRateCorrection(),C.seekTo(j.seekTo);else this.setCatchUpRate(X,j.playbackRate)}waitingForHostsNext($,X,J,Z){let z=this.finished;return!!z&&$.video_id===z.videoId&&Z-z.atMs<w$&&z.duration-$.current_time_secs<E$&&(X!==z.videoId||!!J?.ended)}rememberOwnNav($,X){for(let[J,Z]of this.ownNavs)if(X-Z>V8)this.ownNavs.delete(J);this.ownNavs.set($,X)}setCatchUpRate($,X){if(X===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==$)this.endRateCorrection(),this.rateCorrection={video:$,rate:$.playbackRate,preservesPitch:$.preservesPitch};$.preservesPitch=!0,$.playbackRate=X}endRateCorrection(){let $=this.rateCorrection;if(!$)return;this.rateCorrection=null,$.video.playbackRate=$.rate,$.video.preservesPitch=$.preservesPitch}noteLocalTick($,X=Date.now()){if(!this.isGuest()||!$)return;if(Number.isFinite($.duration)&&$.duration>0&&$.duration-$.currentTime<R$){this.nearEndAtMs=X;let{videoId:J}=Z1($);if(J)this.finished={videoId:J,duration:$.duration,atMs:X}}}handleLocalTrackChange($,X=Date.now()){if(!this.isGuest()||!this.canControl||!$||!a.test($))return null;if(this.hostVideoId===null||$===this.hostVideoId)return null;let J=this.ownNavs.get($);if(J!==void 0&&X-J<V8)return null;if(X-this.nearEndAtMs<f$)return null;if(this.requestedVideo?.videoId===$)return null;return this.requestedVideo={videoId:$,atMs:X},{kind:"play_video",video_id:$}}requestControl($,X){if(!this.canControl){if($.kind!=="next"){this.notify(W().syncListenerOnly);return}X("vote_sync_skip").then(()=>this.notify(W().syncVotedSkip)).catch((J)=>{console.error("[YTMD Room Sync] vote failed:",J),this.notify(W().actionFailed)});return}X("send_sync_control",{action:$}).catch((J)=>{console.error("[YTMD Room Sync] control request failed:",J),this.notify(W().actionFailed)})}applyRemoteControl($){if(!this.inRoom||!this.isHost)return;let{from:X,action:J,source:Z}=$,z=Z?.kind==="vote"?W().syncVoteSkipped:Z?.kind==="queue"?W().syncFromQueue(Z.title,X):null;switch(J.kind){case"next":C.next(),this.notify(z??W().syncGuestNext(X));break;case"previous":C.previous(),this.notify(z??W().syncGuestPrevious(X));break;case"set_playing":{let Y=C.getVideo();if(!Y||Y.paused!==J.playing)return;if(J.playing)C.play();else C.pause();this.notify(z??(J.playing?W().syncGuestResumed(X):W().syncGuestPaused(X)));break}case"play_video":if(!a.test(J.video_id)||J.video_id===M8())return;P0(J.video_id),this.notify(z??W().syncGuestPicked(X));break}}advanceQueue($,X,J){if(!X||c1())return;let Z=X.duration-X.currentTime;if(!Number.isFinite(Z)||Z>T$&&!X.ended)return;this.playNextFromQueue($,J,X,!1)}playNextFromQueue($,X,J=C.getVideo(),Z=!0,z=Date.now()){if(!this.inRoom||!this.isHost||$===0)return!1;let{videoId:Y}=Z1(J),G=this.queueAdvance;if(G&&G.from===Y&&z-G.atMs<U8)return!0;this.queueAdvance={from:Y,atMs:z};let j=()=>{if(Z)C.nextInYtm()};return X("sync_queue_take_next").then((Q)=>{let H=Q;if(!H||!a.test(H.video_id)){j();return}C.pause(),P0(H.video_id),this.notify(W().syncFromQueue(H.title,H.added_by))}).catch((Q)=>{console.error("[YTMD Room Sync] playing from the shared queue failed:",Q),j()}),!0}broadcastLocalState($,X,J,Z=!1){if(!this.inRoom||!this.isHost||!$||!X||c1())return;if(X.ended)return;let{videoId:z,currentTime:Y}=Z1(X);if(!z)return;let G=Date.now(),j=this.lastBroadcast,Q=j?j.position+(G-j.atMs)/1000*j.rate:0,H=!!j&&j.playing&&!X.paused&&Math.abs(Y-Q)>_$,F=!!j&&j.videoId!==z;if(!Z&&!H&&!F&&j&&G-j.atMs<P$)return;this.lastBroadcast={atMs:G,videoId:z,position:Y,rate:X.playbackRate,playing:!X.paused},J("broadcast_sync_state",{playback:{video_id:z,title:$.title,artist:$.artist,current_time_secs:Y,is_playing:!X.paused,timestamp_ms:G}}).catch((K)=>console.error("[YTMD Room Sync] broadcast failed:",K))}}var k=null,i=null,z1=null,x=null,s1=null,g$=1000;function B8(){let $=x,X=i;if(!$||!X){m1();return}let J=s1,Z=(z)=>(Y)=>{X(z,{itemId:Y}).catch((G)=>{console.error(`[YTMD Room Sync] ${z} failed:`,G),B(W().actionFailed)})};F8({queue:$.queue??[],nowPlaying:J?.videoId&&a.test(J.videoId)?{videoId:J.videoId,title:J.title,artist:J.artist}:null,myId:$.current_user_id,myRole:H0($)},{play:Z("sync_queue_play"),remove:Z("sync_queue_remove"),move:(z,Y)=>{X("sync_queue_move",{itemId:z,toIndex:Y}).catch((G)=>{console.error("[YTMD Room Sync] sync_queue_move failed:",G),B(W().actionFailed)})}})}function x$(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function y$($,X){if(!x||!m(H0(x))){B(W().syncQueueListenerNo);return}if(!$.videoId){B(W().syncQueueSongsOnly);return}X("sync_queue_add",{input:$.videoId,next:$.next}).then(()=>B($.next?W().syncQueuedNext:W().syncQueued)).catch((J)=>{console.error("[YTMD Room Sync] adding to the shared queue failed:",J),B(W().actionFailed)})}function A8($){let X=k;if(!X||!i||!X.isGuest())return!1;let J=C.getVideo(),Z=D8($,J?J.paused:!0);if(!Z)return!1;return X.requestControl(Z,i),!0}function P8($){let X=k;if(!X||!i||!X.isGuest())return!1;return X.requestControl({kind:"play_video",video_id:$},i),!0}function d1($,X,J="left"){let Z=x;if(x=$,p1($?{roomCode:$.room_code,listeners:$.members.length,isHost:$.is_host}:null),B8(),!X)return;if(!$){if(!Z)return;B(J==="kicked"?W().syncKicked:J==="lost"?W().syncLost:W().syncRoomClosed);return}if(!Z||Z.room_code!==$.room_code){if(!$.is_host)B(W().syncConnected);return}if($.reconnecting){if(!Z.reconnecting)B(W().syncReconnecting);return}let z=(K)=>K.members.find((V)=>V.is_host)?.id;if(z(Z)!==z($)){let K=$.members.find((V)=>V.is_host);if($.is_host)B(W().syncYouHost);else if(K)B(W().syncNewHost(K.nickname));return}if(Z.reconnecting)return;let{joined:Y,left:G}=L$(Z.members,$.members,$.current_user_id),j=[...Y.map(W().syncJoined),...G.map(W().syncLeft)],Q=$.skip_votes??[],H=Q.filter((K)=>K!==$.current_user_id&&!(Z.skip_votes??[]).includes(K));for(let K of H){let V=$.members.find((U)=>U.id===K)?.nickname;if(V)j.push(W().syncVoteProgress(V,Q.length,Z8($.members.length)))}let F=H0($);if(F!==H0(Z))j.push(F==="moderator"?W().syncRoleModerator:F==="listener"?W().syncRoleListener:W().syncRoleDj);if(j.length>0)B(j.join(" · "))}var _8={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit($){let X=new O8;k=X,i=$.invoke;let J=[];if(window.__TAURI__?.event)J.push(window.__TAURI__.event.listen("sync-room-updated",(Y)=>{X.setRoomState(!0,Y.payload.is_host,m(H0(Y.payload))),d1(Y.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",(Y)=>{X.setRoomState(!1,!1),d1(null,!0,Y.payload?.reason??"left")}),window.__TAURI__.event.listen("sync-playback-remote",(Y)=>{X.handleRemotePlayback(Y.payload,$.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(Y)=>{X.applyRemoteControl(Y.payload)}),window.__TAURI__.event.listen("sync-reaction",(Y)=>{O5(Y.payload.emoji,Y.payload.from)}));let Z=(Y)=>{if(!(Y.target instanceof Element))return;let G=Y.target;if(G.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(J1,0);if(X.isInRoom()){let F=G.closest("ytmusic-menu-service-item-renderer"),K=F?H8(F.data):null;if(K){Y.preventDefault(),Y.stopImmediatePropagation(),x$(),y$(K,$.invoke);return}}if(!Y.isTrusted)return;if(X.isRoomHost()&&G.closest("ytmusic-player-bar .next-button")&&X.playNextFromQueue(x?.queue?.length??0,$.invoke)){Y.preventDefault(),Y.stopImmediatePropagation();return}if(!X.isGuest())return;let j=I$.find(([F])=>G.closest(F));if(!j)return;let Q=$.getVideoElement(),H=D8(j[1],Q?Q.paused:!0);if(!H)return;Y.preventDefault(),Y.stopImmediatePropagation(),X.requestControl(H,$.invoke)};window.addEventListener("click",Z,!0);let z=setInterval(J1,g$);L1(()=>X.playNextFromQueue(x?.queue?.length??0,$.invoke)),$.invoke("get_sync_room_state").then((Y)=>{if(k!==X||!Y||typeof Y!=="object")return;let G=Y;if(X.setRoomState(!0,G.is_host,m(H0(G))),d1(G,!1),!G.is_host&&G.playback_state)X.handleRemotePlayback(G.playback_state,$.getVideoElement())}).catch((Y)=>console.error("[YTMD Room Sync] failed to restore room state:",Y)),z1=()=>{J.forEach((Y)=>Y.then((G)=>G())),window.removeEventListener("click",Z,!0),clearInterval(z),L1(null),X.setRoomState(!1,!1),k=null,i=null,x=null,s1=null,p1(null),m1()}},onTrackChange($,X){let J=k;if(!J)return;s1=$,B8(),J.broadcastLocalState($,X.getVideoElement(),X.invoke,!0);let Z=J.handleLocalTrackChange($.videoId);if(Z)J.requestControl(Z,X.invoke)},onPlaybackChange($,X){k?.broadcastLocalState(X.track,X.getVideoElement(),X.invoke,!0)},onTick($,X){let J=X.getVideoElement();k?.broadcastLocalState(X.track,J,X.invoke),k?.noteLocalTick(J),k?.advanceQueue(x?.queue?.length??0,J,X.invoke)},onDestroy(){if(z1)z1(),z1=null}};var Y1=null,v$=($,X)=>X&&$!==!1,b8={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit($){let X=null,J=!1,Z=null,z=(V)=>{if(J===V)return;J=V,$.invoke("set_inhibit_sleep",{inhibit:V}).catch((U)=>{J=!V,console.error("[YTMD Power] set_inhibit_sleep failed:",U)})},Y=async()=>{if(!("wakeLock"in navigator)||X!==null)return;try{X=await navigator.wakeLock.request("screen"),X.addEventListener("release",()=>{X=null})}catch{}},G=()=>{X?.release().catch(()=>{}),X=null},j=()=>{let V=$.getVideoElement(),U=!!V&&!V.paused&&!V.ended,L=v$($.config.inhibit_sleep,U);if(z(L),L)Y();else G()},Q=(V)=>{for(let U of["play","playing","pause","ended"])V.addEventListener(U,j);Z=V},H=(V)=>{for(let U of["play","playing","pause","ended"])V.removeEventListener(U,j)},F=$.getVideoElement();if(F)Q(F);j();let K=window.setInterval(()=>{let V=$.getVideoElement();if(V&&V!==Z){if(Z)H(Z);Q(V),j()}},1000);Y1=()=>{if(clearInterval(K),Z)H(Z);Z=null,G(),z(!1)}},onDestroy(){if(Y1)Y1(),Y1=null}};var f8=($)=>typeof $==="object"&&$!==null&&!Array.isArray($),P=($,...X)=>X.reduce((J,Z)=>J==null?void 0:J[Z],$),j1=/^[A-Za-z0-9_-]{11}$/;function K0($){let X=P($,"runs");if(Array.isArray(X))return X.map((Z)=>typeof P(Z,"text")==="string"?P(Z,"text"):"").join("");let J=P($,"simpleText");return typeof J==="string"?J:""}function l1($){if(!Array.isArray($)||$.length===0)return null;let X=P($[$.length-1],"url");return typeof X==="string"?X:null}function R8($,X){return K0(P($,"flexColumns",X,"musicResponsiveListItemFlexColumnRenderer","text"))}function p$($){let X=P($,"playlistItemData","videoId")??P($,"overlay","musicItemThumbnailOverlayRenderer","content","musicPlayButtonRenderer","playNavigationEndpoint","watchEndpoint","videoId");if(typeof X!=="string"||!j1.test(X))return null;return{video_id:X,title:R8($,0),subtitle:R8($,1),thumbnail:l1(P($,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function u$($){let X=P($,"title","runs",0,"navigationEndpoint","watchEndpoint","videoId");if(typeof X!=="string"||!j1.test(X))return null;return{video_id:X,title:K0(P($,"title")),subtitle:K0(P($,"subtitle")),thumbnail:l1(P($,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function n1($,X=20){let J=[],Z=new Set,z=(Y,G)=>{if(J.length>=X||G>40)return;if(Array.isArray(Y)){for(let j of Y)z(j,G+1);return}if(!f8(Y))return;for(let[j,Q]of Object.entries(Y)){let H=null;if(j==="musicResponsiveListItemRenderer")H=p$(Q);else if(j==="musicCardShelfRenderer")H=u$(Q);if(H&&!Z.has(H.video_id)){if(Z.add(H.video_id),J.push(H),J.length>=X)return}z(Q,G+1)}};return z($,0),J}function G1($){let X=P($,"playlistPanelVideoRenderer")??P($,"playlistPanelVideoWrapperRenderer","primaryRenderer","playlistPanelVideoRenderer");return f8(X)?X:null}function w8($){let X=[];return $.forEach((J,Z)=>{let z=G1(J),Y=P(z,"videoId");if(!z||typeof Y!=="string")return;X.push({id:`${Z}:${Y}`,video_id:Y,title:K0(P(z,"title")),artist:K0(P(z,"shortBylineText"))||K0(P(z,"longBylineText")),thumbnail:l1(P(z,"thumbnail","thumbnails")),current:P(z,"selected")===!0})}),X}function E8($,X){let J=X.indexOf(":");if(J<=0)return-1;let Z=Number(X.slice(0,J)),z=X.slice(J+1),Y=Number.isInteger(Z)?G1($[Z]):null;if(Y&&P(Y,"videoId")===z)return Z;return $.findIndex((G)=>P(G1(G),"videoId")===z)}function h8($,X){if(!X)return $.length;let J=$.findIndex((Z)=>P(G1(Z),"selected")===!0);return J>=0?J+1:$.length}function T8($,X,J=15000){if(!$)return!0;let{position_secs:Z,sampled_at_ms:z,...Y}=$,{position_secs:G,sampled_at_ms:j,...Q}=X;if(JSON.stringify(Y)!==JSON.stringify(Q))return!0;if(j-z>=J)return!0;let H=$.playing?Z+(j-z)/1000:Z;return Math.abs(G-H)>1.5}var m$="EgWKAQIIAWoMEA4QChADEAQQCRAF",c$=1000,d$=2000;function a1(){return document.querySelector("#queue")}function q1(){let $=a1()?.queue?.store?.store?.getState().queue?.items;return Array.isArray($)?$:[]}function Q1($,X){let J=a1();if(!J?.dispatch)throw Error("remote.error.noQueue");J.dispatch({type:$,payload:X})}function S8(){let $=document.querySelector("ytmusic-app")?.networkManager;if(!$||typeof $.fetch!=="function")throw Error("remote.error.unsupported");return $}async function s$($){let X=S8(),J=n1(await X.fetch("/search",{query:$,params:m$}));if(J.length===0)J=n1(await X.fetch("/search",{query:$}));return J}async function l$($,X){let J=a1()?.queue?.store?.store;if(!J)throw Error("remote.error.noQueue");let Z=J.getState().queue??{},Y=(await S8().fetch("/music/get_queue",{queueContextParams:Z.queueContextParams,queueInsertPosition:X?"INSERT_AFTER_CURRENT_VIDEO":"INSERT_AT_END",videoIds:[$]}))?.queueDatas,G=Array.isArray(Y)?Y.map((Q)=>Q&&typeof Q==="object"&&("content"in Q)?Q.content:null).filter(Boolean):[];if(G.length===0)throw Error("remote.error.unsupported");let j=q1();Q1("ADD_ITEMS",{nextQueueItemId:J.getState().queue?.nextQueueItemId,index:h8(j,X),items:G,shuffleEnabled:!1,shouldAssignIds:!0})}function r1($){let X=E8(q1(),$);if(X<0)throw Error("remote.error.gone");return X}function n$(){let $=getComputedStyle(document.documentElement),X=$.getPropertyValue("--ytmd-accent-primary").trim(),J=$.getPropertyValue("--ytmd-accent-secondary").trim(),Z=$.getPropertyValue("--ytmd-accent").trim();return X&&J&&Z?{primary:X,secondary:J,accent:Z}:null}function r$(){let $=C.getVideo(),J=document.getElementById("movie_player")?.getCurrentTime?.();return{playing:!!$&&!$.paused&&!$.ended,position_secs:typeof J==="number"&&Number.isFinite(J)?J:$?.currentTime??0,sampled_at_ms:Date.now(),volume:$?q0($)/100:1,muted:$?w0($):!1,like:C.getLikeStatus(),shuffle:C.isShuffleOn(),repeat:C.getRepeatMode(),accent:n$()}}async function a$($,X){switch(X.kind){case"command":if(X.command==="shuffle")C.toggleShuffle();else if(X.command==="repeat")C.cycleRepeat();else $.sendPlayerCommand(X.command);return null;case"seek":return C.seekTo(X.position_secs),null;case"volume":return C.setVolume(X.volume),null;case"play":if(!j1.test(X.video_id))throw Error("remote.error.invalid");if(!P8(X.video_id))P0(X.video_id);return null;case"search":return s$(X.query);case"enqueue":return await l$(X.video_id,X.next),null;case"queue_jump":return Q1("SET_INDEX",r1(X.item_id)),null;case"queue_remove":return Q1("REMOVE_ITEM",r1(X.item_id)),null;case"queue_move":{let J=r1(X.item_id),Z=Math.max(0,Math.min(X.to_index,q1().length-1));return Q1("MOVE_ITEM",{fromIndex:J,toIndex:Z}),null}}}var H1=[],K1=[],W1=null,F1="";function I8(){K1.forEach(($)=>clearInterval($)),K1=[],W1=null,F1=""}function i$($){if(K1.length>0)return;let X=()=>{let Z=r$();if(!T8(W1,Z))return;W1=Z,$.invoke("remote_publish",{kind:"state",data:Z}).catch(()=>{return})},J=()=>{let Z=w8(q1()),z=JSON.stringify(Z);if(z===F1)return;F1=z,$.invoke("remote_publish",{kind:"queue",data:Z}).catch(()=>{return})};X(),J(),K1.push(window.setInterval(X,c$),window.setInterval(J,d$))}function k8($,X){if(X>0)i$($);else I8()}function g8($){let X=window.__TAURI__?.event;if(!X)return;X.listen("remote-action",({payload:J})=>{if(!J?.action)return;a$($,J.action).then((Z)=>{if(J.id!=null)$.invoke("remote_reply",{id:J.id,ok:!0,data:Z??null}).catch(()=>{return});W1=null,F1=""},(Z)=>{let z=Z instanceof Error?Z.message:String(Z);if(console.warn("[YTMD Remote] action failed:",J.action.kind,z),J.id!=null)$.invoke("remote_reply",{id:J.id,ok:!1,error:z}).catch(()=>{return})})}).then((J)=>H1.push(J)),X.listen("remote-clients",({payload:J})=>k8($,J)).then((J)=>H1.push(J)),$.invoke("remote_clients").then((J)=>k8($,typeof J==="number"?J:0)).catch(()=>{return})}function x8(){H1.forEach(($)=>$()),H1=[],I8()}var y8={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit($){window.__ytmd_show_remote_qr=()=>i1($),g8($),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){x8(),window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},o$=`
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
`;function t$(){if(document.getElementById("ytmd-qr-styles"))return;let $=document.createElement("style");$.id="ytmd-qr-styles",$.textContent=o$,document.head.appendChild($)}async function i1($){t$();let X=q("p",{text:W().remoteBody,style:"margin: 0;"}),J=q("div",{className:"ytmd-qr-frame",text:W().remoteLoading}),Z=q("div",{className:"ytmd-qr-url"}),z=I0({id:"ytmd-remote-modal",title:W().remoteTitle,body:[X,J,Z],actions:[{label:W().close}]});try{let Y=await $.invoke("get_remote_info");if(!J.isConnected)return;if(Y?.qr_svg){let G=q("img");G.src=`data:image/svg+xml;utf8,${encodeURIComponent(Y.qr_svg)}`,G.alt=W().remoteTitle,J.replaceChildren(G)}else J.textContent=W().remoteUnavailable;if(Y?.url)Z.textContent=Y.url}catch(Y){if(console.error("[YTMD Remote] Error fetching remote info:",Y),J.isConnected)J.textContent=W().remoteUnavailable}return z}var c="ytmd-window-controls",_0={minimize:"M5 11.5h14v1H5z",maximize:"M5 5h14v14H5V5zm1 1v12h12V6H6z",restore:"M8 5h11v11h-3v3H5V8h3V5zm1 1v2h7v7h2V6H9zM6 9v9h9V9H6z",close:"M6.7 6 12 11.3 17.3 6l.7.7-5.3 5.3 5.3 5.3-.7.7-5.3-5.3L6.7 18l-.7-.7 5.3-5.3L6 6.7z"},e$=132,$7=`
  html:has(#${c}) ytmusic-nav-bar #right-content {
    right: 0 !important;
    padding-right: 0 !important;
    margin-right: ${e$+8}px !important;
  }
  #${c} {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 6;
    height: var(--ytmusic-nav-bar-height, 64px);
    display: flex;
    align-items: center;
    gap: 4px;
    padding-right: 4px;
  }
  html:has(ytmusic-player-page[player-fullscreened]) #${c},
  html:has(:fullscreen) #${c} {
    display: none;
  }
  #${c} .ytmd-window-close:hover {
    background: #c42b1c;
    color: #fff;
  }
`,X7=["a","button","input","textarea","select",'[role="button"]','[role="tab"]',"tp-yt-paper-icon-button","yt-icon-button","ytmusic-search-box","ytmusic-settings-button","ytmusic-cast-button","ytmusic-chip-cloud-renderer",`#${c}`,"#ytmd-nav-slot"].join(", ");function U1(){return window.__TAURI__?.window?.getCurrentWindow()??null}function b0($){let X=U1();if(X)$(X).catch((J)=>console.error("[YTMD] Window action failed:",J))}function J7($){if(!($ instanceof Element))return!1;if(!$.closest("ytmusic-nav-bar, #nav-bar-background"))return!1;return $.closest(X7)===null}var o=null,v8=!1;async function p8(){let $=U1();if(!$||!o)return;let X=await $.isMaximized().catch(()=>!1),J=X?W().windowRestore:W().windowMaximize;S0(o,X?_0.restore:_0.maximize),o.setAttribute("aria-label",J),o.dataset.ytmdTooltip=J}function Z7(){if(v8)return;v8=!0,document.addEventListener("mousedown",($)=>{if($.button!==0||!J7($.target))return;if($.preventDefault(),$.detail===2)b0((X)=>X.toggleMaximize());else b0((X)=>X.startDragging())},!0),U1()?.onResized(()=>void p8()).catch(()=>{return})}function u8(){if(!U1())return;if(Z7(),document.getElementById(c)?.isConnected)return;if(!document.querySelector("ytmusic-nav-bar")||!document.body)return;if(w(),!document.getElementById("ytmd-window-controls-styles")){let Z=document.createElement("style");Z.id="ytmd-window-controls-styles",Z.textContent=$7,document.head.appendChild(Z)}let $=q("div",{id:c}),X=E({label:W().windowMinimize,iconPath:_0.minimize});X.addEventListener("click",()=>b0((Z)=>Z.minimize())),o=E({label:W().windowMaximize,iconPath:_0.maximize}),o.addEventListener("click",()=>b0((Z)=>Z.toggleMaximize()));let J=E({label:W().windowClose,iconPath:_0.close});J.classList.add("ytmd-window-close"),J.addEventListener("click",()=>b0((Z)=>Z.close())),$.append(X,o,J),document.body.appendChild($),p8()}var d8=null,R0=null,W0=($)=>{s($).catch((X)=>{console.error(`[YTMD] ${$} failed:`,X),B(W().actionFailed)})};function z7(){t5({onSyncChipClick:()=>W0("toggle_sync_window"),items:[{id:"settings",iconPath:b.tune,label:W().menuSettings,hint:"Ctrl+,",onSelect:()=>W0("toggle_settings_window")},{id:"local",iconPath:b.folderMusic,label:W().menuLocal,onSelect:()=>W0("toggle_local_library_window")},{id:"sync",iconPath:b.group,label:W().menuSync,onSelect:()=>W0("toggle_sync_window")},{id:"remote",iconPath:b.phone,label:W().menuRemote,onSelect:()=>{if(R0)i1(R0)}},{id:"mini",iconPath:b.miniPlayer,label:W().menuMiniPlayer,onSelect:()=>W0("toggle_mini_player")},{id:"download",iconPath:b.download,label:W().menuDownload,dividerBefore:!0,onSelect:()=>{if(R0)y1(R0,d8)}}]})}var Y7={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function m8($){let X={};for(let[J,[Z,z]]of Object.entries(Y7)){let Y=$[Z];X[J]=typeof Y==="boolean"?Y:z}return X}async function c8(){console.log("[YTMD] Initializing desktop integration bridge...");let $={};z7();let X=()=>{e5(),u8()};X();let J=setInterval(X,1000);window.addEventListener("pagehide",()=>clearInterval(J));try{let K=await s("get_config");if(K&&typeof K==="object")Object.assign($,K)}catch(K){console.error("[YTMD] Failed to load config, using defaults:",K)}let Z={track:null,config:$,invoke:s,sendPlayerCommand:(K)=>{H(K)},getVideoElement:()=>C.getVideo()};R0=Z;let z=new D1(Z);z.register(U5),z.register(V5),z.register(f5),z.register(I5),z.register(g5),z.register(x5),z.register(y5),z.register(u5),z.register(d5),z.register(s5),z.register(l5),z.register(n5),z.register(_8),z.register(b8),z.register(y8);try{await z.initAll(m8($))}catch(K){console.error("[YTMD] Registry init error:",K)}let Y=new V1,G=0,j=Date.now();async function Q(K,V,U){try{await s("update_track_info",{track:{title:K.title,artist:K.artist,album:K.album||null,cover_url:K.coverUrl||null,duration_secs:Math.round(K.durationSecs||0),current_time_secs:Math.round(V),is_playing:U,video_id:K.videoId||null,playlist_id:K.playlistId||null,sampled_at_ms:Date.now()}})}catch(L){console.error("[YTMD] Failed to sync track info to backend:",L)}}Y.onTrackChange(async(K)=>{d8=K,G=K.currentTimeSecs||0,j=Date.now(),z.handleTrackChange(K),await Q(K,K.currentTimeSecs||0,K.isPlaying)}),Y.onPlaybackChange(async(K)=>{z.handlePlaybackChange(K);let V=Y.getCurrentTrack();if(V)V.isPlaying=K,G=V.currentTimeSecs||0,j=Date.now(),await Q(V,V.currentTimeSecs||0,K)}),Y.onTick((K)=>{z.handleTick(K);let V=Y.getCurrentTrack();if(!V||!V.isPlaying)return;let U=Date.now(),L=(U-j)/1000,N=G+L;if(Math.abs(K-N)>2||L>=15)G=K,j=U,V.currentTimeSecs=Math.round(K),Q(V,K,!0)});function H(K){if(A8(K))return;switch(K){case"play":C.play();break;case"pause":C.pause();break;case"play_pause":C.playPause();break;case"next":C.next();break;case"previous":C.previous();break;case"like":C.toggleLike();break;case"dislike":C.toggleDislike();break;case"mute":C.toggleMute();break}}let F=(K,V)=>{let U=window.__TAURI__;if(U?.event?.listen)U.event.listen(K,(L)=>V(L.payload))};F("player-command",(K)=>H(K)),F("tray-command",(K)=>H(K)),F("mpris-command",(K)=>H(K)),F("global-shortcut-event",(K)=>H(K)),F("player-seek",(K)=>C.seekTo(K)),F("mpris-command-seek",(K)=>C.seekTo(K)),F("player-volume",(K)=>C.setVolume(K)),F("config-updated",(K)=>{if(!K||typeof K!=="object")return;Object.assign($,K);let V=m8($);for(let[U,L]of Object.entries(V))if(L)z.enable(U).catch((N)=>console.error(`[YTMD] Failed to enable plugin ${U}:`,N));else z.disable(U).catch((N)=>console.error(`[YTMD] Failed to disable plugin ${U}:`,N))}),window.addEventListener("keydown",(K)=>{if(K.ctrlKey&&K.key===","||K.key==="F2")K.preventDefault(),W0("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var G7=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(G7)if(j5(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>c8());else c8();})();
