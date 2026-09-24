(()=>{function I1($){let X=$.trim().split(":").map((J)=>parseInt(J,10));if(X.some((J)=>isNaN(J)))return 0;if(X.length===2)return X[0]*60+X[1];else if(X.length===3)return X[0]*3600+X[1]*60+X[2];return 0}var O8=1500;function D8($,X){let J=new URLSearchParams($);if(!X||J.get("v")!==X)return;return J.get("list")||void 0}var y1=($)=>$.trim().replace(/\s+/g," ").toLowerCase();function B8($,X){if(!$?.trim()||!X?.trim())return!0;return y1($)===y1(X)}function C8($,X){if(!$)return"new";if($.videoId&&X.videoId){if($.videoId!==X.videoId)return"new"}else if($.title!==X.title||$.artist!==X.artist)return"new";return $.title!==X.title||$.artist!==X.artist||!$.videoId&&!!X.videoId||!$.coverUrl&&!!X.coverUrl||!$.album&&!!X.album||X.durationSecs>0&&Math.abs(X.durationSecs-$.durationSecs)>1?"metadata":null}var M8=400;function A8($,X){return $-X>=M8}class $1{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick($){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((X)=>X($))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange($){this.onTrackChangeCallbacks.push($)}onPlaybackChange($){this.onPlaybackChangeCallbacks.push($)}onTick($){this.onTickCallbacks.push($)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let J=navigator.mediaSession,Z=J.metadata;try{Object.defineProperty(J,"metadata",{get:()=>Z,set:(z)=>{Z=z,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(z){}}this.syncVideoListeners();let $=!1,X=()=>{if($)return;$=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),$=!1})};this.mutationObserver=new MutationObserver(X),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let J=document.querySelector("video");if(J&&!J.paused&&A8(Date.now(),this.lastTickMs))this.emitTick(J.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let $=document.querySelector("ytmusic-player-bar")||document.body;if(!$||$===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe($,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=$}attachVideoListeners($){$.addEventListener("play",this.handleVideoPlay),$.addEventListener("playing",this.handleVideoPlay),$.addEventListener("pause",this.handleVideoPause),$.addEventListener("ended",this.handleVideoPause),$.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=$}detachVideoListeners($){$.removeEventListener("play",this.handleVideoPlay),$.removeEventListener("playing",this.handleVideoPlay),$.removeEventListener("pause",this.handleVideoPause),$.removeEventListener("ended",this.handleVideoPause),$.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let $=document.querySelector("video");if($&&$!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners($)}}extractTrackInfo(){let $=document.querySelector("video"),X=document.getElementById("movie_player");if(Boolean(X&&(typeof X.getAdState==="function"&&X.getAdState()===1||typeof X.isAdPlaying==="function"&&X.isAdPlaying()||X.classList?.contains("ad-showing")||X.classList?.contains("ad-interrupting"))))return null;let Z=navigator.mediaSession?.metadata,z=Z?.title||"",Y=Z?.artist||"",j=Z?.album||"",W="";if(Z?.artwork&&Z.artwork.length>0){let H=Z.artwork[Z.artwork.length-1];if(H&&H.src)W=H.src}if(!z){let H=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(H)z=H.textContent?.trim()||""}if(!Y){let H=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(H){let B=(H.textContent?.trim()||"").split("•").map((b)=>b.trim());if(Y=B[0]||"",B.length>1)j=B[1]}}if(!W){let H=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(H&&H.src)W=H.src}if(W.startsWith("//"))W=`https:${W}`;if(W.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(W))W=W.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let F=X?.getVideoData?.(),G=F?.video_id||new URLSearchParams(window.location.search).get("v")||void 0;if(G&&!B8(F?.title,Z?.title)){let H=Date.now();if(this.titleMismatch?.videoId!==G)this.titleMismatch={videoId:G,sinceMs:H};if(H-this.titleMismatch.sinceMs<O8)return null}else this.titleMismatch=null;let Q=0,q=0;if(X&&typeof X.getDuration==="function"){let H=X.getDuration();if(typeof H==="number"&&Number.isFinite(H)&&H>0)Q=Math.floor(H)}if(X&&typeof X.getCurrentTime==="function"){let H=X.getCurrentTime();if(typeof H==="number"&&Number.isFinite(H)&&H>=0)q=Math.floor(H)}if(!Q&&$&&Number.isFinite($.duration)&&$.duration>0)Q=Math.floor($.duration);if(!q&&$&&Number.isFinite($.currentTime)&&$.currentTime>=0)q=Math.floor($.currentTime);let N=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(N&&N.textContent){let H=N.textContent.split("/").map((D)=>D.trim());if(H.length===2){if(!q)q=I1(H[0]);if(!Q)Q=I1(H[1])}}if(!Q){let D=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(D){let B=parseInt(D,10);if(!isNaN(B)&&B>0)Q=B}}let U=$?!$.paused&&!$.ended:!1;if(!z)return null;let L=D8(window.location.search,G)??(this.currentTrack?.videoId===G?this.currentTrack?.playlistId:void 0);return{title:z,artist:Y||"Unknown Artist",album:j||void 0,coverUrl:W||void 0,durationSecs:Q,currentTimeSecs:q,isPlaying:U,videoId:G,playlistId:L}}checkTrackUpdate(){let $=this.extractTrackInfo();if(!$)return;let X=C8(this.currentTrack,$),J=this.currentTrack!==null&&this.currentTrack.isPlaying!==$.isPlaying;if(this.currentTrack=$,X){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((Z)=>Z($))}if(J)this.onPlaybackChangeCallbacks.forEach((Z)=>Z($.isPlaying))}handlePlaybackChange($){if($){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((X)=>X(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((X)=>X(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}function X1(){return document.getElementById("movie_player")}function S1($){for(let X of["ytmusic-player-bar #volume-slider","#expand-volume-slider"]){let J=document.querySelector(X);if(!J||!("value"in J))continue;if("step"in J&&Number(J.step)>1)J.step=1;J.value=$}}function j0($){let X=X1()?.getVolume?.(),J=typeof X==="number"&&Number.isFinite(X)?X:$.volume*100;return Math.max(0,Math.min(100,Math.round(J)))}function L0($){return X1()?.isMuted?.()===!0||$.muted}function O0($,X){if(!Number.isFinite($))return;let J=Math.max(0,Math.min(100,Math.round($))),Z=X1();if(typeof Z?.setVolume==="function"){if(Z.setVolume(J),J>0&&Z.isMuted?.())if(typeof Z.unMute==="function")Z.unMute();else X.muted=!1;S1(J);return}if(X.volume=J/100,J>0&&X.muted)X.muted=!1;S1(J)}var g1=!1;function x1($){g1=$}function a(){return g1}var u1=null;function J1($){u1=$}function m1(){return u1?.()??!1}class O{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let $=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if($){$.click();return}let X=this.getVideo();if(X)if(X.paused)X.play();else X.pause()}static play(){let $=this.getVideo();if($&&$.paused)this.playPause()}static pause(){let $=this.getVideo();if($&&!$.paused)this.playPause()}static next(){if(m1())return;this.nextInYtm()}static nextInYtm(){let $=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if($)$.click()}static previous(){let $=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if($)$.click()}static seekTo($){let X=this.getVideo();if(X&&!isNaN($))X.currentTime=Math.max(0,Math.min($,X.duration||$))}static setVolume($){let X=this.getVideo();if(X)O0($*100,X)}static toggleLike(){let $=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if($)$.click()}static toggleDislike(){let $=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if($)$.click()}static getLikeStatus(){let $=document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer")?.getAttribute("like-status");return $==="LIKE"?"like":$==="DISLIKE"?"dislike":"none"}static getRepeatMode(){let $=document.querySelector("ytmusic-player-bar")?.getAttribute("repeat-mode");return $==="ALL"?"all":$==="ONE"?"one":"none"}static isShuffleOn(){return document.querySelector("ytmusic-player-bar")?.hasAttribute("shuffle-on")??!1}static toggleShuffle(){document.querySelector("ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button")?.click()}static cycleRepeat(){document.querySelector("ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button")?.click()}static toggleMute(){let $=document.querySelector("ytmusic-player-bar #volume-slider"),X=this.getVideo();if(X)X.muted=!X.muted;if($){let J=$.parentElement?.querySelector("paper-icon-button, #button");if(J)J.click()}}}var v=($,X={},J={})=>{let Z=window.__TAURI__?.core;if(!Z?.invoke)return Promise.reject(Error("Tauri bridge unavailable"));return new Promise((z,Y)=>{let j=setTimeout(()=>Y(Error(`Timed out waiting for ${$}`)),J.timeoutMs??8000);Z.invoke("ytmd_bridge",{cmd:$,args:X}).then((W)=>{clearTimeout(j),z(W??null)},(W)=>{clearTimeout(j),Y(W instanceof Error?W:Error(String(W)))})})},D0=new Map,Z1=!1;function P8(){if(Z1)return;let $=window.__TAURI__?.core;if(!$?.Channel||!$.invoke)return;Z1=!0;let X=new $.Channel;X.onmessage=(J)=>{let Z=D0.get(J?.event);if(!Z)return;for(let z of[...Z])try{z({payload:J.payload})}catch(Y){console.error(`[YTMD] ${J.event} handler failed:`,Y)}},$.invoke("ytmd_subscribe",{channel:X}).catch((J)=>{Z1=!1,console.error("[YTMD] Event feed unavailable:",J)})}var C={listen($,X){P8();let J=X,Z=D0.get($);if(!Z)D0.set($,Z=new Set);return Z.add(J),Promise.resolve(()=>{D0.get($)?.delete(J)})}};var f8=15000,b8=100;function _8($,X,J,Z,z){if(Z||z>f8)return"abandon";if(X&&X!==$.video_id)return"abandon";return X===$.video_id&&J?"apply":"wait"}var w8=()=>document.getElementById("movie_player")?.getVideoData?.()?.video_id||void 0;function v1(){let $=location.pathname==="/watch"?new URLSearchParams(location.search).get("v"):null;if(!$)return;let X=!1,J=new Set,Z=(F)=>{let G=F.target;if(X||!(G instanceof HTMLVideoElement)||G.muted)return;G.muted=!0,J.add(G)};document.addEventListener("loadstart",Z,!0),document.addEventListener("play",Z,!0);let z=()=>{if(X)return;X=!0,document.removeEventListener("loadstart",Z,!0),document.removeEventListener("play",Z,!0),J.forEach((F)=>F.muted=!1),J.clear()},Y=(F,G)=>{let Q=()=>{if(clearTimeout(q),G.removeEventListener("seeked",Q),!F.autoplay)G.pause();z()},q=setTimeout(Q,1000);if(G.addEventListener("seeked",Q),G.currentTime=F.position_secs,F.autoplay)G.play().catch(()=>{return});else{G.pause();let N=()=>G.pause();G.addEventListener("play",N),setTimeout(()=>G.removeEventListener("play",N),1500)}},j=Date.now();(async()=>{for(let F=0;;F++)try{return await v("take_resume_session")}catch(G){if(F>=20||window.__TAURI__?.core?.invoke)throw G;await new Promise((Q)=>setTimeout(Q,100))}})().then((F)=>{let G=F;if(!G||G.video_id!==$)return z();let Q=setInterval(()=>{let q=document.querySelector("video"),N=_8(G,w8(),!!q&&q.readyState>=1,a(),Date.now()-j);if(N==="wait")return;if(clearInterval(Q),N==="apply"&&q)Y(G,q);else z()},b8)}).catch((F)=>{console.error("[YTMD] Resume failed:",F),z()})}class z1{plugins=new Map;enabledPlugins=new Set;context;constructor($){this.context=$}register($){if(this.plugins.set($.id,$),$.defaultEnabled)this.enabledPlugins.add($.id)}async initAll($){for(let[X,J]of this.plugins)if($?.[X]!==void 0?$[X]:J.defaultEnabled){if(this.enabledPlugins.add(X),J.onInit)try{await J.onInit(this.context)}catch(z){console.error(`[YTMD] Failed to init plugin ${X}:`,z)}}else this.enabledPlugins.delete(X)}async enable($){let X=this.plugins.get($);if(X&&!this.enabledPlugins.has($)){if(this.enabledPlugins.add($),X.onInit)await X.onInit(this.context)}}async disable($){let X=this.plugins.get($);if(X&&this.enabledPlugins.has($)){if(this.enabledPlugins.delete($),X.onDestroy)await X.onDestroy()}}handleTrackChange($){this.context.track=$;for(let X of this.enabledPlugins){let J=this.plugins.get(X);if(J?.onTrackChange)try{J.onTrackChange($,this.context)}catch(Z){console.error(`[YTMD] Error in plugin ${X} onTrackChange:`,Z)}}}handlePlaybackChange($){for(let X of this.enabledPlugins){let J=this.plugins.get(X);if(J?.onPlaybackChange)try{J.onPlaybackChange($,this.context)}catch(Z){console.error(`[YTMD] Error in plugin ${X} onPlaybackChange:`,Z)}}}handleTick($){for(let X of this.enabledPlugins){let J=this.plugins.get(X);if(J?.onTick)try{J.onTick($,this.context)}catch(Z){console.error(`[YTMD] Error in plugin ${X} onTick:`,Z)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled($){return this.enabledPlugins.has($)}}var B0=null,o={adWasShowing:!1,preAdMuted:!1},j1=new WeakSet,W0=null,s1=null,Y1=0,G0=!0,R8=1000,h8=($,X,J)=>$-X>=J,T8=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",E8="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",k8=300,I8=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,y8=`
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
`,S8=I8+y8,g8=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],x8=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],u8=($)=>g8.some((X)=>$.includes(X)),m8=($,X)=>{let J=X.split("."),Z=$;for(let Y=0;Y<J.length-1;Y++){if(Z===null||typeof Z!=="object")return!1;Z=Z[J[Y]]}let z=J[J.length-1];if(Z!==null&&typeof Z==="object"&&Object.prototype.hasOwnProperty.call(Z,z))return delete Z[z],!0;return!1},G1=($)=>{if($===null||typeof $!=="object")return!1;let X=!1;for(let J of x8)if(m8($,J))X=!0;return X},v8=($)=>{if(typeof $==="string")return $;if($ instanceof URL)return $.href;return $.url},p1=!1,p8=()=>{if(p1)return;p1=!0;let $=window.fetch,X=$.bind(window),J=async(...Z)=>{let z=await X(...Z);if(!G0||!u8(v8(Z[0])))return z;let Y;try{Y=await z.clone().json()}catch{return z}if(!G1(Y))return z;let j=new Headers(z.headers);return j.delete("content-length"),j.delete("content-encoding"),new Response(JSON.stringify(Y),{status:z.status,statusText:z.statusText,headers:j})};window.fetch=Object.assign(J,$)},c1=!1,c8=()=>{if(c1)return;c1=!0;let $=JSON.parse;JSON.parse=(...X)=>{let J=$(...X);if(G0)G1(J);return J}},l1=!1,l8=()=>{if(l1)return;l1=!0;let $;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>$,set:(X)=>{if(G0)G1(X);$=X}})};if(typeof window<"u")p8(),c8(),l8();var d8=($)=>{let X=new Set($);return X.has("ad-showing")||X.has("ad-interrupting")},n8=($,X,J)=>{if($&&!X.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:J},setMutedTo:!0};if(!$&&X.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:X.preAdMuted},setMutedTo:X.preAdMuted};return{nextState:X,setMutedTo:null}},F1=()=>document.getElementById("movie_player"),s8=()=>{let $=F1();if(!$)return!1;return d8($.classList)},W1=($)=>{let X=$.getVideoElement();if(!X)return;let{nextState:J,setMutedTo:Z}=n8(s8(),o,X.muted);if(o=J,Z!==null)X.muted=Z},d1=($)=>{if(j1.has($))return;j1.add($),$.click()},C0=()=>{document.querySelectorAll(T8).forEach(d1),document.querySelectorAll(E8).forEach(($)=>{let X=$.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(X)d1(X)})},n1=($)=>{let X=F1();if(s1=X,!X)return;W0?.disconnect(),W0=new MutationObserver(()=>{W1($),C0()}),W0.observe(X,{attributes:!0,attributeFilter:["class"]})},r1={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit($){G0=!0,o={adWasShowing:!1,preAdMuted:!1},j1=new WeakSet,Y1=0;let X=document.createElement("style");X.id="ytmd-adblock-styles",X.textContent=S8,document.head.appendChild(X);let J=null,Z=new MutationObserver(()=>{if(J!==null)return;J=setTimeout(()=>{J=null,C0()},k8)});Z.observe(document.body,{childList:!0,subtree:!0}),n1($),C0(),W1($),B0=()=>{if(G0=!1,W0?.disconnect(),W0=null,Z.disconnect(),J!==null)clearTimeout(J);document.getElementById("ytmd-adblock-styles")?.remove();let z=$.getVideoElement();if(z&&o.adWasShowing)z.muted=o.preAdMuted;o={adWasShowing:!1,preAdMuted:!1}}},onTick($,X){if(F1()!==s1)n1(X);W1(X);let J=Date.now();if(h8(J,Y1,R8))Y1=J,C0()},onDestroy(){if(B0)B0(),B0=null}};var t=[],M0="",Q1=new Set,r8=($,X)=>$===X,i1={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){t=[],M0="",Q1=new Set},onTrackChange($){if(!$.videoId||$.videoId===M0)return;let X=$.videoId;M0=X,t=[],Q1=new Set;let J=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),Z=`https://sponsor.ajay.app/api/skipSegments?videoID=${X}&categories=${encodeURIComponent(J)}`;fetch(Z,{signal:AbortSignal.timeout(3000)}).then(async(z)=>{if(!z.ok)return;let Y=await z.json();if(!r8(X,M0))return;t=Y,console.log(`[YTMD SponsorBlock] Loaded ${Y.length} segments for ${X}`)}).catch(()=>{})},onTick($,X){if(!t||t.length===0||a())return;let J=Q1;for(let Z of t){let[z,Y]=Z.segment;if($>=z&&$<Y-0.5&&!J.has(Z.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${Z.category}): ${z}s -> ${Y}s`);let j=X.getVideoElement();if(j)j.currentTime=Y,J.add(Z.UUID);break}}}};function a1($,X=18,J=18,Z="0 0 24 24"){let z=document.createElementNS("http://www.w3.org/2000/svg","svg");z.setAttribute("width",String(X)),z.setAttribute("height",String(J)),z.setAttribute("viewBox",Z),z.setAttribute("fill","currentColor");let Y=document.createElementNS("http://www.w3.org/2000/svg","path");return Y.setAttribute("d",$),z.appendChild(Y),z}function V($,X){let J=document.createElement($);if(X?.id)J.id=X.id;if(X?.className)J.className=X.className;if(X?.text!==void 0)J.textContent=X.text;if(X?.title)J.title=X.title;if(X?.style)J.style.cssText=X.style;return J}var o1="ytmd-kit-styles",i8=`
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
`;function R(){if(document.getElementById(o1))return;let $=document.createElement("style");$.id=o1,$.textContent=i8,(document.head||document.documentElement).appendChild($),a8()}var h={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",download:"M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function A0($,X=24){return a1($,X,X)}function c($){let X=V("button",{id:$.id,className:`ytmd-icon-btn${$.muted?" ytmd-icon-btn--muted":""}`});return X.type="button",X.setAttribute("aria-label",$.label),X.dataset.ytmdTooltip=$.label,X.appendChild(A0($.iconPath)),X}var t1=!1;function a8(){if(t1)return;t1=!0;let $=null,X=null,J=null,Z=()=>{if(X!==null)clearTimeout(X);X=null,J=null,$?.classList.remove("ytmd-open")},z=(W)=>{let F=W.dataset.ytmdTooltip;if(!F)return;if(!$)$=V("div",{id:"ytmd-tooltip"}),$.setAttribute("role","tooltip"),document.body.appendChild($);$.textContent=F;let G=W.getBoundingClientRect(),Q=$.getBoundingClientRect(),N=G.bottom+8+Q.height<window.innerHeight?G.bottom+8:G.top-8-Q.height,U=Math.max(8,Math.min(window.innerWidth-Q.width-8,G.left+G.width/2-Q.width/2));$.style.top=`${N}px`,$.style.left=`${U}px`,$.classList.add("ytmd-open")},Y=(W)=>{let F=W.target?.closest?.("[data-ytmd-tooltip]");if(!F||F===J)return;Z(),J=F,X=setTimeout(()=>z(F),250)},j=(W)=>{let F=W.relatedTarget;if(J&&F&&J.contains(F))return;Z()};document.addEventListener("mouseover",Y,!0),document.addEventListener("mouseout",j,!0),document.addEventListener("focusin",Y,!0),document.addEventListener("focusout",Z,!0),document.addEventListener("mousedown",Z,!0)}var p=null;function P($,X={}){R();let J=document.getElementById("ytmd-toast-host");if(!J)J=V("div",{id:"ytmd-toast-host"}),J.setAttribute("role","status"),J.setAttribute("aria-live","polite"),document.body.appendChild(J);let Z=J.querySelector(".ytmd-toast"),z=Z&&X.id&&Z.dataset.toastId===X.id&&!Z.classList.contains("ytmd-leaving"),Y=z?Z:V("div",{className:"ytmd-toast"});if(X.id)Y.dataset.toastId=X.id;let W=[V("span",{className:"ytmd-toast-text",text:$})];if(X.action){let{label:G,onClick:Q}=X.action,q=V("button",{className:"ytmd-button",text:G});q.type="button",q.addEventListener("click",()=>{e1(),Q()}),W.push(q)}if(Y.replaceChildren(...W),!z)J.replaceChildren(Y);if(p!==null)clearTimeout(p);p=null;let F=X.durationMs??4000;if(F>0)p=setTimeout(e1,F)}var o8=5,t8=3000;function $5($,X){R();let J=document.getElementById("ytmd-reaction-host");if(!J)J=V("div",{id:"ytmd-reaction-host"}),J.setAttribute("aria-live","polite"),document.body.appendChild(J);let Z=V("div",{className:"ytmd-reaction"});Z.append(V("span",{className:"ytmd-reaction-emoji",text:$}),V("span",{text:X})),J.appendChild(Z);while(J.children.length>o8)J.firstElementChild?.remove();setTimeout(()=>Z.remove(),t8)}function e1(){if(p!==null)clearTimeout(p);p=null;let $=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!$)return;$.classList.add("ytmd-leaving"),setTimeout(()=>$.remove(),150)}function X5($){R(),document.getElementById($.id)?.remove();let X=V("div",{id:$.id,className:"ytmd-scrim"}),J=V("div",{className:"ytmd-dialog"});J.setAttribute("role","dialog"),J.setAttribute("aria-modal","true");let Z=`${$.id}-title`;J.setAttribute("aria-labelledby",Z);let z=V("h2",{id:Z,className:"ytmd-dialog-title",text:$.title}),Y=V("div",{className:"ytmd-dialog-body"});if($.body)Y.append(...$.body);let j=document.activeElement,W=()=>{document.removeEventListener("keydown",F,!0),X.remove(),j?.focus?.()},F=(Q)=>{if(Q.key==="Escape")Q.stopPropagation(),W()};document.addEventListener("keydown",F,!0),X.addEventListener("click",(Q)=>{if(Q.target===X)W()});let G=V("div",{className:"ytmd-dialog-actions"});for(let Q of $.actions){let q=V("button",{className:`ytmd-button${Q.filled?" ytmd-button--filled":""}`,text:Q.label});q.type="button",q.addEventListener("click",()=>Q.onClick?Q.onClick(W):W()),G.appendChild(q)}return J.append(z,Y,G),X.appendChild(J),document.body.appendChild(X),G.querySelector("button")?.focus(),{close:W,body:Y}}var J5={menuLabel:"YTMD",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",menuMiniPlayer:"Mini player",syncInRoom:"Listening together",syncListeners:($)=>$===1?"1 listener":`${$} listeners`,syncJoined:($)=>`${$} joined`,syncLeft:($)=>`${$} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:($)=>`${$} skipped to the next song`,syncGuestPrevious:($)=>`${$} went back a song`,syncGuestPaused:($)=>`${$} paused`,syncGuestResumed:($)=>`${$} resumed playback`,syncGuestPicked:($)=>`${$} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:($,X,J)=>`${$} votes to skip (${X}/${J})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:($,X)=>`From the shared queue: ${$} · ${X}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:($)=>`${$} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:($)=>`from ${$}`,syncQueuePlayNow:($)=>`Play “${$}” now`,syncQueueRemove:($)=>`Remove “${$}” from the queue`,syncQueueDrag:($)=>`Move “${$}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",pipButton:"Picture-in-picture",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:($)=>`Source: ${$}`,lyricsLocalFiles:"Local files",lyricsWrong:"Wrong lyrics?",lyricsPickTitle:"Choose lyrics",lyricsPickLoading:"Looking for other versions…",lyricsPickNone:"No other versions found",lyricsPickFailed:"Couldn’t switch the lyrics",lyricsTimed:"Timed",lyricsTextOnly:"Text only",lyricsCurrent:"Current",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",actionFailed:"Something went wrong. Try again.",volumeLevel:($)=>`Volume: ${$}%`},e8={menuLabel:"YTMD",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",menuMiniPlayer:"Miniodtwarzacz",syncInRoom:"Słuchacie razem",syncListeners:($)=>{if($===1)return"1 słuchacz";let X=$%100,J=$%10;return J>=2&&J<=4&&(X<12||X>14)?`${$} słuchacze`:`${$} słuchaczy`},syncJoined:($)=>`${$} dołącza do słuchania`,syncLeft:($)=>`${$} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:($)=>`${$} przełącza na następny utwór`,syncGuestPrevious:($)=>`${$} wraca do poprzedniego utworu`,syncGuestPaused:($)=>`${$} wstrzymuje odtwarzanie`,syncGuestResumed:($)=>`${$} wznawia odtwarzanie`,syncGuestPicked:($)=>`${$} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:($,X,J)=>`${$} głosuje za pominięciem (${X}/${J})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:($,X)=>`Ze wspólnej kolejki: ${$} · ${X}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:($)=>`${$} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:($)=>`od: ${$}`,syncQueuePlayNow:($)=>`Zagraj teraz: „${$}”`,syncQueueRemove:($)=>`Usuń z kolejki: „${$}”`,syncQueueDrag:($)=>`Przesuń „${$}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",pipButton:"Obraz w obrazie",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:($)=>`Źródło: ${$}`,lyricsLocalFiles:"Pliki lokalne",lyricsWrong:"Zły tekst?",lyricsPickTitle:"Wybierz tekst",lyricsPickLoading:"Szukanie innych wersji…",lyricsPickNone:"Nie znaleziono innych wersji",lyricsPickFailed:"Nie udało się zmienić tekstu",lyricsTimed:"Z synchronizacją",lyricsTextOnly:"Sam tekst",lyricsCurrent:"Obecny",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:($)=>`Głośność: ${$}%`},$$={en:J5,pl:e8};function X$($){let X=($||"").toLowerCase().split(/[-_]/)[0];return $$[X]??J5}var H1=null;function K(){if(!H1){let $=typeof document<"u"?document.documentElement.lang:"";H1=X$($||(typeof navigator<"u"?navigator.language:"en"))}return H1}var F0={video_id:null,provider:null,synced:[],plain:null,offset_secs:0,source_url:null};function Z5($,X){let J=0,Z=$.length-1,z=-1;while(J<=Z){let Y=J+Z>>1;if($[Y].t<=X)z=Y,J=Y+1;else Z=Y-1}return z}function z5($,X,J){return Z5($,X+J)}function Y5($,X,J){return $?.words?Z5($.words,X+J):-1}function K1($,X){switch($){case"local":return X;case"lrclib":return"LRCLIB";case"musixmatch":return"Musixmatch";case"netease":return"NetEase";case"ytm":return"YouTube Music";case"genius":return"Genius";default:return $||""}}function P0($){if(!$||typeof $!=="object")return{...F0};let X=$;return{video_id:typeof X.video_id==="string"?X.video_id:null,provider:typeof X.provider==="string"?X.provider:null,synced:Array.isArray(X.synced)?X.synced.filter((J)=>typeof J?.t==="number"&&typeof J?.text==="string"):[],plain:typeof X.plain==="string"?X.plain:null,offset_secs:typeof X.offset_secs==="number"&&Number.isFinite(X.offset_secs)?X.offset_secs:0,source_url:typeof X.source_url==="string"?X.source_url:null}}var M={...F0},y=!1,x=-1,l=-1,e="",b0=0,V1="",_0=!1,I=null,f0=null,j5=($,X)=>$===X,J$=($)=>$.videoId||`${$.title} - ${$.artist}`,G5={id:"lyrics",name:"Native Synced Lyrics",description:"Synchronized lyrics from several providers in the native Lyrics tab, with active highlighting and seek-on-click",defaultEnabled:!0,onInit($){M={...F0},y=!1,x=-1,l=-1,e="",V1="",_0=!1,I=null;let X=document.createElement("style");X.id="ytmd-native-lyrics-styles",X.textContent=Z$,document.head.appendChild(X),R();let J=()=>{q1(),K$($),Y$($)},Z=()=>{setTimeout(()=>{q1(),N1()},50),setTimeout(()=>{N1()},250)};document.addEventListener("click",Z,!0);let z=window.setInterval(J,600);J(),j$($);let Y=C?C.listen("lyrics-changed",(j)=>{let W=P0(j.payload);if(!z$(W))return;U1($,W)}):null;f0=()=>{clearInterval(z),document.removeEventListener("click",Z,!0),Y?.then((j)=>j()),X.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((j)=>j.remove())}},async onTrackChange($,X){let J=J$($);if(I=$,J===e)return;e=J,M={...F0,video_id:$.videoId??null},y=!0,x=-1,l=-1,V1=Q5(),_0=!1,q1(),R0(X),await F5(X,$,J,null)},onTick($){b0=$,w0($,!0)},onDestroy(){if(f0)f0(),f0=null}},Z$=`
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
`;function z$($){if(!I)return!1;if($.video_id&&I.videoId)return $.video_id===I.videoId;return!$.video_id||$.video_id===I.videoId}async function F5($,X,J,Z){try{let z=P0(await $.invoke("fetch_lyrics",{videoId:X.videoId||null,artist:X.artist,title:X.title,albumName:X.album||null,duration:X.durationSecs||null,ytmPlain:Z},{timeoutMs:15000}));if(!j5(J,e))return;y=!1,U1($,z)}catch{if(!j5(J,e))return;y=!1,R0($)}}function U1($,X){let J=X.provider!==null&&X.provider===M.provider&&X.synced.length===M.synced.length&&X.plain===M.plain&&X.video_id===M.video_id&&!y;if(y&&!X.provider&&X.offset_secs===M.offset_secs)return;if(M=X,y=!1,J){let Z=document.querySelector(".ytmd-lyrics-offset-value");if(Z)Z.textContent=K5(X.offset_secs);w0(b0,!1);return}x=-1,l=-1,R0($),w0(b0,!1)}function w0($,X){if(M.synced.length===0)return;let J=document.getElementById("ytmd-native-lyrics-wrapper");if(!J)return;let Z=J.querySelectorAll(".ytmd-native-lyric-line"),z=z5(M.synced,$,M.offset_secs);if(z!==x){Z[x]?.classList.remove("active"),Z[x]?.querySelectorAll(".ytmd-sung").forEach((W)=>W.classList.remove("ytmd-sung")),x=z,l=-1;let j=Z[z];if(j){j.classList.add("active");let W=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(X&&W&&F$(W))j.scrollIntoView({behavior:"smooth",block:"nearest"})}}let Y=Y5(M.synced[z],$,M.offset_secs);if(Y!==l)Z[z]?.querySelectorAll(".ytmd-lyric-word")?.forEach((W,F)=>W.classList.toggle("ytmd-sung",F<=Y)),l=Y}function Q5(){return document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description')?.textContent?.trim()||""}function Y$($){if(_0||y||!I||M.provider)return;let X=Q5();if(!X||X===V1)return;_0=!0,F5($,I,e,X)}async function j$($){let X=W$(),J=[...G$(X)];if(J.length===0)return;try{await $.invoke("import_lyrics_offsets",{entries:J}),X?.removeItem?.(H5)}catch(Z){console.warn("[YTMD Lyrics] Offset migration failed, will retry next start:",Z)}}var H5="ytmd-lyrics-offsets";function W$(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function G$($){try{let X=$?.getItem(H5);if(!X)return new Map;let J=JSON.parse(X);if(!Array.isArray(J))return new Map;return new Map(J.filter((Z)=>Array.isArray(Z)&&typeof Z[0]==="string"&&typeof Z[1]==="number"))}catch{return new Map}}function K5($){return`${$>0?"+":$<0?"−":""}${Math.abs($).toFixed(1)} s`}function F$($){if(!$||$.offsetParent===null||$.hasAttribute("hidden"))return!1;let X=window.getComputedStyle($);return X.display!=="none"&&X.visibility!=="hidden"&&X.opacity!=="0"}function Q$($){return $.disabled!==!0&&!$.hasAttribute("disabled")&&$.getAttribute("aria-disabled")!=="true"&&!$.classList.contains("disabled")&&$.classList.contains("ytmd-lyrics-tab-unlocked")}function q1(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((X)=>{let J=X.textContent?.toLowerCase()||"";if(J.includes("tekst")||J.includes("lyrics")||J.includes("paroles")||J.includes("letras")){if(Q$(X))return;X.disabled=!1,X.removeAttribute("disabled"),X.removeAttribute("aria-disabled"),X.classList.remove("disabled"),X.classList.add("ytmd-lyrics-tab-unlocked");let Z={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!X.endpoint)X.endpoint=Z;if(X.data&&!X.data.endpoint)X.data.endpoint=Z}})}function H$(){let $=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let J of Array.from($)){let Z=J.textContent?.toLowerCase()||"";if(Z.includes("tekst")||Z.includes("lyrics")||Z.includes("paroles")||Z.includes("letras")){if(J.classList.contains("iron-selected")||J.getAttribute("aria-selected")==="true"||J.classList.contains("selected"))return!0}}let X=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(X){if((X.classList.contains("iron-selected")||!X.hasAttribute("hidden"))&&X.getAttribute("aria-hidden")!=="true")return!0}return!1}function N1(){let $=document.getElementById("ytmd-native-lyrics-wrapper");if(!$)return;let X=H$();$.style.setProperty("display",X?"flex":"none","important")}function K$($){let X=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!X)return;let J=document.getElementById("ytmd-native-lyrics-wrapper");if(!J||!X.contains(J)){if(!J)J=V("div",{id:"ytmd-native-lyrics-wrapper"});X.appendChild(J),x=-1,l=-1,R0($),w0(b0,!1)}N1()}function Q0($,X,J){let Z=V("button",{className:"ytmd-chip",text:$});return Z.type="button",Z.dataset.ytmdTooltip=X,Z.setAttribute("aria-label",X),Z.addEventListener("click",J),Z}function q$(){let $=K().lyricsSource(K1(M.provider,K().lyricsLocalFiles));if(M.source_url){let X=V("a",{className:"ytmd-lyrics-source",text:$});return X.href=M.source_url,X.target="_blank",X.rel="noopener noreferrer",X}return V("span",{className:"ytmd-lyrics-source",text:$})}function W5($,X){let J=V("div",{className:"ytmd-native-lyrics-footer"});if(J.append(q$()),X){let Z=V("span",{className:"ytmd-lyrics-offset-value",text:K5(M.offset_secs)}),z=(Y)=>{let j=Y===null?0:Math.round((M.offset_secs+Y)*10)/10;$.invoke("set_lyrics_offset",{offsetSecs:j}).catch((W)=>console.warn("[YTMD Lyrics] offset:",W))};J.append(V("span",{text:K().lyricsOffset}),Q0("−0.5 s",K().lyricsLater,()=>z(-0.5)),Z,Q0("+0.5 s",K().lyricsEarlier,()=>z(0.5)),Q0(K().lyricsReset,K().lyricsReset,()=>z(null)))}return J.append(Q0(K().lyricsWrong,K().lyricsPickTitle,()=>void q5($))),J}async function q5($){let X=V("div",{className:"ytmd-lyrics-pick-list"});X.append(V("div",{className:"ytmd-native-lyrics-status",text:K().lyricsPickLoading}));let J=X5({id:"ytmd-lyrics-picker",title:K().lyricsPickTitle,body:[X],actions:[{label:K().close}]}),Z=[];try{Z=await $.invoke("list_lyrics_candidates",{},{timeoutMs:15000})||[]}catch{Z=[]}if(!X.isConnected)return;if(Z.length===0){X.replaceChildren(V("div",{className:"ytmd-native-lyrics-status",text:K().lyricsPickNone}));return}X.replaceChildren(...Z.map((z)=>{let Y=V("button",{className:"ytmd-menu-item"});Y.type="button";let j=V("span",{className:"ytmd-menu-item-text"}),W=z.synced?K().lyricsTimed:K().lyricsTextOnly;if(j.append(V("span",{text:`${K1(z.provider,K().lyricsLocalFiles)} · ${W}`}),V("span",{className:"ytmd-menu-item-sub",text:`${z.title} — ${z.artist}`}),V("span",{className:"ytmd-menu-item-sub",text:z.preview})),Y.append(j),z.selected)Y.append(V("span",{className:"ytmd-menu-item-hint",text:K().lyricsCurrent}));return Y.addEventListener("click",async()=>{J.close();try{U1($,P0(await $.invoke("pick_lyrics",{provider:z.provider,id:z.id})))}catch{P(K().lyricsPickFailed)}}),Y}))}function R0($){let X=document.getElementById("ytmd-native-lyrics-wrapper");if(!X)return;if(y)X.replaceChildren(V("div",{className:"ytmd-native-lyrics-status",text:K().lyricsLoading}));else if(M.synced.length>0)X.replaceChildren(...M.synced.map((J)=>{let Z=V("div",{className:"ytmd-native-lyric-line"});if(J.words?.length)Z.classList.add("ytmd-has-words"),Z.append(...J.words.map((z)=>V("span",{className:"ytmd-lyric-word",text:z.text})));else Z.textContent=J.text;return Z.addEventListener("click",()=>{let z=$.getVideoElement();if(z)z.currentTime=Math.max(0,J.t-M.offset_secs)}),Z}),W5($,!0));else if(M.plain)X.replaceChildren(...M.plain.split(`
`).map((J)=>V("div",{className:"ytmd-native-lyric-line ytmd-plain",text:J})),W5($,!1));else{let J=[V("div",{className:"ytmd-native-lyrics-status",text:K().lyricsNone})];if(I)J.push(V$($));X.replaceChildren(...J)}}function V$($){let X=V("div",{className:"ytmd-native-lyrics-footer"});return X.append(V("span",{className:"ytmd-lyrics-source"}),Q0(K().lyricsWrong,K().lyricsPickTitle,()=>void q5($))),X}var H0=null;function K0($){if(!$)return null;let X=$.getBoundingClientRect();if(X.width<80||X.height<80||X.bottom<=0||X.right<=0||X.top>=window.innerHeight||X.left>=window.innerWidth)return null;for(let J=$;J;J=J.parentElement){let Z=getComputedStyle(J);if(Z.display==="none"||Z.visibility==="hidden"||Number(Z.opacity)===0)return null}return X}var V5={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit($){H0?.(),R(),document.getElementById("ytmd-volume-indicator")?.remove();let X=V("div",{id:"ytmd-volume-indicator"});document.body.appendChild(X);let J=null,Z=null,z=null,Y=null,j=null,W=()=>{if(j!==null)window.clearTimeout(j);j=null,X.classList.remove("ytmd-visible")},F=()=>{if(j!==null)window.clearTimeout(j);X.classList.add("ytmd-visible"),j=window.setTimeout(()=>{j=null,X.classList.remove("ytmd-visible")},1800)},G=()=>{let H=$.getVideoElement();if(!H){Y=null,W();return}let D=L0(H)?0:j0(H),B=Y!==null&&D!==Y;Y=D;let b=document.querySelector("ytmusic-player-page #main-panel");if(!K0(b)){W();return}if(X.textContent!==`${D}%`)X.textContent=`${D}%`,X.setAttribute("aria-label",K().volumeLevel(D));let i=K0(document.querySelector("ytmusic-player-page #song-image")),g=K0(document.querySelector("ytmusic-player-page video"))||K0(document.querySelector("ytmusic-player-page #movie_player")),T=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?g||i:i||g)||K0(b);if(!T){W();return}let k=`${Math.max(8,T.left+12)}px`,w=`${Math.max(8,T.top+12)}px`;if(X.style.left!==k)X.style.left=k;if(X.style.top!==w)X.style.top=w;if(B)F()},Q=()=>{let H=$.getVideoElement();if(H===J)return;J?.removeEventListener("volumechange",G),J=H,J?.addEventListener("volumechange",G),G()},q=()=>{let H=document.querySelector("ytmusic-player-page");if(H===Z)return;if(z?.disconnect(),Z=H,H)z=new MutationObserver(()=>window.requestAnimationFrame(G)),z.observe(H,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},N=(H)=>{let D=H.target;if(D instanceof Element&&D.closest("ytmusic-player-bar"))window.requestAnimationFrame(G)},U=(H)=>{if(H.deltaY===0||H.ctrlKey)return;let D=H.target;if(D instanceof Element&&D.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'))return;let B=(k)=>{if(!k)return!1;let w=k.getBoundingClientRect();return H.clientX>=w.left&&H.clientX<w.right&&H.clientY>=w.top&&H.clientY<w.bottom},b=B(document.querySelector("ytmusic-player-bar"))||B(document.querySelector("#player-bar-background")),i=$.config.wheel_volume_on_player_page===!0&&B(document.querySelector("ytmusic-player-page #main-panel"));if(!b&&!i)return;let g=$.getVideoElement();if(!g)return;let _=$.config.wheel_volume_step,T=typeof _==="number"&&Number.isFinite(_)&&_>0?Math.min(_,1):0.05;H.preventDefault(),O0(j0(g)+(H.deltaY<0?T:-T)*100,g),G()};window.addEventListener("wheel",U,{passive:!1}),window.addEventListener("resize",G),document.addEventListener("scroll",G,!0),document.addEventListener("input",N,!0),document.addEventListener("change",N,!0),q(),Q();let L=window.setInterval(()=>{q(),Q(),G()},500);H0=()=>{window.removeEventListener("wheel",U),window.removeEventListener("resize",G),document.removeEventListener("scroll",G,!0),document.removeEventListener("input",N,!0),document.removeEventListener("change",N,!0),window.clearInterval(L),z?.disconnect(),J?.removeEventListener("volumechange",G),W(),X.remove()}},onDestroy(){if(H0)H0(),H0=null}};var N5={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange($,X){if(!X.config?.notifications_enabled)return;if(!$.title||$.title==="No Track Playing")return;try{await X.invoke("notify_track_change",{title:$.title,artist:$.artist})}catch(J){console.warn("[YTMD] Notification dispatch failed:",J)}}};var h0=null,U5={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit($){let X=document.getElementById("ytmd-theme-styles");if(!X)X=document.createElement("style"),X.id="ytmd-theme-styles";if(X.textContent=`
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
    `,!X.isConnected)document.head.appendChild(X);h0=()=>{X?.remove()}},onDestroy(){if(h0)h0(),h0=null}};var T0=[32,64,125,250,500,1000,2000,4000,8000,16000],L1={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function q0($){return Math.max(-24,Math.min(24,$))}function N$($){if($.length===0)return-100;let X=0;for(let Z=0;Z<$.length;Z++)X+=$[Z]*$[Z];let J=Math.sqrt(X/$.length);if(J<=0.00001)return-100;return 20*Math.log10(J)}function U$($){return Math.max(0.5,Math.min(2,$))}class f{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=T0.map(()=>0);preampDb=0;isInitializedFor($){return this.isInitialized&&this.hookedVideo===$}static getInstance(){if(!f.instance)f.instance=new f;return f.instance}init($){if(this.isInitialized&&this.hookedVideo===$){this.resumeContext();return}try{let X=window.AudioContext||window.webkitAudioContext;if(!X){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new X,this.hookedVideo=$,this.sourceNode=this.audioCtx.createMediaElementSource($),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=T0.map((Z,z)=>{if(!this.audioCtx)throw Error("AudioContext missing");let Y=this.audioCtx.createBiquadFilter();if(z===0)Y.type="lowshelf";else if(z===T0.length-1)Y.type="highshelf";else Y.type="peaking",Y.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return Y.frequency.setValueAtTime(Z,this.audioCtx.currentTime),Y.gain.setValueAtTime(0,this.audioCtx.currentTime),Y}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let J=()=>this.resumeContext();$.addEventListener("play",J),$.addEventListener("playing",J),document.addEventListener("click",J,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(X){console.error("[YTMD DSP] Failed to initialize AudioEngine:",X)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((X)=>X.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let $=this.sourceNode;if(this.isNormalizing)$.connect(this.compressorNode),$=this.compressorNode;for(let X of this.filters)$.connect(X),$=X;$.connect(this.preampNode),$=this.preampNode,$.connect(this.fadeNode),$=this.fadeNode,$.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch($){console.error("[YTMD DSP] Graph rebuild error:",$)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain($,X){if($<0||$>=this.gains.length)return;let J=q0(X);if(this.gains[$]=J,!this.audioCtx||$>=this.filters.length)return;this.filters[$].gain.setValueAtTime(J,this.audioCtx.currentTime)}setAllGains($){$.forEach((J,Z)=>{if(Z<this.gains.length)this.gains[Z]=q0(J)});let X=this.audioCtx;if(!X)return;this.gains.forEach((J,Z)=>{if(Z<this.filters.length)this.filters[Z].gain.setValueAtTime(J,X.currentTime)})}setPreamp($){if(this.preampDb=q0($),!this.preampNode||!this.audioCtx)return;let X=Math.pow(10,q0($)/20);this.preampNode.gain.setValueAtTime(X,this.audioCtx.currentTime)}setLoudnessNormalization($){if(this.isNormalizing!==$)this.isNormalizing=$,this.rebuildGraph()}applyPreset($){let X=L1[$]||L1.flat;if(this.setAllGains(X.gains),X.preamp!==void 0)this.setPreamp(X.preamp);return X.gains}fadeIn($){if(!this.fadeNode||!this.audioCtx||$<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let X=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(X),this.fadeNode.gain.setValueAtTime(0.001,X),this.fadeNode.gain.linearRampToValueAtTime(1,X+$)}fadeOut($){if(!this.fadeNode||!this.audioCtx||$<=0)return;let X=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(X),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,X),this.fadeNode.gain.linearRampToValueAtTime(0.001,X+$)}resetFade(){if(this.fadeNode&&this.audioCtx){let $=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues($),this.fadeNode.gain.setValueAtTime(1,$)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),N$(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let $=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData($),$}setPlaybackRate($){this.playbackRate=U$($),this.applyRateAndPitch()}setPreservesPitch($){this.preservesPitch=$,this.applyRateAndPitch()}applyRateAndPitch(){let $=this.hookedVideo??O.getVideo();if(!$)return;if($.playbackRate!==this.playbackRate)$.playbackRate=this.playbackRate;if($.preservesPitch!==this.preservesPitch){$.preservesPitch=this.preservesPitch;let X=$;X.webkitPreservesPitch=this.preservesPitch}}}class O1{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds($){this.crossfadeSeconds=Math.max(0,Math.min(12,$))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange($){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=$.videoId||`${$.title}-${$.artist}`,this.crossfadeSeconds>0)f.getInstance().fadeIn(this.crossfadeSeconds);else f.getInstance().resetFade()}onTick($,X){if(!X||this.crossfadeSeconds<=0||X.durationSecs<=0)return;let J=X.durationSecs-$;if(this.fadeOutTriggered&&J>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),f.getInstance().resetFade();return}if(J<=this.crossfadeSeconds&&!this.fadeOutTriggered&&J>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${J.toFixed(1)}s remaining)...`),f.getInstance().fadeOut(J),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let Z=X.videoId||`${X.title}-${X.artist}`;if(this.currentTrackId===Z)console.log("[YTMD Crossfade] Advancing to next track..."),O.next()},Math.max(100,(J-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class D1{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled($){this.enabled=$}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick($,X,J){if(!this.enabled||!X||!J||J.paused||J.ended)return;let Z=f.getInstance().getAudioPowerDb();if(Z===null)return;if(!this.checkedIntro&&$<15)if(Z<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&$<12)console.log(`[YTMD Skip Silence] Intro silence detected (${Z.toFixed(1)} dB). Fast forwarding...`),J.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(X.durationSecs>15&&$>X.durationSecs-10)if(Z<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${Z.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,O.next()}else this.consecutiveSilentTicks=0}}var d=null,$0=null,E0=null;function L$($){let X=$.equalizer_gains;return Boolean($.equalizer_enabled||$.loudness_normalization||$.skip_silence_enabled||typeof $.crossfade_seconds==="number"&&$.crossfade_seconds>0||typeof $.preamp_gain==="number"&&$.preamp_gain!==0||Array.isArray(X)&&X.some((J)=>J!==0))}var L5={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit($){let X=f.getInstance(),J=new O1,Z=new D1;d=J,$0=Z;let z=$.config,Y=null,j=()=>{if(Y!==null)return;let F=$.getVideoElement();if(F){if(!X.isInitializedFor(F))X.init(F);return}Y=window.setInterval(()=>{let G=$.getVideoElement();if(G){if(Y!==null)clearInterval(Y);Y=null,X.init(G)}},500)};if(L$(z))j();if(z.equalizer_gains&&Array.isArray(z.equalizer_gains))X.setAllGains(z.equalizer_gains);else if(z.equalizer_preset&&typeof z.equalizer_preset==="string")X.applyPreset(z.equalizer_preset);if(z.preamp_gain!==void 0)X.setPreamp(z.preamp_gain);if(z.loudness_normalization!==void 0)X.setLoudnessNormalization(Boolean(z.loudness_normalization));if(z.crossfade_seconds!==void 0)J.setCrossfadeSeconds(z.crossfade_seconds);if(z.skip_silence_enabled!==void 0)Z.setEnabled(Boolean(z.skip_silence_enabled));if(z.playback_speed!==void 0)X.setPlaybackRate(z.playback_speed);if(z.preserve_pitch!==void 0)X.setPreservesPitch(Boolean(z.preserve_pitch));let W=[];if(C){let{listen:F}=C;W.push(F("set-eq-band",(G)=>{j(),X.setBandGain(G.payload.bandIndex,G.payload.gain)}),F("set-eq-all",(G)=>{j(),X.setAllGains(G.payload.gains)}),F("set-eq-preset",(G)=>{j(),X.applyPreset(G.payload)}),F("set-preamp",(G)=>{j(),X.setPreamp(G.payload)}),F("set-loudness-normalization",(G)=>{if(G.payload)j();X.setLoudnessNormalization(G.payload)}),F("set-crossfade-seconds",(G)=>{if(G.payload>0)j();J.setCrossfadeSeconds(G.payload)}),F("set-skip-silence",(G)=>{if(G.payload)j();Z.setEnabled(G.payload)}),F("set-playback-rate",(G)=>{X.setPlaybackRate(G.payload)}),F("set-preserves-pitch",(G)=>{X.setPreservesPitch(G.payload)}))}E0=()=>{if(Y!==null)clearInterval(Y),Y=null;W.forEach((F)=>F.then((G)=>G())),d?.destroy(),d=null,$0=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange($){if(f.getInstance().applyRateAndPitch(),d)d.onTrackChange($);if($0)$0.onTrackChange()},onTick($,X){if(a())return;if(d)d.onTick($,X.track);if($0)$0.onTick($,X.track,X.getVideoElement())},onDestroy(){if(E0)E0(),E0=null}};var B1=($,X,J)=>{let Z=(Y)=>Math.max(0,Math.min(255,Math.round(Y))),z=(Y)=>Z(Y).toString(16).padStart(2,"0");return`#${z($)}${z(X)}${z(J)}`};async function O5($){return new Promise((X)=>{let J={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!$){X(J);return}let Z=new Image;Z.crossOrigin="anonymous",Z.onload=()=>{try{let z=document.createElement("canvas");z.width=16,z.height=16;let Y=z.getContext("2d");if(!Y){X(J);return}Y.drawImage(Z,0,0,16,16);let j=Y.getImageData(0,0,16,16).data,W=0,F=0,G=0,Q=0,q=0,N=0,U=0,L=0;for(let _=0;_<j.length;_+=4){let T=j[_],k=j[_+1],w=j[_+2];if(j[_+3]<128)continue;let k1=(T+k+w)/3;if(k1<20||k1>240)continue;if(_<j.length/2)W+=T,F+=k,G+=w,Q++;else q+=T,N+=k,U+=w,L++}if(Q===0&&L===0){X(J);return}let H=Q>0?Math.round(W/Q):220,D=Q>0?Math.round(F/Q):38,B=Q>0?Math.round(G/Q):38,b=L>0?Math.round(q/L):24,i=L>0?Math.round(N/L):24,g=L>0?Math.round(U/L):27;X({primary:B1(H,D,B),secondary:B1(b,i,g),accent:B1(H+30,D+30,B+30)})}catch{X(J)}},Z.onerror=()=>X(J),Z.src=$})}var u=48,O$=3,D$=3,B$=1.65,C$=0.55;function M$($,X,J,Z){let z=new Float32Array($.length),Y=(j,W,F)=>{let G=F?J:X,Q=F?X:J;for(let q=0;q<G;q++)for(let N=0;N<4;N++)for(let U=0;U<Q;U++){let L=0,H=0;for(let B=Math.max(0,U-Z);B<=Math.min(Q-1,U+Z);B++){let b=F?(q*X+B)*4+N:(B*X+q)*4+N;L+=j[b],H++}let D=F?(q*X+U)*4+N:(U*X+q)*4+N;W[D]=L/H}};Y($,z,!0),Y(z,$,!1)}function A$($,X,J){for(let Z=0;Z<$.length;Z+=4){let z=$[Z],Y=$[Z+1],j=$[Z+2],W=0.2126*z+0.7152*Y+0.0722*j;$[Z]=(W+(z-W)*X)*J,$[Z+1]=(W+(Y-W)*X)*J,$[Z+2]=(W+(j-W)*X)*J}}async function D5($,X=C$){if(!$)return null;return new Promise((J)=>{let Z=new Image;Z.crossOrigin="anonymous",Z.onload=()=>{try{let z=document.createElement("canvas");z.width=u,z.height=u;let Y=z.getContext("2d");if(!Y)return J(null);Y.imageSmoothingQuality="high",Y.drawImage(Z,0,0,u,u);let j=Y.getImageData(0,0,u,u);for(let W=0;W<D$;W++)M$(j.data,u,u,O$);A$(j.data,B$,X),Y.putImageData(j,0,0),J(z.toDataURL("image/png"))}catch{J(null)}},Z.onerror=()=>J(null),Z.src=$})}var k0=null,I0=null,y0,B5={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit($){let X=document.getElementById("ytmd-ambient-backdrop");if(!X)X=V("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(X);X.replaceChildren();let J=V("img",{id:"ytmd-ambient-cover"});J.alt="";let Z=V("div",{id:"ytmd-ambient-veil"});X.appendChild(J),X.appendChild(Z);let z=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6,Y=$.config.ambient_lighting_enabled!==!1,j=document.createElement("style");j.id="ytmd-ambient-styles",j.textContent=`
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
    `,document.head.appendChild(j),k0=(F)=>{if(X)X.style.opacity=String(F)};let W=[];if(C)W.push(C.listen("set-ambient-intensity",(F)=>{k0?.(F.payload)}),C.listen("set-ambient-enabled",(F)=>{let G=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6;k0?.(F.payload?G:0)}));if(I0=()=>{W.forEach((F)=>F.then((G)=>G())),k0=null,y0=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},$.track)this.onTrackChange($.track,$)},async onTrackChange($){let X=$.coverUrl||null;if(X===y0)return;y0=X;let J=document.getElementById("ytmd-ambient-cover");if(J){let Z=X?await D5(X):null;if(X!==y0)return;if(J.style.opacity=Z?"1":"0",Z)J.src=Z}try{let Z=await O5(X||""),z=document.documentElement.style;z.setProperty("--ytmd-accent",Z.accent),z.setProperty("--ytmd-accent-primary",Z.primary),z.setProperty("--ytmd-accent-secondary",Z.secondary)}catch{}},onDestroy(){if(I0)I0(),I0=null}};var C5=`
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

`,M5=`
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

`;var S0=null,A5={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit($){let X=()=>document.head||document.documentElement,J=(W)=>{let F=document.getElementById(W);if(!F){F=document.createElement("style"),F.id=W;let G=X();if(G)G.appendChild(F)}return F},Z=(W)=>{let F=J("ytmd-active-theme");F.textContent=W?C5:M5},z=(W)=>{let F=J("ytmd-custom-css");if(F)F.textContent=W};Z($.config.ambient_lighting_enabled!==!1);let Y=$.config.custom_css||"";z(Y);let j=[];if(C)j.push(C.listen("set-ambient-enabled",(W)=>{Z(W.payload)}),C.listen("set-custom-css",(W)=>{z(W.payload)}));S0=()=>{j.forEach((W)=>W.then((F)=>F()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(S0)S0(),S0=null}};var g0=null,P5={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit($){let X=()=>{if(document.getElementById("ytmd-pip-btn"))return;let Z=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(Z){let z=c({id:"ytmd-pip-btn",label:K().pipButton,iconPath:h.pip});z.addEventListener("click",async()=>{let Y=$.getVideoElement();if(!Y)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await Y.requestPictureInPicture();else await $.invoke("toggle_mini_player")}catch(j){console.warn("[YTMD PiP] Could not enter PiP:",j),await $.invoke("toggle_mini_player").catch((W)=>console.error("[YTMD PiP] Mini player fallback failed:",W))}}),Z.appendChild(z)}},J=window.setInterval(X,1000);X(),g0=()=>{clearInterval(J),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(g0)g0(),g0=null}};var f5={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit($){console.log("[YTMD] Local files module ready.")}};var x0="ytmd-nav-slot",C1="ytmd-menu-btn",V0="ytmd-menu",b5="ytmd-sync-chip",w5=[],u0=null,R5=null,_5=!1,P$=`
  #${x0} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function f$(){if(document.getElementById("ytmd-nav-slot-styles"))return;let $=document.createElement("style");$.id="ytmd-nav-slot-styles",$.textContent=P$,document.head.appendChild($)}function b$($){if(!$)return;return`${K().syncInRoom} · ${K().syncListeners($.listeners)}`}function h5($){w5=$.items,R5=$.onSyncChipClick}function M1(){if(document.getElementById(x0)?.isConnected)return;let $=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!$)return;R(),f$();let X=V("div",{id:x0}),J=c({id:C1,label:K().menuLabel,iconPath:h.apps});J.setAttribute("aria-haspopup","menu"),J.setAttribute("aria-expanded","false"),J.addEventListener("click",(Z)=>{Z.stopPropagation(),w$(J)}),X.appendChild(J),$.prepend(X),T5(),h$()}function A1($){u0=$,T5();let X=document.getElementById(V0);if(X?.classList.contains("ytmd-open"))E5(X)}function T5(){let $=document.getElementById(x0);if(!$)return;let X=document.getElementById(b5);if(!u0){X?.remove();return}if(!X)X=V("button",{id:b5,className:"ytmd-chip"}),X.type="button",X.addEventListener("click",()=>R5?.()),$.prepend(X);let J=K().syncListeners(u0.listeners);X.replaceChildren(V("span",{className:"ytmd-chip-dot"}),A0(h.group,18),V("span",{text:J})),X.dataset.ytmdTooltip=K().syncInRoom,X.setAttribute("aria-label",`${K().syncInRoom}, ${J}`)}function E5($){let X=[];for(let J of w5){if(J.dividerBefore)X.push(V("div",{className:"ytmd-menu-divider"}));let Z=V("button",{className:"ytmd-menu-item"});Z.type="button",Z.setAttribute("role","menuitem"),Z.dataset.itemId=J.id;let z=V("span",{className:"ytmd-menu-item-text"});z.appendChild(V("span",{text:J.label}));let Y=J.id==="sync"?b$(u0):void 0;if(Y)z.appendChild(V("span",{className:"ytmd-menu-item-sub",text:Y}));if(Z.append(A0(J.iconPath),z),J.hint)Z.appendChild(V("span",{className:"ytmd-menu-item-hint",text:J.hint}));Z.addEventListener("click",()=>{X0(),J.onSelect()}),X.push(Z)}$.replaceChildren(...X)}function _$(){let $=document.getElementById(V0);if(!$)$=V("div",{id:V0,className:"ytmd-menu"}),$.setAttribute("role","menu"),$.addEventListener("keydown",R$),document.body.appendChild($);return $}function w$($){let X=_$();if(X.classList.contains("ytmd-open")){X0();return}E5(X);let J=$.getBoundingClientRect();X.style.top=`${J.bottom+4}px`,X.style.right=`${Math.max(8,window.innerWidth-J.right)}px`,X.classList.add("ytmd-open"),$.setAttribute("aria-expanded","true"),X.querySelector(".ytmd-menu-item")?.focus()}function X0(){let $=document.getElementById(V0);if(!$?.classList.contains("ytmd-open"))return;$.classList.remove("ytmd-open");let X=document.getElementById(C1);if(X?.setAttribute("aria-expanded","false"),$.contains(document.activeElement))X?.focus()}function R$($){let X=$.currentTarget,J=Array.from(X.querySelectorAll(".ytmd-menu-item")),Z=J.indexOf(document.activeElement);if($.key==="Escape")$.stopPropagation(),X0();else if($.key==="ArrowDown")$.preventDefault(),J[(Z+1)%J.length]?.focus();else if($.key==="ArrowUp")$.preventDefault(),J[(Z-1+J.length)%J.length]?.focus();else if($.key==="Tab")X0()}function h$(){if(_5)return;_5=!0,document.addEventListener("mousedown",($)=>{let X=document.getElementById(V0);if(!X?.classList.contains("ytmd-open"))return;let J=$.target;if(X.contains(J)||document.getElementById(C1)?.contains(J))return;X0()}),window.addEventListener("resize",X0)}function k5($){return $.is_host?"host":$.role??"dj"}function m($){return $!=="listener"}function I5($){return Math.floor($/2)+1}function T$($,X,J){let Z=0;return X.forEach((z,Y)=>{if(Y!==J&&$>z)Z++}),Z}var m0=null;function y5($,X){if(!m0)return;let J=[...$.querySelectorAll(X)].find((Z)=>Z.dataset.itemId===m0);if(J)J.focus(),m0=null}function S5({list:$,rowSelector:X,handleSelector:J,onMove:Z}){let z=()=>[...$.querySelectorAll(X)],Y=()=>z().forEach((U)=>U.classList.remove("is-dragging","drop-before","drop-after")),j=null,W=(U,L)=>{let H=z().filter((D,B)=>B!==L);if(H.forEach((D)=>D.classList.remove("drop-before","drop-after")),U<H.length)H[U].classList.add("drop-before");else H[H.length-1]?.classList.add("drop-after")},F=(U)=>{if(U.button!==0||!(U.target instanceof Element))return;let L=U.target.closest(J),H=L?.closest(X);if(!L||!H||!L.dataset.itemId)return;let D=z().indexOf(H);if(D<0)return;U.preventDefault();try{L.setPointerCapture(U.pointerId)}catch{}j={from:D,itemId:L.dataset.itemId,to:D,pointerId:U.pointerId,handle:L},H.classList.add("is-dragging")},G=(U)=>{if(!j||U.pointerId!==j.pointerId)return;let L=z().map((H)=>{let D=H.getBoundingClientRect();return D.top+D.height/2});j.to=T$(U.clientY,L,j.from),W(j.to,j.from)},Q=(U)=>{if(!j||U.pointerId!==j.pointerId)return;let{from:L,to:H,itemId:D,handle:B}=j;if(j=null,B.hasPointerCapture(U.pointerId))B.releasePointerCapture(U.pointerId);if(Y(),H!==L)Z(L,H,D)},q=(U)=>{if(U.key!=="ArrowUp"&&U.key!=="ArrowDown"||!(U.target instanceof Element))return;let L=U.target.closest(J),H=L?.closest(X);if(!L||!H||!L.dataset.itemId)return;U.preventDefault();let D=z(),B=D.indexOf(H),b=U.key==="ArrowUp"?B-1:B+1;if(B<0||b<0||b>=D.length)return;m0=L.dataset.itemId,Z(B,b,L.dataset.itemId)},N=()=>{j=null,Y()};return $.addEventListener("pointerdown",F),$.addEventListener("pointermove",G),$.addEventListener("pointerup",Q),$.addEventListener("pointercancel",N),$.addEventListener("keydown",q),()=>{$.removeEventListener("pointerdown",F),$.removeEventListener("pointermove",G),$.removeEventListener("pointerup",Q),$.removeEventListener("pointercancel",N),$.removeEventListener("keydown",q)}}var g5="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var Z0="ytmd-sync-queue",P1="ytmd-sync-queue-styles",v0="data-ytmd-sync-queue",N0="data-ytmd-sync-queue-tab",E$="M8 5v14l11-7z",k$="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",I$=/^[A-Za-z0-9_-]{11}$/;function m5($){if(typeof $!=="object"||$===null)return null;let X=$.serviceEndpoint?.queueAddEndpoint;if(typeof X!=="object"||X===null)return null;let{queueTarget:J,queueInsertPosition:Z}=X;return{videoId:typeof J?.videoId==="string"&&I$.test(J.videoId)?J.videoId:null,next:Z==="INSERT_AFTER_CURRENT_VIDEO"}}function y$($){return`
  html[${v0}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${v0}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify($)};
    font-size: 14px;
  }
  html[${N0}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${Z0} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${N0}] #${Z0} { display: block; }
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
`}function S$($){R();let X=document.getElementById(P1);if(!X)X=V("style",{id:P1}),document.head.appendChild(X);let J=y$($);if(X.textContent!==J)X.textContent=J}var v5=".ytmd-sq-handle",g$=".ytmd-sq-queued";function x5($){let X=V("div",{className:"ytmd-sq-row"}),J=V("img",{className:"ytmd-sq-thumb"});J.alt="",J.loading="lazy",J.src=`https://i.ytimg.com/vi/${$.videoId}/default.jpg`;let Z=V("div",{className:"ytmd-sq-text"});if(Z.append(V("span",{className:"ytmd-sq-title",text:$.title}),V("span",{className:"ytmd-sq-sub",text:$.sub})),$.handle)X.appendChild($.handle);if(X.append(J,Z),$.actions.length){let z=V("div",{className:"ytmd-sq-actions"});z.append(...$.actions),X.appendChild(z)}return X}function u5($,X,J){let Z=c({label:$,iconPath:X,muted:!0});return Z.addEventListener("click",(z)=>{z.stopPropagation(),J()}),Z}function p5($,X,J){let Z=K(),z=[];if(X.nowPlaying)z.push(V("div",{className:"ytmd-sq-heading",text:Z.syncQueueNowPlaying})),z.push(x5({...X.nowPlaying,sub:X.nowPlaying.artist,actions:[]}));if(z.push(V("div",{className:"ytmd-sq-heading",text:Z.syncQueueTitle})),X.queue.length===0)z.push(V("p",{className:"ytmd-sq-hint",text:m(X.myRole)?Z.syncQueueEmpty:Z.syncQueueListenerHint}));let Y=X.myRole==="host"||X.myRole==="moderator";for(let j of X.queue){let W=[];if(m(X.myRole))W.push(u5(Z.syncQueuePlayNow(j.title),E$,()=>J.play(j.id)));if(Y||j.added_by_id===X.myId)W.push(u5(Z.syncQueueRemove(j.title),k$,()=>J.remove(j.id)));let F;if(m(X.myRole)&&X.queue.length>1)F=c({label:Z.syncQueueDrag(j.title),iconPath:g5,muted:!0}),F.classList.add("ytmd-sq-handle"),F.dataset.itemId=j.id;let G=Z.syncQueueFrom(j.added_by),Q=x5({videoId:j.video_id,title:j.title,sub:j.artist?`${j.artist} · ${G}`:G,actions:W,handle:F});Q.classList.add("ytmd-sq-queued"),z.push(Q)}$.replaceChildren(...z),y5($,v5)}var J0=null;function p0(){let $=document.documentElement;if(!J0){$.removeAttribute(N0);return}let X=document.querySelector("ytmusic-player-page #side-panel"),J=document.getElementById(Z0);if(X&&J?.parentElement!==X){if(!J)J=V("div",{id:Z0}),S5({list:J,rowSelector:g$,handleSelector:v5,onMove:(z,Y,j)=>J0?.actions.move(j,Y)});J.setAttribute("role","region"),J.setAttribute("aria-label",K().syncQueueTitle),p5(J,J0.model,J0.actions),X.insertBefore(J,X.querySelector(":scope > #tab-renderer"))}let Z=document.querySelector("ytmusic-player-page tp-yt-paper-tab");$.toggleAttribute(N0,!!J?.isConnected&&Z?.getAttribute("aria-selected")==="true")}function c5($,X){J0={model:$,actions:X},S$(K().syncQueueTab),document.documentElement.setAttribute(v0,"");let J=document.getElementById(Z0);if(J)p5(J,$,X);p0()}function f1(){J0=null,document.documentElement.removeAttribute(v0),document.documentElement.removeAttribute(N0),document.getElementById(Z0)?.remove(),document.getElementById(P1)?.remove()}function z0($){if($.is_host)return"host";let X=$.members.find((J)=>J.id===$.current_user_id);return X?k5(X):"dj"}function x$($,X,J){let Z=new Set($.map((Y)=>Y.id)),z=new Set(X.map((Y)=>Y.id));return{joined:X.filter((Y)=>Y.id!==J&&!Z.has(Y.id)).map((Y)=>Y.nickname),left:$.filter((Y)=>Y.id!==J&&!z.has(Y.id)).map((Y)=>Y.nickname)}}var n=/^[A-Za-z0-9_-]{11}$/,u$=2,m$=0.25,v$=0.05,p$=3,l5=0.1,c$=0.5,l$=1,d$=1000,n$=1,d5=5000,s$=4000,n5=15000,r$=3,i$=4000,s5=1,a$=1e4,o$=5,t$=1e4,e$=1.2;function r5($,X){return Number.isFinite(X)&&X>s5?Math.min($,X-s5):$}function $6($,X,J){let Z={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(n.test($.video_id)&&X.videoId!==$.video_id)return Z.navigateTo=$.video_id,Z;if($.is_playing===X.paused)Z.setPlaying=$.is_playing;if(!$.is_playing){if(Math.abs(X.currentTime-$.current_time_secs)>c$)Z.seekTo=r5($.current_time_secs,X.duration);return Z}let z=$.current_time_secs+Math.min(l$,Math.max(0,J)),Y=z-X.currentTime;if(Math.abs(Y)>u$)Z.seekTo=r5(z,X.duration);else if(Math.abs(Y)>(X.correcting?v$:m$))Z.playbackRate=1+Math.max(-l5,Math.min(l5,Y/p$));return Z}class i5{windowSize;samples=[];constructor($=30){this.windowSize=$}transitSecs($,X){let J=X-$;if(this.samples.push(J),this.samples.length>this.windowSize)this.samples.shift();return(J-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function X6($,X){return X!==null&&$<X&&X-$<t$}function a5($,X){switch($){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:X};default:return null}}var J6=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function o5(){return new URLSearchParams(window.location.search).get("v")}function c0($){let X=document.getElementById("movie_player"),J=X?.getVideoData?.()?.video_id,Z=X?.getCurrentTime?.();if(J&&n.test(J)&&typeof Z==="number"&&Number.isFinite(Z))return{videoId:J,currentTime:Z};return{videoId:o5(),currentTime:$?$.currentTime:0}}function b1(){let $=document.getElementById("movie_player");return!!$&&($.classList.contains("ad-showing")||$.classList.contains("ad-interrupting"))}function U0($){let X=document.querySelector("ytmusic-app");if(!X){window.location.href=`https://music.youtube.com/watch?v=${$}`;return}X.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:$}}}}))}class t5{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor($=P){this.notify=$}lastBroadcast=null;pendingNav=null;transit=new i5;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;finished=null;rateCorrection=null;setRoomState($,X,J=!0){let Z=$!==this.inRoom||X!==this.isHost;if(this.inRoom=$,this.isHost=X,this.canControl=J,x1(this.isGuest()),!Z)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback($,X,J=Date.now()){if(!this.isGuest()||b1())return;if(X6($.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=$.timestamp_ms;let Z=this.transit.transitSecs($.timestamp_ms,J);if(n.test($.video_id))this.hostVideoId=$.video_id;let z=this.requestedVideo;if(z){if($.video_id!==z.videoId&&J-z.atMs<s$)return;this.requestedVideo=null}let Y=c0(X);if(this.waitingForHostsNext($,Y.videoId,X,J)){this.endRateCorrection(),O.pause();return}let j={videoId:Y.videoId,paused:X?X.paused:!0,currentTime:Y.currentTime,duration:X?X.duration:NaN,correcting:this.rateCorrection!==null},W=$6($,j,Z);if(W.navigateTo){this.endRateCorrection();let F=this.pendingNav;if(F&&F.videoId===W.navigateTo&&J-F.atMs<d5)return;let G=F&&F.videoId===W.navigateTo?F.attempts+1:1;if(this.pendingNav={videoId:W.navigateTo,atMs:J,attempts:G},this.rememberOwnNav(W.navigateTo,J),O.pause(),G>1)window.location.href=`https://music.youtube.com/watch?v=${W.navigateTo}`;else U0(W.navigateTo);return}if(this.pendingNav=null,!X)return;if(W.setPlaying===!0)O.play();else if(W.setPlaying===!1)O.pause();if(W.seekTo!==null)this.endRateCorrection(),O.seekTo(W.seekTo);else this.setCatchUpRate(X,W.playbackRate)}waitingForHostsNext($,X,J,Z){let z=this.finished;return!!z&&$.video_id===z.videoId&&Z-z.atMs<a$&&z.duration-$.current_time_secs<o$&&(X!==z.videoId||!!J?.ended)}rememberOwnNav($,X){for(let[J,Z]of this.ownNavs)if(X-Z>n5)this.ownNavs.delete(J);this.ownNavs.set($,X)}setCatchUpRate($,X){if(X===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==$)this.endRateCorrection(),this.rateCorrection={video:$,rate:$.playbackRate,preservesPitch:$.preservesPitch};$.preservesPitch=!0,$.playbackRate=X}endRateCorrection(){let $=this.rateCorrection;if(!$)return;this.rateCorrection=null,$.video.playbackRate=$.rate,$.video.preservesPitch=$.preservesPitch}noteLocalTick($,X=Date.now()){if(!this.isGuest()||!$)return;if(Number.isFinite($.duration)&&$.duration>0&&$.duration-$.currentTime<r$){this.nearEndAtMs=X;let{videoId:J}=c0($);if(J)this.finished={videoId:J,duration:$.duration,atMs:X}}}handleLocalTrackChange($,X=Date.now()){if(!this.isGuest()||!this.canControl||!$||!n.test($))return null;if(this.hostVideoId===null||$===this.hostVideoId)return null;let J=this.ownNavs.get($);if(J!==void 0&&X-J<n5)return null;if(X-this.nearEndAtMs<i$)return null;if(this.requestedVideo?.videoId===$)return null;return this.requestedVideo={videoId:$,atMs:X},{kind:"play_video",video_id:$}}requestControl($,X){if(!this.canControl){if($.kind!=="next"){this.notify(K().syncListenerOnly);return}X("vote_sync_skip").then(()=>this.notify(K().syncVotedSkip)).catch((J)=>{console.error("[YTMD Room Sync] vote failed:",J),this.notify(K().actionFailed)});return}X("send_sync_control",{action:$}).catch((J)=>{console.error("[YTMD Room Sync] control request failed:",J),this.notify(K().actionFailed)})}applyRemoteControl($){if(!this.inRoom||!this.isHost)return;let{from:X,action:J,source:Z}=$,z=Z?.kind==="vote"?K().syncVoteSkipped:Z?.kind==="queue"?K().syncFromQueue(Z.title,X):null;switch(J.kind){case"next":O.next(),this.notify(z??K().syncGuestNext(X));break;case"previous":O.previous(),this.notify(z??K().syncGuestPrevious(X));break;case"set_playing":{let Y=O.getVideo();if(!Y||Y.paused!==J.playing)return;if(J.playing)O.play();else O.pause();this.notify(z??(J.playing?K().syncGuestResumed(X):K().syncGuestPaused(X)));break}case"play_video":if(!n.test(J.video_id)||J.video_id===o5())return;U0(J.video_id),this.notify(z??K().syncGuestPicked(X));break}}advanceQueue($,X,J){if(!X||b1())return;let Z=X.duration-X.currentTime;if(!Number.isFinite(Z)||Z>e$&&!X.ended)return;this.playNextFromQueue($,J,X,!1)}playNextFromQueue($,X,J=O.getVideo(),Z=!0,z=Date.now()){if(!this.inRoom||!this.isHost||$===0)return!1;let{videoId:Y}=c0(J),j=this.queueAdvance;if(j&&j.from===Y&&z-j.atMs<d5)return!0;this.queueAdvance={from:Y,atMs:z};let W=()=>{if(Z)O.nextInYtm()};return X("sync_queue_take_next").then((F)=>{let G=F;if(!G||!n.test(G.video_id)){W();return}O.pause(),U0(G.video_id),this.notify(K().syncFromQueue(G.title,G.added_by))}).catch((F)=>{console.error("[YTMD Room Sync] playing from the shared queue failed:",F),W()}),!0}broadcastLocalState($,X,J,Z=!1){if(!this.inRoom||!this.isHost||!$||!X||b1())return;if(X.ended)return;let{videoId:z,currentTime:Y}=c0(X);if(!z)return;let j=Date.now(),W=this.lastBroadcast,F=W?W.position+(j-W.atMs)/1000*W.rate:0,G=!!W&&W.playing&&!X.paused&&Math.abs(Y-F)>n$,Q=!!W&&W.videoId!==z;if(!Z&&!G&&!Q&&W&&j-W.atMs<d$)return;this.lastBroadcast={atMs:j,videoId:z,position:Y,rate:X.playbackRate,playing:!X.paused},J("broadcast_sync_state",{playback:{video_id:z,title:$.title,artist:$.artist,current_time_secs:Y,is_playing:!X.paused,timestamp_ms:j}}).catch((q)=>console.error("[YTMD Room Sync] broadcast failed:",q))}}var E=null,s=null,l0=null,S=null,w1=null,Z6=1000;function e5(){let $=S,X=s;if(!$||!X){f1();return}let J=w1,Z=(z)=>(Y)=>{X(z,{itemId:Y}).catch((j)=>{console.error(`[YTMD Room Sync] ${z} failed:`,j),P(K().actionFailed)})};c5({queue:$.queue??[],nowPlaying:J?.videoId&&n.test(J.videoId)?{videoId:J.videoId,title:J.title,artist:J.artist}:null,myId:$.current_user_id,myRole:z0($)},{play:Z("sync_queue_play"),remove:Z("sync_queue_remove"),move:(z,Y)=>{X("sync_queue_move",{itemId:z,toIndex:Y}).catch((j)=>{console.error("[YTMD Room Sync] sync_queue_move failed:",j),P(K().actionFailed)})}})}function z6(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function Y6($,X){if(!S||!m(z0(S))){P(K().syncQueueListenerNo);return}if(!$.videoId){P(K().syncQueueSongsOnly);return}X("sync_queue_add",{input:$.videoId,next:$.next}).then(()=>P($.next?K().syncQueuedNext:K().syncQueued)).catch((J)=>{console.error("[YTMD Room Sync] adding to the shared queue failed:",J),P(K().actionFailed)})}function $8($){let X=E;if(!X||!s||!X.isGuest())return!1;let J=O.getVideo(),Z=a5($,J?J.paused:!0);if(!Z)return!1;return X.requestControl(Z,s),!0}function X8($){let X=E;if(!X||!s||!X.isGuest())return!1;return X.requestControl({kind:"play_video",video_id:$},s),!0}function _1($,X,J="left"){let Z=S;if(S=$,A1($?{listeners:$.members.length,isHost:$.is_host}:null),e5(),!X)return;if(!$){if(!Z)return;P(J==="kicked"?K().syncKicked:J==="lost"?K().syncLost:K().syncRoomClosed);return}if(!Z||Z.room_id!==$.room_id){if(!$.is_host)P(K().syncConnected);return}if($.reconnecting){if(!Z.reconnecting)P(K().syncReconnecting);return}let z=(q)=>q.members.find((N)=>N.is_host)?.id;if(z(Z)!==z($)){let q=$.members.find((N)=>N.is_host);if($.is_host)P(K().syncYouHost);else if(q)P(K().syncNewHost(q.nickname));return}if(Z.reconnecting)return;let{joined:Y,left:j}=x$(Z.members,$.members,$.current_user_id),W=[...Y.map(K().syncJoined),...j.map(K().syncLeft)],F=$.skip_votes??[],G=F.filter((q)=>q!==$.current_user_id&&!(Z.skip_votes??[]).includes(q));for(let q of G){let N=$.members.find((U)=>U.id===q)?.nickname;if(N)W.push(K().syncVoteProgress(N,F.length,I5($.members.length)))}let Q=z0($);if(Q!==z0(Z))W.push(Q==="moderator"?K().syncRoleModerator:Q==="listener"?K().syncRoleListener:K().syncRoleDj);if(W.length>0)P(W.join(" · "))}var J8={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit($){let X=new t5;E=X,s=$.invoke;let J=[];if(C)J.push(C.listen("sync-room-updated",(Y)=>{X.setRoomState(!0,Y.payload.is_host,m(z0(Y.payload))),_1(Y.payload,!0)}),C.listen("sync-room-left",(Y)=>{X.setRoomState(!1,!1),_1(null,!0,Y.payload?.reason??"left")}),C.listen("sync-playback-remote",(Y)=>{X.handleRemotePlayback(Y.payload,$.getVideoElement())}),C.listen("sync-control-remote",(Y)=>{X.applyRemoteControl(Y.payload)}),C.listen("sync-reaction",(Y)=>{$5(Y.payload.emoji,Y.payload.from)}));let Z=(Y)=>{if(!(Y.target instanceof Element))return;let j=Y.target;if(j.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(p0,0);if(X.isInRoom()){let Q=j.closest("ytmusic-menu-service-item-renderer"),q=Q?m5(Q.data):null;if(q){Y.preventDefault(),Y.stopImmediatePropagation(),z6(),Y6(q,$.invoke);return}}if(!Y.isTrusted)return;if(X.isRoomHost()&&j.closest("ytmusic-player-bar .next-button")&&X.playNextFromQueue(S?.queue?.length??0,$.invoke)){Y.preventDefault(),Y.stopImmediatePropagation();return}if(!X.isGuest())return;let W=J6.find(([Q])=>j.closest(Q));if(!W)return;let F=$.getVideoElement(),G=a5(W[1],F?F.paused:!0);if(!G)return;Y.preventDefault(),Y.stopImmediatePropagation(),X.requestControl(G,$.invoke)};window.addEventListener("click",Z,!0);let z=setInterval(p0,Z6);J1(()=>X.playNextFromQueue(S?.queue?.length??0,$.invoke)),$.invoke("get_sync_room_state").then((Y)=>{if(E!==X||!Y||typeof Y!=="object")return;let j=Y;if(X.setRoomState(!0,j.is_host,m(z0(j))),_1(j,!1),!j.is_host&&j.playback_state)X.handleRemotePlayback(j.playback_state,$.getVideoElement())}).catch((Y)=>console.error("[YTMD Room Sync] failed to restore room state:",Y)),l0=()=>{J.forEach((Y)=>Y.then((j)=>j())),window.removeEventListener("click",Z,!0),clearInterval(z),J1(null),X.setRoomState(!1,!1),E=null,s=null,S=null,w1=null,A1(null),f1()}},onTrackChange($,X){let J=E;if(!J)return;w1=$,e5(),J.broadcastLocalState($,X.getVideoElement(),X.invoke,!0);let Z=J.handleLocalTrackChange($.videoId);if(Z)J.requestControl(Z,X.invoke)},onPlaybackChange($,X){E?.broadcastLocalState(X.track,X.getVideoElement(),X.invoke,!0)},onTick($,X){let J=X.getVideoElement();E?.broadcastLocalState(X.track,J,X.invoke),E?.noteLocalTick(J),E?.advanceQueue(S?.queue?.length??0,J,X.invoke)},onDestroy(){if(l0)l0(),l0=null}};var d0=null,j6=($,X)=>X&&$!==!1,Z8={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit($){let X=null,J=!1,Z=null,z=(N)=>{if(J===N)return;J=N,$.invoke("set_inhibit_sleep",{inhibit:N}).catch((U)=>{J=!N,console.error("[YTMD Power] set_inhibit_sleep failed:",U)})},Y=async()=>{if(!("wakeLock"in navigator)||X!==null)return;try{X=await navigator.wakeLock.request("screen"),X.addEventListener("release",()=>{X=null})}catch{}},j=()=>{X?.release().catch(()=>{}),X=null},W=()=>{let N=$.getVideoElement(),U=!!N&&!N.paused&&!N.ended,L=j6($.config.inhibit_sleep,U);if(z(L),L)Y();else j()},F=(N)=>{for(let U of["play","playing","pause","ended"])N.addEventListener(U,W);Z=N},G=(N)=>{for(let U of["play","playing","pause","ended"])N.removeEventListener(U,W)},Q=$.getVideoElement();if(Q)F(Q);W();let q=window.setInterval(()=>{let N=$.getVideoElement();if(N&&N!==Z){if(Z)G(Z);F(N),W()}},1000);d0=()=>{if(clearInterval(q),Z)G(Z);Z=null,j(),z(!1)}},onDestroy(){if(d0)d0(),d0=null}};var Y8=($)=>typeof $==="object"&&$!==null&&!Array.isArray($),A=($,...X)=>X.reduce((J,Z)=>J==null?void 0:J[Z],$),s0=/^[A-Za-z0-9_-]{11}$/;function Y0($){let X=A($,"runs");if(Array.isArray(X))return X.map((Z)=>typeof A(Z,"text")==="string"?A(Z,"text"):"").join("");let J=A($,"simpleText");return typeof J==="string"?J:""}function R1($){if(!Array.isArray($)||$.length===0)return null;let X=A($[$.length-1],"url");return typeof X==="string"?X:null}function z8($,X){return Y0(A($,"flexColumns",X,"musicResponsiveListItemFlexColumnRenderer","text"))}function W6($){let X=A($,"playlistItemData","videoId")??A($,"overlay","musicItemThumbnailOverlayRenderer","content","musicPlayButtonRenderer","playNavigationEndpoint","watchEndpoint","videoId");if(typeof X!=="string"||!s0.test(X))return null;return{video_id:X,title:z8($,0),subtitle:z8($,1),thumbnail:R1(A($,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function G6($){let X=A($,"title","runs",0,"navigationEndpoint","watchEndpoint","videoId");if(typeof X!=="string"||!s0.test(X))return null;return{video_id:X,title:Y0(A($,"title")),subtitle:Y0(A($,"subtitle")),thumbnail:R1(A($,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function h1($,X=20){let J=[],Z=new Set,z=(Y,j)=>{if(J.length>=X||j>40)return;if(Array.isArray(Y)){for(let W of Y)z(W,j+1);return}if(!Y8(Y))return;for(let[W,F]of Object.entries(Y)){let G=null;if(W==="musicResponsiveListItemRenderer")G=W6(F);else if(W==="musicCardShelfRenderer")G=G6(F);if(G&&!Z.has(G.video_id)){if(Z.add(G.video_id),J.push(G),J.length>=X)return}z(F,j+1)}};return z($,0),J}function n0($){let X=A($,"playlistPanelVideoRenderer")??A($,"playlistPanelVideoWrapperRenderer","primaryRenderer","playlistPanelVideoRenderer");return Y8(X)?X:null}function j8($){let X=[];return $.forEach((J,Z)=>{let z=n0(J),Y=A(z,"videoId");if(!z||typeof Y!=="string")return;X.push({id:`${Z}:${Y}`,video_id:Y,title:Y0(A(z,"title")),artist:Y0(A(z,"shortBylineText"))||Y0(A(z,"longBylineText")),thumbnail:R1(A(z,"thumbnail","thumbnails")),current:A(z,"selected")===!0})}),X}function W8($,X){let J=X.indexOf(":");if(J<=0)return-1;let Z=Number(X.slice(0,J)),z=X.slice(J+1),Y=Number.isInteger(Z)?n0($[Z]):null;if(Y&&A(Y,"videoId")===z)return Z;return $.findIndex((j)=>A(n0(j),"videoId")===z)}function G8($,X){if(!X)return $.length;let J=$.findIndex((Z)=>A(n0(Z),"selected")===!0);return J>=0?J+1:$.length}function F8($,X,J=15000){if(!$)return!0;let{position_secs:Z,sampled_at_ms:z,...Y}=$,{position_secs:j,sampled_at_ms:W,...F}=X;if(JSON.stringify(Y)!==JSON.stringify(F))return!0;if(W-z>=J)return!0;let G=$.playing?Z+(W-z)/1000:Z;return Math.abs(j-G)>1.5}var F6="EgWKAQIIAWoMEA4QChADEAQQCRAF",Q6=1000,H6=2000;function E1(){return document.querySelector("#queue")}function e0(){let $=E1()?.queue?.store?.store?.getState().queue?.items;return Array.isArray($)?$:[]}function r0($,X){let J=E1();if(!J?.dispatch)throw Error("remote.error.noQueue");J.dispatch({type:$,payload:X})}function H8(){let $=document.querySelector("ytmusic-app")?.networkManager;if(!$||typeof $.fetch!=="function")throw Error("remote.error.unsupported");return $}async function K6($){let X=H8(),J=h1(await X.fetch("/search",{query:$,params:F6}));if(J.length===0)J=h1(await X.fetch("/search",{query:$}));return J}async function q6($,X){let J=E1()?.queue?.store?.store;if(!J)throw Error("remote.error.noQueue");let Z=J.getState().queue??{},Y=(await H8().fetch("/music/get_queue",{queueContextParams:Z.queueContextParams,queueInsertPosition:X?"INSERT_AFTER_CURRENT_VIDEO":"INSERT_AT_END",videoIds:[$]}))?.queueDatas,j=Array.isArray(Y)?Y.map((F)=>F&&typeof F==="object"&&("content"in F)?F.content:null).filter(Boolean):[];if(j.length===0)throw Error("remote.error.unsupported");let W=e0();r0("ADD_ITEMS",{nextQueueItemId:J.getState().queue?.nextQueueItemId,index:G8(W,X),items:j,shuffleEnabled:!1,shouldAssignIds:!0})}function T1($){let X=W8(e0(),$);if(X<0)throw Error("remote.error.gone");return X}function V6(){let $=getComputedStyle(document.documentElement),X=$.getPropertyValue("--ytmd-accent-primary").trim(),J=$.getPropertyValue("--ytmd-accent-secondary").trim(),Z=$.getPropertyValue("--ytmd-accent").trim();return X&&J&&Z?{primary:X,secondary:J,accent:Z}:null}function N6(){let $=O.getVideo(),J=document.getElementById("movie_player")?.getCurrentTime?.();return{playing:!!$&&!$.paused&&!$.ended,position_secs:typeof J==="number"&&Number.isFinite(J)?J:$?.currentTime??0,sampled_at_ms:Date.now(),volume:$?j0($)/100:1,muted:$?L0($):!1,like:O.getLikeStatus(),shuffle:O.isShuffleOn(),repeat:O.getRepeatMode(),accent:V6()}}async function U6($,X){switch(X.kind){case"command":if(X.command==="shuffle")O.toggleShuffle();else if(X.command==="repeat")O.cycleRepeat();else $.sendPlayerCommand(X.command);return null;case"seek":return O.seekTo(X.position_secs),null;case"volume":return O.setVolume(X.volume),null;case"play":if(!s0.test(X.video_id))throw Error("remote.error.invalid");if(!X8(X.video_id))U0(X.video_id);return null;case"search":return K6(X.query);case"enqueue":return await q6(X.video_id,X.next),null;case"queue_jump":return r0("SET_INDEX",T1(X.item_id)),null;case"queue_remove":return r0("REMOVE_ITEM",T1(X.item_id)),null;case"queue_move":{let J=T1(X.item_id),Z=Math.max(0,Math.min(X.to_index,e0().length-1));return r0("MOVE_ITEM",{fromIndex:J,toIndex:Z}),null}}}var i0=[],a0=[],o0=null,t0="";function K8(){a0.forEach(($)=>clearInterval($)),a0=[],o0=null,t0=""}function L6($){if(a0.length>0)return;let X=()=>{let Z=N6();if(!F8(o0,Z))return;o0=Z,$.invoke("remote_publish",{kind:"state",data:Z}).catch(()=>{return})},J=()=>{let Z=j8(e0()),z=JSON.stringify(Z);if(z===t0)return;t0=z,$.invoke("remote_publish",{kind:"queue",data:Z}).catch(()=>{return})};X(),J(),a0.push(window.setInterval(X,Q6),window.setInterval(J,H6))}function Q8($,X){if(X>0)L6($);else K8()}function q8($){let X=C;if(!X)return;X.listen("remote-action",({payload:J})=>{if(!J?.action)return;U6($,J.action).then((Z)=>{if(J.id!=null)$.invoke("remote_reply",{id:J.id,ok:!0,data:Z??null}).catch(()=>{return});o0=null,t0=""},(Z)=>{let z=Z instanceof Error?Z.message:String(Z);if(console.warn("[YTMD Remote] action failed:",J.action.kind,z),J.id!=null)$.invoke("remote_reply",{id:J.id,ok:!1,error:z}).catch(()=>{return})})}).then((J)=>i0.push(J)),X.listen("remote-clients",({payload:J})=>Q8($,J)).then((J)=>i0.push(J)),$.invoke("remote_clients").then((J)=>Q8($,typeof J==="number"?J:0)).catch(()=>{return})}function V8(){i0.forEach(($)=>$()),i0=[],K8()}var N8={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit($){q8($)},onDestroy(){V8()}};var r=($)=>{v($).catch((X)=>{console.error(`[YTMD] ${$} failed:`,X),P(K().actionFailed)})};function O6(){h5({onSyncChipClick:()=>r("toggle_sync_window"),items:[{id:"settings",iconPath:h.tune,label:K().menuSettings,hint:"Ctrl+,",onSelect:()=>r("toggle_settings_window")},{id:"local",iconPath:h.folderMusic,label:K().menuLocal,onSelect:()=>r("toggle_local_library_window")},{id:"sync",iconPath:h.group,label:K().menuSync,onSelect:()=>r("toggle_sync_window")},{id:"remote",iconPath:h.phone,label:K().menuRemote,onSelect:()=>r("open_remote_pairing")},{id:"mini",iconPath:h.miniPlayer,label:K().menuMiniPlayer,onSelect:()=>r("toggle_mini_player")}]})}var D6={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function U8($){let X={};for(let[J,[Z,z]]of Object.entries(D6)){let Y=$[Z];X[J]=typeof Y==="boolean"?Y:z}return X}async function L8(){console.log("[YTMD] Initializing desktop integration bridge...");let $={};O6(),M1();let X=setInterval(M1,1000);window.addEventListener("pagehide",()=>clearInterval(X));try{let Q=await v("get_config");if(Q&&typeof Q==="object")Object.assign($,Q)}catch(Q){console.error("[YTMD] Failed to load config, using defaults:",Q)}let Z=new z1({track:null,config:$,invoke:v,sendPlayerCommand:(Q)=>{F(Q)},getVideoElement:()=>O.getVideo()});Z.register(r1),Z.register(i1),Z.register(G5),Z.register(V5),Z.register(N5),Z.register(U5),Z.register(L5),Z.register(B5),Z.register(A5),Z.register(P5),Z.register(f5),Z.register(J8),Z.register(Z8),Z.register(N8);try{await Z.initAll(U8($))}catch(Q){console.error("[YTMD] Registry init error:",Q)}let z=new $1,Y=0,j=Date.now();async function W(Q,q,N){try{await v("update_track_info",{track:{title:Q.title,artist:Q.artist,album:Q.album||null,cover_url:Q.coverUrl||null,duration_secs:Math.round(Q.durationSecs||0),current_time_secs:Math.round(q),is_playing:N,video_id:Q.videoId||null,playlist_id:Q.playlistId||null,sampled_at_ms:Date.now()}})}catch(U){console.error("[YTMD] Failed to sync track info to backend:",U)}}z.onTrackChange(async(Q)=>{Y=Q.currentTimeSecs||0,j=Date.now(),Z.handleTrackChange(Q),await W(Q,Q.currentTimeSecs||0,Q.isPlaying)}),z.onPlaybackChange(async(Q)=>{Z.handlePlaybackChange(Q);let q=z.getCurrentTrack();if(q)q.isPlaying=Q,Y=q.currentTimeSecs||0,j=Date.now(),await W(q,q.currentTimeSecs||0,Q)}),z.onTick((Q)=>{Z.handleTick(Q);let q=z.getCurrentTrack();if(!q||!q.isPlaying)return;let N=Date.now(),U=(N-j)/1000,L=Y+U;if(Math.abs(Q-L)>2||U>=15)Y=Q,j=N,q.currentTimeSecs=Math.round(Q),W(q,Q,!0)});function F(Q){if($8(Q))return;switch(Q){case"play":O.play();break;case"pause":O.pause();break;case"play_pause":O.playPause();break;case"next":O.next();break;case"previous":O.previous();break;case"like":O.toggleLike();break;case"dislike":O.toggleDislike();break;case"mute":O.toggleMute();break}}let G=(Q,q)=>{C.listen(Q,(N)=>q(N.payload))};G("player-command",(Q)=>F(Q)),G("tray-command",(Q)=>F(Q)),G("mpris-command",(Q)=>F(Q)),G("global-shortcut-event",(Q)=>F(Q)),G("player-seek",(Q)=>O.seekTo(Q)),G("mpris-command-seek",(Q)=>O.seekTo(Q)),G("player-volume",(Q)=>O.setVolume(Q)),G("config-updated",(Q)=>{if(!Q||typeof Q!=="object")return;Object.assign($,Q);let q=U8($);for(let[N,U]of Object.entries(q))if(U)Z.enable(N).catch((L)=>console.error(`[YTMD] Failed to enable plugin ${N}:`,L));else Z.disable(N).catch((L)=>console.error(`[YTMD] Failed to disable plugin ${N}:`,L))}),window.addEventListener("keydown",(Q)=>{if(Q.ctrlKey&&Q.key===","||Q.key==="F2")Q.preventDefault(),r("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var B6=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(B6)if(v1(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>L8());else L8();})();
