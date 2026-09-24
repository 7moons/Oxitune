(()=>{function c1($){let X=$.trim().split(":").map((J)=>parseInt(J,10));if(X.some((J)=>isNaN(J)))return 0;if(X.length===2)return X[0]*60+X[1];else if(X.length===3)return X[0]*3600+X[1]*60+X[2];return 0}var E8=1500;function h8($,X){let J=new URLSearchParams($);if(!X||J.get("v")!==X)return;return J.get("list")||void 0}var d1=($)=>$.trim().replace(/\s+/g," ").toLowerCase();function k8($,X){if(!$?.trim()||!X?.trim())return!0;return d1($)===d1(X)}function S8($,X){if(!$)return"new";if($.videoId&&X.videoId){if($.videoId!==X.videoId)return"new"}else if($.title!==X.title||$.artist!==X.artist)return"new";return $.title!==X.title||$.artist!==X.artist||!$.videoId&&!!X.videoId||!$.coverUrl&&!!X.coverUrl||!$.album&&!!X.album||X.durationSecs>0&&Math.abs(X.durationSecs-$.durationSecs)>1?"metadata":null}var I8=400;function g8($,X){return $-X>=I8}class G1{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick($){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((X)=>X($))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange($){this.onTrackChangeCallbacks.push($)}onPlaybackChange($){this.onPlaybackChangeCallbacks.push($)}onTick($){this.onTickCallbacks.push($)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let J=navigator.mediaSession,Z=J.metadata;try{Object.defineProperty(J,"metadata",{get:()=>Z,set:(z)=>{Z=z,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(z){}}this.syncVideoListeners();let $=!1,X=()=>{if($)return;$=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),$=!1})};this.mutationObserver=new MutationObserver(X),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let J=document.querySelector("video");if(J&&!J.paused&&g8(Date.now(),this.lastTickMs))this.emitTick(J.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let $=document.querySelector("ytmusic-player-bar")||document.body;if(!$||$===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe($,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=$}attachVideoListeners($){$.addEventListener("play",this.handleVideoPlay),$.addEventListener("playing",this.handleVideoPlay),$.addEventListener("pause",this.handleVideoPause),$.addEventListener("ended",this.handleVideoPause),$.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=$}detachVideoListeners($){$.removeEventListener("play",this.handleVideoPlay),$.removeEventListener("playing",this.handleVideoPlay),$.removeEventListener("pause",this.handleVideoPause),$.removeEventListener("ended",this.handleVideoPause),$.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let $=document.querySelector("video");if($&&$!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners($)}}extractTrackInfo(){let $=document.querySelector("video"),X=document.getElementById("movie_player");if(Boolean(X&&(typeof X.getAdState==="function"&&X.getAdState()===1||typeof X.isAdPlaying==="function"&&X.isAdPlaying()||X.classList?.contains("ad-showing")||X.classList?.contains("ad-interrupting"))))return null;let Z=navigator.mediaSession?.metadata,z=Z?.title||"",Y=Z?.artist||"",G=Z?.album||"",W="";if(Z?.artwork&&Z.artwork.length>0){let F=Z.artwork[Z.artwork.length-1];if(F&&F.src)W=F.src}if(!z){let F=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(F)z=F.textContent?.trim()||""}if(!Y){let F=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(F){let C=(F.textContent?.trim()||"").split("•").map((_)=>_.trim());if(Y=C[0]||"",C.length>1)G=C[1]}}if(!W){let F=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(F&&F.src)W=F.src}if(W.startsWith("//"))W=`https:${W}`;if(W.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(W))W=W.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let Q=X?.getVideoData?.(),j=Q?.video_id||new URLSearchParams(window.location.search).get("v")||void 0;if(j&&!k8(Q?.title,Z?.title)){let F=Date.now();if(this.titleMismatch?.videoId!==j)this.titleMismatch={videoId:j,sinceMs:F};if(F-this.titleMismatch.sinceMs<E8)return null}else this.titleMismatch=null;let H=0,U=0;if(X&&typeof X.getDuration==="function"){let F=X.getDuration();if(typeof F==="number"&&Number.isFinite(F)&&F>0)H=Math.floor(F)}if(X&&typeof X.getCurrentTime==="function"){let F=X.getCurrentTime();if(typeof F==="number"&&Number.isFinite(F)&&F>=0)U=Math.floor(F)}if(!H&&$&&Number.isFinite($.duration)&&$.duration>0)H=Math.floor($.duration);if(!U&&$&&Number.isFinite($.currentTime)&&$.currentTime>=0)U=Math.floor($.currentTime);let N=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(N&&N.textContent){let F=N.textContent.split("/").map((D)=>D.trim());if(F.length===2){if(!U)U=c1(F[0]);if(!H)H=c1(F[1])}}if(!H){let D=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(D){let C=parseInt(D,10);if(!isNaN(C)&&C>0)H=C}}let V=$?!$.paused&&!$.ended:!1;if(!z)return null;let L=h8(window.location.search,j)??(this.currentTrack?.videoId===j?this.currentTrack?.playlistId:void 0);return{title:z,artist:Y||"Unknown Artist",album:G||void 0,coverUrl:W||void 0,durationSecs:H,currentTimeSecs:U,isPlaying:V,videoId:j,playlistId:L}}checkTrackUpdate(){let $=this.extractTrackInfo();if(!$)return;let X=S8(this.currentTrack,$),J=this.currentTrack!==null&&this.currentTrack.isPlaying!==$.isPlaying;if(this.currentTrack=$,X){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((Z)=>Z($))}if(J)this.onPlaybackChangeCallbacks.forEach((Z)=>Z($.isPlaying))}handlePlaybackChange($){if($){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((X)=>X(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((X)=>X(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function W1(){return document.getElementById("movie_player")}function l1($){for(let X of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let J=document.querySelector(X);if(!J||!("value"in J))continue;if("step"in J&&Number(J.step)>1)J.step=1;J.value=$}}function W0($){let X=W1()?.getVolume?.(),J=typeof X==="number"&&Number.isFinite(X)?X:$.volume*100;return Math.max(0,Math.min(100,Math.round(J)))}function M0($){return W1()?.isMuted?.()===!0||$.muted}function A0($,X){if(!Number.isFinite($))return;let J=Math.max(0,Math.min(100,Math.round($))),Z=W1();if(typeof Z?.setVolume==="function"){if(Z.setVolume(J),J>0&&Z.isMuted?.())if(typeof Z.unMute==="function")Z.unMute();else X.muted=!1;l1(J);return}if(X.volume=J/100,J>0&&X.muted)X.muted=!1;l1(J)}var s1=!1;function n1($){s1=$}function a(){return s1}var a1=null;function j1($){a1=$}function r1(){return a1?.()??!1}class O{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let $=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if($){$.click();return}let X=this.getVideo();if(X)if(X.paused)X.play();else X.pause()}static play(){let $=this.getVideo();if($&&$.paused)this.playPause()}static pause(){let $=this.getVideo();if($&&!$.paused)this.playPause()}static next(){if(r1())return;this.nextInYtm()}static nextInYtm(){let $=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if($)$.click()}static previous(){let $=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if($)$.click()}static seekTo($){let X=this.getVideo();if(X&&!isNaN($))X.currentTime=Math.max(0,Math.min($,X.duration||$))}static setVolume($){let X=this.getVideo();if(X)A0($*100,X)}static toggleLike(){let $=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if($)$.click()}static toggleDislike(){let $=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if($)$.click()}static getLikeStatus(){let $=document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer")?.getAttribute("like-status");return $==="LIKE"?"like":$==="DISLIKE"?"dislike":"none"}static getRepeatMode(){let $=document.querySelector("ytmusic-player-bar")?.getAttribute("repeat-mode");return $==="ALL"?"all":$==="ONE"?"one":"none"}static isShuffleOn(){return document.querySelector("ytmusic-player-bar")?.hasAttribute("shuffle-on")??!1}static toggleShuffle(){document.querySelector("ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button")?.click()}static cycleRepeat(){document.querySelector("ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button")?.click()}static toggleMute(){let $=document.querySelector("ytmusic-player-bar #volume-slider"),X=this.getVideo();if(X)X.muted=!X.muted;if($){let J=$.parentElement?.querySelector("paper-icon-button, #button");if(J)J.click()}}}function x8($,X){if(!X||typeof X!=="object"||!("ok"in X))throw Error(`Malformed response to ${$}`);let J=X;if(!J.ok)throw Error(J.error||`${$} failed`);return J.data??null}var y8=8000,m=($,X={},J={})=>{return new Promise((Z,z)=>{let Y=window.__TAURI__;if(!Y?.event?.emit){z(Error("Tauri bridge unavailable"));return}let G=Math.random().toString(36).slice(2)+Date.now().toString(36),W=null,Q=setTimeout(()=>{if(W)W();z(Error(`Timed out waiting for ${$}`))},J.timeoutMs??y8);Y.event.listen(`ytmd-response-${G}`,(j)=>{if(clearTimeout(Q),W)W();try{Z(x8($,j.payload))}catch(H){z(H)}}).then((j)=>{return W=j,Y.event.emit("ytmd-invoke",{id:G,cmd:$,args:X})}).catch((j)=>{clearTimeout(Q),z(j instanceof Error?j:Error(String(j)))})})};var v8=15000,p8=100;function m8($,X,J,Z,z){if(Z||z>v8)return"abandon";if(X&&X!==$.video_id)return"abandon";return X===$.video_id&&J?"apply":"wait"}var u8=()=>document.getElementById("movie_player")?.getVideoData?.()?.video_id||void 0;function i1(){let $=location.pathname==="/watch"?new URLSearchParams(location.search).get("v"):null;if(!$)return;let X=!1,J=new Set,Z=(Q)=>{let j=Q.target;if(X||!(j instanceof HTMLVideoElement)||j.muted)return;j.muted=!0,J.add(j)};document.addEventListener("loadstart",Z,!0),document.addEventListener("play",Z,!0);let z=()=>{if(X)return;X=!0,document.removeEventListener("loadstart",Z,!0),document.removeEventListener("play",Z,!0),J.forEach((Q)=>Q.muted=!1),J.clear()},Y=(Q,j)=>{let H=()=>{if(clearTimeout(U),j.removeEventListener("seeked",H),!Q.autoplay)j.pause();z()},U=setTimeout(H,1000);if(j.addEventListener("seeked",H),j.currentTime=Q.position_secs,Q.autoplay)j.play().catch(()=>{return});else{j.pause();let N=()=>j.pause();j.addEventListener("play",N),setTimeout(()=>j.removeEventListener("play",N),1500)}},G=Date.now();(async()=>{for(let Q=0;;Q++)try{return await m("take_resume_session")}catch(j){if(Q>=20||window.__TAURI__?.event?.emit)throw j;await new Promise((H)=>setTimeout(H,100))}})().then((Q)=>{let j=Q;if(!j||j.video_id!==$)return z();let H=setInterval(()=>{let U=document.querySelector("video"),N=m8(j,u8(),!!U&&U.readyState>=1,a(),Date.now()-G);if(N==="wait")return;if(clearInterval(H),N==="apply"&&U)Y(j,U);else z()},p8)}).catch((Q)=>{console.error("[YTMD] Resume failed:",Q),z()})}class Q1{plugins=new Map;enabledPlugins=new Set;context;constructor($){this.context=$}register($){if(this.plugins.set($.id,$),$.defaultEnabled)this.enabledPlugins.add($.id)}async initAll($){for(let[X,J]of this.plugins)if($?.[X]!==void 0?$[X]:J.defaultEnabled){if(this.enabledPlugins.add(X),J.onInit)try{await J.onInit(this.context)}catch(z){console.error(`[YTMD] Failed to init plugin ${X}:`,z)}}else this.enabledPlugins.delete(X)}async enable($){let X=this.plugins.get($);if(X&&!this.enabledPlugins.has($)){if(this.enabledPlugins.add($),X.onInit)await X.onInit(this.context)}}async disable($){let X=this.plugins.get($);if(X&&this.enabledPlugins.has($)){if(this.enabledPlugins.delete($),X.onDestroy)await X.onDestroy()}}handleTrackChange($){this.context.track=$;for(let X of this.enabledPlugins){let J=this.plugins.get(X);if(J?.onTrackChange)try{J.onTrackChange($,this.context)}catch(Z){console.error(`[YTMD] Error in plugin ${X} onTrackChange:`,Z)}}}handlePlaybackChange($){for(let X of this.enabledPlugins){let J=this.plugins.get(X);if(J?.onPlaybackChange)try{J.onPlaybackChange($,this.context)}catch(Z){console.error(`[YTMD] Error in plugin ${X} onPlaybackChange:`,Z)}}}handleTick($){for(let X of this.enabledPlugins){let J=this.plugins.get(X);if(J?.onTick)try{J.onTick($,this.context)}catch(Z){console.error(`[YTMD] Error in plugin ${X} onTick:`,Z)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled($){return this.enabledPlugins.has($)}}var _0=null,r={adWasShowing:!1,preAdMuted:!1},K1=new WeakSet,j0=null,J5=null,H1=0,Q0=!0,c8=1000,d8=($,X,J)=>$-X>=J,l8=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",s8="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",n8=300,a8=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,r8=`
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
`,i8=a8+r8,o8=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],t8=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],e8=($)=>o8.some((X)=>$.includes(X)),$6=($,X)=>{let J=X.split("."),Z=$;for(let Y=0;Y<J.length-1;Y++){if(Z===null||typeof Z!=="object")return!1;Z=Z[J[Y]]}let z=J[J.length-1];if(Z!==null&&typeof Z==="object"&&Object.prototype.hasOwnProperty.call(Z,z))return delete Z[z],!0;return!1},q1=($)=>{if($===null||typeof $!=="object")return!1;let X=!1;for(let J of t8)if($6($,J))X=!0;return X},X6=($)=>{if(typeof $==="string")return $;if($ instanceof URL)return $.href;return $.url},o1=!1,J6=()=>{if(o1)return;o1=!0;let $=window.fetch,X=$.bind(window),J=async(...Z)=>{let z=await X(...Z);if(!Q0||!e8(X6(Z[0])))return z;let Y;try{Y=await z.clone().json()}catch{return z}if(!q1(Y))return z;let G=new Headers(z.headers);return G.delete("content-length"),G.delete("content-encoding"),new Response(JSON.stringify(Y),{status:z.status,statusText:z.statusText,headers:G})};window.fetch=Object.assign(J,$)},t1=!1,Z6=()=>{if(t1)return;t1=!0;let $=JSON.parse;JSON.parse=(...X)=>{let J=$(...X);if(Q0)q1(J);return J}},e1=!1,z6=()=>{if(e1)return;e1=!0;let $;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>$,set:(X)=>{if(Q0)q1(X);$=X}})};if(typeof window<"u")J6(),Z6(),z6();var Y6=($)=>{let X=new Set($);return X.has("ad-showing")||X.has("ad-interrupting")},G6=($,X,J)=>{if($&&!X.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:J},setMutedTo:!0};if(!$&&X.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:X.preAdMuted},setMutedTo:X.preAdMuted};return{nextState:X,setMutedTo:null}},U1=()=>document.getElementById("movie_player"),W6=()=>{let $=U1();if(!$)return!1;return Y6($.classList)},F1=($)=>{let X=$.getVideoElement();if(!X)return;let{nextState:J,setMutedTo:Z}=G6(W6(),r,X.muted);if(r=J,Z!==null)X.muted=Z},$5=($)=>{if(K1.has($))return;K1.add($),$.click()},P0=()=>{document.querySelectorAll(l8).forEach($5),document.querySelectorAll(s8).forEach(($)=>{let X=$.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(X)$5(X)})},X5=($)=>{let X=U1();if(J5=X,!X)return;j0?.disconnect(),j0=new MutationObserver(()=>{F1($),P0()}),j0.observe(X,{attributes:!0,attributeFilter:["class"]})},Z5={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit($){Q0=!0,r={adWasShowing:!1,preAdMuted:!1},K1=new WeakSet,H1=0;let X=document.createElement("style");X.id="ytmd-adblock-styles",X.textContent=i8,document.head.appendChild(X);let J=null,Z=new MutationObserver(()=>{if(J!==null)return;J=setTimeout(()=>{J=null,P0()},n8)});Z.observe(document.body,{childList:!0,subtree:!0}),X5($),P0(),F1($),_0=()=>{if(Q0=!1,j0?.disconnect(),j0=null,Z.disconnect(),J!==null)clearTimeout(J);document.getElementById("ytmd-adblock-styles")?.remove();let z=$.getVideoElement();if(z&&r.adWasShowing)z.muted=r.preAdMuted;r={adWasShowing:!1,preAdMuted:!1}}},onTick($,X){if(U1()!==J5)X5(X);F1(X);let J=Date.now();if(d8(J,H1,c8))H1=J,P0()},onDestroy(){if(_0)_0(),_0=null}};var i=[],b0="",N1=new Set,j6=($,X)=>$===X,z5={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){i=[],b0="",N1=new Set},onTrackChange($){if(!$.videoId||$.videoId===b0)return;let X=$.videoId;b0=X,i=[],N1=new Set;let J=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),Z=`https://sponsor.ajay.app/api/skipSegments?videoID=${X}&categories=${encodeURIComponent(J)}`;fetch(Z,{signal:AbortSignal.timeout(3000)}).then(async(z)=>{if(!z.ok)return;let Y=await z.json();if(!j6(X,b0))return;i=Y,console.log(`[YTMD SponsorBlock] Loaded ${Y.length} segments for ${X}`)}).catch(()=>{})},onTick($,X){if(!i||i.length===0||a())return;let J=N1;for(let Z of i){let[z,Y]=Z.segment;if($>=z&&$<Y-0.5&&!J.has(Z.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${Z.category}): ${z}s -> ${Y}s`);let G=X.getVideoElement();if(G)G.currentTime=Y,J.add(Z.UUID);break}}}};function Y5($,X=18,J=18,Z="0 0 24 24"){let z=document.createElementNS("http://www.w3.org/2000/svg","svg");z.setAttribute("width",String(X)),z.setAttribute("height",String(J)),z.setAttribute("viewBox",Z),z.setAttribute("fill","currentColor");let Y=document.createElementNS("http://www.w3.org/2000/svg","path");return Y.setAttribute("d",$),z.appendChild(Y),z}function q($,X){let J=document.createElement($);if(X?.id)J.id=X.id;if(X?.className)J.className=X.className;if(X?.text!==void 0)J.textContent=X.text;if(X?.title)J.title=X.title;if(X?.style)J.style.cssText=X.style;return J}var G5="ytmd-kit-styles",Q6=`
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
`;function w(){if(document.getElementById(G5))return;let $=document.createElement("style");$.id=G5,$.textContent=Q6,(document.head||document.documentElement).appendChild($),H6()}var P={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function H0($,X=24){return Y5($,X,X)}function k($){let X=q("button",{id:$.id,className:`ytmd-icon-btn${$.muted?" ytmd-icon-btn--muted":""}`});return X.type="button",X.setAttribute("aria-label",$.label),X.dataset.ytmdTooltip=$.label,X.appendChild(H0($.iconPath)),X}function Q5($,X){$.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(H0(X))}function H5($,X){let J=$.querySelector("svg.ytmd-progress-ring");if(X===null){J?.remove();return}let Z=17,z=2*Math.PI*Z;if(!J){J=document.createElementNS("http://www.w3.org/2000/svg","svg"),J.setAttribute("class","ytmd-progress-ring"),J.setAttribute("viewBox","0 0 36 36");for(let W of["ytmd-progress-track","ytmd-progress-value"]){let Q=document.createElementNS("http://www.w3.org/2000/svg","circle");Q.setAttribute("class",W),Q.setAttribute("cx","18"),Q.setAttribute("cy","18"),Q.setAttribute("r",String(Z)),Q.setAttribute("stroke-dasharray",String(z)),J.appendChild(Q)}$.appendChild(J)}let Y=Math.max(0,Math.min(1,X));J.querySelector(".ytmd-progress-value")?.setAttribute("stroke-dashoffset",String(z*(1-Y)))}var W5=!1;function H6(){if(W5)return;W5=!0;let $=null,X=null,J=null,Z=()=>{if(X!==null)clearTimeout(X);X=null,J=null,$?.classList.remove("ytmd-open")},z=(W)=>{let Q=W.dataset.ytmdTooltip;if(!Q)return;if(!$)$=q("div",{id:"ytmd-tooltip"}),$.setAttribute("role","tooltip"),document.body.appendChild($);$.textContent=Q;let j=W.getBoundingClientRect(),H=$.getBoundingClientRect(),N=j.bottom+8+H.height<window.innerHeight?j.bottom+8:j.top-8-H.height,V=Math.max(8,Math.min(window.innerWidth-H.width-8,j.left+j.width/2-H.width/2));$.style.top=`${N}px`,$.style.left=`${V}px`,$.classList.add("ytmd-open")},Y=(W)=>{let Q=W.target?.closest?.("[data-ytmd-tooltip]");if(!Q||Q===J)return;Z(),J=Q,X=setTimeout(()=>z(Q),250)},G=(W)=>{let Q=W.relatedTarget;if(J&&Q&&J.contains(Q))return;Z()};document.addEventListener("mouseover",Y,!0),document.addEventListener("mouseout",G,!0),document.addEventListener("focusin",Y,!0),document.addEventListener("focusout",Z,!0),document.addEventListener("mousedown",Z,!0)}var u=null;function B($,X={}){w();let J=document.getElementById("ytmd-toast-host");if(!J)J=q("div",{id:"ytmd-toast-host"}),J.setAttribute("role","status"),J.setAttribute("aria-live","polite"),document.body.appendChild(J);let Z=J.querySelector(".ytmd-toast"),z=Z&&X.id&&Z.dataset.toastId===X.id&&!Z.classList.contains("ytmd-leaving"),Y=z?Z:q("div",{className:"ytmd-toast"});if(X.id)Y.dataset.toastId=X.id;let W=[q("span",{className:"ytmd-toast-text",text:$})];if(X.action){let{label:j,onClick:H}=X.action,U=q("button",{className:"ytmd-button",text:j});U.type="button",U.addEventListener("click",()=>{j5(),H()}),W.push(U)}if(Y.replaceChildren(...W),!z)J.replaceChildren(Y);if(u!==null)clearTimeout(u);u=null;let Q=X.durationMs??4000;if(Q>0)u=setTimeout(j5,Q)}var K6=5,F6=3000;function K5($,X){w();let J=document.getElementById("ytmd-reaction-host");if(!J)J=q("div",{id:"ytmd-reaction-host"}),J.setAttribute("aria-live","polite"),document.body.appendChild(J);let Z=q("div",{className:"ytmd-reaction"});Z.append(q("span",{className:"ytmd-reaction-emoji",text:$}),q("span",{text:X})),J.appendChild(Z);while(J.children.length>K6)J.firstElementChild?.remove();setTimeout(()=>Z.remove(),F6)}function j5(){if(u!==null)clearTimeout(u);u=null;let $=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!$)return;$.classList.add("ytmd-leaving"),setTimeout(()=>$.remove(),150)}function R0($){w(),document.getElementById($.id)?.remove();let X=q("div",{id:$.id,className:"ytmd-scrim"}),J=q("div",{className:"ytmd-dialog"});J.setAttribute("role","dialog"),J.setAttribute("aria-modal","true");let Z=`${$.id}-title`;J.setAttribute("aria-labelledby",Z);let z=q("h2",{id:Z,className:"ytmd-dialog-title",text:$.title}),Y=q("div",{className:"ytmd-dialog-body"});if($.body)Y.append(...$.body);let G=document.activeElement,W=()=>{document.removeEventListener("keydown",Q,!0),X.remove(),G?.focus?.()},Q=(H)=>{if(H.key==="Escape")H.stopPropagation(),W()};document.addEventListener("keydown",Q,!0),X.addEventListener("click",(H)=>{if(H.target===X)W()});let j=q("div",{className:"ytmd-dialog-actions"});for(let H of $.actions){let U=q("button",{className:`ytmd-button${H.filled?" ytmd-button--filled":""}`,text:H.label});U.type="button",U.addEventListener("click",()=>H.onClick?H.onClick(W):W()),j.appendChild(U)}return J.append(z,Y,j),X.appendChild(J),document.body.appendChild(X),j.querySelector("button")?.focus(),{close:W,body:Y}}var F5={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",menuDownload:"Download song",syncInRoom:"Listening together",syncListeners:($)=>$===1?"1 listener":`${$} listeners`,syncJoined:($)=>`${$} joined`,syncLeft:($)=>`${$} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:($)=>`${$} skipped to the next song`,syncGuestPrevious:($)=>`${$} went back a song`,syncGuestPaused:($)=>`${$} paused`,syncGuestResumed:($)=>`${$} resumed playback`,syncGuestPicked:($)=>`${$} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:($,X,J)=>`${$} votes to skip (${X}/${J})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:($,X)=>`From the shared queue: ${$} · ${X}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:($)=>`${$} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:($)=>`from ${$}`,syncQueuePlayNow:($)=>`Play “${$}” now`,syncQueueRemove:($)=>`Remove “${$}” from the queue`,syncQueueDrag:($)=>`Move “${$}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",downloadNoTrack:"Play a song first to download it",downloadStarted:($)=>`Downloading “${$}”`,downloadDone:($)=>`Downloaded “${$}”`,downloadFailed:($)=>`Download failed: ${$}`,downloadInProgress:"Download in progress",downloadButton:"Download",pipButton:"Picture-in-picture",remoteTitle:"Phone remote",remoteBody:"Scan with your phone’s camera. Your phone must be on the same Wi-Fi.",remoteLoading:"Starting remote…",remoteUnavailable:"The remote isn’t available right now",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:($)=>`Source: ${$}`,lyricsLocalFiles:"Local files",lyricsWrong:"Wrong lyrics?",lyricsPickTitle:"Choose lyrics",lyricsPickLoading:"Looking for other versions…",lyricsPickNone:"No other versions found",lyricsPickFailed:"Couldn’t switch the lyrics",lyricsTimed:"Timed",lyricsTextOnly:"Text only",lyricsCurrent:"Current",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:($)=>`Volume: ${$}%`},q6={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",menuDownload:"Pobierz utwór",syncInRoom:"Słuchacie razem",syncListeners:($)=>{if($===1)return"1 słuchacz";let X=$%100,J=$%10;return J>=2&&J<=4&&(X<12||X>14)?`${$} słuchacze`:`${$} słuchaczy`},syncJoined:($)=>`${$} dołącza do słuchania`,syncLeft:($)=>`${$} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:($)=>`${$} przełącza na następny utwór`,syncGuestPrevious:($)=>`${$} wraca do poprzedniego utworu`,syncGuestPaused:($)=>`${$} wstrzymuje odtwarzanie`,syncGuestResumed:($)=>`${$} wznawia odtwarzanie`,syncGuestPicked:($)=>`${$} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:($,X,J)=>`${$} głosuje za pominięciem (${X}/${J})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:($,X)=>`Ze wspólnej kolejki: ${$} · ${X}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:($)=>`${$} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:($)=>`od: ${$}`,syncQueuePlayNow:($)=>`Zagraj teraz: „${$}”`,syncQueueRemove:($)=>`Usuń z kolejki: „${$}”`,syncQueueDrag:($)=>`Przesuń „${$}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",downloadNoTrack:"Najpierw włącz utwór, żeby go pobrać",downloadStarted:($)=>`Pobieranie: „${$}”`,downloadDone:($)=>`Pobrano: „${$}”`,downloadFailed:($)=>`Nie udało się pobrać: ${$}`,downloadInProgress:"Trwa pobieranie",downloadButton:"Pobierz",pipButton:"Obraz w obrazie",remoteTitle:"Pilot w telefonie",remoteBody:"Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.",remoteLoading:"Uruchamianie pilota…",remoteUnavailable:"Pilot jest teraz niedostępny",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:($)=>`Źródło: ${$}`,lyricsLocalFiles:"Pliki lokalne",lyricsWrong:"Zły tekst?",lyricsPickTitle:"Wybierz tekst",lyricsPickLoading:"Szukanie innych wersji…",lyricsPickNone:"Nie znaleziono innych wersji",lyricsPickFailed:"Nie udało się zmienić tekstu",lyricsTimed:"Z synchronizacją",lyricsTextOnly:"Sam tekst",lyricsCurrent:"Obecny",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:($)=>`Głośność: ${$}%`},U6={en:F5,pl:q6};function N6($){let X=($||"").toLowerCase().split(/[-_]/)[0];return U6[X]??F5}var V1=null;function K(){if(!V1){let $=typeof document<"u"?document.documentElement.lang:"";V1=N6($||(typeof navigator<"u"?navigator.language:"en"))}return V1}var K0={video_id:null,provider:null,synced:[],plain:null,offset_secs:0,source_url:null};function q5($,X){let J=0,Z=$.length-1,z=-1;while(J<=Z){let Y=J+Z>>1;if($[Y].t<=X)z=Y,J=Y+1;else Z=Y-1}return z}function U5($,X,J){return q5($,X+J)}function N5($,X,J){return $?.words?q5($.words,X+J):-1}function L1($,X){switch($){case"local":return X;case"lrclib":return"LRCLIB";case"musixmatch":return"Musixmatch";case"netease":return"NetEase";case"ytm":return"YouTube Music";case"genius":return"Genius";default:return $||""}}function w0($){if(!$||typeof $!=="object")return{...K0};let X=$;return{video_id:typeof X.video_id==="string"?X.video_id:null,provider:typeof X.provider==="string"?X.provider:null,synced:Array.isArray(X.synced)?X.synced.filter((J)=>typeof J?.t==="number"&&typeof J?.text==="string"):[],plain:typeof X.plain==="string"?X.plain:null,offset_secs:typeof X.offset_secs==="number"&&Number.isFinite(X.offset_secs)?X.offset_secs:0,source_url:typeof X.source_url==="string"?X.source_url:null}}var M={...K0},I=!1,y=-1,c=-1,o="",T0=0,D1="",E0=!1,S=null,f0=null,V5=($,X)=>$===X,V6=($)=>$.videoId||`${$.title} - ${$.artist}`,O5={id:"lyrics",name:"Native Synced Lyrics",description:"Synchronized lyrics from several providers in the native Lyrics tab, with active highlighting and seek-on-click",defaultEnabled:!0,onInit($){M={...K0},I=!1,y=-1,c=-1,o="",D1="",E0=!1,S=null;let X=document.createElement("style");X.id="ytmd-native-lyrics-styles",X.textContent=L6,document.head.appendChild(X),w();let J=()=>{O1(),b6($),D6($)},Z=()=>{setTimeout(()=>{O1(),C1()},50),setTimeout(()=>{C1()},250)};document.addEventListener("click",Z,!0);let z=window.setInterval(J,600);J(),C6($);let Y=window.__TAURI__?.event?window.__TAURI__.event.listen("lyrics-changed",(G)=>{let W=w0(G.payload);if(!O6(W))return;B1($,W)}):null;f0=()=>{clearInterval(z),document.removeEventListener("click",Z,!0),Y?.then((G)=>G()),X.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((G)=>G.remove())}},async onTrackChange($,X){let J=V6($);if(S=$,J===o)return;o=J,M={...K0,video_id:$.videoId??null},I=!0,y=-1,c=-1,D1=C5(),E0=!1,O1(),k0(X),await D5(X,$,J,null)},onTick($){T0=$,h0($,!0)},onDestroy(){if(f0)f0(),f0=null}},L6=`
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
`;function O6($){if(!S)return!1;if($.video_id&&S.videoId)return $.video_id===S.videoId;return!$.video_id||$.video_id===S.videoId}async function D5($,X,J,Z){try{let z=w0(await $.invoke("fetch_lyrics",{videoId:X.videoId||null,artist:X.artist,title:X.title,albumName:X.album||null,duration:X.durationSecs||null,ytmPlain:Z},{timeoutMs:15000}));if(!V5(J,o))return;I=!1,B1($,z)}catch{if(!V5(J,o))return;I=!1,k0($)}}function B1($,X){let J=X.provider!==null&&X.provider===M.provider&&X.synced.length===M.synced.length&&X.plain===M.plain&&X.video_id===M.video_id&&!I;if(I&&!X.provider&&X.offset_secs===M.offset_secs)return;if(M=X,I=!1,J){let Z=document.querySelector(".ytmd-lyrics-offset-value");if(Z)Z.textContent=M5(X.offset_secs);h0(T0,!1);return}y=-1,c=-1,k0($),h0(T0,!1)}function h0($,X){if(M.synced.length===0)return;let J=document.getElementById("ytmd-native-lyrics-wrapper");if(!J)return;let Z=J.querySelectorAll(".ytmd-native-lyric-line"),z=U5(M.synced,$,M.offset_secs);if(z!==y){Z[y]?.classList.remove("active"),Z[y]?.querySelectorAll(".ytmd-sung").forEach((W)=>W.classList.remove("ytmd-sung")),y=z,c=-1;let G=Z[z];if(G){G.classList.add("active");let W=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(X&&W&&A6(W))G.scrollIntoView({behavior:"smooth",block:"nearest"})}}let Y=N5(M.synced[z],$,M.offset_secs);if(Y!==c)Z[z]?.querySelectorAll(".ytmd-lyric-word")?.forEach((W,Q)=>W.classList.toggle("ytmd-sung",Q<=Y)),c=Y}function C5(){return document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description')?.textContent?.trim()||""}function D6($){if(E0||I||!S||M.provider)return;let X=C5();if(!X||X===D1)return;E0=!0,D5($,S,o,X)}async function C6($){let X=B6(),J=[...M6(X)];if(J.length===0)return;try{await $.invoke("import_lyrics_offsets",{entries:J}),X?.removeItem?.(B5)}catch(Z){console.warn("[YTMD Lyrics] Offset migration failed, will retry next start:",Z)}}var B5="ytmd-lyrics-offsets";function B6(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function M6($){try{let X=$?.getItem(B5);if(!X)return new Map;let J=JSON.parse(X);if(!Array.isArray(J))return new Map;return new Map(J.filter((Z)=>Array.isArray(Z)&&typeof Z[0]==="string"&&typeof Z[1]==="number"))}catch{return new Map}}function M5($){return`${$>0?"+":$<0?"−":""}${Math.abs($).toFixed(1)} s`}function A6($){if(!$||$.offsetParent===null||$.hasAttribute("hidden"))return!1;let X=window.getComputedStyle($);return X.display!=="none"&&X.visibility!=="hidden"&&X.opacity!=="0"}function _6($){return $.disabled!==!0&&!$.hasAttribute("disabled")&&$.getAttribute("aria-disabled")!=="true"&&!$.classList.contains("disabled")&&$.classList.contains("ytmd-lyrics-tab-unlocked")}function O1(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((X)=>{let J=X.textContent?.toLowerCase()||"";if(J.includes("tekst")||J.includes("lyrics")||J.includes("paroles")||J.includes("letras")){if(_6(X))return;X.disabled=!1,X.removeAttribute("disabled"),X.removeAttribute("aria-disabled"),X.classList.remove("disabled"),X.classList.add("ytmd-lyrics-tab-unlocked");let Z={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!X.endpoint)X.endpoint=Z;if(X.data&&!X.data.endpoint)X.data.endpoint=Z}})}function P6(){let $=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let J of Array.from($)){let Z=J.textContent?.toLowerCase()||"";if(Z.includes("tekst")||Z.includes("lyrics")||Z.includes("paroles")||Z.includes("letras")){if(J.classList.contains("iron-selected")||J.getAttribute("aria-selected")==="true"||J.classList.contains("selected"))return!0}}let X=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(X){if((X.classList.contains("iron-selected")||!X.hasAttribute("hidden"))&&X.getAttribute("aria-hidden")!=="true")return!0}return!1}function C1(){let $=document.getElementById("ytmd-native-lyrics-wrapper");if(!$)return;let X=P6();$.style.setProperty("display",X?"flex":"none","important")}function b6($){let X=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!X)return;let J=document.getElementById("ytmd-native-lyrics-wrapper");if(!J||!X.contains(J)){if(!J)J=q("div",{id:"ytmd-native-lyrics-wrapper"});X.appendChild(J),y=-1,c=-1,k0($),h0(T0,!1)}C1()}function F0($,X,J){let Z=q("button",{className:"ytmd-chip",text:$});return Z.type="button",Z.dataset.ytmdTooltip=X,Z.setAttribute("aria-label",X),Z.addEventListener("click",J),Z}function R6(){let $=K().lyricsSource(L1(M.provider,K().lyricsLocalFiles));if(M.source_url){let X=q("a",{className:"ytmd-lyrics-source",text:$});return X.href=M.source_url,X.target="_blank",X.rel="noopener noreferrer",X}return q("span",{className:"ytmd-lyrics-source",text:$})}function L5($,X){let J=q("div",{className:"ytmd-native-lyrics-footer"});if(J.append(R6()),X){let Z=q("span",{className:"ytmd-lyrics-offset-value",text:M5(M.offset_secs)}),z=(Y)=>{let G=Y===null?0:Math.round((M.offset_secs+Y)*10)/10;$.invoke("set_lyrics_offset",{offsetSecs:G}).catch((W)=>console.warn("[YTMD Lyrics] offset:",W))};J.append(q("span",{text:K().lyricsOffset}),F0("−0.5 s",K().lyricsLater,()=>z(-0.5)),Z,F0("+0.5 s",K().lyricsEarlier,()=>z(0.5)),F0(K().lyricsReset,K().lyricsReset,()=>z(null)))}return J.append(F0(K().lyricsWrong,K().lyricsPickTitle,()=>void A5($))),J}async function A5($){let X=q("div",{className:"ytmd-lyrics-pick-list"});X.append(q("div",{className:"ytmd-native-lyrics-status",text:K().lyricsPickLoading}));let J=R0({id:"ytmd-lyrics-picker",title:K().lyricsPickTitle,body:[X],actions:[{label:K().close}]}),Z=[];try{Z=await $.invoke("list_lyrics_candidates",{},{timeoutMs:15000})||[]}catch{Z=[]}if(!X.isConnected)return;if(Z.length===0){X.replaceChildren(q("div",{className:"ytmd-native-lyrics-status",text:K().lyricsPickNone}));return}X.replaceChildren(...Z.map((z)=>{let Y=q("button",{className:"ytmd-menu-item"});Y.type="button";let G=q("span",{className:"ytmd-menu-item-text"}),W=z.synced?K().lyricsTimed:K().lyricsTextOnly;if(G.append(q("span",{text:`${L1(z.provider,K().lyricsLocalFiles)} · ${W}`}),q("span",{className:"ytmd-menu-item-sub",text:`${z.title} — ${z.artist}`}),q("span",{className:"ytmd-menu-item-sub",text:z.preview})),Y.append(G),z.selected)Y.append(q("span",{className:"ytmd-menu-item-hint",text:K().lyricsCurrent}));return Y.addEventListener("click",async()=>{J.close();try{B1($,w0(await $.invoke("pick_lyrics",{provider:z.provider,id:z.id})))}catch{B(K().lyricsPickFailed)}}),Y}))}function k0($){let X=document.getElementById("ytmd-native-lyrics-wrapper");if(!X)return;if(I)X.replaceChildren(q("div",{className:"ytmd-native-lyrics-status",text:K().lyricsLoading}));else if(M.synced.length>0)X.replaceChildren(...M.synced.map((J)=>{let Z=q("div",{className:"ytmd-native-lyric-line"});if(J.words?.length)Z.classList.add("ytmd-has-words"),Z.append(...J.words.map((z)=>q("span",{className:"ytmd-lyric-word",text:z.text})));else Z.textContent=J.text;return Z.addEventListener("click",()=>{let z=$.getVideoElement();if(z)z.currentTime=Math.max(0,J.t-M.offset_secs)}),Z}),L5($,!0));else if(M.plain)X.replaceChildren(...M.plain.split(`
`).map((J)=>q("div",{className:"ytmd-native-lyric-line ytmd-plain",text:J})),L5($,!1));else{let J=[q("div",{className:"ytmd-native-lyrics-status",text:K().lyricsNone})];if(S)J.push(w6($));X.replaceChildren(...J)}}function w6($){let X=q("div",{className:"ytmd-native-lyrics-footer"});return X.append(q("span",{className:"ytmd-lyrics-source"}),F0(K().lyricsWrong,K().lyricsPickTitle,()=>void A5($))),X}var q0=null;function U0($){if(!$)return null;let X=$.getBoundingClientRect();if(X.width<80||X.height<80||X.bottom<=0||X.right<=0||X.top>=window.innerHeight||X.left>=window.innerWidth)return null;for(let J=$;J;J=J.parentElement){let Z=getComputedStyle(J);if(Z.display==="none"||Z.visibility==="hidden"||Number(Z.opacity)===0)return null}return X}function _5(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var P5={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit($){q0?.(),w(),document.getElementById("ytmd-volume-indicator")?.remove();let X=q("div",{id:"ytmd-volume-indicator"});document.body.appendChild(X);let J=null,Z=null,z=null,Y=null,G=null,W=()=>{if(G!==null)window.clearTimeout(G);G=null,X.classList.remove("ytmd-visible")},Q=()=>{if(G!==null)window.clearTimeout(G);X.classList.add("ytmd-visible"),G=window.setTimeout(()=>{G=null,X.classList.remove("ytmd-visible")},1800)},j=()=>{let F=$.getVideoElement();if(!F){Y=null,W();return}let D=M0(F)?0:W0(F),C=Y!==null&&D!==Y;Y=D;let _=document.querySelector("ytmusic-player-page #main-panel");if(!_5()&&!U0(_)){W();return}if(X.textContent!==`${D}%`)X.textContent=`${D}%`,X.setAttribute("aria-label",K().volumeLevel(D));let n=U0(document.querySelector("ytmusic-player-page #song-image")),R=U0(document.querySelector("ytmusic-player-page video"))||U0(document.querySelector("ytmusic-player-page #movie_player")),f=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?R||n:n||R)||U0(_);if(!f){W();return}let h=`${Math.max(8,f.left+12)}px`,x=`${Math.max(8,f.top+12)}px`;if(X.style.left!==h)X.style.left=h;if(X.style.top!==x)X.style.top=x;if(C)Q()},H=()=>{let F=$.getVideoElement();if(F===J)return;J?.removeEventListener("volumechange",j),J=F,J?.addEventListener("volumechange",j),j()},U=()=>{let F=document.querySelector("ytmusic-player-page");if(F===Z)return;if(z?.disconnect(),Z=F,F)z=new MutationObserver(()=>window.requestAnimationFrame(j)),z.observe(F,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},N=(F)=>{let D=F.target;if(D instanceof Element&&D.closest("ytmusic-player-bar"))window.requestAnimationFrame(j)},V=(F)=>{if(F.deltaY===0||F.ctrlKey)return;let D=F.target,C=D instanceof Element?D.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'):null;if(C&&C.tagName!=="YTMUSIC-PLAYER")return;let _=(h)=>{if(!h)return!1;let x=h.getBoundingClientRect();return F.clientX>=x.left&&F.clientX<x.right&&F.clientY>=x.top&&F.clientY<x.bottom},B0=_(document.querySelector("ytmusic-player-bar"))||_(document.querySelector("#player-bar-background")),n=$.config.wheel_volume_on_player_page===!0&&(_5()||_(document.querySelector("ytmusic-player-page #main-panel")));if(!B0&&!n)return;let R=$.getVideoElement();if(!R)return;let E=$.config.wheel_volume_step,f=typeof E==="number"&&Number.isFinite(E)&&E>0?Math.min(E,1):0.05;F.preventDefault(),A0(W0(R)+(F.deltaY<0?f:-f)*100,R),j()};window.addEventListener("wheel",V,{passive:!1,capture:!0}),window.addEventListener("resize",j),document.addEventListener("scroll",j,!0),document.addEventListener("input",N,!0),document.addEventListener("change",N,!0),U(),H();let L=window.setInterval(()=>{U(),H(),j()},500);q0=()=>{window.removeEventListener("wheel",V,{capture:!0}),window.removeEventListener("resize",j),document.removeEventListener("scroll",j,!0),document.removeEventListener("input",N,!0),document.removeEventListener("change",N,!0),window.clearInterval(L),z?.disconnect(),J?.removeEventListener("volumechange",j),W(),X.remove()}},onDestroy(){if(q0)q0(),q0=null}};var b5={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange($,X){if(!X.config?.notifications_enabled)return;if(!$.title||$.title==="No Track Playing")return;try{await X.invoke("notify_track_change",{title:$.title,artist:$.artist})}catch(J){console.warn("[YTMD] Notification dispatch failed:",J)}}};var S0=null,R5={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit($){let X=document.getElementById("ytmd-theme-styles");if(!X)X=document.createElement("style"),X.id="ytmd-theme-styles";if(X.textContent=`
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
    `,!X.isConnected)document.head.appendChild(X);S0=()=>{X?.remove()}},onDestroy(){if(S0)S0(),S0=null}};var I0=[32,64,125,250,500,1000,2000,4000,8000,16000],M1={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function N0($){return Math.max(-24,Math.min(24,$))}function f6($){if($.length===0)return-100;let X=0;for(let Z=0;Z<$.length;Z++)X+=$[Z]*$[Z];let J=Math.sqrt(X/$.length);if(J<=0.00001)return-100;return 20*Math.log10(J)}function T6($){return Math.max(0.5,Math.min(2,$))}class b{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=I0.map(()=>0);preampDb=0;isInitializedFor($){return this.isInitialized&&this.hookedVideo===$}static getInstance(){if(!b.instance)b.instance=new b;return b.instance}init($){if(this.isInitialized&&this.hookedVideo===$){this.resumeContext();return}try{let X=window.AudioContext||window.webkitAudioContext;if(!X){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new X,this.hookedVideo=$,this.sourceNode=this.audioCtx.createMediaElementSource($),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=I0.map((Z,z)=>{if(!this.audioCtx)throw Error("AudioContext missing");let Y=this.audioCtx.createBiquadFilter();if(z===0)Y.type="lowshelf";else if(z===I0.length-1)Y.type="highshelf";else Y.type="peaking",Y.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return Y.frequency.setValueAtTime(Z,this.audioCtx.currentTime),Y.gain.setValueAtTime(0,this.audioCtx.currentTime),Y}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let J=()=>this.resumeContext();$.addEventListener("play",J),$.addEventListener("playing",J),document.addEventListener("click",J,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(X){console.error("[YTMD DSP] Failed to initialize AudioEngine:",X)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((X)=>X.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let $=this.sourceNode;if(this.isNormalizing)$.connect(this.compressorNode),$=this.compressorNode;for(let X of this.filters)$.connect(X),$=X;$.connect(this.preampNode),$=this.preampNode,$.connect(this.fadeNode),$=this.fadeNode,$.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch($){console.error("[YTMD DSP] Graph rebuild error:",$)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain($,X){if($<0||$>=this.gains.length)return;let J=N0(X);if(this.gains[$]=J,!this.audioCtx||$>=this.filters.length)return;this.filters[$].gain.setValueAtTime(J,this.audioCtx.currentTime)}setAllGains($){$.forEach((J,Z)=>{if(Z<this.gains.length)this.gains[Z]=N0(J)});let X=this.audioCtx;if(!X)return;this.gains.forEach((J,Z)=>{if(Z<this.filters.length)this.filters[Z].gain.setValueAtTime(J,X.currentTime)})}setPreamp($){if(this.preampDb=N0($),!this.preampNode||!this.audioCtx)return;let X=Math.pow(10,N0($)/20);this.preampNode.gain.setValueAtTime(X,this.audioCtx.currentTime)}setLoudnessNormalization($){if(this.isNormalizing!==$)this.isNormalizing=$,this.rebuildGraph()}applyPreset($){let X=M1[$]||M1.flat;if(this.setAllGains(X.gains),X.preamp!==void 0)this.setPreamp(X.preamp);return X.gains}fadeIn($){if(!this.fadeNode||!this.audioCtx||$<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let X=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(X),this.fadeNode.gain.setValueAtTime(0.001,X),this.fadeNode.gain.linearRampToValueAtTime(1,X+$)}fadeOut($){if(!this.fadeNode||!this.audioCtx||$<=0)return;let X=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(X),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,X),this.fadeNode.gain.linearRampToValueAtTime(0.001,X+$)}resetFade(){if(this.fadeNode&&this.audioCtx){let $=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues($),this.fadeNode.gain.setValueAtTime(1,$)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),f6(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let $=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData($),$}setPlaybackRate($){this.playbackRate=T6($),this.applyRateAndPitch()}setPreservesPitch($){this.preservesPitch=$,this.applyRateAndPitch()}applyRateAndPitch(){let $=this.hookedVideo??O.getVideo();if(!$)return;if($.playbackRate!==this.playbackRate)$.playbackRate=this.playbackRate;if($.preservesPitch!==this.preservesPitch){$.preservesPitch=this.preservesPitch;let X=$;X.webkitPreservesPitch=this.preservesPitch}}}class A1{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds($){this.crossfadeSeconds=Math.max(0,Math.min(12,$))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange($){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=$.videoId||`${$.title}-${$.artist}`,this.crossfadeSeconds>0)b.getInstance().fadeIn(this.crossfadeSeconds);else b.getInstance().resetFade()}onTick($,X){if(!X||this.crossfadeSeconds<=0||X.durationSecs<=0)return;let J=X.durationSecs-$;if(this.fadeOutTriggered&&J>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),b.getInstance().resetFade();return}if(J<=this.crossfadeSeconds&&!this.fadeOutTriggered&&J>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${J.toFixed(1)}s remaining)...`),b.getInstance().fadeOut(J),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let Z=X.videoId||`${X.title}-${X.artist}`;if(this.currentTrackId===Z)console.log("[YTMD Crossfade] Advancing to next track..."),O.next()},Math.max(100,(J-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class _1{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled($){this.enabled=$}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick($,X,J){if(!this.enabled||!X||!J||J.paused||J.ended)return;let Z=b.getInstance().getAudioPowerDb();if(Z===null)return;if(!this.checkedIntro&&$<15)if(Z<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&$<12)console.log(`[YTMD Skip Silence] Intro silence detected (${Z.toFixed(1)} dB). Fast forwarding...`),J.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(X.durationSecs>15&&$>X.durationSecs-10)if(Z<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${Z.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,O.next()}else this.consecutiveSilentTicks=0}}var d=null,t=null,g0=null;function E6($){let X=$.equalizer_gains;return Boolean($.equalizer_enabled||$.loudness_normalization||$.skip_silence_enabled||typeof $.crossfade_seconds==="number"&&$.crossfade_seconds>0||typeof $.preamp_gain==="number"&&$.preamp_gain!==0||Array.isArray(X)&&X.some((J)=>J!==0))}var w5={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit($){let X=b.getInstance(),J=new A1,Z=new _1;d=J,t=Z;let z=$.config,Y=null,G=()=>{if(Y!==null)return;let Q=$.getVideoElement();if(Q){if(!X.isInitializedFor(Q))X.init(Q);return}Y=window.setInterval(()=>{let j=$.getVideoElement();if(j){if(Y!==null)clearInterval(Y);Y=null,X.init(j)}},500)};if(E6(z))G();if(z.equalizer_gains&&Array.isArray(z.equalizer_gains))X.setAllGains(z.equalizer_gains);else if(z.equalizer_preset&&typeof z.equalizer_preset==="string")X.applyPreset(z.equalizer_preset);if(z.preamp_gain!==void 0)X.setPreamp(z.preamp_gain);if(z.loudness_normalization!==void 0)X.setLoudnessNormalization(Boolean(z.loudness_normalization));if(z.crossfade_seconds!==void 0)J.setCrossfadeSeconds(z.crossfade_seconds);if(z.skip_silence_enabled!==void 0)Z.setEnabled(Boolean(z.skip_silence_enabled));if(z.playback_speed!==void 0)X.setPlaybackRate(z.playback_speed);if(z.preserve_pitch!==void 0)X.setPreservesPitch(Boolean(z.preserve_pitch));let W=[];if(window.__TAURI__?.event){let{listen:Q}=window.__TAURI__.event;W.push(Q("set-eq-band",(j)=>{G(),X.setBandGain(j.payload.bandIndex,j.payload.gain)}),Q("set-eq-all",(j)=>{G(),X.setAllGains(j.payload.gains)}),Q("set-eq-preset",(j)=>{G(),X.applyPreset(j.payload)}),Q("set-preamp",(j)=>{G(),X.setPreamp(j.payload)}),Q("set-loudness-normalization",(j)=>{if(j.payload)G();X.setLoudnessNormalization(j.payload)}),Q("set-crossfade-seconds",(j)=>{if(j.payload>0)G();J.setCrossfadeSeconds(j.payload)}),Q("set-skip-silence",(j)=>{if(j.payload)G();Z.setEnabled(j.payload)}),Q("set-playback-rate",(j)=>{X.setPlaybackRate(j.payload)}),Q("set-preserves-pitch",(j)=>{X.setPreservesPitch(j.payload)}))}g0=()=>{if(Y!==null)clearInterval(Y),Y=null;W.forEach((Q)=>Q.then((j)=>j())),d?.destroy(),d=null,t=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange($){if(b.getInstance().applyRateAndPitch(),d)d.onTrackChange($);if(t)t.onTrackChange()},onTick($,X){if(a())return;if(d)d.onTick($,X.track);if(t)t.onTick($,X.track,X.getVideoElement())},onDestroy(){if(g0)g0(),g0=null}};var P1=($,X,J)=>{let Z=(Y)=>Math.max(0,Math.min(255,Math.round(Y))),z=(Y)=>Z(Y).toString(16).padStart(2,"0");return`#${z($)}${z(X)}${z(J)}`};async function f5($){return new Promise((X)=>{let J={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!$){X(J);return}let Z=new Image;Z.crossOrigin="anonymous",Z.onload=()=>{try{let z=document.createElement("canvas");z.width=16,z.height=16;let Y=z.getContext("2d");if(!Y){X(J);return}Y.drawImage(Z,0,0,16,16);let G=Y.getImageData(0,0,16,16).data,W=0,Q=0,j=0,H=0,U=0,N=0,V=0,L=0;for(let R=0;R<G.length;R+=4){let E=G[R],f=G[R+1],h=G[R+2];if(G[R+3]<128)continue;let u1=(E+f+h)/3;if(u1<20||u1>240)continue;if(R<G.length/2)W+=E,Q+=f,j+=h,H++;else U+=E,N+=f,V+=h,L++}if(H===0&&L===0){X(J);return}let F=H>0?Math.round(W/H):220,D=H>0?Math.round(Q/H):38,C=H>0?Math.round(j/H):38,_=L>0?Math.round(U/L):24,B0=L>0?Math.round(N/L):24,n=L>0?Math.round(V/L):27;X({primary:P1(F,D,C),secondary:P1(_,B0,n),accent:P1(F+30,D+30,C+30)})}catch{X(J)}},Z.onerror=()=>X(J),Z.src=$})}var v=48,h6=3,k6=3,S6=1.65,I6=0.55;function g6($,X,J,Z){let z=new Float32Array($.length),Y=(G,W,Q)=>{let j=Q?J:X,H=Q?X:J;for(let U=0;U<j;U++)for(let N=0;N<4;N++)for(let V=0;V<H;V++){let L=0,F=0;for(let C=Math.max(0,V-Z);C<=Math.min(H-1,V+Z);C++){let _=Q?(U*X+C)*4+N:(C*X+U)*4+N;L+=G[_],F++}let D=Q?(U*X+V)*4+N:(V*X+U)*4+N;W[D]=L/F}};Y($,z,!0),Y(z,$,!1)}function x6($,X,J){for(let Z=0;Z<$.length;Z+=4){let z=$[Z],Y=$[Z+1],G=$[Z+2],W=0.2126*z+0.7152*Y+0.0722*G;$[Z]=(W+(z-W)*X)*J,$[Z+1]=(W+(Y-W)*X)*J,$[Z+2]=(W+(G-W)*X)*J}}async function T5($,X=I6){if(!$)return null;return new Promise((J)=>{let Z=new Image;Z.crossOrigin="anonymous",Z.onload=()=>{try{let z=document.createElement("canvas");z.width=v,z.height=v;let Y=z.getContext("2d");if(!Y)return J(null);Y.imageSmoothingQuality="high",Y.drawImage(Z,0,0,v,v);let G=Y.getImageData(0,0,v,v);for(let W=0;W<k6;W++)g6(G.data,v,v,h6);x6(G.data,S6,X),Y.putImageData(G,0,0),J(z.toDataURL("image/png"))}catch{J(null)}},Z.onerror=()=>J(null),Z.src=$})}var x0=null,y0=null,v0,E5={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit($){let X=document.getElementById("ytmd-ambient-backdrop");if(!X)X=q("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(X);X.replaceChildren();let J=q("img",{id:"ytmd-ambient-cover"});J.alt="";let Z=q("div",{id:"ytmd-ambient-veil"});X.appendChild(J),X.appendChild(Z);let z=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6,Y=$.config.ambient_lighting_enabled!==!1,G=document.createElement("style");G.id="ytmd-ambient-styles",G.textContent=`
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
    `,document.head.appendChild(G),x0=(Q)=>{if(X)X.style.opacity=String(Q)};let W=[];if(window.__TAURI__?.event)W.push(window.__TAURI__.event.listen("set-ambient-intensity",(Q)=>{x0?.(Q.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(Q)=>{let j=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6;x0?.(Q.payload?j:0)}));if(y0=()=>{W.forEach((Q)=>Q.then((j)=>j())),x0=null,v0=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},$.track)this.onTrackChange($.track,$)},async onTrackChange($){let X=$.coverUrl||null;if(X===v0)return;v0=X;let J=document.getElementById("ytmd-ambient-cover");if(J){let Z=X?await T5(X):null;if(X!==v0)return;if(J.style.opacity=Z?"1":"0",Z)J.src=Z}try{let Z=await f5(X||""),z=document.documentElement.style;z.setProperty("--ytmd-accent",Z.accent),z.setProperty("--ytmd-accent-primary",Z.primary),z.setProperty("--ytmd-accent-secondary",Z.secondary)}catch{}},onDestroy(){if(y0)y0(),y0=null}};var h5=`
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

`,k5=`
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

`;var p0=null,S5={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit($){let X=()=>document.head||document.documentElement,J=(W)=>{let Q=document.getElementById(W);if(!Q){Q=document.createElement("style"),Q.id=W;let j=X();if(j)j.appendChild(Q)}return Q},Z=(W)=>{let Q=J("ytmd-active-theme");Q.textContent=W?h5:k5},z=(W)=>{let Q=J("ytmd-custom-css");if(Q)Q.textContent=W};Z($.config.ambient_lighting_enabled!==!1);let Y=$.config.custom_css||"";z(Y);let G=[];if(window.__TAURI__?.event)G.push(window.__TAURI__.event.listen("set-ambient-enabled",(W)=>{Z(W.payload)}),window.__TAURI__.event.listen("set-custom-css",(W)=>{z(W.payload)}));p0=()=>{G.forEach((W)=>W.then((Q)=>Q()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(p0)p0(),p0=null}};var m0=null,I5={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit($){let X=()=>{if(document.getElementById("ytmd-pip-btn"))return;let Z=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(Z){let z=k({id:"ytmd-pip-btn",label:K().pipButton,iconPath:P.pip});z.addEventListener("click",async()=>{let Y=$.getVideoElement();if(!Y)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await Y.requestPictureInPicture();else await $.invoke("toggle_mini_player")}catch(G){console.warn("[YTMD PiP] Could not enter PiP:",G),await $.invoke("toggle_mini_player").catch((W)=>console.error("[YTMD PiP] Mini player fallback failed:",W))}}),Z.appendChild(z)}},J=window.setInterval(X,1000);X(),m0=()=>{clearInterval(J),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(m0)m0(),m0=null}};function y6($){if($.error)return"failed";if($.output_path&&$.percent>=100)return"done";return"progress"}var c0="ytmd-download-btn",v6=3000,e=new Map,b1=new Set,d0=null,u0=null;function $0(){let $=document.getElementById(c0);if(!$)return;let X=d0?.videoId,J=X?e.get(X):void 0;H5($,J?Math.max(0.05,J.fraction):null),Q5($,X&&b1.has(X)?P.check:P.download),$.setAttribute("aria-disabled",X?"false":"true");let Z=J?K().downloadInProgress:K().downloadButton;$.setAttribute("aria-label",Z),$.dataset.ytmdTooltip=Z}function R1($,X){let J=e.get($);if(!J)return;if(e.delete($),X.ok)b1.add($),setTimeout(()=>{b1.delete($),$0()},v6),B(K().downloadDone(J.title),{id:`download-${$}`});else B(K().downloadFailed(X.reason),{id:`download-${$}`,durationMs:8000});$0()}function p6($){let X=e.get($.video_id);if(!X)return;let J=y6($);if(J==="failed")R1($.video_id,{ok:!1,reason:$.error||$.status});else if(J==="done")R1($.video_id,{ok:!0});else X.fraction=$.percent/100,$0()}function w1($,X){let J=X?.videoId;if(!X||!J){B(K().downloadNoTrack);return}if(e.has(J)){B(K().downloadInProgress);return}e.set(J,{title:X.title,fraction:0}),$0(),B(K().downloadStarted(X.title),{id:`download-${J}`}),$.invoke("download_track",{request:{video_id:J,title:X.title,artist:X.artist,album:X.album||void 0,cover_url:X.coverUrl||void 0,format:$.config.download_format||"mp3",embed_lyrics:$.config.embed_lyrics!==!1}}).catch((Z)=>{console.error("[YTMD Downloader] Download failed:",Z),R1(J,{ok:!1,reason:Z instanceof Error?Z.message:String(Z)})})}var g5={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit($){d0=$.track;let X=()=>{if(document.getElementById(c0))return;let z=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(!z)return;let Y=k({id:c0,label:K().downloadButton,iconPath:P.download});Y.addEventListener("click",()=>{if(Y.getAttribute("aria-disabled")==="true")return;w1($,d0)}),z.appendChild(Y),$0()},J=window.setInterval(X,1000);X();let Z=window.__TAURI__?.event?window.__TAURI__.event.listen("download-progress",(z)=>p6(z.payload)):null;u0=()=>{clearInterval(J),Z?.then((z)=>z()),document.getElementById(c0)?.remove()}},onTrackChange($){d0=$,$0()},onDestroy(){if(u0)u0(),u0=null}};var x5={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit($){console.log("[YTMD] Local files module ready.")}};var l0="ytmd-nav-slot",f1="ytmd-menu-btn",L0="ytmd-menu",y5="ytmd-sync-chip",p5=[],V0=null,m5=null,v5=!1,m6=`
  #${l0} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function u6(){if(document.getElementById("ytmd-nav-slot-styles"))return;let $=document.createElement("style");$.id="ytmd-nav-slot-styles",$.textContent=m6,document.head.appendChild($)}function c6($){if(!$)return;return`${K().syncInRoom} · ${K().syncListeners($.listeners)}`}function u5($){p5=$.items,m5=$.onSyncChipClick}function T1(){if(document.getElementById(l0)?.isConnected)return;let $=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!$)return;w(),u6();let X=q("div",{id:l0}),J=k({id:f1,label:K().menuLabel,iconPath:P.apps});J.setAttribute("aria-haspopup","menu"),J.setAttribute("aria-expanded","false"),J.addEventListener("click",(Z)=>{Z.stopPropagation(),l6(J)}),X.appendChild(J),$.prepend(X),c5(),n6()}function E1($){V0=$,c5();let X=document.getElementById(L0);if(X?.classList.contains("ytmd-open"))d5(X)}function c5(){let $=document.getElementById(l0);if(!$)return;let X=document.getElementById(y5);if(!V0){X?.remove();return}if(!X)X=q("button",{id:y5,className:"ytmd-chip"}),X.type="button",X.addEventListener("click",()=>m5?.()),$.prepend(X);let J=K().syncListeners(V0.listeners);X.replaceChildren(q("span",{className:"ytmd-chip-dot"}),H0(P.group,18),q("span",{text:J})),X.dataset.ytmdTooltip=`${K().syncInRoom} · ${V0.roomCode}`,X.setAttribute("aria-label",`${K().syncInRoom}, ${J}`)}function d5($){let X=[];for(let J of p5){if(J.dividerBefore)X.push(q("div",{className:"ytmd-menu-divider"}));let Z=q("button",{className:"ytmd-menu-item"});Z.type="button",Z.setAttribute("role","menuitem"),Z.dataset.itemId=J.id;let z=q("span",{className:"ytmd-menu-item-text"});z.appendChild(q("span",{text:J.label}));let Y=J.id==="sync"?c6(V0):void 0;if(Y)z.appendChild(q("span",{className:"ytmd-menu-item-sub",text:Y}));if(Z.append(H0(J.iconPath),z),J.hint)Z.appendChild(q("span",{className:"ytmd-menu-item-hint",text:J.hint}));Z.addEventListener("click",()=>{X0(),J.onSelect()}),X.push(Z)}$.replaceChildren(...X)}function d6(){let $=document.getElementById(L0);if(!$)$=q("div",{id:L0,className:"ytmd-menu"}),$.setAttribute("role","menu"),$.addEventListener("keydown",s6),document.body.appendChild($);return $}function l6($){let X=d6();if(X.classList.contains("ytmd-open")){X0();return}d5(X);let J=$.getBoundingClientRect();X.style.top=`${J.bottom+4}px`,X.style.right=`${Math.max(8,window.innerWidth-J.right)}px`,X.classList.add("ytmd-open"),$.setAttribute("aria-expanded","true"),X.querySelector(".ytmd-menu-item")?.focus()}function X0(){let $=document.getElementById(L0);if(!$?.classList.contains("ytmd-open"))return;$.classList.remove("ytmd-open");let X=document.getElementById(f1);if(X?.setAttribute("aria-expanded","false"),$.contains(document.activeElement))X?.focus()}function s6($){let X=$.currentTarget,J=Array.from(X.querySelectorAll(".ytmd-menu-item")),Z=J.indexOf(document.activeElement);if($.key==="Escape")$.stopPropagation(),X0();else if($.key==="ArrowDown")$.preventDefault(),J[(Z+1)%J.length]?.focus();else if($.key==="ArrowUp")$.preventDefault(),J[(Z-1+J.length)%J.length]?.focus();else if($.key==="Tab")X0()}function n6(){if(v5)return;v5=!0,document.addEventListener("mousedown",($)=>{let X=document.getElementById(L0);if(!X?.classList.contains("ytmd-open"))return;let J=$.target;if(X.contains(J)||document.getElementById(f1)?.contains(J))return;X0()}),window.addEventListener("resize",X0)}function l5($){return $.is_host?"host":$.role??"dj"}function p($){return $!=="listener"}function s5($){return Math.floor($/2)+1}function a6($,X,J){let Z=0;return X.forEach((z,Y)=>{if(Y!==J&&$>z)Z++}),Z}var s0=null;function n5($,X){if(!s0)return;let J=[...$.querySelectorAll(X)].find((Z)=>Z.dataset.itemId===s0);if(J)J.focus(),s0=null}function a5({list:$,rowSelector:X,handleSelector:J,onMove:Z}){let z=()=>[...$.querySelectorAll(X)],Y=()=>z().forEach((V)=>V.classList.remove("is-dragging","drop-before","drop-after")),G=null,W=(V,L)=>{let F=z().filter((D,C)=>C!==L);if(F.forEach((D)=>D.classList.remove("drop-before","drop-after")),V<F.length)F[V].classList.add("drop-before");else F[F.length-1]?.classList.add("drop-after")},Q=(V)=>{if(V.button!==0||!(V.target instanceof Element))return;let L=V.target.closest(J),F=L?.closest(X);if(!L||!F||!L.dataset.itemId)return;let D=z().indexOf(F);if(D<0)return;V.preventDefault();try{L.setPointerCapture(V.pointerId)}catch{}G={from:D,itemId:L.dataset.itemId,to:D,pointerId:V.pointerId,handle:L},F.classList.add("is-dragging")},j=(V)=>{if(!G||V.pointerId!==G.pointerId)return;let L=z().map((F)=>{let D=F.getBoundingClientRect();return D.top+D.height/2});G.to=a6(V.clientY,L,G.from),W(G.to,G.from)},H=(V)=>{if(!G||V.pointerId!==G.pointerId)return;let{from:L,to:F,itemId:D,handle:C}=G;if(G=null,C.hasPointerCapture(V.pointerId))C.releasePointerCapture(V.pointerId);if(Y(),F!==L)Z(L,F,D)},U=(V)=>{if(V.key!=="ArrowUp"&&V.key!=="ArrowDown"||!(V.target instanceof Element))return;let L=V.target.closest(J),F=L?.closest(X);if(!L||!F||!L.dataset.itemId)return;V.preventDefault();let D=z(),C=D.indexOf(F),_=V.key==="ArrowUp"?C-1:C+1;if(C<0||_<0||_>=D.length)return;s0=L.dataset.itemId,Z(C,_,L.dataset.itemId)},N=()=>{G=null,Y()};return $.addEventListener("pointerdown",Q),$.addEventListener("pointermove",j),$.addEventListener("pointerup",H),$.addEventListener("pointercancel",N),$.addEventListener("keydown",U),()=>{$.removeEventListener("pointerdown",Q),$.removeEventListener("pointermove",j),$.removeEventListener("pointerup",H),$.removeEventListener("pointercancel",N),$.removeEventListener("keydown",U)}}var r5="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var Z0="ytmd-sync-queue",h1="ytmd-sync-queue-styles",n0="data-ytmd-sync-queue",O0="data-ytmd-sync-queue-tab",r6="M8 5v14l11-7z",i6="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",o6=/^[A-Za-z0-9_-]{11}$/;function t5($){if(typeof $!=="object"||$===null)return null;let X=$.serviceEndpoint?.queueAddEndpoint;if(typeof X!=="object"||X===null)return null;let{queueTarget:J,queueInsertPosition:Z}=X;return{videoId:typeof J?.videoId==="string"&&o6.test(J.videoId)?J.videoId:null,next:Z==="INSERT_AFTER_CURRENT_VIDEO"}}function t6($){return`
  html[${n0}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${n0}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify($)};
    font-size: 14px;
  }
  html[${O0}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${Z0} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${O0}] #${Z0} { display: block; }
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
`}function e6($){w();let X=document.getElementById(h1);if(!X)X=q("style",{id:h1}),document.head.appendChild(X);let J=t6($);if(X.textContent!==J)X.textContent=J}var e5=".ytmd-sq-handle",$$=".ytmd-sq-queued";function i5($){let X=q("div",{className:"ytmd-sq-row"}),J=q("img",{className:"ytmd-sq-thumb"});J.alt="",J.loading="lazy",J.src=`https://i.ytimg.com/vi/${$.videoId}/default.jpg`;let Z=q("div",{className:"ytmd-sq-text"});if(Z.append(q("span",{className:"ytmd-sq-title",text:$.title}),q("span",{className:"ytmd-sq-sub",text:$.sub})),$.handle)X.appendChild($.handle);if(X.append(J,Z),$.actions.length){let z=q("div",{className:"ytmd-sq-actions"});z.append(...$.actions),X.appendChild(z)}return X}function o5($,X,J){let Z=k({label:$,iconPath:X,muted:!0});return Z.addEventListener("click",(z)=>{z.stopPropagation(),J()}),Z}function $8($,X,J){let Z=K(),z=[];if(X.nowPlaying)z.push(q("div",{className:"ytmd-sq-heading",text:Z.syncQueueNowPlaying})),z.push(i5({...X.nowPlaying,sub:X.nowPlaying.artist,actions:[]}));if(z.push(q("div",{className:"ytmd-sq-heading",text:Z.syncQueueTitle})),X.queue.length===0)z.push(q("p",{className:"ytmd-sq-hint",text:p(X.myRole)?Z.syncQueueEmpty:Z.syncQueueListenerHint}));let Y=X.myRole==="host"||X.myRole==="moderator";for(let G of X.queue){let W=[];if(p(X.myRole))W.push(o5(Z.syncQueuePlayNow(G.title),r6,()=>J.play(G.id)));if(Y||G.added_by_id===X.myId)W.push(o5(Z.syncQueueRemove(G.title),i6,()=>J.remove(G.id)));let Q;if(p(X.myRole)&&X.queue.length>1)Q=k({label:Z.syncQueueDrag(G.title),iconPath:r5,muted:!0}),Q.classList.add("ytmd-sq-handle"),Q.dataset.itemId=G.id;let j=Z.syncQueueFrom(G.added_by),H=i5({videoId:G.video_id,title:G.title,sub:G.artist?`${G.artist} · ${j}`:j,actions:W,handle:Q});H.classList.add("ytmd-sq-queued"),z.push(H)}$.replaceChildren(...z),n5($,e5)}var J0=null;function a0(){let $=document.documentElement;if(!J0){$.removeAttribute(O0);return}let X=document.querySelector("ytmusic-player-page #side-panel"),J=document.getElementById(Z0);if(X&&J?.parentElement!==X){if(!J)J=q("div",{id:Z0}),a5({list:J,rowSelector:$$,handleSelector:e5,onMove:(z,Y,G)=>J0?.actions.move(G,Y)});J.setAttribute("role","region"),J.setAttribute("aria-label",K().syncQueueTitle),$8(J,J0.model,J0.actions),X.insertBefore(J,X.querySelector(":scope > #tab-renderer"))}let Z=document.querySelector("ytmusic-player-page tp-yt-paper-tab");$.toggleAttribute(O0,!!J?.isConnected&&Z?.getAttribute("aria-selected")==="true")}function X8($,X){J0={model:$,actions:X},e6(K().syncQueueTab),document.documentElement.setAttribute(n0,"");let J=document.getElementById(Z0);if(J)$8(J,$,X);a0()}function k1(){J0=null,document.documentElement.removeAttribute(n0),document.documentElement.removeAttribute(O0),document.getElementById(Z0)?.remove(),document.getElementById(h1)?.remove()}function z0($){if($.is_host)return"host";let X=$.members.find((J)=>J.id===$.current_user_id);return X?l5(X):"dj"}function X$($,X,J){let Z=new Set($.map((Y)=>Y.id)),z=new Set(X.map((Y)=>Y.id));return{joined:X.filter((Y)=>Y.id!==J&&!Z.has(Y.id)).map((Y)=>Y.nickname),left:$.filter((Y)=>Y.id!==J&&!z.has(Y.id)).map((Y)=>Y.nickname)}}var l=/^[A-Za-z0-9_-]{11}$/,J$=2,Z$=0.25,z$=0.05,Y$=3,J8=0.1,G$=0.5,W$=1,j$=1000,Q$=1,Z8=5000,H$=4000,z8=15000,K$=3,F$=4000,Y8=1,q$=1e4,U$=5,N$=1e4,V$=1.2;function G8($,X){return Number.isFinite(X)&&X>Y8?Math.min($,X-Y8):$}function L$($,X,J){let Z={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(l.test($.video_id)&&X.videoId!==$.video_id)return Z.navigateTo=$.video_id,Z;if($.is_playing===X.paused)Z.setPlaying=$.is_playing;if(!$.is_playing){if(Math.abs(X.currentTime-$.current_time_secs)>G$)Z.seekTo=G8($.current_time_secs,X.duration);return Z}let z=$.current_time_secs+Math.min(W$,Math.max(0,J)),Y=z-X.currentTime;if(Math.abs(Y)>J$)Z.seekTo=G8(z,X.duration);else if(Math.abs(Y)>(X.correcting?z$:Z$))Z.playbackRate=1+Math.max(-J8,Math.min(J8,Y/Y$));return Z}class W8{windowSize;samples=[];constructor($=30){this.windowSize=$}transitSecs($,X){let J=X-$;if(this.samples.push(J),this.samples.length>this.windowSize)this.samples.shift();return(J-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function O$($,X){return X!==null&&$<X&&X-$<N$}function j8($,X){switch($){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:X};default:return null}}var D$=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function Q8(){return new URLSearchParams(window.location.search).get("v")}function r0($){let X=document.getElementById("movie_player"),J=X?.getVideoData?.()?.video_id,Z=X?.getCurrentTime?.();if(J&&l.test(J)&&typeof Z==="number"&&Number.isFinite(Z))return{videoId:J,currentTime:Z};return{videoId:Q8(),currentTime:$?$.currentTime:0}}function S1(){let $=document.getElementById("movie_player");return!!$&&($.classList.contains("ad-showing")||$.classList.contains("ad-interrupting"))}function D0($){let X=document.querySelector("ytmusic-app");if(!X){window.location.href=`https://music.youtube.com/watch?v=${$}`;return}X.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:$}}}}))}class H8{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor($=B){this.notify=$}lastBroadcast=null;pendingNav=null;transit=new W8;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;finished=null;rateCorrection=null;setRoomState($,X,J=!0){let Z=$!==this.inRoom||X!==this.isHost;if(this.inRoom=$,this.isHost=X,this.canControl=J,n1(this.isGuest()),!Z)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback($,X,J=Date.now()){if(!this.isGuest()||S1())return;if(O$($.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=$.timestamp_ms;let Z=this.transit.transitSecs($.timestamp_ms,J);if(l.test($.video_id))this.hostVideoId=$.video_id;let z=this.requestedVideo;if(z){if($.video_id!==z.videoId&&J-z.atMs<H$)return;this.requestedVideo=null}let Y=r0(X);if(this.waitingForHostsNext($,Y.videoId,X,J)){this.endRateCorrection(),O.pause();return}let G={videoId:Y.videoId,paused:X?X.paused:!0,currentTime:Y.currentTime,duration:X?X.duration:NaN,correcting:this.rateCorrection!==null},W=L$($,G,Z);if(W.navigateTo){this.endRateCorrection();let Q=this.pendingNav;if(Q&&Q.videoId===W.navigateTo&&J-Q.atMs<Z8)return;let j=Q&&Q.videoId===W.navigateTo?Q.attempts+1:1;if(this.pendingNav={videoId:W.navigateTo,atMs:J,attempts:j},this.rememberOwnNav(W.navigateTo,J),O.pause(),j>1)window.location.href=`https://music.youtube.com/watch?v=${W.navigateTo}`;else D0(W.navigateTo);return}if(this.pendingNav=null,!X)return;if(W.setPlaying===!0)O.play();else if(W.setPlaying===!1)O.pause();if(W.seekTo!==null)this.endRateCorrection(),O.seekTo(W.seekTo);else this.setCatchUpRate(X,W.playbackRate)}waitingForHostsNext($,X,J,Z){let z=this.finished;return!!z&&$.video_id===z.videoId&&Z-z.atMs<q$&&z.duration-$.current_time_secs<U$&&(X!==z.videoId||!!J?.ended)}rememberOwnNav($,X){for(let[J,Z]of this.ownNavs)if(X-Z>z8)this.ownNavs.delete(J);this.ownNavs.set($,X)}setCatchUpRate($,X){if(X===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==$)this.endRateCorrection(),this.rateCorrection={video:$,rate:$.playbackRate,preservesPitch:$.preservesPitch};$.preservesPitch=!0,$.playbackRate=X}endRateCorrection(){let $=this.rateCorrection;if(!$)return;this.rateCorrection=null,$.video.playbackRate=$.rate,$.video.preservesPitch=$.preservesPitch}noteLocalTick($,X=Date.now()){if(!this.isGuest()||!$)return;if(Number.isFinite($.duration)&&$.duration>0&&$.duration-$.currentTime<K$){this.nearEndAtMs=X;let{videoId:J}=r0($);if(J)this.finished={videoId:J,duration:$.duration,atMs:X}}}handleLocalTrackChange($,X=Date.now()){if(!this.isGuest()||!this.canControl||!$||!l.test($))return null;if(this.hostVideoId===null||$===this.hostVideoId)return null;let J=this.ownNavs.get($);if(J!==void 0&&X-J<z8)return null;if(X-this.nearEndAtMs<F$)return null;if(this.requestedVideo?.videoId===$)return null;return this.requestedVideo={videoId:$,atMs:X},{kind:"play_video",video_id:$}}requestControl($,X){if(!this.canControl){if($.kind!=="next"){this.notify(K().syncListenerOnly);return}X("vote_sync_skip").then(()=>this.notify(K().syncVotedSkip)).catch((J)=>{console.error("[YTMD Room Sync] vote failed:",J),this.notify(K().actionFailed)});return}X("send_sync_control",{action:$}).catch((J)=>{console.error("[YTMD Room Sync] control request failed:",J),this.notify(K().actionFailed)})}applyRemoteControl($){if(!this.inRoom||!this.isHost)return;let{from:X,action:J,source:Z}=$,z=Z?.kind==="vote"?K().syncVoteSkipped:Z?.kind==="queue"?K().syncFromQueue(Z.title,X):null;switch(J.kind){case"next":O.next(),this.notify(z??K().syncGuestNext(X));break;case"previous":O.previous(),this.notify(z??K().syncGuestPrevious(X));break;case"set_playing":{let Y=O.getVideo();if(!Y||Y.paused!==J.playing)return;if(J.playing)O.play();else O.pause();this.notify(z??(J.playing?K().syncGuestResumed(X):K().syncGuestPaused(X)));break}case"play_video":if(!l.test(J.video_id)||J.video_id===Q8())return;D0(J.video_id),this.notify(z??K().syncGuestPicked(X));break}}advanceQueue($,X,J){if(!X||S1())return;let Z=X.duration-X.currentTime;if(!Number.isFinite(Z)||Z>V$&&!X.ended)return;this.playNextFromQueue($,J,X,!1)}playNextFromQueue($,X,J=O.getVideo(),Z=!0,z=Date.now()){if(!this.inRoom||!this.isHost||$===0)return!1;let{videoId:Y}=r0(J),G=this.queueAdvance;if(G&&G.from===Y&&z-G.atMs<Z8)return!0;this.queueAdvance={from:Y,atMs:z};let W=()=>{if(Z)O.nextInYtm()};return X("sync_queue_take_next").then((Q)=>{let j=Q;if(!j||!l.test(j.video_id)){W();return}O.pause(),D0(j.video_id),this.notify(K().syncFromQueue(j.title,j.added_by))}).catch((Q)=>{console.error("[YTMD Room Sync] playing from the shared queue failed:",Q),W()}),!0}broadcastLocalState($,X,J,Z=!1){if(!this.inRoom||!this.isHost||!$||!X||S1())return;if(X.ended)return;let{videoId:z,currentTime:Y}=r0(X);if(!z)return;let G=Date.now(),W=this.lastBroadcast,Q=W?W.position+(G-W.atMs)/1000*W.rate:0,j=!!W&&W.playing&&!X.paused&&Math.abs(Y-Q)>Q$,H=!!W&&W.videoId!==z;if(!Z&&!j&&!H&&W&&G-W.atMs<j$)return;this.lastBroadcast={atMs:G,videoId:z,position:Y,rate:X.playbackRate,playing:!X.paused},J("broadcast_sync_state",{playback:{video_id:z,title:$.title,artist:$.artist,current_time_secs:Y,is_playing:!X.paused,timestamp_ms:G}}).catch((U)=>console.error("[YTMD Room Sync] broadcast failed:",U))}}var T=null,s=null,i0=null,g=null,g1=null,C$=1000;function K8(){let $=g,X=s;if(!$||!X){k1();return}let J=g1,Z=(z)=>(Y)=>{X(z,{itemId:Y}).catch((G)=>{console.error(`[YTMD Room Sync] ${z} failed:`,G),B(K().actionFailed)})};X8({queue:$.queue??[],nowPlaying:J?.videoId&&l.test(J.videoId)?{videoId:J.videoId,title:J.title,artist:J.artist}:null,myId:$.current_user_id,myRole:z0($)},{play:Z("sync_queue_play"),remove:Z("sync_queue_remove"),move:(z,Y)=>{X("sync_queue_move",{itemId:z,toIndex:Y}).catch((G)=>{console.error("[YTMD Room Sync] sync_queue_move failed:",G),B(K().actionFailed)})}})}function B$(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function M$($,X){if(!g||!p(z0(g))){B(K().syncQueueListenerNo);return}if(!$.videoId){B(K().syncQueueSongsOnly);return}X("sync_queue_add",{input:$.videoId,next:$.next}).then(()=>B($.next?K().syncQueuedNext:K().syncQueued)).catch((J)=>{console.error("[YTMD Room Sync] adding to the shared queue failed:",J),B(K().actionFailed)})}function F8($){let X=T;if(!X||!s||!X.isGuest())return!1;let J=O.getVideo(),Z=j8($,J?J.paused:!0);if(!Z)return!1;return X.requestControl(Z,s),!0}function q8($){let X=T;if(!X||!s||!X.isGuest())return!1;return X.requestControl({kind:"play_video",video_id:$},s),!0}function I1($,X,J="left"){let Z=g;if(g=$,E1($?{roomCode:$.room_code,listeners:$.members.length,isHost:$.is_host}:null),K8(),!X)return;if(!$){if(!Z)return;B(J==="kicked"?K().syncKicked:J==="lost"?K().syncLost:K().syncRoomClosed);return}if(!Z||Z.room_code!==$.room_code){if(!$.is_host)B(K().syncConnected);return}if($.reconnecting){if(!Z.reconnecting)B(K().syncReconnecting);return}let z=(U)=>U.members.find((N)=>N.is_host)?.id;if(z(Z)!==z($)){let U=$.members.find((N)=>N.is_host);if($.is_host)B(K().syncYouHost);else if(U)B(K().syncNewHost(U.nickname));return}if(Z.reconnecting)return;let{joined:Y,left:G}=X$(Z.members,$.members,$.current_user_id),W=[...Y.map(K().syncJoined),...G.map(K().syncLeft)],Q=$.skip_votes??[],j=Q.filter((U)=>U!==$.current_user_id&&!(Z.skip_votes??[]).includes(U));for(let U of j){let N=$.members.find((V)=>V.id===U)?.nickname;if(N)W.push(K().syncVoteProgress(N,Q.length,s5($.members.length)))}let H=z0($);if(H!==z0(Z))W.push(H==="moderator"?K().syncRoleModerator:H==="listener"?K().syncRoleListener:K().syncRoleDj);if(W.length>0)B(W.join(" · "))}var U8={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit($){let X=new H8;T=X,s=$.invoke;let J=[];if(window.__TAURI__?.event)J.push(window.__TAURI__.event.listen("sync-room-updated",(Y)=>{X.setRoomState(!0,Y.payload.is_host,p(z0(Y.payload))),I1(Y.payload,!0)}),window.__TAURI__.event.listen("sync-room-left",(Y)=>{X.setRoomState(!1,!1),I1(null,!0,Y.payload?.reason??"left")}),window.__TAURI__.event.listen("sync-playback-remote",(Y)=>{X.handleRemotePlayback(Y.payload,$.getVideoElement())}),window.__TAURI__.event.listen("sync-control-remote",(Y)=>{X.applyRemoteControl(Y.payload)}),window.__TAURI__.event.listen("sync-reaction",(Y)=>{K5(Y.payload.emoji,Y.payload.from)}));let Z=(Y)=>{if(!(Y.target instanceof Element))return;let G=Y.target;if(G.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(a0,0);if(X.isInRoom()){let H=G.closest("ytmusic-menu-service-item-renderer"),U=H?t5(H.data):null;if(U){Y.preventDefault(),Y.stopImmediatePropagation(),B$(),M$(U,$.invoke);return}}if(!Y.isTrusted)return;if(X.isRoomHost()&&G.closest("ytmusic-player-bar .next-button")&&X.playNextFromQueue(g?.queue?.length??0,$.invoke)){Y.preventDefault(),Y.stopImmediatePropagation();return}if(!X.isGuest())return;let W=D$.find(([H])=>G.closest(H));if(!W)return;let Q=$.getVideoElement(),j=j8(W[1],Q?Q.paused:!0);if(!j)return;Y.preventDefault(),Y.stopImmediatePropagation(),X.requestControl(j,$.invoke)};window.addEventListener("click",Z,!0);let z=setInterval(a0,C$);j1(()=>X.playNextFromQueue(g?.queue?.length??0,$.invoke)),$.invoke("get_sync_room_state").then((Y)=>{if(T!==X||!Y||typeof Y!=="object")return;let G=Y;if(X.setRoomState(!0,G.is_host,p(z0(G))),I1(G,!1),!G.is_host&&G.playback_state)X.handleRemotePlayback(G.playback_state,$.getVideoElement())}).catch((Y)=>console.error("[YTMD Room Sync] failed to restore room state:",Y)),i0=()=>{J.forEach((Y)=>Y.then((G)=>G())),window.removeEventListener("click",Z,!0),clearInterval(z),j1(null),X.setRoomState(!1,!1),T=null,s=null,g=null,g1=null,E1(null),k1()}},onTrackChange($,X){let J=T;if(!J)return;g1=$,K8(),J.broadcastLocalState($,X.getVideoElement(),X.invoke,!0);let Z=J.handleLocalTrackChange($.videoId);if(Z)J.requestControl(Z,X.invoke)},onPlaybackChange($,X){T?.broadcastLocalState(X.track,X.getVideoElement(),X.invoke,!0)},onTick($,X){let J=X.getVideoElement();T?.broadcastLocalState(X.track,J,X.invoke),T?.noteLocalTick(J),T?.advanceQueue(g?.queue?.length??0,J,X.invoke)},onDestroy(){if(i0)i0(),i0=null}};var o0=null,A$=($,X)=>X&&$!==!1,N8={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit($){let X=null,J=!1,Z=null,z=(N)=>{if(J===N)return;J=N,$.invoke("set_inhibit_sleep",{inhibit:N}).catch((V)=>{J=!N,console.error("[YTMD Power] set_inhibit_sleep failed:",V)})},Y=async()=>{if(!("wakeLock"in navigator)||X!==null)return;try{X=await navigator.wakeLock.request("screen"),X.addEventListener("release",()=>{X=null})}catch{}},G=()=>{X?.release().catch(()=>{}),X=null},W=()=>{let N=$.getVideoElement(),V=!!N&&!N.paused&&!N.ended,L=A$($.config.inhibit_sleep,V);if(z(L),L)Y();else G()},Q=(N)=>{for(let V of["play","playing","pause","ended"])N.addEventListener(V,W);Z=N},j=(N)=>{for(let V of["play","playing","pause","ended"])N.removeEventListener(V,W)},H=$.getVideoElement();if(H)Q(H);W();let U=window.setInterval(()=>{let N=$.getVideoElement();if(N&&N!==Z){if(Z)j(Z);Q(N),W()}},1000);o0=()=>{if(clearInterval(U),Z)j(Z);Z=null,G(),z(!1)}},onDestroy(){if(o0)o0(),o0=null}};var L8=($)=>typeof $==="object"&&$!==null&&!Array.isArray($),A=($,...X)=>X.reduce((J,Z)=>J==null?void 0:J[Z],$),e0=/^[A-Za-z0-9_-]{11}$/;function Y0($){let X=A($,"runs");if(Array.isArray(X))return X.map((Z)=>typeof A(Z,"text")==="string"?A(Z,"text"):"").join("");let J=A($,"simpleText");return typeof J==="string"?J:""}function x1($){if(!Array.isArray($)||$.length===0)return null;let X=A($[$.length-1],"url");return typeof X==="string"?X:null}function V8($,X){return Y0(A($,"flexColumns",X,"musicResponsiveListItemFlexColumnRenderer","text"))}function _$($){let X=A($,"playlistItemData","videoId")??A($,"overlay","musicItemThumbnailOverlayRenderer","content","musicPlayButtonRenderer","playNavigationEndpoint","watchEndpoint","videoId");if(typeof X!=="string"||!e0.test(X))return null;return{video_id:X,title:V8($,0),subtitle:V8($,1),thumbnail:x1(A($,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function P$($){let X=A($,"title","runs",0,"navigationEndpoint","watchEndpoint","videoId");if(typeof X!=="string"||!e0.test(X))return null;return{video_id:X,title:Y0(A($,"title")),subtitle:Y0(A($,"subtitle")),thumbnail:x1(A($,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function y1($,X=20){let J=[],Z=new Set,z=(Y,G)=>{if(J.length>=X||G>40)return;if(Array.isArray(Y)){for(let W of Y)z(W,G+1);return}if(!L8(Y))return;for(let[W,Q]of Object.entries(Y)){let j=null;if(W==="musicResponsiveListItemRenderer")j=_$(Q);else if(W==="musicCardShelfRenderer")j=P$(Q);if(j&&!Z.has(j.video_id)){if(Z.add(j.video_id),J.push(j),J.length>=X)return}z(Q,G+1)}};return z($,0),J}function t0($){let X=A($,"playlistPanelVideoRenderer")??A($,"playlistPanelVideoWrapperRenderer","primaryRenderer","playlistPanelVideoRenderer");return L8(X)?X:null}function O8($){let X=[];return $.forEach((J,Z)=>{let z=t0(J),Y=A(z,"videoId");if(!z||typeof Y!=="string")return;X.push({id:`${Z}:${Y}`,video_id:Y,title:Y0(A(z,"title")),artist:Y0(A(z,"shortBylineText"))||Y0(A(z,"longBylineText")),thumbnail:x1(A(z,"thumbnail","thumbnails")),current:A(z,"selected")===!0})}),X}function D8($,X){let J=X.indexOf(":");if(J<=0)return-1;let Z=Number(X.slice(0,J)),z=X.slice(J+1),Y=Number.isInteger(Z)?t0($[Z]):null;if(Y&&A(Y,"videoId")===z)return Z;return $.findIndex((G)=>A(t0(G),"videoId")===z)}function C8($,X){if(!X)return $.length;let J=$.findIndex((Z)=>A(t0(Z),"selected")===!0);return J>=0?J+1:$.length}function B8($,X,J=15000){if(!$)return!0;let{position_secs:Z,sampled_at_ms:z,...Y}=$,{position_secs:G,sampled_at_ms:W,...Q}=X;if(JSON.stringify(Y)!==JSON.stringify(Q))return!0;if(W-z>=J)return!0;let j=$.playing?Z+(W-z)/1000:Z;return Math.abs(G-j)>1.5}var b$="EgWKAQIIAWoMEA4QChADEAQQCRAF",R$=1000,w$=2000;function p1(){return document.querySelector("#queue")}function Y1(){let $=p1()?.queue?.store?.store?.getState().queue?.items;return Array.isArray($)?$:[]}function $1($,X){let J=p1();if(!J?.dispatch)throw Error("remote.error.noQueue");J.dispatch({type:$,payload:X})}function A8(){let $=document.querySelector("ytmusic-app")?.networkManager;if(!$||typeof $.fetch!=="function")throw Error("remote.error.unsupported");return $}async function f$($){let X=A8(),J=y1(await X.fetch("/search",{query:$,params:b$}));if(J.length===0)J=y1(await X.fetch("/search",{query:$}));return J}async function T$($,X){let J=p1()?.queue?.store?.store;if(!J)throw Error("remote.error.noQueue");let Z=J.getState().queue??{},Y=(await A8().fetch("/music/get_queue",{queueContextParams:Z.queueContextParams,queueInsertPosition:X?"INSERT_AFTER_CURRENT_VIDEO":"INSERT_AT_END",videoIds:[$]}))?.queueDatas,G=Array.isArray(Y)?Y.map((Q)=>Q&&typeof Q==="object"&&("content"in Q)?Q.content:null).filter(Boolean):[];if(G.length===0)throw Error("remote.error.unsupported");let W=Y1();$1("ADD_ITEMS",{nextQueueItemId:J.getState().queue?.nextQueueItemId,index:C8(W,X),items:G,shuffleEnabled:!1,shouldAssignIds:!0})}function v1($){let X=D8(Y1(),$);if(X<0)throw Error("remote.error.gone");return X}function E$(){let $=getComputedStyle(document.documentElement),X=$.getPropertyValue("--ytmd-accent-primary").trim(),J=$.getPropertyValue("--ytmd-accent-secondary").trim(),Z=$.getPropertyValue("--ytmd-accent").trim();return X&&J&&Z?{primary:X,secondary:J,accent:Z}:null}function h$(){let $=O.getVideo(),J=document.getElementById("movie_player")?.getCurrentTime?.();return{playing:!!$&&!$.paused&&!$.ended,position_secs:typeof J==="number"&&Number.isFinite(J)?J:$?.currentTime??0,sampled_at_ms:Date.now(),volume:$?W0($)/100:1,muted:$?M0($):!1,like:O.getLikeStatus(),shuffle:O.isShuffleOn(),repeat:O.getRepeatMode(),accent:E$()}}async function k$($,X){switch(X.kind){case"command":if(X.command==="shuffle")O.toggleShuffle();else if(X.command==="repeat")O.cycleRepeat();else $.sendPlayerCommand(X.command);return null;case"seek":return O.seekTo(X.position_secs),null;case"volume":return O.setVolume(X.volume),null;case"play":if(!e0.test(X.video_id))throw Error("remote.error.invalid");if(!q8(X.video_id))D0(X.video_id);return null;case"search":return f$(X.query);case"enqueue":return await T$(X.video_id,X.next),null;case"queue_jump":return $1("SET_INDEX",v1(X.item_id)),null;case"queue_remove":return $1("REMOVE_ITEM",v1(X.item_id)),null;case"queue_move":{let J=v1(X.item_id),Z=Math.max(0,Math.min(X.to_index,Y1().length-1));return $1("MOVE_ITEM",{fromIndex:J,toIndex:Z}),null}}}var X1=[],J1=[],Z1=null,z1="";function _8(){J1.forEach(($)=>clearInterval($)),J1=[],Z1=null,z1=""}function S$($){if(J1.length>0)return;let X=()=>{let Z=h$();if(!B8(Z1,Z))return;Z1=Z,$.invoke("remote_publish",{kind:"state",data:Z}).catch(()=>{return})},J=()=>{let Z=O8(Y1()),z=JSON.stringify(Z);if(z===z1)return;z1=z,$.invoke("remote_publish",{kind:"queue",data:Z}).catch(()=>{return})};X(),J(),J1.push(window.setInterval(X,R$),window.setInterval(J,w$))}function M8($,X){if(X>0)S$($);else _8()}function P8($){let X=window.__TAURI__?.event;if(!X)return;X.listen("remote-action",({payload:J})=>{if(!J?.action)return;k$($,J.action).then((Z)=>{if(J.id!=null)$.invoke("remote_reply",{id:J.id,ok:!0,data:Z??null}).catch(()=>{return});Z1=null,z1=""},(Z)=>{let z=Z instanceof Error?Z.message:String(Z);if(console.warn("[YTMD Remote] action failed:",J.action.kind,z),J.id!=null)$.invoke("remote_reply",{id:J.id,ok:!1,error:z}).catch(()=>{return})})}).then((J)=>X1.push(J)),X.listen("remote-clients",({payload:J})=>M8($,J)).then((J)=>X1.push(J)),$.invoke("remote_clients").then((J)=>M8($,typeof J==="number"?J:0)).catch(()=>{return})}function b8(){X1.forEach(($)=>$()),X1=[],_8()}var R8={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit($){window.__ytmd_show_remote_qr=()=>m1($),P8($),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){b8(),window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}},I$=`
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
`;function g$(){if(document.getElementById("ytmd-qr-styles"))return;let $=document.createElement("style");$.id="ytmd-qr-styles",$.textContent=I$,document.head.appendChild($)}async function m1($){g$();let X=q("p",{text:K().remoteBody,style:"margin: 0;"}),J=q("div",{className:"ytmd-qr-frame",text:K().remoteLoading}),Z=q("div",{className:"ytmd-qr-url"}),z=R0({id:"ytmd-remote-modal",title:K().remoteTitle,body:[X,J,Z],actions:[{label:K().close}]});try{let Y=await $.invoke("get_remote_info");if(!J.isConnected)return;if(Y?.qr_svg){let G=q("img");G.src=`data:image/svg+xml;utf8,${encodeURIComponent(Y.qr_svg)}`,G.alt=K().remoteTitle,J.replaceChildren(G)}else J.textContent=K().remoteUnavailable;if(Y?.url)Z.textContent=Y.url}catch(Y){if(console.error("[YTMD Remote] Error fetching remote info:",Y),J.isConnected)J.textContent=K().remoteUnavailable}return z}var T8=null,C0=null,G0=($)=>{m($).catch((X)=>{console.error(`[YTMD] ${$} failed:`,X),B(K().actionFailed)})};function x$(){u5({onSyncChipClick:()=>G0("toggle_sync_window"),items:[{id:"settings",iconPath:P.tune,label:K().menuSettings,hint:"Ctrl+,",onSelect:()=>G0("toggle_settings_window")},{id:"local",iconPath:P.folderMusic,label:K().menuLocal,onSelect:()=>G0("toggle_local_library_window")},{id:"sync",iconPath:P.group,label:K().menuSync,onSelect:()=>G0("toggle_sync_window")},{id:"remote",iconPath:P.phone,label:K().menuRemote,onSelect:()=>{if(C0)m1(C0)}},{id:"mini",iconPath:P.miniPlayer,label:K().menuMiniPlayer,onSelect:()=>G0("toggle_mini_player")},{id:"download",iconPath:P.download,label:K().menuDownload,dividerBefore:!0,onSelect:()=>{if(C0)w1(C0,T8)}}]})}var y$={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function w8($){let X={};for(let[J,[Z,z]]of Object.entries(y$)){let Y=$[Z];X[J]=typeof Y==="boolean"?Y:z}return X}async function f8(){console.log("[YTMD] Initializing desktop integration bridge...");let $={};x$(),T1();let X=setInterval(T1,1000);window.addEventListener("pagehide",()=>clearInterval(X));try{let H=await m("get_config");if(H&&typeof H==="object")Object.assign($,H)}catch(H){console.error("[YTMD] Failed to load config, using defaults:",H)}let J={track:null,config:$,invoke:m,sendPlayerCommand:(H)=>{Q(H)},getVideoElement:()=>O.getVideo()};C0=J;let Z=new Q1(J);Z.register(Z5),Z.register(z5),Z.register(O5),Z.register(P5),Z.register(b5),Z.register(R5),Z.register(w5),Z.register(E5),Z.register(S5),Z.register(I5),Z.register(g5),Z.register(x5),Z.register(U8),Z.register(N8),Z.register(R8);try{await Z.initAll(w8($))}catch(H){console.error("[YTMD] Registry init error:",H)}let z=new G1,Y=0,G=Date.now();async function W(H,U,N){try{await m("update_track_info",{track:{title:H.title,artist:H.artist,album:H.album||null,cover_url:H.coverUrl||null,duration_secs:Math.round(H.durationSecs||0),current_time_secs:Math.round(U),is_playing:N,video_id:H.videoId||null,playlist_id:H.playlistId||null,sampled_at_ms:Date.now()}})}catch(V){console.error("[YTMD] Failed to sync track info to backend:",V)}}z.onTrackChange(async(H)=>{T8=H,Y=H.currentTimeSecs||0,G=Date.now(),Z.handleTrackChange(H),await W(H,H.currentTimeSecs||0,H.isPlaying)}),z.onPlaybackChange(async(H)=>{Z.handlePlaybackChange(H);let U=z.getCurrentTrack();if(U)U.isPlaying=H,Y=U.currentTimeSecs||0,G=Date.now(),await W(U,U.currentTimeSecs||0,H)}),z.onTick((H)=>{Z.handleTick(H);let U=z.getCurrentTrack();if(!U||!U.isPlaying)return;let N=Date.now(),V=(N-G)/1000,L=Y+V;if(Math.abs(H-L)>2||V>=15)Y=H,G=N,U.currentTimeSecs=Math.round(H),W(U,H,!0)});function Q(H){if(F8(H))return;switch(H){case"play":O.play();break;case"pause":O.pause();break;case"play_pause":O.playPause();break;case"next":O.next();break;case"previous":O.previous();break;case"like":O.toggleLike();break;case"dislike":O.toggleDislike();break;case"mute":O.toggleMute();break}}let j=(H,U)=>{let N=window.__TAURI__;if(N?.event?.listen)N.event.listen(H,(V)=>U(V.payload))};j("player-command",(H)=>Q(H)),j("tray-command",(H)=>Q(H)),j("mpris-command",(H)=>Q(H)),j("global-shortcut-event",(H)=>Q(H)),j("player-seek",(H)=>O.seekTo(H)),j("mpris-command-seek",(H)=>O.seekTo(H)),j("player-volume",(H)=>O.setVolume(H)),j("config-updated",(H)=>{if(!H||typeof H!=="object")return;Object.assign($,H);let U=w8($);for(let[N,V]of Object.entries(U))if(V)Z.enable(N).catch((L)=>console.error(`[YTMD] Failed to enable plugin ${N}:`,L));else Z.disable(N).catch((L)=>console.error(`[YTMD] Failed to disable plugin ${N}:`,L))}),window.addEventListener("keydown",(H)=>{if(H.ctrlKey&&H.key===","||H.key==="F2")H.preventDefault(),G0("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var v$=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(v$)if(i1(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>f8());else f8();})();
