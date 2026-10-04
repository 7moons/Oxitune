(()=>{var C=(e,t={},n={})=>{let i=window.__TAURI__?.core;if(!i?.invoke)return Promise.reject(Error("Tauri bridge unavailable"));return new Promise((r,o)=>{let s=setTimeout(()=>o(Error(`Timed out waiting for ${e}`)),n.timeoutMs??8000);i.invoke("ytmd_bridge",{cmd:e,args:t}).then((a)=>{clearTimeout(s),r(a??null)},(a)=>{clearTimeout(s),o(a instanceof Error?a:Error(String(a)))})})},Fe=new Map,Ct=!1;function jr(){if(Ct)return;let e=window.__TAURI__?.core;if(!e?.Channel||!e.invoke)return;Ct=!0;let t=new e.Channel;t.onmessage=(n)=>{let i=Fe.get(n?.event);if(!i)return;for(let r of[...i])try{r({payload:n.payload})}catch(o){console.error(`[Oscilla] ${n.event} handler failed:`,o)}},e.invoke("ytmd_subscribe",{channel:t}).catch((n)=>{Ct=!1,console.error("[Oscilla] Event feed unavailable:",n)})}var It={listen(e,t){jr();let n=t,i=Fe.get(e);if(!i)Fe.set(e,i=new Set);return i.add(n),Promise.resolve(()=>{Fe.get(e)?.delete(n)})}};function Be(){return document.getElementById("movie_player")}function vn(e){let t=document.querySelector(e);return t&&"value"in t?t:null}var Rt=()=>vn("ytmusic-player-bar #volume-slider");function At(e){return Math.max(0,Math.min(100,Math.round(e)))}function bn(e,t){if("step"in e&&Number(e.step)>1)e.step=1;e.value=t}function Ee(e){let t=Number(Rt()?.value);if(Number.isFinite(t))return At(t);let n=Be()?.getVolume?.(),i=typeof n==="number"&&Number.isFinite(n)?n:e.volume*100;return At(i)}function Pe(e){return Be()?.isMuted?.()===!0||e.muted}function Gr(e,t){bn(e,t),e.dispatchEvent(new CustomEvent("change",{bubbles:!0,composed:!0}));let n=vn("#expand-volume-slider");if(n)bn(n,t)}var Qr=0.002,Wr=0.01,Kr=6,Xr=2000,Te={target:-1,writes:0,since:0};function Nt(e){let t=Rt();if(!t)return;let n=Number(t.value),i=Be();if(!(n>0)||i?.getVolume?.()!==0||Pe(e))return;let r=Math.min(Wr,n*Qr);if(Math.abs(e.volume-r)<0.0001)return;let o=Date.now();if(r!==Te.target||o-Te.since>Xr)Te={target:r,writes:0,since:o};if(Te.writes>=Kr)return;Te.writes++,e.volume=r}function Ye(e,t){if(!Number.isFinite(e))return;let n=At(e),i=Rt();if(i){Gr(i,n),Nt(t);return}let r=Be();if(typeof r?.setVolume==="function"){if(r.setVolume(n),n>0&&r.isMuted?.())if(typeof r.unMute==="function")r.unMute();else t.muted=!1;return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1}var wn=!1;function kn(e){wn=e}function Q(){return wn}var xn=null;function Vt(e){xn=e}function Tn(){return xn?.()??!1}class b{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){if(Tn())return;this.nextInYtm()}static nextInYtm(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static getMoviePlayer(){return document.getElementById("movie_player")}static seekTo(e){if(isNaN(e))return;let t=this.getMoviePlayer();if(typeof t?.seekTo==="function"){let i=t.getDuration?.(),r=typeof i==="number"&&i>0?i:e;t.seekTo(Math.max(0,Math.min(e,r)),!0);return}let n=this.getVideo();if(n)n.currentTime=Math.max(0,Math.min(e,n.duration||e))}static setVolume(e){let t=this.getVideo();if(t)Ye(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static getLikeStatus(){let e=document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer")?.getAttribute("like-status");return e==="LIKE"?"like":e==="DISLIKE"?"dislike":"none"}static getRepeatMode(){let e=document.querySelector("ytmusic-player-bar")?.getAttribute("repeat-mode");return e==="ALL"?"all":e==="ONE"?"one":"none"}static isShuffleOn(){return document.querySelector("ytmusic-player-bar")?.hasAttribute("shuffle-on")??!1}static toggleShuffle(){document.querySelector("ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button")?.click()}static cycleRepeat(){document.querySelector("ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button")?.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}function L(e,t,n){if(e!=="info")console[e](`[Oscilla ${t}] ${n}`);C("page_log",{level:e,scope:t,message:n}).catch(()=>{return})}var Ue=(e)=>typeof e==="number"&&Number.isFinite(e)?e.toFixed(1):"?";function ue(){let e=b.getMoviePlayer(),t=b.getVideo(),n=e?.getPlayerResponse?.()?.playabilityStatus;return[`song=${e?.getVideoData?.()?.video_id??"?"}`,`t=${Ue(e?.getCurrentTime?.())}/${Ue(e?.getDuration?.())}`,`video=${Ue(t?.currentTime)}/${Ue(t?.duration)}`,`state=${e?.getPlayerState?.()??"?"}`,`paused=${t?t.paused:"?"}`,`ready=${t?t.readyState:"?"}`,t?.error?`mediaError=${t.error.code}`:"",n?.status&&n.status!=="OK"?`playability=${n.status}${n.reason?` (${n.reason})`:""}`:""].filter(Boolean).join(" ")}function je(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}function Jr(e,t){if(!e?.videoId)return null;if(t&&e.videoId!==t||!e.title?.trim())return"switching";let n=Number(e.lengthSeconds);return{videoId:e.videoId,title:e.title.trim(),artist:e.author?.trim()??"",durationSecs:Number.isFinite(n)&&n>0?Math.floor(n):0,coverUrl:e.thumbnail?.thumbnails?.at(-1)?.url||`https://i.ytimg.com/vi/${e.videoId}/hqdefault.jpg`}}function En(e){let t=document.getElementById("movie_player")?.getCurrentTime?.();return typeof t==="number"&&Number.isFinite(t)&&t>=0?t:e.currentTime}var Zr=1500,Pn=8000;function eo(e,t){let n=new URLSearchParams(e);if(!t||n.get("v")!==t)return;return n.get("list")||void 0}function to(e,t){return{title:t?.title?.trim()||"",artist:t?.author?.trim()||"",coverUrl:`https://i.ytimg.com/vi/${e}/hqdefault.jpg`}}var Ge=(e)=>e.trim().replace(/\s+/g," ").toLowerCase();function no(e,t){return!!e?.trim()&&!!t?.trim()&&Ge(e)===Ge(t)}function io(e,t){if(!e?.trim()||!t?.trim())return!0;return Ge(e)===Ge(t)}function ro(e,t){if(!e)return"new";if(e.videoId&&t.videoId){if(e.videoId!==t.videoId)return"new"}else if(e.title!==t.title||e.artist!==t.artist)return"new";return e.title!==t.title||e.artist!==t.artist||!e.videoId&&!!t.videoId||!e.coverUrl&&!!t.coverUrl||!e.album&&!!t.album||t.durationSecs>0&&Math.abs(t.durationSecs-e.durationSecs)>1?"metadata":null}var oo=400;function so(e,t){return e-t>=oo}class zt{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(En(this.attachedVideo))};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(r)=>{i=r,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(r){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&so(Date.now(),this.lastTickMs))this.emitTick(En(n))},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,r=i?.title||"",o=i?.artist||"",s=i?.album||"",a="";if(i?.artwork&&i.artwork.length>0){let v=i.artwork[i.artwork.length-1];if(v&&v.src)a=v.src}if(!r){let v=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(v)r=v.textContent?.trim()||""}if(!o){let v=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(v){let T=(v.textContent?.trim()||"").split("•").map((R)=>R.trim());if(o=T[0]||"",T.length>1)s=T[1]}}if(!a){let v=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(v&&v.src)a=v.src}if(a.startsWith("//"))a=`https:${a}`;if(a.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(a))a=a.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let l=t?.getVideoData?.(),c=l?.video_id||new URLSearchParams(window.location.search).get("v")||void 0,y=Jr(t?.getPlayerResponse?.()?.videoDetails,l?.video_id);if(y==="switching"){let v=Date.now(),w=l?.video_id??"";if(this.titleMismatch?.videoId!==w)this.titleMismatch={videoId:w,sinceMs:v};if(v-this.titleMismatch.sinceMs<Pn)return null;y=null}let p=!!l?.video_id&&!l.title?.trim();if(y){if(this.titleMismatch=null,c=y.videoId,!no(y.title,i?.title))r=y.title,o=y.artist,s="",a=y.coverUrl}else if(c&&(p||!io(l?.title,i?.title))){let v=Date.now();if(this.titleMismatch?.videoId!==c)this.titleMismatch={videoId:c,sinceMs:v};let w=v-this.titleMismatch.sinceMs;if(w<Zr)return null;if(p){if(w<Pn)return null}else{let T=to(c,l);if(!this.titleMismatch.logged)this.titleMismatch.logged=!0,L("info","player",`song ${c}: MediaSession still says "${i?.title??""}", using the player's "${T.title}"`);({title:r,artist:o}=T),s="",a=T.coverUrl}}else this.titleMismatch=null;let g=y?y.durationSecs:0,f=0,k=!1;if(!g&&t&&typeof t.getDuration==="function"){let v=t.getDuration();if(typeof v==="number"&&Number.isFinite(v)&&v>0)g=Math.floor(v)}if(t&&typeof t.getCurrentTime==="function"){let v=t.getCurrentTime();if(typeof v==="number"&&Number.isFinite(v)&&v>=0)f=Math.floor(v),k=!0}if(!g&&e&&Number.isFinite(e.duration)&&e.duration>0)g=Math.floor(e.duration);if(!k&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)f=Math.floor(e.currentTime);let d=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(d&&d.textContent){let v=d.textContent.split("/").map((w)=>w.trim());if(v.length===2){if(!f)f=je(v[0]);if(!g)g=je(v[1])}}if(!g){let w=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(w){let T=parseInt(w,10);if(!isNaN(T)&&T>0)g=T}}let h=e?!e.paused&&!e.ended:!1;if(!r)return null;let x=eo(window.location.search,c)??(this.currentTrack?.videoId===c?this.currentTrack?.playlistId:void 0);return{title:r,artist:o||"Unknown Artist",album:s||void 0,coverUrl:a||void 0,durationSecs:g,currentTimeSecs:f,isPlaying:h,videoId:c,playlistId:x}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=ro(this.currentTrack,e),n=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((i)=>i(e))}if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}var ao=15000,lo=100;function co(e,t,n,i,r){if(i||r>ao)return"abandon";if(t&&t!==e.video_id)return"abandon";return t===e.video_id&&n?"apply":"wait"}var uo=500,Ot=!1,Sn=-1/0;function _n(){return Ot||performance.now()-Sn<uo}var mo=()=>document.getElementById("movie_player")?.getVideoData?.()?.video_id||void 0;function Ln(){let e=location.pathname==="/watch"?new URLSearchParams(location.search).get("v"):null;if(!e)return;let t=!1,n=new Set,i=(l)=>{let c=l.target;if(t||!(c instanceof HTMLVideoElement)||c.muted)return;Ot=!0,c.muted=!0,n.add(c)};document.addEventListener("loadstart",i,!0),document.addEventListener("play",i,!0);let r=()=>{if(t)return;if(t=!0,document.removeEventListener("loadstart",i,!0),document.removeEventListener("play",i,!0),n.forEach((l)=>l.muted=!1),n.size>0)Sn=performance.now();n.clear(),Ot=!1},o=(l,c)=>{let y=()=>{if(clearTimeout(p),c.removeEventListener("seeked",y),!l.autoplay)c.pause();r()},p=setTimeout(y,1000);if(c.addEventListener("seeked",y),b.seekTo(l.position_secs),l.autoplay)c.play().catch(()=>{return});else{c.pause();let g=()=>c.pause();c.addEventListener("play",g),setTimeout(()=>c.removeEventListener("play",g),1500)}},s=Date.now();(async()=>{for(let l=0;;l++)try{return await C("take_resume_session")}catch(c){if(l>=20||window.__TAURI__?.core?.invoke)throw c;await new Promise((y)=>setTimeout(y,100))}})().then((l)=>{let c=l;if(!c||c.video_id!==e)return r();let y=setInterval(()=>{let p=document.querySelector("video"),g=co(c,mo(),!!p&&p.readyState>=1,Q(),Date.now()-s);if(g==="wait")return;if(clearInterval(y),g==="apply"&&p)o(c,p);else r()},lo)}).catch((l)=>{console.error("[Oscilla] Resume failed:",l),r()})}var Se=1,Mn={fetch_lyrics:"internal:lyrics",prefetch_lyrics:"internal:lyrics",refresh_lyrics:"internal:lyrics",get_current_lyrics:"internal:lyrics",set_lyrics_offset:"internal:lyrics",list_lyrics_candidates:"internal:lyrics",pick_lyrics:"internal:lyrics",import_lyrics_offsets:"internal:lyrics",translate_lyrics:"internal:lyrics",romanize_lyrics:"internal:lyrics",set_lyrics_display:"internal:lyrics",get_sync_room_state:"internal:sync",broadcast_sync_state:"internal:sync",send_sync_control:"internal:sync",vote_sync_skip:"internal:sync",send_sync_reaction:"internal:sync",sync_queue_add:"internal:sync",sync_queue_remove:"internal:sync",sync_queue_play:"internal:sync",sync_queue_move:"internal:sync",sync_queue_take_next:"internal:sync",remote_clients:"internal:remote",remote_publish:"internal:remote",remote_reply:"internal:remote",set_inhibit_sleep:"internal:power",toggle_mini_player:"internal:windows",toggle_settings_window:"internal:windows",toggle_local_library_window:"internal:windows",toggle_sync_window:"internal:windows",notify_track_change:"internal:notify"},Cn={"config-updated":"internal:config","set-ambient-enabled":"internal:config","set-ambient-intensity":"internal:config","set-custom-css":"internal:config","set-eq-band":"internal:config","set-eq-all":"internal:config","set-eq-preset":"internal:config","set-preamp":"internal:config","set-crossfade-seconds":"internal:config","set-skip-silence":"internal:config","set-loudness-normalization":"internal:config","set-playback-rate":"internal:config","set-preserves-pitch":"internal:config","lyrics-changed":"internal:lyrics","sync-room-updated":"internal:sync","sync-room-left":"internal:sync","sync-playback-remote":"internal:sync","sync-control-remote":"internal:sync","sync-reaction":"internal:sync","remote-action":"internal:remote","remote-clients":"internal:remote"},In=["mp3","m4a","opus","flac"];var po=5;class An extends Error{}function yo(e,t){let n=(r)=>t.permissions.includes(r),i=(r)=>new An(`${t.id} has no permission for ${r}`);return{apiVersion:Se,manifest:t,get track(){return n("player:read")?e.track:null},set track(r){},config:n("internal:config")?e.config:{},invoke:(r,o,s)=>{let a=Mn[r];if(!a||!n(a))return Promise.reject(i(r));return e.invoke(r,o,s)},sendPlayerCommand:(r)=>{if(!n("player:control"))throw i("player control");e.sendPlayerCommand(r)},getVideoElement:()=>n("page")?e.getVideoElement():null,events:{listen:(r,o)=>{let s=Cn[r];if(!s||!n(s))return Promise.reject(i(`event ${r}`));return e.listen(r,o)}}}}class Dt{plugins=new Map;enabledPlugins=new Set;contexts=new Map;errors=new Map;host;onError;constructor(e,t=()=>{}){this.host=e,this.onError=t}register(e){if(this.plugins.set(e.id,e),this.contexts.set(e.id,yo(this.host,e.manifest)),e.defaultEnabled)this.enabledPlugins.add(e.id)}contextOf(e){return this.contexts.get(e)}guard(e,t,n){try{let i=n();if(i&&typeof i.then==="function")return i.catch((r)=>this.failed(e,t,r))}catch(i){this.failed(e,t,i)}return Promise.resolve()}failed(e,t,n){console.error(`[Oscilla] Error in plugin ${e.id} ${t}:`,n);let i=(this.errors.get(e.id)??0)+1;if(this.errors.set(e.id,i),this.onError(e,n),i>=po&&this.enabledPlugins.has(e.id))console.warn(`[Oscilla] ${e.id} switched off after ${i} errors`),this.disable(e.id)}reportError(e,t,n){let i=this.plugins.get(e);if(i)this.failed(i,t,n)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){this.enabledPlugins.add(t);let r=this.contexts.get(t);if(n.onInit)await this.guard(n,"onInit",()=>n.onInit(r))}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){this.enabledPlugins.add(e),this.errors.delete(e);let n=this.contexts.get(e);if(t.onInit)await this.guard(t,"onInit",()=>t.onInit(n))}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await this.guard(t,"onDestroy",()=>t.onDestroy())}}each(e,t){for(let n of[...this.enabledPlugins]){let i=this.plugins.get(n),r=this.contexts.get(n);if(i&&r)this.guard(i,e,()=>t(i,r))}}handleTrackChange(e){this.host.track=e,this.each("onTrackChange",(t,n)=>t.onTrackChange?.(e,n))}handlePlaybackChange(e){this.each("onPlaybackChange",(t,n)=>t.onPlaybackChange?.(e,n))}handleTick(e){this.each("onTick",(t,n)=>t.onTick?.(e,n))}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}function Rn(e,t=18,n=18,i="0 0 24 24"){let r=document.createElementNS("http://www.w3.org/2000/svg","svg");r.setAttribute("width",String(t)),r.setAttribute("height",String(n)),r.setAttribute("viewBox",i),r.setAttribute("fill","currentColor");let o=document.createElementNS("http://www.w3.org/2000/svg","path");return o.setAttribute("d",e),r.appendChild(o),r}function u(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var Nn="ytmd-kit-styles",fo=`
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
`;function H(){if(document.getElementById(Nn))return;let e=document.createElement("style");e.id=Nn,e.textContent=fo,(document.head||document.documentElement).appendChild(e),go()}var S={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",close:"M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",fullscreen:"M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",translate:"m12.87 15.07-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z",romanize:"M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z",remove:"M19 13H5v-2h14v2z",add:"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",swap:"M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z",refresh:"M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",play:"M8 5v14l11-7z",pause:"M6 19h4V5H6v14zm8-14v14h4V5h-4z",skipNext:"M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",skipPrevious:"M6 6h2v12H6zm3.5 6 8.5 6V6z",sync:"M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function _e(e,t=24){return Rn(e,t,t)}function A(e){let t=u("button",{id:e.id,className:`ytmd-icon-btn${e.muted?" ytmd-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.ytmdTooltip=e.label,t.appendChild(_e(e.iconPath)),t}function Qe(e,t){e.querySelector("svg:not(.ytmd-progress-ring)")?.replaceWith(_e(t))}var Vn=!1;function go(){if(Vn)return;Vn=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("ytmd-open")},r=(a)=>{let l=a.dataset.ytmdTooltip;if(!l)return;if(!e)e=u("div",{id:"ytmd-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=l;let c=a.getBoundingClientRect(),y=e.getBoundingClientRect(),g=c.bottom+8+y.height<window.innerHeight?c.bottom+8:c.top-8-y.height,f=Math.max(8,Math.min(window.innerWidth-y.width-8,c.left+c.width/2-y.width/2));e.style.top=`${g}px`,e.style.left=`${f}px`,e.classList.add("ytmd-open")},o=(a)=>{let l=a.target?.closest?.("[data-ytmd-tooltip]");if(!l||l===n)return;i(),n=l,t=setTimeout(()=>r(l),250)},s=(a)=>{let l=a.relatedTarget;if(n&&l&&n.contains(l))return;i()};document.addEventListener("mouseover",o,!0),document.addEventListener("mouseout",s,!0),document.addEventListener("focusin",o,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var ne=null;function _(e,t={}){H();let n=document.getElementById("ytmd-toast-host");if(!n)n=u("div",{id:"ytmd-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".ytmd-toast"),r=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("ytmd-leaving"),o=r?i:u("div",{className:"ytmd-toast"});if(t.id)o.dataset.toastId=t.id;let a=[u("span",{className:"ytmd-toast-text",text:e})];if(t.action){let{label:c,onClick:y}=t.action,p=u("button",{className:"ytmd-button",text:c});p.type="button",p.addEventListener("click",()=>{zn(),y()}),a.push(p)}if(o.replaceChildren(...a),!r)n.replaceChildren(o);if(ne!==null)clearTimeout(ne);ne=null;let l=t.durationMs??4000;if(l>0)ne=setTimeout(zn,l)}var ho=5,bo=3000;function On(e,t){H();let n=document.getElementById("ytmd-reaction-host");if(!n)n=u("div",{id:"ytmd-reaction-host"}),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=u("div",{className:"ytmd-reaction"});i.append(u("span",{className:"ytmd-reaction-emoji",text:e}),u("span",{text:t})),n.appendChild(i);while(n.children.length>ho)n.firstElementChild?.remove();setTimeout(()=>i.remove(),bo)}function zn(){if(ne!==null)clearTimeout(ne);ne=null;let e=document.querySelector("#ytmd-toast-host .ytmd-toast");if(!e)return;e.classList.add("ytmd-leaving"),setTimeout(()=>e.remove(),150)}function Dn(e){H(),document.getElementById(e.id)?.remove();let t=u("div",{id:e.id,className:"ytmd-scrim"}),n=u("div",{className:"ytmd-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let r=u("h2",{id:i,className:"ytmd-dialog-title",text:e.title}),o=u("div",{className:"ytmd-dialog-body"});if(e.body)o.append(...e.body);let s=document.activeElement,a=()=>{document.removeEventListener("keydown",l,!0),t.remove(),s?.focus?.()},l=(y)=>{if(y.key==="Escape")y.stopPropagation(),a()};document.addEventListener("keydown",l,!0),t.addEventListener("click",(y)=>{if(y.target===t)a()});let c=u("div",{className:"ytmd-dialog-actions"});for(let y of e.actions){let p=u("button",{className:`ytmd-button${y.filled?" ytmd-button--filled":""}`,text:y.label});p.type="button",p.addEventListener("click",()=>y.onClick?y.onClick(a):a()),c.appendChild(p)}return n.append(r,o,c),t.appendChild(n),document.body.appendChild(t),c.querySelector("button")?.focus(),{close:a,body:o}}var Hn={menuLabel:"Oscilla",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",pluginSwitchedOff:(e)=>`“${e}” kept failing and was switched off. You can turn it back on in Settings > Plugins.`,menuMiniPlayer:"Mini player",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:(e,t,n)=>`${e} votes to skip (${t}/${n})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:(e,t)=>`From the shared queue: ${e} · ${t}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:(e)=>`${e} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:(e)=>`from ${e}`,syncQueuePlayNow:(e)=>`Play “${e}” now`,syncQueueRemove:(e)=>`Remove “${e}” from the queue`,syncQueueDrag:(e)=>`Move “${e}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",pipButton:"Picture-in-picture",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:(e)=>`Source: ${e}`,lyricsLocalFiles:"Local files",lyricsWrong:"Wrong lyrics?",lyricsPickTitle:"Choose lyrics",lyricsPickLoading:"Looking for other versions…",lyricsPickNone:"No other versions found",lyricsPickFailed:"Couldn’t switch the lyrics",lyricsSearchAgainTip:"Forget these lyrics and look them up again",lyricsTimed:"Timed",lyricsTextOnly:"Text only",lyricsCurrent:"Current",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsResetTip:"Reset timing",lyricsTranslateTip:"Show a translation under each line",lyricsTranslateFailed:"Couldn’t translate these lyrics",lyricsRomanizeTip:"Show lyrics written in other scripts in Latin letters too",lyricsRomanizeFailed:"Couldn’t romanize these lyrics",lyricsResumeSync:"Follow the song",playerPrevious:"Previous",playerNext:"Next",playerPlay:"Play",playerPause:"Pause",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`,windowMinimize:"Minimize",windowMaximize:"Maximize",windowRestore:"Restore down",windowClose:"Close"},vo={menuLabel:"Oscilla",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",pluginSwitchedOff:(e)=>`Wtyczka „${e}” ciągle zgłaszała błędy i została wyłączona. Możesz ją włączyć ponownie w Ustawieniach > Wtyczki.`,menuMiniPlayer:"Miniodtwarzacz",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:(e,t,n)=>`${e} głosuje za pominięciem (${t}/${n})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:(e,t)=>`Ze wspólnej kolejki: ${e} · ${t}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:(e)=>`${e} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:(e)=>`od: ${e}`,syncQueuePlayNow:(e)=>`Zagraj teraz: „${e}”`,syncQueueRemove:(e)=>`Usuń z kolejki: „${e}”`,syncQueueDrag:(e)=>`Przesuń „${e}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",pipButton:"Obraz w obrazie",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:(e)=>`Źródło: ${e}`,lyricsLocalFiles:"Pliki lokalne",lyricsWrong:"Zły tekst?",lyricsPickTitle:"Wybierz tekst",lyricsPickLoading:"Szukanie innych wersji…",lyricsPickNone:"Nie znaleziono innych wersji",lyricsPickFailed:"Nie udało się zmienić tekstu",lyricsSearchAgainTip:"Zapomnij ten tekst i wyszukaj go od nowa",lyricsTimed:"Z synchronizacją",lyricsTextOnly:"Sam tekst",lyricsCurrent:"Obecny",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsResetTip:"Zresetuj synchronizację",lyricsTranslateTip:"Pokazuj tłumaczenie pod każdą linijką",lyricsTranslateFailed:"Nie udało się przetłumaczyć tego tekstu",lyricsRomanizeTip:"Pokazuj tekst w innych alfabetach także literami łacińskimi",lyricsRomanizeFailed:"Nie udało się zapisać tego tekstu literami łacińskimi",lyricsResumeSync:"Podążaj za utworem",playerPrevious:"Poprzedni",playerNext:"Następny",playerPlay:"Odtwórz",playerPause:"Wstrzymaj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`,windowMinimize:"Minimalizuj",windowMaximize:"Maksymalizuj",windowRestore:"Przywróć w dół",windowClose:"Zamknij"},wo={en:Hn,pl:vo};function ko(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return wo[t]??Hn}var Ht=null;function m(){if(!Ht){let e=typeof document<"u"?document.documentElement.lang:"";Ht=ko(e||(typeof navigator<"u"?navigator.language:"en"))}return Ht}var xo=200;function To(e,t=document){let n=t.head||t.documentElement;if(n)return n.appendChild(e),()=>{return};let i=new MutationObserver(()=>{let r=t.head||t.documentElement;if(!r)return;i.disconnect(),r.appendChild(e)});return i.observe(t,{childList:!0}),()=>i.disconnect()}class We{id;name;description;defaultEnabled=!0;manifest;settingsValues;styles;factory;hooks=null;started=!1;track=null;playing=!1;trackListeners=new Set;playbackListeners=new Set;tickListeners=new Set;settingsListeners=new Set;mediaListeners=new Set;toolsListeners=new Set;toolsWaiters=new Set;unloaders=[];styleRemovers=[];constructor(e,t){this.manifest=e.manifest,this.id=e.manifest.id,this.name=e.manifest.name,this.description=e.manifest.description,this.settingsValues={...e.settings},this.styles=e.styles,this.factory=t}has(e){return this.manifest.permissions.includes(e)}report(e,t){console.error(`[Oscilla plugin ${this.id}] ${e}:`,t);let n=`${e}: ${t instanceof Error?t.message:String(t)}`;C("plugin_error",{id:this.id,message:n}).then((i)=>{if(i===!0)this.hooks?.onSwitchedOff(this.id)}).catch(()=>{return})}safe(e,t){return(...n)=>{try{let i=t(...n);if(i instanceof Promise)i.catch((r)=>this.report(e,r))}catch(i){this.report(e,i)}}}listenOn(e,t,n){let i=this.safe(t,n);return e.add(i),()=>e.delete(i)}addStyle(e){let t=document.createElement("style");t.dataset.ytmdPlugin=this.id,t.textContent=String(e);let n=To(t),i=()=>{n(),t.remove()};return this.styleRemovers.push(i),i}buildApi(){let e=this.id,t=`[${e}]`,n={apiVersion:Se,plugin:{id:e,name:this.manifest.name,version:this.manifest.version},log:{info:(...i)=>console.info(t,...i),warn:(...i)=>console.warn(t,...i),error:(...i)=>console.error(t,...i)},onUnload:(i)=>{this.unloaders.push(this.safe("onUnload",i))},settings:{all:()=>({...this.settingsValues}),get:(i)=>this.settingsValues[i],onChange:(i)=>this.listenOn(this.settingsListeners,"settings.onChange",i)}};if(this.has("player:read")){let i=this.has("player:control"),r=(o)=>()=>this.hooks?.sendPlayerCommand(o);n.player={getTrack:()=>this.track?{...this.track}:null,isPlaying:()=>this.playing,onTrackChange:(o)=>this.listenOn(this.trackListeners,"player.onTrackChange",o),onPlaybackChange:(o)=>this.listenOn(this.playbackListeners,"player.onPlaybackChange",o),onTick:(o)=>this.listenOn(this.tickListeners,"player.onTick",o),canSeekAutomatically:()=>!Q(),...i?{play:r("play"),pause:r("pause"),playPause:r("play_pause"),next:r("next"),previous:r("previous"),seek:(o)=>{if(Number.isFinite(o)&&o>=0)b.seekTo(o)},setVolume:(o)=>{if(Number.isFinite(o))b.setVolume(Math.min(1,Math.max(0,o)))}}:{}}}if(this.has("page"))n.page={document,getVideo:()=>b.getVideo()};if(this.has("storage"))n.storage={get:(i)=>C("plugin_storage_get",{id:e,key:String(i)}),set:(i,r)=>C("plugin_storage_set",{id:e,key:String(i),value:r}).then(()=>{return}),remove:(i)=>C("plugin_storage_remove",{id:e,key:String(i)}).then(()=>{return}),keys:()=>C("plugin_storage_keys",{id:e}).then((i)=>Array.isArray(i)?i:[])};if(this.has("network")){let i=(r)=>C("plugin_fetch",{id:e,url:String(r)},{timeoutMs:15000}).then((o)=>String(o??""));n.net={fetchText:i,fetchJson:(r)=>i(r).then((o)=>JSON.parse(o))}}if(this.has("media:save"))n.media={formats:In,save:(i,r)=>C("plugin_media_save",{id:e,videoId:String(i),format:String(r?.format??"mp3")}).then((o)=>String(o)),cancel:(i)=>C("plugin_media_cancel",{id:e,job:String(i)}).then(()=>{return}),onProgress:(i)=>this.listenOn(this.mediaListeners,"media.onProgress",i),tools:()=>C("plugin_media_tools_status",{id:e}).then((i)=>i),installTools:()=>new Promise((i,r)=>{let o=(s)=>{if(s.state==="done"||s.state==="declined"||s.state==="failed")this.toolsWaiters.delete(o),i(s.state)};this.toolsWaiters.add(o),C("plugin_media_install_tools",{id:e}).catch((s)=>{this.toolsWaiters.delete(o),r(s)})}),onToolsProgress:(i)=>this.listenOn(this.toolsListeners,"media.onToolsProgress",i)};if(this.has("ui"))n.ui={toast:(i,r)=>{let o=r?.action;_(String(i).slice(0,xo),{id:r?.id?`${e}:${String(r.id)}`:void 0,durationMs:typeof r?.durationMs==="number"?Math.min(Math.max(r.durationMs,1000),60000):void 0,action:o?{label:String(o.label).slice(0,40),onClick:this.safe("ui.toast action",()=>o.onClick())}:void 0})},addStyle:(i)=>this.addStyle(i)};return Object.freeze(n)}start(e){if(this.hooks=e,this.started)return;if(this.started=!0,this.has("ui"))this.styles.forEach((n)=>this.addStyle(n));let t=this.has("page");try{this.factory(this.buildApi(),t?window:void 0,t?window:void 0,t?window:void 0,t?document:void 0,void 0,void 0)}catch(n){this.report("startup",n)}}mediaTools(e){if(!this.has("media:save"))return;this.toolsListeners.forEach((t)=>t({...e})),[...this.toolsWaiters].forEach((t)=>t(e))}mediaProgress(e){this.mediaListeners.forEach((t)=>t({...e}))}setSettings(e){this.settingsValues={...e};let t={...e};this.settingsListeners.forEach((n)=>n(t))}onInit(e){if(this.hooks)this.start(this.hooks)}onTrackChange(e){this.track={...e},this.trackListeners.forEach((t)=>t({...e}))}onPlaybackChange(e){this.playing=e,this.playbackListeners.forEach((t)=>t(e))}onTick(e){this.tickListeners.forEach((t)=>t(e))}onDestroy(){for(let e of this.unloaders.splice(0))e();this.styleRemovers.splice(0).forEach((e)=>e()),this.trackListeners.clear(),this.playbackListeners.clear(),this.tickListeners.clear(),this.settingsListeners.clear(),this.mediaListeners.clear(),this.toolsListeners.clear()}}var me=new Map,qt=null;function Eo(e){if(!e||typeof e!=="object")return!1;let t=e;return!!t.manifest&&typeof t.manifest.id==="string"&&Array.isArray(t.manifest.permissions)&&!!t.settings&&typeof t.settings==="object"&&Array.isArray(t.styles)}function qn(){if(typeof window>"u"||"__ytmdDefinePlugin"in window)return;Object.defineProperty(window,"__ytmdDefinePlugin",{value:(e,t)=>{if(!Eo(e)||typeof t!=="function"||me.has(e.manifest.id))return;if(e.manifest.apiVersion!==Se)return;let n=new We(e,t);if(me.set(n.id,n),e.manifest.runAt==="document-start")n.start({sendPlayerCommand:(i)=>qt?.sendPlayerCommand(i),onSwitchedOff:(i)=>qt?.onSwitchedOff(i)})},enumerable:!1,writable:!1,configurable:!1})}function $n(e){qt=e;for(let t of me.values())t.start(e);return[...me.values()]}function Fn(){return[...me.values()]}function Ke(e){return me.get(e)}function Bn(e){_(m().pluginSwitchedOff(e.name))}var Yn={id:"app.ytmd.lyrics",name:"Native Synced Lyrics",version:"1.0.0",apiVersion:1,description:"Synchronized lyrics from several providers in the native Lyrics tab and in full screen: word by word, with translation, romanization and seek-on-click",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:config","internal:lyrics"],entry:"index.js"};var So=20;function Un(e,t){if(!t||e?.videoDetails?.videoId!==t)return[];let n=e.microformat?.microformatDataRenderer?.tags;if(!Array.isArray(n))return[];return n.filter((i)=>typeof i==="string"&&i.trim()!=="").slice(0,So)}var $t=(e)=>(e?.runs??[]).map((t)=>t.text??"").join("").trim();function jn(e){let t=Array.from(e),n=t.findIndex((a)=>a.hasAttribute("selected"));if(n<0)return null;let i=t[n+1]?.data,r=i?.videoId,o=$t(i?.title);if(!r||!/^[A-Za-z0-9_-]{11}$/.test(r)||!o)return null;let s=je($t(i?.lengthText));return{videoId:r,title:o,artist:$t(i?.shortBylineText),durationSecs:s>0?s:null}}var W={video_id:null,provider:null,synced:[],plain:null,offset_secs:0,source_url:null};function _o(e,t){let n=0,i=e.length-1,r=-1;while(n<=i){let o=n+i>>1;if(e[o].t<=t)r=o,n=o+1;else i=o-1}return r}function Wn(e,t,n){return _o(e,t+n)}var Lo=0.6,Mo=6;function Xe(e,t){let n=e[t],i=e[t+1]?.t;if(typeof n.end==="number"&&n.end>=n.t)return i===void 0?n.end:Math.min(n.end,Math.max(i,n.t));return i??n.t+Mo}function Kn(e,t,n,i){let r=e[t];if(!r||n<=r.t)return 0;let o=e[t+1]?.t??Math.min(i??1/0,r.t+Lo*3),s=typeof r.end==="number"&&r.end>r.t?r.end:Math.max(o,r.t+0.05);return Math.min(1,(n-r.t)/(s-r.t))}var Co=0.11,Io=1.5;function Xn(e,t,n){let i=e.match(/\S+\s*/g)??[],r=i.map((l)=>Math.max(1,l.trim().length)),o=r.reduce((l,c)=>l+c,0);if(o===0||!(n>t))return[];let s=Math.min((n-t)*0.92,Math.max(Io,o*Co)),a=t;return i.map((l,c)=>{let y=a+s*r[c]/o,p={t:a,text:l,end:y};return a=y,p})}var Gn=7;function Jn(e){let t=[];if(e.length===0)return t;if(e[0].t>=Gn)t.push({before:0,from:0,to:e[0].t});for(let n=1;n<e.length;n++){let i=e[n-1].end;if(typeof i==="number"&&e[n].t-i>=Gn)t.push({before:n,from:i,to:e[n].t})}return t}function Bt(e,t){switch(e){case"local":return t;case"lrcred":return"lrc.red";case"lrclib":return"LRCLIB";case"unison":return"Unison";case"musixmatch":return"Musixmatch";case"netease":return"NetEase";case"ytm":return"YouTube Music";case"genius":return"Genius";default:return e||""}}var Ft=(e)=>typeof e==="number"&&Number.isFinite(e);function Qn(e){if(!Array.isArray(e))return;let t=e.filter((n)=>Ft(n?.t)&&typeof n?.text==="string").map((n)=>Ft(n.end)?{t:n.t,text:n.text,end:n.end}:{t:n.t,text:n.text});return t.length>0?t:void 0}function Ao(e){let t={t:e.t,text:e.text},n=Qn(e.words);if(n)t.words=n;if(Ft(e.end))t.end=e.end;if(e.alt===!0)t.alt=!0;let i=e.bg;if(i&&typeof i.text==="string"&&i.text.trim()!==""){let r=Qn(i.words);t.bg=r?{text:i.text,words:r}:{text:i.text}}return t}function Yt(e){let t=e&&typeof e==="object"?e:{};return{video_id:typeof t.video_id==="string"?t.video_id:null,lines:Array.isArray(t.lines)?t.lines.map((n)=>typeof n==="string"&&n.trim()!==""?n:null):[]}}function Le(e){if(!e||typeof e!=="object")return{...W};let t=e;return{video_id:typeof t.video_id==="string"?t.video_id:null,provider:typeof t.provider==="string"?t.provider:null,synced:Array.isArray(t.synced)?t.synced.filter((n)=>typeof n?.t==="number"&&typeof n?.text==="string").map((n)=>Ao(n)):[],plain:typeof t.plain==="string"?t.plain:null,offset_secs:typeof t.offset_secs==="number"&&Number.isFinite(t.offset_secs)?t.offset_secs:0,source_url:typeof t.source_url==="string"?t.source_url:null}}var Zn=`
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
  /* Text-only lyrics: the same type as timed ones, all of it lit. */
  .ytmd-lyric-line.ytmd-plain { cursor: default; color: var(--ytmd-lyric-on); }
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
    bottom: 76px;
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
  /* The controls: one pill that stays at the bottom of the tab while the
     lyrics scroll under it. Opaque: lines must not show through it. */
  .ytmd-lyrics-bar {
    position: sticky;
    bottom: 16px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 2px;
    align-self: stretch;
    margin-top: 40px;
    padding: 4px 6px 4px 16px;
    border-radius: 24px;
    background: var(--ytmd-surface, #212121);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
    font: 400 12px/16px var(--ytmd-font, Roboto, Arial, sans-serif);
    color: var(--ytmd-text-secondary, rgba(255, 255, 255, 0.7));
  }
  .ytmd-lyrics-bar .ytmd-lyrics-source {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: inherit;
    text-decoration: none;
  }
  .ytmd-lyrics-bar a.ytmd-lyrics-source:hover { text-decoration: underline; }
  .ytmd-lyrics-bar .ytmd-icon-btn { width: 36px; height: 36px; flex: none; }
  .ytmd-lyrics-bar .ytmd-icon-btn svg { width: 20px; height: 20px; }
  /* A switch that is on looks like YTM's selected chip. */
  .ytmd-lyrics-bar .ytmd-icon-btn[aria-pressed="true"] { background: var(--ytmd-text, #fff); color: #030303; }
  .ytmd-lyrics-bar-sep { flex: none; width: 1px; height: 20px; margin: 0 6px; background: var(--ytmd-divider, rgba(255, 255, 255, 0.1)); }
  .ytmd-lyrics-offset-value {
    all: unset;
    flex: none;
    min-width: 48px;
    text-align: center;
    font: 500 12px/36px var(--ytmd-font, Roboto, Arial, sans-serif);
    font-variant-numeric: tabular-nums;
    color: var(--ytmd-text, #fff);
    cursor: pointer;
    border-radius: 18px;
  }
  .ytmd-lyrics-offset-value:hover { background: var(--ytmd-hover, rgba(255, 255, 255, 0.1)); }
  .ytmd-lyrics-offset-value:focus-visible { outline: 2px solid var(--ytmd-text, #fff); outline-offset: -2px; }
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
`;var Me={translation:null,romanization:null},Ro=5000;function No(e,t){return e.findIndex((n)=>t>=n.from&&t<n.to)}function Vo(e,t){let n=(t-e.from)/Math.max(0.001,e.to-e.from);return Math.max(0,Math.min(3,Math.floor(n*3)+1))}function zo(e,t){if(e<=0||!Number.isFinite(t))return-1;return Math.max(0,Math.min(e-1,Math.floor(t*e)))}var Oo=["classic","spotlight","centered","accent","compact","karaoke"],ei=(e)=>Oo.includes(e)?e:"classic";class Ce{opts;root;list;resume;lyrics={...W};rows=[];gaps=[];gapSpans=[];active=-1;activeGap=-1;plainShown=-1;holdUntil=0;constructor(e){this.opts=e;this.root=u("div",{className:"ytmd-lyrics-view"}),this.list=u("div",{className:"ytmd-lyrics-lines"}),this.resume=u("button",{className:"ytmd-chip ytmd-lyrics-resume",text:e.resumeLabel}),this.resume.type="button",this.resume.hidden=!0,this.root.append(this.list,this.resume),this.list.addEventListener("click",(n)=>{let i=n.target?.closest(".ytmd-lyric-line[data-line]"),r=i?this.lyrics.synced[Number(i.dataset.line)]:void 0;if(r)this.opts.onSeek(Math.max(0,r.t-this.lyrics.offset_secs))});let t=()=>this.holdScroll();this.root.addEventListener("wheel",t,{passive:!0}),this.root.addEventListener("touchmove",t,{passive:!0}),this.resume.addEventListener("click",()=>{this.releaseScroll(),this.scrollToCurrent()})}setEffects(e){this.root.classList.toggle("ytmd-lyrics-effects",e)}setTheme(e){this.root.dataset.theme=e}get hasLines(){return this.rows.length>0}setLyrics(e,t){this.lyrics=e,this.active=-1,this.activeGap=-1,this.plainShown=-1,this.releaseScroll(),this.rows=[],this.gaps=[];let n=[];if(e.synced.length>0){let i=Jn(e.synced);e.synced.forEach((r,o)=>{let s=i.find((p)=>p.before===o);if(s){let p=this.buildGap(s);this.gaps.push(p),n.push(p.el)}let a=u("div",{className:"ytmd-lyric-line"});if(a.dataset.line=String(o),r.alt)a.classList.add("ytmd-alt");let l=r.words?.length?r.words:Xn(r.text,r.t,Xe(e.synced,o)),c=this.buildText("ytmd-lyric-main",r.text,l);a.append(c.el);let y=null;if(r.bg){let p=this.buildText("ytmd-lyric-bg",r.bg.text,r.bg.words);a.append(p.el),y=p.run}this.rows.push({el:a,main:c.run,bg:y}),n.push(a)})}else if(e.plain)for(let i of e.plain.split(`
`)){let r=u("div",{className:"ytmd-lyric-line ytmd-plain"});if(i.trim()==="")r.classList.add("ytmd-empty");r.append(u("div",{className:"ytmd-lyric-main",text:i})),this.rows.push({el:r,main:null,bg:null}),n.push(r)}this.gapSpans=this.gaps.map((i)=>i.gap),this.list.replaceChildren(...n),this.root.classList.toggle("ytmd-lyrics-plain",e.synced.length===0),this.setExtras(t)}setExtras(e){this.rows.forEach((t,n)=>{this.setSubline(t.el,"ytmd-lyric-roman",e.romanization?.[n]??null),this.setSubline(t.el,"ytmd-lyric-trans",e.translation?.[n]??null)})}setOffset(e){this.lyrics={...this.lyrics,offset_secs:e}}update(e,t){let n=this.lyrics.synced;if(n.length===0)return;let i=e+this.lyrics.offset_secs,r=No(this.gapSpans,i),o=Wn(n,e,this.lyrics.offset_secs);if(r>=0&&o>=0&&i>=Xe(n,o))o=-1;if(r!==this.activeGap){if(this.gaps[this.activeGap]?.el.classList.remove("ytmd-active"),this.activeGap=r,this.gaps[r]?.el.classList.add("ytmd-active"),t&&r>=0)this.scrollTo(this.gaps[r].el)}let s=this.gaps[r];if(s){let l=Vo(s.gap,i);if(l!==s.lit)s.lit=l,s.dots.forEach((c,y)=>c.classList.toggle("ytmd-lit",y<l))}if(o!==this.active){let l=this.rows[this.active];if(l)l.el.classList.remove("ytmd-active"),this.clearFill(l.main),this.clearFill(l.bg);this.rows[this.active-1]?.el.classList.remove("ytmd-near"),this.rows[this.active+1]?.el.classList.remove("ytmd-near"),this.active=o;let c=this.rows[o];if(c){if(c.el.classList.add("ytmd-active"),this.rows[o-1]?.el.classList.add("ytmd-near"),this.rows[o+1]?.el.classList.add("ytmd-near"),t)this.scrollTo(c.el)}}let a=this.rows[o];if(a){let l=Xe(n,o);this.fill(a.main,i,l),this.fill(a.bg,i,l)}}updatePlain(e,t){if(this.lyrics.synced.length>0||!t)return;let n=zo(this.rows.length,e);if(n===this.plainShown)return;this.plainShown=n;let i=this.rows[n];if(i)this.scrollTo(i.el)}scrollToCurrent(){(this.gaps[this.activeGap]?.el??this.rows[this.active]?.el??this.rows[this.plainShown]?.el)?.scrollIntoView({behavior:"smooth",block:"center"})}scrollTo(e){if(Date.now()<this.holdUntil)return;if(!this.resume.hidden)this.releaseScroll();e.scrollIntoView({behavior:"smooth",block:"center"})}holdScroll(){if(this.rows.length===0)return;this.holdUntil=Date.now()+Ro,this.resume.hidden=!1,this.root.classList.add("ytmd-lyrics-browsing")}releaseScroll(){this.holdUntil=0,this.resume.hidden=!0,this.root.classList.remove("ytmd-lyrics-browsing")}buildText(e,t,n){let i=u("div",{className:e});if(!n||n.length===0)return i.textContent=t,{el:i,run:null};i.classList.add("ytmd-has-words");let r=n.map((o)=>u("span",{className:"ytmd-lyric-word",text:o.text}));return i.append(...r),{el:i,run:{words:n,els:r,shown:n.map(()=>0)}}}buildGap(e){let t=u("div",{className:"ytmd-lyric-gap"});t.setAttribute("aria-hidden","true");let n=[0,1,2].map(()=>u("span",{className:"ytmd-lyric-dot"}));return t.append(...n),{gap:e,el:t,dots:n,lit:0}}setSubline(e,t,n){let i=e.querySelector(`:scope > .${t}`);if(!n){i?.remove();return}if(i){if(i.textContent!==n)i.textContent=n;return}let r=u("div",{className:t,text:n});if(t==="ytmd-lyric-roman")e.querySelector(":scope > .ytmd-lyric-main")?.after(r);else e.append(r)}fill(e,t,n){if(!e)return;for(let i=0;i<e.words.length;i++){let r=Kn(e.words,i,t,n);if(r===e.shown[i])continue;e.shown[i]=r;let o=e.els[i];if(r>0)o.style.setProperty("--ytmd-fill",r>=1?"1":r.toFixed(3));else o.style.removeProperty("--ytmd-fill")}}clearFill(e){if(!e)return;e.els.forEach((t,n)=>{if(e.shown[n]===0)return;e.shown[n]=0,t.style.removeProperty("--ytmd-fill")})}}var Ut=(e,t,n)=>{let i=(o)=>Math.max(0,Math.min(255,Math.round(o))),r=(o)=>i(o).toString(16).padStart(2,"0");return`#${r(e)}${r(t)}${r(n)}`};async function ti(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let r=document.createElement("canvas");r.width=16,r.height=16;let o=r.getContext("2d");if(!o){t(n);return}o.drawImage(i,0,0,16,16);let s=o.getImageData(0,0,16,16).data,a=0,l=0,c=0,y=0,p=0,g=0,f=0,k=0;for(let R=0;R<s.length;R+=4){let j=s[R],Y=s[R+1],G=s[R+2];if(s[R+3]<128)continue;let B=(j+Y+G)/3;if(B<20||B>240)continue;if(R<s.length/2)a+=j,l+=Y,c+=G,y++;else p+=j,g+=Y,f+=G,k++}if(y===0&&k===0){t(n);return}let d=y>0?Math.round(a/y):220,h=y>0?Math.round(l/y):38,x=y>0?Math.round(c/y):38,v=k>0?Math.round(p/k):24,w=k>0?Math.round(g/k):24,T=k>0?Math.round(f/k):27;t({primary:Ut(d,h,x),secondary:Ut(v,w,T),accent:Ut(d+30,h+30,x+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var K=48,Do=3,Ho=3,qo=1.65,$o=0.55;function Fo(e,t,n,i){let r=new Float32Array(e.length),o=(s,a,l)=>{let c=l?n:t,y=l?t:n;for(let p=0;p<c;p++)for(let g=0;g<4;g++)for(let f=0;f<y;f++){let k=0,d=0;for(let x=Math.max(0,f-i);x<=Math.min(y-1,f+i);x++){let v=l?(p*t+x)*4+g:(x*t+p)*4+g;k+=s[v],d++}let h=l?(p*t+f)*4+g:(f*t+p)*4+g;a[h]=k/d}};o(e,r,!0),o(r,e,!1)}function Bo(e,t,n){for(let i=0;i<e.length;i+=4){let r=e[i],o=e[i+1],s=e[i+2],a=0.2126*r+0.7152*o+0.0722*s;e[i]=(a+(r-a)*t)*n,e[i+1]=(a+(o-a)*t)*n,e[i+2]=(a+(s-a)*t)*n}}async function Je(e,t=$o){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let r=document.createElement("canvas");r.width=K,r.height=K;let o=r.getContext("2d");if(!o)return n(null);o.imageSmoothingQuality="high",o.drawImage(i,0,0,K,K);let s=o.getImageData(0,0,K,K);for(let a=0;a<Ho;a++)Fo(s.data,K,K,Do);Bo(s.data,qo,t),o.putImageData(s,0,0),n(r.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var Yo=3000;function ni(e){let t=Number.isFinite(e)&&e>0?Math.floor(e):0,n=String(t%60).padStart(2,"0"),i=Math.floor(t/60)%60,r=Math.floor(t/3600);return r>0?`${r}:${String(i).padStart(2,"0")}:${n}`:`${i}:${n}`}function Uo(e,t,n,i){if(!(n>0)||!(i>0))return null;return Math.max(0,Math.min(1,(e-t)/n))*i}var jo="ytmusic-player .fullscreen-button",Go=".exit-fullscreen-button",Qo='ytmusic-player-page[player-fullscreened], ytmusic-app-layout[player-ui-state="FULLSCREEN"], ytmusic-player[player-ui-state="FULLSCREEN"]',Wo=300;function Ko(e){return(e.key==="f"||e.key==="F")&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&!e.repeat}function Xo(e){if(!e)return!1;return e.isContentEditable===!0||["INPUT","TEXTAREA","SELECT"].includes((e.tagName??"").toUpperCase())}function ii(e){let t=()=>e.isOpen()?e.close():e.open(),n=(s)=>{s.preventDefault(),s.stopImmediatePropagation()},i=(s)=>{if(!(s.target instanceof Element)||!s.target.closest(jo))return;n(s),e.open()},r=(s)=>{if(!Ko(s)||Xo(s.target))return;n(s),t()},o=window.setInterval(()=>{if(e.isOpen()||!document.querySelector(Qo))return;Array.from(document.querySelectorAll(Go)).find((a)=>a.offsetParent!==null)?.click(),e.open()},Wo);return document.addEventListener("click",i,!0),document.addEventListener("keydown",r,!0),()=>{clearInterval(o),document.removeEventListener("click",i,!0),document.removeEventListener("keydown",r,!0)}}class jt{opts;view;root;backdrop;cover;title;artist;played;elapsed;total;playButton;status;idleTimer=null;coverUrl="";durationSecs=0;shownSecond=-1;playing=null;open=!1;constructor(e){this.opts=e;let{labels:t}=e;this.view=new Ce({onSeek:e.onSeek,resumeLabel:t.resume}),this.root=u("div",{id:"ytmd-lyrics-fs"}),this.backdrop=u("div",{className:"ytmd-fs-backdrop"}),this.cover=u("img",{className:"ytmd-fs-cover"}),this.cover.alt="",this.title=u("div",{className:"ytmd-fs-title"}),this.artist=u("div",{className:"ytmd-fs-artist"});let n=u("div",{className:"ytmd-fs-seek"}),i=u("div",{className:"ytmd-fs-track"});this.played=u("div",{className:"ytmd-fs-played"}),i.append(this.played),n.append(i),n.addEventListener("click",(g)=>{let f=i.getBoundingClientRect(),k=Uo(g.clientX,f.left,f.width,this.durationSecs);if(k!==null)e.onSeek(k)}),this.elapsed=u("span",{text:"0:00"}),this.total=u("span",{text:"0:00"});let r=u("div",{className:"ytmd-fs-times"});r.append(this.elapsed,this.total);let o=A({label:t.previous,iconPath:S.skipPrevious});this.playButton=A({label:t.play,iconPath:S.play}),this.playButton.classList.add("ytmd-fs-play");let s=A({label:t.next,iconPath:S.skipNext});o.addEventListener("click",()=>e.onCommand("previous")),this.playButton.addEventListener("click",()=>e.onCommand("play_pause")),s.addEventListener("click",()=>e.onCommand("next"));let a=u("div",{className:"ytmd-fs-controls"});a.append(o,this.playButton,s);let l=u("div",{className:"ytmd-fs-side"});l.append(this.cover,this.title,this.artist,n,r,a),this.status=u("div",{className:"ytmd-native-lyrics-status"});let c=u("div",{className:"ytmd-fs-lyrics"});c.append(this.status,this.view.root);let y=u("div",{className:"ytmd-fs-body"});y.append(l,c);let p=A({label:t.close,iconPath:S.close});p.classList.add("ytmd-fs-close"),p.addEventListener("click",()=>this.close()),this.root.append(this.backdrop,u("div",{className:"ytmd-fs-veil"}),y,p),this.root.addEventListener("mousemove",this.wake)}get isOpen(){return this.open}show(){if(this.open)return;this.open=!0,this.shownSecond=-1,document.body.append(this.root),document.addEventListener("keydown",this.onKey,!0),document.addEventListener("fullscreenchange",this.onFullscreenChange),this.root.requestFullscreen?.().catch(()=>{return}),this.wake(),this.view.scrollToCurrent()}close(){if(!this.open)return;if(this.open=!1,document.removeEventListener("keydown",this.onKey,!0),document.removeEventListener("fullscreenchange",this.onFullscreenChange),this.idleTimer!==null)clearTimeout(this.idleTimer);if(this.idleTimer=null,document.fullscreenElement===this.root)document.exitFullscreen().catch(()=>{return});this.root.remove(),this.opts.onClose()}setTrack(e){this.title.textContent=e?.title??"",this.artist.textContent=e?.artist??"";let t=e?.coverUrl??"";if(t===this.coverUrl)return;if(this.coverUrl=t,t)this.cover.src=t;else this.cover.removeAttribute("src");this.backdrop.style.backgroundImage="",Je(t,0.5).then((n)=>{if(n&&this.coverUrl===t)this.backdrop.style.backgroundImage=`url("${n}")`})}setPlaying(e){if(e===this.playing)return;this.playing=e;let t=e?this.opts.labels.pause:this.opts.labels.play;Qe(this.playButton,e?S.pause:S.play),this.playButton.setAttribute("aria-label",t)}setProgress(e,t){if(this.durationSecs=t,!this.open)return;let n=Math.floor(e);if(n===this.shownSecond)return;this.shownSecond=n;let i=t>0?Math.max(0,Math.min(1,e/t)):0;this.played.style.transform=`scaleX(${i.toFixed(4)})`,this.elapsed.textContent=ni(e),this.total.textContent=ni(t)}setStatus(e){this.status.textContent=e??"",this.status.hidden=e===null,this.view.root.hidden=e!==null}wake=()=>{if(this.root.classList.remove("ytmd-fs-idle"),this.idleTimer!==null)clearTimeout(this.idleTimer);this.idleTimer=window.setTimeout(()=>this.root.classList.add("ytmd-fs-idle"),Yo)};onKey=(e)=>{if(e.key!=="Escape")return;e.stopPropagation(),this.close()};onFullscreenChange=()=>{if(this.open&&document.fullscreenElement!==this.root)this.close()}}var P={...W},V=!1,O="",z=null,E=null,Wt="",N={...Me},ie="",re="",Ie="",ui={translate:!1,lang:"en",romanize:!1,autoOpen:!1,effects:!0,theme:"classic"};function Gt(e,t=ui){let n=(r,o)=>typeof e[r]==="boolean"?e[r]:o,i=e.lyrics_translate_lang;return{translate:n("lyrics_translate_enabled",t.translate),lang:typeof i==="string"&&/^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(i)?i:t.lang,romanize:n("lyrics_romanize_enabled",t.romanize),autoOpen:n("lyrics_auto_open",t.autoOpen),effects:n("lyrics_effects",t.effects),theme:"lyrics_theme"in e?ei(e.lyrics_theme):t.theme}}var I={...ui},Kt=(e,t)=>`${t}|${e.video_id??""}|${e.provider??""}|${e.synced.length}|${e.plain?.length??0}`,Re=()=>P.synced.length>0||!!P.plain,oe=0,ri=0,oi=Number.NaN;function Jo(e,t,n,i,r){let o=t-n;if(Number.isFinite(o)&&o>=0&&o<=ai)return e+o;return e+Math.min(ai,Math.max(0,i)/1000)*(r||1)}var tt=0,nt=!1,si="",Zo=15,ai=1,es=0.3,Xt="",it=!1,q=null,Ze=null,rt=(e,t)=>e===t,ts=(e)=>e.videoId?`${e.videoId}|${e.title.trim().toLowerCase()}`:`${e.title} - ${e.artist}`,mi={id:"lyrics",manifest:Yn,name:"Native Synced Lyrics",description:"Synchronized lyrics from several providers in the native Lyrics tab and in full screen: word by word, with translation, romanization and seek-on-click",defaultEnabled:!0,onInit(e){P={...W},V=!1,O="",Xt="",it=!1,q=null,N={...Me},ie="",re="",Wt="",Ie="",I=Gt(e.config);let t=(p)=>b.seekTo(p);z=new Ce({onSeek:t,resumeLabel:m().lyricsResumeSync}),z.setEffects(I.effects),z.setTheme(I.theme),E=new jt({labels:{close:m().close,previous:m().playerPrevious,next:m().playerNext,play:m().playerPlay,pause:m().playerPause,resume:m().lyricsResumeSync},onCommand:(p)=>e.sendPlayerCommand(p),onSeek:t,onClose:()=>z?.scrollToCurrent()}),E.view.setEffects(I.effects),E.view.setTheme(I.theme);let n=ii({isOpen:()=>E?.isOpen===!0,open:()=>as(e),close:()=>E?.close()}),i=document.createElement("style");i.id="ytmd-native-lyrics-styles",i.textContent=Zn,document.head.appendChild(i),H();let r=()=>{Jt(e,Gt(e.config,I)),Qt(),ys(e),ls(e),ss(),nt=is()},o=0,s=()=>{if(o=requestAnimationFrame(s),!nt&&!E?.isOpen||P.synced.length===0)return;let p=e.getVideoElement();if(!p||p.paused)return;ci(Jo(oe,p.currentTime,oi,performance.now()-ri,p.playbackRate),!0)};o=requestAnimationFrame(s);let a=()=>{setTimeout(()=>{Qt(),Zt()},50),setTimeout(()=>{Zt()},250)};document.addEventListener("click",a,!0);let l=window.setInterval(r,600);r(),cs(e);let c=e.events?e.events.listen("lyrics-changed",(p)=>{let g=Le(p.payload);if(!ns(g))return;ot(e,g)}):null,y=e.events?e.events.listen("config-updated",(p)=>{if(p.payload&&typeof p.payload==="object")Jt(e,Gt(p.payload,I))}):null;Ze=()=>{cancelAnimationFrame(o),clearInterval(l),document.removeEventListener("click",a,!0),c?.then((p)=>p()).catch(()=>{return}),y?.then((p)=>p()).catch(()=>{return}),n(),E?.close(),E=null,z=null,i.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((p)=>p.remove())}},async onTrackChange(e,t){let n=ts(e);if(q=e,n===O)return;O=n,P={...W,video_id:e.videoId??null},V=!0,tt=0,Xt=gi(),it=!1,N={...Me},ie="",re="",Ie=I.autoOpen?n:"",Qt(),z?.setLyrics(P,N),se(t),await pi(t,e,n,null)},onPlaybackChange(e){E?.setPlaying(e)},onTick(e,t){oe=e,ri=performance.now(),oi=t.getVideoElement()?.currentTime??Number.NaN,ci(e,!0);let n=q?.durationSecs??0;if(E?.setProgress(e,n),P.synced.length===0&&n>0){let i=e/n;if(z?.updatePlain(i,nt),E?.isOpen)E.view.updatePlain(i,!0)}if(e>=Zo)rs(t)},onDestroy(){if(Ze)Ze(),Ze=null}};function ns(e){if(!q)return!1;if(e.video_id&&q.videoId)return e.video_id===q.videoId;return!e.video_id||e.video_id===q.videoId}async function pi(e,t,n,i){try{let r=Le(await e.invoke("fetch_lyrics",{videoId:t.videoId||null,artist:t.artist,title:t.title,albumName:t.album||null,duration:t.durationSecs||null,ytmPlain:i,artistAliases:Un(b.getMoviePlayer()?.getPlayerResponse?.(),t.videoId)},{timeoutMs:15000}));if(!rt(n,O))return;V=!1,ot(e,r)}catch{if(!rt(n,O))return;V=!1,se(e)}}function ot(e,t){let n=t.provider!==null&&t.provider===P.provider&&t.synced.length===P.synced.length&&t.plain===P.plain&&t.video_id===P.video_id&&!V;if(V&&!t.provider&&t.offset_secs===P.offset_secs)return;if(P=t,V=!1,n){let i=document.querySelector(".ytmd-lyrics-offset-value");if(i)i.textContent=bi(t.offset_secs);z?.setOffset(t.offset_secs),E?.view.setOffset(t.offset_secs),Ae(oe,!1);return}N={...Me},ie="",re="",z?.setLyrics(P,N),se(e),Ae(oe,!1),yi(e)}function Jt(e,t){let n=Object.keys(t).some((i)=>t[i]!==I[i]);if(I=t,!n)return;z?.setEffects(I.effects),E?.view.setEffects(I.effects),z?.setTheme(I.theme),E?.view.setTheme(I.theme),se(e),yi(e)}function et(){if(z?.setExtras(N),E?.isOpen)E.view.setExtras(N)}async function yi(e){let t=Re()&&!V?Kt(P,O):"",n=()=>t!==""&&t===Kt(P,O),i=(a)=>!a||!P.video_id||a===P.video_id,r=(a)=>a.some((l)=>l!==null)?a:null,o=I.translate&&t!==""?`${t}|${I.lang}`:"";if(o!==ie){if(ie=o,N={...N,translation:null},et(),o)try{let a=Yt(await e.invoke("translate_lyrics",{lang:I.lang},{timeoutMs:20000}));if(ie===o&&n()&&i(a.video_id))N={...N,translation:r(a.lines)},et()}catch{if(ie===o)_(m().lyricsTranslateFailed)}}let s=I.romanize&&t!==""?t:"";if(s!==re){if(re=s,N={...N,romanization:null},et(),s)try{let a=Yt(await e.invoke("romanize_lyrics",{},{timeoutMs:20000}));if(re===s&&n()&&i(a.video_id))N={...N,romanization:r(a.lines)},et()}catch{if(re===s)_(m().lyricsRomanizeFailed)}}}function li(e,t){let n=!I[t];e.config[t==="translate"?"lyrics_translate_enabled":"lyrics_romanize_enabled"]=n,Jt(e,{...I,[t]:n}),e.invoke("set_lyrics_display",{[t]:n}).catch(()=>_(m().actionFailed))}function ci(e,t){if(e<tt&&tt-e<es)return;tt=e,Ae(e,t)}function is(){if(typeof document>"u"||document.hidden)return!1;let e=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');return!!e&&!!document.getElementById("ytmd-native-lyrics-wrapper")&&vi(e)}function rs(e){if(si===O||Q())return;si=O;let t=jn(document.querySelectorAll("ytmusic-player-queue-item"));if(!t||t.videoId===q?.videoId)return;e.invoke("prefetch_lyrics",{videoId:t.videoId,title:t.title,artist:t.artist,duration:t.durationSecs}).catch(()=>{return})}function Ae(e,t){if(P.synced.length===0)return;let n=E?.isOpen===!0;if(z?.update(e,t&&nt&&!n),n)E?.view.update(e,t)}function os(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");return Array.from(e).find((t)=>/tekst|lyrics|paroles|letras/.test(t.textContent?.toLowerCase()||""))??null}function ss(){if(!Ie||Ie!==O||V||!Re())return;let e=os();if(!e||!vi(e))return;if(Ie="",!(e.classList.contains("iron-selected")||e.getAttribute("aria-selected")==="true"))e.click()}function fi(){if(!E?.isOpen)return;E.setTrack(q),E.setStatus(V?m().lyricsLoading:Re()?null:m().lyricsNone);let e=`${Kt(P,O)}|${V}`;if(e!==Wt)Wt=e,E.view.setLyrics(V?{...W}:P,N);else E.view.setExtras(N)}function as(e){if(!E)return;E.show(),E.setPlaying(e.getVideoElement()?.paused===!1),E.setProgress(oe,q?.durationSecs??0),fi(),Ae(oe,!1),E.view.scrollToCurrent()}function gi(){return document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description')?.textContent?.trim()||""}function ls(e){if(it||V||!q||P.provider)return;let t=gi();if(!t||t===Xt)return;it=!0,pi(e,q,O,t)}async function cs(e){let t=ds(),n=[...us(t)];if(n.length===0)return;try{await e.invoke("import_lyrics_offsets",{entries:n}),t?.removeItem?.(hi)}catch(i){console.warn("[Oscilla Lyrics] Offset migration failed, will retry next start:",i)}}var hi="ytmd-lyrics-offsets";function ds(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function us(e){try{let t=e?.getItem(hi);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function bi(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function vi(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function ms(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function Qt(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(ms(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function ps(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function Zt(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=ps();e.style.setProperty("display",t?"flex":"none","important")}function ys(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=u("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),se(e),Ae(oe,!1)}Zt()}function pe(e,t,n,i){let r=A({label:e,iconPath:t,muted:!0});if(i!==void 0)r.setAttribute("aria-pressed",String(i));return r.addEventListener("click",n),r}function fs(){if(!P.provider)return u("span",{className:"ytmd-lyrics-source"});let e=m().lyricsSource(Bt(P.provider,m().lyricsLocalFiles));if(P.source_url){let t=u("a",{className:"ytmd-lyrics-source",text:e});return t.href=P.source_url,t.target="_blank",t.rel="noopener noreferrer",t}return u("span",{className:"ytmd-lyrics-source",text:e})}function di(e){let t=u("div",{className:"ytmd-lyrics-bar"}),n=()=>u("span",{className:"ytmd-lyrics-bar-sep"});if(t.append(fs()),Re())t.append(pe(m().lyricsTranslateTip,S.translate,()=>li(e,"translate"),I.translate),pe(m().lyricsRomanizeTip,S.romanize,()=>li(e,"romanize"),I.romanize),n());if(P.synced.length>0){let i=(o)=>{let s=o===null?0:Math.round((P.offset_secs+o)*10)/10;e.invoke("set_lyrics_offset",{offsetSecs:s}).catch((a)=>console.warn("[Oscilla Lyrics] offset:",a))},r=u("button",{className:"ytmd-lyrics-offset-value",text:bi(P.offset_secs)});r.type="button",r.dataset.ytmdTooltip=m().lyricsResetTip,r.setAttribute("aria-label",m().lyricsResetTip),r.addEventListener("click",()=>i(null)),t.append(pe(m().lyricsLater,S.remove,()=>i(-0.5)),r,pe(m().lyricsEarlier,S.add,()=>i(0.5)),n())}return t.append(pe(m().lyricsWrong,S.swap,()=>void hs(e)),pe(m().lyricsSearchAgainTip,S.refresh,()=>void gs(e))),t}async function gs(e){let t=O;V=!0,se(e);try{let n=Le(await e.invoke("refresh_lyrics",{},{timeoutMs:15000}));if(!rt(t,O))return;V=!1,ot(e,n)}catch{if(!rt(t,O))return;V=!1,se(e),_(m().actionFailed)}}async function hs(e){let t=u("div",{className:"ytmd-lyrics-pick-list"});t.append(u("div",{className:"ytmd-native-lyrics-status",text:m().lyricsPickLoading}));let n=Dn({id:"ytmd-lyrics-picker",title:m().lyricsPickTitle,body:[t],actions:[{label:m().close}]}),i=[];try{i=await e.invoke("list_lyrics_candidates",{},{timeoutMs:15000})||[]}catch{i=[]}if(!t.isConnected)return;if(i.length===0){t.replaceChildren(u("div",{className:"ytmd-native-lyrics-status",text:m().lyricsPickNone}));return}t.replaceChildren(...i.map((r)=>{let o=u("button",{className:"ytmd-menu-item"});o.type="button";let s=u("span",{className:"ytmd-menu-item-text"}),a=r.synced?m().lyricsTimed:m().lyricsTextOnly;if(s.append(u("span",{text:`${Bt(r.provider,m().lyricsLocalFiles)} · ${a}`}),u("span",{className:"ytmd-menu-item-sub",text:`${r.title} — ${r.artist}`}),u("span",{className:"ytmd-menu-item-sub",text:r.preview})),o.append(s),r.selected)o.append(u("span",{className:"ytmd-menu-item-hint",text:m().lyricsCurrent}));return o.addEventListener("click",async()=>{n.close();try{ot(e,Le(await e.invoke("pick_lyrics",{provider:r.provider,id:r.id})))}catch{_(m().lyricsPickFailed)}}),o}))}function se(e){fi();let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(V)t.replaceChildren(u("div",{className:"ytmd-native-lyrics-status",text:m().lyricsLoading}));else if(Re()&&z)t.replaceChildren(z.root,di(e));else{let n=[u("div",{className:"ytmd-native-lyrics-status",text:m().lyricsNone})];if(q)n.push(di(e));t.replaceChildren(...n)}}var wi={id:"app.ytmd.wheel-volume",name:"Wheel Volume Controller",version:"1.0.0",apiVersion:1,description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:config"],entry:"index.js"};var Ne=null;function ye(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}function vs(e,t){let n=Math.max(e.left,t.left),i=Math.max(e.top,t.top);if(n>=Math.min(e.right,t.right)||i>=Math.min(e.bottom,t.bottom))return t;return{left:n,top:i}}function ki(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var xi={id:"volume",manifest:wi,name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){Ne?.(),H(),document.getElementById("ytmd-volume-indicator")?.remove();let t=u("div",{id:"ytmd-volume-indicator"});document.body.appendChild(t);let n=null,i=null,r=null,o=null,s=null,a=null,l=()=>{if(a!==null)window.cancelAnimationFrame(a);a=null},c=()=>{if(s!==null)window.clearTimeout(s);s=null,l(),t.classList.remove("ytmd-visible")},y=()=>{let w=document.querySelector("ytmusic-player-page #main-panel");if(!ki()&&!ye(w))return!1;let T=ye(document.querySelector("ytmusic-player-page #song-image")),R=ye(document.querySelector("ytmusic-player-page video"))||ye(document.querySelector("ytmusic-player-page #movie_player")),Y=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?R||T:T||R)||ye(w);if(!Y)return!1;let G=ye(document.querySelector("ytmusic-player-page #player")),te=G?vs(Y,G):Y,B=`${Math.max(8,te.left+12)}px`,xe=`${Math.max(8,te.top+12)}px`;if(t.style.left!==B)t.style.left=B;if(t.style.top!==xe)t.style.top=xe;return!0},p=()=>{if(a=null,!t.classList.contains("ytmd-visible"))return;if(!y()){c();return}a=window.requestAnimationFrame(p)},g=()=>{if(s!==null)window.clearTimeout(s);if(t.classList.add("ytmd-visible"),a===null)a=window.requestAnimationFrame(p);s=window.setTimeout(c,1800)},f=()=>{let w=e.getVideoElement();if(!w){o=null,c();return}Nt(w);let T=Pe(w)?0:Ee(w),R=o!==null&&T!==o&&!_n();if(o=T,t.textContent!==`${T}%`)t.textContent=`${T}%`,t.setAttribute("aria-label",m().volumeLevel(T));if(!y()){c();return}if(R)g()},k=()=>{let w=e.getVideoElement();if(w===n)return;n?.removeEventListener("volumechange",f),n=w,n?.addEventListener("volumechange",f),f()},d=()=>{let w=document.querySelector("ytmusic-player-page");if(w===i)return;if(r?.disconnect(),i=w,w)r=new MutationObserver(()=>window.requestAnimationFrame(f)),r.observe(w,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},h=(w)=>{let T=w.target;if(T instanceof Element&&T.closest("ytmusic-player-bar"))window.requestAnimationFrame(f)},x=(w)=>{if(w.deltaY===0||w.ctrlKey)return;let T=w.target,R=T instanceof Element?T.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'):null;if(R&&R.tagName!=="YTMUSIC-PLAYER")return;let j=(hn)=>{if(!hn)return!1;let $e=hn.getBoundingClientRect();return w.clientX>=$e.left&&w.clientX<$e.right&&w.clientY>=$e.top&&w.clientY<$e.bottom},Y=j(document.querySelector("ytmusic-player-bar"))||j(document.querySelector("#player-bar-background")),G=e.config.wheel_volume_on_player_page===!0&&(ki()||j(document.querySelector("ytmusic-player-page #main-panel")));if(!Y&&!G)return;let te=e.getVideoElement();if(!te)return;let B=e.config.wheel_volume_step,xe=typeof B==="number"&&Number.isFinite(B)&&B>0?Math.min(B,1):0.05;w.preventDefault(),w.stopPropagation(),Ye(Ee(te)+(w.deltaY<0?xe:-xe)*100,te),f()};window.addEventListener("wheel",x,{passive:!1,capture:!0}),window.addEventListener("resize",f),document.addEventListener("scroll",f,!0),document.addEventListener("input",h,!0),document.addEventListener("change",h,!0),d(),k();let v=window.setInterval(()=>{d(),k(),f()},500);Ne=()=>{window.removeEventListener("wheel",x,{capture:!0}),window.removeEventListener("resize",f),document.removeEventListener("scroll",f,!0),document.removeEventListener("input",h,!0),document.removeEventListener("change",h,!0),window.clearInterval(v),r?.disconnect(),n?.removeEventListener("volumechange",f),c(),t.remove()}},onDestroy(){if(Ne)Ne(),Ne=null}};var Ti={id:"app.ytmd.notifications",name:"Track Change Notifications",version:"1.0.0",apiVersion:1,description:"Displays native desktop notifications when songs change",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","internal:config","internal:notify"],entry:"index.js"};var Ei={id:"notifications",manifest:Ti,name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[Oscilla] Notification dispatch failed:",n)}}};var Pi={id:"app.ytmd.scrollbars",name:"Sleek Scrollbars",version:"1.0.0",apiVersion:1,description:"Applies subtle, low-contrast scrollbar colors",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","ui"],entry:"index.js"};var st=null,Si={id:"visualizer",manifest:Pi,name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);st=()=>{t?.remove()}},onDestroy(){if(st)st(),st=null}};var _i={id:"app.ytmd.audio-dsp",name:"Audio DSP & 10-Band Equalizer",version:"1.0.0",apiVersion:1,description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","internal:config"],entry:"index.js"};var at=[32,64,125,250,500,1000,2000,4000,8000,16000],en={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function Ve(e){return Math.max(-24,Math.min(24,e))}function Ts(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function Es(e){return Math.max(0.5,Math.min(2,e))}class D{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=at.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!D.instance)D.instance=new D;return D.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[Oscilla DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=at.map((i,r)=>{if(!this.audioCtx)throw Error("AudioContext missing");let o=this.audioCtx.createBiquadFilter();if(r===0)o.type="lowshelf";else if(r===at.length-1)o.type="highshelf";else o.type="peaking",o.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return o.frequency.setValueAtTime(i,this.audioCtx.currentTime),o.gain.setValueAtTime(0,this.audioCtx.currentTime),o}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[Oscilla DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[Oscilla DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[Oscilla DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=Ve(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=Ve(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=Ve(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,Ve(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=en[e]||en.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),Ts(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=Es(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??b.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class tn{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){let t=e.videoId||`${e.title}-${e.artist}`;if(t===this.currentTrackId)return;if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=t,this.crossfadeSeconds>0&&e.currentTimeSecs<this.crossfadeSeconds)D.getInstance().fadeIn(this.crossfadeSeconds);else D.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),D.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[Oscilla Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),D.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[Oscilla Crossfade] Advancing to next track..."),b.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class nn{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=D.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[Oscilla Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[Oscilla Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,b.next()}else this.consecutiveSilentTicks=0}}var ae=null,fe=null,lt=null;function Ps(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var Li={id:"audio_dsp",manifest:_i,name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=D.getInstance(),n=new tn,i=new nn;ae=n,fe=i;let r=e.config,o=null,s=()=>{if(o!==null)return;let l=e.getVideoElement();if(l){if(!t.isInitializedFor(l))t.init(l);return}o=window.setInterval(()=>{let c=e.getVideoElement();if(c){if(o!==null)clearInterval(o);o=null,t.init(c)}},500)};if(Ps(r))s();if(r.equalizer_gains&&Array.isArray(r.equalizer_gains))t.setAllGains(r.equalizer_gains);else if(r.equalizer_preset&&typeof r.equalizer_preset==="string")t.applyPreset(r.equalizer_preset);if(r.preamp_gain!==void 0)t.setPreamp(r.preamp_gain);if(r.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(r.loudness_normalization));if(r.crossfade_seconds!==void 0)n.setCrossfadeSeconds(r.crossfade_seconds);if(r.skip_silence_enabled!==void 0)i.setEnabled(Boolean(r.skip_silence_enabled));if(r.playback_speed!==void 0)t.setPlaybackRate(r.playback_speed);if(r.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(r.preserve_pitch));let a=[];if(e.events){let{listen:l}=e.events;a.push(l("set-eq-band",(c)=>{s(),t.setBandGain(c.payload.bandIndex,c.payload.gain)}),l("set-eq-all",(c)=>{s(),t.setAllGains(c.payload.gains)}),l("set-eq-preset",(c)=>{s(),t.applyPreset(c.payload)}),l("set-preamp",(c)=>{s(),t.setPreamp(c.payload)}),l("set-loudness-normalization",(c)=>{if(c.payload)s();t.setLoudnessNormalization(c.payload)}),l("set-crossfade-seconds",(c)=>{if(c.payload>0)s();n.setCrossfadeSeconds(c.payload)}),l("set-skip-silence",(c)=>{if(c.payload)s();i.setEnabled(c.payload)}),l("set-playback-rate",(c)=>{t.setPlaybackRate(c.payload)}),l("set-preserves-pitch",(c)=>{t.setPreservesPitch(c.payload)}))}lt=()=>{if(o!==null)clearInterval(o),o=null;a.forEach((l)=>l.then((c)=>c())),ae?.destroy(),ae=null,fe=null},console.log("[Oscilla] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(D.getInstance().applyRateAndPitch(),ae)ae.onTrackChange(e);if(fe)fe.onTrackChange()},onTick(e,t){if(Q())return;if(ae)ae.onTick(e,t.track);if(fe)fe.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(lt)lt(),lt=null}};var Mi={id:"app.ytmd.ambient-lighting",name:"Dynamic Ambient Lighting",version:"1.0.0",apiVersion:1,description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","ui","internal:config"],entry:"index.js"};var ct=null,dt=null,ut,Ci={id:"ambient_lighting",manifest:Mi,name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=u("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=u("img",{id:"ytmd-ambient-cover"});n.alt="";let i=u("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let r=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,o=e.config.ambient_lighting_enabled!==!1,s=document.createElement("style");s.id="ytmd-ambient-styles",s.textContent=`
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
    `,document.head.appendChild(s),ct=(l)=>{if(t)t.style.opacity=String(l)};let a=[];if(e.events)a.push(e.events.listen("set-ambient-intensity",(l)=>{ct?.(l.payload)}),e.events.listen("set-ambient-enabled",(l)=>{let c=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;ct?.(l.payload?c:0)}));if(dt=()=>{a.forEach((l)=>l.then((c)=>c())),ct=null,ut=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===ut)return;ut=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await Je(t):null;if(t!==ut)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await ti(t||""),r=document.documentElement.style;r.setProperty("--ytmd-accent",i.accent),r.setProperty("--ytmd-accent-primary",i.primary),r.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(dt)dt(),dt=null}};var Ii={id:"app.ytmd.themes",name:"Theme Engine & Live CSS",version:"1.0.0",apiVersion:1,description:"Switches YouTube Music\\",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","ui","internal:config"],entry:"index.js"};var Ai=`
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

`,Ri=`
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

`;var mt=null,Ni={id:"theme_engine",manifest:Ii,name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(a)=>{let l=document.getElementById(a);if(!l){l=document.createElement("style"),l.id=a;let c=t();if(c)c.appendChild(l)}return l},i=(a)=>{let l=n("ytmd-active-theme");l.textContent=a?Ai:Ri},r=(a)=>{let l=n("ytmd-custom-css");if(l)l.textContent=a};i(e.config.ambient_lighting_enabled!==!1);let o=e.config.custom_css||"";r(o);let s=[];if(e.events)s.push(e.events.listen("set-ambient-enabled",(a)=>{i(a.payload)}),e.events.listen("set-custom-css",(a)=>{r(a.payload)}));mt=()=>{s.forEach((a)=>a.then((l)=>l()))},console.log("[Oscilla] Theme engine active.")},onDestroy(){if(mt)mt(),mt=null}};var Vi={id:"app.ytmd.pip",name:"Floating Picture-in-Picture",version:"1.0.0",apiVersion:1,description:"Detachable floating always-on-top video window for watching music videos while browsing",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","internal:windows"],entry:"index.js"};var pt=null,zi={id:"pip",manifest:Vi,name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let r=A({id:"ytmd-pip-btn",label:m().pipButton,iconPath:S.pip});r.addEventListener("click",async()=>{let o=e.getVideoElement();if(!o)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await o.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(s){console.warn("[Oscilla PiP] Could not enter PiP:",s),await e.invoke("toggle_mini_player").catch((a)=>console.error("[Oscilla PiP] Mini player fallback failed:",a))}}),i.appendChild(r)}},n=window.setInterval(t,1000);t(),pt=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(pt)pt(),pt=null}};var Oi={id:"app.ytmd.local-files",name:"Local Music Library",version:"1.0.0",apiVersion:1,description:"Play local offline audio files alongside YouTube Music streaming",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:[],entry:"index.js"};var Di={id:"local_files",manifest:Oi,name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[Oscilla] Local files module ready.")}};var Hi={id:"app.ytmd.listen-together",name:"P2P Room Sync",version:"1.0.0",apiVersion:1,description:"Listen together with friends in real-time synchronized listening rooms",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:sync"],entry:"index.js"};var yt="ytmd-nav-slot",rn="ytmd-menu-btn",ze="ytmd-menu",qi="ytmd-sync-chip",Fi=[],ft=null,Bi=null,$i=!1,Is=`
  #${yt} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function As(){if(document.getElementById("ytmd-nav-slot-styles"))return;let e=document.createElement("style");e.id="ytmd-nav-slot-styles",e.textContent=Is,document.head.appendChild(e)}function Rs(e){if(!e)return;return`${m().syncInRoom} · ${m().syncListeners(e.listeners)}`}function Yi(e){Fi=e.items,Bi=e.onSyncChipClick}function Ui(){if(document.getElementById(yt)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;H(),As();let t=u("div",{id:yt}),n=A({id:rn,label:m().menuLabel,iconPath:S.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),Vs(n)}),t.appendChild(n),e.prepend(t),ji(),Os()}function on(e){ft=e,ji();let t=document.getElementById(ze);if(t?.classList.contains("ytmd-open"))Gi(t)}function ji(){let e=document.getElementById(yt);if(!e)return;let t=document.getElementById(qi);if(!ft){t?.remove();return}if(!t)t=u("button",{id:qi,className:"ytmd-chip"}),t.type="button",t.addEventListener("click",()=>Bi?.()),e.prepend(t);let n=m().syncListeners(ft.listeners);t.replaceChildren(u("span",{className:"ytmd-chip-dot"}),_e(S.group,18),u("span",{text:n})),t.dataset.ytmdTooltip=m().syncInRoom,t.setAttribute("aria-label",`${m().syncInRoom}, ${n}`)}function Gi(e){let t=[];for(let n of Fi){if(n.dividerBefore)t.push(u("div",{className:"ytmd-menu-divider"}));let i=u("button",{className:"ytmd-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let r=u("span",{className:"ytmd-menu-item-text"});r.appendChild(u("span",{text:n.label}));let o=n.id==="sync"?Rs(ft):void 0;if(o)r.appendChild(u("span",{className:"ytmd-menu-item-sub",text:o}));if(i.append(_e(n.iconPath),r),n.hint)i.appendChild(u("span",{className:"ytmd-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{ge(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function Ns(){let e=document.getElementById(ze);if(!e)e=u("div",{id:ze,className:"ytmd-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",zs),document.body.appendChild(e);return e}function Vs(e){let t=Ns();if(t.classList.contains("ytmd-open")){ge();return}Gi(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("ytmd-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".ytmd-menu-item")?.focus()}function ge(){let e=document.getElementById(ze);if(!e?.classList.contains("ytmd-open"))return;e.classList.remove("ytmd-open");let t=document.getElementById(rn);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function zs(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".ytmd-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),ge();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")ge()}function Os(){if($i)return;$i=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(ze);if(!t?.classList.contains("ytmd-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(rn)?.contains(n))return;ge()}),window.addEventListener("resize",ge)}function Qi(e){return e.is_host?"host":e.role??"dj"}function X(e){return e!=="listener"}function Wi(e){return Math.floor(e/2)+1}function Ds(e,t,n){let i=0;return t.forEach((r,o)=>{if(o!==n&&e>r)i++}),i}var gt=null;function Ki(e,t){if(!gt)return;let n=[...e.querySelectorAll(t)].find((i)=>i.dataset.itemId===gt);if(n)n.focus(),gt=null}function Xi({list:e,rowSelector:t,handleSelector:n,onMove:i}){let r=()=>[...e.querySelectorAll(t)],o=()=>r().forEach((f)=>f.classList.remove("is-dragging","drop-before","drop-after")),s=null,a=(f,k)=>{let d=r().filter((h,x)=>x!==k);if(d.forEach((h)=>h.classList.remove("drop-before","drop-after")),f<d.length)d[f].classList.add("drop-before");else d[d.length-1]?.classList.add("drop-after")},l=(f)=>{if(f.button!==0||!(f.target instanceof Element))return;let k=f.target.closest(n),d=k?.closest(t);if(!k||!d||!k.dataset.itemId)return;let h=r().indexOf(d);if(h<0)return;f.preventDefault();try{k.setPointerCapture(f.pointerId)}catch{}s={from:h,itemId:k.dataset.itemId,to:h,pointerId:f.pointerId,handle:k},d.classList.add("is-dragging")},c=(f)=>{if(!s||f.pointerId!==s.pointerId)return;let k=r().map((d)=>{let h=d.getBoundingClientRect();return h.top+h.height/2});s.to=Ds(f.clientY,k,s.from),a(s.to,s.from)},y=(f)=>{if(!s||f.pointerId!==s.pointerId)return;let{from:k,to:d,itemId:h,handle:x}=s;if(s=null,x.hasPointerCapture(f.pointerId))x.releasePointerCapture(f.pointerId);if(o(),d!==k)i(k,d,h)},p=(f)=>{if(f.key!=="ArrowUp"&&f.key!=="ArrowDown"||!(f.target instanceof Element))return;let k=f.target.closest(n),d=k?.closest(t);if(!k||!d||!k.dataset.itemId)return;f.preventDefault();let h=r(),x=h.indexOf(d),v=f.key==="ArrowUp"?x-1:x+1;if(x<0||v<0||v>=h.length)return;gt=k.dataset.itemId,i(x,v,k.dataset.itemId)},g=()=>{s=null,o()};return e.addEventListener("pointerdown",l),e.addEventListener("pointermove",c),e.addEventListener("pointerup",y),e.addEventListener("pointercancel",g),e.addEventListener("keydown",p),()=>{e.removeEventListener("pointerdown",l),e.removeEventListener("pointermove",c),e.removeEventListener("pointerup",y),e.removeEventListener("pointercancel",g),e.removeEventListener("keydown",p)}}var Ji="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var be="ytmd-sync-queue",sn="ytmd-sync-queue-styles",ht="data-ytmd-sync-queue",Oe="data-ytmd-sync-queue-tab",Hs="M8 5v14l11-7z",qs="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",$s=/^[A-Za-z0-9_-]{11}$/;function tr(e){if(typeof e!=="object"||e===null)return null;let t=e.serviceEndpoint?.queueAddEndpoint;if(typeof t!=="object"||t===null)return null;let{queueTarget:n,queueInsertPosition:i}=t;return{videoId:typeof n?.videoId==="string"&&$s.test(n.videoId)?n.videoId:null,next:i==="INSERT_AFTER_CURRENT_VIDEO"}}function Fs(e){return`
  html[${ht}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${ht}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(e)};
    font-size: 14px;
  }
  html[${Oe}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${be} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${Oe}] #${be} { display: block; }
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
`}function Bs(e){H();let t=document.getElementById(sn);if(!t)t=u("style",{id:sn}),document.head.appendChild(t);let n=Fs(e);if(t.textContent!==n)t.textContent=n}var nr=".ytmd-sq-handle",Ys=".ytmd-sq-queued";function Zi(e){let t=u("div",{className:"ytmd-sq-row"}),n=u("img",{className:"ytmd-sq-thumb"});n.alt="",n.loading="lazy",n.src=`https://i.ytimg.com/vi/${e.videoId}/default.jpg`;let i=u("div",{className:"ytmd-sq-text"});if(i.append(u("span",{className:"ytmd-sq-title",text:e.title}),u("span",{className:"ytmd-sq-sub",text:e.sub})),e.handle)t.appendChild(e.handle);if(t.append(n,i),e.actions.length){let r=u("div",{className:"ytmd-sq-actions"});r.append(...e.actions),t.appendChild(r)}return t}function er(e,t,n){let i=A({label:e,iconPath:t,muted:!0});return i.addEventListener("click",(r)=>{r.stopPropagation(),n()}),i}function ir(e,t,n){let i=m(),r=[];if(t.nowPlaying)r.push(u("div",{className:"ytmd-sq-heading",text:i.syncQueueNowPlaying})),r.push(Zi({...t.nowPlaying,sub:t.nowPlaying.artist,actions:[]}));if(r.push(u("div",{className:"ytmd-sq-heading",text:i.syncQueueTitle})),t.queue.length===0)r.push(u("p",{className:"ytmd-sq-hint",text:X(t.myRole)?i.syncQueueEmpty:i.syncQueueListenerHint}));let o=t.myRole==="host"||t.myRole==="moderator";for(let s of t.queue){let a=[];if(X(t.myRole))a.push(er(i.syncQueuePlayNow(s.title),Hs,()=>n.play(s.id)));if(o||s.added_by_id===t.myId)a.push(er(i.syncQueueRemove(s.title),qs,()=>n.remove(s.id)));let l;if(X(t.myRole)&&t.queue.length>1)l=A({label:i.syncQueueDrag(s.title),iconPath:Ji,muted:!0}),l.classList.add("ytmd-sq-handle"),l.dataset.itemId=s.id;let c=i.syncQueueFrom(s.added_by),y=Zi({videoId:s.video_id,title:s.title,sub:s.artist?`${s.artist} · ${c}`:c,actions:a,handle:l});y.classList.add("ytmd-sq-queued"),r.push(y)}e.replaceChildren(...r),Ki(e,nr)}var he=null;function bt(){let e=document.documentElement;if(!he){e.removeAttribute(Oe);return}let t=document.querySelector("ytmusic-player-page #side-panel"),n=document.getElementById(be);if(t&&n?.parentElement!==t){if(!n)n=u("div",{id:be}),Xi({list:n,rowSelector:Ys,handleSelector:nr,onMove:(r,o,s)=>he?.actions.move(s,o)});n.setAttribute("role","region"),n.setAttribute("aria-label",m().syncQueueTitle),ir(n,he.model,he.actions),t.insertBefore(n,t.querySelector(":scope > #tab-renderer"))}let i=document.querySelector("ytmusic-player-page tp-yt-paper-tab");e.toggleAttribute(Oe,!!n?.isConnected&&i?.getAttribute("aria-selected")==="true")}function rr(e,t){he={model:e,actions:t},Bs(m().syncQueueTab),document.documentElement.setAttribute(ht,"");let n=document.getElementById(be);if(n)ir(n,e,t);bt()}function an(){he=null,document.documentElement.removeAttribute(ht),document.documentElement.removeAttribute(Oe),document.getElementById(be)?.remove(),document.getElementById(sn)?.remove()}function we(e){if(e.is_host)return"host";let t=e.members.find((n)=>n.id===e.current_user_id);return t?Qi(t):"dj"}function Us(e,t,n){let i=new Set(e.map((o)=>o.id)),r=new Set(t.map((o)=>o.id));return{joined:t.filter((o)=>o.id!==n&&!i.has(o.id)).map((o)=>o.nickname),left:e.filter((o)=>o.id!==n&&!r.has(o.id)).map((o)=>o.nickname)}}var le=/^[A-Za-z0-9_-]{11}$/,js=2,Gs=0.25,Qs=0.05,Ws=3,or=0.1,Ks=0.5,Xs=1,Js=1000,Zs=1,sr=5000,ea=4000,ar=15000,ta=3,na=4000,lr=8000,ia=3,ln=1e4,ra=3,cr=15000,dr=1,oa=1e4,sa=5,aa=1e4,la=1.2;function dn(e,t){return Number.isFinite(t)&&t>dr?Math.min(e,t-dr):e}function ca(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(le.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>Ks)i.seekTo=dn(e.current_time_secs,t.duration);return i}let r=e.current_time_secs+Math.min(Xs,Math.max(0,n)),o=r-t.currentTime;if(Math.abs(o)>js)i.seekTo=dn(r,t.duration);else if(Math.abs(o)>(t.correcting?Qs:Gs))i.playbackRate=1+Math.max(-or,Math.min(or,o/Ws));return i}class ur{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function da(e,t){return t!==null&&e<t&&t-e<aa}function mr(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var ua=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function pr(){return new URLSearchParams(window.location.search).get("v")}function J(e){let t=b.getMoviePlayer(),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&le.test(n)&&typeof i==="number"&&Number.isFinite(i)){let r=t?.getDuration?.();return{videoId:n,currentTime:i,duration:typeof r==="number"&&r>0?r:e?e.duration:NaN}}return{videoId:pr(),currentTime:e?e.currentTime:0,duration:e?e.duration:NaN}}function vt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function ve(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class yr{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor(e=_){this.notify=e}lastBroadcast=null;pendingNav=null;transit=new ur;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;userInputAtMs=Number.NEGATIVE_INFINITY;avToggleAtMs=Number.NEGATIVE_INFINITY;pendingSeek=null;recentSeeks=[];seekLoopWarnedAtMs=Number.NEGATIVE_INFINITY;waitingLogged=!1;stall=null;finished=null;rateCorrection=null;setRoomState(e,t,n=!0){let i=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,this.canControl=n,kn(this.isGuest()),!i)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.recentSeeks=[],this.seekLoopWarnedAtMs=Number.NEGATIVE_INFINITY,this.waitingLogged=!1,this.stall=null,this.avToggleAtMs=Number.NEGATIVE_INFINITY,this.pendingSeek=null,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||vt())return;if(da(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(le.test(e.video_id))this.hostVideoId=e.video_id;let r=this.requestedVideo;if(r){if(e.video_id!==r.videoId&&n-r.atMs<ea)return;this.requestedVideo=null}let o=J(t);if(this.waitingForHostsNext(e,o.videoId,t,n)){if(!this.waitingLogged)this.waitingLogged=!0,L("info","sync",`guest: finished ${e.video_id} before the host, waiting for its next song`);this.endRateCorrection(),b.pause();return}this.waitingLogged=!1;let s={videoId:o.videoId,paused:t?t.paused:!0,currentTime:o.currentTime,duration:o.duration,correcting:this.rateCorrection!==null},a=ca(e,s,i);if(a.navigateTo){this.endRateCorrection();let l=this.pendingNav;if(l&&l.videoId===a.navigateTo&&n-l.atMs<sr)return;let c=l&&l.videoId===a.navigateTo?l.attempts+1:1;if(this.pendingNav={videoId:a.navigateTo,atMs:n,attempts:c},this.rememberOwnNav(a.navigateTo,n),L(c>1?"warn":"info","sync",`guest: host plays ${a.navigateTo} at ${e.current_time_secs.toFixed(1)} s, we have ${o.videoId??"nothing"}: `+(c>1?`switch didn't take, full reload (attempt ${c}); ${ue()}`:"switching")),b.pause(),c>1)window.location.href=`https://music.youtube.com/watch?v=${a.navigateTo}`;else ve(a.navigateTo);return}if(this.pendingNav=null,!t)return;if(a.setPlaying===!0)b.play();else if(a.setPlaying===!1)b.pause();if(a.seekTo!==null)this.endRateCorrection(),this.logSeek(s.currentTime,a.seekTo,e,n),b.seekTo(a.seekTo);else this.setCatchUpRate(t,a.playbackRate)}waitingForHostsNext(e,t,n,i){let r=this.finished;return!!r&&e.video_id===r.videoId&&i-r.atMs<oa&&r.duration-e.current_time_secs<sa&&(t!==r.videoId||!!n?.ended)}logSeek(e,t,n,i){if(this.recentSeeks=this.recentSeeks.filter((r)=>i-r<ln),this.recentSeeks.push(i),L("info","sync",`guest: seek ${e.toFixed(1)} -> ${t.toFixed(1)} s (host ${n.current_time_secs.toFixed(1)} s, ${n.is_playing?"playing":"paused"})`),this.recentSeeks.length>=ia&&i-this.seekLoopWarnedAtMs>ln)this.seekLoopWarnedAtMs=i,L("warn","sync",`guest: ${this.recentSeeks.length} seeks in ${ln/1000} s; ${ue()}`)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>ar)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),L("info","sync",`guest: catching up at ${t.toFixed(3)}x`),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;let{videoId:n,currentTime:i,duration:r}=J(e);if(Number.isFinite(r)&&r>0&&r-i<ta){if(this.nearEndAtMs=t,n)this.finished={videoId:n,duration:r,atMs:t}}}checkPlayer(e){if(!this.inRoom||!e||e.paused||vt())return this.stall=null,!1;let{videoId:t,currentTime:n}=J(e),i=this.stall;if(!i||i.songId!==t||Math.abs(n-i.songTime)>0.05)return this.stall={songId:t,songTime:n,videoTime:e.currentTime,warned:i?.songId===t&&i.warned},!1;if(i.warned||e.currentTime-i.videoTime<ra)return!1;return i.warned=!0,L("warn","player",`YouTube Music's player time is stuck while the video plays on; ${ue()}`),!0}noteUserInput(e=Date.now()){this.userInputAtMs=e}noteAvToggle(e=Date.now()){this.avToggleAtMs=e}applyPendingSeek(e,t=Date.now()){let n=this.pendingSeek;if(!n||!e)return;if(!this.isHost||t-n.atMs>cr){this.pendingSeek=null;return}let{videoId:i,duration:r}=J(e);if(i!==n.videoId||!Number.isFinite(r)||r<=0)return;this.pendingSeek=null;let o=dn(n.position+(n.playing?(t-n.atMs)/1000:0),r);L("info","sync",`host: ${i} is the other version of the song, carrying on at ${o.toFixed(1)} s`),b.seekTo(o)}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!this.canControl||!e||!le.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<ar)return null;let i=(r)=>(L("info","sync",`guest: now on ${e}, host on ${this.hostVideoId}: ${r}, not sent; ${ue()}`),null);if(t-this.nearEndAtMs<na)return i("autoplay after the song ended");if(t-this.userInputAtMs>lr)return i("YouTube Music switched by itself");if(this.requestedVideo?.videoId===e)return null;if(this.requestedVideo={videoId:e,atMs:t},t-this.avToggleAtMs<lr)return L("info","sync",`guest: switched ${this.hostVideoId} to its other version ${e}, asking the host to keep its place`),{kind:"play_video",video_id:e,keep_position:!0};return L("info","sync",`guest: picked ${e} (host on ${this.hostVideoId}), asking the host to play it`),{kind:"play_video",video_id:e}}requestControl(e,t){if(!this.canControl){if(e.kind!=="next"){this.notify(m().syncListenerOnly);return}t("vote_sync_skip").then(()=>this.notify(m().syncVotedSkip)).catch((n)=>{L("warn","sync",`vote to skip failed: ${String(n)}`),this.notify(m().actionFailed)});return}t("send_sync_control",{action:e}).catch((n)=>{L("warn","sync",`request ${e.kind} to the host failed: ${String(n)}`),this.notify(m().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n,source:i}=e,r=i?.kind==="vote"?m().syncVoteSkipped:i?.kind==="queue"?m().syncFromQueue(i.title,t):null;switch(n.kind){case"next":b.next(),this.notify(r??m().syncGuestNext(t));break;case"previous":b.previous(),this.notify(r??m().syncGuestPrevious(t));break;case"set_playing":{let o=b.getVideo();if(!o||o.paused!==n.playing)return;if(n.playing)b.play();else b.pause();this.notify(r??(n.playing?m().syncGuestResumed(t):m().syncGuestPaused(t)));break}case"play_video":{if(!le.test(n.video_id)||n.video_id===pr())return;if(n.keep_position){let o=b.getVideo();this.pendingSeek={videoId:n.video_id,position:J(o).currentTime,playing:!!o&&!o.paused,atMs:Date.now()},ve(n.video_id);break}ve(n.video_id),this.notify(r??m().syncGuestPicked(t));break}}}advanceQueue(e,t,n){if(!t||vt())return;let{currentTime:i,duration:r}=J(t),o=r-i;if(!Number.isFinite(o)||o>la&&!t.ended)return;this.playNextFromQueue(e,n,t,!1)}playNextFromQueue(e,t,n=b.getVideo(),i=!0,r=Date.now()){if(!this.inRoom||!this.isHost||e===0)return!1;let{videoId:o}=J(n),s=this.queueAdvance;if(s&&s.from===o&&r-s.atMs<sr)return!0;this.queueAdvance={from:o,atMs:r};let a=()=>{if(i)b.nextInYtm()};return t("sync_queue_take_next").then((l)=>{let c=l;if(!c||!le.test(c.video_id)){a();return}b.pause(),ve(c.video_id),this.notify(m().syncFromQueue(c.title,c.added_by))}).catch((l)=>{L("warn","sync",`host: playing from the shared queue failed: ${String(l)}`),a()}),!0}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||vt())return;if(this.pendingSeek&&Date.now()-this.pendingSeek.atMs<cr)return;if(t.ended)return;let{videoId:r,currentTime:o}=J(t);if(!r)return;let s=Date.now(),a=this.lastBroadcast,l=a?a.position+(s-a.atMs)/1000*a.rate:0,c=!!a&&a.playing&&!t.paused&&Math.abs(o-l)>Zs,y=!!a&&a.videoId!==r;if(!i&&!c&&!y&&a&&s-a.atMs<Js)return;this.lastBroadcast={atMs:s,videoId:r,position:o,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:r,title:e.title,artist:e.artist,current_time_secs:o,is_playing:!t.paused,timestamp_ms:s}}).catch((p)=>L("warn","sync",`host: broadcast failed: ${String(p)}`))}}var F=null,ce=null,wt=null,U=null,un=null,ma=1000;function fr(){let e=U,t=ce;if(!e||!t){an();return}let n=un,i=(r)=>(o)=>{t(r,{itemId:o}).catch((s)=>{L("warn","sync",`${r} failed: ${String(s)}`),_(m().actionFailed)})};rr({queue:e.queue??[],nowPlaying:n?.videoId&&le.test(n.videoId)?{videoId:n.videoId,title:n.title,artist:n.artist}:null,myId:e.current_user_id,myRole:we(e)},{play:i("sync_queue_play"),remove:i("sync_queue_remove"),move:(r,o)=>{t("sync_queue_move",{itemId:r,toIndex:o}).catch((s)=>{L("warn","sync",`sync_queue_move failed: ${String(s)}`),_(m().actionFailed)})}})}function pa(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function ya(e,t){if(!U||!X(we(U))){_(m().syncQueueListenerNo);return}if(!e.videoId){_(m().syncQueueSongsOnly);return}t("sync_queue_add",{input:e.videoId,next:e.next}).then(()=>_(e.next?m().syncQueuedNext:m().syncQueued)).catch((n)=>{L("warn","sync",`adding to the shared queue failed: ${String(n)}`),_(m().actionFailed)})}function gr(e){let t=F;if(!t||!ce||!t.isGuest())return!1;let n=b.getVideo(),i=mr(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,ce),!0}function hr(e){let t=F;if(!t||!ce||!t.isGuest())return!1;return t.requestControl({kind:"play_video",video_id:e},ce),!0}function cn(e,t,n="left"){let i=U;if(U=e,on(e?{listeners:e.members.length,isHost:e.is_host}:null),fr(),!t)return;if(!e){if(!i)return;_(n==="kicked"?m().syncKicked:n==="lost"?m().syncLost:m().syncRoomClosed);return}if(!i||i.room_id!==e.room_id){if(!e.is_host)_(m().syncConnected);return}if(e.reconnecting){if(!i.reconnecting)_(m().syncReconnecting);return}let r=(p)=>p.members.find((g)=>g.is_host)?.id;if(r(i)!==r(e)){let p=e.members.find((g)=>g.is_host);if(e.is_host)_(m().syncYouHost);else if(p)_(m().syncNewHost(p.nickname));return}if(i.reconnecting)return;let{joined:o,left:s}=Us(i.members,e.members,e.current_user_id),a=[...o.map(m().syncJoined),...s.map(m().syncLeft)],l=e.skip_votes??[],c=l.filter((p)=>p!==e.current_user_id&&!(i.skip_votes??[]).includes(p));for(let p of c){let g=e.members.find((f)=>f.id===p)?.nickname;if(g)a.push(m().syncVoteProgress(g,l.length,Wi(e.members.length)))}let y=we(e);if(y!==we(i))a.push(y==="moderator"?m().syncRoleModerator:y==="listener"?m().syncRoleListener:m().syncRoleDj);if(a.length>0)_(a.join(" · "))}var br={id:"sync_room",manifest:Hi,name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new yr;F=t,ce=e.invoke;let n=[];if(e.events)n.push(e.events.listen("sync-room-updated",(s)=>{t.setRoomState(!0,s.payload.is_host,X(we(s.payload))),cn(s.payload,!0)}),e.events.listen("sync-room-left",(s)=>{t.setRoomState(!1,!1),cn(null,!0,s.payload?.reason??"left")}),e.events.listen("sync-playback-remote",(s)=>{t.handleRemotePlayback(s.payload,e.getVideoElement())}),e.events.listen("sync-control-remote",(s)=>{t.applyRemoteControl(s.payload)}),e.events.listen("sync-reaction",(s)=>{On(s.payload.emoji,s.payload.from)}));let i=(s)=>{if(!(s.target instanceof Element))return;let a=s.target;if(a.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(bt,0);if(t.isInRoom()){let p=a.closest("ytmusic-menu-service-item-renderer"),g=p?tr(p.data):null;if(g){s.preventDefault(),s.stopImmediatePropagation(),pa(),ya(g,e.invoke);return}}if(!s.isTrusted)return;if(t.isRoomHost()&&a.closest("ytmusic-player-bar .next-button")&&t.playNextFromQueue(U?.queue?.length??0,e.invoke)){s.preventDefault(),s.stopImmediatePropagation();return}if(!t.isGuest())return;let l=ua.find(([p])=>a.closest(p));if(!l)return;let c=e.getVideoElement(),y=mr(l[1],c?c.paused:!0);if(!y)return;s.preventDefault(),s.stopImmediatePropagation(),t.requestControl(y,e.invoke)};window.addEventListener("click",i,!0);let r=(s)=>{if(!s.isTrusted)return;if(t.noteUserInput(),s.target instanceof Element&&s.target.closest("ytmusic-av-toggle"))t.noteAvToggle()};window.addEventListener("pointerdown",r,!0),window.addEventListener("keydown",r,!0);let o=setInterval(bt,ma);Vt(()=>t.playNextFromQueue(U?.queue?.length??0,e.invoke)),e.invoke("get_sync_room_state").then((s)=>{if(F!==t||!s||typeof s!=="object")return;let a=s;if(t.setRoomState(!0,a.is_host,X(we(a))),cn(a,!1),!a.is_host&&a.playback_state)t.handleRemotePlayback(a.playback_state,e.getVideoElement())}).catch((s)=>L("warn","sync",`restoring the room after a page load failed: ${String(s)}`)),wt=()=>{n.forEach((s)=>s.then((a)=>a())),window.removeEventListener("click",i,!0),window.removeEventListener("pointerdown",r,!0),window.removeEventListener("keydown",r,!0),clearInterval(o),Vt(null),t.setRoomState(!1,!1),F=null,ce=null,U=null,un=null,on(null),an()}},onTrackChange(e,t){let n=F;if(!n)return;if(un=e,fr(),n.isInRoom()){let r=b.getMoviePlayer()?.getPlayerResponse?.()?.playabilityStatus;if(r?.status&&r.status!=="OK")L("warn","player",`${e.videoId??"?"} won't play here; ${ue()}`)}n.applyPendingSeek(t.getVideoElement()),n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){F?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();F?.broadcastLocalState(t.track,n,t.invoke),F?.noteLocalTick(n),F?.checkPlayer(n),F?.applyPendingSeek(n),F?.advanceQueue(U?.queue?.length??0,n,t.invoke)},onDestroy(){if(wt)wt(),wt=null}};var vr={id:"app.ytmd.power",name:"Smart Power & Audio Watchdog",version:"1.0.0",apiVersion:1,description:"Keeps the system awake during playback",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","internal:config","internal:power"],entry:"index.js"};var kt=null,ga=(e,t)=>t&&e!==!1,wr={id:"power_watchdog",manifest:vr,name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,r=(g)=>{if(n===g)return;n=g,e.invoke("set_inhibit_sleep",{inhibit:g}).catch((f)=>{n=!g,console.error("[Oscilla Power] set_inhibit_sleep failed:",f)})},o=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},s=()=>{t?.release().catch(()=>{}),t=null},a=()=>{let g=e.getVideoElement(),f=!!g&&!g.paused&&!g.ended,k=ga(e.config.inhibit_sleep,f);if(r(k),k)o();else s()},l=(g)=>{for(let f of["play","playing","pause","ended"])g.addEventListener(f,a);i=g},c=(g)=>{for(let f of["play","playing","pause","ended"])g.removeEventListener(f,a)},y=e.getVideoElement();if(y)l(y);a();let p=window.setInterval(()=>{let g=e.getVideoElement();if(g&&g!==i){if(i)c(i);l(g),a()}},1000);kt=()=>{if(clearInterval(p),i)c(i);i=null,s(),r(!1)}},onDestroy(){if(kt)kt(),kt=null}};var kr={id:"app.ytmd.remote",name:"Mobile Web Remote",version:"1.0.0",apiVersion:1,description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",author:"Oscilla",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","internal:remote"],entry:"index.js"};var Tr=(e)=>typeof e==="object"&&e!==null&&!Array.isArray(e),M=(e,...t)=>t.reduce((n,i)=>n==null?void 0:n[i],e),Tt=/^[A-Za-z0-9_-]{11}$/;function ke(e){let t=M(e,"runs");if(Array.isArray(t))return t.map((i)=>typeof M(i,"text")==="string"?M(i,"text"):"").join("");let n=M(e,"simpleText");return typeof n==="string"?n:""}function mn(e){if(!Array.isArray(e)||e.length===0)return null;let t=M(e[e.length-1],"url");return typeof t==="string"?t:null}function xr(e,t){return ke(M(e,"flexColumns",t,"musicResponsiveListItemFlexColumnRenderer","text"))}function ba(e){let t=M(e,"playlistItemData","videoId")??M(e,"overlay","musicItemThumbnailOverlayRenderer","content","musicPlayButtonRenderer","playNavigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Tt.test(t))return null;return{video_id:t,title:xr(e,0),subtitle:xr(e,1),thumbnail:mn(M(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function va(e){let t=M(e,"title","runs",0,"navigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Tt.test(t))return null;return{video_id:t,title:ke(M(e,"title")),subtitle:ke(M(e,"subtitle")),thumbnail:mn(M(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function pn(e,t=20){let n=[],i=new Set,r=(o,s)=>{if(n.length>=t||s>40)return;if(Array.isArray(o)){for(let a of o)r(a,s+1);return}if(!Tr(o))return;for(let[a,l]of Object.entries(o)){let c=null;if(a==="musicResponsiveListItemRenderer")c=ba(l);else if(a==="musicCardShelfRenderer")c=va(l);if(c&&!i.has(c.video_id)){if(i.add(c.video_id),n.push(c),n.length>=t)return}r(l,s+1)}};return r(e,0),n}function xt(e){let t=M(e,"playlistPanelVideoRenderer")??M(e,"playlistPanelVideoWrapperRenderer","primaryRenderer","playlistPanelVideoRenderer");return Tr(t)?t:null}function Er(e){let t=[];return e.forEach((n,i)=>{let r=xt(n),o=M(r,"videoId");if(!r||typeof o!=="string")return;t.push({id:`${i}:${o}`,video_id:o,title:ke(M(r,"title")),artist:ke(M(r,"shortBylineText"))||ke(M(r,"longBylineText")),thumbnail:mn(M(r,"thumbnail","thumbnails")),current:M(r,"selected")===!0})}),t}function Pr(e,t){let n=t.indexOf(":");if(n<=0)return-1;let i=Number(t.slice(0,n)),r=t.slice(n+1),o=Number.isInteger(i)?xt(e[i]):null;if(o&&M(o,"videoId")===r)return i;return e.findIndex((s)=>M(xt(s),"videoId")===r)}function Sr(e,t){if(!t)return e.length;let n=e.findIndex((i)=>M(xt(i),"selected")===!0);return n>=0?n+1:e.length}function _r(e,t,n=15000){if(!e)return!0;let{position_secs:i,sampled_at_ms:r,...o}=e,{position_secs:s,sampled_at_ms:a,...l}=t;if(JSON.stringify(o)!==JSON.stringify(l))return!0;if(a-r>=n)return!0;let c=e.playing?i+(a-r)/1000:i;return Math.abs(s-c)>1.5}var wa="EgWKAQIIAWoMEA4QChADEAQQCRAF",ka=1000,xa=2000;function fn(){return document.querySelector("#queue")}function Mt(){let e=fn()?.queue?.store?.store?.getState().queue?.items;return Array.isArray(e)?e:[]}function Et(e,t){let n=fn();if(!n?.dispatch)throw Error("remote.error.noQueue");n.dispatch({type:e,payload:t})}function Mr(){let e=document.querySelector("ytmusic-app")?.networkManager;if(!e||typeof e.fetch!=="function")throw Error("remote.error.unsupported");return e}async function Ta(e){let t=Mr(),n=pn(await t.fetch("/search",{query:e,params:wa}));if(n.length===0)n=pn(await t.fetch("/search",{query:e}));return n}async function Ea(e,t){let n=fn()?.queue?.store?.store;if(!n)throw Error("remote.error.noQueue");let i=n.getState().queue??{},o=(await Mr().fetch("/music/get_queue",{queueContextParams:i.queueContextParams,queueInsertPosition:t?"INSERT_AFTER_CURRENT_VIDEO":"INSERT_AT_END",videoIds:[e]}))?.queueDatas,s=Array.isArray(o)?o.map((l)=>l&&typeof l==="object"&&("content"in l)?l.content:null).filter(Boolean):[];if(s.length===0)throw Error("remote.error.unsupported");let a=Mt();Et("ADD_ITEMS",{nextQueueItemId:n.getState().queue?.nextQueueItemId,index:Sr(a,t),items:s,shuffleEnabled:!1,shouldAssignIds:!0})}function yn(e){let t=Pr(Mt(),e);if(t<0)throw Error("remote.error.gone");return t}function Pa(){let e=getComputedStyle(document.documentElement),t=e.getPropertyValue("--ytmd-accent-primary").trim(),n=e.getPropertyValue("--ytmd-accent-secondary").trim(),i=e.getPropertyValue("--ytmd-accent").trim();return t&&n&&i?{primary:t,secondary:n,accent:i}:null}function Sa(){let e=b.getVideo(),n=document.getElementById("movie_player")?.getCurrentTime?.();return{playing:!!e&&!e.paused&&!e.ended,position_secs:typeof n==="number"&&Number.isFinite(n)?n:e?.currentTime??0,sampled_at_ms:Date.now(),volume:e?Ee(e)/100:1,muted:e?Pe(e):!1,like:b.getLikeStatus(),shuffle:b.isShuffleOn(),repeat:b.getRepeatMode(),accent:Pa()}}async function _a(e,t){switch(t.kind){case"command":if(t.command==="shuffle")b.toggleShuffle();else if(t.command==="repeat")b.cycleRepeat();else e.sendPlayerCommand(t.command);return null;case"seek":return b.seekTo(t.position_secs),null;case"volume":return b.setVolume(t.volume),null;case"play":if(!Tt.test(t.video_id))throw Error("remote.error.invalid");if(!hr(t.video_id))ve(t.video_id);return null;case"search":return Ta(t.query);case"enqueue":return await Ea(t.video_id,t.next),null;case"queue_jump":return Et("SET_INDEX",yn(t.item_id)),null;case"queue_remove":return Et("REMOVE_ITEM",yn(t.item_id)),null;case"queue_move":{let n=yn(t.item_id),i=Math.max(0,Math.min(t.to_index,Mt().length-1));return Et("MOVE_ITEM",{fromIndex:n,toIndex:i}),null}}}var Pt=[],St=[],_t=null,Lt="";function Cr(){St.forEach((e)=>clearInterval(e)),St=[],_t=null,Lt=""}function La(e){if(St.length>0)return;let t=()=>{let i=Sa();if(!_r(_t,i))return;_t=i,e.invoke("remote_publish",{kind:"state",data:i}).catch(()=>{return})},n=()=>{let i=Er(Mt()),r=JSON.stringify(i);if(r===Lt)return;Lt=r,e.invoke("remote_publish",{kind:"queue",data:i}).catch(()=>{return})};t(),n(),St.push(window.setInterval(t,ka),window.setInterval(n,xa))}function Lr(e,t){if(t>0)La(e);else Cr()}function Ir(e){let t=e.events;if(!t)return;t.listen("remote-action",({payload:n})=>{if(!n?.action)return;_a(e,n.action).then((i)=>{if(n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!0,data:i??null}).catch(()=>{return});_t=null,Lt=""},(i)=>{let r=i instanceof Error?i.message:String(i);if(console.warn("[Oscilla Remote] action failed:",n.action.kind,r),n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!1,error:r}).catch(()=>{return})})}).then((n)=>Pt.push(n)),t.listen("remote-clients",({payload:n})=>Lr(e,n)).then((n)=>Pt.push(n)),e.invoke("remote_clients").then((n)=>Lr(e,typeof n==="number"?n:0)).catch(()=>{return})}function Ar(){Pt.forEach((e)=>e()),Pt=[],Cr()}var Rr={id:"web_remote",manifest:kr,name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){Ir(e)},onDestroy(){Ar()}};var Z="ytmd-window-controls",De={minimize:"M5 11.5h14v1H5z",maximize:"M5 5h14v14H5V5zm1 1v12h12V6H6z",restore:"M8 5h11v11h-3v3H5V8h3V5zm1 1v2h7v7h2V6H9zM6 9v9h9V9H6z",close:"M6.7 6 12 11.3 17.3 6l.7.7-5.3 5.3 5.3 5.3-.7.7-5.3-5.3L6.7 18l-.7-.7 5.3-5.3L6 6.7z"},Ma=132,Ca=`
  html:has(#${Z}) ytmusic-nav-bar #right-content {
    right: 0 !important;
    padding-right: 0 !important;
    margin-right: ${Ma+8}px !important;
  }
  #${Z} {
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
  html:has(ytmusic-player-page[player-fullscreened]) #${Z},
  html:has(:fullscreen) #${Z} {
    display: none;
  }
  #${Z} .ytmd-window-close:hover {
    background: #c42b1c;
    color: #fff;
  }
`,Ia=["a","button","input","textarea","select",'[role="button"]','[role="tab"]',"tp-yt-paper-icon-button","yt-icon-button","ytmusic-search-box","ytmusic-settings-button","ytmusic-cast-button","ytmusic-chip-cloud-renderer",`#${Z}`,"#ytmd-nav-slot"].join(", ");async function gn(e){return(await C("window_action",{action:e}))?.maximized===!0}function He(e){gn(e).then((t)=>{if(e==="toggle_maximize")Or(t)}).catch((t)=>console.error("[Oscilla] Window action failed:",t))}function Aa(e){if(!(e instanceof Element))return!1;if(!e.closest("ytmusic-nav-bar, #nav-bar-background"))return!1;return e.closest(Ia)===null}function Ra(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var ee=null,Nr=!1,Vr=!1;function zr(){let e=Ra();if(e===Vr)return;Vr=e,gn(e?"enter_fullscreen":"exit_fullscreen").catch((t)=>L("warn","Window",`fullscreen ${e} failed: ${String(t)}`))}function Or(e){if(!ee)return;let t=e?m().windowRestore:m().windowMaximize;Qe(ee,e?De.restore:De.maximize),ee.setAttribute("aria-label",t),ee.dataset.ytmdTooltip=t}async function Dr(){if(!ee)return;Or(await gn("state").catch(()=>!1))}function Na(){if(Nr)return;Nr=!0,document.addEventListener("mousedown",(t)=>{if(t.button!==0||!Aa(t.target))return;if(t.preventDefault(),t.detail===2)He("toggle_maximize");else He("start_dragging")},!0);let e=null;window.addEventListener("resize",()=>{if(e)clearTimeout(e);e=setTimeout(()=>void Dr(),150)}),document.addEventListener("fullscreenchange",zr),new MutationObserver(zr).observe(document.documentElement,{subtree:!0,attributes:!0,attributeFilter:["player-fullscreened"]})}function Hr(){if(typeof window>"u"||!window.__TAURI__?.core)return;if(Na(),document.getElementById(Z)?.isConnected)return;if(!document.querySelector("ytmusic-nav-bar")||!document.body)return;if(H(),!document.getElementById("ytmd-window-controls-styles")){let i=document.createElement("style");i.id="ytmd-window-controls-styles",i.textContent=Ca,document.head.appendChild(i)}let e=u("div",{id:Z}),t=A({label:m().windowMinimize,iconPath:De.minimize});t.addEventListener("click",()=>He("minimize")),ee=A({label:m().windowMaximize,iconPath:De.maximize}),ee.addEventListener("click",()=>He("toggle_maximize"));let n=A({label:m().windowClose,iconPath:De.close});n.classList.add("ytmd-window-close"),n.addEventListener("click",()=>He("close")),e.append(t,ee,n),document.body.appendChild(e),Dr()}var qr=!1,$r="";function Va(){if(document.getElementById("ytmd-player-bar-edges")||!document.head)return;let e=document.createElement("style");e.id="ytmd-player-bar-edges",e.textContent=`
  ytmusic-player-bar {
    --ytmusic-player-bar-fullscreen-progress-bar-inset: 0px !important;
  }
`,document.head.appendChild(e)}function qe(){Va();let e=document.documentElement,t=`${Math.max(0,window.innerWidth-e.clientWidth)}px`;if(t===$r&&e.style.getPropertyValue("--ytmusic-scrollbar-width")===t)return;$r=t,e.style.setProperty("--ytmusic-scrollbar-width",t)}function Fr(){if(qr||typeof window>"u")return;qr=!0,qe(),window.addEventListener("resize",qe),new ResizeObserver(qe).observe(document.documentElement)}var de=(e)=>{C(e).catch((t)=>{console.error(`[Oscilla] ${e} failed:`,t),_(m().actionFailed)})};function za(){Yi({onSyncChipClick:()=>de("toggle_sync_window"),items:[{id:"settings",iconPath:S.tune,label:m().menuSettings,hint:"Ctrl+,",onSelect:()=>de("toggle_settings_window")},{id:"local",iconPath:S.folderMusic,label:m().menuLocal,onSelect:()=>de("toggle_local_library_window")},{id:"sync",iconPath:S.group,label:m().menuSync,onSelect:()=>de("toggle_sync_window")},{id:"remote",iconPath:S.phone,label:m().menuRemote,onSelect:()=>de("open_remote_pairing")},{id:"mini",iconPath:S.miniPlayer,label:m().menuMiniPlayer,onSelect:()=>de("toggle_mini_player")}]})}var Oa={lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!1]};function Br(e){let t={};for(let[n,[i,r]]of Object.entries(Oa)){let o=e[i];t[n]=typeof o==="boolean"?o:r}return t}var Da=4,Yr=2000;async function Ur(){console.log("[Oscilla] Initializing desktop integration bridge...");let e={};za();let t=()=>{Ui(),Hr(),qe()};Fr(),t();let n=setInterval(t,1000);window.addEventListener("pagehide",()=>clearInterval(n));let i=async(d)=>{try{let h=await C("get_config",{},{timeoutMs:d});return h&&typeof h==="object"?h:null}catch(h){return console.warn("[Oscilla] Loading config failed, retrying:",h),null}},r=!1;for(let d=0;d<Da&&!r;d++){if(d>0)await new Promise((x)=>setTimeout(x,250));let h=await i(2000);if(h)Object.assign(e,h),r=!0}let s=new Dt({track:null,config:e,invoke:C,sendPlayerCommand:(d)=>{g(d)},getVideoElement:()=>b.getVideo(),listen:(d,h)=>It.listen(d,h)},(d,h)=>{if(d instanceof We)d.report("hook",h)});s.register(mi),s.register(xi),s.register(Ei),s.register(Si),s.register(Li),s.register(Ci),s.register(Ni),s.register(zi),s.register(Di),s.register(br),s.register(wr),s.register(Rr);let a=(d)=>{let h=Ke(d);if(s.disable(d),h)Bn(h)};for(let d of $n({sendPlayerCommand:(h)=>g(h),onSwitchedOff:a}))s.register(d);try{await s.initAll(Br(e))}catch(d){console.error("[Oscilla] Registry init error:",d)}let l=new zt,c=0,y=Date.now();async function p(d,h,x){try{await C("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:Math.round(d.durationSecs||0),current_time_secs:Math.round(h),is_playing:x,video_id:d.videoId||null,playlist_id:d.playlistId||null,sampled_at_ms:Date.now()}})}catch(v){console.error("[Oscilla] Failed to sync track info to backend:",v)}}l.onTrackChange(async(d)=>{c=d.currentTimeSecs||0,y=Date.now(),s.handleTrackChange(d),await p(d,d.currentTimeSecs||0,d.isPlaying)}),l.onPlaybackChange(async(d)=>{s.handlePlaybackChange(d);let h=l.getCurrentTrack();if(h)h.isPlaying=d,c=h.currentTimeSecs||0,y=Date.now(),await p(h,h.currentTimeSecs||0,d)}),l.onTick((d)=>{s.handleTick(d);let h=l.getCurrentTrack();if(!h||!h.isPlaying)return;let x=Date.now(),v=(x-y)/1000,w=c+v;if(Math.abs(d-w)>2||v>=15)c=d,y=x,h.currentTimeSecs=Math.round(d),p(h,d,!0)});function g(d){if(gr(d))return;switch(d){case"play":b.play();break;case"pause":case"stop":b.pause();break;case"play_pause":b.playPause();break;case"next":b.next();break;case"previous":b.previous();break;case"like":b.toggleLike();break;case"dislike":b.toggleDislike();break;case"mute":b.toggleMute();break}}let f=(d,h)=>{It.listen(d,(x)=>h(x.payload))};f("plugin-state-changed",(d)=>{if(d&&!d.enabled)s.disable(d.id)}),f("plugin-settings-changed",(d)=>{if(d?.id&&d.values)Ke(d.id)?.setSettings(d.values)}),f("plugin-media-progress",(d)=>{if(d?.plugin)Ke(d.plugin)?.mediaProgress(d)}),f("plugin-media-tools",(d)=>{if(d?.state)Fn().forEach((h)=>h.mediaTools(d))}),f("player-command",(d)=>g(d)),f("tray-command",(d)=>g(d)),f("mpris-command",(d)=>g(d)),f("global-shortcut-event",(d)=>g(d)),f("player-seek",(d)=>b.seekTo(d)),f("mpris-command-seek",(d)=>b.seekTo(d)),f("player-volume",(d)=>b.setVolume(d));let k=(d)=>{Object.assign(e,d);let h=Br(e);for(let[x,v]of Object.entries(h))if(v)s.enable(x).catch((w)=>console.error(`[Oscilla] Failed to enable plugin ${x}:`,w));else s.disable(x).catch((w)=>console.error(`[Oscilla] Failed to disable plugin ${x}:`,w))};if(f("config-updated",(d)=>{if(d&&typeof d==="object")k(d)}),!r){console.error("[Oscilla] Config not loaded yet; plugins run on defaults until it is.");let d=setInterval(()=>{i(Yr).then((h)=>{if(!h||r)return;r=!0,clearInterval(d),k(h)})},Yr)}window.addEventListener("keydown",(d)=>{if(d.ctrlKey&&d.key===","||d.key==="F2")d.preventDefault(),de("toggle_settings_window")}),console.log("[Oscilla] Integration successfully activated.")}var Ha=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(Ha)if(qn(),Ln(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>Ur());else Ur();})();
