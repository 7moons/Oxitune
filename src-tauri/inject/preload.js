(()=>{var M=(e,t={},n={})=>{let i=window.__TAURI__?.core;if(!i?.invoke)return Promise.reject(Error("Tauri bridge unavailable"));return new Promise((o,r)=>{let s=setTimeout(()=>r(Error(`Timed out waiting for ${e}`)),n.timeoutMs??8000);i.invoke("oxitune_bridge",{cmd:e,args:t}).then((a)=>{clearTimeout(s),o(a??null)},(a)=>{clearTimeout(s),r(a instanceof Error?a:Error(String(a)))})})},Fe=new Map,Mt=!1;function Qo(){if(Mt)return;let e=window.__TAURI__?.core;if(!e?.Channel||!e.invoke)return;Mt=!0;let t=new e.Channel;t.onmessage=(n)=>{let i=Fe.get(n?.event);if(!i)return;for(let o of[...i])try{o({payload:n.payload})}catch(r){console.error(`[Oxitune] ${n.event} handler failed:`,r)}},e.invoke("oxitune_subscribe",{channel:t}).catch((n)=>{Mt=!1,console.error("[Oxitune] Event feed unavailable:",n)})}var It={listen(e,t){Qo();let n=t,i=Fe.get(e);if(!i)Fe.set(e,i=new Set);return i.add(n),Promise.resolve(()=>{Fe.get(e)?.delete(n)})}};function Be(){return document.getElementById("movie_player")}function vn(e){let t=document.querySelector(e);return t&&"value"in t?t:null}var Rt=()=>vn("ytmusic-player-bar #volume-slider");function At(e){return Math.max(0,Math.min(100,Math.round(e)))}function bn(e,t){if("step"in e&&Number(e.step)>1)e.step=1;e.value=t}function Ee(e){let t=Number(Rt()?.value);if(Number.isFinite(t))return At(t);let n=Be()?.getVolume?.(),i=typeof n==="number"&&Number.isFinite(n)?n:e.volume*100;return At(i)}function Pe(e){return Be()?.isMuted?.()===!0||e.muted}function Yo(e,t){bn(e,t),e.dispatchEvent(new CustomEvent("change",{bubbles:!0,composed:!0}));let n=vn("#expand-volume-slider");if(n)bn(n,t)}var Wo=0.002,Ko=0.01,Xo=6,Jo=2000,Te={target:-1,writes:0,since:0};function Nt(e){let t=Rt();if(!t)return;let n=Number(t.value),i=Be();if(!(n>0)||i?.getVolume?.()!==0||Pe(e))return;let o=Math.min(Ko,n*Wo);if(Math.abs(e.volume-o)<0.0001)return;let r=Date.now();if(o!==Te.target||r-Te.since>Jo)Te={target:o,writes:0,since:r};if(Te.writes>=Xo)return;Te.writes++,e.volume=o}function Ue(e,t){if(!Number.isFinite(e))return;let n=At(e),i=Rt();if(i){Yo(i,n),Nt(t);return}let o=Be();if(typeof o?.setVolume==="function"){if(o.setVolume(n),n>0&&o.isMuted?.())if(typeof o.unMute==="function")o.unMute();else t.muted=!1;return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1}var xn=!1;function wn(e){xn=e}function Y(){return xn}var kn=null;function Ot(e){kn=e}function Tn(){return kn?.()??!1}class b{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){if(Tn())return;this.nextInYtm()}static nextInYtm(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static getMoviePlayer(){return document.getElementById("movie_player")}static seekTo(e){if(isNaN(e))return;let t=this.getMoviePlayer();if(typeof t?.seekTo==="function"){let i=t.getDuration?.(),o=typeof i==="number"&&i>0?i:e;t.seekTo(Math.max(0,Math.min(e,o)),!0);return}let n=this.getVideo();if(n)n.currentTime=Math.max(0,Math.min(e,n.duration||e))}static setVolume(e){let t=this.getVideo();if(t)Ue(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static getLikeStatus(){let e=document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer")?.getAttribute("like-status");return e==="LIKE"?"like":e==="DISLIKE"?"dislike":"none"}static getRepeatMode(){let e=document.querySelector("ytmusic-player-bar")?.getAttribute("repeat-mode");return e==="ALL"?"all":e==="ONE"?"one":"none"}static isShuffleOn(){return document.querySelector("ytmusic-player-bar")?.hasAttribute("shuffle-on")??!1}static toggleShuffle(){document.querySelector("ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button")?.click()}static cycleRepeat(){document.querySelector("ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button")?.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}function L(e,t,n){if(e!=="info")console[e](`[Oxitune ${t}] ${n}`);M("page_log",{level:e,scope:t,message:n}).catch(()=>{return})}var je=(e)=>typeof e==="number"&&Number.isFinite(e)?e.toFixed(1):"?";function de(){let e=b.getMoviePlayer(),t=b.getVideo(),n=e?.getPlayerResponse?.()?.playabilityStatus;return[`song=${e?.getVideoData?.()?.video_id??"?"}`,`t=${je(e?.getCurrentTime?.())}/${je(e?.getDuration?.())}`,`video=${je(t?.currentTime)}/${je(t?.duration)}`,`state=${e?.getPlayerState?.()??"?"}`,`paused=${t?t.paused:"?"}`,`ready=${t?t.readyState:"?"}`,t?.error?`mediaError=${t.error.code}`:"",n?.status&&n.status!=="OK"?`playability=${n.status}${n.reason?` (${n.reason})`:""}`:""].filter(Boolean).join(" ")}function Ge(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}function Zo(e,t){if(!e?.videoId)return null;if(t&&e.videoId!==t||!e.title?.trim())return"switching";let n=Number(e.lengthSeconds);return{videoId:e.videoId,title:e.title.trim(),artist:e.author?.trim()??"",durationSecs:Number.isFinite(n)&&n>0?Math.floor(n):0,coverUrl:e.thumbnail?.thumbnails?.at(-1)?.url||`https://i.ytimg.com/vi/${e.videoId}/hqdefault.jpg`}}function En(e){let t=document.getElementById("movie_player")?.getCurrentTime?.();return typeof t==="number"&&Number.isFinite(t)&&t>=0?t:e.currentTime}var er=1500,Pn=8000;function tr(e,t){let n=new URLSearchParams(e);if(!t||n.get("v")!==t)return;return n.get("list")||void 0}function nr(e,t){return{title:t?.title?.trim()||"",artist:t?.author?.trim()||"",coverUrl:`https://i.ytimg.com/vi/${e}/hqdefault.jpg`}}var Qe=(e)=>e.trim().replace(/\s+/g," ").toLowerCase();function ir(e,t){return!!e?.trim()&&!!t?.trim()&&Qe(e)===Qe(t)}function or(e,t){if(!e?.trim()||!t?.trim())return!0;return Qe(e)===Qe(t)}function rr(e,t){if(!e)return"new";if(e.videoId&&t.videoId){if(e.videoId!==t.videoId)return"new"}else if(e.title!==t.title||e.artist!==t.artist)return"new";return e.title!==t.title||e.artist!==t.artist||!e.videoId&&!!t.videoId||!e.coverUrl&&!!t.coverUrl||!e.album&&!!t.album||t.durationSecs>0&&Math.abs(t.durationSecs-e.durationSecs)>1?"metadata":null}var sr=400;function ar(e,t){return e-t>=sr}class Vt{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(En(this.attachedVideo))};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&ar(Date.now(),this.lastTickMs))this.emitTick(En(n))},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",s=i?.album||"",a="";if(i?.artwork&&i.artwork.length>0){let v=i.artwork[i.artwork.length-1];if(v&&v.src)a=v.src}if(!o){let v=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(v)o=v.textContent?.trim()||""}if(!r){let v=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(v){let T=(v.textContent?.trim()||"").split("•").map((R)=>R.trim());if(r=T[0]||"",T.length>1)s=T[1]}}if(!a){let v=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(v&&v.src)a=v.src}if(a.startsWith("//"))a=`https:${a}`;if(a.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(a))a=a.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let l=t?.getVideoData?.(),u=l?.video_id||new URLSearchParams(window.location.search).get("v")||void 0,f=Zo(t?.getPlayerResponse?.()?.videoDetails,l?.video_id);if(f==="switching"){let v=Date.now(),x=l?.video_id??"";if(this.titleMismatch?.videoId!==x)this.titleMismatch={videoId:x,sinceMs:v};if(v-this.titleMismatch.sinceMs<Pn)return null;f=null}let p=!!l?.video_id&&!l.title?.trim();if(f){if(this.titleMismatch=null,u=f.videoId,!ir(f.title,i?.title))o=f.title,r=f.artist,s="",a=f.coverUrl}else if(u&&(p||!or(l?.title,i?.title))){let v=Date.now();if(this.titleMismatch?.videoId!==u)this.titleMismatch={videoId:u,sinceMs:v};let x=v-this.titleMismatch.sinceMs;if(x<er)return null;if(p){if(x<Pn)return null}else{let T=nr(u,l);if(!this.titleMismatch.logged)this.titleMismatch.logged=!0,L("info","player",`song ${u}: MediaSession still says "${i?.title??""}", using the player's "${T.title}"`);({title:o,artist:r}=T),s="",a=T.coverUrl}}else this.titleMismatch=null;let y=f?f.durationSecs:0,g=0,w=!1;if(!y&&t&&typeof t.getDuration==="function"){let v=t.getDuration();if(typeof v==="number"&&Number.isFinite(v)&&v>0)y=Math.floor(v)}if(t&&typeof t.getCurrentTime==="function"){let v=t.getCurrentTime();if(typeof v==="number"&&Number.isFinite(v)&&v>=0)g=Math.floor(v),w=!0}if(!y&&e&&Number.isFinite(e.duration)&&e.duration>0)y=Math.floor(e.duration);if(!w&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)g=Math.floor(e.currentTime);let c=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(c&&c.textContent){let v=c.textContent.split("/").map((x)=>x.trim());if(v.length===2){if(!g)g=Ge(v[0]);if(!y)y=Ge(v[1])}}if(!y){let x=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(x){let T=parseInt(x,10);if(!isNaN(T)&&T>0)y=T}}let h=e?!e.paused&&!e.ended:!1;if(!o)return null;let k=tr(window.location.search,u)??(this.currentTrack?.videoId===u?this.currentTrack?.playlistId:void 0);return{title:o,artist:r||"Unknown Artist",album:s||void 0,coverUrl:a||void 0,durationSecs:y,currentTimeSecs:g,isPlaying:h,videoId:u,playlistId:k}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=rr(this.currentTrack,e),n=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((i)=>i(e))}if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}var lr=15000,ur=100;function cr(e,t,n,i,o){if(i||o>lr)return"abandon";if(t&&t!==e.video_id)return"abandon";return t===e.video_id&&n?"apply":"wait"}var dr=500,zt=!1,Sn=-1/0;function _n(){return zt||performance.now()-Sn<dr}var mr=()=>document.getElementById("movie_player")?.getVideoData?.()?.video_id||void 0;function Ln(){let e=location.pathname==="/watch"?new URLSearchParams(location.search).get("v"):null;if(!e)return;let t=!1,n=new Set,i=(l)=>{let u=l.target;if(t||!(u instanceof HTMLVideoElement)||u.muted)return;zt=!0,u.muted=!0,n.add(u)};document.addEventListener("loadstart",i,!0),document.addEventListener("play",i,!0);let o=()=>{if(t)return;if(t=!0,document.removeEventListener("loadstart",i,!0),document.removeEventListener("play",i,!0),n.forEach((l)=>l.muted=!1),n.size>0)Sn=performance.now();n.clear(),zt=!1},r=(l,u)=>{let f=()=>{if(clearTimeout(p),u.removeEventListener("seeked",f),!l.autoplay)u.pause();o()},p=setTimeout(f,1000);if(u.addEventListener("seeked",f),b.seekTo(l.position_secs),l.autoplay)u.play().catch(()=>{return});else{u.pause();let y=()=>u.pause();u.addEventListener("play",y),setTimeout(()=>u.removeEventListener("play",y),1500)}},s=Date.now();(async()=>{for(let l=0;;l++)try{return await M("take_resume_session")}catch(u){if(l>=20||window.__TAURI__?.core?.invoke)throw u;await new Promise((f)=>setTimeout(f,100))}})().then((l)=>{let u=l;if(!u||u.video_id!==e)return o();let f=setInterval(()=>{let p=document.querySelector("video"),y=cr(u,mr(),!!p&&p.readyState>=1,Y(),Date.now()-s);if(y==="wait")return;if(clearInterval(f),y==="apply"&&p)r(u,p);else o()},ur)}).catch((l)=>{console.error("[Oxitune] Resume failed:",l),o()})}var Se=1,Cn={fetch_lyrics:"internal:lyrics",prefetch_lyrics:"internal:lyrics",refresh_lyrics:"internal:lyrics",get_current_lyrics:"internal:lyrics",set_lyrics_offset:"internal:lyrics",list_lyrics_candidates:"internal:lyrics",pick_lyrics:"internal:lyrics",import_lyrics_offsets:"internal:lyrics",translate_lyrics:"internal:lyrics",romanize_lyrics:"internal:lyrics",set_lyrics_display:"internal:lyrics",get_sync_room_state:"internal:sync",broadcast_sync_state:"internal:sync",send_sync_control:"internal:sync",vote_sync_skip:"internal:sync",send_sync_reaction:"internal:sync",sync_queue_add:"internal:sync",sync_queue_remove:"internal:sync",sync_queue_play:"internal:sync",sync_queue_move:"internal:sync",sync_queue_take_next:"internal:sync",remote_clients:"internal:remote",remote_publish:"internal:remote",remote_reply:"internal:remote",set_inhibit_sleep:"internal:power",toggle_mini_player:"internal:windows",toggle_settings_window:"internal:windows",toggle_local_library_window:"internal:windows",toggle_sync_window:"internal:windows",notify_track_change:"internal:notify"},Mn={"config-updated":"internal:config","set-ambient-enabled":"internal:config","set-ambient-intensity":"internal:config","set-custom-css":"internal:config","set-eq-band":"internal:config","set-eq-all":"internal:config","set-eq-preset":"internal:config","set-preamp":"internal:config","set-crossfade-seconds":"internal:config","set-skip-silence":"internal:config","set-loudness-normalization":"internal:config","set-playback-rate":"internal:config","set-preserves-pitch":"internal:config","lyrics-changed":"internal:lyrics","sync-room-updated":"internal:sync","sync-room-left":"internal:sync","sync-playback-remote":"internal:sync","sync-control-remote":"internal:sync","sync-reaction":"internal:sync","remote-action":"internal:remote","remote-clients":"internal:remote"},In=["mp3","m4a","opus","flac"];var pr=5;class An extends Error{}function fr(e,t){let n=(o)=>t.permissions.includes(o),i=(o)=>new An(`${t.id} has no permission for ${o}`);return{apiVersion:Se,manifest:t,get track(){return n("player:read")?e.track:null},set track(o){},config:n("internal:config")?e.config:{},invoke:(o,r,s)=>{let a=Cn[o];if(!a||!n(a))return Promise.reject(i(o));return e.invoke(o,r,s)},sendPlayerCommand:(o)=>{if(!n("player:control"))throw i("player control");e.sendPlayerCommand(o)},getVideoElement:()=>n("page")?e.getVideoElement():null,events:{listen:(o,r)=>{let s=Mn[o];if(!s||!n(s))return Promise.reject(i(`event ${o}`));return e.listen(o,r)}}}}class Ht{plugins=new Map;enabledPlugins=new Set;contexts=new Map;errors=new Map;host;onError;constructor(e,t=()=>{}){this.host=e,this.onError=t}register(e){if(this.plugins.set(e.id,e),this.contexts.set(e.id,fr(this.host,e.manifest)),e.defaultEnabled)this.enabledPlugins.add(e.id)}contextOf(e){return this.contexts.get(e)}guard(e,t,n){try{let i=n();if(i&&typeof i.then==="function")return i.catch((o)=>this.failed(e,t,o))}catch(i){this.failed(e,t,i)}return Promise.resolve()}failed(e,t,n){console.error(`[Oxitune] Error in plugin ${e.id} ${t}:`,n);let i=(this.errors.get(e.id)??0)+1;if(this.errors.set(e.id,i),this.onError(e,n),i>=pr&&this.enabledPlugins.has(e.id))console.warn(`[Oxitune] ${e.id} switched off after ${i} errors`),this.disable(e.id)}reportError(e,t,n){let i=this.plugins.get(e);if(i)this.failed(i,t,n)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){this.enabledPlugins.add(t);let o=this.contexts.get(t);if(n.onInit)await this.guard(n,"onInit",()=>n.onInit(o))}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){this.enabledPlugins.add(e),this.errors.delete(e);let n=this.contexts.get(e);if(t.onInit)await this.guard(t,"onInit",()=>t.onInit(n))}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await this.guard(t,"onDestroy",()=>t.onDestroy())}}each(e,t){for(let n of[...this.enabledPlugins]){let i=this.plugins.get(n),o=this.contexts.get(n);if(i&&o)this.guard(i,e,()=>t(i,o))}}handleTrackChange(e){this.host.track=e,this.each("onTrackChange",(t,n)=>t.onTrackChange?.(e,n))}handlePlaybackChange(e){this.each("onPlaybackChange",(t,n)=>t.onPlaybackChange?.(e,n))}handleTick(e){this.each("onTick",(t,n)=>t.onTick?.(e,n))}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}function Rn(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function d(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var Nn="oxitune-kit-styles",gr=`
  :root {
    --oxitune-font: Roboto, "Noto Naskh Arabic UI", Arial, sans-serif;
    --oxitune-font-display: "YouTube Sans", Roboto, Arial, sans-serif;
    --oxitune-text: var(--yt-sys-color-baseline--text-primary, #fff);
    --oxitune-text-secondary: var(--yt-sys-color-baseline--text-secondary, rgba(255, 255, 255, 0.7));
    --oxitune-text-disabled: rgba(255, 255, 255, 0.5);
    --oxitune-surface: var(--yt-sys-color-baseline--menu-background, #212121);
    --oxitune-hover: rgba(255, 255, 255, 0.1);
    --oxitune-pressed: rgba(255, 255, 255, 0.2);
    --oxitune-divider: rgba(255, 255, 255, 0.1);
    --oxitune-accent-color: var(--oxitune-accent, var(--yt-sys-color-baseline--call-to-action, #fff));
    --oxitune-player-bar-height: 72px;
  }

  .oxitune-icon-btn {
    all: unset;
    box-sizing: border-box;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--oxitune-text);
    cursor: pointer;
    position: relative;
    transition: background-color 0.1s linear;
  }
  .oxitune-icon-btn:hover { background: var(--oxitune-hover); }
  .oxitune-icon-btn:active { background: var(--oxitune-pressed); }
  .oxitune-icon-btn:focus-visible { outline: 2px solid var(--oxitune-text); outline-offset: -2px; }
  .oxitune-icon-btn[aria-disabled="true"] { color: var(--oxitune-text-disabled); cursor: default; background: none; }
  .oxitune-icon-btn svg { width: 24px; height: 24px; pointer-events: none; }
  .oxitune-icon-btn.oxitune-icon-btn--muted { color: var(--oxitune-text-secondary); }
  .oxitune-icon-btn.oxitune-icon-btn--muted:hover { color: var(--oxitune-text); }

  /* Circular progress drawn around an icon button. */
  .oxitune-progress-ring {
    position: absolute;
    inset: 2px;
    width: calc(100% - 4px) !important;
    height: calc(100% - 4px) !important;
    transform: rotate(-90deg);
    pointer-events: none;
  }
  .oxitune-progress-ring circle { fill: none; stroke-width: 2.5; }
  .oxitune-progress-ring .oxitune-progress-track { stroke: var(--oxitune-divider); }
  .oxitune-progress-ring .oxitune-progress-value {
    stroke: var(--oxitune-accent-color);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }

  .oxitune-menu {
    position: fixed;
    z-index: 2202;
    min-width: 240px;
    max-width: 320px;
    padding: 8px 0;
    box-sizing: border-box;
    background: var(--oxitune-surface);
    border-radius: 12px;
    box-shadow: 0 4px 32px rgba(0, 0, 0, 0.4);
    font-family: var(--oxitune-font);
    color: var(--oxitune-text);
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 0.12s ease, transform 0.12s ease;
  }
  .oxitune-menu.oxitune-open { opacity: 1; transform: none; pointer-events: auto; }
  .oxitune-menu-item {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 40px;
    padding: 0 16px 0 12px;
    font: 400 14px/20px var(--oxitune-font);
    color: var(--oxitune-text);
    cursor: pointer;
  }
  .oxitune-menu-item:hover, .oxitune-menu-item:focus-visible { background: var(--oxitune-hover); }
  .oxitune-menu-item svg { width: 24px; height: 24px; flex: 0 0 24px; }
  .oxitune-menu-item-text { flex: 1; display: flex; flex-direction: column; padding: 8px 0; }
  .oxitune-menu-item-sub { font-size: 12px; line-height: 16px; color: var(--oxitune-text-secondary); }
  .oxitune-menu-item-hint { font-size: 12px; color: var(--oxitune-text-secondary); }
  .oxitune-menu-divider { height: 1px; margin: 8px 0; background: var(--oxitune-divider); }

  .oxitune-chip {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    background: var(--oxitune-hover);
    font: 500 14px/20px var(--oxitune-font);
    color: var(--oxitune-text);
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.1s linear;
  }
  .oxitune-chip:hover { background: var(--oxitune-pressed); }
  .oxitune-chip:focus-visible { outline: 2px solid var(--oxitune-text); outline-offset: 2px; }
  .oxitune-chip svg { width: 18px; height: 18px; }
  .oxitune-chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--oxitune-accent-color);
  }

  .oxitune-button {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 16px;
    border-radius: 18px;
    font: 500 14px/36px var(--oxitune-font);
    color: var(--oxitune-text);
    cursor: pointer;
    transition: background-color 0.1s linear;
  }
  .oxitune-button:hover { background: var(--oxitune-hover); }
  .oxitune-button:focus-visible { outline: 2px solid var(--oxitune-text); outline-offset: 2px; }
  .oxitune-button--filled { background: var(--oxitune-text); color: #0f0f0f; }
  .oxitune-button--filled:hover { background: rgba(255, 255, 255, 0.85); }

  #oxitune-toast-host {
    position: fixed;
    left: 24px;
    bottom: calc(var(--oxitune-player-bar-height) + 16px);
    z-index: 2202;
    pointer-events: none;
  }
  .oxitune-toast {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 288px;
    max-width: 568px;
    min-height: 48px;
    padding: 8px 8px 8px 16px;
    background: var(--oxitune-surface);
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    font: 400 14px/20px var(--oxitune-font);
    color: var(--oxitune-text);
    pointer-events: auto;
    animation: oxitune-toast-in 0.2s ease-out;
  }
  .oxitune-toast.oxitune-leaving { animation: oxitune-toast-out 0.15s ease-in forwards; }
  .oxitune-toast-text { flex: 1; padding: 6px 8px 6px 0; }
  .oxitune-toast .oxitune-button { color: var(--oxitune-accent-color); }
  @keyframes oxitune-toast-in { from { opacity: 0; transform: translateY(16px); } }
  @keyframes oxitune-toast-out { to { opacity: 0; transform: translateY(16px); } }

  .oxitune-scrim {
    position: fixed;
    inset: 0;
    z-index: 2203;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    animation: oxitune-fade-in 0.15s ease-out;
  }
  .oxitune-dialog {
    box-sizing: border-box;
    width: min(400px, calc(100vw - 48px));
    padding: 24px;
    background: var(--oxitune-surface);
    border-radius: 12px;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.5);
    font-family: var(--oxitune-font);
    color: var(--oxitune-text);
  }
  .oxitune-dialog-title { margin: 0 0 8px; font: 700 20px/28px var(--oxitune-font-display); }
  .oxitune-dialog-body { font-size: 14px; line-height: 20px; color: var(--oxitune-text-secondary); }
  .oxitune-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
  @keyframes oxitune-fade-in { from { opacity: 0; } }

  #oxitune-tooltip {
    position: fixed;
    z-index: 2204;
    padding: 6px 8px;
    border-radius: 4px;
    background: rgba(97, 97, 97, 0.92);
    font: 400 12px/16px var(--oxitune-font);
    color: #fff;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.1s linear;
  }
  #oxitune-tooltip.oxitune-open { opacity: 1; }

  #oxitune-volume-indicator {
    position: fixed;
    z-index: 2201;
    visibility: hidden;
    opacity: 0;
    box-sizing: border-box;
    min-width: 58px;
    padding: 8px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--oxitune-surface) 82%, transparent);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
    color: var(--oxitune-text);
    font: 700 24px/28px var(--oxitune-font-display);
    font-variant-numeric: tabular-nums;
    text-align: center;
    pointer-events: none;
    transition: opacity 0.35s ease, visibility 0s linear 0.35s;
  }
  #oxitune-volume-indicator.oxitune-visible {
    visibility: visible;
    opacity: 1;
    transition: opacity 0.12s ease, visibility 0s;
  }

  #oxitune-reaction-host {
    position: fixed;
    right: 24px;
    bottom: calc(var(--oxitune-player-bar-height) + 16px);
    z-index: 2202;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    pointer-events: none;
  }
  .oxitune-reaction {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 14px 0 8px;
    border-radius: 18px;
    background: var(--oxitune-surface);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    font: 500 14px/20px var(--oxitune-font);
    color: var(--oxitune-text);
    animation: oxitune-reaction 3s ease-out forwards;
  }
  .oxitune-reaction-emoji { font-size: 22px; line-height: 1; }
  @keyframes oxitune-reaction {
    0% { opacity: 0; transform: translateY(12px) scale(0.9); }
    10%, 75% { opacity: 1; transform: none; }
    100% { opacity: 0; transform: translateY(-24px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .oxitune-menu, .oxitune-toast, .oxitune-toast.oxitune-leaving, .oxitune-scrim, .oxitune-reaction { transition: none; animation: none; }
    #oxitune-volume-indicator { transition: none; }
  }
`;function q(){if(document.getElementById(Nn))return;let e=document.createElement("style");e.id=Nn,e.textContent=gr,(document.head||document.documentElement).appendChild(e),yr()}var S={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",close:"M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",fullscreen:"M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",translate:"m12.87 15.07-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z",romanize:"M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z",remove:"M19 13H5v-2h14v2z",add:"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",swap:"M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z",refresh:"M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",play:"M8 5v14l11-7z",pause:"M6 19h4V5H6v14zm8-14v14h4V5h-4z",skipNext:"M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",skipPrevious:"M6 6h2v12H6zm3.5 6 8.5 6V6z",sync:"M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function _e(e,t=24){return Rn(e,t,t)}function A(e){let t=d("button",{id:e.id,className:`oxitune-icon-btn${e.muted?" oxitune-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.oxituneTooltip=e.label,t.appendChild(_e(e.iconPath)),t}function Ye(e,t){e.querySelector("svg:not(.oxitune-progress-ring)")?.replaceWith(_e(t))}var On=!1;function yr(){if(On)return;On=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("oxitune-open")},o=(a)=>{let l=a.dataset.oxituneTooltip;if(!l)return;if(!e)e=d("div",{id:"oxitune-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=l;let u=a.getBoundingClientRect(),f=e.getBoundingClientRect(),y=u.bottom+8+f.height<window.innerHeight?u.bottom+8:u.top-8-f.height,g=Math.max(8,Math.min(window.innerWidth-f.width-8,u.left+u.width/2-f.width/2));e.style.top=`${y}px`,e.style.left=`${g}px`,e.classList.add("oxitune-open")},r=(a)=>{let l=a.target?.closest?.("[data-oxitune-tooltip]");if(!l||l===n)return;i(),n=l,t=setTimeout(()=>o(l),250)},s=(a)=>{let l=a.relatedTarget;if(n&&l&&n.contains(l))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",s,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var ne=null;function _(e,t={}){q();let n=document.getElementById("oxitune-toast-host");if(!n)n=d("div",{id:"oxitune-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".oxitune-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("oxitune-leaving"),r=o?i:d("div",{className:"oxitune-toast"});if(t.id)r.dataset.toastId=t.id;let a=[d("span",{className:"oxitune-toast-text",text:e})];if(t.action){let{label:u,onClick:f}=t.action,p=d("button",{className:"oxitune-button",text:u});p.type="button",p.addEventListener("click",()=>{Vn(),f()}),a.push(p)}if(r.replaceChildren(...a),!o)n.replaceChildren(r);if(ne!==null)clearTimeout(ne);ne=null;let l=t.durationMs??4000;if(l>0)ne=setTimeout(Vn,l)}var hr=5,br=3000;function zn(e,t){q();let n=document.getElementById("oxitune-reaction-host");if(!n)n=d("div",{id:"oxitune-reaction-host"}),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=d("div",{className:"oxitune-reaction"});i.append(d("span",{className:"oxitune-reaction-emoji",text:e}),d("span",{text:t})),n.appendChild(i);while(n.children.length>hr)n.firstElementChild?.remove();setTimeout(()=>i.remove(),br)}function Vn(){if(ne!==null)clearTimeout(ne);ne=null;let e=document.querySelector("#oxitune-toast-host .oxitune-toast");if(!e)return;e.classList.add("oxitune-leaving"),setTimeout(()=>e.remove(),150)}function Hn(e){q(),document.getElementById(e.id)?.remove();let t=d("div",{id:e.id,className:"oxitune-scrim"}),n=d("div",{className:"oxitune-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=d("h2",{id:i,className:"oxitune-dialog-title",text:e.title}),r=d("div",{className:"oxitune-dialog-body"});if(e.body)r.append(...e.body);let s=document.activeElement,a=()=>{document.removeEventListener("keydown",l,!0),t.remove(),s?.focus?.()},l=(f)=>{if(f.key==="Escape")f.stopPropagation(),a()};document.addEventListener("keydown",l,!0),t.addEventListener("click",(f)=>{if(f.target===t)a()});let u=d("div",{className:"oxitune-dialog-actions"});for(let f of e.actions){let p=d("button",{className:`oxitune-button${f.filled?" oxitune-button--filled":""}`,text:f.label});p.type="button",p.addEventListener("click",()=>f.onClick?f.onClick(a):a()),u.appendChild(p)}return n.append(o,r,u),t.appendChild(n),document.body.appendChild(t),u.querySelector("button")?.focus(),{close:a,body:r}}var qn={menuLabel:"Oxitune",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",pluginSwitchedOff:(e)=>`“${e}” kept failing and was switched off. You can turn it back on in Settings > Plugins.`,menuMiniPlayer:"Mini player",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:(e,t,n)=>`${e} votes to skip (${t}/${n})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:(e,t)=>`From the shared queue: ${e} · ${t}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:(e)=>`${e} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:(e)=>`from ${e}`,syncQueuePlayNow:(e)=>`Play “${e}” now`,syncQueueRemove:(e)=>`Remove “${e}” from the queue`,syncQueueDrag:(e)=>`Move “${e}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",pipButton:"Picture-in-picture",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:(e)=>`Source: ${e}`,lyricsLocalFiles:"Local files",lyricsWrong:"Wrong lyrics?",lyricsPickTitle:"Choose lyrics",lyricsPickLoading:"Looking for other versions…",lyricsPickNone:"No other versions found",lyricsPickFailed:"Couldn’t switch the lyrics",lyricsSearchAgainTip:"Forget these lyrics and look them up again",lyricsTimed:"Timed",lyricsTextOnly:"Text only",lyricsCurrent:"Current",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsResetTip:"Reset timing",lyricsTranslateTip:"Show a translation under each line",lyricsTranslateFailed:"Couldn’t translate these lyrics",lyricsRomanizeTip:"Show lyrics written in other scripts in Latin letters too",lyricsRomanizeFailed:"Couldn’t romanize these lyrics",lyricsResumeSync:"Follow the song",playerPrevious:"Previous",playerNext:"Next",playerPlay:"Play",playerPause:"Pause",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`,windowMinimize:"Minimize",windowMaximize:"Maximize",windowRestore:"Restore down",windowClose:"Close"},vr={menuLabel:"Oxitune",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",pluginSwitchedOff:(e)=>`Wtyczka „${e}” ciągle zgłaszała błędy i została wyłączona. Możesz ją włączyć ponownie w Ustawieniach > Wtyczki.`,menuMiniPlayer:"Miniodtwarzacz",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:(e,t,n)=>`${e} głosuje za pominięciem (${t}/${n})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:(e,t)=>`Ze wspólnej kolejki: ${e} · ${t}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:(e)=>`${e} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:(e)=>`od: ${e}`,syncQueuePlayNow:(e)=>`Zagraj teraz: „${e}”`,syncQueueRemove:(e)=>`Usuń z kolejki: „${e}”`,syncQueueDrag:(e)=>`Przesuń „${e}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",pipButton:"Obraz w obrazie",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:(e)=>`Źródło: ${e}`,lyricsLocalFiles:"Pliki lokalne",lyricsWrong:"Zły tekst?",lyricsPickTitle:"Wybierz tekst",lyricsPickLoading:"Szukanie innych wersji…",lyricsPickNone:"Nie znaleziono innych wersji",lyricsPickFailed:"Nie udało się zmienić tekstu",lyricsSearchAgainTip:"Zapomnij ten tekst i wyszukaj go od nowa",lyricsTimed:"Z synchronizacją",lyricsTextOnly:"Sam tekst",lyricsCurrent:"Obecny",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsResetTip:"Zresetuj synchronizację",lyricsTranslateTip:"Pokazuj tłumaczenie pod każdą linijką",lyricsTranslateFailed:"Nie udało się przetłumaczyć tego tekstu",lyricsRomanizeTip:"Pokazuj tekst w innych alfabetach także literami łacińskimi",lyricsRomanizeFailed:"Nie udało się zapisać tego tekstu literami łacińskimi",lyricsResumeSync:"Podążaj za utworem",playerPrevious:"Poprzedni",playerNext:"Następny",playerPlay:"Odtwórz",playerPause:"Wstrzymaj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`,windowMinimize:"Minimalizuj",windowMaximize:"Maksymalizuj",windowRestore:"Przywróć w dół",windowClose:"Zamknij"},xr={en:qn,pl:vr};function wr(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return xr[t]??qn}var qt=null;function m(){if(!qt){let e=typeof document<"u"?document.documentElement.lang:"";qt=wr(e||(typeof navigator<"u"?navigator.language:"en"))}return qt}var kr=200;function Tr(e,t=document){let n=t.head||t.documentElement;if(n)return n.appendChild(e),()=>{return};let i=new MutationObserver(()=>{let o=t.head||t.documentElement;if(!o)return;i.disconnect(),o.appendChild(e)});return i.observe(t,{childList:!0}),()=>i.disconnect()}class We{id;name;description;defaultEnabled=!0;manifest;settingsValues;styles;factory;hooks=null;started=!1;track=null;playing=!1;trackListeners=new Set;playbackListeners=new Set;tickListeners=new Set;settingsListeners=new Set;mediaListeners=new Set;toolsListeners=new Set;toolsWaiters=new Set;unloaders=[];styleRemovers=[];constructor(e,t){this.manifest=e.manifest,this.id=e.manifest.id,this.name=e.manifest.name,this.description=e.manifest.description,this.settingsValues={...e.settings},this.styles=e.styles,this.factory=t}has(e){return this.manifest.permissions.includes(e)}report(e,t){console.error(`[Oxitune plugin ${this.id}] ${e}:`,t);let n=`${e}: ${t instanceof Error?t.message:String(t)}`;M("plugin_error",{id:this.id,message:n}).then((i)=>{if(i===!0)this.hooks?.onSwitchedOff(this.id)}).catch(()=>{return})}safe(e,t){return(...n)=>{try{let i=t(...n);if(i instanceof Promise)i.catch((o)=>this.report(e,o))}catch(i){this.report(e,i)}}}listenOn(e,t,n){let i=this.safe(t,n);return e.add(i),()=>e.delete(i)}addStyle(e){let t=document.createElement("style");t.dataset.oxitunePlugin=this.id,t.textContent=String(e);let n=Tr(t),i=()=>{n(),t.remove()};return this.styleRemovers.push(i),i}buildApi(){let e=this.id,t=`[${e}]`,n={apiVersion:Se,plugin:{id:e,name:this.manifest.name,version:this.manifest.version},log:{info:(...i)=>console.info(t,...i),warn:(...i)=>console.warn(t,...i),error:(...i)=>console.error(t,...i)},onUnload:(i)=>{this.unloaders.push(this.safe("onUnload",i))},settings:{all:()=>({...this.settingsValues}),get:(i)=>this.settingsValues[i],onChange:(i)=>this.listenOn(this.settingsListeners,"settings.onChange",i)}};if(this.has("player:read")){let i=this.has("player:control"),o=(r)=>()=>this.hooks?.sendPlayerCommand(r);n.player={getTrack:()=>this.track?{...this.track}:null,isPlaying:()=>this.playing,onTrackChange:(r)=>this.listenOn(this.trackListeners,"player.onTrackChange",r),onPlaybackChange:(r)=>this.listenOn(this.playbackListeners,"player.onPlaybackChange",r),onTick:(r)=>this.listenOn(this.tickListeners,"player.onTick",r),canSeekAutomatically:()=>!Y(),...i?{play:o("play"),pause:o("pause"),playPause:o("play_pause"),next:o("next"),previous:o("previous"),seek:(r)=>{if(Number.isFinite(r)&&r>=0)b.seekTo(r)},setVolume:(r)=>{if(Number.isFinite(r))b.setVolume(Math.min(1,Math.max(0,r)))}}:{}}}if(this.has("page"))n.page={document,getVideo:()=>b.getVideo()};if(this.has("storage"))n.storage={get:(i)=>M("plugin_storage_get",{id:e,key:String(i)}),set:(i,o)=>M("plugin_storage_set",{id:e,key:String(i),value:o}).then(()=>{return}),remove:(i)=>M("plugin_storage_remove",{id:e,key:String(i)}).then(()=>{return}),keys:()=>M("plugin_storage_keys",{id:e}).then((i)=>Array.isArray(i)?i:[])};if(this.has("network")){let i=(o)=>M("plugin_fetch",{id:e,url:String(o)},{timeoutMs:15000}).then((r)=>String(r??""));n.net={fetchText:i,fetchJson:(o)=>i(o).then((r)=>JSON.parse(r))}}if(this.has("media:save"))n.media={formats:In,save:(i,o)=>M("plugin_media_save",{id:e,videoId:String(i),format:String(o?.format??"mp3")}).then((r)=>String(r)),cancel:(i)=>M("plugin_media_cancel",{id:e,job:String(i)}).then(()=>{return}),onProgress:(i)=>this.listenOn(this.mediaListeners,"media.onProgress",i),tools:()=>M("plugin_media_tools_status",{id:e}).then((i)=>i),installTools:()=>new Promise((i,o)=>{let r=(s)=>{if(s.state==="done"||s.state==="declined"||s.state==="failed")this.toolsWaiters.delete(r),i(s.state)};this.toolsWaiters.add(r),M("plugin_media_install_tools",{id:e}).catch((s)=>{this.toolsWaiters.delete(r),o(s)})}),onToolsProgress:(i)=>this.listenOn(this.toolsListeners,"media.onToolsProgress",i)};if(this.has("ui"))n.ui={toast:(i,o)=>{let r=o?.action;_(String(i).slice(0,kr),{id:o?.id?`${e}:${String(o.id)}`:void 0,durationMs:typeof o?.durationMs==="number"?Math.min(Math.max(o.durationMs,1000),60000):void 0,action:r?{label:String(r.label).slice(0,40),onClick:this.safe("ui.toast action",()=>r.onClick())}:void 0})},addStyle:(i)=>this.addStyle(i)};return Object.freeze(n)}start(e){if(this.hooks=e,this.started)return;if(this.started=!0,this.has("ui"))this.styles.forEach((n)=>this.addStyle(n));let t=this.has("page");try{this.factory(this.buildApi(),t?window:void 0,t?window:void 0,t?window:void 0,t?document:void 0,void 0,void 0)}catch(n){this.report("startup",n)}}mediaTools(e){if(!this.has("media:save"))return;this.toolsListeners.forEach((t)=>t({...e})),[...this.toolsWaiters].forEach((t)=>t(e))}mediaProgress(e){this.mediaListeners.forEach((t)=>t({...e}))}setSettings(e){this.settingsValues={...e};let t={...e};this.settingsListeners.forEach((n)=>n(t))}onInit(e){if(this.hooks)this.start(this.hooks)}onTrackChange(e){this.track={...e},this.trackListeners.forEach((t)=>t({...e}))}onPlaybackChange(e){this.playing=e,this.playbackListeners.forEach((t)=>t(e))}onTick(e){this.tickListeners.forEach((t)=>t(e))}onDestroy(){for(let e of this.unloaders.splice(0))e();this.styleRemovers.splice(0).forEach((e)=>e()),this.trackListeners.clear(),this.playbackListeners.clear(),this.tickListeners.clear(),this.settingsListeners.clear(),this.mediaListeners.clear(),this.toolsListeners.clear()}}var me=new Map,Dt=null;function Er(e){if(!e||typeof e!=="object")return!1;let t=e;return!!t.manifest&&typeof t.manifest.id==="string"&&Array.isArray(t.manifest.permissions)&&!!t.settings&&typeof t.settings==="object"&&Array.isArray(t.styles)}function Dn(){if(typeof window>"u"||"__oxituneDefinePlugin"in window)return;Object.defineProperty(window,"__oxituneDefinePlugin",{value:(e,t)=>{if(!Er(e)||typeof t!=="function"||me.has(e.manifest.id))return;if(e.manifest.apiVersion!==Se)return;let n=new We(e,t);if(me.set(n.id,n),e.manifest.runAt==="document-start")n.start({sendPlayerCommand:(i)=>Dt?.sendPlayerCommand(i),onSwitchedOff:(i)=>Dt?.onSwitchedOff(i)})},enumerable:!1,writable:!1,configurable:!1})}function $n(e){Dt=e;for(let t of me.values())t.start(e);return[...me.values()]}function Fn(){return[...me.values()]}function Ke(e){return me.get(e)}function Bn(e){_(m().pluginSwitchedOff(e.name))}var Un={id:"app.oxitune.lyrics",name:"Native Synced Lyrics",version:"1.0.0",apiVersion:1,description:"Synchronized lyrics from several providers in the native Lyrics tab and in full screen: word by word, with translation, romanization and seek-on-click",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:config","internal:lyrics"],entry:"index.js"};var Sr=20;function jn(e,t){if(!t||e?.videoDetails?.videoId!==t)return[];let n=e.microformat?.microformatDataRenderer?.tags;if(!Array.isArray(n))return[];return n.filter((i)=>typeof i==="string"&&i.trim()!=="").slice(0,Sr)}var $t=(e)=>(e?.runs??[]).map((t)=>t.text??"").join("").trim();function Gn(e){let t=Array.from(e),n=t.findIndex((a)=>a.hasAttribute("selected"));if(n<0)return null;let i=t[n+1]?.data,o=i?.videoId,r=$t(i?.title);if(!o||!/^[A-Za-z0-9_-]{11}$/.test(o)||!r)return null;let s=Ge($t(i?.lengthText));return{videoId:o,title:r,artist:$t(i?.shortBylineText),durationSecs:s>0?s:null}}var W={video_id:null,provider:null,synced:[],plain:null,offset_secs:0,source_url:null};function _r(e,t){let n=0,i=e.length-1,o=-1;while(n<=i){let r=n+i>>1;if(e[r].t<=t)o=r,n=r+1;else i=r-1}return o}function Wn(e,t,n){return _r(e,t+n)}var Lr=0.6,Cr=6;function Xe(e,t){let n=e[t],i=e[t+1]?.t;if(typeof n.end==="number"&&n.end>=n.t)return i===void 0?n.end:Math.min(n.end,Math.max(i,n.t));return i??n.t+Cr}function Kn(e,t,n,i){let o=e[t];if(!o||n<=o.t)return 0;let r=e[t+1]?.t??Math.min(i??1/0,o.t+Lr*3),s=typeof o.end==="number"&&o.end>o.t?o.end:Math.max(r,o.t+0.05);return Math.min(1,(n-o.t)/(s-o.t))}var Mr=0.11,Ir=1.5;function Xn(e,t,n){let i=e.match(/\S+\s*/g)??[],o=i.map((l)=>Math.max(1,l.trim().length)),r=o.reduce((l,u)=>l+u,0);if(r===0||!(n>t))return[];let s=Math.min((n-t)*0.92,Math.max(Ir,r*Mr)),a=t;return i.map((l,u)=>{let f=a+s*o[u]/r,p={t:a,text:l,end:f};return a=f,p})}var Qn=7;function Jn(e){let t=[];if(e.length===0)return t;if(e[0].t>=Qn)t.push({before:0,from:0,to:e[0].t});for(let n=1;n<e.length;n++){let i=e[n-1].end;if(typeof i==="number"&&e[n].t-i>=Qn)t.push({before:n,from:i,to:e[n].t})}return t}function Bt(e,t){switch(e){case"local":return t;case"lrcred":return"lrc.red";case"lrclib":return"LRCLIB";case"unison":return"Unison";case"musixmatch":return"Musixmatch";case"netease":return"NetEase";case"ytm":return"YouTube Music";case"genius":return"Genius";default:return e||""}}var Ft=(e)=>typeof e==="number"&&Number.isFinite(e);function Yn(e){if(!Array.isArray(e))return;let t=e.filter((n)=>Ft(n?.t)&&typeof n?.text==="string").map((n)=>Ft(n.end)?{t:n.t,text:n.text,end:n.end}:{t:n.t,text:n.text});return t.length>0?t:void 0}function Ar(e){let t={t:e.t,text:e.text},n=Yn(e.words);if(n)t.words=n;if(Ft(e.end))t.end=e.end;if(e.alt===!0)t.alt=!0;let i=e.bg;if(i&&typeof i.text==="string"&&i.text.trim()!==""){let o=Yn(i.words);t.bg=o?{text:i.text,words:o}:{text:i.text}}return t}function Ut(e){let t=e&&typeof e==="object"?e:{};return{video_id:typeof t.video_id==="string"?t.video_id:null,lines:Array.isArray(t.lines)?t.lines.map((n)=>typeof n==="string"&&n.trim()!==""?n:null):[]}}function Le(e){if(!e||typeof e!=="object")return{...W};let t=e;return{video_id:typeof t.video_id==="string"?t.video_id:null,provider:typeof t.provider==="string"?t.provider:null,synced:Array.isArray(t.synced)?t.synced.filter((n)=>typeof n?.t==="number"&&typeof n?.text==="string").map((n)=>Ar(n)):[],plain:typeof t.plain==="string"?t.plain:null,offset_secs:typeof t.offset_secs==="number"&&Number.isFinite(t.offset_secs)?t.offset_secs:0,source_url:typeof t.source_url==="string"?t.source_url:null}}var Zn=`
  /* Scoped to tabs unlockLyricsTabHeader() has explicitly matched by
     label — NOT blind tab position (nth-of-type), since a layout where
     "Tekst"/"Lyrics" isn't the 2nd tab would otherwise force
     pointer-events:auto on some unrelated tab. */
  .oxitune-lyrics-tab-unlocked {
    pointer-events: auto !important;
    cursor: pointer !important;
  }
  .oxitune-lyrics-tab-unlocked[disabled],
  .oxitune-lyrics-tab-unlocked[aria-disabled="true"] {
    opacity: 1 !important;
    color: var(--oxitune-text, #fff) !important;
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

  #oxitune-native-lyrics-wrapper {
    display: none !important;
    flex-direction: column;
    padding: 24px 0 160px;
    max-width: 760px;
    margin: 0 auto;
    box-sizing: border-box;
    width: 100%;
  }

  /* Strict visibility: show ONLY inside the active lyrics tab renderer */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"].iron-selected #oxitune-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]:not([hidden]):not([aria-hidden="true"]) #oxitune-native-lyrics-wrapper {
    display: flex !important;
  }

  /* Never show inside queue / related / hidden tabs */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][hidden] #oxitune-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][aria-hidden="true"] #oxitune-native-lyrics-wrapper,
  ytmusic-tab-renderer:not([page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]) #oxitune-native-lyrics-wrapper,
  ytmusic-player-page ytmusic-tab-renderer:not(.iron-selected) #oxitune-native-lyrics-wrapper {
    display: none !important;
  }

  .oxitune-lyrics-view {
    --oxitune-lyric-on: #fff;
    --oxitune-lyric-off: rgba(255, 255, 255, 0.35);
    --oxitune-lyric-size: 28px;
    --oxitune-lyric-scale: 1;
    --oxitune-lyric-weight: 700;
    --oxitune-lyric-gap: 14px;
    position: relative;
    display: flex;
    flex-direction: column;
    /* The sung line grows by transform; it must not widen the scroll area. */
    overflow-x: clip;
  }
  .oxitune-lyrics-view[hidden] { display: none; }
  .oxitune-lyrics-lines { display: flex; flex-direction: column; gap: var(--oxitune-lyric-gap); }

  /* Large display type; the lines not being sung are dimmed. Size and
     weight never change between states (the sung line grows by transform
     only), so the text doesn't reflow as the highlight moves. */
  .oxitune-lyric-line {
    font: var(--oxitune-lyric-weight) calc(var(--oxitune-lyric-size) * var(--oxitune-lyric-scale))/1.25 var(--oxitune-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    color: var(--oxitune-lyric-off);
    cursor: pointer;
    padding: 4px 6% 4px 0;
    user-select: none;
    overflow-wrap: anywhere;
    transform-origin: left center;
    transition: color 0.25s ease, transform 0.35s ease, filter 0.35s ease, opacity 0.25s ease;
  }
  .oxitune-lyric-line:hover { color: rgba(255, 255, 255, 0.7); }
  .oxitune-lyric-line.oxitune-active { color: var(--oxitune-lyric-on); }
  .oxitune-lyric-line.oxitune-alt { text-align: right; padding: 4px 0 4px 6%; transform-origin: right center; }
  /* Text-only lyrics: the same type as timed ones, all of it lit. */
  .oxitune-lyric-line.oxitune-plain { cursor: default; color: var(--oxitune-lyric-on); }
  .oxitune-lyric-line.oxitune-plain:hover { color: var(--oxitune-lyric-on); }
  .oxitune-lyric-line.oxitune-empty { min-height: 0.6em; padding: 0; }

  /* Word by word: the word being sung fills from its start to its end.
     Every word of the sung line is painted the same way, by one gradient
     whose edge sits at --oxitune-fill (0 = not sung yet, 1 = sung). A word
     never switches between ways of being painted, and nothing here has a
     transition: switching made each syllable blink as it finished. */
  .oxitune-lyric-line.oxitune-active .oxitune-has-words .oxitune-lyric-word {
    background-image: linear-gradient(
      90deg,
      var(--oxitune-lyric-on) calc(var(--oxitune-fill, 0) * 112% - 12%),
      var(--oxitune-lyric-off) calc(var(--oxitune-fill, 0) * 112%)
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }

  /* Background vocals, the romanization and the translation sit under the line, smaller. */
  .oxitune-lyric-bg { font-size: 0.62em; font-weight: 500; margin-top: 4px; opacity: 0.85; }
  .oxitune-lyric-roman,
  .oxitune-lyric-trans {
    font: 500 0.56em/1.35 var(--oxitune-font, Roboto, Arial, sans-serif);
    margin-top: 4px;
    color: var(--oxitune-lyric-off);
  }
  .oxitune-lyric-line.oxitune-active .oxitune-lyric-roman,
  .oxitune-lyric-line.oxitune-active .oxitune-lyric-trans,
  .oxitune-lyric-line.oxitune-plain .oxitune-lyric-roman,
  .oxitune-lyric-line.oxitune-plain .oxitune-lyric-trans { color: rgba(255, 255, 255, 0.7); }

  /* An interlude: three dots that light up as it passes. */
  /* Always laid out (appearing would push every line below it down). */
  .oxitune-lyric-gap { display: flex; gap: 10px; padding: 10px 0; opacity: 0; transition: opacity 0.4s ease; }
  .oxitune-lyric-gap.oxitune-active { opacity: 1; }
  .oxitune-lyric-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--oxitune-lyric-off);
    transition: background-color 0.4s ease, transform 0.4s ease;
  }
  .oxitune-lyric-dot.oxitune-lit { background: var(--oxitune-lyric-on); transform: scale(1.15); }

  /* ---- Looks (Settings > Lyrics look; LYRICS_THEMES in view.ts). "classic" is the base above. ---- */
  .oxitune-lyrics-view[data-theme="spotlight"] {
    --oxitune-lyric-scale: 1.3;
    --oxitune-lyric-weight: 800;
    --oxitune-lyric-gap: 22px;
    --oxitune-lyric-off: rgba(255, 255, 255, 0.2);
  }
  .oxitune-lyrics-view[data-theme="compact"] {
    --oxitune-lyric-scale: 0.72;
    --oxitune-lyric-weight: 500;
    --oxitune-lyric-gap: 4px;
    --oxitune-lyric-off: rgba(255, 255, 255, 0.5);
  }
  .oxitune-lyrics-view[data-theme="accent"],
  .oxitune-lyrics-view[data-theme="karaoke"] {
    /* The cover's color, lifted toward white so it reads on any cover. */
    --oxitune-lyric-on: color-mix(in srgb, var(--oxitune-accent, #fff) 65%, #fff);
  }
  .oxitune-lyrics-view[data-theme="centered"] { --oxitune-lyric-weight: 600; }
  .oxitune-lyrics-view[data-theme="karaoke"] { --oxitune-lyric-scale: 1.15; --oxitune-lyric-weight: 800; --oxitune-lyric-gap: 20px; }
  .oxitune-lyrics-view[data-theme="karaoke"] .oxitune-lyric-line:not(.oxitune-plain) { text-transform: uppercase; letter-spacing: 0.02em; }
  .oxitune-lyrics-view[data-theme="centered"] .oxitune-lyric-line,
  .oxitune-lyrics-view[data-theme="karaoke"] .oxitune-lyric-line {
    text-align: center;
    padding: 4px 3%;
    transform-origin: center;
  }
  .oxitune-lyrics-view[data-theme="centered"] .oxitune-lyric-gap,
  .oxitune-lyrics-view[data-theme="karaoke"] .oxitune-lyric-gap { justify-content: center; }

  /* Effects (Settings): the sung line stands out, the rest falls back. Off
     while the listener scrolls through the lyrics themselves. */
  .oxitune-lyrics-effects .oxitune-lyric-line.oxitune-active { transform: scale(1.04); }
  .oxitune-lyrics-effects:not(.oxitune-lyrics-plain):not(.oxitune-lyrics-browsing) .oxitune-lyric-line:not(.oxitune-active) { filter: blur(1.6px); opacity: 0.8; }
  .oxitune-lyrics-effects:not(.oxitune-lyrics-plain):not(.oxitune-lyrics-browsing) .oxitune-lyric-line.oxitune-near:not(.oxitune-active) { filter: blur(0.7px); opacity: 0.9; }
  .oxitune-lyrics-effects .oxitune-lyric-line:hover { filter: none !important; opacity: 1 !important; }

  .oxitune-chip.oxitune-lyrics-resume {
    position: sticky;
    bottom: 76px;
    align-self: center;
    margin-top: 12px;
    background: var(--oxitune-surface, #212121);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
    z-index: 1;
  }
  .oxitune-chip.oxitune-lyrics-resume[hidden] { display: none; }

  .oxitune-native-lyrics-status {
    padding: 48px 0;
    text-align: center;
    font: 400 16px/24px var(--oxitune-font, Roboto, Arial, sans-serif);
    color: var(--oxitune-text-secondary, rgba(255, 255, 255, 0.7));
  }
  /* The controls: one pill that stays at the bottom of the tab while the
     lyrics scroll under it. Opaque: lines must not show through it. */
  .oxitune-lyrics-bar {
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
    background: var(--oxitune-surface, #212121);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
    font: 400 12px/16px var(--oxitune-font, Roboto, Arial, sans-serif);
    color: var(--oxitune-text-secondary, rgba(255, 255, 255, 0.7));
  }
  .oxitune-lyrics-bar .oxitune-lyrics-source {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: inherit;
    text-decoration: none;
  }
  .oxitune-lyrics-bar a.oxitune-lyrics-source:hover { text-decoration: underline; }
  .oxitune-lyrics-bar .oxitune-icon-btn { width: 36px; height: 36px; flex: none; }
  .oxitune-lyrics-bar .oxitune-icon-btn svg { width: 20px; height: 20px; }
  /* A switch that is on looks like YTM's selected chip. */
  .oxitune-lyrics-bar .oxitune-icon-btn[aria-pressed="true"] { background: var(--oxitune-text, #fff); color: #030303; }
  .oxitune-lyrics-bar-sep { flex: none; width: 1px; height: 20px; margin: 0 6px; background: var(--oxitune-divider, rgba(255, 255, 255, 0.1)); }
  .oxitune-lyrics-offset-value {
    all: unset;
    flex: none;
    min-width: 48px;
    text-align: center;
    font: 500 12px/36px var(--oxitune-font, Roboto, Arial, sans-serif);
    font-variant-numeric: tabular-nums;
    color: var(--oxitune-text, #fff);
    cursor: pointer;
    border-radius: 18px;
  }
  .oxitune-lyrics-offset-value:hover { background: var(--oxitune-hover, rgba(255, 255, 255, 0.1)); }
  .oxitune-lyrics-offset-value:focus-visible { outline: 2px solid var(--oxitune-text, #fff); outline-offset: -2px; }
  .oxitune-lyrics-pick-list { display: flex; flex-direction: column; margin: 8px -24px 0; max-height: 50vh; overflow-y: auto; }
  .oxitune-lyrics-pick-list .oxitune-menu-item { width: 100%; text-align: left; }

  /* ---- Fullscreen: the cover and the player on the left, the lyrics on the right. ---- */
  #oxitune-lyrics-fs {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    background: #030303;
    color: var(--oxitune-text, #fff);
    font-family: var(--oxitune-font, Roboto, Arial, sans-serif);
    overflow: hidden;
  }
  #oxitune-lyrics-fs.oxitune-fs-idle { cursor: none; }
  /* The cover blurred once into a small bitmap (never a live blur filter
     on a full-window layer), stretched over the window. */
  .oxitune-fs-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .oxitune-fs-veil { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); }
  .oxitune-fs-body {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6vw;
    height: 100%;
    padding: 0 6vw;
    box-sizing: border-box;
  }
  .oxitune-fs-side { flex: 0 0 min(34vw, 62vh); display: flex; flex-direction: column; min-width: 0; }
  .oxitune-fs-cover {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  }
  .oxitune-fs-title {
    margin-top: 24px;
    font: 700 24px/32px var(--oxitune-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .oxitune-fs-artist {
    font: 400 16px/24px var(--oxitune-font, Roboto, Arial, sans-serif);
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .oxitune-fs-seek { margin-top: 20px; padding: 8px 0; cursor: pointer; }
  .oxitune-fs-track { height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.25); overflow: hidden; }
  .oxitune-fs-played { height: 100%; width: 100%; background: #fff; transform-origin: left center; transform: scaleX(0); }
  .oxitune-fs-times {
    display: flex;
    justify-content: space-between;
    font: 400 12px/16px var(--oxitune-font, Roboto, Arial, sans-serif);
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.7);
  }
  .oxitune-fs-controls { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 12px; }
  .oxitune-fs-controls .oxitune-fs-play { width: 56px; height: 56px; }
  .oxitune-fs-controls .oxitune-fs-play svg { width: 36px; height: 36px; }
  .oxitune-fs-close { position: absolute; top: 16px; right: 16px; z-index: 2; }
  .oxitune-fs-controls,
  .oxitune-fs-close { transition: opacity 0.3s ease; }
  .oxitune-fs-idle .oxitune-fs-controls,
  .oxitune-fs-idle .oxitune-fs-close { opacity: 0; }

  .oxitune-fs-lyrics {
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
  .oxitune-fs-lyrics::-webkit-scrollbar { display: none; }
  .oxitune-fs-lyrics .oxitune-lyrics-view { --oxitune-lyric-size: clamp(28px, 3.2vw, 52px); }
  .oxitune-fs-lyrics .oxitune-lyrics-lines { gap: calc(var(--oxitune-lyric-gap) * 1.5); }
  .oxitune-fs-lyrics .oxitune-native-lyrics-status { font-size: 20px; }
  @media (max-width: 800px) {
    .oxitune-fs-side { display: none; }
  }
`;var Ce={translation:null,romanization:null},Rr=5000;function Nr(e,t){return e.findIndex((n)=>t>=n.from&&t<n.to)}function Or(e,t){let n=(t-e.from)/Math.max(0.001,e.to-e.from);return Math.max(0,Math.min(3,Math.floor(n*3)+1))}function Vr(e,t){if(e<=0||!Number.isFinite(t))return-1;return Math.max(0,Math.min(e-1,Math.floor(t*e)))}var zr=["classic","spotlight","centered","accent","compact","karaoke"],ei=(e)=>zr.includes(e)?e:"classic";class Me{opts;root;list;resume;lyrics={...W};rows=[];gaps=[];gapSpans=[];active=-1;activeGap=-1;plainShown=-1;holdUntil=0;constructor(e){this.opts=e;this.root=d("div",{className:"oxitune-lyrics-view"}),this.list=d("div",{className:"oxitune-lyrics-lines"}),this.resume=d("button",{className:"oxitune-chip oxitune-lyrics-resume",text:e.resumeLabel}),this.resume.type="button",this.resume.hidden=!0,this.root.append(this.list,this.resume),this.list.addEventListener("click",(n)=>{let i=n.target?.closest(".oxitune-lyric-line[data-line]"),o=i?this.lyrics.synced[Number(i.dataset.line)]:void 0;if(o)this.opts.onSeek(Math.max(0,o.t-this.lyrics.offset_secs))});let t=()=>this.holdScroll();this.root.addEventListener("wheel",t,{passive:!0}),this.root.addEventListener("touchmove",t,{passive:!0}),this.resume.addEventListener("click",()=>{this.releaseScroll(),this.scrollToCurrent()})}setEffects(e){this.root.classList.toggle("oxitune-lyrics-effects",e)}setTheme(e){this.root.dataset.theme=e}get hasLines(){return this.rows.length>0}setLyrics(e,t){this.lyrics=e,this.active=-1,this.activeGap=-1,this.plainShown=-1,this.releaseScroll(),this.rows=[],this.gaps=[];let n=[];if(e.synced.length>0){let i=Jn(e.synced);e.synced.forEach((o,r)=>{let s=i.find((p)=>p.before===r);if(s){let p=this.buildGap(s);this.gaps.push(p),n.push(p.el)}let a=d("div",{className:"oxitune-lyric-line"});if(a.dataset.line=String(r),o.alt)a.classList.add("oxitune-alt");let l=o.words?.length?o.words:Xn(o.text,o.t,Xe(e.synced,r)),u=this.buildText("oxitune-lyric-main",o.text,l);a.append(u.el);let f=null;if(o.bg){let p=this.buildText("oxitune-lyric-bg",o.bg.text,o.bg.words);a.append(p.el),f=p.run}this.rows.push({el:a,main:u.run,bg:f}),n.push(a)})}else if(e.plain)for(let i of e.plain.split(`
`)){let o=d("div",{className:"oxitune-lyric-line oxitune-plain"});if(i.trim()==="")o.classList.add("oxitune-empty");o.append(d("div",{className:"oxitune-lyric-main",text:i})),this.rows.push({el:o,main:null,bg:null}),n.push(o)}this.gapSpans=this.gaps.map((i)=>i.gap),this.list.replaceChildren(...n),this.root.classList.toggle("oxitune-lyrics-plain",e.synced.length===0),this.setExtras(t)}setExtras(e){this.rows.forEach((t,n)=>{this.setSubline(t.el,"oxitune-lyric-roman",e.romanization?.[n]??null),this.setSubline(t.el,"oxitune-lyric-trans",e.translation?.[n]??null)})}setOffset(e){this.lyrics={...this.lyrics,offset_secs:e}}update(e,t){let n=this.lyrics.synced;if(n.length===0)return;let i=e+this.lyrics.offset_secs,o=Nr(this.gapSpans,i),r=Wn(n,e,this.lyrics.offset_secs);if(o>=0&&r>=0&&i>=Xe(n,r))r=-1;if(o!==this.activeGap){if(this.gaps[this.activeGap]?.el.classList.remove("oxitune-active"),this.activeGap=o,this.gaps[o]?.el.classList.add("oxitune-active"),t&&o>=0)this.scrollTo(this.gaps[o].el)}let s=this.gaps[o];if(s){let l=Or(s.gap,i);if(l!==s.lit)s.lit=l,s.dots.forEach((u,f)=>u.classList.toggle("oxitune-lit",f<l))}if(r!==this.active){let l=this.rows[this.active];if(l)l.el.classList.remove("oxitune-active"),this.clearFill(l.main),this.clearFill(l.bg);this.rows[this.active-1]?.el.classList.remove("oxitune-near"),this.rows[this.active+1]?.el.classList.remove("oxitune-near"),this.active=r;let u=this.rows[r];if(u){if(u.el.classList.add("oxitune-active"),this.rows[r-1]?.el.classList.add("oxitune-near"),this.rows[r+1]?.el.classList.add("oxitune-near"),t)this.scrollTo(u.el)}}let a=this.rows[r];if(a){let l=Xe(n,r);this.fill(a.main,i,l),this.fill(a.bg,i,l)}}updatePlain(e,t){if(this.lyrics.synced.length>0||!t)return;let n=Vr(this.rows.length,e);if(n===this.plainShown)return;this.plainShown=n;let i=this.rows[n];if(i)this.scrollTo(i.el)}scrollToCurrent(){(this.gaps[this.activeGap]?.el??this.rows[this.active]?.el??this.rows[this.plainShown]?.el)?.scrollIntoView({behavior:"smooth",block:"center"})}scrollTo(e){if(Date.now()<this.holdUntil)return;if(!this.resume.hidden)this.releaseScroll();e.scrollIntoView({behavior:"smooth",block:"center"})}holdScroll(){if(this.rows.length===0)return;this.holdUntil=Date.now()+Rr,this.resume.hidden=!1,this.root.classList.add("oxitune-lyrics-browsing")}releaseScroll(){this.holdUntil=0,this.resume.hidden=!0,this.root.classList.remove("oxitune-lyrics-browsing")}buildText(e,t,n){let i=d("div",{className:e});if(!n||n.length===0)return i.textContent=t,{el:i,run:null};i.classList.add("oxitune-has-words");let o=n.map((r)=>d("span",{className:"oxitune-lyric-word",text:r.text}));return i.append(...o),{el:i,run:{words:n,els:o,shown:n.map(()=>0)}}}buildGap(e){let t=d("div",{className:"oxitune-lyric-gap"});t.setAttribute("aria-hidden","true");let n=[0,1,2].map(()=>d("span",{className:"oxitune-lyric-dot"}));return t.append(...n),{gap:e,el:t,dots:n,lit:0}}setSubline(e,t,n){let i=e.querySelector(`:scope > .${t}`);if(!n){i?.remove();return}if(i){if(i.textContent!==n)i.textContent=n;return}let o=d("div",{className:t,text:n});if(t==="oxitune-lyric-roman")e.querySelector(":scope > .oxitune-lyric-main")?.after(o);else e.append(o)}fill(e,t,n){if(!e)return;for(let i=0;i<e.words.length;i++){let o=Kn(e.words,i,t,n);if(o===e.shown[i])continue;e.shown[i]=o;let r=e.els[i];if(o>0)r.style.setProperty("--oxitune-fill",o>=1?"1":o.toFixed(3));else r.style.removeProperty("--oxitune-fill")}}clearFill(e){if(!e)return;e.els.forEach((t,n)=>{if(e.shown[n]===0)return;e.shown[n]=0,t.style.removeProperty("--oxitune-fill")})}}var jt=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function ti(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let s=r.getImageData(0,0,16,16).data,a=0,l=0,u=0,f=0,p=0,y=0,g=0,w=0;for(let R=0;R<s.length;R+=4){let G=s[R],U=s[R+1],Q=s[R+2];if(s[R+3]<128)continue;let B=(G+U+Q)/3;if(B<20||B>240)continue;if(R<s.length/2)a+=G,l+=U,u+=Q,f++;else p+=G,y+=U,g+=Q,w++}if(f===0&&w===0){t(n);return}let c=f>0?Math.round(a/f):220,h=f>0?Math.round(l/f):38,k=f>0?Math.round(u/f):38,v=w>0?Math.round(p/w):24,x=w>0?Math.round(y/w):24,T=w>0?Math.round(g/w):27;t({primary:jt(c,h,k),secondary:jt(v,x,T),accent:jt(c+30,h+30,k+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var K=48,Hr=3,qr=3,Dr=1.65,$r=0.55;function Fr(e,t,n,i){let o=new Float32Array(e.length),r=(s,a,l)=>{let u=l?n:t,f=l?t:n;for(let p=0;p<u;p++)for(let y=0;y<4;y++)for(let g=0;g<f;g++){let w=0,c=0;for(let k=Math.max(0,g-i);k<=Math.min(f-1,g+i);k++){let v=l?(p*t+k)*4+y:(k*t+p)*4+y;w+=s[v],c++}let h=l?(p*t+g)*4+y:(g*t+p)*4+y;a[h]=w/c}};r(e,o,!0),r(o,e,!1)}function Br(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],s=e[i+2],a=0.2126*o+0.7152*r+0.0722*s;e[i]=(a+(o-a)*t)*n,e[i+1]=(a+(r-a)*t)*n,e[i+2]=(a+(s-a)*t)*n}}async function Je(e,t=$r){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=K,o.height=K;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,K,K);let s=r.getImageData(0,0,K,K);for(let a=0;a<qr;a++)Fr(s.data,K,K,Hr);Br(s.data,Dr,t),r.putImageData(s,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var Ur=3000;function ni(e){let t=Number.isFinite(e)&&e>0?Math.floor(e):0,n=String(t%60).padStart(2,"0"),i=Math.floor(t/60)%60,o=Math.floor(t/3600);return o>0?`${o}:${String(i).padStart(2,"0")}:${n}`:`${i}:${n}`}function jr(e,t,n,i){if(!(n>0)||!(i>0))return null;return Math.max(0,Math.min(1,(e-t)/n))*i}var Gr="ytmusic-player .fullscreen-button",Qr=".exit-fullscreen-button",Yr='ytmusic-player-page[player-fullscreened], ytmusic-app-layout[player-ui-state="FULLSCREEN"], ytmusic-player[player-ui-state="FULLSCREEN"]',Wr=300;function Kr(e){return(e.key==="f"||e.key==="F")&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&!e.repeat}function Xr(e){if(!e)return!1;return e.isContentEditable===!0||["INPUT","TEXTAREA","SELECT"].includes((e.tagName??"").toUpperCase())}function ii(e){let t=()=>e.isOpen()?e.close():e.open(),n=(s)=>{s.preventDefault(),s.stopImmediatePropagation()},i=(s)=>{if(!(s.target instanceof Element)||!s.target.closest(Gr))return;n(s),e.open()},o=(s)=>{if(!Kr(s)||Xr(s.target))return;n(s),t()},r=window.setInterval(()=>{if(e.isOpen()||!document.querySelector(Yr))return;Array.from(document.querySelectorAll(Qr)).find((a)=>a.offsetParent!==null)?.click(),e.open()},Wr);return document.addEventListener("click",i,!0),document.addEventListener("keydown",o,!0),()=>{clearInterval(r),document.removeEventListener("click",i,!0),document.removeEventListener("keydown",o,!0)}}class Gt{opts;view;root;backdrop;cover;title;artist;played;elapsed;total;playButton;status;idleTimer=null;coverUrl="";durationSecs=0;shownSecond=-1;playing=null;open=!1;constructor(e){this.opts=e;let{labels:t}=e;this.view=new Me({onSeek:e.onSeek,resumeLabel:t.resume}),this.root=d("div",{id:"oxitune-lyrics-fs"}),this.backdrop=d("div",{className:"oxitune-fs-backdrop"}),this.cover=d("img",{className:"oxitune-fs-cover"}),this.cover.alt="",this.title=d("div",{className:"oxitune-fs-title"}),this.artist=d("div",{className:"oxitune-fs-artist"});let n=d("div",{className:"oxitune-fs-seek"}),i=d("div",{className:"oxitune-fs-track"});this.played=d("div",{className:"oxitune-fs-played"}),i.append(this.played),n.append(i),n.addEventListener("click",(y)=>{let g=i.getBoundingClientRect(),w=jr(y.clientX,g.left,g.width,this.durationSecs);if(w!==null)e.onSeek(w)}),this.elapsed=d("span",{text:"0:00"}),this.total=d("span",{text:"0:00"});let o=d("div",{className:"oxitune-fs-times"});o.append(this.elapsed,this.total);let r=A({label:t.previous,iconPath:S.skipPrevious});this.playButton=A({label:t.play,iconPath:S.play}),this.playButton.classList.add("oxitune-fs-play");let s=A({label:t.next,iconPath:S.skipNext});r.addEventListener("click",()=>e.onCommand("previous")),this.playButton.addEventListener("click",()=>e.onCommand("play_pause")),s.addEventListener("click",()=>e.onCommand("next"));let a=d("div",{className:"oxitune-fs-controls"});a.append(r,this.playButton,s);let l=d("div",{className:"oxitune-fs-side"});l.append(this.cover,this.title,this.artist,n,o,a),this.status=d("div",{className:"oxitune-native-lyrics-status"});let u=d("div",{className:"oxitune-fs-lyrics"});u.append(this.status,this.view.root);let f=d("div",{className:"oxitune-fs-body"});f.append(l,u);let p=A({label:t.close,iconPath:S.close});p.classList.add("oxitune-fs-close"),p.addEventListener("click",()=>this.close()),this.root.append(this.backdrop,d("div",{className:"oxitune-fs-veil"}),f,p),this.root.addEventListener("mousemove",this.wake)}get isOpen(){return this.open}show(){if(this.open)return;this.open=!0,this.shownSecond=-1,document.body.append(this.root),document.addEventListener("keydown",this.onKey,!0),document.addEventListener("fullscreenchange",this.onFullscreenChange),this.root.requestFullscreen?.().catch(()=>{return}),this.wake(),this.view.scrollToCurrent()}close(){if(!this.open)return;if(this.open=!1,document.removeEventListener("keydown",this.onKey,!0),document.removeEventListener("fullscreenchange",this.onFullscreenChange),this.idleTimer!==null)clearTimeout(this.idleTimer);if(this.idleTimer=null,document.fullscreenElement===this.root)document.exitFullscreen().catch(()=>{return});this.root.remove(),this.opts.onClose()}setTrack(e){this.title.textContent=e?.title??"",this.artist.textContent=e?.artist??"";let t=e?.coverUrl??"";if(t===this.coverUrl)return;if(this.coverUrl=t,t)this.cover.src=t;else this.cover.removeAttribute("src");this.backdrop.style.backgroundImage="",Je(t,0.5).then((n)=>{if(n&&this.coverUrl===t)this.backdrop.style.backgroundImage=`url("${n}")`})}setPlaying(e){if(e===this.playing)return;this.playing=e;let t=e?this.opts.labels.pause:this.opts.labels.play;Ye(this.playButton,e?S.pause:S.play),this.playButton.setAttribute("aria-label",t)}setProgress(e,t){if(this.durationSecs=t,!this.open)return;let n=Math.floor(e);if(n===this.shownSecond)return;this.shownSecond=n;let i=t>0?Math.max(0,Math.min(1,e/t)):0;this.played.style.transform=`scaleX(${i.toFixed(4)})`,this.elapsed.textContent=ni(e),this.total.textContent=ni(t)}setStatus(e){this.status.textContent=e??"",this.status.hidden=e===null,this.view.root.hidden=e!==null}wake=()=>{if(this.root.classList.remove("oxitune-fs-idle"),this.idleTimer!==null)clearTimeout(this.idleTimer);this.idleTimer=window.setTimeout(()=>this.root.classList.add("oxitune-fs-idle"),Ur)};onKey=(e)=>{if(e.key!=="Escape")return;e.stopPropagation(),this.close()};onFullscreenChange=()=>{if(this.open&&document.fullscreenElement!==this.root)this.close()}}var P={...W},O=!1,z="",V=null,E=null,Wt="",N={...Ce},ie="",oe="",Ie="",di={translate:!1,lang:"en",romanize:!1,autoOpen:!1,effects:!0,theme:"classic"};function Qt(e,t=di){let n=(o,r)=>typeof e[o]==="boolean"?e[o]:r,i=e.lyrics_translate_lang;return{translate:n("lyrics_translate_enabled",t.translate),lang:typeof i==="string"&&/^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(i)?i:t.lang,romanize:n("lyrics_romanize_enabled",t.romanize),autoOpen:n("lyrics_auto_open",t.autoOpen),effects:n("lyrics_effects",t.effects),theme:"lyrics_theme"in e?ei(e.lyrics_theme):t.theme}}var I={...di},Kt=(e,t)=>`${t}|${e.video_id??""}|${e.provider??""}|${e.synced.length}|${e.plain?.length??0}`,Re=()=>P.synced.length>0||!!P.plain,re=0,oi=0,ri=Number.NaN;function Jr(e,t,n,i,o){let r=t-n;if(Number.isFinite(r)&&r>=0&&r<=ai)return e+r;return e+Math.min(ai,Math.max(0,i)/1000)*(o||1)}var tt=0,nt=!1,si="",Zr=15,ai=1,es=0.3,Xt="",it=!1,D=null,Ze=null,ot=(e,t)=>e===t,ts=(e)=>e.videoId?`${e.videoId}|${e.title.trim().toLowerCase()}`:`${e.title} - ${e.artist}`,mi={id:"lyrics",manifest:Un,name:"Native Synced Lyrics",description:"Synchronized lyrics from several providers in the native Lyrics tab and in full screen: word by word, with translation, romanization and seek-on-click",defaultEnabled:!0,onInit(e){P={...W},O=!1,z="",Xt="",it=!1,D=null,N={...Ce},ie="",oe="",Wt="",Ie="",I=Qt(e.config);let t=(p)=>b.seekTo(p);V=new Me({onSeek:t,resumeLabel:m().lyricsResumeSync}),V.setEffects(I.effects),V.setTheme(I.theme),E=new Gt({labels:{close:m().close,previous:m().playerPrevious,next:m().playerNext,play:m().playerPlay,pause:m().playerPause,resume:m().lyricsResumeSync},onCommand:(p)=>e.sendPlayerCommand(p),onSeek:t,onClose:()=>V?.scrollToCurrent()}),E.view.setEffects(I.effects),E.view.setTheme(I.theme);let n=ii({isOpen:()=>E?.isOpen===!0,open:()=>as(e),close:()=>E?.close()}),i=document.createElement("style");i.id="oxitune-native-lyrics-styles",i.textContent=Zn,document.head.appendChild(i),q();let o=()=>{Jt(e,Qt(e.config,I)),Yt(),fs(e),ls(e),ss(),nt=is()},r=0,s=()=>{if(r=requestAnimationFrame(s),!nt&&!E?.isOpen||P.synced.length===0)return;let p=e.getVideoElement();if(!p||p.paused)return;ui(Jr(re,p.currentTime,ri,performance.now()-oi,p.playbackRate),!0)};r=requestAnimationFrame(s);let a=()=>{setTimeout(()=>{Yt(),Zt()},50),setTimeout(()=>{Zt()},250)};document.addEventListener("click",a,!0);let l=window.setInterval(o,600);o(),us(e);let u=e.events?e.events.listen("lyrics-changed",(p)=>{let y=Le(p.payload);if(!ns(y))return;rt(e,y)}):null,f=e.events?e.events.listen("config-updated",(p)=>{if(p.payload&&typeof p.payload==="object")Jt(e,Qt(p.payload,I))}):null;Ze=()=>{cancelAnimationFrame(r),clearInterval(l),document.removeEventListener("click",a,!0),u?.then((p)=>p()).catch(()=>{return}),f?.then((p)=>p()).catch(()=>{return}),n(),E?.close(),E=null,V=null,i.remove(),document.querySelectorAll("#oxitune-native-lyrics-wrapper").forEach((p)=>p.remove())}},async onTrackChange(e,t){let n=ts(e);if(D=e,n===z)return;z=n,P={...W,video_id:e.videoId??null},O=!0,tt=0,Xt=yi(),it=!1,N={...Ce},ie="",oe="",Ie=I.autoOpen?n:"",Yt(),V?.setLyrics(P,N),se(t),await pi(t,e,n,null)},onPlaybackChange(e){E?.setPlaying(e)},onTick(e,t){re=e,oi=performance.now(),ri=t.getVideoElement()?.currentTime??Number.NaN,ui(e,!0);let n=D?.durationSecs??0;if(E?.setProgress(e,n),P.synced.length===0&&n>0){let i=e/n;if(V?.updatePlain(i,nt),E?.isOpen)E.view.updatePlain(i,!0)}if(e>=Zr)os(t)},onDestroy(){if(Ze)Ze(),Ze=null}};function ns(e){if(!D)return!1;if(e.video_id&&D.videoId)return e.video_id===D.videoId;return!e.video_id||e.video_id===D.videoId}async function pi(e,t,n,i){try{let o=Le(await e.invoke("fetch_lyrics",{videoId:t.videoId||null,artist:t.artist,title:t.title,albumName:t.album||null,duration:t.durationSecs||null,ytmPlain:i,artistAliases:jn(b.getMoviePlayer()?.getPlayerResponse?.(),t.videoId)},{timeoutMs:15000}));if(!ot(n,z))return;O=!1,rt(e,o)}catch{if(!ot(n,z))return;O=!1,se(e)}}function rt(e,t){let n=t.provider!==null&&t.provider===P.provider&&t.synced.length===P.synced.length&&t.plain===P.plain&&t.video_id===P.video_id&&!O;if(O&&!t.provider&&t.offset_secs===P.offset_secs)return;if(P=t,O=!1,n){let i=document.querySelector(".oxitune-lyrics-offset-value");if(i)i.textContent=bi(t.offset_secs);V?.setOffset(t.offset_secs),E?.view.setOffset(t.offset_secs),Ae(re,!1);return}N={...Ce},ie="",oe="",V?.setLyrics(P,N),se(e),Ae(re,!1),fi(e)}function Jt(e,t){let n=Object.keys(t).some((i)=>t[i]!==I[i]);if(I=t,!n)return;V?.setEffects(I.effects),E?.view.setEffects(I.effects),V?.setTheme(I.theme),E?.view.setTheme(I.theme),se(e),fi(e)}function et(){if(V?.setExtras(N),E?.isOpen)E.view.setExtras(N)}async function fi(e){let t=Re()&&!O?Kt(P,z):"",n=()=>t!==""&&t===Kt(P,z),i=(a)=>!a||!P.video_id||a===P.video_id,o=(a)=>a.some((l)=>l!==null)?a:null,r=I.translate&&t!==""?`${t}|${I.lang}`:"";if(r!==ie){if(ie=r,N={...N,translation:null},et(),r)try{let a=Ut(await e.invoke("translate_lyrics",{lang:I.lang},{timeoutMs:20000}));if(ie===r&&n()&&i(a.video_id))N={...N,translation:o(a.lines)},et()}catch{if(ie===r)_(m().lyricsTranslateFailed)}}let s=I.romanize&&t!==""?t:"";if(s!==oe){if(oe=s,N={...N,romanization:null},et(),s)try{let a=Ut(await e.invoke("romanize_lyrics",{},{timeoutMs:20000}));if(oe===s&&n()&&i(a.video_id))N={...N,romanization:o(a.lines)},et()}catch{if(oe===s)_(m().lyricsRomanizeFailed)}}}function li(e,t){let n=!I[t];e.config[t==="translate"?"lyrics_translate_enabled":"lyrics_romanize_enabled"]=n,Jt(e,{...I,[t]:n}),e.invoke("set_lyrics_display",{[t]:n}).catch(()=>_(m().actionFailed))}function ui(e,t){if(e<tt&&tt-e<es)return;tt=e,Ae(e,t)}function is(){if(typeof document>"u"||document.hidden)return!1;let e=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');return!!e&&!!document.getElementById("oxitune-native-lyrics-wrapper")&&vi(e)}function os(e){if(si===z||Y())return;si=z;let t=Gn(document.querySelectorAll("ytmusic-player-queue-item"));if(!t||t.videoId===D?.videoId)return;e.invoke("prefetch_lyrics",{videoId:t.videoId,title:t.title,artist:t.artist,duration:t.durationSecs}).catch(()=>{return})}function Ae(e,t){if(P.synced.length===0)return;let n=E?.isOpen===!0;if(V?.update(e,t&&nt&&!n),n)E?.view.update(e,t)}function rs(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");return Array.from(e).find((t)=>/tekst|lyrics|paroles|letras/.test(t.textContent?.toLowerCase()||""))??null}function ss(){if(!Ie||Ie!==z||O||!Re())return;let e=rs();if(!e||!vi(e))return;if(Ie="",!(e.classList.contains("iron-selected")||e.getAttribute("aria-selected")==="true"))e.click()}function gi(){if(!E?.isOpen)return;E.setTrack(D),E.setStatus(O?m().lyricsLoading:Re()?null:m().lyricsNone);let e=`${Kt(P,z)}|${O}`;if(e!==Wt)Wt=e,E.view.setLyrics(O?{...W}:P,N);else E.view.setExtras(N)}function as(e){if(!E)return;E.show(),E.setPlaying(e.getVideoElement()?.paused===!1),E.setProgress(re,D?.durationSecs??0),gi(),Ae(re,!1),E.view.scrollToCurrent()}function yi(){return document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description')?.textContent?.trim()||""}function ls(e){if(it||O||!D||P.provider)return;let t=yi();if(!t||t===Xt)return;it=!0,pi(e,D,z,t)}async function us(e){let t=cs(),n=[...ds(t)];if(n.length===0)return;try{await e.invoke("import_lyrics_offsets",{entries:n}),t?.removeItem?.(hi)}catch(i){console.warn("[Oxitune Lyrics] Offset migration failed, will retry next start:",i)}}var hi="oxitune-lyrics-offsets";function cs(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function ds(e){try{let t=e?.getItem(hi);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function bi(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function vi(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function ms(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("oxitune-lyrics-tab-unlocked")}function Yt(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(ms(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("oxitune-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function ps(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function Zt(){let e=document.getElementById("oxitune-native-lyrics-wrapper");if(!e)return;let t=ps();e.style.setProperty("display",t?"flex":"none","important")}function fs(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("oxitune-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=d("div",{id:"oxitune-native-lyrics-wrapper"});t.appendChild(n),se(e),Ae(re,!1)}Zt()}function pe(e,t,n,i){let o=A({label:e,iconPath:t,muted:!0});if(i!==void 0)o.setAttribute("aria-pressed",String(i));return o.addEventListener("click",n),o}function gs(){if(!P.provider)return d("span",{className:"oxitune-lyrics-source"});let e=m().lyricsSource(Bt(P.provider,m().lyricsLocalFiles));if(P.source_url){let t=d("a",{className:"oxitune-lyrics-source",text:e});return t.href=P.source_url,t.target="_blank",t.rel="noopener noreferrer",t}return d("span",{className:"oxitune-lyrics-source",text:e})}function ci(e){let t=d("div",{className:"oxitune-lyrics-bar"}),n=()=>d("span",{className:"oxitune-lyrics-bar-sep"});if(t.append(gs()),Re())t.append(pe(m().lyricsTranslateTip,S.translate,()=>li(e,"translate"),I.translate),pe(m().lyricsRomanizeTip,S.romanize,()=>li(e,"romanize"),I.romanize),n());if(P.synced.length>0){let i=(r)=>{let s=r===null?0:Math.round((P.offset_secs+r)*10)/10;e.invoke("set_lyrics_offset",{offsetSecs:s}).catch((a)=>console.warn("[Oxitune Lyrics] offset:",a))},o=d("button",{className:"oxitune-lyrics-offset-value",text:bi(P.offset_secs)});o.type="button",o.dataset.oxituneTooltip=m().lyricsResetTip,o.setAttribute("aria-label",m().lyricsResetTip),o.addEventListener("click",()=>i(null)),t.append(pe(m().lyricsLater,S.remove,()=>i(-0.5)),o,pe(m().lyricsEarlier,S.add,()=>i(0.5)),n())}return t.append(pe(m().lyricsWrong,S.swap,()=>void hs(e)),pe(m().lyricsSearchAgainTip,S.refresh,()=>void ys(e))),t}async function ys(e){let t=z;O=!0,se(e);try{let n=Le(await e.invoke("refresh_lyrics",{},{timeoutMs:15000}));if(!ot(t,z))return;O=!1,rt(e,n)}catch{if(!ot(t,z))return;O=!1,se(e),_(m().actionFailed)}}async function hs(e){let t=d("div",{className:"oxitune-lyrics-pick-list"});t.append(d("div",{className:"oxitune-native-lyrics-status",text:m().lyricsPickLoading}));let n=Hn({id:"oxitune-lyrics-picker",title:m().lyricsPickTitle,body:[t],actions:[{label:m().close}]}),i=[];try{i=await e.invoke("list_lyrics_candidates",{},{timeoutMs:15000})||[]}catch{i=[]}if(!t.isConnected)return;if(i.length===0){t.replaceChildren(d("div",{className:"oxitune-native-lyrics-status",text:m().lyricsPickNone}));return}t.replaceChildren(...i.map((o)=>{let r=d("button",{className:"oxitune-menu-item"});r.type="button";let s=d("span",{className:"oxitune-menu-item-text"}),a=o.synced?m().lyricsTimed:m().lyricsTextOnly;if(s.append(d("span",{text:`${Bt(o.provider,m().lyricsLocalFiles)} · ${a}`}),d("span",{className:"oxitune-menu-item-sub",text:`${o.title} — ${o.artist}`}),d("span",{className:"oxitune-menu-item-sub",text:o.preview})),r.append(s),o.selected)r.append(d("span",{className:"oxitune-menu-item-hint",text:m().lyricsCurrent}));return r.addEventListener("click",async()=>{n.close();try{rt(e,Le(await e.invoke("pick_lyrics",{provider:o.provider,id:o.id})))}catch{_(m().lyricsPickFailed)}}),r}))}function se(e){gi();let t=document.getElementById("oxitune-native-lyrics-wrapper");if(!t)return;if(O)t.replaceChildren(d("div",{className:"oxitune-native-lyrics-status",text:m().lyricsLoading}));else if(Re()&&V)t.replaceChildren(V.root,ci(e));else{let n=[d("div",{className:"oxitune-native-lyrics-status",text:m().lyricsNone})];if(D)n.push(ci(e));t.replaceChildren(...n)}}var xi={id:"app.oxitune.wheel-volume",name:"Wheel Volume Controller",version:"1.0.0",apiVersion:1,description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:config"],entry:"index.js"};var Ne=null;function fe(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}function vs(e,t){let n=Math.max(e.left,t.left),i=Math.max(e.top,t.top);if(n>=Math.min(e.right,t.right)||i>=Math.min(e.bottom,t.bottom))return t;return{left:n,top:i}}function wi(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var ki={id:"volume",manifest:xi,name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){Ne?.(),q(),document.getElementById("oxitune-volume-indicator")?.remove();let t=d("div",{id:"oxitune-volume-indicator"});document.body.appendChild(t);let n=null,i=null,o=null,r=null,s=null,a=null,l=()=>{if(a!==null)window.cancelAnimationFrame(a);a=null},u=()=>{if(s!==null)window.clearTimeout(s);s=null,l(),t.classList.remove("oxitune-visible")},f=()=>{let x=document.querySelector("ytmusic-player-page #main-panel");if(!wi()&&!fe(x))return!1;let T=fe(document.querySelector("ytmusic-player-page #song-image")),R=fe(document.querySelector("ytmusic-player-page video"))||fe(document.querySelector("ytmusic-player-page #movie_player")),U=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?R||T:T||R)||fe(x);if(!U)return!1;let Q=fe(document.querySelector("ytmusic-player-page #player")),te=Q?vs(U,Q):U,B=`${Math.max(8,te.left+12)}px`,ke=`${Math.max(8,te.top+12)}px`;if(t.style.left!==B)t.style.left=B;if(t.style.top!==ke)t.style.top=ke;return!0},p=()=>{if(a=null,!t.classList.contains("oxitune-visible"))return;if(!f()){u();return}a=window.requestAnimationFrame(p)},y=()=>{if(s!==null)window.clearTimeout(s);if(t.classList.add("oxitune-visible"),a===null)a=window.requestAnimationFrame(p);s=window.setTimeout(u,1800)},g=()=>{let x=e.getVideoElement();if(!x){r=null,u();return}Nt(x);let T=Pe(x)?0:Ee(x),R=r!==null&&T!==r&&!_n();if(r=T,t.textContent!==`${T}%`)t.textContent=`${T}%`,t.setAttribute("aria-label",m().volumeLevel(T));if(!f()){u();return}if(R)y()},w=()=>{let x=e.getVideoElement();if(x===n)return;n?.removeEventListener("volumechange",g),n=x,n?.addEventListener("volumechange",g),g()},c=()=>{let x=document.querySelector("ytmusic-player-page");if(x===i)return;if(o?.disconnect(),i=x,x)o=new MutationObserver(()=>window.requestAnimationFrame(g)),o.observe(x,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},h=(x)=>{let T=x.target;if(T instanceof Element&&T.closest("ytmusic-player-bar"))window.requestAnimationFrame(g)},k=(x)=>{if(x.deltaY===0||x.ctrlKey)return;let T=x.target,R=T instanceof Element?T.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'):null;if(R&&R.tagName!=="YTMUSIC-PLAYER")return;let G=(hn)=>{if(!hn)return!1;let $e=hn.getBoundingClientRect();return x.clientX>=$e.left&&x.clientX<$e.right&&x.clientY>=$e.top&&x.clientY<$e.bottom},U=G(document.querySelector("ytmusic-player-bar"))||G(document.querySelector("#player-bar-background")),Q=e.config.wheel_volume_on_player_page===!0&&(wi()||G(document.querySelector("ytmusic-player-page #main-panel")));if(!U&&!Q)return;let te=e.getVideoElement();if(!te)return;let B=e.config.wheel_volume_step,ke=typeof B==="number"&&Number.isFinite(B)&&B>0?Math.min(B,1):0.05;x.preventDefault(),x.stopPropagation(),Ue(Ee(te)+(x.deltaY<0?ke:-ke)*100,te),g()};window.addEventListener("wheel",k,{passive:!1,capture:!0}),window.addEventListener("resize",g),document.addEventListener("scroll",g,!0),document.addEventListener("input",h,!0),document.addEventListener("change",h,!0),c(),w();let v=window.setInterval(()=>{c(),w(),g()},500);Ne=()=>{window.removeEventListener("wheel",k,{capture:!0}),window.removeEventListener("resize",g),document.removeEventListener("scroll",g,!0),document.removeEventListener("input",h,!0),document.removeEventListener("change",h,!0),window.clearInterval(v),o?.disconnect(),n?.removeEventListener("volumechange",g),u(),t.remove()}},onDestroy(){if(Ne)Ne(),Ne=null}};var Ti={id:"app.oxitune.notifications",name:"Track Change Notifications",version:"1.0.0",apiVersion:1,description:"Displays native desktop notifications when songs change",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","internal:config","internal:notify"],entry:"index.js"};var Ei={id:"notifications",manifest:Ti,name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[Oxitune] Notification dispatch failed:",n)}}};var Pi={id:"app.oxitune.scrollbars",name:"Sleek Scrollbars",version:"1.0.0",apiVersion:1,description:"Applies subtle, low-contrast scrollbar colors",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","ui"],entry:"index.js"};var st=null,Si={id:"visualizer",manifest:Pi,name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("oxitune-theme-styles");if(!t)t=document.createElement("style"),t.id="oxitune-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);st=()=>{t?.remove()}},onDestroy(){if(st)st(),st=null}};var _i={id:"app.oxitune.audio-dsp",name:"Audio DSP & 10-Band Equalizer",version:"1.0.0",apiVersion:1,description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","internal:config"],entry:"index.js"};var at=[32,64,125,250,500,1000,2000,4000,8000,16000],en={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function Oe(e){return Math.max(-24,Math.min(24,e))}function Ts(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function Es(e){return Math.max(0.5,Math.min(2,e))}class H{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=at.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!H.instance)H.instance=new H;return H.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[Oxitune DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=at.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===at.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[Oxitune DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[Oxitune DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[Oxitune DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=Oe(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=Oe(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=Oe(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,Oe(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=en[e]||en.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),Ts(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=Es(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??b.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class tn{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){let t=e.videoId||`${e.title}-${e.artist}`;if(t===this.currentTrackId)return;if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=t,this.crossfadeSeconds>0&&e.currentTimeSecs<this.crossfadeSeconds)H.getInstance().fadeIn(this.crossfadeSeconds);else H.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),H.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[Oxitune Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),H.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[Oxitune Crossfade] Advancing to next track..."),b.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class nn{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=H.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[Oxitune Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[Oxitune Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,b.next()}else this.consecutiveSilentTicks=0}}var ae=null,ge=null,lt=null;function Ps(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var Li={id:"audio_dsp",manifest:_i,name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=H.getInstance(),n=new tn,i=new nn;ae=n,ge=i;let o=e.config,r=null,s=()=>{if(r!==null)return;let l=e.getVideoElement();if(l){if(!t.isInitializedFor(l))t.init(l);return}r=window.setInterval(()=>{let u=e.getVideoElement();if(u){if(r!==null)clearInterval(r);r=null,t.init(u)}},500)};if(Ps(o))s();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let a=[];if(e.events){let{listen:l}=e.events;a.push(l("set-eq-band",(u)=>{s(),t.setBandGain(u.payload.bandIndex,u.payload.gain)}),l("set-eq-all",(u)=>{s(),t.setAllGains(u.payload.gains)}),l("set-eq-preset",(u)=>{s(),t.applyPreset(u.payload)}),l("set-preamp",(u)=>{s(),t.setPreamp(u.payload)}),l("set-loudness-normalization",(u)=>{if(u.payload)s();t.setLoudnessNormalization(u.payload)}),l("set-crossfade-seconds",(u)=>{if(u.payload>0)s();n.setCrossfadeSeconds(u.payload)}),l("set-skip-silence",(u)=>{if(u.payload)s();i.setEnabled(u.payload)}),l("set-playback-rate",(u)=>{t.setPlaybackRate(u.payload)}),l("set-preserves-pitch",(u)=>{t.setPreservesPitch(u.payload)}))}lt=()=>{if(r!==null)clearInterval(r),r=null;a.forEach((l)=>l.then((u)=>u())),ae?.destroy(),ae=null,ge=null},console.log("[Oxitune] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(H.getInstance().applyRateAndPitch(),ae)ae.onTrackChange(e);if(ge)ge.onTrackChange()},onTick(e,t){if(Y())return;if(ae)ae.onTick(e,t.track);if(ge)ge.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(lt)lt(),lt=null}};var Ci={id:"app.oxitune.ambient-lighting",name:"Dynamic Ambient Lighting",version:"1.0.0",apiVersion:1,description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","ui","internal:config"],entry:"index.js"};var ut=null,ct=null,dt,Mi={id:"ambient_lighting",manifest:Ci,name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("oxitune-ambient-backdrop");if(!t)t=d("div",{id:"oxitune-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=d("img",{id:"oxitune-ambient-cover"});n.alt="";let i=d("div",{id:"oxitune-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,s=document.createElement("style");s.id="oxitune-ambient-styles",s.textContent=`
      #oxitune-ambient-backdrop {
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
      #oxitune-ambient-cover {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        opacity: 0;
        transition: opacity 1.1s ease;
      }
      #oxitune-ambient-veil {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse 70% 55% at 20% 0%, color-mix(in srgb, var(--oxitune-accent-primary, #3a2f1f) 45%, transparent) 0%, transparent 60%),
          radial-gradient(ellipse 65% 60% at 100% 100%, color-mix(in srgb, var(--oxitune-accent-secondary, #0e0c11) 40%, transparent) 0%, transparent 65%),
          linear-gradient(180deg, rgba(7, 6, 10, 0.35) 0%, rgba(7, 6, 10, 0.75) 100%);
      }
      /* Ensure YouTube Music transparent backgrounds let the wash pass through */
      ytmusic-app-layout, #browse-page, ytmusic-browse-response {
        background-color: transparent !important;
      }
    `,document.head.appendChild(s),ut=(l)=>{if(t)t.style.opacity=String(l)};let a=[];if(e.events)a.push(e.events.listen("set-ambient-intensity",(l)=>{ut?.(l.payload)}),e.events.listen("set-ambient-enabled",(l)=>{let u=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;ut?.(l.payload?u:0)}));if(ct=()=>{a.forEach((l)=>l.then((u)=>u())),ut=null,dt=void 0,document.getElementById("oxitune-ambient-styles")?.remove(),document.getElementById("oxitune-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===dt)return;dt=t;let n=document.getElementById("oxitune-ambient-cover");if(n){let i=t?await Je(t):null;if(t!==dt)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await ti(t||""),o=document.documentElement.style;o.setProperty("--oxitune-accent",i.accent),o.setProperty("--oxitune-accent-primary",i.primary),o.setProperty("--oxitune-accent-secondary",i.secondary)}catch{}},onDestroy(){if(ct)ct(),ct=null}};var Ii={id:"app.oxitune.themes",name:"Theme Engine & Live CSS",version:"1.0.0",apiVersion:1,description:"Switches YouTube Music\\",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","ui","internal:config"],entry:"index.js"};var Ai=`
  html {
    --ytmusic-call-to-action: var(--oxitune-accent, #e8b06b) !important;
    --yt-sys-color-baseline--call-to-action: var(--oxitune-accent, #e8b06b) !important;
    --yt-sys-color-baseline--call-to-action-inverse: var(--oxitune-accent, #e8b06b) !important;
    --yt-sys-color-baseline--overlay-call-to-action: var(--oxitune-accent, #e8b06b) !important;
    --yt-sys-color-baseline--call-to-action-hover: color-mix(in srgb, var(--oxitune-accent, #e8b06b) 100%, white 18%) !important;
    --yt-sys-color-baseline--overlay-call-to-action-hover: color-mix(in srgb, var(--oxitune-accent, #e8b06b) 100%, white 18%) !important;
    --paper-input-container-focus-color: ${"var(--oxitune-accent, #e8b06b)"} !important;

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
    background-color: ${"var(--oxitune-accent, #e8b06b)"} !important;
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

`;var mt=null,Ni={id:"theme_engine",manifest:Ii,name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(a)=>{let l=document.getElementById(a);if(!l){l=document.createElement("style"),l.id=a;let u=t();if(u)u.appendChild(l)}return l},i=(a)=>{let l=n("oxitune-active-theme");l.textContent=a?Ai:Ri},o=(a)=>{let l=n("oxitune-custom-css");if(l)l.textContent=a};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let s=[];if(e.events)s.push(e.events.listen("set-ambient-enabled",(a)=>{i(a.payload)}),e.events.listen("set-custom-css",(a)=>{o(a.payload)}));mt=()=>{s.forEach((a)=>a.then((l)=>l()))},console.log("[Oxitune] Theme engine active.")},onDestroy(){if(mt)mt(),mt=null}};var Oi={id:"app.oxitune.pip",name:"Floating Picture-in-Picture",version:"1.0.0",apiVersion:1,description:"Detachable floating always-on-top video window for watching music videos while browsing",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","internal:windows"],entry:"index.js"};var pt=null,Vi={id:"pip",manifest:Oi,name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("oxitune-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=A({id:"oxitune-pip-btn",label:m().pipButton,iconPath:S.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(s){console.warn("[Oxitune PiP] Could not enter PiP:",s),await e.invoke("toggle_mini_player").catch((a)=>console.error("[Oxitune PiP] Mini player fallback failed:",a))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),pt=()=>{clearInterval(n),document.getElementById("oxitune-pip-btn")?.remove()}},onDestroy(){if(pt)pt(),pt=null}};var zi={id:"app.oxitune.local-files",name:"Local Music Library",version:"1.0.0",apiVersion:1,description:"Play local offline audio files alongside YouTube Music streaming",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:[],entry:"index.js"};var Hi={id:"local_files",manifest:zi,name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[Oxitune] Local files module ready.")}};var qi={id:"app.oxitune.listen-together",name:"P2P Room Sync",version:"1.0.0",apiVersion:1,description:"Listen together with friends in real-time synchronized listening rooms",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:sync"],entry:"index.js"};var ft="oxitune-nav-slot",on="oxitune-menu-btn",Ve="oxitune-menu",Di="oxitune-sync-chip",Fi=[],gt=null,Bi=null,$i=!1,Is=`
  #${ft} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function As(){if(document.getElementById("oxitune-nav-slot-styles"))return;let e=document.createElement("style");e.id="oxitune-nav-slot-styles",e.textContent=Is,document.head.appendChild(e)}function Rs(e){if(!e)return;return`${m().syncInRoom} · ${m().syncListeners(e.listeners)}`}function Ui(e){Fi=e.items,Bi=e.onSyncChipClick}function ji(){if(document.getElementById(ft)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;q(),As();let t=d("div",{id:ft}),n=A({id:on,label:m().menuLabel,iconPath:S.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),Os(n)}),t.appendChild(n),e.prepend(t),Gi(),zs()}function rn(e){gt=e,Gi();let t=document.getElementById(Ve);if(t?.classList.contains("oxitune-open"))Qi(t)}function Gi(){let e=document.getElementById(ft);if(!e)return;let t=document.getElementById(Di);if(!gt){t?.remove();return}if(!t)t=d("button",{id:Di,className:"oxitune-chip"}),t.type="button",t.addEventListener("click",()=>Bi?.()),e.prepend(t);let n=m().syncListeners(gt.listeners);t.replaceChildren(d("span",{className:"oxitune-chip-dot"}),_e(S.group,18),d("span",{text:n})),t.dataset.oxituneTooltip=m().syncInRoom,t.setAttribute("aria-label",`${m().syncInRoom}, ${n}`)}function Qi(e){let t=[];for(let n of Fi){if(n.dividerBefore)t.push(d("div",{className:"oxitune-menu-divider"}));let i=d("button",{className:"oxitune-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=d("span",{className:"oxitune-menu-item-text"});o.appendChild(d("span",{text:n.label}));let r=n.id==="sync"?Rs(gt):void 0;if(r)o.appendChild(d("span",{className:"oxitune-menu-item-sub",text:r}));if(i.append(_e(n.iconPath),o),n.hint)i.appendChild(d("span",{className:"oxitune-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{ye(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function Ns(){let e=document.getElementById(Ve);if(!e)e=d("div",{id:Ve,className:"oxitune-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",Vs),document.body.appendChild(e);return e}function Os(e){let t=Ns();if(t.classList.contains("oxitune-open")){ye();return}Qi(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("oxitune-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".oxitune-menu-item")?.focus()}function ye(){let e=document.getElementById(Ve);if(!e?.classList.contains("oxitune-open"))return;e.classList.remove("oxitune-open");let t=document.getElementById(on);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function Vs(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".oxitune-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),ye();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")ye()}function zs(){if($i)return;$i=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(Ve);if(!t?.classList.contains("oxitune-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(on)?.contains(n))return;ye()}),window.addEventListener("resize",ye)}function Yi(e){return e.is_host?"host":e.role??"dj"}function X(e){return e!=="listener"}function Wi(e){return Math.floor(e/2)+1}function Hs(e,t,n){let i=0;return t.forEach((o,r)=>{if(r!==n&&e>o)i++}),i}var yt=null;function Ki(e,t){if(!yt)return;let n=[...e.querySelectorAll(t)].find((i)=>i.dataset.itemId===yt);if(n)n.focus(),yt=null}function Xi({list:e,rowSelector:t,handleSelector:n,onMove:i}){let o=()=>[...e.querySelectorAll(t)],r=()=>o().forEach((g)=>g.classList.remove("is-dragging","drop-before","drop-after")),s=null,a=(g,w)=>{let c=o().filter((h,k)=>k!==w);if(c.forEach((h)=>h.classList.remove("drop-before","drop-after")),g<c.length)c[g].classList.add("drop-before");else c[c.length-1]?.classList.add("drop-after")},l=(g)=>{if(g.button!==0||!(g.target instanceof Element))return;let w=g.target.closest(n),c=w?.closest(t);if(!w||!c||!w.dataset.itemId)return;let h=o().indexOf(c);if(h<0)return;g.preventDefault();try{w.setPointerCapture(g.pointerId)}catch{}s={from:h,itemId:w.dataset.itemId,to:h,pointerId:g.pointerId,handle:w},c.classList.add("is-dragging")},u=(g)=>{if(!s||g.pointerId!==s.pointerId)return;let w=o().map((c)=>{let h=c.getBoundingClientRect();return h.top+h.height/2});s.to=Hs(g.clientY,w,s.from),a(s.to,s.from)},f=(g)=>{if(!s||g.pointerId!==s.pointerId)return;let{from:w,to:c,itemId:h,handle:k}=s;if(s=null,k.hasPointerCapture(g.pointerId))k.releasePointerCapture(g.pointerId);if(r(),c!==w)i(w,c,h)},p=(g)=>{if(g.key!=="ArrowUp"&&g.key!=="ArrowDown"||!(g.target instanceof Element))return;let w=g.target.closest(n),c=w?.closest(t);if(!w||!c||!w.dataset.itemId)return;g.preventDefault();let h=o(),k=h.indexOf(c),v=g.key==="ArrowUp"?k-1:k+1;if(k<0||v<0||v>=h.length)return;yt=w.dataset.itemId,i(k,v,w.dataset.itemId)},y=()=>{s=null,r()};return e.addEventListener("pointerdown",l),e.addEventListener("pointermove",u),e.addEventListener("pointerup",f),e.addEventListener("pointercancel",y),e.addEventListener("keydown",p),()=>{e.removeEventListener("pointerdown",l),e.removeEventListener("pointermove",u),e.removeEventListener("pointerup",f),e.removeEventListener("pointercancel",y),e.removeEventListener("keydown",p)}}var Ji="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var be="oxitune-sync-queue",sn="oxitune-sync-queue-styles",ht="data-oxitune-sync-queue",ze="data-oxitune-sync-queue-tab",qs="M8 5v14l11-7z",Ds="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",$s=/^[A-Za-z0-9_-]{11}$/;function to(e){if(typeof e!=="object"||e===null)return null;let t=e.serviceEndpoint?.queueAddEndpoint;if(typeof t!=="object"||t===null)return null;let{queueTarget:n,queueInsertPosition:i}=t;return{videoId:typeof n?.videoId==="string"&&$s.test(n.videoId)?n.videoId:null,next:i==="INSERT_AFTER_CURRENT_VIDEO"}}function Fs(e){return`
  html[${ht}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${ht}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(e)};
    font-size: 14px;
  }
  html[${ze}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${be} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--oxitune-font);
    color: var(--oxitune-text);
  }
  html[${ze}] #${be} { display: block; }
  .oxitune-sq-heading {
    margin: 16px 0 4px;
    font: 700 16px/24px var(--oxitune-font-display);
  }
  .oxitune-sq-heading:first-child { margin-top: 8px; }
  .oxitune-sq-hint { margin: 8px 0; color: var(--oxitune-text-secondary); }
  .oxitune-sq-row {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 0 8px;
    border-radius: 8px;
  }
  .oxitune-sq-row:hover { background: var(--oxitune-hover); }
  .oxitune-sq-thumb {
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    background: var(--oxitune-hover);
  }
  .oxitune-sq-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .oxitune-sq-title, .oxitune-sq-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .oxitune-sq-title { font-weight: 500; }
  .oxitune-sq-sub { color: var(--oxitune-text-secondary); }
  /* Like YTM's own queue rows: actions only take room on hover or focus,
     so titles use the full width otherwise (still reachable by Tab). */
  .oxitune-sq-handle.oxitune-icon-btn { flex: 0 0 24px; width: 24px; cursor: grab; touch-action: none; }
  .oxitune-sq-handle.oxitune-icon-btn:hover { background: none; }
  .oxitune-sq-row.is-dragging { opacity: 0.5; }
  .oxitune-sq-row.is-dragging .oxitune-sq-handle { cursor: grabbing; }
  .oxitune-sq-row.drop-before { box-shadow: inset 0 2px 0 var(--oxitune-accent-color); }
  .oxitune-sq-row.drop-after { box-shadow: inset 0 -2px 0 var(--oxitune-accent-color); }
  .oxitune-sq-actions { display: flex; flex: 0 0 auto; max-width: 0; overflow: hidden; }
  .oxitune-sq-row:hover .oxitune-sq-actions, .oxitune-sq-row:focus-within .oxitune-sq-actions { max-width: 80px; }
`}function Bs(e){q();let t=document.getElementById(sn);if(!t)t=d("style",{id:sn}),document.head.appendChild(t);let n=Fs(e);if(t.textContent!==n)t.textContent=n}var no=".oxitune-sq-handle",Us=".oxitune-sq-queued";function Zi(e){let t=d("div",{className:"oxitune-sq-row"}),n=d("img",{className:"oxitune-sq-thumb"});n.alt="",n.loading="lazy",n.src=`https://i.ytimg.com/vi/${e.videoId}/default.jpg`;let i=d("div",{className:"oxitune-sq-text"});if(i.append(d("span",{className:"oxitune-sq-title",text:e.title}),d("span",{className:"oxitune-sq-sub",text:e.sub})),e.handle)t.appendChild(e.handle);if(t.append(n,i),e.actions.length){let o=d("div",{className:"oxitune-sq-actions"});o.append(...e.actions),t.appendChild(o)}return t}function eo(e,t,n){let i=A({label:e,iconPath:t,muted:!0});return i.addEventListener("click",(o)=>{o.stopPropagation(),n()}),i}function io(e,t,n){let i=m(),o=[];if(t.nowPlaying)o.push(d("div",{className:"oxitune-sq-heading",text:i.syncQueueNowPlaying})),o.push(Zi({...t.nowPlaying,sub:t.nowPlaying.artist,actions:[]}));if(o.push(d("div",{className:"oxitune-sq-heading",text:i.syncQueueTitle})),t.queue.length===0)o.push(d("p",{className:"oxitune-sq-hint",text:X(t.myRole)?i.syncQueueEmpty:i.syncQueueListenerHint}));let r=t.myRole==="host"||t.myRole==="moderator";for(let s of t.queue){let a=[];if(X(t.myRole))a.push(eo(i.syncQueuePlayNow(s.title),qs,()=>n.play(s.id)));if(r||s.added_by_id===t.myId)a.push(eo(i.syncQueueRemove(s.title),Ds,()=>n.remove(s.id)));let l;if(X(t.myRole)&&t.queue.length>1)l=A({label:i.syncQueueDrag(s.title),iconPath:Ji,muted:!0}),l.classList.add("oxitune-sq-handle"),l.dataset.itemId=s.id;let u=i.syncQueueFrom(s.added_by),f=Zi({videoId:s.video_id,title:s.title,sub:s.artist?`${s.artist} · ${u}`:u,actions:a,handle:l});f.classList.add("oxitune-sq-queued"),o.push(f)}e.replaceChildren(...o),Ki(e,no)}var he=null;function bt(){let e=document.documentElement;if(!he){e.removeAttribute(ze);return}let t=document.querySelector("ytmusic-player-page #side-panel"),n=document.getElementById(be);if(t&&n?.parentElement!==t){if(!n)n=d("div",{id:be}),Xi({list:n,rowSelector:Us,handleSelector:no,onMove:(o,r,s)=>he?.actions.move(s,r)});n.setAttribute("role","region"),n.setAttribute("aria-label",m().syncQueueTitle),io(n,he.model,he.actions),t.insertBefore(n,t.querySelector(":scope > #tab-renderer"))}let i=document.querySelector("ytmusic-player-page tp-yt-paper-tab");e.toggleAttribute(ze,!!n?.isConnected&&i?.getAttribute("aria-selected")==="true")}function oo(e,t){he={model:e,actions:t},Bs(m().syncQueueTab),document.documentElement.setAttribute(ht,"");let n=document.getElementById(be);if(n)io(n,e,t);bt()}function an(){he=null,document.documentElement.removeAttribute(ht),document.documentElement.removeAttribute(ze),document.getElementById(be)?.remove(),document.getElementById(sn)?.remove()}function xe(e){if(e.is_host)return"host";let t=e.members.find((n)=>n.id===e.current_user_id);return t?Yi(t):"dj"}function js(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var le=/^[A-Za-z0-9_-]{11}$/,Gs=2,Qs=0.25,Ys=0.05,Ws=3,ro=0.1,Ks=0.5,Xs=1,Js=1000,Zs=1,so=5000,ea=4000,ao=15000,ta=3,na=4000,lo=8000,ia=3,ln=1e4,oa=3,uo=15000,co=1,ra=1e4,sa=5,aa=1e4,la=1.2;function cn(e,t){return Number.isFinite(t)&&t>co?Math.min(e,t-co):e}function ua(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(le.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>Ks)i.seekTo=cn(e.current_time_secs,t.duration);return i}let o=e.current_time_secs+Math.min(Xs,Math.max(0,n)),r=o-t.currentTime;if(Math.abs(r)>Gs)i.seekTo=cn(o,t.duration);else if(Math.abs(r)>(t.correcting?Ys:Qs))i.playbackRate=1+Math.max(-ro,Math.min(ro,r/Ws));return i}class mo{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function ca(e,t){return t!==null&&e<t&&t-e<aa}function po(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var da=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function fo(){return new URLSearchParams(window.location.search).get("v")}function J(e){let t=b.getMoviePlayer(),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&le.test(n)&&typeof i==="number"&&Number.isFinite(i)){let o=t?.getDuration?.();return{videoId:n,currentTime:i,duration:typeof o==="number"&&o>0?o:e?e.duration:NaN}}return{videoId:fo(),currentTime:e?e.currentTime:0,duration:e?e.duration:NaN}}function vt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function ve(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class go{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor(e=_){this.notify=e}lastBroadcast=null;pendingNav=null;transit=new mo;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;userInputAtMs=Number.NEGATIVE_INFINITY;avToggleAtMs=Number.NEGATIVE_INFINITY;pendingSeek=null;recentSeeks=[];seekLoopWarnedAtMs=Number.NEGATIVE_INFINITY;waitingLogged=!1;stall=null;finished=null;rateCorrection=null;setRoomState(e,t,n=!0){let i=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,this.canControl=n,wn(this.isGuest()),!i)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.recentSeeks=[],this.seekLoopWarnedAtMs=Number.NEGATIVE_INFINITY,this.waitingLogged=!1,this.stall=null,this.avToggleAtMs=Number.NEGATIVE_INFINITY,this.pendingSeek=null,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||vt())return;if(ca(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(le.test(e.video_id))this.hostVideoId=e.video_id;let o=this.requestedVideo;if(o){if(e.video_id!==o.videoId&&n-o.atMs<ea)return;this.requestedVideo=null}let r=J(t);if(this.waitingForHostsNext(e,r.videoId,t,n)){if(!this.waitingLogged)this.waitingLogged=!0,L("info","sync",`guest: finished ${e.video_id} before the host, waiting for its next song`);this.endRateCorrection(),b.pause();return}this.waitingLogged=!1;let s={videoId:r.videoId,paused:t?t.paused:!0,currentTime:r.currentTime,duration:r.duration,correcting:this.rateCorrection!==null},a=ua(e,s,i);if(a.navigateTo){this.endRateCorrection();let l=this.pendingNav;if(l&&l.videoId===a.navigateTo&&n-l.atMs<so)return;let u=l&&l.videoId===a.navigateTo?l.attempts+1:1;if(this.pendingNav={videoId:a.navigateTo,atMs:n,attempts:u},this.rememberOwnNav(a.navigateTo,n),L(u>1?"warn":"info","sync",`guest: host plays ${a.navigateTo} at ${e.current_time_secs.toFixed(1)} s, we have ${r.videoId??"nothing"}: `+(u>1?`switch didn't take, full reload (attempt ${u}); ${de()}`:"switching")),b.pause(),u>1)window.location.href=`https://music.youtube.com/watch?v=${a.navigateTo}`;else ve(a.navigateTo);return}if(this.pendingNav=null,!t)return;if(a.setPlaying===!0)b.play();else if(a.setPlaying===!1)b.pause();if(a.seekTo!==null)this.endRateCorrection(),this.logSeek(s.currentTime,a.seekTo,e,n),b.seekTo(a.seekTo);else this.setCatchUpRate(t,a.playbackRate)}waitingForHostsNext(e,t,n,i){let o=this.finished;return!!o&&e.video_id===o.videoId&&i-o.atMs<ra&&o.duration-e.current_time_secs<sa&&(t!==o.videoId||!!n?.ended)}logSeek(e,t,n,i){if(this.recentSeeks=this.recentSeeks.filter((o)=>i-o<ln),this.recentSeeks.push(i),L("info","sync",`guest: seek ${e.toFixed(1)} -> ${t.toFixed(1)} s (host ${n.current_time_secs.toFixed(1)} s, ${n.is_playing?"playing":"paused"})`),this.recentSeeks.length>=ia&&i-this.seekLoopWarnedAtMs>ln)this.seekLoopWarnedAtMs=i,L("warn","sync",`guest: ${this.recentSeeks.length} seeks in ${ln/1000} s; ${de()}`)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>ao)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),L("info","sync",`guest: catching up at ${t.toFixed(3)}x`),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;let{videoId:n,currentTime:i,duration:o}=J(e);if(Number.isFinite(o)&&o>0&&o-i<ta){if(this.nearEndAtMs=t,n)this.finished={videoId:n,duration:o,atMs:t}}}checkPlayer(e){if(!this.inRoom||!e||e.paused||vt())return this.stall=null,!1;let{videoId:t,currentTime:n}=J(e),i=this.stall;if(!i||i.songId!==t||Math.abs(n-i.songTime)>0.05)return this.stall={songId:t,songTime:n,videoTime:e.currentTime,warned:i?.songId===t&&i.warned},!1;if(i.warned||e.currentTime-i.videoTime<oa)return!1;return i.warned=!0,L("warn","player",`YouTube Music's player time is stuck while the video plays on; ${de()}`),!0}noteUserInput(e=Date.now()){this.userInputAtMs=e}noteAvToggle(e=Date.now()){this.avToggleAtMs=e}applyPendingSeek(e,t=Date.now()){let n=this.pendingSeek;if(!n||!e)return;if(!this.isHost||t-n.atMs>uo){this.pendingSeek=null;return}let{videoId:i,duration:o}=J(e);if(i!==n.videoId||!Number.isFinite(o)||o<=0)return;this.pendingSeek=null;let r=cn(n.position+(n.playing?(t-n.atMs)/1000:0),o);L("info","sync",`host: ${i} is the other version of the song, carrying on at ${r.toFixed(1)} s`),b.seekTo(r)}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!this.canControl||!e||!le.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<ao)return null;let i=(o)=>(L("info","sync",`guest: now on ${e}, host on ${this.hostVideoId}: ${o}, not sent; ${de()}`),null);if(t-this.nearEndAtMs<na)return i("autoplay after the song ended");if(t-this.userInputAtMs>lo)return i("YouTube Music switched by itself");if(this.requestedVideo?.videoId===e)return null;if(this.requestedVideo={videoId:e,atMs:t},t-this.avToggleAtMs<lo)return L("info","sync",`guest: switched ${this.hostVideoId} to its other version ${e}, asking the host to keep its place`),{kind:"play_video",video_id:e,keep_position:!0};return L("info","sync",`guest: picked ${e} (host on ${this.hostVideoId}), asking the host to play it`),{kind:"play_video",video_id:e}}requestControl(e,t){if(!this.canControl){if(e.kind!=="next"){this.notify(m().syncListenerOnly);return}t("vote_sync_skip").then(()=>this.notify(m().syncVotedSkip)).catch((n)=>{L("warn","sync",`vote to skip failed: ${String(n)}`),this.notify(m().actionFailed)});return}t("send_sync_control",{action:e}).catch((n)=>{L("warn","sync",`request ${e.kind} to the host failed: ${String(n)}`),this.notify(m().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n,source:i}=e,o=i?.kind==="vote"?m().syncVoteSkipped:i?.kind==="queue"?m().syncFromQueue(i.title,t):null;switch(n.kind){case"next":b.next(),this.notify(o??m().syncGuestNext(t));break;case"previous":b.previous(),this.notify(o??m().syncGuestPrevious(t));break;case"set_playing":{let r=b.getVideo();if(!r||r.paused!==n.playing)return;if(n.playing)b.play();else b.pause();this.notify(o??(n.playing?m().syncGuestResumed(t):m().syncGuestPaused(t)));break}case"play_video":{if(!le.test(n.video_id)||n.video_id===fo())return;if(n.keep_position){let r=b.getVideo();this.pendingSeek={videoId:n.video_id,position:J(r).currentTime,playing:!!r&&!r.paused,atMs:Date.now()},ve(n.video_id);break}ve(n.video_id),this.notify(o??m().syncGuestPicked(t));break}}}advanceQueue(e,t,n){if(!t||vt())return;let{currentTime:i,duration:o}=J(t),r=o-i;if(!Number.isFinite(r)||r>la&&!t.ended)return;this.playNextFromQueue(e,n,t,!1)}playNextFromQueue(e,t,n=b.getVideo(),i=!0,o=Date.now()){if(!this.inRoom||!this.isHost||e===0)return!1;let{videoId:r}=J(n),s=this.queueAdvance;if(s&&s.from===r&&o-s.atMs<so)return!0;this.queueAdvance={from:r,atMs:o};let a=()=>{if(i)b.nextInYtm()};return t("sync_queue_take_next").then((l)=>{let u=l;if(!u||!le.test(u.video_id)){a();return}b.pause(),ve(u.video_id),this.notify(m().syncFromQueue(u.title,u.added_by))}).catch((l)=>{L("warn","sync",`host: playing from the shared queue failed: ${String(l)}`),a()}),!0}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||vt())return;if(this.pendingSeek&&Date.now()-this.pendingSeek.atMs<uo)return;if(t.ended)return;let{videoId:o,currentTime:r}=J(t);if(!o)return;let s=Date.now(),a=this.lastBroadcast,l=a?a.position+(s-a.atMs)/1000*a.rate:0,u=!!a&&a.playing&&!t.paused&&Math.abs(r-l)>Zs,f=!!a&&a.videoId!==o;if(!i&&!u&&!f&&a&&s-a.atMs<Js)return;this.lastBroadcast={atMs:s,videoId:o,position:r,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:o,title:e.title,artist:e.artist,current_time_secs:r,is_playing:!t.paused,timestamp_ms:s}}).catch((p)=>L("warn","sync",`host: broadcast failed: ${String(p)}`))}}var F=null,ue=null,xt=null,j=null,dn=null,ma=1000;function yo(){let e=j,t=ue;if(!e||!t){an();return}let n=dn,i=(o)=>(r)=>{t(o,{itemId:r}).catch((s)=>{L("warn","sync",`${o} failed: ${String(s)}`),_(m().actionFailed)})};oo({queue:e.queue??[],nowPlaying:n?.videoId&&le.test(n.videoId)?{videoId:n.videoId,title:n.title,artist:n.artist}:null,myId:e.current_user_id,myRole:xe(e)},{play:i("sync_queue_play"),remove:i("sync_queue_remove"),move:(o,r)=>{t("sync_queue_move",{itemId:o,toIndex:r}).catch((s)=>{L("warn","sync",`sync_queue_move failed: ${String(s)}`),_(m().actionFailed)})}})}function pa(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function fa(e,t){if(!j||!X(xe(j))){_(m().syncQueueListenerNo);return}if(!e.videoId){_(m().syncQueueSongsOnly);return}t("sync_queue_add",{input:e.videoId,next:e.next}).then(()=>_(e.next?m().syncQueuedNext:m().syncQueued)).catch((n)=>{L("warn","sync",`adding to the shared queue failed: ${String(n)}`),_(m().actionFailed)})}function ho(e){let t=F;if(!t||!ue||!t.isGuest())return!1;let n=b.getVideo(),i=po(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,ue),!0}function bo(e){let t=F;if(!t||!ue||!t.isGuest())return!1;return t.requestControl({kind:"play_video",video_id:e},ue),!0}function un(e,t,n="left"){let i=j;if(j=e,rn(e?{listeners:e.members.length,isHost:e.is_host}:null),yo(),!t)return;if(!e){if(!i)return;_(n==="kicked"?m().syncKicked:n==="lost"?m().syncLost:m().syncRoomClosed);return}if(!i||i.room_id!==e.room_id){if(!e.is_host)_(m().syncConnected);return}if(e.reconnecting){if(!i.reconnecting)_(m().syncReconnecting);return}let o=(p)=>p.members.find((y)=>y.is_host)?.id;if(o(i)!==o(e)){let p=e.members.find((y)=>y.is_host);if(e.is_host)_(m().syncYouHost);else if(p)_(m().syncNewHost(p.nickname));return}if(i.reconnecting)return;let{joined:r,left:s}=js(i.members,e.members,e.current_user_id),a=[...r.map(m().syncJoined),...s.map(m().syncLeft)],l=e.skip_votes??[],u=l.filter((p)=>p!==e.current_user_id&&!(i.skip_votes??[]).includes(p));for(let p of u){let y=e.members.find((g)=>g.id===p)?.nickname;if(y)a.push(m().syncVoteProgress(y,l.length,Wi(e.members.length)))}let f=xe(e);if(f!==xe(i))a.push(f==="moderator"?m().syncRoleModerator:f==="listener"?m().syncRoleListener:m().syncRoleDj);if(a.length>0)_(a.join(" · "))}var vo={id:"sync_room",manifest:qi,name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new go;F=t,ue=e.invoke;let n=[];if(e.events)n.push(e.events.listen("sync-room-updated",(s)=>{t.setRoomState(!0,s.payload.is_host,X(xe(s.payload))),un(s.payload,!0)}),e.events.listen("sync-room-left",(s)=>{t.setRoomState(!1,!1),un(null,!0,s.payload?.reason??"left")}),e.events.listen("sync-playback-remote",(s)=>{t.handleRemotePlayback(s.payload,e.getVideoElement())}),e.events.listen("sync-control-remote",(s)=>{t.applyRemoteControl(s.payload)}),e.events.listen("sync-reaction",(s)=>{zn(s.payload.emoji,s.payload.from)}));let i=(s)=>{if(!(s.target instanceof Element))return;let a=s.target;if(a.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(bt,0);if(t.isInRoom()){let p=a.closest("ytmusic-menu-service-item-renderer"),y=p?to(p.data):null;if(y){s.preventDefault(),s.stopImmediatePropagation(),pa(),fa(y,e.invoke);return}}if(!s.isTrusted)return;if(t.isRoomHost()&&a.closest("ytmusic-player-bar .next-button")&&t.playNextFromQueue(j?.queue?.length??0,e.invoke)){s.preventDefault(),s.stopImmediatePropagation();return}if(!t.isGuest())return;let l=da.find(([p])=>a.closest(p));if(!l)return;let u=e.getVideoElement(),f=po(l[1],u?u.paused:!0);if(!f)return;s.preventDefault(),s.stopImmediatePropagation(),t.requestControl(f,e.invoke)};window.addEventListener("click",i,!0);let o=(s)=>{if(!s.isTrusted)return;if(t.noteUserInput(),s.target instanceof Element&&s.target.closest("ytmusic-av-toggle"))t.noteAvToggle()};window.addEventListener("pointerdown",o,!0),window.addEventListener("keydown",o,!0);let r=setInterval(bt,ma);Ot(()=>t.playNextFromQueue(j?.queue?.length??0,e.invoke)),e.invoke("get_sync_room_state").then((s)=>{if(F!==t||!s||typeof s!=="object")return;let a=s;if(t.setRoomState(!0,a.is_host,X(xe(a))),un(a,!1),!a.is_host&&a.playback_state)t.handleRemotePlayback(a.playback_state,e.getVideoElement())}).catch((s)=>L("warn","sync",`restoring the room after a page load failed: ${String(s)}`)),xt=()=>{n.forEach((s)=>s.then((a)=>a())),window.removeEventListener("click",i,!0),window.removeEventListener("pointerdown",o,!0),window.removeEventListener("keydown",o,!0),clearInterval(r),Ot(null),t.setRoomState(!1,!1),F=null,ue=null,j=null,dn=null,rn(null),an()}},onTrackChange(e,t){let n=F;if(!n)return;if(dn=e,yo(),n.isInRoom()){let o=b.getMoviePlayer()?.getPlayerResponse?.()?.playabilityStatus;if(o?.status&&o.status!=="OK")L("warn","player",`${e.videoId??"?"} won't play here; ${de()}`)}n.applyPendingSeek(t.getVideoElement()),n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){F?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();F?.broadcastLocalState(t.track,n,t.invoke),F?.noteLocalTick(n),F?.checkPlayer(n),F?.applyPendingSeek(n),F?.advanceQueue(j?.queue?.length??0,n,t.invoke)},onDestroy(){if(xt)xt(),xt=null}};var xo={id:"app.oxitune.power",name:"Smart Power & Audio Watchdog",version:"1.0.0",apiVersion:1,description:"Keeps the system awake during playback",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","internal:config","internal:power"],entry:"index.js"};var wt=null,ya=(e,t)=>t&&e!==!1,wo={id:"power_watchdog",manifest:xo,name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,o=(y)=>{if(n===y)return;n=y,e.invoke("set_inhibit_sleep",{inhibit:y}).catch((g)=>{n=!y,console.error("[Oxitune Power] set_inhibit_sleep failed:",g)})},r=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},s=()=>{t?.release().catch(()=>{}),t=null},a=()=>{let y=e.getVideoElement(),g=!!y&&!y.paused&&!y.ended,w=ya(e.config.inhibit_sleep,g);if(o(w),w)r();else s()},l=(y)=>{for(let g of["play","playing","pause","ended"])y.addEventListener(g,a);i=y},u=(y)=>{for(let g of["play","playing","pause","ended"])y.removeEventListener(g,a)},f=e.getVideoElement();if(f)l(f);a();let p=window.setInterval(()=>{let y=e.getVideoElement();if(y&&y!==i){if(i)u(i);l(y),a()}},1000);wt=()=>{if(clearInterval(p),i)u(i);i=null,s(),o(!1)}},onDestroy(){if(wt)wt(),wt=null}};var ko={id:"app.oxitune.remote",name:"Mobile Web Remote",version:"1.0.0",apiVersion:1,description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","internal:remote"],entry:"index.js"};var Eo=(e)=>typeof e==="object"&&e!==null&&!Array.isArray(e),C=(e,...t)=>t.reduce((n,i)=>n==null?void 0:n[i],e),Tt=/^[A-Za-z0-9_-]{11}$/;function we(e){let t=C(e,"runs");if(Array.isArray(t))return t.map((i)=>typeof C(i,"text")==="string"?C(i,"text"):"").join("");let n=C(e,"simpleText");return typeof n==="string"?n:""}function mn(e){if(!Array.isArray(e)||e.length===0)return null;let t=C(e[e.length-1],"url");return typeof t==="string"?t:null}function To(e,t){return we(C(e,"flexColumns",t,"musicResponsiveListItemFlexColumnRenderer","text"))}function ba(e){let t=C(e,"playlistItemData","videoId")??C(e,"overlay","musicItemThumbnailOverlayRenderer","content","musicPlayButtonRenderer","playNavigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Tt.test(t))return null;return{video_id:t,title:To(e,0),subtitle:To(e,1),thumbnail:mn(C(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function va(e){let t=C(e,"title","runs",0,"navigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Tt.test(t))return null;return{video_id:t,title:we(C(e,"title")),subtitle:we(C(e,"subtitle")),thumbnail:mn(C(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function pn(e,t=20){let n=[],i=new Set,o=(r,s)=>{if(n.length>=t||s>40)return;if(Array.isArray(r)){for(let a of r)o(a,s+1);return}if(!Eo(r))return;for(let[a,l]of Object.entries(r)){let u=null;if(a==="musicResponsiveListItemRenderer")u=ba(l);else if(a==="musicCardShelfRenderer")u=va(l);if(u&&!i.has(u.video_id)){if(i.add(u.video_id),n.push(u),n.length>=t)return}o(l,s+1)}};return o(e,0),n}function kt(e){let t=C(e,"playlistPanelVideoRenderer")??C(e,"playlistPanelVideoWrapperRenderer","primaryRenderer","playlistPanelVideoRenderer");return Eo(t)?t:null}function Po(e){let t=[];return e.forEach((n,i)=>{let o=kt(n),r=C(o,"videoId");if(!o||typeof r!=="string")return;t.push({id:`${i}:${r}`,video_id:r,title:we(C(o,"title")),artist:we(C(o,"shortBylineText"))||we(C(o,"longBylineText")),thumbnail:mn(C(o,"thumbnail","thumbnails")),current:C(o,"selected")===!0})}),t}function So(e,t){let n=t.indexOf(":");if(n<=0)return-1;let i=Number(t.slice(0,n)),o=t.slice(n+1),r=Number.isInteger(i)?kt(e[i]):null;if(r&&C(r,"videoId")===o)return i;return e.findIndex((s)=>C(kt(s),"videoId")===o)}function _o(e,t){if(!t)return e.length;let n=e.findIndex((i)=>C(kt(i),"selected")===!0);return n>=0?n+1:e.length}function Lo(e,t,n=15000){if(!e)return!0;let{position_secs:i,sampled_at_ms:o,...r}=e,{position_secs:s,sampled_at_ms:a,...l}=t;if(JSON.stringify(r)!==JSON.stringify(l))return!0;if(a-o>=n)return!0;let u=e.playing?i+(a-o)/1000:i;return Math.abs(s-u)>1.5}var xa="EgWKAQIIAWoMEA4QChADEAQQCRAF",wa=1000,ka=2000;function gn(){return document.querySelector("#queue")}function Ct(){let e=gn()?.queue?.store?.store?.getState().queue?.items;return Array.isArray(e)?e:[]}function Et(e,t){let n=gn();if(!n?.dispatch)throw Error("remote.error.noQueue");n.dispatch({type:e,payload:t})}function Mo(){let e=document.querySelector("ytmusic-app")?.networkManager;if(!e||typeof e.fetch!=="function")throw Error("remote.error.unsupported");return e}async function Ta(e){let t=Mo(),n=pn(await t.fetch("/search",{query:e,params:xa}));if(n.length===0)n=pn(await t.fetch("/search",{query:e}));return n}async function Ea(e,t){let n=gn()?.queue?.store?.store;if(!n)throw Error("remote.error.noQueue");let i=n.getState().queue??{},r=(await Mo().fetch("/music/get_queue",{queueContextParams:i.queueContextParams,queueInsertPosition:t?"INSERT_AFTER_CURRENT_VIDEO":"INSERT_AT_END",videoIds:[e]}))?.queueDatas,s=Array.isArray(r)?r.map((l)=>l&&typeof l==="object"&&("content"in l)?l.content:null).filter(Boolean):[];if(s.length===0)throw Error("remote.error.unsupported");let a=Ct();Et("ADD_ITEMS",{nextQueueItemId:n.getState().queue?.nextQueueItemId,index:_o(a,t),items:s,shuffleEnabled:!1,shouldAssignIds:!0})}function fn(e){let t=So(Ct(),e);if(t<0)throw Error("remote.error.gone");return t}function Pa(){let e=getComputedStyle(document.documentElement),t=e.getPropertyValue("--oxitune-accent-primary").trim(),n=e.getPropertyValue("--oxitune-accent-secondary").trim(),i=e.getPropertyValue("--oxitune-accent").trim();return t&&n&&i?{primary:t,secondary:n,accent:i}:null}function Sa(){let e=b.getVideo(),n=document.getElementById("movie_player")?.getCurrentTime?.();return{playing:!!e&&!e.paused&&!e.ended,position_secs:typeof n==="number"&&Number.isFinite(n)?n:e?.currentTime??0,sampled_at_ms:Date.now(),volume:e?Ee(e)/100:1,muted:e?Pe(e):!1,like:b.getLikeStatus(),shuffle:b.isShuffleOn(),repeat:b.getRepeatMode(),accent:Pa()}}async function _a(e,t){switch(t.kind){case"command":if(t.command==="shuffle")b.toggleShuffle();else if(t.command==="repeat")b.cycleRepeat();else e.sendPlayerCommand(t.command);return null;case"seek":return b.seekTo(t.position_secs),null;case"volume":return b.setVolume(t.volume),null;case"play":if(!Tt.test(t.video_id))throw Error("remote.error.invalid");if(!bo(t.video_id))ve(t.video_id);return null;case"search":return Ta(t.query);case"enqueue":return await Ea(t.video_id,t.next),null;case"queue_jump":return Et("SET_INDEX",fn(t.item_id)),null;case"queue_remove":return Et("REMOVE_ITEM",fn(t.item_id)),null;case"queue_move":{let n=fn(t.item_id),i=Math.max(0,Math.min(t.to_index,Ct().length-1));return Et("MOVE_ITEM",{fromIndex:n,toIndex:i}),null}}}var Pt=[],St=[],_t=null,Lt="";function Io(){St.forEach((e)=>clearInterval(e)),St=[],_t=null,Lt=""}function La(e){if(St.length>0)return;let t=()=>{let i=Sa();if(!Lo(_t,i))return;_t=i,e.invoke("remote_publish",{kind:"state",data:i}).catch(()=>{return})},n=()=>{let i=Po(Ct()),o=JSON.stringify(i);if(o===Lt)return;Lt=o,e.invoke("remote_publish",{kind:"queue",data:i}).catch(()=>{return})};t(),n(),St.push(window.setInterval(t,wa),window.setInterval(n,ka))}function Co(e,t){if(t>0)La(e);else Io()}function Ao(e){let t=e.events;if(!t)return;t.listen("remote-action",({payload:n})=>{if(!n?.action)return;_a(e,n.action).then((i)=>{if(n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!0,data:i??null}).catch(()=>{return});_t=null,Lt=""},(i)=>{let o=i instanceof Error?i.message:String(i);if(console.warn("[Oxitune Remote] action failed:",n.action.kind,o),n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!1,error:o}).catch(()=>{return})})}).then((n)=>Pt.push(n)),t.listen("remote-clients",({payload:n})=>Co(e,n)).then((n)=>Pt.push(n)),e.invoke("remote_clients").then((n)=>Co(e,typeof n==="number"?n:0)).catch(()=>{return})}function Ro(){Pt.forEach((e)=>e()),Pt=[],Io()}var No={id:"web_remote",manifest:ko,name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){Ao(e)},onDestroy(){Ro()}};var Z="oxitune-window-controls",He={minimize:"M5 11.5h14v1H5z",maximize:"M5 5h14v14H5V5zm1 1v12h12V6H6z",restore:"M8 5h11v11h-3v3H5V8h3V5zm1 1v2h7v7h2V6H9zM6 9v9h9V9H6z",close:"M6.7 6 12 11.3 17.3 6l.7.7-5.3 5.3 5.3 5.3-.7.7-5.3-5.3L6.7 18l-.7-.7 5.3-5.3L6 6.7z"},Ca=132,Ma=`
  html:has(#${Z}) ytmusic-nav-bar #right-content {
    right: 0 !important;
    padding-right: 0 !important;
    margin-right: ${Ca+8}px !important;
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
  #${Z} .oxitune-window-close:hover {
    background: #c42b1c;
    color: #fff;
  }
`,Ia=["a","button","input","textarea","select",'[role="button"]','[role="tab"]',"tp-yt-paper-icon-button","yt-icon-button","ytmusic-search-box","ytmusic-settings-button","ytmusic-cast-button","ytmusic-chip-cloud-renderer",`#${Z}`,"#oxitune-nav-slot"].join(", ");async function yn(e){return(await M("window_action",{action:e}))?.maximized===!0}function qe(e){yn(e).then((t)=>{if(e==="toggle_maximize")Ho(t)}).catch((t)=>console.error("[Oxitune] Window action failed:",t))}function Aa(e){if(!(e instanceof Element))return!1;if(!e.closest("ytmusic-nav-bar, #nav-bar-background"))return!1;return e.closest(Ia)===null}function Ra(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var ee=null,Oo=!1,Vo=!1;function zo(){let e=Ra();if(e===Vo)return;Vo=e,yn(e?"enter_fullscreen":"exit_fullscreen").catch((t)=>L("warn","Window",`fullscreen ${e} failed: ${String(t)}`))}function Ho(e){if(!ee)return;let t=e?m().windowRestore:m().windowMaximize;Ye(ee,e?He.restore:He.maximize),ee.setAttribute("aria-label",t),ee.dataset.oxituneTooltip=t}async function qo(){if(!ee)return;Ho(await yn("state").catch(()=>!1))}function Na(){if(Oo)return;Oo=!0,document.addEventListener("mousedown",(t)=>{if(t.button!==0||!Aa(t.target))return;if(t.preventDefault(),t.detail===2)qe("toggle_maximize");else qe("start_dragging")},!0);let e=null;window.addEventListener("resize",()=>{if(e)clearTimeout(e);e=setTimeout(()=>void qo(),150)}),document.addEventListener("fullscreenchange",zo),new MutationObserver(zo).observe(document.documentElement,{subtree:!0,attributes:!0,attributeFilter:["player-fullscreened"]})}function Do(){if(typeof window>"u"||!window.__TAURI__?.core)return;if(Na(),document.getElementById(Z)?.isConnected)return;if(!document.querySelector("ytmusic-nav-bar")||!document.body)return;if(q(),!document.getElementById("oxitune-window-controls-styles")){let i=document.createElement("style");i.id="oxitune-window-controls-styles",i.textContent=Ma,document.head.appendChild(i)}let e=d("div",{id:Z}),t=A({label:m().windowMinimize,iconPath:He.minimize});t.addEventListener("click",()=>qe("minimize")),ee=A({label:m().windowMaximize,iconPath:He.maximize}),ee.addEventListener("click",()=>qe("toggle_maximize"));let n=A({label:m().windowClose,iconPath:He.close});n.classList.add("oxitune-window-close"),n.addEventListener("click",()=>qe("close")),e.append(t,ee,n),document.body.appendChild(e),qo()}var $o=!1,Fo="";function Oa(){if(document.getElementById("oxitune-player-bar-edges")||!document.head)return;let e=document.createElement("style");e.id="oxitune-player-bar-edges",e.textContent=`
  ytmusic-player-bar {
    --ytmusic-player-bar-fullscreen-progress-bar-inset: 0px !important;
  }
`,document.head.appendChild(e)}function De(){Oa();let e=document.documentElement,t=`${Math.max(0,window.innerWidth-e.clientWidth)}px`;if(t===Fo&&e.style.getPropertyValue("--ytmusic-scrollbar-width")===t)return;Fo=t,e.style.setProperty("--ytmusic-scrollbar-width",t)}function Bo(){if($o||typeof window>"u")return;$o=!0,De(),window.addEventListener("resize",De),new ResizeObserver(De).observe(document.documentElement)}var ce=(e)=>{M(e).catch((t)=>{console.error(`[Oxitune] ${e} failed:`,t),_(m().actionFailed)})};function Va(){Ui({onSyncChipClick:()=>ce("toggle_sync_window"),items:[{id:"settings",iconPath:S.tune,label:m().menuSettings,hint:"Ctrl+,",onSelect:()=>ce("toggle_settings_window")},{id:"local",iconPath:S.folderMusic,label:m().menuLocal,onSelect:()=>ce("toggle_local_library_window")},{id:"sync",iconPath:S.group,label:m().menuSync,onSelect:()=>ce("toggle_sync_window")},{id:"remote",iconPath:S.phone,label:m().menuRemote,onSelect:()=>ce("open_remote_pairing")},{id:"mini",iconPath:S.miniPlayer,label:m().menuMiniPlayer,onSelect:()=>ce("toggle_mini_player")}]})}var za={lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!1]};function Uo(e){let t={};for(let[n,[i,o]]of Object.entries(za)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}var Ha=4,jo=2000;async function Go(){console.log("[Oxitune] Initializing desktop integration bridge...");let e={};Va();let t=()=>{ji(),Do(),De()};Bo(),t();let n=setInterval(t,1000);window.addEventListener("pagehide",()=>clearInterval(n));let i=async(c)=>{try{let h=await M("get_config",{},{timeoutMs:c});return h&&typeof h==="object"?h:null}catch(h){return console.warn("[Oxitune] Loading config failed, retrying:",h),null}},o=!1;for(let c=0;c<Ha&&!o;c++){if(c>0)await new Promise((k)=>setTimeout(k,250));let h=await i(2000);if(h)Object.assign(e,h),o=!0}let s=new Ht({track:null,config:e,invoke:M,sendPlayerCommand:(c)=>{y(c)},getVideoElement:()=>b.getVideo(),listen:(c,h)=>It.listen(c,h)},(c,h)=>{if(c instanceof We)c.report("hook",h)});s.register(mi),s.register(ki),s.register(Ei),s.register(Si),s.register(Li),s.register(Mi),s.register(Ni),s.register(Vi),s.register(Hi),s.register(vo),s.register(wo),s.register(No);let a=(c)=>{let h=Ke(c);if(s.disable(c),h)Bn(h)};for(let c of $n({sendPlayerCommand:(h)=>y(h),onSwitchedOff:a}))s.register(c);try{await s.initAll(Uo(e))}catch(c){console.error("[Oxitune] Registry init error:",c)}let l=new Vt,u=0,f=Date.now();async function p(c,h,k){try{await M("update_track_info",{track:{title:c.title,artist:c.artist,album:c.album||null,cover_url:c.coverUrl||null,duration_secs:Math.round(c.durationSecs||0),current_time_secs:Math.round(h),is_playing:k,video_id:c.videoId||null,playlist_id:c.playlistId||null,sampled_at_ms:Date.now()}})}catch(v){console.error("[Oxitune] Failed to sync track info to backend:",v)}}l.onTrackChange(async(c)=>{u=c.currentTimeSecs||0,f=Date.now(),s.handleTrackChange(c),await p(c,c.currentTimeSecs||0,c.isPlaying)}),l.onPlaybackChange(async(c)=>{s.handlePlaybackChange(c);let h=l.getCurrentTrack();if(h)h.isPlaying=c,u=h.currentTimeSecs||0,f=Date.now(),await p(h,h.currentTimeSecs||0,c)}),l.onTick((c)=>{s.handleTick(c);let h=l.getCurrentTrack();if(!h||!h.isPlaying)return;let k=Date.now(),v=(k-f)/1000,x=u+v;if(Math.abs(c-x)>2||v>=15)u=c,f=k,h.currentTimeSecs=Math.round(c),p(h,c,!0)});function y(c){if(ho(c))return;switch(c){case"play":b.play();break;case"pause":case"stop":b.pause();break;case"play_pause":b.playPause();break;case"next":b.next();break;case"previous":b.previous();break;case"like":b.toggleLike();break;case"dislike":b.toggleDislike();break;case"mute":b.toggleMute();break}}let g=(c,h)=>{It.listen(c,(k)=>h(k.payload))};g("plugin-state-changed",(c)=>{if(c&&!c.enabled)s.disable(c.id)}),g("plugin-settings-changed",(c)=>{if(c?.id&&c.values)Ke(c.id)?.setSettings(c.values)}),g("plugin-media-progress",(c)=>{if(c?.plugin)Ke(c.plugin)?.mediaProgress(c)}),g("plugin-media-tools",(c)=>{if(c?.state)Fn().forEach((h)=>h.mediaTools(c))}),g("player-command",(c)=>y(c)),g("tray-command",(c)=>y(c)),g("mpris-command",(c)=>y(c)),g("global-shortcut-event",(c)=>y(c)),g("player-seek",(c)=>b.seekTo(c)),g("mpris-command-seek",(c)=>b.seekTo(c)),g("player-volume",(c)=>b.setVolume(c));let w=(c)=>{Object.assign(e,c);let h=Uo(e);for(let[k,v]of Object.entries(h))if(v)s.enable(k).catch((x)=>console.error(`[Oxitune] Failed to enable plugin ${k}:`,x));else s.disable(k).catch((x)=>console.error(`[Oxitune] Failed to disable plugin ${k}:`,x))};if(g("config-updated",(c)=>{if(c&&typeof c==="object")w(c)}),!o){console.error("[Oxitune] Config not loaded yet; plugins run on defaults until it is.");let c=setInterval(()=>{i(jo).then((h)=>{if(!h||o)return;o=!0,clearInterval(c),w(h)})},jo)}window.addEventListener("keydown",(c)=>{if(c.ctrlKey&&c.key===","||c.key==="F2")c.preventDefault(),ce("toggle_settings_window")}),console.log("[Oxitune] Integration successfully activated.")}var qa=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(qa)if(Dn(),Ln(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>Go());else Go();})();
