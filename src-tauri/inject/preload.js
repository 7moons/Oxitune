(()=>{var M=(e,t={},n={})=>{let i=window.__TAURI__?.core;if(!i?.invoke)return Promise.reject(Error("Tauri bridge unavailable"));return new Promise((r,o)=>{let s=setTimeout(()=>o(Error(`Timed out waiting for ${e}`)),n.timeoutMs??8000);i.invoke("ytmd_bridge",{cmd:e,args:t}).then((a)=>{clearTimeout(s),r(a??null)},(a)=>{clearTimeout(s),o(a instanceof Error?a:Error(String(a)))})})},$e=new Map,Mt=!1;function Gr(){if(Mt)return;let e=window.__TAURI__?.core;if(!e?.Channel||!e.invoke)return;Mt=!0;let t=new e.Channel;t.onmessage=(n)=>{let i=$e.get(n?.event);if(!i)return;for(let r of[...i])try{r({payload:n.payload})}catch(o){console.error(`[Oscilla] ${n.event} handler failed:`,o)}},e.invoke("ytmd_subscribe",{channel:t}).catch((n)=>{Mt=!1,console.error("[Oscilla] Event feed unavailable:",n)})}var Ct={listen(e,t){Gr();let n=t,i=$e.get(e);if(!i)$e.set(e,i=new Set);return i.add(n),Promise.resolve(()=>{$e.get(e)?.delete(n)})}};function Fe(){return document.getElementById("movie_player")}function wn(e){let t=document.querySelector(e);return t&&"value"in t?t:null}var At=()=>wn("ytmusic-player-bar #volume-slider");function It(e){return Math.max(0,Math.min(100,Math.round(e)))}function vn(e,t){if("step"in e&&Number(e.step)>1)e.step=1;e.value=t}function Ee(e){let t=Number(At()?.value);if(Number.isFinite(t))return It(t);let n=Fe()?.getVolume?.(),i=typeof n==="number"&&Number.isFinite(n)?n:e.volume*100;return It(i)}function Se(e){return Fe()?.isMuted?.()===!0||e.muted}function Qr(e,t){vn(e,t),e.dispatchEvent(new CustomEvent("change",{bubbles:!0,composed:!0}));let n=wn("#expand-volume-slider");if(n)vn(n,t)}var Wr=0.002,Kr=0.01,Jr=6,Xr=2000,Pe={target:-1,writes:0,since:0};function Rt(e){let t=At();if(!t)return;let n=Number(t.value),i=Fe();if(!(n>0)||i?.getVolume?.()!==0||Se(e))return;let r=Math.min(Kr,n*Wr);if(Math.abs(e.volume-r)<0.0001)return;let o=Date.now();if(r!==Pe.target||o-Pe.since>Xr)Pe={target:r,writes:0,since:o};if(Pe.writes>=Jr)return;Pe.writes++,e.volume=r}function Be(e,t){if(!Number.isFinite(e))return;let n=It(e),i=At();if(i){Qr(i,n),Rt(t);return}let r=Fe();if(typeof r?.setVolume==="function"){if(r.setVolume(n),n>0&&r.isMuted?.())if(typeof r.unMute==="function")r.unMute();else t.muted=!1;return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1}var kn=!1;function xn(e){kn=e}function Q(){return kn}var Tn=null;function Nt(e){Tn=e}function Pn(){return Tn?.()??!1}class b{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){if(Pn())return;this.nextInYtm()}static nextInYtm(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static getMoviePlayer(){return document.getElementById("movie_player")}static seekTo(e){if(isNaN(e))return;let t=this.getMoviePlayer();if(typeof t?.seekTo==="function"){let i=t.getDuration?.(),r=typeof i==="number"&&i>0?i:e;t.seekTo(Math.max(0,Math.min(e,r)),!0);return}let n=this.getVideo();if(n)n.currentTime=Math.max(0,Math.min(e,n.duration||e))}static setVolume(e){let t=this.getVideo();if(t)Be(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static getLikeStatus(){let e=document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer")?.getAttribute("like-status");return e==="LIKE"?"like":e==="DISLIKE"?"dislike":"none"}static getRepeatMode(){let e=document.querySelector("ytmusic-player-bar")?.getAttribute("repeat-mode");return e==="ALL"?"all":e==="ONE"?"one":"none"}static isShuffleOn(){return document.querySelector("ytmusic-player-bar")?.hasAttribute("shuffle-on")??!1}static toggleShuffle(){document.querySelector("ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button")?.click()}static cycleRepeat(){document.querySelector("ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button")?.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}function _(e,t,n){if(e!=="info")console[e](`[Oscilla ${t}] ${n}`);M("page_log",{level:e,scope:t,message:n}).catch(()=>{return})}var Ye=(e)=>typeof e==="number"&&Number.isFinite(e)?e.toFixed(1):"?";function pe(){let e=b.getMoviePlayer(),t=b.getVideo(),n=e?.getPlayerResponse?.()?.playabilityStatus;return[`song=${e?.getVideoData?.()?.video_id??"?"}`,`t=${Ye(e?.getCurrentTime?.())}/${Ye(e?.getDuration?.())}`,`video=${Ye(t?.currentTime)}/${Ye(t?.duration)}`,`state=${e?.getPlayerState?.()??"?"}`,`paused=${t?t.paused:"?"}`,`ready=${t?t.readyState:"?"}`,t?.error?`mediaError=${t.error.code}`:"",n?.status&&n.status!=="OK"?`playability=${n.status}${n.reason?` (${n.reason})`:""}`:""].filter(Boolean).join(" ")}function Ue(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}function Zr(e,t){if(!e?.videoId)return null;if(t&&e.videoId!==t||!e.title?.trim())return"switching";let n=Number(e.lengthSeconds);return{videoId:e.videoId,title:e.title.trim(),artist:e.author?.trim()??"",durationSecs:Number.isFinite(n)&&n>0?Math.floor(n):0,coverUrl:e.thumbnail?.thumbnails?.at(-1)?.url||`https://i.ytimg.com/vi/${e.videoId}/hqdefault.jpg`}}function En(e){let t=document.getElementById("movie_player")?.getCurrentTime?.();return typeof t==="number"&&Number.isFinite(t)&&t>=0?t:e.currentTime}var eo=1500,Sn=8000;function to(e,t){let n=new URLSearchParams(e);if(!t||n.get("v")!==t)return;return n.get("list")||void 0}function no(e,t){return{title:t?.title?.trim()||"",artist:t?.author?.trim()||"",coverUrl:`https://i.ytimg.com/vi/${e}/hqdefault.jpg`}}var je=(e)=>e.trim().replace(/\s+/g," ").toLowerCase();function io(e,t){return!!e?.trim()&&!!t?.trim()&&je(e)===je(t)}function ro(e,t){if(!e?.trim()||!t?.trim())return!0;return je(e)===je(t)}function oo(e,t){if(!e)return"new";if(e.videoId&&t.videoId){if(e.videoId!==t.videoId)return"new"}else if(e.title!==t.title||e.artist!==t.artist)return"new";return e.title!==t.title||e.artist!==t.artist||!e.videoId&&!!t.videoId||!e.coverUrl&&!!t.coverUrl||!e.album&&!!t.album||t.durationSecs>0&&Math.abs(t.durationSecs-e.durationSecs)>1?"metadata":null}var so=400;function ao(e,t){return e-t>=so}class Vt{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(En(this.attachedVideo))};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(r)=>{i=r,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(r){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&ao(Date.now(),this.lastTickMs))this.emitTick(En(n))},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,r=i?.title||"",o=i?.artist||"",s=i?.album||"",a="";if(i?.artwork&&i.artwork.length>0){let v=i.artwork[i.artwork.length-1];if(v&&v.src)a=v.src}if(!r){let v=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(v)r=v.textContent?.trim()||""}if(!o){let v=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(v){let T=(v.textContent?.trim()||"").split("•").map((A)=>A.trim());if(o=T[0]||"",T.length>1)s=T[1]}}if(!a){let v=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(v&&v.src)a=v.src}if(a.startsWith("//"))a=`https:${a}`;if(a.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(a))a=a.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let l=t?.getVideoData?.(),c=l?.video_id||new URLSearchParams(window.location.search).get("v")||void 0,u=Zr(t?.getPlayerResponse?.()?.videoDetails,l?.video_id);if(u==="switching"){let v=Date.now(),w=l?.video_id??"";if(this.titleMismatch?.videoId!==w)this.titleMismatch={videoId:w,sinceMs:v};if(v-this.titleMismatch.sinceMs<Sn)return null;u=null}let h=!!l?.video_id&&!l.title?.trim();if(u){if(this.titleMismatch=null,c=u.videoId,!io(u.title,i?.title))r=u.title,o=u.artist,s="",a=u.coverUrl}else if(c&&(h||!ro(l?.title,i?.title))){let v=Date.now();if(this.titleMismatch?.videoId!==c)this.titleMismatch={videoId:c,sinceMs:v};let w=v-this.titleMismatch.sinceMs;if(w<eo)return null;if(h){if(w<Sn)return null}else{let T=no(c,l);if(!this.titleMismatch.logged)this.titleMismatch.logged=!0,_("info","player",`song ${c}: MediaSession still says "${i?.title??""}", using the player's "${T.title}"`);({title:r,artist:o}=T),s="",a=T.coverUrl}}else this.titleMismatch=null;let f=u?u.durationSecs:0,y=0,k=!1;if(!f&&t&&typeof t.getDuration==="function"){let v=t.getDuration();if(typeof v==="number"&&Number.isFinite(v)&&v>0)f=Math.floor(v)}if(t&&typeof t.getCurrentTime==="function"){let v=t.getCurrentTime();if(typeof v==="number"&&Number.isFinite(v)&&v>=0)y=Math.floor(v),k=!0}if(!f&&e&&Number.isFinite(e.duration)&&e.duration>0)f=Math.floor(e.duration);if(!k&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)y=Math.floor(e.currentTime);let d=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(d&&d.textContent){let v=d.textContent.split("/").map((w)=>w.trim());if(v.length===2){if(!y)y=Ue(v[0]);if(!f)f=Ue(v[1])}}if(!f){let w=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(w){let T=parseInt(w,10);if(!isNaN(T)&&T>0)f=T}}let g=e?!e.paused&&!e.ended:!1;if(!r)return null;let x=to(window.location.search,c)??(this.currentTrack?.videoId===c?this.currentTrack?.playlistId:void 0);return{title:r,artist:o||"Unknown Artist",album:s||void 0,coverUrl:a||void 0,durationSecs:f,currentTimeSecs:y,isPlaying:g,videoId:c,playlistId:x}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=oo(this.currentTrack,e),n=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((i)=>i(e))}if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}var lo=15000,co=100;function uo(e,t,n,i,r){if(i||r>lo)return"abandon";if(t&&t!==e.video_id)return"abandon";return t===e.video_id&&n?"apply":"wait"}var mo=500,zt=!1,_n=-1/0;function Ln(){return zt||performance.now()-_n<mo}var po=()=>document.getElementById("movie_player")?.getVideoData?.()?.video_id||void 0;function Mn(){let e=location.pathname==="/watch"?new URLSearchParams(location.search).get("v"):null;if(!e)return;let t=!1,n=new Set,i=(l)=>{let c=l.target;if(t||!(c instanceof HTMLVideoElement)||c.muted)return;zt=!0,c.muted=!0,n.add(c)};document.addEventListener("loadstart",i,!0),document.addEventListener("play",i,!0);let r=()=>{if(t)return;if(t=!0,document.removeEventListener("loadstart",i,!0),document.removeEventListener("play",i,!0),n.forEach((l)=>l.muted=!1),n.size>0)_n=performance.now();n.clear(),zt=!1},o=(l,c)=>{let u=()=>{if(clearTimeout(h),c.removeEventListener("seeked",u),!l.autoplay)c.pause();r()},h=setTimeout(u,1000);if(c.addEventListener("seeked",u),b.seekTo(l.position_secs),l.autoplay)c.play().catch(()=>{return});else{c.pause();let f=()=>c.pause();c.addEventListener("play",f),setTimeout(()=>c.removeEventListener("play",f),1500)}},s=Date.now();(async()=>{for(let l=0;;l++)try{return await M("take_resume_session")}catch(c){if(l>=20||window.__TAURI__?.core?.invoke)throw c;await new Promise((u)=>setTimeout(u,100))}})().then((l)=>{let c=l;if(!c||c.video_id!==e)return r();let u=setInterval(()=>{let h=document.querySelector("video"),f=uo(c,po(),!!h&&h.readyState>=1,Q(),Date.now()-s);if(f==="wait")return;if(clearInterval(u),f==="apply"&&h)o(c,h);else r()},co)}).catch((l)=>{console.error("[Oscilla] Resume failed:",l),r()})}var _e=1,Cn={fetch_lyrics:"internal:lyrics",prefetch_lyrics:"internal:lyrics",refresh_lyrics:"internal:lyrics",get_current_lyrics:"internal:lyrics",set_lyrics_offset:"internal:lyrics",list_lyrics_candidates:"internal:lyrics",pick_lyrics:"internal:lyrics",import_lyrics_offsets:"internal:lyrics",translate_lyrics:"internal:lyrics",romanize_lyrics:"internal:lyrics",set_lyrics_display:"internal:lyrics",get_sync_room_state:"internal:sync",broadcast_sync_state:"internal:sync",send_sync_control:"internal:sync",vote_sync_skip:"internal:sync",send_sync_reaction:"internal:sync",sync_queue_add:"internal:sync",sync_queue_remove:"internal:sync",sync_queue_play:"internal:sync",sync_queue_move:"internal:sync",sync_queue_take_next:"internal:sync",remote_clients:"internal:remote",remote_publish:"internal:remote",remote_reply:"internal:remote",set_inhibit_sleep:"internal:power",toggle_mini_player:"internal:windows",toggle_settings_window:"internal:windows",toggle_local_library_window:"internal:windows",toggle_sync_window:"internal:windows",notify_track_change:"internal:notify"},In={"config-updated":"internal:config","set-ambient-enabled":"internal:config","set-ambient-intensity":"internal:config","set-custom-css":"internal:config","set-eq-band":"internal:config","set-eq-all":"internal:config","set-eq-preset":"internal:config","set-preamp":"internal:config","set-crossfade-seconds":"internal:config","set-skip-silence":"internal:config","set-loudness-normalization":"internal:config","set-playback-rate":"internal:config","set-preserves-pitch":"internal:config","lyrics-changed":"internal:lyrics","sync-room-updated":"internal:sync","sync-room-left":"internal:sync","sync-playback-remote":"internal:sync","sync-control-remote":"internal:sync","sync-reaction":"internal:sync","remote-action":"internal:remote","remote-clients":"internal:remote"},An=["mp3","m4a","opus","flac"];var yo=5;class Rn extends Error{}function fo(e,t){let n=(r)=>t.permissions.includes(r),i=(r)=>new Rn(`${t.id} has no permission for ${r}`);return{apiVersion:_e,manifest:t,get track(){return n("player:read")?e.track:null},set track(r){},config:n("internal:config")?e.config:{},invoke:(r,o,s)=>{let a=Cn[r];if(!a||!n(a))return Promise.reject(i(r));return e.invoke(r,o,s)},sendPlayerCommand:(r)=>{if(!n("player:control"))throw i("player control");e.sendPlayerCommand(r)},getVideoElement:()=>n("page")?e.getVideoElement():null,events:{listen:(r,o)=>{let s=In[r];if(!s||!n(s))return Promise.reject(i(`event ${r}`));return e.listen(r,o)}}}}class Ot{plugins=new Map;enabledPlugins=new Set;contexts=new Map;errors=new Map;host;onError;constructor(e,t=()=>{}){this.host=e,this.onError=t}register(e){if(this.plugins.set(e.id,e),this.contexts.set(e.id,fo(this.host,e.manifest)),e.defaultEnabled)this.enabledPlugins.add(e.id)}contextOf(e){return this.contexts.get(e)}guard(e,t,n){try{let i=n();if(i&&typeof i.then==="function")return i.catch((r)=>this.failed(e,t,r))}catch(i){this.failed(e,t,i)}return Promise.resolve()}failed(e,t,n){console.error(`[Oscilla] Error in plugin ${e.id} ${t}:`,n);let i=(this.errors.get(e.id)??0)+1;if(this.errors.set(e.id,i),this.onError(e,n),i>=yo&&this.enabledPlugins.has(e.id))console.warn(`[Oscilla] ${e.id} switched off after ${i} errors`),this.disable(e.id)}reportError(e,t,n){let i=this.plugins.get(e);if(i)this.failed(i,t,n)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){this.enabledPlugins.add(t);let r=this.contexts.get(t);if(n.onInit)await this.guard(n,"onInit",()=>n.onInit(r))}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){this.enabledPlugins.add(e),this.errors.delete(e);let n=this.contexts.get(e);if(t.onInit)await this.guard(t,"onInit",()=>t.onInit(n))}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await this.guard(t,"onDestroy",()=>t.onDestroy())}}each(e,t){for(let n of[...this.enabledPlugins]){let i=this.plugins.get(n),r=this.contexts.get(n);if(i&&r)this.guard(i,e,()=>t(i,r))}}handleTrackChange(e){this.host.track=e,this.each("onTrackChange",(t,n)=>t.onTrackChange?.(e,n))}handlePlaybackChange(e){this.each("onPlaybackChange",(t,n)=>t.onPlaybackChange?.(e,n))}handleTick(e){this.each("onTick",(t,n)=>t.onTick?.(e,n))}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}function Nn(e,t=18,n=18,i="0 0 24 24"){let r=document.createElementNS("http://www.w3.org/2000/svg","svg");r.setAttribute("width",String(t)),r.setAttribute("height",String(n)),r.setAttribute("viewBox",i),r.setAttribute("fill","currentColor");let o=document.createElementNS("http://www.w3.org/2000/svg","path");return o.setAttribute("d",e),r.appendChild(o),r}function p(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var Vn="ytmd-kit-styles",go=`
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

  /* Circular progress drawn around an icon button. */
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
`;function H(){if(document.getElementById(Vn))return;let e=document.createElement("style");e.id=Vn,e.textContent=go,(document.head||document.documentElement).appendChild(e),ho()}var C={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",close:"M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",fullscreen:"M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",translate:"m12.87 15.07-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z",romanize:"M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z",play:"M8 5v14l11-7z",pause:"M6 19h4V5H6v14zm8-14v14h4V5h-4z",skipNext:"M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",skipPrevious:"M6 6h2v12H6zm3.5 6 8.5 6V6z",sync:"M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function re(e,t=24){return Nn(e,t,t)}function V(e){let t=p("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(re(e.iconPath)),t}function Ge(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(re(t))}var zn=!1;function ho(){if(zn)return;zn=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},r=(a)=>{let l=a.dataset.ytmdTooltip;if(!l)return;if(!e)e=p("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=l;let c=a.getBoundingClientRect(),u=e.getBoundingClientRect(),f=c.bottom+8+u.height<window.innerHeight?c.bottom+8:c.top-8-u.height,y=Math.max(8,Math.min(window.innerWidth-u.width-8,c.left+c.width/2-u.width/2));e.style.top=`${f}px`,e.style.left=`${y}px`,e.classList.add("ytmd-open")},o=(a)=>{let l=a.target?.closest?.("[data-ytmd-tooltip]");if(!l||l===n)return;i(),n=l,t=setTimeout(()=>r(l),250)},s=(a)=>{let l=a.relatedTarget;if(n&&l&&n.contains(l))return;i()};document.addEventListener("mouseover",o,!0),document.addEventListener("mouseout",s,!0),document.addEventListener("focusin",o,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var ie=null;function S(e,t={}){H();let n=document.getElementById("ytmd-toast-host");if(!n)n=p("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),r=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),o=r?i:p("div",{className:"ytmd-toast"});if(t.id)o.dataset.toastId=t.id;let a=[p("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:c,onClick:u}=t.action,h=p("button",{className:"ytmd-button",text:c});h.type="button",h.addEventListener("click",()=>{On(),u()}),a.push(h)}if(o.replaceChildren(...a),!r)n.replaceChildren(o);if(ie!==null)clearTimeout(ie);ie=null;let l=t.durationMs??4000;if(l>0)ie=setTimeout(On,l)}var bo=5,vo=3000;function Dn(e,t){H();let n=document.getElementById("ytmd-reaction-host");if(!n)n=p("div",{id:"ytmd-reaction-host"}),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=p("div",{className:"ytmd-reaction"});i.append(p("span",{className:"ytmd-reaction-emoji",text:e}),p("span",{text:t})),n.appendChild(i);while(n.children.length>bo)n.firstElementChild?.remove();setTimeout(()=>i.remove(),vo)}function On(){if(ie!==null)clearTimeout(ie);ie=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function Hn(e){H(),document.getElementById(e.id)?.remove();let t=p("div",{id:e.id,className:"ytmd-scrim"}),n=p("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let r=p("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),o=p("div",{className:"ytmd-dialog-body"});if(e.body)o.append(...e.body);let s=document.activeElement,a=()=>{document.removeEventListener("keydown",l,!0),t.remove(),s?.focus?.()},l=(u)=>{if(u.key==="Escape")u.stopPropagation(),a()};document.addEventListener("keydown",l,!0),t.addEventListener("click",(u)=>{if(u.target===t)a()});let c=p("div",{className:"ytmd-dialog-actions"});for(let u of e.actions){let h=p("button",{className:`ytmd-button${u.filled?" ytmd-button--filled":""}`,text:u.label});h.type="button",h.addEventListener("click",()=>u.onClick?u.onClick(a):a()),c.appendChild(h)}return n.append(r,o,c),t.appendChild(n),document.body.appendChild(t),c.querySelector("button")?.focus(),{close:a,body:o}}var qn={menuLabel:"Oscilla",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",pluginSwitchedOff:(e)=>`“${e}” kept failing and was switched off. You can turn it back on in Settings > Plugins.`,menuMiniPlayer:"Mini player",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:(e,t,n)=>`${e} votes to skip (${t}/${n})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:(e,t)=>`From the shared queue: ${e} · ${t}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:(e)=>`${e} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:(e)=>`from ${e}`,syncQueuePlayNow:(e)=>`Play “${e}” now`,syncQueueRemove:(e)=>`Remove “${e}” from the queue`,syncQueueDrag:(e)=>`Move “${e}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",pipButton:"Picture-in-picture",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:(e)=>`Source: ${e}`,lyricsLocalFiles:"Local files",lyricsWrong:"Wrong lyrics?",lyricsPickTitle:"Choose lyrics",lyricsPickLoading:"Looking for other versions…",lyricsPickNone:"No other versions found",lyricsPickFailed:"Couldn’t switch the lyrics",lyricsSearchAgain:"Search again",lyricsSearchAgainTip:"Forget these lyrics and look them up again",lyricsTimed:"Timed",lyricsTextOnly:"Text only",lyricsCurrent:"Current",lyricsOffset:"Timing",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsReset:"Reset",lyricsTranslate:"Translate",lyricsTranslateTip:"Show a translation under each line",lyricsTranslateFailed:"Couldn’t translate these lyrics",lyricsRomanize:"Romanize",lyricsRomanizeTip:"Show lyrics written in other scripts in Latin letters too",lyricsRomanizeFailed:"Couldn’t romanize these lyrics",lyricsFullscreen:"Full screen",lyricsFullscreenTip:"Show the lyrics in full screen",lyricsResumeSync:"Follow the song",playerPrevious:"Previous",playerNext:"Next",playerPlay:"Play",playerPause:"Pause",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`,windowMinimize:"Minimize",windowMaximize:"Maximize",windowRestore:"Restore down",windowClose:"Close"},wo={menuLabel:"Oscilla",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",pluginSwitchedOff:(e)=>`Wtyczka „${e}” ciągle zgłaszała błędy i została wyłączona. Możesz ją włączyć ponownie w Ustawieniach > Wtyczki.`,menuMiniPlayer:"Miniodtwarzacz",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:(e,t,n)=>`${e} głosuje za pominięciem (${t}/${n})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:(e,t)=>`Ze wspólnej kolejki: ${e} · ${t}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:(e)=>`${e} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:(e)=>`od: ${e}`,syncQueuePlayNow:(e)=>`Zagraj teraz: „${e}”`,syncQueueRemove:(e)=>`Usuń z kolejki: „${e}”`,syncQueueDrag:(e)=>`Przesuń „${e}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",pipButton:"Obraz w obrazie",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:(e)=>`Źródło: ${e}`,lyricsLocalFiles:"Pliki lokalne",lyricsWrong:"Zły tekst?",lyricsPickTitle:"Wybierz tekst",lyricsPickLoading:"Szukanie innych wersji…",lyricsPickNone:"Nie znaleziono innych wersji",lyricsPickFailed:"Nie udało się zmienić tekstu",lyricsSearchAgain:"Szukaj ponownie",lyricsSearchAgainTip:"Zapomnij ten tekst i wyszukaj go od nowa",lyricsTimed:"Z synchronizacją",lyricsTextOnly:"Sam tekst",lyricsCurrent:"Obecny",lyricsOffset:"Synchronizacja",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsReset:"Resetuj",lyricsTranslate:"Tłumaczenie",lyricsTranslateTip:"Pokazuj tłumaczenie pod każdą linijką",lyricsTranslateFailed:"Nie udało się przetłumaczyć tego tekstu",lyricsRomanize:"Transkrypcja",lyricsRomanizeTip:"Pokazuj tekst w innych alfabetach także literami łacińskimi",lyricsRomanizeFailed:"Nie udało się zapisać tego tekstu literami łacińskimi",lyricsFullscreen:"Pełny ekran",lyricsFullscreenTip:"Pokaż tekst na pełnym ekranie",lyricsResumeSync:"Podążaj za utworem",playerPrevious:"Poprzedni",playerNext:"Następny",playerPlay:"Odtwórz",playerPause:"Wstrzymaj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`,windowMinimize:"Minimalizuj",windowMaximize:"Maksymalizuj",windowRestore:"Przywróć w dół",windowClose:"Zamknij"},ko={en:qn,pl:wo};function xo(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return ko[t]??qn}var Dt=null;function m(){if(!Dt){let e=typeof document<"u"?document.documentElement.lang:"";Dt=xo(e||(typeof navigator<"u"?navigator.language:"en"))}return Dt}var To=200;function Po(e,t=document){let n=t.head||t.documentElement;if(n)return n.appendChild(e),()=>{return};let i=new MutationObserver(()=>{let r=t.head||t.documentElement;if(!r)return;i.disconnect(),r.appendChild(e)});return i.observe(t,{childList:!0}),()=>i.disconnect()}class Qe{id;name;description;defaultEnabled=!0;manifest;settingsValues;styles;factory;hooks=null;started=!1;track=null;playing=!1;trackListeners=new Set;playbackListeners=new Set;tickListeners=new Set;settingsListeners=new Set;mediaListeners=new Set;toolsListeners=new Set;toolsWaiters=new Set;unloaders=[];styleRemovers=[];constructor(e,t){this.manifest=e.manifest,this.id=e.manifest.id,this.name=e.manifest.name,this.description=e.manifest.description,this.settingsValues={...e.settings},this.styles=e.styles,this.factory=t}has(e){return this.manifest.permissions.includes(e)}report(e,t){console.error(`[Oscilla plugin ${this.id}] ${e}:`,t);let n=`${e}: ${t instanceof Error?t.message:String(t)}`;M("plugin_error",{id:this.id,message:n}).then((i)=>{if(i===!0)this.hooks?.onSwitchedOff(this.id)}).catch(()=>{return})}safe(e,t){return(...n)=>{try{let i=t(...n);if(i instanceof Promise)i.catch((r)=>this.report(e,r))}catch(i){this.report(e,i)}}}listenOn(e,t,n){let i=this.safe(t,n);return e.add(i),()=>e.delete(i)}addStyle(e){let t=document.createElement("style");t.dataset.ytmdPlugin=this.id,t.textContent=String(e);let n=Po(t),i=()=>{n(),t.remove()};return this.styleRemovers.push(i),i}buildApi(){let e=this.id,t=`[${e}]`,n={apiVersion:_e,plugin:{id:e,name:this.manifest.name,version:this.manifest.version},log:{info:(...i)=>console.info(t,...i),warn:(...i)=>console.warn(t,...i),error:(...i)=>console.error(t,...i)},onUnload:(i)=>{this.unloaders.push(this.safe("onUnload",i))},settings:{all:()=>({...this.settingsValues}),get:(i)=>this.settingsValues[i],onChange:(i)=>this.listenOn(this.settingsListeners,"settings.onChange",i)}};if(this.has("player:read")){let i=this.has("player:control"),r=(o)=>()=>this.hooks?.sendPlayerCommand(o);n.player={getTrack:()=>this.track?{...this.track}:null,isPlaying:()=>this.playing,onTrackChange:(o)=>this.listenOn(this.trackListeners,"player.onTrackChange",o),onPlaybackChange:(o)=>this.listenOn(this.playbackListeners,"player.onPlaybackChange",o),onTick:(o)=>this.listenOn(this.tickListeners,"player.onTick",o),canSeekAutomatically:()=>!Q(),...i?{play:r("play"),pause:r("pause"),playPause:r("play_pause"),next:r("next"),previous:r("previous"),seek:(o)=>{if(Number.isFinite(o)&&o>=0)b.seekTo(o)},setVolume:(o)=>{if(Number.isFinite(o))b.setVolume(Math.min(1,Math.max(0,o)))}}:{}}}if(this.has("page"))n.page={document,getVideo:()=>b.getVideo()};if(this.has("storage"))n.storage={get:(i)=>M("plugin_storage_get",{id:e,key:String(i)}),set:(i,r)=>M("plugin_storage_set",{id:e,key:String(i),value:r}).then(()=>{return}),remove:(i)=>M("plugin_storage_remove",{id:e,key:String(i)}).then(()=>{return}),keys:()=>M("plugin_storage_keys",{id:e}).then((i)=>Array.isArray(i)?i:[])};if(this.has("network")){let i=(r)=>M("plugin_fetch",{id:e,url:String(r)},{timeoutMs:15000}).then((o)=>String(o??""));n.net={fetchText:i,fetchJson:(r)=>i(r).then((o)=>JSON.parse(o))}}if(this.has("media:save"))n.media={formats:An,save:(i,r)=>M("plugin_media_save",{id:e,videoId:String(i),format:String(r?.format??"mp3")}).then((o)=>String(o)),cancel:(i)=>M("plugin_media_cancel",{id:e,job:String(i)}).then(()=>{return}),onProgress:(i)=>this.listenOn(this.mediaListeners,"media.onProgress",i),tools:()=>M("plugin_media_tools_status",{id:e}).then((i)=>i),installTools:()=>new Promise((i,r)=>{let o=(s)=>{if(s.state==="done"||s.state==="declined"||s.state==="failed")this.toolsWaiters.delete(o),i(s.state)};this.toolsWaiters.add(o),M("plugin_media_install_tools",{id:e}).catch((s)=>{this.toolsWaiters.delete(o),r(s)})}),onToolsProgress:(i)=>this.listenOn(this.toolsListeners,"media.onToolsProgress",i)};if(this.has("ui"))n.ui={toast:(i,r)=>{let o=r?.action;S(String(i).slice(0,To),{id:r?.id?`${e}:${String(r.id)}`:void 0,durationMs:typeof r?.durationMs==="number"?Math.min(Math.max(r.durationMs,1000),60000):void 0,action:o?{label:String(o.label).slice(0,40),onClick:this.safe("ui.toast action",()=>o.onClick())}:void 0})},addStyle:(i)=>this.addStyle(i)};return Object.freeze(n)}start(e){if(this.hooks=e,this.started)return;if(this.started=!0,this.has("ui"))this.styles.forEach((n)=>this.addStyle(n));let t=this.has("page");try{this.factory(this.buildApi(),t?window:void 0,t?window:void 0,t?window:void 0,t?document:void 0,void 0,void 0)}catch(n){this.report("startup",n)}}mediaTools(e){if(!this.has("media:save"))return;this.toolsListeners.forEach((t)=>t({...e})),[...this.toolsWaiters].forEach((t)=>t(e))}mediaProgress(e){this.mediaListeners.forEach((t)=>t({...e}))}setSettings(e){this.settingsValues={...e};let t={...e};this.settingsListeners.forEach((n)=>n(t))}onInit(e){if(this.hooks)this.start(this.hooks)}onTrackChange(e){this.track={...e},this.trackListeners.forEach((t)=>t({...e}))}onPlaybackChange(e){this.playing=e,this.playbackListeners.forEach((t)=>t(e))}onTick(e){this.tickListeners.forEach((t)=>t(e))}onDestroy(){for(let e of this.unloaders.splice(0))e();this.styleRemovers.splice(0).forEach((e)=>e()),this.trackListeners.clear(),this.playbackListeners.clear(),this.tickListeners.clear(),this.settingsListeners.clear(),this.mediaListeners.clear(),this.toolsListeners.clear()}}var ye=new Map,Ht=null;function Eo(e){if(!e||typeof e!=="object")return!1;let t=e;return!!t.manifest&&typeof t.manifest.id==="string"&&Array.isArray(t.manifest.permissions)&&!!t.settings&&typeof t.settings==="object"&&Array.isArray(t.styles)}function $n(){if(typeof window>"u"||"__ytmdDefinePlugin"in window)return;Object.defineProperty(window,"__ytmdDefinePlugin",{value:(e,t)=>{if(!Eo(e)||typeof t!=="function"||ye.has(e.manifest.id))return;if(e.manifest.apiVersion!==_e)return;let n=new Qe(e,t);if(ye.set(n.id,n),e.manifest.runAt==="document-start")n.start({sendPlayerCommand:(i)=>Ht?.sendPlayerCommand(i),onSwitchedOff:(i)=>Ht?.onSwitchedOff(i)})},enumerable:!1,writable:!1,configurable:!1})}function Fn(e){Ht=e;for(let t of ye.values())t.start(e);return[...ye.values()]}function Bn(){return[...ye.values()]}function We(e){return ye.get(e)}function Yn(e){S(m().pluginSwitchedOff(e.name))}var Un={id:"app.ytmd.lyrics",name:"Native Synced Lyrics",version:"1.0.0",apiVersion:1,description:"Synchronized lyrics from several providers in the native Lyrics tab and in full screen: word by word, with translation, romanization and seek-on-click",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:config","internal:lyrics"],entry:"index.js"};var _o=20;function jn(e,t){if(!t||e?.videoDetails?.videoId!==t)return[];let n=e.microformat?.microformatDataRenderer?.tags;if(!Array.isArray(n))return[];return n.filter((i)=>typeof i==="string"&&i.trim()!=="").slice(0,_o)}var qt=(e)=>(e?.runs??[]).map((t)=>t.text??"").join("").trim();function Gn(e){let t=Array.from(e),n=t.findIndex((a)=>a.hasAttribute("selected"));if(n<0)return null;let i=t[n+1]?.data,r=i?.videoId,o=qt(i?.title);if(!r||!/^[A-Za-z0-9_-]{11}$/.test(r)||!o)return null;let s=Ue(qt(i?.lengthText));return{videoId:r,title:o,artist:qt(i?.shortBylineText),durationSecs:s>0?s:null}}var W={video_id:null,provider:null,synced:[],plain:null,offset_secs:0,source_url:null};function Lo(e,t){let n=0,i=e.length-1,r=-1;while(n<=i){let o=n+i>>1;if(e[o].t<=t)r=o,n=o+1;else i=o-1}return r}function Kn(e,t,n){return Lo(e,t+n)}var Mo=0.6,Co=6;function Ft(e,t){let n=e[t],i=e[t+1]?.t;if(typeof n.end==="number"&&n.end>=n.t)return i===void 0?n.end:Math.min(n.end,Math.max(i,n.t));return i??n.t+Co}function Jn(e,t,n,i){let r=e[t];if(!r||n<=r.t)return 0;let o=e[t+1]?.t??Math.min(i??1/0,r.t+Mo*3),s=typeof r.end==="number"&&r.end>r.t?r.end:Math.max(o,r.t+0.05);return Math.min(1,(n-r.t)/(s-r.t))}var Qn=7;function Xn(e){let t=[];if(e.length===0)return t;if(e[0].t>=Qn)t.push({before:0,from:0,to:e[0].t});for(let n=1;n<e.length;n++){let i=e[n-1].end;if(typeof i==="number"&&e[n].t-i>=Qn)t.push({before:n,from:i,to:e[n].t})}return t}function Bt(e,t){switch(e){case"local":return t;case"lrcred":return"lrc.red";case"lrclib":return"LRCLIB";case"unison":return"Unison";case"musixmatch":return"Musixmatch";case"netease":return"NetEase";case"ytm":return"YouTube Music";case"genius":return"Genius";default:return e||""}}var $t=(e)=>typeof e==="number"&&Number.isFinite(e);function Wn(e){if(!Array.isArray(e))return;let t=e.filter((n)=>$t(n?.t)&&typeof n?.text==="string").map((n)=>$t(n.end)?{t:n.t,text:n.text,end:n.end}:{t:n.t,text:n.text});return t.length>0?t:void 0}function Io(e){let t={t:e.t,text:e.text},n=Wn(e.words);if(n)t.words=n;if($t(e.end))t.end=e.end;if(e.alt===!0)t.alt=!0;let i=e.bg;if(i&&typeof i.text==="string"&&i.text.trim()!==""){let r=Wn(i.words);t.bg=r?{text:i.text,words:r}:{text:i.text}}return t}function Yt(e){let t=e&&typeof e==="object"?e:{};return{video_id:typeof t.video_id==="string"?t.video_id:null,lines:Array.isArray(t.lines)?t.lines.map((n)=>typeof n==="string"&&n.trim()!==""?n:null):[]}}function Le(e){if(!e||typeof e!=="object")return{...W};let t=e;return{video_id:typeof t.video_id==="string"?t.video_id:null,provider:typeof t.provider==="string"?t.provider:null,synced:Array.isArray(t.synced)?t.synced.filter((n)=>typeof n?.t==="number"&&typeof n?.text==="string").map((n)=>Io(n)):[],plain:typeof t.plain==="string"?t.plain:null,offset_secs:typeof t.offset_secs==="number"&&Number.isFinite(t.offset_secs)?t.offset_secs:0,source_url:typeof t.source_url==="string"?t.source_url:null}}var Zn=`
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

  .ytmd-lyrics-view {
    --ytmd-lyric-on: #fff;
    --ytmd-lyric-off: rgba(255, 255, 255, 0.35);
    --ytmd-lyric-size: 28px;
    --ytmd-lyric-scale: 1;
    --ytmd-lyric-weight: 700;
    --ytmd-lyric-gap: 14px;
    position: relative;
    display: flex;
    flex-direction: column;
    /* The sung line grows by transform; it must not widen the scroll area. */
    overflow-x: clip;
  }
  .ytmd-lyrics-view[hidden] { display: none; }
  .ytmd-lyrics-lines { display: flex; flex-direction: column; gap: var(--ytmd-lyric-gap); }

  /* Large display type; the lines not being sung are dimmed. Size and
     weight never change between states (the sung line grows by transform
     only), so the text doesn't reflow as the highlight moves. */
  .ytmd-lyric-line {
    font: var(--ytmd-lyric-weight) calc(var(--ytmd-lyric-size) * var(--ytmd-lyric-scale))/1.25 var(--ytmd-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    color: var(--ytmd-lyric-off);
    cursor: pointer;
    padding: 4px 6% 4px 0;
    user-select: none;
    overflow-wrap: anywhere;
    transform-origin: left center;
    transition: color 0.25s ease, transform 0.35s ease, filter 0.35s ease, opacity 0.25s ease;
  }
  .ytmd-lyric-line:hover { color: rgba(255, 255, 255, 0.7); }
  .ytmd-lyric-line.ytmd-active { color: var(--ytmd-lyric-on); }
  .ytmd-lyric-line.ytmd-alt { text-align: right; padding: 4px 0 4px 6%; transform-origin: right center; }
  .ytmd-lyric-line.ytmd-plain { cursor: default; color: var(--ytmd-lyric-on); font-weight: 500; --ytmd-lyric-size: 22px; }
  .ytmd-lyric-line.ytmd-plain:hover { color: var(--ytmd-lyric-on); }
  .ytmd-lyric-line.ytmd-empty { min-height: 0.6em; padding: 0; }

  /* Word by word: the word being sung fills from its start to its end.
     Every word of the sung line is painted the same way, by one gradient
     whose edge sits at --ytmd-fill (0 = not sung yet, 1 = sung). A word
     never switches between ways of being painted, and nothing here has a
     transition: switching made each syllable blink as it finished. */
  .ytmd-lyric-line.ytmd-active .ytmd-has-words .ytmd-lyric-word {
    background-image: linear-gradient(
      90deg,
      var(--ytmd-lyric-on) calc(var(--ytmd-fill, 0) * 112% - 12%),
      var(--ytmd-lyric-off) calc(var(--ytmd-fill, 0) * 112%)
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }

  /* Background vocals, the romanization and the translation sit under the line, smaller. */
  .ytmd-lyric-bg { font-size: 0.62em; font-weight: 500; margin-top: 4px; opacity: 0.85; }
  .ytmd-lyric-roman,
  .ytmd-lyric-trans {
    font: 500 0.56em/1.35 var(--ytmd-font, Roboto, Arial, sans-serif);
    margin-top: 4px;
    color: var(--ytmd-lyric-off);
  }
  .ytmd-lyric-line.ytmd-active .ytmd-lyric-roman,
  .ytmd-lyric-line.ytmd-active .ytmd-lyric-trans,
  .ytmd-lyric-line.ytmd-plain .ytmd-lyric-roman,
  .ytmd-lyric-line.ytmd-plain .ytmd-lyric-trans { color: rgba(255, 255, 255, 0.7); }

  /* An interlude: three dots that light up as it passes. */
  /* Always laid out (appearing would push every line below it down). */
  .ytmd-lyric-gap { display: flex; gap: 10px; padding: 10px 0; opacity: 0; transition: opacity 0.4s ease; }
  .ytmd-lyric-gap.ytmd-active { opacity: 1; }
  .ytmd-lyric-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--ytmd-lyric-off);
    transition: background-color 0.4s ease, transform 0.4s ease;
  }
  .ytmd-lyric-dot.ytmd-lit { background: var(--ytmd-lyric-on); transform: scale(1.15); }

  /* ---- Looks (Settings > Lyrics look; LYRICS_THEMES in view.ts). "classic" is the base above. ---- */
  .ytmd-lyrics-view[data-theme="spotlight"] {
    --ytmd-lyric-scale: 1.3;
    --ytmd-lyric-weight: 800;
    --ytmd-lyric-gap: 22px;
    --ytmd-lyric-off: rgba(255, 255, 255, 0.2);
  }
  .ytmd-lyrics-view[data-theme="compact"] {
    --ytmd-lyric-scale: 0.72;
    --ytmd-lyric-weight: 500;
    --ytmd-lyric-gap: 4px;
    --ytmd-lyric-off: rgba(255, 255, 255, 0.5);
  }
  .ytmd-lyrics-view[data-theme="accent"],
  .ytmd-lyrics-view[data-theme="karaoke"] {
    /* The cover's color, lifted toward white so it reads on any cover. */
    --ytmd-lyric-on: color-mix(in srgb, var(--ytmd-accent, #fff) 65%, #fff);
  }
  .ytmd-lyrics-view[data-theme="centered"] { --ytmd-lyric-weight: 600; }
  .ytmd-lyrics-view[data-theme="karaoke"] { --ytmd-lyric-scale: 1.15; --ytmd-lyric-weight: 800; --ytmd-lyric-gap: 20px; }
  .ytmd-lyrics-view[data-theme="karaoke"] .ytmd-lyric-line:not(.ytmd-plain) { text-transform: uppercase; letter-spacing: 0.02em; }
  .ytmd-lyrics-view[data-theme="centered"] .ytmd-lyric-line,
  .ytmd-lyrics-view[data-theme="karaoke"] .ytmd-lyric-line {
    text-align: center;
    padding: 4px 3%;
    transform-origin: center;
  }
  .ytmd-lyrics-view[data-theme="centered"] .ytmd-lyric-gap,
  .ytmd-lyrics-view[data-theme="karaoke"] .ytmd-lyric-gap { justify-content: center; }

  /* Effects (Settings): the sung line stands out, the rest falls back. Off
     while the listener scrolls through the lyrics themselves. */
  .ytmd-lyrics-effects .ytmd-lyric-line.ytmd-active { transform: scale(1.04); }
  .ytmd-lyrics-effects:not(.ytmd-lyrics-plain):not(.ytmd-lyrics-browsing) .ytmd-lyric-line:not(.ytmd-active) { filter: blur(1.6px); opacity: 0.8; }
  .ytmd-lyrics-effects:not(.ytmd-lyrics-plain):not(.ytmd-lyrics-browsing) .ytmd-lyric-line.ytmd-near:not(.ytmd-active) { filter: blur(0.7px); opacity: 0.9; }
  .ytmd-lyrics-effects .ytmd-lyric-line:hover { filter: none !important; opacity: 1 !important; }

  .ytmd-chip.ytmd-lyrics-resume {
    position: sticky;
    bottom: 24px;
    align-self: center;
    margin-top: 12px;
    background: var(--ytmd-surface, #212121);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
    z-index: 1;
  }
  .ytmd-chip.ytmd-lyrics-resume[hidden] { display: none; }

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
  .ytmd-native-lyrics-footer .ytmd-lyrics-source { flex: 1 1 100%; }
  .ytmd-native-lyrics-footer a.ytmd-lyrics-source { color: inherit; text-decoration: none; }
  .ytmd-native-lyrics-footer a.ytmd-lyrics-source:hover { text-decoration: underline; }
  .ytmd-lyrics-footer-group { display: inline-flex; align-items: center; gap: 8px; }
  /* A switch that is on looks like YTM's selected chip. */
  .ytmd-chip[aria-pressed="true"] { background: var(--ytmd-text, #fff); color: #030303; }
  .ytmd-lyrics-offset-value {
    min-width: 56px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--ytmd-text, #fff);
  }
  .ytmd-lyrics-pick-list { display: flex; flex-direction: column; margin: 8px -24px 0; max-height: 50vh; overflow-y: auto; }
  .ytmd-lyrics-pick-list .ytmd-menu-item { width: 100%; text-align: left; }

  /* ---- Fullscreen: the cover and the player on the left, the lyrics on the right. ---- */
  #ytmd-lyrics-fs {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    background: #030303;
    color: var(--ytmd-text, #fff);
    font-family: var(--ytmd-font, Roboto, Arial, sans-serif);
    overflow: hidden;
  }
  #ytmd-lyrics-fs.ytmd-fs-idle { cursor: none; }
  /* The cover blurred once into a small bitmap (never a live blur filter
     on a full-window layer), stretched over the window. */
  .ytmd-fs-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .ytmd-fs-veil { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); }
  .ytmd-fs-body {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6vw;
    height: 100%;
    padding: 0 6vw;
    box-sizing: border-box;
  }
  .ytmd-fs-side { flex: 0 0 min(34vw, 62vh); display: flex; flex-direction: column; min-width: 0; }
  .ytmd-fs-cover {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  }
  .ytmd-fs-title {
    margin-top: 24px;
    font: 700 24px/32px var(--ytmd-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ytmd-fs-artist {
    font: 400 16px/24px var(--ytmd-font, Roboto, Arial, sans-serif);
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ytmd-fs-seek { margin-top: 20px; padding: 8px 0; cursor: pointer; }
  .ytmd-fs-track { height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.25); overflow: hidden; }
  .ytmd-fs-played { height: 100%; width: 100%; background: #fff; transform-origin: left center; transform: scaleX(0); }
  .ytmd-fs-times {
    display: flex;
    justify-content: space-between;
    font: 400 12px/16px var(--ytmd-font, Roboto, Arial, sans-serif);
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.7);
  }
  .ytmd-fs-controls { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 12px; }
  .ytmd-fs-controls .ytmd-fs-play { width: 56px; height: 56px; }
  .ytmd-fs-controls .ytmd-fs-play svg { width: 36px; height: 36px; }
  .ytmd-fs-close { position: absolute; top: 16px; right: 16px; z-index: 2; }
  .ytmd-fs-controls,
  .ytmd-fs-close { transition: opacity 0.3s ease; }
  .ytmd-fs-idle .ytmd-fs-controls,
  .ytmd-fs-idle .ytmd-fs-close { opacity: 0; }

  .ytmd-fs-lyrics {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow-y: auto;
    scrollbar-width: none;
    padding: 45vh 0;
    box-sizing: border-box;
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent);
    mask-image: linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent);
  }
  .ytmd-fs-lyrics::-webkit-scrollbar { display: none; }
  .ytmd-fs-lyrics .ytmd-lyrics-view { --ytmd-lyric-size: clamp(28px, 3.2vw, 52px); }
  .ytmd-fs-lyrics .ytmd-lyrics-lines { gap: calc(var(--ytmd-lyric-gap) * 1.5); }
  .ytmd-fs-lyrics .ytmd-native-lyrics-status { font-size: 20px; }
  @media (max-width: 800px) {
    .ytmd-fs-side { display: none; }
  }
`;var Me={translation:null,romanization:null},Ao=5000;function Ro(e,t){return e.findIndex((n)=>t>=n.from&&t<n.to)}function No(e,t){let n=(t-e.from)/Math.max(0.001,e.to-e.from);return Math.max(0,Math.min(3,Math.floor(n*3)+1))}function Vo(e,t){if(e<=0||!Number.isFinite(t))return-1;return Math.max(0,Math.min(e-1,Math.floor(t*e)))}var zo=["classic","spotlight","centered","accent","compact","karaoke"],ei=(e)=>zo.includes(e)?e:"classic";class Ce{opts;root;list;resume;lyrics={...W};rows=[];gaps=[];gapSpans=[];active=-1;activeGap=-1;plainShown=-1;holdUntil=0;constructor(e){this.opts=e;this.root=p("div",{className:"ytmd-lyrics-view"}),this.list=p("div",{className:"ytmd-lyrics-lines"}),this.resume=p("button",{className:"ytmd-chip ytmd-lyrics-resume",text:e.resumeLabel}),this.resume.type="button",this.resume.hidden=!0,this.root.append(this.list,this.resume),this.list.addEventListener("click",(n)=>{let i=n.target?.closest(".ytmd-lyric-line[data-line]"),r=i?this.lyrics.synced[Number(i.dataset.line)]:void 0;if(r)this.opts.onSeek(Math.max(0,r.t-this.lyrics.offset_secs))});let t=()=>this.holdScroll();this.root.addEventListener("wheel",t,{passive:!0}),this.root.addEventListener("touchmove",t,{passive:!0}),this.resume.addEventListener("click",()=>{this.releaseScroll(),this.scrollToCurrent()})}setEffects(e){this.root.classList.toggle("ytmd-lyrics-effects",e)}setTheme(e){this.root.dataset.theme=e}get hasLines(){return this.rows.length>0}setLyrics(e,t){this.lyrics=e,this.active=-1,this.activeGap=-1,this.plainShown=-1,this.releaseScroll(),this.rows=[],this.gaps=[];let n=[];if(e.synced.length>0){let i=Xn(e.synced);e.synced.forEach((r,o)=>{let s=i.find((u)=>u.before===o);if(s){let u=this.buildGap(s);this.gaps.push(u),n.push(u.el)}let a=p("div",{className:"ytmd-lyric-line"});if(a.dataset.line=String(o),r.alt)a.classList.add("ytmd-alt");let l=this.buildText("ytmd-lyric-main",r.text,r.words);a.append(l.el);let c=null;if(r.bg){let u=this.buildText("ytmd-lyric-bg",r.bg.text,r.bg.words);a.append(u.el),c=u.run}this.rows.push({el:a,main:l.run,bg:c}),n.push(a)})}else if(e.plain)for(let i of e.plain.split(`
`)){let r=p("div",{className:"ytmd-lyric-line ytmd-plain"});if(i.trim()==="")r.classList.add("ytmd-empty");r.append(p("div",{className:"ytmd-lyric-main",text:i})),this.rows.push({el:r,main:null,bg:null}),n.push(r)}this.gapSpans=this.gaps.map((i)=>i.gap),this.list.replaceChildren(...n),this.root.classList.toggle("ytmd-lyrics-plain",e.synced.length===0),this.setExtras(t)}setExtras(e){this.rows.forEach((t,n)=>{this.setSubline(t.el,"ytmd-lyric-roman",e.romanization?.[n]??null),this.setSubline(t.el,"ytmd-lyric-trans",e.translation?.[n]??null)})}setOffset(e){this.lyrics={...this.lyrics,offset_secs:e}}update(e,t){let n=this.lyrics.synced;if(n.length===0)return;let i=e+this.lyrics.offset_secs,r=Ro(this.gapSpans,i),o=Kn(n,e,this.lyrics.offset_secs);if(r>=0&&o>=0&&i>=Ft(n,o))o=-1;if(r!==this.activeGap){if(this.gaps[this.activeGap]?.el.classList.remove("ytmd-active"),this.activeGap=r,this.gaps[r]?.el.classList.add("ytmd-active"),t&&r>=0)this.scrollTo(this.gaps[r].el)}let s=this.gaps[r];if(s){let l=No(s.gap,i);if(l!==s.lit)s.lit=l,s.dots.forEach((c,u)=>c.classList.toggle("ytmd-lit",u<l))}if(o!==this.active){let l=this.rows[this.active];if(l)l.el.classList.remove("ytmd-active"),this.clearFill(l.main),this.clearFill(l.bg);this.rows[this.active-1]?.el.classList.remove("ytmd-near"),this.rows[this.active+1]?.el.classList.remove("ytmd-near"),this.active=o;let c=this.rows[o];if(c){if(c.el.classList.add("ytmd-active"),this.rows[o-1]?.el.classList.add("ytmd-near"),this.rows[o+1]?.el.classList.add("ytmd-near"),t)this.scrollTo(c.el)}}let a=this.rows[o];if(a){let l=Ft(n,o);this.fill(a.main,i,l),this.fill(a.bg,i,l)}}updatePlain(e,t){if(this.lyrics.synced.length>0||!t)return;let n=Vo(this.rows.length,e);if(n===this.plainShown)return;this.plainShown=n;let i=this.rows[n];if(i)this.scrollTo(i.el)}scrollToCurrent(){(this.gaps[this.activeGap]?.el??this.rows[this.active]?.el??this.rows[this.plainShown]?.el)?.scrollIntoView({behavior:"smooth",block:"center"})}scrollTo(e){if(Date.now()<this.holdUntil)return;if(!this.resume.hidden)this.releaseScroll();e.scrollIntoView({behavior:"smooth",block:"center"})}holdScroll(){if(this.rows.length===0)return;this.holdUntil=Date.now()+Ao,this.resume.hidden=!1,this.root.classList.add("ytmd-lyrics-browsing")}releaseScroll(){this.holdUntil=0,this.resume.hidden=!0,this.root.classList.remove("ytmd-lyrics-browsing")}buildText(e,t,n){let i=p("div",{className:e});if(!n||n.length===0)return i.textContent=t,{el:i,run:null};i.classList.add("ytmd-has-words");let r=n.map((o)=>p("span",{className:"ytmd-lyric-word",text:o.text}));return i.append(...r),{el:i,run:{words:n,els:r,shown:n.map(()=>0)}}}buildGap(e){let t=p("div",{className:"ytmd-lyric-gap"});t.setAttribute("aria-hidden","true");let n=[0,1,2].map(()=>p("span",{className:"ytmd-lyric-dot"}));return t.append(...n),{gap:e,el:t,dots:n,lit:0}}setSubline(e,t,n){let i=e.querySelector(`:scope > .${t}`);if(!n){i?.remove();return}if(i){if(i.textContent!==n)i.textContent=n;return}let r=p("div",{className:t,text:n});if(t==="ytmd-lyric-roman")e.querySelector(":scope > .ytmd-lyric-main")?.after(r);else e.append(r)}fill(e,t,n){if(!e)return;for(let i=0;i<e.words.length;i++){let r=Jn(e.words,i,t,n);if(r===e.shown[i])continue;e.shown[i]=r;let o=e.els[i];if(r>0)o.style.setProperty("--ytmd-fill",r>=1?"1":r.toFixed(3));else o.style.removeProperty("--ytmd-fill")}}clearFill(e){if(!e)return;e.els.forEach((t,n)=>{if(e.shown[n]===0)return;e.shown[n]=0,t.style.removeProperty("--ytmd-fill")})}}var Ut=(e,t,n)=>{let i=(o)=>Math.max(0,Math.min(255,Math.round(o))),r=(o)=>i(o).toString(16).padStart(2,"0");return`#${r(e)}${r(t)}${r(n)}`};async function ti(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let r=document.createElement("canvas");r.width=16,r.height=16;let o=r.getContext("2d");if(!o){t(n);return}o.drawImage(i,0,0,16,16);let s=o.getImageData(0,0,16,16).data,a=0,l=0,c=0,u=0,h=0,f=0,y=0,k=0;for(let A=0;A<s.length;A+=4){let j=s[A],Y=s[A+1],G=s[A+2];if(s[A+3]<128)continue;let B=(j+Y+G)/3;if(B<20||B>240)continue;if(A<s.length/2)a+=j,l+=Y,c+=G,u++;else h+=j,f+=Y,y+=G,k++}if(u===0&&k===0){t(n);return}let d=u>0?Math.round(a/u):220,g=u>0?Math.round(l/u):38,x=u>0?Math.round(c/u):38,v=k>0?Math.round(h/k):24,w=k>0?Math.round(f/k):24,T=k>0?Math.round(y/k):27;t({primary:Ut(d,g,x),secondary:Ut(v,w,T),accent:Ut(d+30,g+30,x+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var K=48,Oo=3,Do=3,Ho=1.65,qo=0.55;function $o(e,t,n,i){let r=new Float32Array(e.length),o=(s,a,l)=>{let c=l?n:t,u=l?t:n;for(let h=0;h<c;h++)for(let f=0;f<4;f++)for(let y=0;y<u;y++){let k=0,d=0;for(let x=Math.max(0,y-i);x<=Math.min(u-1,y+i);x++){let v=l?(h*t+x)*4+f:(x*t+h)*4+f;k+=s[v],d++}let g=l?(h*t+y)*4+f:(y*t+h)*4+f;a[g]=k/d}};o(e,r,!0),o(r,e,!1)}function Fo(e,t,n){for(let i=0;i<e.length;i+=4){let r=e[i],o=e[i+1],s=e[i+2],a=0.2126*r+0.7152*o+0.0722*s;e[i]=(a+(r-a)*t)*n,e[i+1]=(a+(o-a)*t)*n,e[i+2]=(a+(s-a)*t)*n}}async function Ke(e,t=qo){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let r=document.createElement("canvas");r.width=K,r.height=K;let o=r.getContext("2d");if(!o)return n(null);o.imageSmoothingQuality="high",o.drawImage(i,0,0,K,K);let s=o.getImageData(0,0,K,K);for(let a=0;a<Do;a++)$o(s.data,K,K,Oo);Fo(s.data,Ho,t),o.putImageData(s,0,0),n(r.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var Bo=3000;function ni(e){let t=Number.isFinite(e)&&e>0?Math.floor(e):0,n=String(t%60).padStart(2,"0"),i=Math.floor(t/60)%60,r=Math.floor(t/3600);return r>0?`${r}:${String(i).padStart(2,"0")}:${n}`:`${i}:${n}`}function Yo(e,t,n,i){if(!(n>0)||!(i>0))return null;return Math.max(0,Math.min(1,(e-t)/n))*i}class jt{opts;view;root;backdrop;cover;title;artist;played;elapsed;total;playButton;status;idleTimer=null;coverUrl="";durationSecs=0;shownSecond=-1;playing=null;open=!1;constructor(e){this.opts=e;let{labels:t}=e;this.view=new Ce({onSeek:e.onSeek,resumeLabel:t.resume}),this.root=p("div",{id:"ytmd-lyrics-fs"}),this.backdrop=p("div",{className:"ytmd-fs-backdrop"}),this.cover=p("img",{className:"ytmd-fs-cover"}),this.cover.alt="",this.title=p("div",{className:"ytmd-fs-title"}),this.artist=p("div",{className:"ytmd-fs-artist"});let n=p("div",{className:"ytmd-fs-seek"}),i=p("div",{className:"ytmd-fs-track"});this.played=p("div",{className:"ytmd-fs-played"}),i.append(this.played),n.append(i),n.addEventListener("click",(f)=>{let y=i.getBoundingClientRect(),k=Yo(f.clientX,y.left,y.width,this.durationSecs);if(k!==null)e.onSeek(k)}),this.elapsed=p("span",{text:"0:00"}),this.total=p("span",{text:"0:00"});let r=p("div",{className:"ytmd-fs-times"});r.append(this.elapsed,this.total);let o=V({label:t.previous,iconPath:C.skipPrevious});this.playButton=V({label:t.play,iconPath:C.play}),this.playButton.classList.add("ytmd-fs-play");let s=V({label:t.next,iconPath:C.skipNext});o.addEventListener("click",()=>e.onCommand("previous")),this.playButton.addEventListener("click",()=>e.onCommand("play_pause")),s.addEventListener("click",()=>e.onCommand("next"));let a=p("div",{className:"ytmd-fs-controls"});a.append(o,this.playButton,s);let l=p("div",{className:"ytmd-fs-side"});l.append(this.cover,this.title,this.artist,n,r,a),this.status=p("div",{className:"ytmd-native-lyrics-status"});let c=p("div",{className:"ytmd-fs-lyrics"});c.append(this.status,this.view.root);let u=p("div",{className:"ytmd-fs-body"});u.append(l,c);let h=V({label:t.close,iconPath:C.close});h.classList.add("ytmd-fs-close"),h.addEventListener("click",()=>this.close()),this.root.append(this.backdrop,p("div",{className:"ytmd-fs-veil"}),u,h),this.root.addEventListener("mousemove",this.wake)}get isOpen(){return this.open}show(){if(this.open)return;this.open=!0,this.shownSecond=-1,document.body.append(this.root),document.addEventListener("keydown",this.onKey,!0),document.addEventListener("fullscreenchange",this.onFullscreenChange),this.root.requestFullscreen?.().catch(()=>{return}),this.wake(),this.view.scrollToCurrent()}close(){if(!this.open)return;if(this.open=!1,document.removeEventListener("keydown",this.onKey,!0),document.removeEventListener("fullscreenchange",this.onFullscreenChange),this.idleTimer!==null)clearTimeout(this.idleTimer);if(this.idleTimer=null,document.fullscreenElement===this.root)document.exitFullscreen().catch(()=>{return});this.root.remove(),this.opts.onClose()}setTrack(e){this.title.textContent=e?.title??"",this.artist.textContent=e?.artist??"";let t=e?.coverUrl??"";if(t===this.coverUrl)return;if(this.coverUrl=t,t)this.cover.src=t;else this.cover.removeAttribute("src");this.backdrop.style.backgroundImage="",Ke(t,0.5).then((n)=>{if(n&&this.coverUrl===t)this.backdrop.style.backgroundImage=`url("${n}")`})}setPlaying(e){if(e===this.playing)return;this.playing=e;let t=e?this.opts.labels.pause:this.opts.labels.play;Ge(this.playButton,e?C.pause:C.play),this.playButton.setAttribute("aria-label",t)}setProgress(e,t){if(this.durationSecs=t,!this.open)return;let n=Math.floor(e);if(n===this.shownSecond)return;this.shownSecond=n;let i=t>0?Math.max(0,Math.min(1,e/t)):0;this.played.style.transform=`scaleX(${i.toFixed(4)})`,this.elapsed.textContent=ni(e),this.total.textContent=ni(t)}setStatus(e){this.status.textContent=e??"",this.status.hidden=e===null,this.view.root.hidden=e!==null}wake=()=>{if(this.root.classList.remove("ytmd-fs-idle"),this.idleTimer!==null)clearTimeout(this.idleTimer);this.idleTimer=window.setTimeout(()=>this.root.classList.add("ytmd-fs-idle"),Bo)};onKey=(e)=>{if(e.key!=="Escape")return;e.stopPropagation(),this.close()};onFullscreenChange=()=>{if(this.open&&document.fullscreenElement!==this.root)this.close()}}var P={...W},N=!1,O="",z=null,E=null,Kt="",R={...Me},oe="",se="",Ie="",di={translate:!1,lang:"en",romanize:!1,autoOpen:!1,effects:!0,theme:"classic"};function Gt(e,t=di){let n=(r,o)=>typeof e[r]==="boolean"?e[r]:o,i=e.lyrics_translate_lang;return{translate:n("lyrics_translate_enabled",t.translate),lang:typeof i==="string"&&/^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(i)?i:t.lang,romanize:n("lyrics_romanize_enabled",t.romanize),autoOpen:n("lyrics_auto_open",t.autoOpen),effects:n("lyrics_effects",t.effects),theme:"lyrics_theme"in e?ei(e.lyrics_theme):t.theme}}var I={...di},Jt=(e,t)=>`${t}|${e.video_id??""}|${e.provider??""}|${e.synced.length}|${e.plain?.length??0}`,it=()=>P.synced.length>0||!!P.plain,ae=0,ii=0,ri=Number.NaN;function Uo(e,t,n,i,r){let o=t-n;if(Number.isFinite(o)&&o>=0&&o<=si)return e+o;return e+Math.min(si,Math.max(0,i)/1000)*(r||1)}var Ze=0,et=!1,oi="",jo=15,si=1,Go=0.3,Xt="",tt=!1,q=null,Je=null,nt=(e,t)=>e===t,Qo=(e)=>e.videoId?`${e.videoId}|${e.title.trim().toLowerCase()}`:`${e.title} - ${e.artist}`,ui={id:"lyrics",manifest:Un,name:"Native Synced Lyrics",description:"Synchronized lyrics from several providers in the native Lyrics tab and in full screen: word by word, with translation, romanization and seek-on-click",defaultEnabled:!0,onInit(e){P={...W},N=!1,O="",Xt="",tt=!1,q=null,R={...Me},oe="",se="",Kt="",Ie="",I=Gt(e.config);let t=(u)=>b.seekTo(u);z=new Ce({onSeek:t,resumeLabel:m().lyricsResumeSync}),z.setEffects(I.effects),z.setTheme(I.theme),E=new jt({labels:{close:m().close,previous:m().playerPrevious,next:m().playerNext,play:m().playerPlay,pause:m().playerPause,resume:m().lyricsResumeSync},onCommand:(u)=>e.sendPlayerCommand(u),onSeek:t,onClose:()=>z?.scrollToCurrent()}),E.view.setEffects(I.effects),E.view.setTheme(I.theme);let n=document.createElement("style");n.id="ytmd-native-lyrics-styles",n.textContent=Zn,document.head.appendChild(n),H();let i=()=>{Zt(e,Gt(e.config,I)),Qt(),as(e),ts(e),Zo(),et=Ko()},r=0,o=()=>{if(r=requestAnimationFrame(o),!et&&!E?.isOpen||P.synced.length===0)return;let u=e.getVideoElement();if(!u||u.paused)return;li(Uo(ae,u.currentTime,ri,performance.now()-ii,u.playbackRate),!0)};r=requestAnimationFrame(o);let s=()=>{setTimeout(()=>{Qt(),en()},50),setTimeout(()=>{en()},250)};document.addEventListener("click",s,!0);let a=window.setInterval(i,600);i(),ns(e);let l=e.events?e.events.listen("lyrics-changed",(u)=>{let h=Le(u.payload);if(!Wo(h))return;rt(e,h)}):null,c=e.events?e.events.listen("config-updated",(u)=>{if(u.payload&&typeof u.payload==="object")Zt(e,Gt(u.payload,I))}):null;Je=()=>{cancelAnimationFrame(r),clearInterval(a),document.removeEventListener("click",s,!0),l?.then((u)=>u()).catch(()=>{return}),c?.then((u)=>u()).catch(()=>{return}),E?.close(),E=null,z=null,n.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((u)=>u.remove())}},async onTrackChange(e,t){let n=Qo(e);if(q=e,n===O)return;O=n,P={...W,video_id:e.videoId??null},N=!0,Ze=0,Xt=fi(),tt=!1,R={...Me},oe="",se="",Ie=I.autoOpen?n:"",Qt(),z?.setLyrics(P,R),le(t),await mi(t,e,n,null)},onPlaybackChange(e){E?.setPlaying(e)},onTick(e,t){ae=e,ii=performance.now(),ri=t.getVideoElement()?.currentTime??Number.NaN,li(e,!0);let n=q?.durationSecs??0;if(E?.setProgress(e,n),P.synced.length===0&&n>0){let i=e/n;if(z?.updatePlain(i,et),E?.isOpen)E.view.updatePlain(i,!0)}if(e>=jo)Jo(t)},onDestroy(){if(Je)Je(),Je=null}};function Wo(e){if(!q)return!1;if(e.video_id&&q.videoId)return e.video_id===q.videoId;return!e.video_id||e.video_id===q.videoId}async function mi(e,t,n,i){try{let r=Le(await e.invoke("fetch_lyrics",{videoId:t.videoId||null,artist:t.artist,title:t.title,albumName:t.album||null,duration:t.durationSecs||null,ytmPlain:i,artistAliases:jn(b.getMoviePlayer()?.getPlayerResponse?.(),t.videoId)},{timeoutMs:15000}));if(!nt(n,O))return;N=!1,rt(e,r)}catch{if(!nt(n,O))return;N=!1,le(e)}}function rt(e,t){let n=t.provider!==null&&t.provider===P.provider&&t.synced.length===P.synced.length&&t.plain===P.plain&&t.video_id===P.video_id&&!N;if(N&&!t.provider&&t.offset_secs===P.offset_secs)return;if(P=t,N=!1,n){let i=document.querySelector(".ytmd-lyrics-offset-value");if(i)i.textContent=hi(t.offset_secs);z?.setOffset(t.offset_secs),E?.view.setOffset(t.offset_secs),Ae(ae,!1);return}R={...Me},oe="",se="",z?.setLyrics(P,R),le(e),Ae(ae,!1),pi(e)}function Zt(e,t){let n=Object.keys(t).some((i)=>t[i]!==I[i]);if(I=t,!n)return;z?.setEffects(I.effects),E?.view.setEffects(I.effects),z?.setTheme(I.theme),E?.view.setTheme(I.theme),le(e),pi(e)}function Xe(){if(z?.setExtras(R),E?.isOpen)E.view.setExtras(R)}async function pi(e){let t=it()&&!N?Jt(P,O):"",n=()=>t!==""&&t===Jt(P,O),i=(a)=>!a||!P.video_id||a===P.video_id,r=(a)=>a.some((l)=>l!==null)?a:null,o=I.translate&&t!==""?`${t}|${I.lang}`:"";if(o!==oe){if(oe=o,R={...R,translation:null},Xe(),o)try{let a=Yt(await e.invoke("translate_lyrics",{lang:I.lang},{timeoutMs:20000}));if(oe===o&&n()&&i(a.video_id))R={...R,translation:r(a.lines)},Xe()}catch{if(oe===o)S(m().lyricsTranslateFailed)}}let s=I.romanize&&t!==""?t:"";if(s!==se){if(se=s,R={...R,romanization:null},Xe(),s)try{let a=Yt(await e.invoke("romanize_lyrics",{},{timeoutMs:20000}));if(se===s&&n()&&i(a.video_id))R={...R,romanization:r(a.lines)},Xe()}catch{if(se===s)S(m().lyricsRomanizeFailed)}}}function ai(e,t){let n=!I[t];e.config[t==="translate"?"lyrics_translate_enabled":"lyrics_romanize_enabled"]=n,Zt(e,{...I,[t]:n}),e.invoke("set_lyrics_display",{[t]:n}).catch(()=>S(m().actionFailed))}function li(e,t){if(e<Ze&&Ze-e<Go)return;Ze=e,Ae(e,t)}function Ko(){if(typeof document>"u"||document.hidden)return!1;let e=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');return!!e&&!!document.getElementById("ytmd-native-lyrics-wrapper")&&bi(e)}function Jo(e){if(oi===O||Q())return;oi=O;let t=Gn(document.querySelectorAll("ytmusic-player-queue-item"));if(!t||t.videoId===q?.videoId)return;e.invoke("prefetch_lyrics",{videoId:t.videoId,title:t.title,artist:t.artist,duration:t.durationSecs}).catch(()=>{return})}function Ae(e,t){if(P.synced.length===0)return;let n=E?.isOpen===!0;if(z?.update(e,t&&et&&!n),n)E?.view.update(e,t)}function Xo(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");return Array.from(e).find((t)=>/tekst|lyrics|paroles|letras/.test(t.textContent?.toLowerCase()||""))??null}function Zo(){if(!Ie||Ie!==O||N||!it())return;let e=Xo();if(!e||!bi(e))return;if(Ie="",!(e.classList.contains("iron-selected")||e.getAttribute("aria-selected")==="true"))e.click()}function yi(){if(!E?.isOpen)return;E.setTrack(q),E.setStatus(N?m().lyricsLoading:it()?null:m().lyricsNone);let e=`${Jt(P,O)}|${N}`;if(e!==Kt)Kt=e,E.view.setLyrics(N?{...W}:P,R);else E.view.setExtras(R)}function es(e){if(!E)return;E.show(),E.setPlaying(e.getVideoElement()?.paused===!1),E.setProgress(ae,q?.durationSecs??0),yi(),Ae(ae,!1),E.view.scrollToCurrent()}function fi(){return document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description')?.textContent?.trim()||""}function ts(e){if(tt||N||!q||P.provider)return;let t=fi();if(!t||t===Xt)return;tt=!0,mi(e,q,O,t)}async function ns(e){let t=is(),n=[...rs(t)];if(n.length===0)return;try{await e.invoke("import_lyrics_offsets",{entries:n}),t?.removeItem?.(gi)}catch(i){console.warn("[Oscilla Lyrics] Offset migration failed, will retry next start:",i)}}var gi="ytmd-lyrics-offsets";function is(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function rs(e){try{let t=e?.getItem(gi);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function hi(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function bi(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function os(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function Qt(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(os(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function ss(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function en(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=ss();e.style.setProperty("display",t?"flex":"none","important")}function as(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=p("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),le(e),Ae(ae,!1)}en()}function J(e,t,n,i){let r=p("button",{className:"ytmd-chip",text:e});if(r.type="button",i)r.prepend(re(i,18));return r.dataset.ytmdTooltip=t,r.setAttribute("aria-label",t),r.addEventListener("click",n),r}function ci(e,t,n,i,r){let o=J(e,t,r,i);return o.setAttribute("aria-pressed",String(n)),o}function Wt(...e){let t=p("span",{className:"ytmd-lyrics-footer-group"});return t.append(...e),t}function ls(){let e=m().lyricsSource(Bt(P.provider,m().lyricsLocalFiles));if(P.source_url){let t=p("a",{className:"ytmd-lyrics-source",text:e});return t.href=P.source_url,t.target="_blank",t.rel="noopener noreferrer",t}return p("span",{className:"ytmd-lyrics-source",text:e})}function cs(e,t){let n=p("div",{className:"ytmd-native-lyrics-footer"});if(n.append(ls(),Wt(ci(m().lyricsTranslate,m().lyricsTranslateTip,I.translate,C.translate,()=>ai(e,"translate")),ci(m().lyricsRomanize,m().lyricsRomanizeTip,I.romanize,C.romanize,()=>ai(e,"romanize")),J(m().lyricsFullscreen,m().lyricsFullscreenTip,()=>es(e),C.fullscreen))),t){let i=p("span",{className:"ytmd-lyrics-offset-value",text:hi(P.offset_secs)}),r=(o)=>{let s=o===null?0:Math.round((P.offset_secs+o)*10)/10;e.invoke("set_lyrics_offset",{offsetSecs:s}).catch((a)=>console.warn("[Oscilla Lyrics] offset:",a))};n.append(Wt(p("span",{text:m().lyricsOffset}),J("−0.5 s",m().lyricsLater,()=>r(-0.5)),i,J("+0.5 s",m().lyricsEarlier,()=>r(0.5)),J(m().lyricsReset,m().lyricsReset,()=>r(null))))}return n.append(Wt(J(m().lyricsWrong,m().lyricsPickTitle,()=>void wi(e)),vi(e))),n}function vi(e){return J(m().lyricsSearchAgain,m().lyricsSearchAgainTip,()=>void ds(e))}async function ds(e){let t=O;N=!0,le(e);try{let n=Le(await e.invoke("refresh_lyrics",{},{timeoutMs:15000}));if(!nt(t,O))return;N=!1,rt(e,n)}catch{if(!nt(t,O))return;N=!1,le(e),S(m().actionFailed)}}async function wi(e){let t=p("div",{className:"ytmd-lyrics-pick-list"});t.append(p("div",{className:"ytmd-native-lyrics-status",text:m().lyricsPickLoading}));let n=Hn({id:"ytmd-lyrics-picker",title:m().lyricsPickTitle,body:[t],actions:[{label:m().close}]}),i=[];try{i=await e.invoke("list_lyrics_candidates",{},{timeoutMs:15000})||[]}catch{i=[]}if(!t.isConnected)return;if(i.length===0){t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:m().lyricsPickNone}));return}t.replaceChildren(...i.map((r)=>{let o=p("button",{className:"ytmd-menu-item"});o.type="button";let s=p("span",{className:"ytmd-menu-item-text"}),a=r.synced?m().lyricsTimed:m().lyricsTextOnly;if(s.append(p("span",{text:`${Bt(r.provider,m().lyricsLocalFiles)} · ${a}`}),p("span",{className:"ytmd-menu-item-sub",text:`${r.title} — ${r.artist}`}),p("span",{className:"ytmd-menu-item-sub",text:r.preview})),o.append(s),r.selected)o.append(p("span",{className:"ytmd-menu-item-hint",text:m().lyricsCurrent}));return o.addEventListener("click",async()=>{n.close();try{rt(e,Le(await e.invoke("pick_lyrics",{provider:r.provider,id:r.id})))}catch{S(m().lyricsPickFailed)}}),o}))}function le(e){yi();let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(N)t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:m().lyricsLoading}));else if(it()&&z)t.replaceChildren(z.root,cs(e,P.synced.length>0));else{let n=[p("div",{className:"ytmd-native-lyrics-status",text:m().lyricsNone})];if(q)n.push(us(e));t.replaceChildren(...n)}}function us(e){let t=p("div",{className:"ytmd-native-lyrics-footer"});return t.append(p("span",{className:"ytmd-lyrics-source"}),J(m().lyricsWrong,m().lyricsPickTitle,()=>void wi(e)),vi(e)),t}var ki={id:"app.ytmd.wheel-volume",name:"Wheel Volume Controller",version:"1.0.0",apiVersion:1,description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:config"],entry:"index.js"};var Re=null;function fe(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}function ps(e,t){let n=Math.max(e.left,t.left),i=Math.max(e.top,t.top);if(n>=Math.min(e.right,t.right)||i>=Math.min(e.bottom,t.bottom))return t;return{left:n,top:i}}function xi(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var Ti={id:"volume",manifest:ki,name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){Re?.(),H(),document.getElementById("ytmd-volume-indicator")?.remove();let t=p("div",{id:"ytmd-volume-indicator"});document.body.appendChild(t);let n=null,i=null,r=null,o=null,s=null,a=null,l=()=>{if(a!==null)window.cancelAnimationFrame(a);a=null},c=()=>{if(s!==null)window.clearTimeout(s);s=null,l(),t.classList.remove("ytmd-visible")},u=()=>{let w=document.querySelector("ytmusic-player-page #main-panel");if(!xi()&&!fe(w))return!1;let T=fe(document.querySelector("ytmusic-player-page #song-image")),A=fe(document.querySelector("ytmusic-player-page video"))||fe(document.querySelector("ytmusic-player-page #movie_player")),Y=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?A||T:T||A)||fe(w);if(!Y)return!1;let G=fe(document.querySelector("ytmusic-player-page #player")),ne=G?ps(Y,G):Y,B=`${Math.max(8,ne.left+12)}px`,Te=`${Math.max(8,ne.top+12)}px`;if(t.style.left!==B)t.style.left=B;if(t.style.top!==Te)t.style.top=Te;return!0},h=()=>{if(a=null,!t.classList.contains("ytmd-visible"))return;if(!u()){c();return}a=window.requestAnimationFrame(h)},f=()=>{if(s!==null)window.clearTimeout(s);if(t.classList.add("ytmd-visible"),a===null)a=window.requestAnimationFrame(h);s=window.setTimeout(c,1800)},y=()=>{let w=e.getVideoElement();if(!w){o=null,c();return}Rt(w);let T=Se(w)?0:Ee(w),A=o!==null&&T!==o&&!Ln();if(o=T,t.textContent!==`${T}%`)t.textContent=`${T}%`,t.setAttribute("aria-label",m().volumeLevel(T));if(!u()){c();return}if(A)f()},k=()=>{let w=e.getVideoElement();if(w===n)return;n?.removeEventListener("volumechange",y),n=w,n?.addEventListener("volumechange",y),y()},d=()=>{let w=document.querySelector("ytmusic-player-page");if(w===i)return;if(r?.disconnect(),i=w,w)r=new MutationObserver(()=>window.requestAnimationFrame(y)),r.observe(w,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},g=(w)=>{let T=w.target;if(T instanceof Element&&T.closest("ytmusic-player-bar"))window.requestAnimationFrame(y)},x=(w)=>{if(w.deltaY===0||w.ctrlKey)return;let T=w.target,A=T instanceof Element?T.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'):null;if(A&&A.tagName!=="YTMUSIC-PLAYER")return;let j=(bn)=>{if(!bn)return!1;let qe=bn.getBoundingClientRect();return w.clientX>=qe.left&&w.clientX<qe.right&&w.clientY>=qe.top&&w.clientY<qe.bottom},Y=j(document.querySelector("ytmusic-player-bar"))||j(document.querySelector("#player-bar-background")),G=e.config.wheel_volume_on_player_page===!0&&(xi()||j(document.querySelector("ytmusic-player-page #main-panel")));if(!Y&&!G)return;let ne=e.getVideoElement();if(!ne)return;let B=e.config.wheel_volume_step,Te=typeof B==="number"&&Number.isFinite(B)&&B>0?Math.min(B,1):0.05;w.preventDefault(),w.stopPropagation(),Be(Ee(ne)+(w.deltaY<0?Te:-Te)*100,ne),y()};window.addEventListener("wheel",x,{passive:!1,capture:!0}),window.addEventListener("resize",y),document.addEventListener("scroll",y,!0),document.addEventListener("input",g,!0),document.addEventListener("change",g,!0),d(),k();let v=window.setInterval(()=>{d(),k(),y()},500);Re=()=>{window.removeEventListener("wheel",x,{capture:!0}),window.removeEventListener("resize",y),document.removeEventListener("scroll",y,!0),document.removeEventListener("input",g,!0),document.removeEventListener("change",g,!0),window.clearInterval(v),r?.disconnect(),n?.removeEventListener("volumechange",y),c(),t.remove()}},onDestroy(){if(Re)Re(),Re=null}};var Pi={id:"app.ytmd.notifications",name:"Track Change Notifications",version:"1.0.0",apiVersion:1,description:"Displays native desktop notifications when songs change",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","internal:config","internal:notify"],entry:"index.js"};var Ei={id:"notifications",manifest:Pi,name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[Oscilla] Notification dispatch failed:",n)}}};var Si={id:"app.ytmd.scrollbars",name:"Sleek Scrollbars",version:"1.0.0",apiVersion:1,description:"Applies subtle, low-contrast scrollbar colors",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","ui"],entry:"index.js"};var ot=null,_i={id:"visualizer",manifest:Si,name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);ot=()=>{t?.remove()}},onDestroy(){if(ot)ot(),ot=null}};var Li={id:"app.ytmd.audio-dsp",name:"Audio DSP & 10-Band Equalizer",version:"1.0.0",apiVersion:1,description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","internal:config"],entry:"index.js"};var st=[32,64,125,250,500,1000,2000,4000,8000,16000],tn={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function Ne(e){return Math.max(-24,Math.min(24,e))}function hs(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function bs(e){return Math.max(0.5,Math.min(2,e))}class D{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=st.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!D.instance)D.instance=new D;return D.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[Oscilla DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=st.map((i,r)=>{if(!this.audioCtx)throw Error("AudioContext missing");let o=this.audioCtx.createBiquadFilter();if(r===0)o.type="lowshelf";else if(r===st.length-1)o.type="highshelf";else o.type="peaking",o.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return o.frequency.setValueAtTime(i,this.audioCtx.currentTime),o.gain.setValueAtTime(0,this.audioCtx.currentTime),o}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[Oscilla DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[Oscilla DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[Oscilla DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=Ne(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=Ne(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=Ne(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,Ne(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=tn[e]||tn.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),hs(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=bs(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??b.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class nn{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){let t=e.videoId||`${e.title}-${e.artist}`;if(t===this.currentTrackId)return;if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=t,this.crossfadeSeconds>0&&e.currentTimeSecs<this.crossfadeSeconds)D.getInstance().fadeIn(this.crossfadeSeconds);else D.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),D.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[Oscilla Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),D.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[Oscilla Crossfade] Advancing to next track..."),b.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class rn{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=D.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[Oscilla Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[Oscilla Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,b.next()}else this.consecutiveSilentTicks=0}}var ce=null,ge=null,at=null;function vs(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var Mi={id:"audio_dsp",manifest:Li,name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=D.getInstance(),n=new nn,i=new rn;ce=n,ge=i;let r=e.config,o=null,s=()=>{if(o!==null)return;let l=e.getVideoElement();if(l){if(!t.isInitializedFor(l))t.init(l);return}o=window.setInterval(()=>{let c=e.getVideoElement();if(c){if(o!==null)clearInterval(o);o=null,t.init(c)}},500)};if(vs(r))s();if(r.equalizer_gains&&Array.isArray(r.equalizer_gains))t.setAllGains(r.equalizer_gains);else if(r.equalizer_preset&&typeof r.equalizer_preset==="string")t.applyPreset(r.equalizer_preset);if(r.preamp_gain!==void 0)t.setPreamp(r.preamp_gain);if(r.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(r.loudness_normalization));if(r.crossfade_seconds!==void 0)n.setCrossfadeSeconds(r.crossfade_seconds);if(r.skip_silence_enabled!==void 0)i.setEnabled(Boolean(r.skip_silence_enabled));if(r.playback_speed!==void 0)t.setPlaybackRate(r.playback_speed);if(r.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(r.preserve_pitch));let a=[];if(e.events){let{listen:l}=e.events;a.push(l("set-eq-band",(c)=>{s(),t.setBandGain(c.payload.bandIndex,c.payload.gain)}),l("set-eq-all",(c)=>{s(),t.setAllGains(c.payload.gains)}),l("set-eq-preset",(c)=>{s(),t.applyPreset(c.payload)}),l("set-preamp",(c)=>{s(),t.setPreamp(c.payload)}),l("set-loudness-normalization",(c)=>{if(c.payload)s();t.setLoudnessNormalization(c.payload)}),l("set-crossfade-seconds",(c)=>{if(c.payload>0)s();n.setCrossfadeSeconds(c.payload)}),l("set-skip-silence",(c)=>{if(c.payload)s();i.setEnabled(c.payload)}),l("set-playback-rate",(c)=>{t.setPlaybackRate(c.payload)}),l("set-preserves-pitch",(c)=>{t.setPreservesPitch(c.payload)}))}at=()=>{if(o!==null)clearInterval(o),o=null;a.forEach((l)=>l.then((c)=>c())),ce?.destroy(),ce=null,ge=null},console.log("[Oscilla] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(D.getInstance().applyRateAndPitch(),ce)ce.onTrackChange(e);if(ge)ge.onTrackChange()},onTick(e,t){if(Q())return;if(ce)ce.onTick(e,t.track);if(ge)ge.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(at)at(),at=null}};var Ci={id:"app.ytmd.ambient-lighting",name:"Dynamic Ambient Lighting",version:"1.0.0",apiVersion:1,description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","ui","internal:config"],entry:"index.js"};var lt=null,ct=null,dt,Ii={id:"ambient_lighting",manifest:Ci,name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=p("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=p("img",{id:"ytmd-ambient-cover"});n.alt="";let i=p("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let r=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,o=e.config.ambient_lighting_enabled!==!1,s=document.createElement("style");s.id="ytmd-ambient-styles",s.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
        opacity: ${o?r:0};
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
    `,document.head.appendChild(s),lt=(l)=>{if(t)t.style.opacity=String(l)};let a=[];if(e.events)a.push(e.events.listen("set-ambient-intensity",(l)=>{lt?.(l.payload)}),e.events.listen("set-ambient-enabled",(l)=>{let c=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;lt?.(l.payload?c:0)}));if(ct=()=>{a.forEach((l)=>l.then((c)=>c())),lt=null,dt=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===dt)return;dt=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await Ke(t):null;if(t!==dt)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await ti(t||""),r=document.documentElement.style;r.setProperty("--ytmd-accent",i.accent),r.setProperty("--ytmd-accent-primary",i.primary),r.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(ct)ct(),ct=null}};var Ai={id:"app.ytmd.themes",name:"Theme Engine & Live CSS",version:"1.0.0",apiVersion:1,description:"Switches YouTube Music\\",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","ui","internal:config"],entry:"index.js"};var Ri=`
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

`,Ni=`
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

`;var ut=null,Vi={id:"theme_engine",manifest:Ai,name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(a)=>{let l=document.getElementById(a);if(!l){l=document.createElement("style"),l.id=a;let c=t();if(c)c.appendChild(l)}return l},i=(a)=>{let l=n("ytmd-active-theme");l.textContent=a?Ri:Ni},r=(a)=>{let l=n("ytmd-custom-css");if(l)l.textContent=a};i(e.config.ambient_lighting_enabled!==!1);let o=e.config.custom_css||"";r(o);let s=[];if(e.events)s.push(e.events.listen("set-ambient-enabled",(a)=>{i(a.payload)}),e.events.listen("set-custom-css",(a)=>{r(a.payload)}));ut=()=>{s.forEach((a)=>a.then((l)=>l()))},console.log("[Oscilla] Theme engine active.")},onDestroy(){if(ut)ut(),ut=null}};var zi={id:"app.ytmd.pip",name:"Floating Picture-in-Picture",version:"1.0.0",apiVersion:1,description:"Detachable floating always-on-top video window for watching music videos while browsing",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","internal:windows"],entry:"index.js"};var mt=null,Oi={id:"pip",manifest:zi,name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let r=V({id:"ytmd-pip-btn",label:m().pipButton,iconPath:C.pip});r.addEventListener("click",async()=>{let o=e.getVideoElement();if(!o)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await o.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(s){console.warn("[Oscilla PiP] Could not enter PiP:",s),await e.invoke("toggle_mini_player").catch((a)=>console.error("[Oscilla PiP] Mini player fallback failed:",a))}}),i.appendChild(r)}},n=window.setInterval(t,1000);t(),mt=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(mt)mt(),mt=null}};var Di={id:"app.ytmd.local-files",name:"Local Music Library",version:"1.0.0",apiVersion:1,description:"Play local offline audio files alongside YouTube Music streaming",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:[],entry:"index.js"};var Hi={id:"local_files",manifest:Di,name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[Oscilla] Local files module ready.")}};var qi={id:"app.ytmd.listen-together",name:"P2P Room Sync",version:"1.0.0",apiVersion:1,description:"Listen together with friends in real-time synchronized listening rooms",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:sync"],entry:"index.js"};var pt="ytmd-nav-slot",on="ytmd-menu-btn",Ve="ytmd-menu",$i="ytmd-sync-chip",Bi=[],yt=null,Yi=null,Fi=!1,Es=`
  #${pt} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function Ss(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=Es,document.head.appendChild(e)}function _s(e){if(!e)return;return`${m().syncInRoom} · ${m().syncListeners(e.listeners)}`}function Ui(e){Bi=e.items,Yi=e.onSyncChipClick}function ji(){if(document.getElementById(pt)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;H(),Ss();let t=p("div",{id:pt}),n=V({id:on,label:m().menuLabel,iconPath:C.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),Ms(n)}),t.appendChild(n),e.prepend(t),Gi(),Is()}function sn(e){yt=e,Gi();let t=document.getElementById(Ve);if(t?.classList.contains("ytmd-open"))Qi(t)}function Gi(){let e=document.getElementById(pt);if(!e)return;let t=document.getElementById($i);if(!yt){t?.remove();return}if(!t)t=p("button",{id:$i,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>Yi?.()),e.prepend(t);let n=m().syncListeners(yt.listeners);t.replaceChildren(p("span",{className:"ytmd-chip-dot"}),re(C.group,18),p("span",{text:n})),t.dataset.ytmdTooltip=m().syncInRoom,t.setAttribute("aria-label",`${m().syncInRoom}, ${n}`)}function Qi(e){let t=[];for(let n of Bi){if(n.dividerBefore)t.push(p("div",{className:"ytmd-menu-divider"}));let i=p("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let r=p("span",{className:"ytmd-menu-item-text"});r.appendChild(p("span",{text:n.label}));let o=n.id==="sync"?_s(yt):void 0;if(o)r.appendChild(p("span",{className:"ytmd-menu-item-sub",text:o}));if(i.append(re(n.iconPath),r),n.hint)i.appendChild(p("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{he(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function Ls(){let e=document.getElementById(Ve);if(!e)e=p("div",{id:Ve,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",Cs),document.body.appendChild(e);return e}function Ms(e){let t=Ls();if(t.classList.contains("ytmd-open")){he();return}Qi(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function he(){let e=document.getElementById(Ve);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById(on);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function Cs(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),he();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")he()}function Is(){if(Fi)return;Fi=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(Ve);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(on)?.contains(n))return;he()}),window.addEventListener("resize",he)}function Wi(e){return e.is_host?"host":e.role??"dj"}function X(e){return e!=="listener"}function Ki(e){return Math.floor(e/2)+1}function As(e,t,n){let i=0;return t.forEach((r,o)=>{if(o!==n&&e>r)i++}),i}var ft=null;function Ji(e,t){if(!ft)return;let n=[...e.querySelectorAll(t)].find((i)=>i.dataset.itemId===ft);if(n)n.focus(),ft=null}function Xi({list:e,rowSelector:t,handleSelector:n,onMove:i}){let r=()=>[...e.querySelectorAll(t)],o=()=>r().forEach((y)=>y.classList.remove("is-dragging","drop-before","drop-after")),s=null,a=(y,k)=>{let d=r().filter((g,x)=>x!==k);if(d.forEach((g)=>g.classList.remove("drop-before","drop-after")),y<d.length)d[y].classList.add("drop-before");else d[d.length-1]?.classList.add("drop-after")},l=(y)=>{if(y.button!==0||!(y.target instanceof Element))return;let k=y.target.closest(n),d=k?.closest(t);if(!k||!d||!k.dataset.itemId)return;let g=r().indexOf(d);if(g<0)return;y.preventDefault();try{k.setPointerCapture(y.pointerId)}catch{}s={from:g,itemId:k.dataset.itemId,to:g,pointerId:y.pointerId,handle:k},d.classList.add("is-dragging")},c=(y)=>{if(!s||y.pointerId!==s.pointerId)return;let k=r().map((d)=>{let g=d.getBoundingClientRect();return g.top+g.height/2});s.to=As(y.clientY,k,s.from),a(s.to,s.from)},u=(y)=>{if(!s||y.pointerId!==s.pointerId)return;let{from:k,to:d,itemId:g,handle:x}=s;if(s=null,x.hasPointerCapture(y.pointerId))x.releasePointerCapture(y.pointerId);if(o(),d!==k)i(k,d,g)},h=(y)=>{if(y.key!=="ArrowUp"&&y.key!=="ArrowDown"||!(y.target instanceof Element))return;let k=y.target.closest(n),d=k?.closest(t);if(!k||!d||!k.dataset.itemId)return;y.preventDefault();let g=r(),x=g.indexOf(d),v=y.key==="ArrowUp"?x-1:x+1;if(x<0||v<0||v>=g.length)return;ft=k.dataset.itemId,i(x,v,k.dataset.itemId)},f=()=>{s=null,o()};return e.addEventListener("pointerdown",l),e.addEventListener("pointermove",c),e.addEventListener("pointerup",u),e.addEventListener("pointercancel",f),e.addEventListener("keydown",h),()=>{e.removeEventListener("pointerdown",l),e.removeEventListener("pointermove",c),e.removeEventListener("pointerup",u),e.removeEventListener("pointercancel",f),e.removeEventListener("keydown",h)}}var Zi="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var ve="ytmd-sync-queue",an="ytmd-sync-queue-styles",gt="data-ytmd-sync-queue",ze="data-ytmd-sync-queue-tab",Rs="M8 5v14l11-7z",Ns="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",Vs=/^[A-Za-z0-9_-]{11}$/;function nr(e){if(typeof e!=="object"||e===null)return null;let t=e.serviceEndpoint?.queueAddEndpoint;if(typeof t!=="object"||t===null)return null;let{queueTarget:n,queueInsertPosition:i}=t;return{videoId:typeof n?.videoId==="string"&&Vs.test(n.videoId)?n.videoId:null,next:i==="INSERT_AFTER_CURRENT_VIDEO"}}function zs(e){return`
  html[${gt}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${gt}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(e)};
    font-size: 14px;
  }
  html[${ze}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${ve} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${ze}] #${ve} { display: block; }
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
`}function Os(e){H();let t=document.getElementById(an);if(!t)t=p("style",{id:an}),document.head.appendChild(t);let n=zs(e);if(t.textContent!==n)t.textContent=n}var ir=".ytmd-sq-handle",Ds=".ytmd-sq-queued";function er(e){let t=p("div",{className:"ytmd-sq-row"}),n=p("img",{className:"ytmd-sq-thumb"});n.alt="",n.loading="lazy",n.src=`https://i.ytimg.com/vi/${e.videoId}/default.jpg`;let i=p("div",{className:"ytmd-sq-text"});if(i.append(p("span",{className:"ytmd-sq-title",text:e.title}),p("span",{className:"ytmd-sq-sub",text:e.sub})),e.handle)t.appendChild(e.handle);if(t.append(n,i),e.actions.length){let r=p("div",{className:"ytmd-sq-actions"});r.append(...e.actions),t.appendChild(r)}return t}function tr(e,t,n){let i=V({label:e,iconPath:t,muted:!0});return i.addEventListener("click",(r)=>{r.stopPropagation(),n()}),i}function rr(e,t,n){let i=m(),r=[];if(t.nowPlaying)r.push(p("div",{className:"ytmd-sq-heading",text:i.syncQueueNowPlaying})),r.push(er({...t.nowPlaying,sub:t.nowPlaying.artist,actions:[]}));if(r.push(p("div",{className:"ytmd-sq-heading",text:i.syncQueueTitle})),t.queue.length===0)r.push(p("p",{className:"ytmd-sq-hint",text:X(t.myRole)?i.syncQueueEmpty:i.syncQueueListenerHint}));let o=t.myRole==="host"||t.myRole==="moderator";for(let s of t.queue){let a=[];if(X(t.myRole))a.push(tr(i.syncQueuePlayNow(s.title),Rs,()=>n.play(s.id)));if(o||s.added_by_id===t.myId)a.push(tr(i.syncQueueRemove(s.title),Ns,()=>n.remove(s.id)));let l;if(X(t.myRole)&&t.queue.length>1)l=V({label:i.syncQueueDrag(s.title),iconPath:Zi,muted:!0}),l.classList.add("ytmd-sq-handle"),l.dataset.itemId=s.id;let c=i.syncQueueFrom(s.added_by),u=er({videoId:s.video_id,title:s.title,sub:s.artist?`${s.artist} · ${c}`:c,actions:a,handle:l});u.classList.add("ytmd-sq-queued"),r.push(u)}e.replaceChildren(...r),Ji(e,ir)}var be=null;function ht(){let e=document.documentElement;if(!be){e.removeAttribute(ze);return}let t=document.querySelector("ytmusic-player-page #side-panel"),n=document.getElementById(ve);if(t&&n?.parentElement!==t){if(!n)n=p("div",{id:ve}),Xi({list:n,rowSelector:Ds,handleSelector:ir,onMove:(r,o,s)=>be?.actions.move(s,o)});n.setAttribute("role","region"),n.setAttribute("aria-label",m().syncQueueTitle),rr(n,be.model,be.actions),t.insertBefore(n,t.querySelector(":scope > #tab-renderer"))}let i=document.querySelector("ytmusic-player-page tp-yt-paper-tab");e.toggleAttribute(ze,!!n?.isConnected&&i?.getAttribute("aria-selected")==="true")}function or(e,t){be={model:e,actions:t},Os(m().syncQueueTab),document.documentElement.setAttribute(gt,"");let n=document.getElementById(ve);if(n)rr(n,e,t);ht()}function ln(){be=null,document.documentElement.removeAttribute(gt),document.documentElement.removeAttribute(ze),document.getElementById(ve)?.remove(),document.getElementById(an)?.remove()}function ke(e){if(e.is_host)return"host";let t=e.members.find((n)=>n.id===e.current_user_id);return t?Wi(t):"dj"}function Hs(e,t,n){let i=new Set(e.map((o)=>o.id)),r=new Set(t.map((o)=>o.id));return{joined:t.filter((o)=>o.id!==n&&!i.has(o.id)).map((o)=>o.nickname),left:e.filter((o)=>o.id!==n&&!r.has(o.id)).map((o)=>o.nickname)}}var de=/^[A-Za-z0-9_-]{11}$/,qs=2,$s=0.25,Fs=0.05,Bs=3,sr=0.1,Ys=0.5,Us=1,js=1000,Gs=1,ar=5000,Qs=4000,lr=15000,Ws=3,Ks=4000,cr=8000,Js=3,cn=1e4,Xs=3,dr=15000,ur=1,Zs=1e4,ea=5,ta=1e4,na=1.2;function un(e,t){return Number.isFinite(t)&&t>ur?Math.min(e,t-ur):e}function ia(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(de.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>Ys)i.seekTo=un(e.current_time_secs,t.duration);return i}let r=e.current_time_secs+Math.min(Us,Math.max(0,n)),o=r-t.currentTime;if(Math.abs(o)>qs)i.seekTo=un(r,t.duration);else if(Math.abs(o)>(t.correcting?Fs:$s))i.playbackRate=1+Math.max(-sr,Math.min(sr,o/Bs));return i}class mr{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function ra(e,t){return t!==null&&e<t&&t-e<ta}function pr(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var oa=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function yr(){return new URLSearchParams(window.location.search).get("v")}function Z(e){let t=b.getMoviePlayer(),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&de.test(n)&&typeof i==="number"&&Number.isFinite(i)){let r=t?.getDuration?.();return{videoId:n,currentTime:i,duration:typeof r==="number"&&r>0?r:e?e.duration:NaN}}return{videoId:yr(),currentTime:e?e.currentTime:0,duration:e?e.duration:NaN}}function bt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function we(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class fr{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor(e=S){this.notify=e}lastBroadcast=null;pendingNav=null;transit=new mr;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;userInputAtMs=Number.NEGATIVE_INFINITY;avToggleAtMs=Number.NEGATIVE_INFINITY;pendingSeek=null;recentSeeks=[];seekLoopWarnedAtMs=Number.NEGATIVE_INFINITY;waitingLogged=!1;stall=null;finished=null;rateCorrection=null;setRoomState(e,t,n=!0){let i=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,this.canControl=n,xn(this.isGuest()),!i)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.recentSeeks=[],this.seekLoopWarnedAtMs=Number.NEGATIVE_INFINITY,this.waitingLogged=!1,this.stall=null,this.avToggleAtMs=Number.NEGATIVE_INFINITY,this.pendingSeek=null,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||bt())return;if(ra(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(de.test(e.video_id))this.hostVideoId=e.video_id;let r=this.requestedVideo;if(r){if(e.video_id!==r.videoId&&n-r.atMs<Qs)return;this.requestedVideo=null}let o=Z(t);if(this.waitingForHostsNext(e,o.videoId,t,n)){if(!this.waitingLogged)this.waitingLogged=!0,_("info","sync",`guest: finished ${e.video_id} before the host, waiting for its next song`);this.endRateCorrection(),b.pause();return}this.waitingLogged=!1;let s={videoId:o.videoId,paused:t?t.paused:!0,currentTime:o.currentTime,duration:o.duration,correcting:this.rateCorrection!==null},a=ia(e,s,i);if(a.navigateTo){this.endRateCorrection();let l=this.pendingNav;if(l&&l.videoId===a.navigateTo&&n-l.atMs<ar)return;let c=l&&l.videoId===a.navigateTo?l.attempts+1:1;if(this.pendingNav={videoId:a.navigateTo,atMs:n,attempts:c},this.rememberOwnNav(a.navigateTo,n),_(c>1?"warn":"info","sync",`guest: host plays ${a.navigateTo} at ${e.current_time_secs.toFixed(1)} s, we have ${o.videoId??"nothing"}: `+(c>1?`switch didn't take, full reload (attempt ${c}); ${pe()}`:"switching")),b.pause(),c>1)window.location.href=`https://music.youtube.com/watch?v=${a.navigateTo}`;else we(a.navigateTo);return}if(this.pendingNav=null,!t)return;if(a.setPlaying===!0)b.play();else if(a.setPlaying===!1)b.pause();if(a.seekTo!==null)this.endRateCorrection(),this.logSeek(s.currentTime,a.seekTo,e,n),b.seekTo(a.seekTo);else this.setCatchUpRate(t,a.playbackRate)}waitingForHostsNext(e,t,n,i){let r=this.finished;return!!r&&e.video_id===r.videoId&&i-r.atMs<Zs&&r.duration-e.current_time_secs<ea&&(t!==r.videoId||!!n?.ended)}logSeek(e,t,n,i){if(this.recentSeeks=this.recentSeeks.filter((r)=>i-r<cn),this.recentSeeks.push(i),_("info","sync",`guest: seek ${e.toFixed(1)} -> ${t.toFixed(1)} s (host ${n.current_time_secs.toFixed(1)} s, ${n.is_playing?"playing":"paused"})`),this.recentSeeks.length>=Js&&i-this.seekLoopWarnedAtMs>cn)this.seekLoopWarnedAtMs=i,_("warn","sync",`guest: ${this.recentSeeks.length} seeks in ${cn/1000} s; ${pe()}`)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>lr)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),_("info","sync",`guest: catching up at ${t.toFixed(3)}x`),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;let{videoId:n,currentTime:i,duration:r}=Z(e);if(Number.isFinite(r)&&r>0&&r-i<Ws){if(this.nearEndAtMs=t,n)this.finished={videoId:n,duration:r,atMs:t}}}checkPlayer(e){if(!this.inRoom||!e||e.paused||bt())return this.stall=null,!1;let{videoId:t,currentTime:n}=Z(e),i=this.stall;if(!i||i.songId!==t||Math.abs(n-i.songTime)>0.05)return this.stall={songId:t,songTime:n,videoTime:e.currentTime,warned:i?.songId===t&&i.warned},!1;if(i.warned||e.currentTime-i.videoTime<Xs)return!1;return i.warned=!0,_("warn","player",`YouTube Music's player time is stuck while the video plays on; ${pe()}`),!0}noteUserInput(e=Date.now()){this.userInputAtMs=e}noteAvToggle(e=Date.now()){this.avToggleAtMs=e}applyPendingSeek(e,t=Date.now()){let n=this.pendingSeek;if(!n||!e)return;if(!this.isHost||t-n.atMs>dr){this.pendingSeek=null;return}let{videoId:i,duration:r}=Z(e);if(i!==n.videoId||!Number.isFinite(r)||r<=0)return;this.pendingSeek=null;let o=un(n.position+(n.playing?(t-n.atMs)/1000:0),r);_("info","sync",`host: ${i} is the other version of the song, carrying on at ${o.toFixed(1)} s`),b.seekTo(o)}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!this.canControl||!e||!de.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<lr)return null;let i=(r)=>(_("info","sync",`guest: now on ${e}, host on ${this.hostVideoId}: ${r}, not sent; ${pe()}`),null);if(t-this.nearEndAtMs<Ks)return i("autoplay after the song ended");if(t-this.userInputAtMs>cr)return i("YouTube Music switched by itself");if(this.requestedVideo?.videoId===e)return null;if(this.requestedVideo={videoId:e,atMs:t},t-this.avToggleAtMs<cr)return _("info","sync",`guest: switched ${this.hostVideoId} to its other version ${e}, asking the host to keep its place`),{kind:"play_video",video_id:e,keep_position:!0};return _("info","sync",`guest: picked ${e} (host on ${this.hostVideoId}), asking the host to play it`),{kind:"play_video",video_id:e}}requestControl(e,t){if(!this.canControl){if(e.kind!=="next"){this.notify(m().syncListenerOnly);return}t("vote_sync_skip").then(()=>this.notify(m().syncVotedSkip)).catch((n)=>{_("warn","sync",`vote to skip failed: ${String(n)}`),this.notify(m().actionFailed)});return}t("send_sync_control",{action:e}).catch((n)=>{_("warn","sync",`request ${e.kind} to the host failed: ${String(n)}`),this.notify(m().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n,source:i}=e,r=i?.kind==="vote"?m().syncVoteSkipped:i?.kind==="queue"?m().syncFromQueue(i.title,t):null;switch(n.kind){case"next":b.next(),this.notify(r??m().syncGuestNext(t));break;case"previous":b.previous(),this.notify(r??m().syncGuestPrevious(t));break;case"set_playing":{let o=b.getVideo();if(!o||o.paused!==n.playing)return;if(n.playing)b.play();else b.pause();this.notify(r??(n.playing?m().syncGuestResumed(t):m().syncGuestPaused(t)));break}case"play_video":{if(!de.test(n.video_id)||n.video_id===yr())return;if(n.keep_position){let o=b.getVideo();this.pendingSeek={videoId:n.video_id,position:Z(o).currentTime,playing:!!o&&!o.paused,atMs:Date.now()},we(n.video_id);break}we(n.video_id),this.notify(r??m().syncGuestPicked(t));break}}}advanceQueue(e,t,n){if(!t||bt())return;let{currentTime:i,duration:r}=Z(t),o=r-i;if(!Number.isFinite(o)||o>na&&!t.ended)return;this.playNextFromQueue(e,n,t,!1)}playNextFromQueue(e,t,n=b.getVideo(),i=!0,r=Date.now()){if(!this.inRoom||!this.isHost||e===0)return!1;let{videoId:o}=Z(n),s=this.queueAdvance;if(s&&s.from===o&&r-s.atMs<ar)return!0;this.queueAdvance={from:o,atMs:r};let a=()=>{if(i)b.nextInYtm()};return t("sync_queue_take_next").then((l)=>{let c=l;if(!c||!de.test(c.video_id)){a();return}b.pause(),we(c.video_id),this.notify(m().syncFromQueue(c.title,c.added_by))}).catch((l)=>{_("warn","sync",`host: playing from the shared queue failed: ${String(l)}`),a()}),!0}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||bt())return;if(this.pendingSeek&&Date.now()-this.pendingSeek.atMs<dr)return;if(t.ended)return;let{videoId:r,currentTime:o}=Z(t);if(!r)return;let s=Date.now(),a=this.lastBroadcast,l=a?a.position+(s-a.atMs)/1000*a.rate:0,c=!!a&&a.playing&&!t.paused&&Math.abs(o-l)>Gs,u=!!a&&a.videoId!==r;if(!i&&!c&&!u&&a&&s-a.atMs<js)return;this.lastBroadcast={atMs:s,videoId:r,position:o,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:r,title:e.title,artist:e.artist,current_time_secs:o,is_playing:!t.paused,timestamp_ms:s}}).catch((h)=>_("warn","sync",`host: broadcast failed: ${String(h)}`))}}var F=null,ue=null,vt=null,U=null,mn=null,sa=1000;function gr(){let e=U,t=ue;if(!e||!t){ln();return}let n=mn,i=(r)=>(o)=>{t(r,{itemId:o}).catch((s)=>{_("warn","sync",`${r} failed: ${String(s)}`),S(m().actionFailed)})};or({queue:e.queue??[],nowPlaying:n?.videoId&&de.test(n.videoId)?{videoId:n.videoId,title:n.title,artist:n.artist}:null,myId:e.current_user_id,myRole:ke(e)},{play:i("sync_queue_play"),remove:i("sync_queue_remove"),move:(r,o)=>{t("sync_queue_move",{itemId:r,toIndex:o}).catch((s)=>{_("warn","sync",`sync_queue_move failed: ${String(s)}`),S(m().actionFailed)})}})}function aa(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function la(e,t){if(!U||!X(ke(U))){S(m().syncQueueListenerNo);return}if(!e.videoId){S(m().syncQueueSongsOnly);return}t("sync_queue_add",{input:e.videoId,next:e.next}).then(()=>S(e.next?m().syncQueuedNext:m().syncQueued)).catch((n)=>{_("warn","sync",`adding to the shared queue failed: ${String(n)}`),S(m().actionFailed)})}function hr(e){let t=F;if(!t||!ue||!t.isGuest())return!1;let n=b.getVideo(),i=pr(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,ue),!0}function br(e){let t=F;if(!t||!ue||!t.isGuest())return!1;return t.requestControl({kind:"play_video",video_id:e},ue),!0}function dn(e,t,n="left"){let i=U;if(U=e,sn(e?{listeners:e.members.length,isHost:e.is_host}:null),gr(),!t)return;if(!e){if(!i)return;S(n==="kicked"?m().syncKicked:n==="lost"?m().syncLost:m().syncRoomClosed);return}if(!i||i.room_id!==e.room_id){if(!e.is_host)S(m().syncConnected);return}if(e.reconnecting){if(!i.reconnecting)S(m().syncReconnecting);return}let r=(h)=>h.members.find((f)=>f.is_host)?.id;if(r(i)!==r(e)){let h=e.members.find((f)=>f.is_host);if(e.is_host)S(m().syncYouHost);else if(h)S(m().syncNewHost(h.nickname));return}if(i.reconnecting)return;let{joined:o,left:s}=Hs(i.members,e.members,e.current_user_id),a=[...o.map(m().syncJoined),...s.map(m().syncLeft)],l=e.skip_votes??[],c=l.filter((h)=>h!==e.current_user_id&&!(i.skip_votes??[]).includes(h));for(let h of c){let f=e.members.find((y)=>y.id===h)?.nickname;if(f)a.push(m().syncVoteProgress(f,l.length,Ki(e.members.length)))}let u=ke(e);if(u!==ke(i))a.push(u==="moderator"?m().syncRoleModerator:u==="listener"?m().syncRoleListener:m().syncRoleDj);if(a.length>0)S(a.join(" · "))}var vr={id:"sync_room",manifest:qi,name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new fr;F=t,ue=e.invoke;let n=[];if(e.events)n.push(e.events.listen("sync-room-updated",(s)=>{t.setRoomState(!0,s.payload.is_host,X(ke(s.payload))),dn(s.payload,!0)}),e.events.listen("sync-room-left",(s)=>{t.setRoomState(!1,!1),dn(null,!0,s.payload?.reason??"left")}),e.events.listen("sync-playback-remote",(s)=>{t.handleRemotePlayback(s.payload,e.getVideoElement())}),e.events.listen("sync-control-remote",(s)=>{t.applyRemoteControl(s.payload)}),e.events.listen("sync-reaction",(s)=>{Dn(s.payload.emoji,s.payload.from)}));let i=(s)=>{if(!(s.target instanceof Element))return;let a=s.target;if(a.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(ht,0);if(t.isInRoom()){let h=a.closest("ytmusic-menu-service-item-renderer"),f=h?nr(h.data):null;if(f){s.preventDefault(),s.stopImmediatePropagation(),aa(),la(f,e.invoke);return}}if(!s.isTrusted)return;if(t.isRoomHost()&&a.closest("ytmusic-player-bar .next-button")&&t.playNextFromQueue(U?.queue?.length??0,e.invoke)){s.preventDefault(),s.stopImmediatePropagation();return}if(!t.isGuest())return;let l=oa.find(([h])=>a.closest(h));if(!l)return;let c=e.getVideoElement(),u=pr(l[1],c?c.paused:!0);if(!u)return;s.preventDefault(),s.stopImmediatePropagation(),t.requestControl(u,e.invoke)};window.addEventListener("click",i,!0);let r=(s)=>{if(!s.isTrusted)return;if(t.noteUserInput(),s.target instanceof Element&&s.target.closest("ytmusic-av-toggle"))t.noteAvToggle()};window.addEventListener("pointerdown",r,!0),window.addEventListener("keydown",r,!0);let o=setInterval(ht,sa);Nt(()=>t.playNextFromQueue(U?.queue?.length??0,e.invoke)),e.invoke("get_sync_room_state").then((s)=>{if(F!==t||!s||typeof s!=="object")return;let a=s;if(t.setRoomState(!0,a.is_host,X(ke(a))),dn(a,!1),!a.is_host&&a.playback_state)t.handleRemotePlayback(a.playback_state,e.getVideoElement())}).catch((s)=>_("warn","sync",`restoring the room after a page load failed: ${String(s)}`)),vt=()=>{n.forEach((s)=>s.then((a)=>a())),window.removeEventListener("click",i,!0),window.removeEventListener("pointerdown",r,!0),window.removeEventListener("keydown",r,!0),clearInterval(o),Nt(null),t.setRoomState(!1,!1),F=null,ue=null,U=null,mn=null,sn(null),ln()}},onTrackChange(e,t){let n=F;if(!n)return;if(mn=e,gr(),n.isInRoom()){let r=b.getMoviePlayer()?.getPlayerResponse?.()?.playabilityStatus;if(r?.status&&r.status!=="OK")_("warn","player",`${e.videoId??"?"} won't play here; ${pe()}`)}n.applyPendingSeek(t.getVideoElement()),n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){F?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();F?.broadcastLocalState(t.track,n,t.invoke),F?.noteLocalTick(n),F?.checkPlayer(n),F?.applyPendingSeek(n),F?.advanceQueue(U?.queue?.length??0,n,t.invoke)},onDestroy(){if(vt)vt(),vt=null}};var wr={id:"app.ytmd.power",name:"Smart Power & Audio Watchdog",version:"1.0.0",apiVersion:1,description:"Keeps the system awake during playback",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","internal:config","internal:power"],entry:"index.js"};var wt=null,da=(e,t)=>t&&e!==!1,kr={id:"power_watchdog",manifest:wr,name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,r=(f)=>{if(n===f)return;n=f,e.invoke("set_inhibit_sleep",{inhibit:f}).catch((y)=>{n=!f,console.error("[Oscilla Power] set_inhibit_sleep failed:",y)})},o=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},s=()=>{t?.release().catch(()=>{}),t=null},a=()=>{let f=e.getVideoElement(),y=!!f&&!f.paused&&!f.ended,k=da(e.config.inhibit_sleep,y);if(r(k),k)o();else s()},l=(f)=>{for(let y of["play","playing","pause","ended"])f.addEventListener(y,a);i=f},c=(f)=>{for(let y of["play","playing","pause","ended"])f.removeEventListener(y,a)},u=e.getVideoElement();if(u)l(u);a();let h=window.setInterval(()=>{let f=e.getVideoElement();if(f&&f!==i){if(i)c(i);l(f),a()}},1000);wt=()=>{if(clearInterval(h),i)c(i);i=null,s(),r(!1)}},onDestroy(){if(wt)wt(),wt=null}};var xr={id:"app.ytmd.remote",name:"Mobile Web Remote",version:"1.0.0",apiVersion:1,description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","internal:remote"],entry:"index.js"};var Pr=(e)=>typeof e==="object"&&e!==null&&!Array.isArray(e),L=(e,...t)=>t.reduce((n,i)=>n==null?void 0:n[i],e),xt=/^[A-Za-z0-9_-]{11}$/;function xe(e){let t=L(e,"runs");if(Array.isArray(t))return t.map((i)=>typeof L(i,"text")==="string"?L(i,"text"):"").join("");let n=L(e,"simpleText");return typeof n==="string"?n:""}function pn(e){if(!Array.isArray(e)||e.length===0)return null;let t=L(e[e.length-1],"url");return typeof t==="string"?t:null}function Tr(e,t){return xe(L(e,"flexColumns",t,"musicResponsiveListItemFlexColumnRenderer","text"))}function ma(e){let t=L(e,"playlistItemData","videoId")??L(e,"overlay","musicItemThumbnailOverlayRenderer","content","musicPlayButtonRenderer","playNavigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!xt.test(t))return null;return{video_id:t,title:Tr(e,0),subtitle:Tr(e,1),thumbnail:pn(L(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function pa(e){let t=L(e,"title","runs",0,"navigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!xt.test(t))return null;return{video_id:t,title:xe(L(e,"title")),subtitle:xe(L(e,"subtitle")),thumbnail:pn(L(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function yn(e,t=20){let n=[],i=new Set,r=(o,s)=>{if(n.length>=t||s>40)return;if(Array.isArray(o)){for(let a of o)r(a,s+1);return}if(!Pr(o))return;for(let[a,l]of Object.entries(o)){let c=null;if(a==="musicResponsiveListItemRenderer")c=ma(l);else if(a==="musicCardShelfRenderer")c=pa(l);if(c&&!i.has(c.video_id)){if(i.add(c.video_id),n.push(c),n.length>=t)return}r(l,s+1)}};return r(e,0),n}function kt(e){let t=L(e,"playlistPanelVideoRenderer")??L(e,"playlistPanelVideoWrapperRenderer","primaryRenderer","playlistPanelVideoRenderer");return Pr(t)?t:null}function Er(e){let t=[];return e.forEach((n,i)=>{let r=kt(n),o=L(r,"videoId");if(!r||typeof o!=="string")return;t.push({id:`${i}:${o}`,video_id:o,title:xe(L(r,"title")),artist:xe(L(r,"shortBylineText"))||xe(L(r,"longBylineText")),thumbnail:pn(L(r,"thumbnail","thumbnails")),current:L(r,"selected")===!0})}),t}function Sr(e,t){let n=t.indexOf(":");if(n<=0)return-1;let i=Number(t.slice(0,n)),r=t.slice(n+1),o=Number.isInteger(i)?kt(e[i]):null;if(o&&L(o,"videoId")===r)return i;return e.findIndex((s)=>L(kt(s),"videoId")===r)}function _r(e,t){if(!t)return e.length;let n=e.findIndex((i)=>L(kt(i),"selected")===!0);return n>=0?n+1:e.length}function Lr(e,t,n=15000){if(!e)return!0;let{position_secs:i,sampled_at_ms:r,...o}=e,{position_secs:s,sampled_at_ms:a,...l}=t;if(JSON.stringify(o)!==JSON.stringify(l))return!0;if(a-r>=n)return!0;let c=e.playing?i+(a-r)/1000:i;return Math.abs(s-c)>1.5}var ya="EgWKAQIIAWoMEA4QChADEAQQCRAF",fa=1000,ga=2000;function gn(){return document.querySelector("#queue")}function Lt(){let e=gn()?.queue?.store?.store?.getState().queue?.items;return Array.isArray(e)?e:[]}function Tt(e,t){let n=gn();if(!n?.dispatch)throw Error("remote.error.noQueue");n.dispatch({type:e,payload:t})}function Cr(){let e=document.querySelector("ytmusic-app")?.networkManager;if(!e||typeof e.fetch!=="function")throw Error("remote.error.unsupported");return e}async function ha(e){let t=Cr(),n=yn(await t.fetch("/search",{query:e,params:ya}));if(n.length===0)n=yn(await t.fetch("/search",{query:e}));return n}async function ba(e,t){let n=gn()?.queue?.store?.store;if(!n)throw Error("remote.error.noQueue");let i=n.getState().queue??{},o=(await Cr().fetch("/music/get_queue",{queueContextParams:i.queueContextParams,queueInsertPosition:t?"INSERT_AFTER_CURRENT_VIDEO":"INSERT_AT_END",videoIds:[e]}))?.queueDatas,s=Array.isArray(o)?o.map((l)=>l&&typeof l==="object"&&("content"in l)?l.content:null).filter(Boolean):[];if(s.length===0)throw Error("remote.error.unsupported");let a=Lt();Tt("ADD_ITEMS",{nextQueueItemId:n.getState().queue?.nextQueueItemId,index:_r(a,t),items:s,shuffleEnabled:!1,shouldAssignIds:!0})}function fn(e){let t=Sr(Lt(),e);if(t<0)throw Error("remote.error.gone");return t}function va(){let e=getComputedStyle(document.documentElement),t=e.getPropertyValue("--ytmd-accent-primary").trim(),n=e.getPropertyValue("--ytmd-accent-secondary").trim(),i=e.getPropertyValue("--ytmd-accent").trim();return t&&n&&i?{primary:t,secondary:n,accent:i}:null}function wa(){let e=b.getVideo(),n=document.getElementById("movie_player")?.getCurrentTime?.();return{playing:!!e&&!e.paused&&!e.ended,position_secs:typeof n==="number"&&Number.isFinite(n)?n:e?.currentTime??0,sampled_at_ms:Date.now(),volume:e?Ee(e)/100:1,muted:e?Se(e):!1,like:b.getLikeStatus(),shuffle:b.isShuffleOn(),repeat:b.getRepeatMode(),accent:va()}}async function ka(e,t){switch(t.kind){case"command":if(t.command==="shuffle")b.toggleShuffle();else if(t.command==="repeat")b.cycleRepeat();else e.sendPlayerCommand(t.command);return null;case"seek":return b.seekTo(t.position_secs),null;case"volume":return b.setVolume(t.volume),null;case"play":if(!xt.test(t.video_id))throw Error("remote.error.invalid");if(!br(t.video_id))we(t.video_id);return null;case"search":return ha(t.query);case"enqueue":return await ba(t.video_id,t.next),null;case"queue_jump":return Tt("SET_INDEX",fn(t.item_id)),null;case"queue_remove":return Tt("REMOVE_ITEM",fn(t.item_id)),null;case"queue_move":{let n=fn(t.item_id),i=Math.max(0,Math.min(t.to_index,Lt().length-1));return Tt("MOVE_ITEM",{fromIndex:n,toIndex:i}),null}}}var Pt=[],Et=[],St=null,_t="";function Ir(){Et.forEach((e)=>clearInterval(e)),Et=[],St=null,_t=""}function xa(e){if(Et.length>0)return;let t=()=>{let i=wa();if(!Lr(St,i))return;St=i,e.invoke("remote_publish",{kind:"state",data:i}).catch(()=>{return})},n=()=>{let i=Er(Lt()),r=JSON.stringify(i);if(r===_t)return;_t=r,e.invoke("remote_publish",{kind:"queue",data:i}).catch(()=>{return})};t(),n(),Et.push(window.setInterval(t,fa),window.setInterval(n,ga))}function Mr(e,t){if(t>0)xa(e);else Ir()}function Ar(e){let t=e.events;if(!t)return;t.listen("remote-action",({payload:n})=>{if(!n?.action)return;ka(e,n.action).then((i)=>{if(n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!0,data:i??null}).catch(()=>{return});St=null,_t=""},(i)=>{let r=i instanceof Error?i.message:String(i);if(console.warn("[Oscilla Remote] action failed:",n.action.kind,r),n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!1,error:r}).catch(()=>{return})})}).then((n)=>Pt.push(n)),t.listen("remote-clients",({payload:n})=>Mr(e,n)).then((n)=>Pt.push(n)),e.invoke("remote_clients").then((n)=>Mr(e,typeof n==="number"?n:0)).catch(()=>{return})}function Rr(){Pt.forEach((e)=>e()),Pt=[],Ir()}var Nr={id:"web_remote",manifest:xr,name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){Ar(e)},onDestroy(){Rr()}};var ee="ytmd-window-controls",Oe={minimize:"M5 11.5h14v1H5z",maximize:"M5 5h14v14H5V5zm1 1v12h12V6H6z",restore:"M8 5h11v11h-3v3H5V8h3V5zm1 1v2h7v7h2V6H9zM6 9v9h9V9H6z",close:"M6.7 6 12 11.3 17.3 6l.7.7-5.3 5.3 5.3 5.3-.7.7-5.3-5.3L6.7 18l-.7-.7 5.3-5.3L6 6.7z"},Ta=132,Pa=`
  html:has(#${ee}) ytmusic-nav-bar #right-content {
    right: 0 !important;
    padding-right: 0 !important;
    margin-right: ${Ta+8}px !important;
  }
  #${ee} {
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
  html:has(ytmusic-player-page[player-fullscreened]) #${ee},
  html:has(:fullscreen) #${ee} {
    display: none;
  }
  #${ee} .ytmd-window-close:hover {
    background: #c42b1c;
    color: #fff;
  }
`,Ea=["a","button","input","textarea","select",'[role="button"]','[role="tab"]',"tp-yt-paper-icon-button","yt-icon-button","ytmusic-search-box","ytmusic-settings-button","ytmusic-cast-button","ytmusic-chip-cloud-renderer",`#${ee}`,"#ytmd-nav-slot"].join(", ");async function hn(e){return(await M("window_action",{action:e}))?.maximized===!0}function De(e){hn(e).then((t)=>{if(e==="toggle_maximize")Dr(t)}).catch((t)=>console.error("[Oscilla] Window action failed:",t))}function Sa(e){if(!(e instanceof Element))return!1;if(!e.closest("ytmusic-nav-bar, #nav-bar-background"))return!1;return e.closest(Ea)===null}function _a(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var te=null,Vr=!1,zr=!1;function Or(){let e=_a();if(e===zr)return;zr=e,hn(e?"enter_fullscreen":"exit_fullscreen").catch((t)=>_("warn","Window",`fullscreen ${e} failed: ${String(t)}`))}function Dr(e){if(!te)return;let t=e?m().windowRestore:m().windowMaximize;Ge(te,e?Oe.restore:Oe.maximize),te.setAttribute("aria-label",t),te.dataset.ytmdTooltip=t}async function Hr(){if(!te)return;Dr(await hn("state").catch(()=>!1))}function La(){if(Vr)return;Vr=!0,document.addEventListener("mousedown",(t)=>{if(t.button!==0||!Sa(t.target))return;if(t.preventDefault(),t.detail===2)De("toggle_maximize");else De("start_dragging")},!0);let e=null;window.addEventListener("resize",()=>{if(e)clearTimeout(e);e=setTimeout(()=>void Hr(),150)}),document.addEventListener("fullscreenchange",Or),new MutationObserver(Or).observe(document.documentElement,{subtree:!0,attributes:!0,attributeFilter:["player-fullscreened"]})}function qr(){if(typeof window>"u"||!window.__TAURI__?.core)return;if(La(),document.getElementById(ee)?.isConnected)return;if(!document.querySelector("ytmusic-nav-bar")||!document.body)return;if(H(),!document.getElementById("ytmd-window-controls-styles")){let i=document.createElement("style");i.id="ytmd-window-controls-styles",i.textContent=Pa,document.head.appendChild(i)}let e=p("div",{id:ee}),t=V({label:m().windowMinimize,iconPath:Oe.minimize});t.addEventListener("click",()=>De("minimize")),te=V({label:m().windowMaximize,iconPath:Oe.maximize}),te.addEventListener("click",()=>De("toggle_maximize"));let n=V({label:m().windowClose,iconPath:Oe.close});n.classList.add("ytmd-window-close"),n.addEventListener("click",()=>De("close")),e.append(t,te,n),document.body.appendChild(e),Hr()}var $r=!1,Fr="";function Ma(){if(document.getElementById("ytmd-player-bar-edges")||!document.head)return;let e=document.createElement("style");e.id="ytmd-player-bar-edges",e.textContent=`
  ytmusic-player-bar {
    --ytmusic-player-bar-fullscreen-progress-bar-inset: 0px !important;
  }
`,document.head.appendChild(e)}function He(){Ma();let e=document.documentElement,t=`${Math.max(0,window.innerWidth-e.clientWidth)}px`;if(t===Fr&&e.style.getPropertyValue("--ytmusic-scrollbar-width")===t)return;Fr=t,e.style.setProperty("--ytmusic-scrollbar-width",t)}function Br(){if($r||typeof window>"u")return;$r=!0,He(),window.addEventListener("resize",He),new ResizeObserver(He).observe(document.documentElement)}var me=(e)=>{M(e).catch((t)=>{console.error(`[Oscilla] ${e} failed:`,t),S(m().actionFailed)})};function Ca(){Ui({onSyncChipClick:()=>me("toggle_sync_window"),items:[{id:"settings",iconPath:C.tune,label:m().menuSettings,hint:"Ctrl+,",onSelect:()=>me("toggle_settings_window")},{id:"local",iconPath:C.folderMusic,label:m().menuLocal,onSelect:()=>me("toggle_local_library_window")},{id:"sync",iconPath:C.group,label:m().menuSync,onSelect:()=>me("toggle_sync_window")},{id:"remote",iconPath:C.phone,label:m().menuRemote,onSelect:()=>me("open_remote_pairing")},{id:"mini",iconPath:C.miniPlayer,label:m().menuMiniPlayer,onSelect:()=>me("toggle_mini_player")}]})}var Ia={lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!1]};function Yr(e){let t={};for(let[n,[i,r]]of Object.entries(Ia)){let o=e[i];t[n]=typeof o==="boolean"?o:r}return t}var Aa=4,Ur=2000;async function jr(){console.log("[Oscilla] Initializing desktop integration bridge...");let e={};Ca();let t=()=>{ji(),qr(),He()};Br(),t();let n=setInterval(t,1000);window.addEventListener("pagehide",()=>clearInterval(n));let i=async(d)=>{try{let g=await M("get_config",{},{timeoutMs:d});return g&&typeof g==="object"?g:null}catch(g){return console.warn("[Oscilla] Loading config failed, retrying:",g),null}},r=!1;for(let d=0;d<Aa&&!r;d++){if(d>0)await new Promise((x)=>setTimeout(x,250));let g=await i(2000);if(g)Object.assign(e,g),r=!0}let s=new Ot({track:null,config:e,invoke:M,sendPlayerCommand:(d)=>{f(d)},getVideoElement:()=>b.getVideo(),listen:(d,g)=>Ct.listen(d,g)},(d,g)=>{if(d instanceof Qe)d.report("hook",g)});s.register(ui),s.register(Ti),s.register(Ei),s.register(_i),s.register(Mi),s.register(Ii),s.register(Vi),s.register(Oi),s.register(Hi),s.register(vr),s.register(kr),s.register(Nr);let a=(d)=>{let g=We(d);if(s.disable(d),g)Yn(g)};for(let d of Fn({sendPlayerCommand:(g)=>f(g),onSwitchedOff:a}))s.register(d);try{await s.initAll(Yr(e))}catch(d){console.error("[Oscilla] Registry init error:",d)}let l=new Vt,c=0,u=Date.now();async function h(d,g,x){try{await M("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(g),is_playing:x,video_id:d.videoId||null,playlist_id:d.playlistId||null,sampled_at_ms:Date.now()}})}catch(v){console.error("[Oscilla] Failed to sync track info to backend:",v)}}l.onTrackChange(async(d)=>{c=d.currentTimeSecs||0,u=Date.now(),s.handleTrackChange(d),await h(d,d.currentTimeSecs||0,d.isPlaying)}),l.onPlaybackChange(async(d)=>{s.handlePlaybackChange(d);let g=l.getCurrentTrack();if(g)g.isPlaying=d,c=g.currentTimeSecs||0,u=Date.now(),await h(g,g.currentTimeSecs||0,d)}),l.onTick((d)=>{s.handleTick(d);let g=l.getCurrentTrack();if(!g||!g.isPlaying)return;let x=Date.now(),v=(x-u)/1000,w=c+v;if(Math.abs(d-w)>2||v>=15)c=d,u=x,g.currentTimeSecs=Math.round(d),h(g,d,!0)});function f(d){if(hr(d))return;switch(d){case"play":b.play();break;case"pause":case"stop":b.pause();break;case"play_pause":b.playPause();break;case"next":b.next();break;case"previous":b.previous();break;case"like":b.toggleLike();break;case"dislike":b.toggleDislike();break;case"mute":b.toggleMute();break}}let y=(d,g)=>{Ct.listen(d,(x)=>g(x.payload))};y("plugin-state-changed",(d)=>{if(d&&!d.enabled)s.disable(d.id)}),y("plugin-settings-changed",(d)=>{if(d?.id&&d.values)We(d.id)?.setSettings(d.values)}),y("plugin-media-progress",(d)=>{if(d?.plugin)We(d.plugin)?.mediaProgress(d)}),y("plugin-media-tools",(d)=>{if(d?.state)Bn().forEach((g)=>g.mediaTools(d))}),y("player-command",(d)=>f(d)),y("tray-command",(d)=>f(d)),y("mpris-command",(d)=>f(d)),y("global-shortcut-event",(d)=>f(d)),y("player-seek",(d)=>b.seekTo(d)),y("mpris-command-seek",(d)=>b.seekTo(d)),y("player-volume",(d)=>b.setVolume(d));let k=(d)=>{Object.assign(e,d);let g=Yr(e);for(let[x,v]of Object.entries(g))if(v)s.enable(x).catch((w)=>console.error(`[Oscilla] Failed to enable plugin ${x}:`,w));else s.disable(x).catch((w)=>console.error(`[Oscilla] Failed to disable plugin ${x}:`,w))};if(y("config-updated",(d)=>{if(d&&typeof d==="object")k(d)}),!r){console.error("[Oscilla] Config not loaded yet; plugins run on defaults until it is.");let d=setInterval(()=>{i(Ur).then((g)=>{if(!g||r)return;r=!0,clearInterval(d),k(g)})},Ur)}window.addEventListener("keydown",(d)=>{if(d.ctrlKey&&d.key===","||d.key==="F2")d.preventDefault(),me("toggle_settings_window")}),console.log("[Oscilla] Integration successfully activated.")}var Ra=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(Ra)if($n(),Mn(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>jr());else jr();})();
