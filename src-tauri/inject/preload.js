(()=>{var M=(e,t={},n={})=>{let i=window.__TAURI__?.core;if(!i?.invoke)return Promise.reject(Error("Tauri bridge unavailable"));return new Promise((o,r)=>{let s=setTimeout(()=>r(Error(`Timed out waiting for ${e}`)),n.timeoutMs??8000);i.invoke("oxitune_bridge",{cmd:e,args:t}).then((a)=>{clearTimeout(s),o(a??null)},(a)=>{clearTimeout(s),r(a instanceof Error?a:Error(String(a)))})})},Ue=new Map,Rt=!1;function ur(){if(Rt)return;let e=window.__TAURI__?.core;if(!e?.Channel||!e.invoke)return;Rt=!0;let t=new e.Channel;t.onmessage=(n)=>{let i=Ue.get(n?.event);if(!i)return;for(let o of[...i])try{o({payload:n.payload})}catch(r){console.error(`[Oxitune] ${n.event} handler failed:`,r)}},e.invoke("oxitune_subscribe",{channel:t}).catch((n)=>{Rt=!1,console.error("[Oxitune] Event feed unavailable:",n)})}var Nt={listen(e,t){ur();let n=t,i=Ue.get(e);if(!i)Ue.set(e,i=new Set);return i.add(n),Promise.resolve(()=>{Ue.get(e)?.delete(n)})}};function je(){return document.getElementById("movie_player")}function Pn(e){let t=document.querySelector(e);return t&&"value"in t?t:null}var zt=()=>Pn("ytmusic-player-bar #volume-slider");function Ot(e){return Math.max(0,Math.min(100,Math.round(e)))}function En(e,t){if("step"in e&&Number(e.step)>1)e.step=1;e.value=t}function Se(e){let t=Number(zt()?.value);if(Number.isFinite(t))return Ot(t);let n=je()?.getVolume?.(),i=typeof n==="number"&&Number.isFinite(n)?n:e.volume*100;return Ot(i)}function _e(e){return je()?.isMuted?.()===!0||e.muted}function cr(e,t){En(e,t),e.dispatchEvent(new CustomEvent("change",{bubbles:!0,composed:!0}));let n=Pn("#expand-volume-slider");if(n)En(n,t)}var dr=0.002,mr=0.01,pr=6,fr=2000,Pe={target:-1,writes:0,since:0};function Vt(e){let t=zt();if(!t)return;let n=Number(t.value),i=je();if(!(n>0)||i?.getVolume?.()!==0||_e(e))return;let o=Math.min(mr,n*dr);if(Math.abs(e.volume-o)<0.0001)return;let r=Date.now();if(o!==Pe.target||r-Pe.since>fr)Pe={target:o,writes:0,since:r};if(Pe.writes>=pr)return;Pe.writes++,e.volume=o}function Ge(e,t){if(!Number.isFinite(e))return;let n=Ot(e),i=zt();if(i){cr(i,n),Vt(t);return}let o=je();if(typeof o?.setVolume==="function"){if(o.setVolume(n),n>0&&o.isMuted?.())if(typeof o.unMute==="function")o.unMute();else t.muted=!1;return}if(t.volume=n/100,n>0&&t.muted)t.muted=!1}var Sn=!1;function _n(e){Sn=e}function Y(){return Sn}var Ln=null;function qt(e){Ln=e}function Cn(){return Ln?.()??!1}class b{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){if(Cn())return;this.nextInYtm()}static nextInYtm(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static getMoviePlayer(){return document.getElementById("movie_player")}static seekTo(e){if(isNaN(e))return;let t=this.getMoviePlayer();if(typeof t?.seekTo==="function"){let i=t.getDuration?.(),o=typeof i==="number"&&i>0?i:e;t.seekTo(Math.max(0,Math.min(e,o)),!0);return}let n=this.getVideo();if(n)n.currentTime=Math.max(0,Math.min(e,n.duration||e))}static setVolume(e){let t=this.getVideo();if(t)Ge(e*100,t)}static toggleLike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static getLikeStatus(){let e=document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer")?.getAttribute("like-status");return e==="LIKE"?"like":e==="DISLIKE"?"dislike":"none"}static getRepeatMode(){let e=document.querySelector("ytmusic-player-bar")?.getAttribute("repeat-mode");return e==="ALL"?"all":e==="ONE"?"one":"none"}static isShuffleOn(){return document.querySelector("ytmusic-player-bar")?.hasAttribute("shuffle-on")??!1}static toggleShuffle(){document.querySelector("ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button")?.click()}static cycleRepeat(){document.querySelector("ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button")?.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}function S(e,t,n){if(e!=="info")console[e](`[Oxitune ${t}] ${n}`);M("page_log",{level:e,scope:t,message:n}).catch(()=>{return})}var We=(e)=>typeof e==="number"&&Number.isFinite(e)?e.toFixed(1):"?";function pe(){let e=b.getMoviePlayer(),t=b.getVideo(),n=e?.getPlayerResponse?.()?.playabilityStatus;return[`song=${e?.getVideoData?.()?.video_id??"?"}`,`t=${We(e?.getCurrentTime?.())}/${We(e?.getDuration?.())}`,`video=${We(t?.currentTime)}/${We(t?.duration)}`,`state=${e?.getPlayerState?.()??"?"}`,`paused=${t?t.paused:"?"}`,`ready=${t?t.readyState:"?"}`,t?.error?`mediaError=${t.error.code}`:"",n?.status&&n.status!=="OK"?`playability=${n.status}${n.reason?` (${n.reason})`:""}`:""].filter(Boolean).join(" ")}function Ye(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}function gr(e,t){if(!e?.videoId)return null;if(t&&e.videoId!==t||!e.title?.trim())return"switching";let n=Number(e.lengthSeconds);return{videoId:e.videoId,title:e.title.trim(),artist:e.author?.trim()??"",durationSecs:Number.isFinite(n)&&n>0?Math.floor(n):0,coverUrl:e.thumbnail?.thumbnails?.at(-1)?.url||`https://i.ytimg.com/vi/${e.videoId}/hqdefault.jpg`}}function Mn(e){let t=document.getElementById("movie_player")?.getCurrentTime?.();return typeof t==="number"&&Number.isFinite(t)&&t>=0?t:e.currentTime}var yr=1500,In=8000;function hr(e,t){let n=new URLSearchParams(e);if(!t||n.get("v")!==t)return;return n.get("list")||void 0}function br(e,t){return{title:t?.title?.trim()||"",artist:t?.author?.trim()||"",coverUrl:`https://i.ytimg.com/vi/${e}/hqdefault.jpg`}}var Qe=(e)=>e.trim().replace(/\s+/g," ").toLowerCase();function vr(e,t){return!!e?.trim()&&!!t?.trim()&&Qe(e)===Qe(t)}function xr(e,t){if(!e?.trim()||!t?.trim())return!0;return Qe(e)===Qe(t)}function wr(e,t){if(!e)return"new";if(e.videoId&&t.videoId){if(e.videoId!==t.videoId)return"new"}else if(e.title!==t.title||e.artist!==t.artist)return"new";return e.title!==t.title||e.artist!==t.artist||!e.videoId&&!!t.videoId||!e.coverUrl&&!!t.coverUrl||!e.album&&!!t.album||t.durationSecs>0&&Math.abs(t.durationSecs-e.durationSecs)>1?"metadata":null}var kr=400;function Tr(e,t){return e-t>=kr}class Ht{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;titleMismatch=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(Mn(this.attachedVideo))};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&Tr(Date.now(),this.lastTickMs))this.emitTick(Mn(n))},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",s=i?.album||"",a="";if(i?.artwork&&i.artwork.length>0){let v=i.artwork[i.artwork.length-1];if(v&&v.src)a=v.src}if(!o){let v=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(v)o=v.textContent?.trim()||""}if(!r){let v=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(v){let T=(v.textContent?.trim()||"").split("•").map((A)=>A.trim());if(r=T[0]||"",T.length>1)s=T[1]}}if(!a){let v=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(v&&v.src)a=v.src}if(a.startsWith("//"))a=`https:${a}`;if(a.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(a))a=a.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let l=t?.getVideoData?.(),u=l?.video_id||new URLSearchParams(window.location.search).get("v")||void 0,f=gr(t?.getPlayerResponse?.()?.videoDetails,l?.video_id);if(f==="switching"){let v=Date.now(),x=l?.video_id??"";if(this.titleMismatch?.videoId!==x)this.titleMismatch={videoId:x,sinceMs:v};if(v-this.titleMismatch.sinceMs<In)return null;f=null}let p=!!l?.video_id&&!l.title?.trim();if(f){if(this.titleMismatch=null,u=f.videoId,!vr(f.title,i?.title))o=f.title,r=f.artist,s="",a=f.coverUrl}else if(u&&(p||!xr(l?.title,i?.title))){let v=Date.now();if(this.titleMismatch?.videoId!==u)this.titleMismatch={videoId:u,sinceMs:v};let x=v-this.titleMismatch.sinceMs;if(x<yr)return null;if(p){if(x<In)return null}else{let T=br(u,l);if(!this.titleMismatch.logged)this.titleMismatch.logged=!0,S("info","player",`song ${u}: MediaSession still says "${i?.title??""}", using the player's "${T.title}"`);({title:o,artist:r}=T),s="",a=T.coverUrl}}else this.titleMismatch=null;let y=f?f.durationSecs:0,g=0,w=!1;if(!y&&t&&typeof t.getDuration==="function"){let v=t.getDuration();if(typeof v==="number"&&Number.isFinite(v)&&v>0)y=Math.floor(v)}if(t&&typeof t.getCurrentTime==="function"){let v=t.getCurrentTime();if(typeof v==="number"&&Number.isFinite(v)&&v>=0)g=Math.floor(v),w=!0}if(!y&&e&&Number.isFinite(e.duration)&&e.duration>0)y=Math.floor(e.duration);if(!w&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)g=Math.floor(e.currentTime);let c=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(c&&c.textContent){let v=c.textContent.split("/").map((x)=>x.trim());if(v.length===2){if(!g)g=Ye(v[0]);if(!y)y=Ye(v[1])}}if(!y){let x=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(x){let T=parseInt(x,10);if(!isNaN(T)&&T>0)y=T}}let h=e?!e.paused&&!e.ended:!1;if(!o)return null;let k=hr(window.location.search,u)??(this.currentTrack?.videoId===u?this.currentTrack?.playlistId:void 0);return{title:o,artist:r||"Unknown Artist",album:s||void 0,coverUrl:a||void 0,durationSecs:y,currentTimeSecs:g,isPlaying:h,videoId:u,playlistId:k}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=wr(this.currentTrack,e),n=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((i)=>i(e))}if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}var Er=15000,Pr=100;function Sr(e,t,n,i,o){if(i||o>Er)return"abandon";if(t&&t!==e.video_id)return"abandon";return t===e.video_id&&n?"apply":"wait"}var _r=500,Dt=!1,An=-1/0;function Rn(){return Dt||performance.now()-An<_r}var Lr=()=>document.getElementById("movie_player")?.getVideoData?.()?.video_id||void 0;function Nn(){let e=location.pathname==="/watch"?new URLSearchParams(location.search).get("v"):null;if(!e)return;let t=!1,n=new Set,i=(l)=>{let u=l.target;if(t||!(u instanceof HTMLVideoElement)||u.muted)return;Dt=!0,u.muted=!0,n.add(u)};document.addEventListener("loadstart",i,!0),document.addEventListener("play",i,!0);let o=()=>{if(t)return;if(t=!0,document.removeEventListener("loadstart",i,!0),document.removeEventListener("play",i,!0),n.forEach((l)=>l.muted=!1),n.size>0)An=performance.now();n.clear(),Dt=!1},r=(l,u)=>{let f=()=>{if(clearTimeout(p),u.removeEventListener("seeked",f),!l.autoplay)u.pause();o()},p=setTimeout(f,1000);if(u.addEventListener("seeked",f),b.seekTo(l.position_secs),l.autoplay)u.play().catch(()=>{return});else{u.pause();let y=()=>u.pause();u.addEventListener("play",y),setTimeout(()=>u.removeEventListener("play",y),1500)}},s=Date.now();(async()=>{for(let l=0;;l++)try{return await M("take_resume_session")}catch(u){if(l>=20||window.__TAURI__?.core?.invoke)throw u;await new Promise((f)=>setTimeout(f,100))}})().then((l)=>{let u=l;if(!u||u.video_id!==e)return o();let f=setInterval(()=>{let p=document.querySelector("video"),y=Sr(u,Lr(),!!p&&p.readyState>=1,Y(),Date.now()-s);if(y==="wait")return;if(clearInterval(f),y==="apply"&&p)r(u,p);else o()},Pr)}).catch((l)=>{console.error("[Oxitune] Resume failed:",l),o()})}var Cr=1e4,Mr=2000;function On(e,t){if(e._lact=t,e._fact===-1)e._fact=t}var Ir=(e)=>{if(e.closest('[aria-hidden="true"]'))return!1;return e.getClientRects().length>0};function zn(e){let t=Array.from(e.querySelectorAll("ytmusic-you-there-renderer"));for(let n of t){if(!Ir(n))continue;let i=n.querySelector(".actions yt-button-renderer button, .actions button")??n.querySelector(".actions yt-button-renderer, yt-button-renderer");if(i)return i}return null}var Ft=!1;function Vn(){if(Ft)return;Ft=!0;let e=window,t=()=>{let a=document.querySelector("video");return!!a&&!a.paused&&!a.ended},n=()=>{if(t())On(e,Date.now())},i=setInterval(n,Cr);document.addEventListener("playing",n,!0);let o=()=>{let a=zn(document);if(!a)return;On(e,Date.now()),a.click(),S("info","player",'answered the "still there?" prompt'),setTimeout(()=>{let l=document.querySelector("video");if(l?.paused&&!zn(document))l.play().catch(()=>{return})},500)},r=setInterval(o,Mr),s=()=>setTimeout(o,250);document.addEventListener("pause",s,!0),window.addEventListener("pagehide",()=>{clearInterval(i),clearInterval(r),document.removeEventListener("playing",n,!0),document.removeEventListener("pause",s,!0),Ft=!1})}var Le=1,qn={fetch_lyrics:"internal:lyrics",prefetch_lyrics:"internal:lyrics",refresh_lyrics:"internal:lyrics",get_current_lyrics:"internal:lyrics",set_lyrics_offset:"internal:lyrics",list_lyrics_candidates:"internal:lyrics",pick_lyrics:"internal:lyrics",import_lyrics_offsets:"internal:lyrics",translate_lyrics:"internal:lyrics",romanize_lyrics:"internal:lyrics",set_lyrics_display:"internal:lyrics",get_sync_room_state:"internal:sync",broadcast_sync_state:"internal:sync",send_sync_control:"internal:sync",vote_sync_skip:"internal:sync",send_sync_reaction:"internal:sync",sync_queue_add:"internal:sync",sync_queue_remove:"internal:sync",sync_queue_play:"internal:sync",sync_queue_move:"internal:sync",sync_queue_take_next:"internal:sync",remote_clients:"internal:remote",remote_publish:"internal:remote",remote_reply:"internal:remote",set_inhibit_sleep:"internal:power",toggle_mini_player:"internal:windows",toggle_settings_window:"internal:windows",toggle_local_library_window:"internal:windows",toggle_sync_window:"internal:windows",notify_track_change:"internal:notify"},Hn={"config-updated":"internal:config","set-ambient-enabled":"internal:config","set-ambient-intensity":"internal:config","set-custom-css":"internal:config","set-eq-band":"internal:config","set-eq-all":"internal:config","set-eq-preset":"internal:config","set-preamp":"internal:config","set-crossfade-seconds":"internal:config","set-skip-silence":"internal:config","set-loudness-normalization":"internal:config","set-playback-rate":"internal:config","set-preserves-pitch":"internal:config","lyrics-changed":"internal:lyrics","sync-room-updated":"internal:sync","sync-room-left":"internal:sync","sync-playback-remote":"internal:sync","sync-control-remote":"internal:sync","sync-reaction":"internal:sync","remote-action":"internal:remote","remote-clients":"internal:remote"},Dn=["mp3","m4a","opus","flac"];var Ar=5;class Fn extends Error{}function Rr(e,t){let n=(o)=>t.permissions.includes(o),i=(o)=>new Fn(`${t.id} has no permission for ${o}`);return{apiVersion:Le,manifest:t,get track(){return n("player:read")?e.track:null},set track(o){},config:n("internal:config")?e.config:{},invoke:(o,r,s)=>{let a=qn[o];if(!a||!n(a))return Promise.reject(i(o));return e.invoke(o,r,s)},sendPlayerCommand:(o)=>{if(!n("player:control"))throw i("player control");e.sendPlayerCommand(o)},getVideoElement:()=>n("page")?e.getVideoElement():null,events:{listen:(o,r)=>{let s=Hn[o];if(!s||!n(s))return Promise.reject(i(`event ${o}`));return e.listen(o,r)}}}}class $t{plugins=new Map;enabledPlugins=new Set;contexts=new Map;errors=new Map;host;onError;constructor(e,t=()=>{}){this.host=e,this.onError=t}register(e){if(this.plugins.set(e.id,e),this.contexts.set(e.id,Rr(this.host,e.manifest)),e.defaultEnabled)this.enabledPlugins.add(e.id)}contextOf(e){return this.contexts.get(e)}guard(e,t,n){try{let i=n();if(i&&typeof i.then==="function")return i.catch((o)=>this.failed(e,t,o))}catch(i){this.failed(e,t,i)}return Promise.resolve()}failed(e,t,n){console.error(`[Oxitune] Error in plugin ${e.id} ${t}:`,n);let i=(this.errors.get(e.id)??0)+1;if(this.errors.set(e.id,i),this.onError(e,n),i>=Ar&&this.enabledPlugins.has(e.id))console.warn(`[Oxitune] ${e.id} switched off after ${i} errors`),this.disable(e.id)}reportError(e,t,n){let i=this.plugins.get(e);if(i)this.failed(i,t,n)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){this.enabledPlugins.add(t);let o=this.contexts.get(t);if(n.onInit)await this.guard(n,"onInit",()=>n.onInit(o))}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){this.enabledPlugins.add(e),this.errors.delete(e);let n=this.contexts.get(e);if(t.onInit)await this.guard(t,"onInit",()=>t.onInit(n))}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await this.guard(t,"onDestroy",()=>t.onDestroy())}}each(e,t){for(let n of[...this.enabledPlugins]){let i=this.plugins.get(n),o=this.contexts.get(n);if(i&&o)this.guard(i,e,()=>t(i,o))}}handleTrackChange(e){this.host.track=e,this.each("onTrackChange",(t,n)=>t.onTrackChange?.(e,n))}handlePlaybackChange(e){this.each("onPlaybackChange",(t,n)=>t.onPlaybackChange?.(e,n))}handleTick(e){this.each("onTick",(t,n)=>t.onTick?.(e,n))}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}function $n(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}function m(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var Bn="oxitune-kit-styles",Nr=`
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
`;function z(){if(document.getElementById(Bn))return;let e=document.createElement("style");e.id=Bn,e.textContent=Nr,(document.head||document.documentElement).appendChild(e),Or()}var _={apps:"M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z",tune:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",folderMusic:"M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z",group:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",phone:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",miniPlayer:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",check:"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",close:"M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",fullscreen:"M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",translate:"m12.87 15.07-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z",romanize:"M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z",remove:"M19 13H5v-2h14v2z",add:"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",swap:"M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z",refresh:"M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",play:"M8 5v14l11-7z",pause:"M6 19h4V5H6v14zm8-14v14h4V5h-4z",skipNext:"M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",skipPrevious:"M6 6h2v12H6zm3.5 6 8.5 6V6z",sync:"M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",pip:"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"};function Ce(e,t=24){return $n(e,t,t)}function R(e){let t=m("button",{id:e.id,className:`oxitune-icon-btn${e.muted?" oxitune-icon-btn--muted":""}`});return t.type="button",t.setAttribute("aria-label",e.label),t.dataset.oxituneTooltip=e.label,t.appendChild(Ce(e.iconPath)),t}function Ke(e,t){e.querySelector("svg:not(.oxitune-progress-ring)")?.replaceWith(Ce(t))}var Un=!1;function Or(){if(Un)return;Un=!0;let e=null,t=null,n=null,i=()=>{if(t!==null)clearTimeout(t);t=null,n=null,e?.classList.remove("oxitune-open")},o=(a)=>{let l=a.dataset.oxituneTooltip;if(!l)return;if(!e)e=m("div",{id:"oxitune-tooltip"}),e.setAttribute("role","tooltip"),document.body.appendChild(e);e.textContent=l;let u=a.getBoundingClientRect(),f=e.getBoundingClientRect(),y=u.bottom+8+f.height<window.innerHeight?u.bottom+8:u.top-8-f.height,g=Math.max(8,Math.min(window.innerWidth-f.width-8,u.left+u.width/2-f.width/2));e.style.top=`${y}px`,e.style.left=`${g}px`,e.classList.add("oxitune-open")},r=(a)=>{let l=a.target?.closest?.("[data-oxitune-tooltip]");if(!l||l===n)return;i(),n=l,t=setTimeout(()=>o(l),250)},s=(a)=>{let l=a.relatedTarget;if(n&&l&&n.contains(l))return;i()};document.addEventListener("mouseover",r,!0),document.addEventListener("mouseout",s,!0),document.addEventListener("focusin",r,!0),document.addEventListener("focusout",i,!0),document.addEventListener("mousedown",i,!0)}var oe=null;function L(e,t={}){z();let n=document.getElementById("oxitune-toast-host");if(!n)n=m("div",{id:"oxitune-toast-host"}),n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=n.querySelector(".oxitune-toast"),o=i&&t.id&&i.dataset.toastId===t.id&&!i.classList.contains("oxitune-leaving"),r=o?i:m("div",{className:"oxitune-toast"});if(t.id)r.dataset.toastId=t.id;let a=[m("span",{className:"oxitune-toast-text",text:e})];if(t.action){let{label:u,onClick:f}=t.action,p=m("button",{className:"oxitune-button",text:u});p.type="button",p.addEventListener("click",()=>{jn(),f()}),a.push(p)}if(r.replaceChildren(...a),!o)n.replaceChildren(r);if(oe!==null)clearTimeout(oe);oe=null;let l=t.durationMs??4000;if(l>0)oe=setTimeout(jn,l)}var zr=5,Vr=3000;function Gn(e,t){z();let n=document.getElementById("oxitune-reaction-host");if(!n)n=m("div",{id:"oxitune-reaction-host"}),n.setAttribute("aria-live","polite"),document.body.appendChild(n);let i=m("div",{className:"oxitune-reaction"});i.append(m("span",{className:"oxitune-reaction-emoji",text:e}),m("span",{text:t})),n.appendChild(i);while(n.children.length>zr)n.firstElementChild?.remove();setTimeout(()=>i.remove(),Vr)}function jn(){if(oe!==null)clearTimeout(oe);oe=null;let e=document.querySelector("#oxitune-toast-host .oxitune-toast");if(!e)return;e.classList.add("oxitune-leaving"),setTimeout(()=>e.remove(),150)}function Wn(e){z(),document.getElementById(e.id)?.remove();let t=m("div",{id:e.id,className:"oxitune-scrim"}),n=m("div",{className:"oxitune-dialog"});n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");let i=`${e.id}-title`;n.setAttribute("aria-labelledby",i);let o=m("h2",{id:i,className:"oxitune-dialog-title",text:e.title}),r=m("div",{className:"oxitune-dialog-body"});if(e.body)r.append(...e.body);let s=document.activeElement,a=()=>{document.removeEventListener("keydown",l,!0),t.remove(),s?.focus?.()},l=(f)=>{if(f.key==="Escape")f.stopPropagation(),a()};document.addEventListener("keydown",l,!0),t.addEventListener("click",(f)=>{if(f.target===t)a()});let u=m("div",{className:"oxitune-dialog-actions"});for(let f of e.actions){let p=m("button",{className:`oxitune-button${f.filled?" oxitune-button--filled":""}`,text:f.label});p.type="button",p.addEventListener("click",()=>f.onClick?f.onClick(a):a()),u.appendChild(p)}return n.append(o,r,u),t.appendChild(n),document.body.appendChild(t),u.querySelector("button")?.focus(),{close:a,body:r}}var Yn={menuLabel:"Oxitune",menuSettings:"Settings & equalizer",menuLocal:"Local music",menuSync:"Listen together",menuRemote:"Phone remote",pluginSwitchedOff:(e)=>`“${e}” kept failing and was switched off. You can turn it back on in Settings > Plugins.`,menuMiniPlayer:"Mini player",syncInRoom:"Listening together",syncListeners:(e)=>e===1?"1 listener":`${e} listeners`,syncJoined:(e)=>`${e} joined`,syncLeft:(e)=>`${e} left`,syncRoomClosed:"Listening session ended",syncConnected:"Connected to the listening session",syncGuestNext:(e)=>`${e} skipped to the next song`,syncGuestPrevious:(e)=>`${e} went back a song`,syncGuestPaused:(e)=>`${e} paused`,syncGuestResumed:(e)=>`${e} resumed playback`,syncGuestPicked:(e)=>`${e} picked a song`,syncListenerOnly:"Only DJs can control playback in this session",syncKicked:"The host removed you from the session",syncLost:"Lost connection to the listening session",syncRoleModerator:"Your role: moderator",syncRoleDj:"Your role: DJ. You can control playback",syncRoleListener:"Your role: listener",syncVotedSkip:"You voted to skip this song",syncVoteProgress:(e,t,n)=>`${e} votes to skip (${t}/${n})`,syncVoteSkipped:"The room voted to skip the song",syncFromQueue:(e,t)=>`From the shared queue: ${e} · ${t}`,syncReconnecting:"Reconnecting to the listening session…",syncNewHost:(e)=>`${e} is hosting the session now`,syncYouHost:"You’re hosting the session now",syncQueueTab:"Queue",syncQueueTitle:"Shared queue",syncQueueNowPlaying:"Now playing",syncQueueEmpty:"Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.",syncQueueListenerHint:"DJs add songs here. You can vote to skip with the next button.",syncQueueFrom:(e)=>`from ${e}`,syncQueuePlayNow:(e)=>`Play “${e}” now`,syncQueueRemove:(e)=>`Remove “${e}” from the queue`,syncQueueDrag:(e)=>`Move “${e}”: drag, or use the arrow keys`,syncQueued:"Added to the shared queue",syncQueuedNext:"Plays next in the shared queue",syncQueueSongsOnly:"Only single songs go into the shared queue",syncQueueListenerNo:"Listeners can’t add songs to the shared queue",pipButton:"Picture-in-picture",close:"Close",lyricsLoading:"Loading lyrics…",lyricsNone:"Lyrics aren’t available for this song",lyricsSource:(e)=>`Source: ${e}`,lyricsLocalFiles:"Local files",lyricsWrong:"Wrong lyrics?",lyricsPickTitle:"Choose lyrics",lyricsPickLoading:"Looking for other versions…",lyricsPickNone:"No other versions found",lyricsPickFailed:"Couldn’t switch the lyrics",lyricsSearchAgainTip:"Forget these lyrics and look them up again",lyricsTimed:"Timed",lyricsTextOnly:"Text only",lyricsCurrent:"Current",lyricsEarlier:"Show lyrics earlier",lyricsLater:"Show lyrics later",lyricsResetTip:"Reset timing",lyricsTranslateTip:"Show a translation under each line",lyricsTranslateFailed:"Couldn’t translate these lyrics",lyricsRomanizeTip:"Show lyrics written in other scripts in Latin letters too",lyricsRomanizeFailed:"Couldn’t romanize these lyrics",lyricsResumeSync:"Follow the song",playerPrevious:"Previous",playerNext:"Next",playerPlay:"Play",playerPause:"Pause",actionFailed:"Something went wrong. Try again.",volumeLevel:(e)=>`Volume: ${e}%`,windowMinimize:"Minimize",windowMaximize:"Maximize",windowRestore:"Restore down",windowClose:"Close",tipMenuTitle:"Everything Oxitune adds",tipMenuBody:"This button opens Settings and the equalizer, the mini player, local music, Listen together and the phone remote.",tipPlayerTitle:"Volume and lyrics",tipPlayerBody:"Scroll over the player bar to change the volume. While a song plays, its synced lyrics are in the Lyrics tab.",tipShortcutsTitle:"Shortcuts",tipShortcutsBody:"Ctrl+, or F2 opens Settings. Media keys and your global shortcuts work even when Oxitune is in the background.",tipNext:"Next",tipDone:"Got it",tipSkip:"Skip tips"},qr={menuLabel:"Oxitune",menuSettings:"Ustawienia i korektor",menuLocal:"Muzyka lokalna",menuSync:"Słuchaj razem",menuRemote:"Pilot w telefonie",pluginSwitchedOff:(e)=>`Wtyczka „${e}” ciągle zgłaszała błędy i została wyłączona. Możesz ją włączyć ponownie w Ustawieniach > Wtyczki.`,menuMiniPlayer:"Miniodtwarzacz",syncInRoom:"Słuchacie razem",syncListeners:(e)=>{if(e===1)return"1 słuchacz";let t=e%100,n=e%10;return n>=2&&n<=4&&(t<12||t>14)?`${e} słuchacze`:`${e} słuchaczy`},syncJoined:(e)=>`${e} dołącza do słuchania`,syncLeft:(e)=>`${e} opuszcza słuchanie`,syncRoomClosed:"Wspólne słuchanie zakończone",syncConnected:"Połączono ze wspólnym słuchaniem",syncGuestNext:(e)=>`${e} przełącza na następny utwór`,syncGuestPrevious:(e)=>`${e} wraca do poprzedniego utworu`,syncGuestPaused:(e)=>`${e} wstrzymuje odtwarzanie`,syncGuestResumed:(e)=>`${e} wznawia odtwarzanie`,syncGuestPicked:(e)=>`${e} włącza inny utwór`,syncListenerOnly:"W tej sesji odtwarzaniem sterują tylko DJ-e",syncKicked:"Gospodarz usunął Cię z sesji",syncLost:"Utracono połączenie ze wspólnym słuchaniem",syncRoleModerator:"Twoja rola: moderator",syncRoleDj:"Twoja rola: DJ. Możesz sterować odtwarzaniem",syncRoleListener:"Twoja rola: słuchacz",syncVotedSkip:"Twój głos za pominięciem utworu został oddany",syncVoteProgress:(e,t,n)=>`${e} głosuje za pominięciem (${t}/${n})`,syncVoteSkipped:"Słuchacze przegłosowali pominięcie utworu",syncFromQueue:(e,t)=>`Ze wspólnej kolejki: ${e} · ${t}`,syncReconnecting:"Łączenie ponownie ze wspólnym słuchaniem…",syncNewHost:(e)=>`${e} prowadzi teraz sesję`,syncYouHost:"Teraz Ty prowadzisz sesję",syncQueueTab:"Kolejka",syncQueueTitle:"Wspólna kolejka",syncQueueNowPlaying:"Teraz gra",syncQueueEmpty:"Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.",syncQueueListenerHint:"Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.",syncQueueFrom:(e)=>`od: ${e}`,syncQueuePlayNow:(e)=>`Zagraj teraz: „${e}”`,syncQueueRemove:(e)=>`Usuń z kolejki: „${e}”`,syncQueueDrag:(e)=>`Przesuń „${e}”: przeciągnij albo użyj strzałek`,syncQueued:"Dodano do wspólnej kolejki",syncQueuedNext:"Zagra jako następny we wspólnej kolejce",syncQueueSongsOnly:"Do wspólnej kolejki trafiają tylko pojedyncze utwory",syncQueueListenerNo:"Słuchacze nie dodają utworów do wspólnej kolejki",pipButton:"Obraz w obrazie",close:"Zamknij",lyricsLoading:"Wczytywanie tekstu…",lyricsNone:"Tekst tego utworu jest niedostępny",lyricsSource:(e)=>`Źródło: ${e}`,lyricsLocalFiles:"Pliki lokalne",lyricsWrong:"Zły tekst?",lyricsPickTitle:"Wybierz tekst",lyricsPickLoading:"Szukanie innych wersji…",lyricsPickNone:"Nie znaleziono innych wersji",lyricsPickFailed:"Nie udało się zmienić tekstu",lyricsSearchAgainTip:"Zapomnij ten tekst i wyszukaj go od nowa",lyricsTimed:"Z synchronizacją",lyricsTextOnly:"Sam tekst",lyricsCurrent:"Obecny",lyricsEarlier:"Pokazuj tekst wcześniej",lyricsLater:"Pokazuj tekst później",lyricsResetTip:"Zresetuj synchronizację",lyricsTranslateTip:"Pokazuj tłumaczenie pod każdą linijką",lyricsTranslateFailed:"Nie udało się przetłumaczyć tego tekstu",lyricsRomanizeTip:"Pokazuj tekst w innych alfabetach także literami łacińskimi",lyricsRomanizeFailed:"Nie udało się zapisać tego tekstu literami łacińskimi",lyricsResumeSync:"Podążaj za utworem",playerPrevious:"Poprzedni",playerNext:"Następny",playerPlay:"Odtwórz",playerPause:"Wstrzymaj",actionFailed:"Coś poszło nie tak. Spróbuj ponownie.",volumeLevel:(e)=>`Głośność: ${e}%`,windowMinimize:"Minimalizuj",windowMaximize:"Maksymalizuj",windowRestore:"Przywróć w dół",windowClose:"Zamknij",tipMenuTitle:"Wszystko, co dodaje Oxitune",tipMenuBody:"Ten przycisk otwiera Ustawienia i korektor, miniodtwarzacz, muzykę lokalną, Słuchaj razem i pilota w telefonie.",tipPlayerTitle:"Głośność i teksty",tipPlayerBody:"Przewiń kółkiem nad paskiem odtwarzacza, żeby zmienić głośność. Gdy gra utwór, jego tekst z synchronizacją jest w karcie Tekst.",tipShortcutsTitle:"Skróty",tipShortcutsBody:"Ctrl+, lub F2 otwiera Ustawienia. Klawisze multimedialne i Twoje skróty globalne działają też, gdy Oxitune jest w tle.",tipNext:"Dalej",tipDone:"Rozumiem",tipSkip:"Pomiń wskazówki"},Hr={en:Yn,pl:qr};function Dr(e){let t=(e||"").toLowerCase().split(/[-_]/)[0];return Hr[t]??Yn}var Bt=null;function d(){if(!Bt){let e=typeof document<"u"?document.documentElement.lang:"";Bt=Dr(e||(typeof navigator<"u"?navigator.language:"en"))}return Bt}var Fr=200;function $r(e,t=document){let n=t.head||t.documentElement;if(n)return n.appendChild(e),()=>{return};let i=new MutationObserver(()=>{let o=t.head||t.documentElement;if(!o)return;i.disconnect(),o.appendChild(e)});return i.observe(t,{childList:!0}),()=>i.disconnect()}class Xe{id;name;description;defaultEnabled=!0;manifest;settingsValues;styles;factory;hooks=null;started=!1;track=null;playing=!1;trackListeners=new Set;playbackListeners=new Set;tickListeners=new Set;settingsListeners=new Set;mediaListeners=new Set;toolsListeners=new Set;toolsWaiters=new Set;unloaders=[];styleRemovers=[];constructor(e,t){this.manifest=e.manifest,this.id=e.manifest.id,this.name=e.manifest.name,this.description=e.manifest.description,this.settingsValues={...e.settings},this.styles=e.styles,this.factory=t}has(e){return this.manifest.permissions.includes(e)}report(e,t){console.error(`[Oxitune plugin ${this.id}] ${e}:`,t);let n=`${e}: ${t instanceof Error?t.message:String(t)}`;M("plugin_error",{id:this.id,message:n}).then((i)=>{if(i===!0)this.hooks?.onSwitchedOff(this.id)}).catch(()=>{return})}safe(e,t){return(...n)=>{try{let i=t(...n);if(i instanceof Promise)i.catch((o)=>this.report(e,o))}catch(i){this.report(e,i)}}}listenOn(e,t,n){let i=this.safe(t,n);return e.add(i),()=>e.delete(i)}addStyle(e){let t=document.createElement("style");t.dataset.oxitunePlugin=this.id,t.textContent=String(e);let n=$r(t),i=()=>{n(),t.remove()};return this.styleRemovers.push(i),i}buildApi(){let e=this.id,t=`[${e}]`,n={apiVersion:Le,plugin:{id:e,name:this.manifest.name,version:this.manifest.version},log:{info:(...i)=>console.info(t,...i),warn:(...i)=>console.warn(t,...i),error:(...i)=>console.error(t,...i)},onUnload:(i)=>{this.unloaders.push(this.safe("onUnload",i))},settings:{all:()=>({...this.settingsValues}),get:(i)=>this.settingsValues[i],onChange:(i)=>this.listenOn(this.settingsListeners,"settings.onChange",i)}};if(this.has("player:read")){let i=this.has("player:control"),o=(r)=>()=>this.hooks?.sendPlayerCommand(r);n.player={getTrack:()=>this.track?{...this.track}:null,isPlaying:()=>this.playing,onTrackChange:(r)=>this.listenOn(this.trackListeners,"player.onTrackChange",r),onPlaybackChange:(r)=>this.listenOn(this.playbackListeners,"player.onPlaybackChange",r),onTick:(r)=>this.listenOn(this.tickListeners,"player.onTick",r),canSeekAutomatically:()=>!Y(),...i?{play:o("play"),pause:o("pause"),playPause:o("play_pause"),next:o("next"),previous:o("previous"),seek:(r)=>{if(Number.isFinite(r)&&r>=0)b.seekTo(r)},setVolume:(r)=>{if(Number.isFinite(r))b.setVolume(Math.min(1,Math.max(0,r)))}}:{}}}if(this.has("page"))n.page={document,getVideo:()=>b.getVideo()};if(this.has("storage"))n.storage={get:(i)=>M("plugin_storage_get",{id:e,key:String(i)}),set:(i,o)=>M("plugin_storage_set",{id:e,key:String(i),value:o}).then(()=>{return}),remove:(i)=>M("plugin_storage_remove",{id:e,key:String(i)}).then(()=>{return}),keys:()=>M("plugin_storage_keys",{id:e}).then((i)=>Array.isArray(i)?i:[])};if(this.has("network")){let i=(o)=>M("plugin_fetch",{id:e,url:String(o)},{timeoutMs:15000}).then((r)=>String(r??""));n.net={fetchText:i,fetchJson:(o)=>i(o).then((r)=>JSON.parse(r))}}if(this.has("media:save"))n.media={formats:Dn,save:(i,o)=>M("plugin_media_save",{id:e,videoId:String(i),format:String(o?.format??"mp3")}).then((r)=>String(r)),cancel:(i)=>M("plugin_media_cancel",{id:e,job:String(i)}).then(()=>{return}),onProgress:(i)=>this.listenOn(this.mediaListeners,"media.onProgress",i),tools:()=>M("plugin_media_tools_status",{id:e}).then((i)=>i),installTools:()=>new Promise((i,o)=>{let r=(s)=>{if(s.state==="done"||s.state==="declined"||s.state==="failed")this.toolsWaiters.delete(r),i(s.state)};this.toolsWaiters.add(r),M("plugin_media_install_tools",{id:e}).catch((s)=>{this.toolsWaiters.delete(r),o(s)})}),onToolsProgress:(i)=>this.listenOn(this.toolsListeners,"media.onToolsProgress",i)};if(this.has("ui"))n.ui={toast:(i,o)=>{let r=o?.action;L(String(i).slice(0,Fr),{id:o?.id?`${e}:${String(o.id)}`:void 0,durationMs:typeof o?.durationMs==="number"?Math.min(Math.max(o.durationMs,1000),60000):void 0,action:r?{label:String(r.label).slice(0,40),onClick:this.safe("ui.toast action",()=>r.onClick())}:void 0})},addStyle:(i)=>this.addStyle(i)};return Object.freeze(n)}start(e){if(this.hooks=e,this.started)return;if(this.started=!0,this.has("ui"))this.styles.forEach((n)=>this.addStyle(n));let t=this.has("page");try{this.factory(this.buildApi(),t?window:void 0,t?window:void 0,t?window:void 0,t?document:void 0,void 0,void 0)}catch(n){this.report("startup",n)}}mediaTools(e){if(!this.has("media:save"))return;this.toolsListeners.forEach((t)=>t({...e})),[...this.toolsWaiters].forEach((t)=>t(e))}mediaProgress(e){this.mediaListeners.forEach((t)=>t({...e}))}setSettings(e){this.settingsValues={...e};let t={...e};this.settingsListeners.forEach((n)=>n(t))}onInit(e){if(this.hooks)this.start(this.hooks)}onTrackChange(e){this.track={...e},this.trackListeners.forEach((t)=>t({...e}))}onPlaybackChange(e){this.playing=e,this.playbackListeners.forEach((t)=>t(e))}onTick(e){this.tickListeners.forEach((t)=>t(e))}onDestroy(){for(let e of this.unloaders.splice(0))e();this.styleRemovers.splice(0).forEach((e)=>e()),this.trackListeners.clear(),this.playbackListeners.clear(),this.tickListeners.clear(),this.settingsListeners.clear(),this.mediaListeners.clear(),this.toolsListeners.clear()}}var fe=new Map,Ut=null;function Br(e){if(!e||typeof e!=="object")return!1;let t=e;return!!t.manifest&&typeof t.manifest.id==="string"&&Array.isArray(t.manifest.permissions)&&!!t.settings&&typeof t.settings==="object"&&Array.isArray(t.styles)}function Qn(){if(typeof window>"u"||"__oxituneDefinePlugin"in window)return;Object.defineProperty(window,"__oxituneDefinePlugin",{value:(e,t)=>{if(!Br(e)||typeof t!=="function"||fe.has(e.manifest.id))return;if(e.manifest.apiVersion!==Le)return;let n=new Xe(e,t);if(fe.set(n.id,n),e.manifest.runAt==="document-start")n.start({sendPlayerCommand:(i)=>Ut?.sendPlayerCommand(i),onSwitchedOff:(i)=>Ut?.onSwitchedOff(i)})},enumerable:!1,writable:!1,configurable:!1})}function Kn(e){Ut=e;for(let t of fe.values())t.start(e);return[...fe.values()]}function Xn(){return[...fe.values()]}function Je(e){return fe.get(e)}function Jn(e){L(d().pluginSwitchedOff(e.name))}var Zn={id:"app.oxitune.lyrics",name:"Native Synced Lyrics",version:"1.0.0",apiVersion:1,description:"Synchronized lyrics from several providers in the native Lyrics tab and in full screen: word by word, with translation, romanization and seek-on-click",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:config","internal:lyrics"],entry:"index.js"};var jr=20;function ei(e,t){if(!t||e?.videoDetails?.videoId!==t)return[];let n=e.microformat?.microformatDataRenderer?.tags;if(!Array.isArray(n))return[];return n.filter((i)=>typeof i==="string"&&i.trim()!=="").slice(0,jr)}var jt=(e)=>(e?.runs??[]).map((t)=>t.text??"").join("").trim();function ti(e){let t=Array.from(e),n=t.findIndex((a)=>a.hasAttribute("selected"));if(n<0)return null;let i=t[n+1]?.data,o=i?.videoId,r=jt(i?.title);if(!o||!/^[A-Za-z0-9_-]{11}$/.test(o)||!r)return null;let s=Ye(jt(i?.lengthText));return{videoId:o,title:r,artist:jt(i?.shortBylineText),durationSecs:s>0?s:null}}var Q={video_id:null,provider:null,synced:[],plain:null,offset_secs:0,source_url:null};function Gr(e,t){let n=0,i=e.length-1,o=-1;while(n<=i){let r=n+i>>1;if(e[r].t<=t)o=r,n=r+1;else i=r-1}return o}function oi(e,t,n){return Gr(e,t+n)}var Wr=0.6,Yr=6;function Ze(e,t){let n=e[t],i=e[t+1]?.t;if(typeof n.end==="number"&&n.end>=n.t)return i===void 0?n.end:Math.min(n.end,Math.max(i,n.t));return i??n.t+Yr}function ri(e,t,n,i){let o=e[t];if(!o||n<=o.t)return 0;let r=e[t+1]?.t??Math.min(i??1/0,o.t+Wr*3),s=typeof o.end==="number"&&o.end>o.t?o.end:Math.max(r,o.t+0.05);return Math.min(1,(n-o.t)/(s-o.t))}var Qr=0.11,Kr=1.5;function si(e,t,n){let i=e.match(/\S+\s*/g)??[],o=i.map((l)=>Math.max(1,l.trim().length)),r=o.reduce((l,u)=>l+u,0);if(r===0||!(n>t))return[];let s=Math.min((n-t)*0.92,Math.max(Kr,r*Qr)),a=t;return i.map((l,u)=>{let f=a+s*o[u]/r,p={t:a,text:l,end:f};return a=f,p})}var ni=7;function ai(e){let t=[];if(e.length===0)return t;if(e[0].t>=ni)t.push({before:0,from:0,to:e[0].t});for(let n=1;n<e.length;n++){let i=e[n-1].end;if(typeof i==="number"&&e[n].t-i>=ni)t.push({before:n,from:i,to:e[n].t})}return t}function Wt(e,t){switch(e){case"local":return t;case"lrcred":return"lrc.red";case"lrclib":return"LRCLIB";case"unison":return"Unison";case"musixmatch":return"Musixmatch";case"netease":return"NetEase";case"ytm":return"YouTube Music";case"genius":return"Genius";default:return e||""}}var Gt=(e)=>typeof e==="number"&&Number.isFinite(e);function ii(e){if(!Array.isArray(e))return;let t=e.filter((n)=>Gt(n?.t)&&typeof n?.text==="string").map((n)=>Gt(n.end)?{t:n.t,text:n.text,end:n.end}:{t:n.t,text:n.text});return t.length>0?t:void 0}function Xr(e){let t={t:e.t,text:e.text},n=ii(e.words);if(n)t.words=n;if(Gt(e.end))t.end=e.end;if(e.alt===!0)t.alt=!0;let i=e.bg;if(i&&typeof i.text==="string"&&i.text.trim()!==""){let o=ii(i.words);t.bg=o?{text:i.text,words:o}:{text:i.text}}return t}function Yt(e){let t=e&&typeof e==="object"?e:{};return{video_id:typeof t.video_id==="string"?t.video_id:null,lines:Array.isArray(t.lines)?t.lines.map((n)=>typeof n==="string"&&n.trim()!==""?n:null):[]}}function Me(e){if(!e||typeof e!=="object")return{...Q};let t=e;return{video_id:typeof t.video_id==="string"?t.video_id:null,provider:typeof t.provider==="string"?t.provider:null,synced:Array.isArray(t.synced)?t.synced.filter((n)=>typeof n?.t==="number"&&typeof n?.text==="string").map((n)=>Xr(n)):[],plain:typeof t.plain==="string"?t.plain:null,offset_secs:typeof t.offset_secs==="number"&&Number.isFinite(t.offset_secs)?t.offset_secs:0,source_url:typeof t.source_url==="string"?t.source_url:null}}var li=`
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
`;var Ie={translation:null,romanization:null},Jr=5000;function Zr(e,t){return e.findIndex((n)=>t>=n.from&&t<n.to)}function es(e,t){let n=(t-e.from)/Math.max(0.001,e.to-e.from);return Math.max(0,Math.min(3,Math.floor(n*3)+1))}function ts(e,t){if(e<=0||!Number.isFinite(t))return-1;return Math.max(0,Math.min(e-1,Math.floor(t*e)))}var ns=["classic","spotlight","centered","accent","compact","karaoke"],ui=(e)=>ns.includes(e)?e:"classic";class Ae{opts;root;list;resume;lyrics={...Q};rows=[];gaps=[];gapSpans=[];active=-1;activeGap=-1;plainShown=-1;holdUntil=0;constructor(e){this.opts=e;this.root=m("div",{className:"oxitune-lyrics-view"}),this.list=m("div",{className:"oxitune-lyrics-lines"}),this.resume=m("button",{className:"oxitune-chip oxitune-lyrics-resume",text:e.resumeLabel}),this.resume.type="button",this.resume.hidden=!0,this.root.append(this.list,this.resume),this.list.addEventListener("click",(n)=>{let i=n.target?.closest(".oxitune-lyric-line[data-line]"),o=i?this.lyrics.synced[Number(i.dataset.line)]:void 0;if(o)this.opts.onSeek(Math.max(0,o.t-this.lyrics.offset_secs))});let t=()=>this.holdScroll();this.root.addEventListener("wheel",t,{passive:!0}),this.root.addEventListener("touchmove",t,{passive:!0}),this.resume.addEventListener("click",()=>{this.releaseScroll(),this.scrollToCurrent()})}setEffects(e){this.root.classList.toggle("oxitune-lyrics-effects",e)}setTheme(e){this.root.dataset.theme=e}get hasLines(){return this.rows.length>0}setLyrics(e,t){this.lyrics=e,this.active=-1,this.activeGap=-1,this.plainShown=-1,this.releaseScroll(),this.rows=[],this.gaps=[];let n=[];if(e.synced.length>0){let i=ai(e.synced);e.synced.forEach((o,r)=>{let s=i.find((p)=>p.before===r);if(s){let p=this.buildGap(s);this.gaps.push(p),n.push(p.el)}let a=m("div",{className:"oxitune-lyric-line"});if(a.dataset.line=String(r),o.alt)a.classList.add("oxitune-alt");let l=o.words?.length?o.words:si(o.text,o.t,Ze(e.synced,r)),u=this.buildText("oxitune-lyric-main",o.text,l);a.append(u.el);let f=null;if(o.bg){let p=this.buildText("oxitune-lyric-bg",o.bg.text,o.bg.words);a.append(p.el),f=p.run}this.rows.push({el:a,main:u.run,bg:f}),n.push(a)})}else if(e.plain)for(let i of e.plain.split(`
`)){let o=m("div",{className:"oxitune-lyric-line oxitune-plain"});if(i.trim()==="")o.classList.add("oxitune-empty");o.append(m("div",{className:"oxitune-lyric-main",text:i})),this.rows.push({el:o,main:null,bg:null}),n.push(o)}this.gapSpans=this.gaps.map((i)=>i.gap),this.list.replaceChildren(...n),this.root.classList.toggle("oxitune-lyrics-plain",e.synced.length===0),this.setExtras(t)}setExtras(e){this.rows.forEach((t,n)=>{this.setSubline(t.el,"oxitune-lyric-roman",e.romanization?.[n]??null),this.setSubline(t.el,"oxitune-lyric-trans",e.translation?.[n]??null)})}setOffset(e){this.lyrics={...this.lyrics,offset_secs:e}}update(e,t){let n=this.lyrics.synced;if(n.length===0)return;let i=e+this.lyrics.offset_secs,o=Zr(this.gapSpans,i),r=oi(n,e,this.lyrics.offset_secs);if(o>=0&&r>=0&&i>=Ze(n,r))r=-1;if(o!==this.activeGap){if(this.gaps[this.activeGap]?.el.classList.remove("oxitune-active"),this.activeGap=o,this.gaps[o]?.el.classList.add("oxitune-active"),t&&o>=0)this.scrollTo(this.gaps[o].el)}let s=this.gaps[o];if(s){let l=es(s.gap,i);if(l!==s.lit)s.lit=l,s.dots.forEach((u,f)=>u.classList.toggle("oxitune-lit",f<l))}if(r!==this.active){let l=this.rows[this.active];if(l)l.el.classList.remove("oxitune-active"),this.clearFill(l.main),this.clearFill(l.bg);this.rows[this.active-1]?.el.classList.remove("oxitune-near"),this.rows[this.active+1]?.el.classList.remove("oxitune-near"),this.active=r;let u=this.rows[r];if(u){if(u.el.classList.add("oxitune-active"),this.rows[r-1]?.el.classList.add("oxitune-near"),this.rows[r+1]?.el.classList.add("oxitune-near"),t)this.scrollTo(u.el)}}let a=this.rows[r];if(a){let l=Ze(n,r);this.fill(a.main,i,l),this.fill(a.bg,i,l)}}updatePlain(e,t){if(this.lyrics.synced.length>0||!t)return;let n=ts(this.rows.length,e);if(n===this.plainShown)return;this.plainShown=n;let i=this.rows[n];if(i)this.scrollTo(i.el)}scrollToCurrent(){(this.gaps[this.activeGap]?.el??this.rows[this.active]?.el??this.rows[this.plainShown]?.el)?.scrollIntoView({behavior:"smooth",block:"center"})}scrollTo(e){if(Date.now()<this.holdUntil)return;if(!this.resume.hidden)this.releaseScroll();e.scrollIntoView({behavior:"smooth",block:"center"})}holdScroll(){if(this.rows.length===0)return;this.holdUntil=Date.now()+Jr,this.resume.hidden=!1,this.root.classList.add("oxitune-lyrics-browsing")}releaseScroll(){this.holdUntil=0,this.resume.hidden=!0,this.root.classList.remove("oxitune-lyrics-browsing")}buildText(e,t,n){let i=m("div",{className:e});if(!n||n.length===0)return i.textContent=t,{el:i,run:null};i.classList.add("oxitune-has-words");let o=n.map((r)=>m("span",{className:"oxitune-lyric-word",text:r.text}));return i.append(...o),{el:i,run:{words:n,els:o,shown:n.map(()=>0)}}}buildGap(e){let t=m("div",{className:"oxitune-lyric-gap"});t.setAttribute("aria-hidden","true");let n=[0,1,2].map(()=>m("span",{className:"oxitune-lyric-dot"}));return t.append(...n),{gap:e,el:t,dots:n,lit:0}}setSubline(e,t,n){let i=e.querySelector(`:scope > .${t}`);if(!n){i?.remove();return}if(i){if(i.textContent!==n)i.textContent=n;return}let o=m("div",{className:t,text:n});if(t==="oxitune-lyric-roman")e.querySelector(":scope > .oxitune-lyric-main")?.after(o);else e.append(o)}fill(e,t,n){if(!e)return;for(let i=0;i<e.words.length;i++){let o=ri(e.words,i,t,n);if(o===e.shown[i])continue;e.shown[i]=o;let r=e.els[i];if(o>0)r.style.setProperty("--oxitune-fill",o>=1?"1":o.toFixed(3));else r.style.removeProperty("--oxitune-fill")}}clearFill(e){if(!e)return;e.els.forEach((t,n)=>{if(e.shown[n]===0)return;e.shown[n]=0,t.style.removeProperty("--oxitune-fill")})}}var Qt=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function ci(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let s=r.getImageData(0,0,16,16).data,a=0,l=0,u=0,f=0,p=0,y=0,g=0,w=0;for(let A=0;A<s.length;A+=4){let G=s[A],U=s[A+1],W=s[A+2];if(s[A+3]<128)continue;let B=(G+U+W)/3;if(B<20||B>240)continue;if(A<s.length/2)a+=G,l+=U,u+=W,f++;else p+=G,y+=U,g+=W,w++}if(f===0&&w===0){t(n);return}let c=f>0?Math.round(a/f):220,h=f>0?Math.round(l/f):38,k=f>0?Math.round(u/f):38,v=w>0?Math.round(p/w):24,x=w>0?Math.round(y/w):24,T=w>0?Math.round(g/w):27;t({primary:Qt(c,h,k),secondary:Qt(v,x,T),accent:Qt(c+30,h+30,k+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var K=48,is=3,os=3,rs=1.65,ss=0.55;function as(e,t,n,i){let o=new Float32Array(e.length),r=(s,a,l)=>{let u=l?n:t,f=l?t:n;for(let p=0;p<u;p++)for(let y=0;y<4;y++)for(let g=0;g<f;g++){let w=0,c=0;for(let k=Math.max(0,g-i);k<=Math.min(f-1,g+i);k++){let v=l?(p*t+k)*4+y:(k*t+p)*4+y;w+=s[v],c++}let h=l?(p*t+g)*4+y:(g*t+p)*4+y;a[h]=w/c}};r(e,o,!0),r(o,e,!1)}function ls(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],s=e[i+2],a=0.2126*o+0.7152*r+0.0722*s;e[i]=(a+(o-a)*t)*n,e[i+1]=(a+(r-a)*t)*n,e[i+2]=(a+(s-a)*t)*n}}async function et(e,t=ss){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=K,o.height=K;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,K,K);let s=r.getImageData(0,0,K,K);for(let a=0;a<os;a++)as(s.data,K,K,is);ls(s.data,rs,t),r.putImageData(s,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var us=3000;function di(e){let t=Number.isFinite(e)&&e>0?Math.floor(e):0,n=String(t%60).padStart(2,"0"),i=Math.floor(t/60)%60,o=Math.floor(t/3600);return o>0?`${o}:${String(i).padStart(2,"0")}:${n}`:`${i}:${n}`}function cs(e,t,n,i){if(!(n>0)||!(i>0))return null;return Math.max(0,Math.min(1,(e-t)/n))*i}var ds="ytmusic-player .fullscreen-button",ms=".exit-fullscreen-button",ps='ytmusic-player-page[player-fullscreened], ytmusic-app-layout[player-ui-state="FULLSCREEN"], ytmusic-player[player-ui-state="FULLSCREEN"]',fs=300;function gs(e){return(e.key==="f"||e.key==="F")&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&!e.repeat}function ys(e){if(!e)return!1;return e.isContentEditable===!0||["INPUT","TEXTAREA","SELECT"].includes((e.tagName??"").toUpperCase())}function mi(e){let t=()=>e.isOpen()?e.close():e.open(),n=(s)=>{s.preventDefault(),s.stopImmediatePropagation()},i=(s)=>{if(!(s.target instanceof Element)||!s.target.closest(ds))return;n(s),e.open()},o=(s)=>{if(!gs(s)||ys(s.target))return;n(s),t()},r=window.setInterval(()=>{if(e.isOpen()||!document.querySelector(ps))return;Array.from(document.querySelectorAll(ms)).find((a)=>a.offsetParent!==null)?.click(),e.open()},fs);return document.addEventListener("click",i,!0),document.addEventListener("keydown",o,!0),()=>{clearInterval(r),document.removeEventListener("click",i,!0),document.removeEventListener("keydown",o,!0)}}class Kt{opts;view;root;backdrop;cover;title;artist;played;elapsed;total;playButton;status;idleTimer=null;coverUrl="";durationSecs=0;shownSecond=-1;playing=null;open=!1;constructor(e){this.opts=e;let{labels:t}=e;this.view=new Ae({onSeek:e.onSeek,resumeLabel:t.resume}),this.root=m("div",{id:"oxitune-lyrics-fs"}),this.backdrop=m("div",{className:"oxitune-fs-backdrop"}),this.cover=m("img",{className:"oxitune-fs-cover"}),this.cover.alt="",this.title=m("div",{className:"oxitune-fs-title"}),this.artist=m("div",{className:"oxitune-fs-artist"});let n=m("div",{className:"oxitune-fs-seek"}),i=m("div",{className:"oxitune-fs-track"});this.played=m("div",{className:"oxitune-fs-played"}),i.append(this.played),n.append(i),n.addEventListener("click",(y)=>{let g=i.getBoundingClientRect(),w=cs(y.clientX,g.left,g.width,this.durationSecs);if(w!==null)e.onSeek(w)}),this.elapsed=m("span",{text:"0:00"}),this.total=m("span",{text:"0:00"});let o=m("div",{className:"oxitune-fs-times"});o.append(this.elapsed,this.total);let r=R({label:t.previous,iconPath:_.skipPrevious});this.playButton=R({label:t.play,iconPath:_.play}),this.playButton.classList.add("oxitune-fs-play");let s=R({label:t.next,iconPath:_.skipNext});r.addEventListener("click",()=>e.onCommand("previous")),this.playButton.addEventListener("click",()=>e.onCommand("play_pause")),s.addEventListener("click",()=>e.onCommand("next"));let a=m("div",{className:"oxitune-fs-controls"});a.append(r,this.playButton,s);let l=m("div",{className:"oxitune-fs-side"});l.append(this.cover,this.title,this.artist,n,o,a),this.status=m("div",{className:"oxitune-native-lyrics-status"});let u=m("div",{className:"oxitune-fs-lyrics"});u.append(this.status,this.view.root);let f=m("div",{className:"oxitune-fs-body"});f.append(l,u);let p=R({label:t.close,iconPath:_.close});p.classList.add("oxitune-fs-close"),p.addEventListener("click",()=>this.close()),this.root.append(this.backdrop,m("div",{className:"oxitune-fs-veil"}),f,p),this.root.addEventListener("mousemove",this.wake)}get isOpen(){return this.open}show(){if(this.open)return;this.open=!0,this.shownSecond=-1,document.body.append(this.root),document.addEventListener("keydown",this.onKey,!0),document.addEventListener("fullscreenchange",this.onFullscreenChange),this.root.requestFullscreen?.().catch(()=>{return}),this.wake(),this.view.scrollToCurrent()}close(){if(!this.open)return;if(this.open=!1,document.removeEventListener("keydown",this.onKey,!0),document.removeEventListener("fullscreenchange",this.onFullscreenChange),this.idleTimer!==null)clearTimeout(this.idleTimer);if(this.idleTimer=null,document.fullscreenElement===this.root)document.exitFullscreen().catch(()=>{return});this.root.remove(),this.opts.onClose()}setTrack(e){this.title.textContent=e?.title??"",this.artist.textContent=e?.artist??"";let t=e?.coverUrl??"";if(t===this.coverUrl)return;if(this.coverUrl=t,t)this.cover.src=t;else this.cover.removeAttribute("src");this.backdrop.style.backgroundImage="",et(t,0.5).then((n)=>{if(n&&this.coverUrl===t)this.backdrop.style.backgroundImage=`url("${n}")`})}setPlaying(e){if(e===this.playing)return;this.playing=e;let t=e?this.opts.labels.pause:this.opts.labels.play;Ke(this.playButton,e?_.pause:_.play),this.playButton.setAttribute("aria-label",t)}setProgress(e,t){if(this.durationSecs=t,!this.open)return;let n=Math.floor(e);if(n===this.shownSecond)return;this.shownSecond=n;let i=t>0?Math.max(0,Math.min(1,e/t)):0;this.played.style.transform=`scaleX(${i.toFixed(4)})`,this.elapsed.textContent=di(e),this.total.textContent=di(t)}setStatus(e){this.status.textContent=e??"",this.status.hidden=e===null,this.view.root.hidden=e!==null}wake=()=>{if(this.root.classList.remove("oxitune-fs-idle"),this.idleTimer!==null)clearTimeout(this.idleTimer);this.idleTimer=window.setTimeout(()=>this.root.classList.add("oxitune-fs-idle"),us)};onKey=(e)=>{if(e.key!=="Escape")return;e.stopPropagation(),this.close()};onFullscreenChange=()=>{if(this.open&&document.fullscreenElement!==this.root)this.close()}}var P={...Q},O=!1,q="",V=null,E=null,Zt="",N={...Ie},re="",se="",Re="",xi={translate:!1,lang:"en",romanize:!1,autoOpen:!1,effects:!0,theme:"classic"};function Xt(e,t=xi){let n=(o,r)=>typeof e[o]==="boolean"?e[o]:r,i=e.lyrics_translate_lang;return{translate:n("lyrics_translate_enabled",t.translate),lang:typeof i==="string"&&/^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(i)?i:t.lang,romanize:n("lyrics_romanize_enabled",t.romanize),autoOpen:n("lyrics_auto_open",t.autoOpen),effects:n("lyrics_effects",t.effects),theme:"lyrics_theme"in e?ui(e.lyrics_theme):t.theme}}var I={...xi},en=(e,t)=>`${t}|${e.video_id??""}|${e.provider??""}|${e.synced.length}|${e.plain?.length??0}`,Oe=()=>P.synced.length>0||!!P.plain,ae=0,pi=0,fi=Number.NaN;function hs(e,t,n,i,o){let r=t-n;if(Number.isFinite(r)&&r>=0&&r<=yi)return e+r;return e+Math.min(yi,Math.max(0,i)/1000)*(o||1)}var it=0,ot=!1,gi="",bs=15,yi=1,vs=0.3,tn="",rt=!1,H=null,tt=null,st=(e,t)=>e===t,xs=(e)=>e.videoId?`${e.videoId}|${e.title.trim().toLowerCase()}`:`${e.title} - ${e.artist}`,wi={id:"lyrics",manifest:Zn,name:"Native Synced Lyrics",description:"Synchronized lyrics from several providers in the native Lyrics tab and in full screen: word by word, with translation, romanization and seek-on-click",defaultEnabled:!0,onInit(e){P={...Q},O=!1,q="",tn="",rt=!1,H=null,N={...Ie},re="",se="",Zt="",Re="",I=Xt(e.config);let t=(p)=>b.seekTo(p);V=new Ae({onSeek:t,resumeLabel:d().lyricsResumeSync}),V.setEffects(I.effects),V.setTheme(I.theme),E=new Kt({labels:{close:d().close,previous:d().playerPrevious,next:d().playerNext,play:d().playerPlay,pause:d().playerPause,resume:d().lyricsResumeSync},onCommand:(p)=>e.sendPlayerCommand(p),onSeek:t,onClose:()=>V?.scrollToCurrent()}),E.view.setEffects(I.effects),E.view.setTheme(I.theme);let n=mi({isOpen:()=>E?.isOpen===!0,open:()=>Ss(e),close:()=>E?.close()}),i=document.createElement("style");i.id="oxitune-native-lyrics-styles",i.textContent=li,document.head.appendChild(i),z();let o=()=>{nn(e,Xt(e.config,I)),Jt(),Rs(e),_s(e),Ps(),ot=ks()},r=0,s=()=>{if(r=requestAnimationFrame(s),!ot&&!E?.isOpen||P.synced.length===0)return;let p=e.getVideoElement();if(!p||p.paused)return;bi(hs(ae,p.currentTime,fi,performance.now()-pi,p.playbackRate),!0)};r=requestAnimationFrame(s);let a=()=>{setTimeout(()=>{Jt(),on()},50),setTimeout(()=>{on()},250)};document.addEventListener("click",a,!0);let l=window.setInterval(o,600);o(),Ls(e);let u=e.events?e.events.listen("lyrics-changed",(p)=>{let y=Me(p.payload);if(!ws(y))return;at(e,y)}):null,f=e.events?e.events.listen("config-updated",(p)=>{if(p.payload&&typeof p.payload==="object")nn(e,Xt(p.payload,I))}):null;tt=()=>{cancelAnimationFrame(r),clearInterval(l),document.removeEventListener("click",a,!0),u?.then((p)=>p()).catch(()=>{return}),f?.then((p)=>p()).catch(()=>{return}),n(),E?.close(),E=null,V=null,i.remove(),document.querySelectorAll("#oxitune-native-lyrics-wrapper").forEach((p)=>p.remove())}},async onTrackChange(e,t){let n=xs(e);if(H=e,n===q)return;q=n,P={...Q,video_id:e.videoId??null},O=!0,it=0,tn=Pi(),rt=!1,N={...Ie},re="",se="",Re=I.autoOpen?n:"",Jt(),V?.setLyrics(P,N),le(t),await ki(t,e,n,null)},onPlaybackChange(e){E?.setPlaying(e)},onTick(e,t){ae=e,pi=performance.now(),fi=t.getVideoElement()?.currentTime??Number.NaN,bi(e,!0);let n=H?.durationSecs??0;if(E?.setProgress(e,n),P.synced.length===0&&n>0){let i=e/n;if(V?.updatePlain(i,ot),E?.isOpen)E.view.updatePlain(i,!0)}if(e>=bs)Ts(t)},onDestroy(){if(tt)tt(),tt=null}};function ws(e){if(!H)return!1;if(e.video_id&&H.videoId)return e.video_id===H.videoId;return!e.video_id||e.video_id===H.videoId}async function ki(e,t,n,i){try{let o=Me(await e.invoke("fetch_lyrics",{videoId:t.videoId||null,artist:t.artist,title:t.title,albumName:t.album||null,duration:t.durationSecs||null,ytmPlain:i,artistAliases:ei(b.getMoviePlayer()?.getPlayerResponse?.(),t.videoId)},{timeoutMs:15000}));if(!st(n,q))return;O=!1,at(e,o)}catch{if(!st(n,q))return;O=!1,le(e)}}function at(e,t){let n=t.provider!==null&&t.provider===P.provider&&t.synced.length===P.synced.length&&t.plain===P.plain&&t.video_id===P.video_id&&!O;if(O&&!t.provider&&t.offset_secs===P.offset_secs)return;if(P=t,O=!1,n){let i=document.querySelector(".oxitune-lyrics-offset-value");if(i)i.textContent=_i(t.offset_secs);V?.setOffset(t.offset_secs),E?.view.setOffset(t.offset_secs),Ne(ae,!1);return}N={...Ie},re="",se="",V?.setLyrics(P,N),le(e),Ne(ae,!1),Ti(e)}function nn(e,t){let n=Object.keys(t).some((i)=>t[i]!==I[i]);if(I=t,!n)return;V?.setEffects(I.effects),E?.view.setEffects(I.effects),V?.setTheme(I.theme),E?.view.setTheme(I.theme),le(e),Ti(e)}function nt(){if(V?.setExtras(N),E?.isOpen)E.view.setExtras(N)}async function Ti(e){let t=Oe()&&!O?en(P,q):"",n=()=>t!==""&&t===en(P,q),i=(a)=>!a||!P.video_id||a===P.video_id,o=(a)=>a.some((l)=>l!==null)?a:null,r=I.translate&&t!==""?`${t}|${I.lang}`:"";if(r!==re){if(re=r,N={...N,translation:null},nt(),r)try{let a=Yt(await e.invoke("translate_lyrics",{lang:I.lang},{timeoutMs:20000}));if(re===r&&n()&&i(a.video_id))N={...N,translation:o(a.lines)},nt()}catch{if(re===r)L(d().lyricsTranslateFailed)}}let s=I.romanize&&t!==""?t:"";if(s!==se){if(se=s,N={...N,romanization:null},nt(),s)try{let a=Yt(await e.invoke("romanize_lyrics",{},{timeoutMs:20000}));if(se===s&&n()&&i(a.video_id))N={...N,romanization:o(a.lines)},nt()}catch{if(se===s)L(d().lyricsRomanizeFailed)}}}function hi(e,t){let n=!I[t];e.config[t==="translate"?"lyrics_translate_enabled":"lyrics_romanize_enabled"]=n,nn(e,{...I,[t]:n}),e.invoke("set_lyrics_display",{[t]:n}).catch(()=>L(d().actionFailed))}function bi(e,t){if(e<it&&it-e<vs)return;it=e,Ne(e,t)}function ks(){if(typeof document>"u"||document.hidden)return!1;let e=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');return!!e&&!!document.getElementById("oxitune-native-lyrics-wrapper")&&Li(e)}function Ts(e){if(gi===q||Y())return;gi=q;let t=ti(document.querySelectorAll("ytmusic-player-queue-item"));if(!t||t.videoId===H?.videoId)return;e.invoke("prefetch_lyrics",{videoId:t.videoId,title:t.title,artist:t.artist,duration:t.durationSecs}).catch(()=>{return})}function Ne(e,t){if(P.synced.length===0)return;let n=E?.isOpen===!0;if(V?.update(e,t&&ot&&!n),n)E?.view.update(e,t)}function Es(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");return Array.from(e).find((t)=>/tekst|lyrics|paroles|letras/.test(t.textContent?.toLowerCase()||""))??null}function Ps(){if(!Re||Re!==q||O||!Oe())return;let e=Es();if(!e||!Li(e))return;if(Re="",!(e.classList.contains("iron-selected")||e.getAttribute("aria-selected")==="true"))e.click()}function Ei(){if(!E?.isOpen)return;E.setTrack(H),E.setStatus(O?d().lyricsLoading:Oe()?null:d().lyricsNone);let e=`${en(P,q)}|${O}`;if(e!==Zt)Zt=e,E.view.setLyrics(O?{...Q}:P,N);else E.view.setExtras(N)}function Ss(e){if(!E)return;E.show(),E.setPlaying(e.getVideoElement()?.paused===!1),E.setProgress(ae,H?.durationSecs??0),Ei(),Ne(ae,!1),E.view.scrollToCurrent()}function Pi(){return document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description')?.textContent?.trim()||""}function _s(e){if(rt||O||!H||P.provider)return;let t=Pi();if(!t||t===tn)return;rt=!0,ki(e,H,q,t)}async function Ls(e){let t=Cs(),n=[...Ms(t)];if(n.length===0)return;try{await e.invoke("import_lyrics_offsets",{entries:n}),t?.removeItem?.(Si)}catch(i){console.warn("[Oxitune Lyrics] Offset migration failed, will retry next start:",i)}}var Si="oxitune-lyrics-offsets";function Cs(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}function Ms(e){try{let t=e?.getItem(Si);if(!t)return new Map;let n=JSON.parse(t);if(!Array.isArray(n))return new Map;return new Map(n.filter((i)=>Array.isArray(i)&&typeof i[0]==="string"&&typeof i[1]==="number"))}catch{return new Map}}function _i(e){return`${e>0?"+":e<0?"−":""}${Math.abs(e).toFixed(1)} s`}function Li(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function Is(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("oxitune-lyrics-tab-unlocked")}function Jt(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(Is(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("oxitune-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function As(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function on(){let e=document.getElementById("oxitune-native-lyrics-wrapper");if(!e)return;let t=As();e.style.setProperty("display",t?"flex":"none","important")}function Rs(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("oxitune-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=m("div",{id:"oxitune-native-lyrics-wrapper"});t.appendChild(n),le(e),Ne(ae,!1)}on()}function ge(e,t,n,i){let o=R({label:e,iconPath:t,muted:!0});if(i!==void 0)o.setAttribute("aria-pressed",String(i));return o.addEventListener("click",n),o}function Ns(){if(!P.provider)return m("span",{className:"oxitune-lyrics-source"});let e=d().lyricsSource(Wt(P.provider,d().lyricsLocalFiles));if(P.source_url){let t=m("a",{className:"oxitune-lyrics-source",text:e});return t.href=P.source_url,t.target="_blank",t.rel="noopener noreferrer",t}return m("span",{className:"oxitune-lyrics-source",text:e})}function vi(e){let t=m("div",{className:"oxitune-lyrics-bar"}),n=()=>m("span",{className:"oxitune-lyrics-bar-sep"});if(t.append(Ns()),Oe())t.append(ge(d().lyricsTranslateTip,_.translate,()=>hi(e,"translate"),I.translate),ge(d().lyricsRomanizeTip,_.romanize,()=>hi(e,"romanize"),I.romanize),n());if(P.synced.length>0){let i=(r)=>{let s=r===null?0:Math.round((P.offset_secs+r)*10)/10;e.invoke("set_lyrics_offset",{offsetSecs:s}).catch((a)=>console.warn("[Oxitune Lyrics] offset:",a))},o=m("button",{className:"oxitune-lyrics-offset-value",text:_i(P.offset_secs)});o.type="button",o.dataset.oxituneTooltip=d().lyricsResetTip,o.setAttribute("aria-label",d().lyricsResetTip),o.addEventListener("click",()=>i(null)),t.append(ge(d().lyricsLater,_.remove,()=>i(-0.5)),o,ge(d().lyricsEarlier,_.add,()=>i(0.5)),n())}return t.append(ge(d().lyricsWrong,_.swap,()=>void zs(e)),ge(d().lyricsSearchAgainTip,_.refresh,()=>void Os(e))),t}async function Os(e){let t=q;O=!0,le(e);try{let n=Me(await e.invoke("refresh_lyrics",{},{timeoutMs:15000}));if(!st(t,q))return;O=!1,at(e,n)}catch{if(!st(t,q))return;O=!1,le(e),L(d().actionFailed)}}async function zs(e){let t=m("div",{className:"oxitune-lyrics-pick-list"});t.append(m("div",{className:"oxitune-native-lyrics-status",text:d().lyricsPickLoading}));let n=Wn({id:"oxitune-lyrics-picker",title:d().lyricsPickTitle,body:[t],actions:[{label:d().close}]}),i=[];try{i=await e.invoke("list_lyrics_candidates",{},{timeoutMs:15000})||[]}catch{i=[]}if(!t.isConnected)return;if(i.length===0){t.replaceChildren(m("div",{className:"oxitune-native-lyrics-status",text:d().lyricsPickNone}));return}t.replaceChildren(...i.map((o)=>{let r=m("button",{className:"oxitune-menu-item"});r.type="button";let s=m("span",{className:"oxitune-menu-item-text"}),a=o.synced?d().lyricsTimed:d().lyricsTextOnly;if(s.append(m("span",{text:`${Wt(o.provider,d().lyricsLocalFiles)} · ${a}`}),m("span",{className:"oxitune-menu-item-sub",text:`${o.title} — ${o.artist}`}),m("span",{className:"oxitune-menu-item-sub",text:o.preview})),r.append(s),o.selected)r.append(m("span",{className:"oxitune-menu-item-hint",text:d().lyricsCurrent}));return r.addEventListener("click",async()=>{n.close();try{at(e,Me(await e.invoke("pick_lyrics",{provider:o.provider,id:o.id})))}catch{L(d().lyricsPickFailed)}}),r}))}function le(e){Ei();let t=document.getElementById("oxitune-native-lyrics-wrapper");if(!t)return;if(O)t.replaceChildren(m("div",{className:"oxitune-native-lyrics-status",text:d().lyricsLoading}));else if(Oe()&&V)t.replaceChildren(V.root,vi(e));else{let n=[m("div",{className:"oxitune-native-lyrics-status",text:d().lyricsNone})];if(H)n.push(vi(e));t.replaceChildren(...n)}}var Ci={id:"app.oxitune.wheel-volume",name:"Wheel Volume Controller",version:"1.0.0",apiVersion:1,description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:config"],entry:"index.js"};var ze=null;function ye(e){if(!e)return null;let t=e.getBoundingClientRect();if(t.width<80||t.height<80||t.bottom<=0||t.right<=0||t.top>=window.innerHeight||t.left>=window.innerWidth)return null;for(let n=e;n;n=n.parentElement){let i=getComputedStyle(n);if(i.display==="none"||i.visibility==="hidden"||Number(i.opacity)===0)return null}return t}function qs(e,t){let n=Math.max(e.left,t.left),i=Math.max(e.top,t.top);if(n>=Math.min(e.right,t.right)||i>=Math.min(e.bottom,t.bottom))return t;return{left:n,top:i}}function Mi(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var Ii={id:"volume",manifest:Ci,name:"Wheel Volume Controller",description:"Adjust volume by scrolling over the player bar or, when enabled, the main player panel",defaultEnabled:!0,onInit(e){ze?.(),z(),document.getElementById("oxitune-volume-indicator")?.remove();let t=m("div",{id:"oxitune-volume-indicator"});document.body.appendChild(t);let n=null,i=null,o=null,r=null,s=null,a=null,l=()=>{if(a!==null)window.cancelAnimationFrame(a);a=null},u=()=>{if(s!==null)window.clearTimeout(s);s=null,l(),t.classList.remove("oxitune-visible")},f=()=>{let x=document.querySelector("ytmusic-player-page #main-panel");if(!Mi()&&!ye(x))return!1;let T=ye(document.querySelector("ytmusic-player-page #song-image")),A=ye(document.querySelector("ytmusic-player-page video"))||ye(document.querySelector("ytmusic-player-page #movie_player")),U=(document.querySelector("ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]")?A||T:T||A)||ye(x);if(!U)return!1;let W=ye(document.querySelector("ytmusic-player-page #player")),ie=W?qs(U,W):U,B=`${Math.max(8,ie.left+12)}px`,Ee=`${Math.max(8,ie.top+12)}px`;if(t.style.left!==B)t.style.left=B;if(t.style.top!==Ee)t.style.top=Ee;return!0},p=()=>{if(a=null,!t.classList.contains("oxitune-visible"))return;if(!f()){u();return}a=window.requestAnimationFrame(p)},y=()=>{if(s!==null)window.clearTimeout(s);if(t.classList.add("oxitune-visible"),a===null)a=window.requestAnimationFrame(p);s=window.setTimeout(u,1800)},g=()=>{let x=e.getVideoElement();if(!x){r=null,u();return}Vt(x);let T=_e(x)?0:Se(x),A=r!==null&&T!==r&&!Rn();if(r=T,t.textContent!==`${T}%`)t.textContent=`${T}%`,t.setAttribute("aria-label",d().volumeLevel(T));if(!A&&!t.classList.contains("oxitune-visible"))return;if(!f()){u();return}if(A)y()},w=()=>{let x=e.getVideoElement();if(x===n)return;n?.removeEventListener("volumechange",g),n=x,n?.addEventListener("volumechange",g),g()},c=()=>{let x=document.querySelector("ytmusic-player-page");if(x===i)return;if(o?.disconnect(),i=x,x)o=new MutationObserver(()=>window.requestAnimationFrame(g)),o.observe(x,{attributes:!0,subtree:!0,attributeFilter:["video-mode","player-ui-state","player-fullscreened","hidden"]})},h=(x)=>{let T=x.target;if(T instanceof Element&&T.closest("ytmusic-player-bar"))window.requestAnimationFrame(g)},k=(x)=>{if(x.deltaY===0||x.ctrlKey)return;let T=x.target,A=T instanceof Element?T.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select'):null;if(A&&A.tagName!=="YTMUSIC-PLAYER")return;let G=(Tn)=>{if(!Tn)return!1;let Be=Tn.getBoundingClientRect();return x.clientX>=Be.left&&x.clientX<Be.right&&x.clientY>=Be.top&&x.clientY<Be.bottom},U=G(document.querySelector("ytmusic-player-bar"))||G(document.querySelector("#player-bar-background")),W=e.config.wheel_volume_on_player_page===!0&&(Mi()||G(document.querySelector("ytmusic-player-page #main-panel")));if(!U&&!W)return;let ie=e.getVideoElement();if(!ie)return;let B=e.config.wheel_volume_step,Ee=typeof B==="number"&&Number.isFinite(B)&&B>0?Math.min(B,1):0.05;x.preventDefault(),x.stopPropagation(),Ge(Se(ie)+(x.deltaY<0?Ee:-Ee)*100,ie),g()};window.addEventListener("wheel",k,{passive:!1,capture:!0}),window.addEventListener("resize",g),document.addEventListener("scroll",g,!0),document.addEventListener("input",h,!0),document.addEventListener("change",h,!0),c(),w();let v=window.setInterval(()=>{c(),w(),g()},500);ze=()=>{window.removeEventListener("wheel",k,{capture:!0}),window.removeEventListener("resize",g),document.removeEventListener("scroll",g,!0),document.removeEventListener("input",h,!0),document.removeEventListener("change",h,!0),window.clearInterval(v),o?.disconnect(),n?.removeEventListener("volumechange",g),u(),t.remove()}},onDestroy(){if(ze)ze(),ze=null}};var Ai={id:"app.oxitune.notifications",name:"Track Change Notifications",version:"1.0.0",apiVersion:1,description:"Displays native desktop notifications when songs change",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","internal:config","internal:notify"],entry:"index.js"};var Ri={id:"notifications",manifest:Ai,name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[Oxitune] Notification dispatch failed:",n)}}};var Ni={id:"app.oxitune.scrollbars",name:"Sleek Scrollbars",version:"1.0.0",apiVersion:1,description:"Applies subtle, low-contrast scrollbar colors",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","ui"],entry:"index.js"};var lt=null,Oi={id:"visualizer",manifest:Ni,name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("oxitune-theme-styles");if(!t)t=document.createElement("style"),t.id="oxitune-theme-styles";if(t.textContent=`
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
    `,!t.isConnected)document.head.appendChild(t);lt=()=>{t?.remove()}},onDestroy(){if(lt)lt(),lt=null}};var zi={id:"app.oxitune.audio-dsp",name:"Audio DSP & 10-Band Equalizer",version:"1.0.0",apiVersion:1,description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","internal:config"],entry:"index.js"};var ut=[32,64,125,250,500,1000,2000,4000,8000,16000],rn={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function Ve(e){return Math.max(-24,Math.min(24,e))}function $s(e){if(e.length===0)return-100;let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}function Bs(e){return Math.max(0.5,Math.min(2,e))}class D{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=ut.map(()=>0);preampDb=0;fadeTarget=1;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!D.instance)D.instance=new D;return D.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[Oxitune DSP] Web Audio API is not supported in this environment");return}if(this.audioCtx){let i=this.audioCtx;this.isInitialized=!1;try{this.sourceNode?.disconnect()}catch(o){}i.close().catch(()=>{return})}this.audioCtx=new t,this.hookedVideo=e,this.fadeTarget=1,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=ut.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===ut.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[Oxitune DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[Oxitune DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.analyserNode),e=this.analyserNode,e.connect(this.fadeNode),this.fadeNode.connect(this.audioCtx.destination)}catch(e){console.error("[Oxitune DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=Ve(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=Ve(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=Ve(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,Ve(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=rn[e]||rn.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}setFadeGain(e,t=0){let n=Math.max(0,Math.min(1,Number.isFinite(e)?e:1));if(!this.fadeNode||!this.audioCtx)return;if(n===this.fadeTarget)return;this.fadeTarget=n;let i=this.fadeNode.gain,o=this.audioCtx.currentTime,r=i.value;if(i.cancelScheduledValues(o),i.setValueAtTime(r,o),t>0)i.linearRampToValueAtTime(n,o+t);else i.setValueAtTime(n,o)}resetFade(){this.setFadeGain(1,0.05)}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);return this.analyserNode.getFloatTimeDomainData(this.powerBuffer),$s(this.powerBuffer)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=Bs(e),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??b.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}var Us=2,Vi=0.3,js=1.5;function Gs(e,t,n,i){let o=1;if(i>0&&e<i)o=Math.sin(Math.max(0,e)/i*(Math.PI/2));if(n>0&&t>0){let r=t-e;if(r<n)o=Math.min(o,Math.sin(Math.max(0,r)/n*(Math.PI/2)))}return o}function Ws(e,t){if(typeof t==="number"&&Number.isFinite(t)&&t>=e&&t-e<1.5)return t;return e}var Ys=()=>typeof document>"u"?void 0:b.getMoviePlayer()?.getDuration?.(),Qs=()=>{if(typeof document>"u")return 1;let e=b.getVideo()?.playbackRate;return typeof e==="number"&&e>0?e:1};class sn{readPlayerDuration;readPlaybackRate;crossfadeSeconds=0;currentTrackId="";fadingIn=!1;lastPosition=-1;inFadeOut=!1;constructor(e=Ys,t=Qs){this.readPlayerDuration=e;this.readPlaybackRate=t}setCrossfadeSeconds(e){if(this.crossfadeSeconds=Math.max(0,Math.min(12,Number.isFinite(e)?e:0)),this.crossfadeSeconds===0)this.reset()}getCrossfadeSeconds(){return this.crossfadeSeconds}fadeInSeconds(){return Math.min(this.crossfadeSeconds,Us)}reset(){this.fadingIn=!1,this.inFadeOut=!1,D.getInstance().resetFade()}onTrackChange(e){let t=e.videoId||`${e.title}-${e.artist}`;if(t===this.currentTrackId)return;this.currentTrackId=t;let n=this.fadingIn||this.inFadeOut;if(this.fadingIn=n&&e.currentTimeSecs<this.fadeInSeconds(),this.inFadeOut=!1,this.lastPosition=e.currentTimeSecs,this.crossfadeSeconds<=0)return;this.apply(e.currentTimeSecs,e)}onTick(e,t){if(!t||this.crossfadeSeconds<=0)return;if(this.inFadeOut&&e<js&&this.lastPosition>e)this.fadingIn=!0,this.inFadeOut=!1;this.lastPosition=e,this.apply(e,t)}apply(e,t){let n=this.fadingIn?this.fadeInSeconds():0;if(this.fadingIn&&e>=n)this.fadingIn=!1;let i=t.durationSecs>0?Ws(t.durationSecs,this.readPlayerDuration()):0,o=i>0&&e<=i+1?this.crossfadeSeconds:0;this.inFadeOut=o>0&&i-e<o;let r=e+Vi*this.readPlaybackRate();D.getInstance().setFadeGain(Gs(r,i,o,n),Vi)}destroy(){this.reset()}}var Ks=()=>typeof document<"u"&&b.getRepeatMode()==="one";class an{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;outroSkipped=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.outroSkipped=!1,this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=D.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[Oxitune Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(!this.outroSkipped&&t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3){if(this.consecutiveSilentTicks=0,this.outroSkipped=!0,Ks())return;console.log(`[Oxitune Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),b.next()}}else this.consecutiveSilentTicks=0}}var ue=null,he=null,ct=null;function Xs(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var qi={id:"audio_dsp",manifest:zi,name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=D.getInstance(),n=new sn,i=new an;ue=n,he=i;let o=e.config,r=null,s=()=>{if(r!==null)return;let l=e.getVideoElement();if(l){if(!t.isInitializedFor(l))t.init(l);return}r=window.setInterval(()=>{let u=e.getVideoElement();if(u){if(r!==null)clearInterval(r);r=null,t.init(u)}},500)};if(Xs(o))s();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let a=[];if(e.events){let{listen:l}=e.events;a.push(l("set-eq-band",(u)=>{s(),t.setBandGain(u.payload.bandIndex,u.payload.gain)}),l("set-eq-all",(u)=>{s(),t.setAllGains(u.payload.gains)}),l("set-eq-preset",(u)=>{s(),t.applyPreset(u.payload)}),l("set-preamp",(u)=>{s(),t.setPreamp(u.payload)}),l("set-loudness-normalization",(u)=>{if(u.payload)s();t.setLoudnessNormalization(u.payload)}),l("set-crossfade-seconds",(u)=>{if(u.payload>0)s();n.setCrossfadeSeconds(u.payload)}),l("set-skip-silence",(u)=>{if(u.payload)s();i.setEnabled(u.payload)}),l("set-playback-rate",(u)=>{t.setPlaybackRate(u.payload)}),l("set-preserves-pitch",(u)=>{t.setPreservesPitch(u.payload)}))}ct=()=>{if(r!==null)clearInterval(r),r=null;a.forEach((l)=>l.then((u)=>u())),ue?.destroy(),ue=null,he=null},console.log("[Oxitune] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(D.getInstance().applyRateAndPitch(),ue)ue.onTrackChange(e);if(he)he.onTrackChange()},onTick(e,t){if(ue)ue.onTick(e,t.track);if(Y())return;if(he)he.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(ct)ct(),ct=null}};var Hi={id:"app.oxitune.ambient-lighting",name:"Dynamic Ambient Lighting",version:"1.0.0",apiVersion:1,description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","ui","internal:config"],entry:"index.js"};var dt=null,mt=null,pt,Di={id:"ambient_lighting",manifest:Hi,name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("oxitune-ambient-backdrop");if(!t)t=m("div",{id:"oxitune-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=m("img",{id:"oxitune-ambient-cover"});n.alt="";let i=m("div",{id:"oxitune-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,s=document.createElement("style");s.id="oxitune-ambient-styles",s.textContent=`
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
    `,document.head.appendChild(s),dt=(l)=>{if(t)t.style.opacity=String(l)};let a=[];if(e.events)a.push(e.events.listen("set-ambient-intensity",(l)=>{dt?.(l.payload)}),e.events.listen("set-ambient-enabled",(l)=>{let u=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6;dt?.(l.payload?u:0)}));if(mt=()=>{a.forEach((l)=>l.then((u)=>u())),dt=null,pt=void 0,document.getElementById("oxitune-ambient-styles")?.remove(),document.getElementById("oxitune-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===pt)return;pt=t;let n=document.getElementById("oxitune-ambient-cover");if(n){let i=t?await et(t):null;if(t!==pt)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await ci(t||""),o=document.documentElement.style;o.setProperty("--oxitune-accent",i.accent),o.setProperty("--oxitune-accent-primary",i.primary),o.setProperty("--oxitune-accent-secondary",i.secondary)}catch{}},onDestroy(){if(mt)mt(),mt=null}};var Fi={id:"app.oxitune.themes",name:"Theme Engine & Live CSS",version:"1.0.0",apiVersion:1,description:"Switches YouTube Music\\",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","ui","internal:config"],entry:"index.js"};var $i=`
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

`,Bi=`
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

`;var ft=null,Ui={id:"theme_engine",manifest:Fi,name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(a)=>{let l=document.getElementById(a);if(!l){l=document.createElement("style"),l.id=a;let u=t();if(u)u.appendChild(l)}return l},i=(a)=>{let l=n("oxitune-active-theme");l.textContent=a?$i:Bi},o=(a)=>{let l=n("oxitune-custom-css");if(l)l.textContent=a};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let s=[];if(e.events)s.push(e.events.listen("set-ambient-enabled",(a)=>{i(a.payload)}),e.events.listen("set-custom-css",(a)=>{o(a.payload)}));ft=()=>{s.forEach((a)=>a.then((l)=>l()))},console.log("[Oxitune] Theme engine active.")},onDestroy(){if(ft)ft(),ft=null}};var ji={id:"app.oxitune.pip",name:"Floating Picture-in-Picture",version:"1.0.0",apiVersion:1,description:"Detachable floating always-on-top video window for watching music videos while browsing",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["page","internal:windows"],entry:"index.js"};var gt=null,Gi={id:"pip",manifest:ji,name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("oxitune-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=R({id:"oxitune-pip-btn",label:d().pipButton,iconPath:_.pip});o.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(s){console.warn("[Oxitune PiP] Could not enter PiP:",s),await e.invoke("toggle_mini_player").catch((a)=>console.error("[Oxitune PiP] Mini player fallback failed:",a))}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),gt=()=>{clearInterval(n),document.getElementById("oxitune-pip-btn")?.remove()}},onDestroy(){if(gt)gt(),gt=null}};var Wi={id:"app.oxitune.local-files",name:"Local Music Library",version:"1.0.0",apiVersion:1,description:"Play local offline audio files alongside YouTube Music streaming",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:[],entry:"index.js"};var Yi={id:"local_files",manifest:Wi,name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[Oxitune] Local files module ready.")}};var Qi={id:"app.oxitune.listen-together",name:"P2P Room Sync",version:"1.0.0",apiVersion:1,description:"Listen together with friends in real-time synchronized listening rooms",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","ui","internal:sync"],entry:"index.js"};var yt="oxitune-nav-slot",ln="oxitune-menu-btn",qe="oxitune-menu",Ki="oxitune-sync-chip",Ji=[],ht=null,Zi=null,Xi=!1,ia=`
  #${yt} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;function oa(){if(document.getElementById("oxitune-nav-slot-styles"))return;let e=document.createElement("style");e.id="oxitune-nav-slot-styles",e.textContent=ia,document.head.appendChild(e)}function ra(e){if(!e)return;return`${d().syncInRoom} · ${d().syncListeners(e.listeners)}`}function eo(e){Ji=e.items,Zi=e.onSyncChipClick}function to(){if(document.getElementById(yt)?.isConnected)return;let e=document.querySelector("ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content")||document.querySelector("ytmusic-nav-bar");if(!e)return;z(),oa();let t=m("div",{id:yt}),n=R({id:ln,label:d().menuLabel,iconPath:_.apps});n.setAttribute("aria-haspopup","menu"),n.setAttribute("aria-expanded","false"),n.addEventListener("click",(i)=>{i.stopPropagation(),aa(n)}),t.appendChild(n),e.prepend(t),no(),ua()}function un(e){ht=e,no();let t=document.getElementById(qe);if(t?.classList.contains("oxitune-open"))io(t)}function no(){let e=document.getElementById(yt);if(!e)return;let t=document.getElementById(Ki);if(!ht){t?.remove();return}if(!t)t=m("button",{id:Ki,className:"oxitune-chip"}),t.type="button",t.addEventListener("click",()=>Zi?.()),e.prepend(t);let n=d().syncListeners(ht.listeners);t.replaceChildren(m("span",{className:"oxitune-chip-dot"}),Ce(_.group,18),m("span",{text:n})),t.dataset.oxituneTooltip=d().syncInRoom,t.setAttribute("aria-label",`${d().syncInRoom}, ${n}`)}function io(e){let t=[];for(let n of Ji){if(n.dividerBefore)t.push(m("div",{className:"oxitune-menu-divider"}));let i=m("button",{className:"oxitune-menu-item"});i.type="button",i.setAttribute("role","menuitem"),i.dataset.itemId=n.id;let o=m("span",{className:"oxitune-menu-item-text"});o.appendChild(m("span",{text:n.label}));let r=n.id==="sync"?ra(ht):void 0;if(r)o.appendChild(m("span",{className:"oxitune-menu-item-sub",text:r}));if(i.append(Ce(n.iconPath),o),n.hint)i.appendChild(m("span",{className:"oxitune-menu-item-hint",text:n.hint}));i.addEventListener("click",()=>{be(),n.onSelect()}),t.push(i)}e.replaceChildren(...t)}function sa(){let e=document.getElementById(qe);if(!e)e=m("div",{id:qe,className:"oxitune-menu"}),e.setAttribute("role","menu"),e.addEventListener("keydown",la),document.body.appendChild(e);return e}function aa(e){let t=sa();if(t.classList.contains("oxitune-open")){be();return}io(t);let n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${Math.max(8,window.innerWidth-n.right)}px`,t.classList.add("oxitune-open"),e.setAttribute("aria-expanded","true"),t.querySelector(".oxitune-menu-item")?.focus()}function be(){let e=document.getElementById(qe);if(!e?.classList.contains("oxitune-open"))return;e.classList.remove("oxitune-open");let t=document.getElementById(ln);if(t?.setAttribute("aria-expanded","false"),e.contains(document.activeElement))t?.focus()}function la(e){let t=e.currentTarget,n=Array.from(t.querySelectorAll(".oxitune-menu-item")),i=n.indexOf(document.activeElement);if(e.key==="Escape")e.stopPropagation(),be();else if(e.key==="ArrowDown")e.preventDefault(),n[(i+1)%n.length]?.focus();else if(e.key==="ArrowUp")e.preventDefault(),n[(i-1+n.length)%n.length]?.focus();else if(e.key==="Tab")be()}function ua(){if(Xi)return;Xi=!0,document.addEventListener("mousedown",(e)=>{let t=document.getElementById(qe);if(!t?.classList.contains("oxitune-open"))return;let n=e.target;if(t.contains(n)||document.getElementById(ln)?.contains(n))return;be()}),window.addEventListener("resize",be)}function oo(e){return e.is_host?"host":e.role??"dj"}function X(e){return e!=="listener"}function ro(e){return Math.floor(e/2)+1}function ca(e,t,n){let i=0;return t.forEach((o,r)=>{if(r!==n&&e>o)i++}),i}var bt=null;function so(e,t){if(!bt)return;let n=[...e.querySelectorAll(t)].find((i)=>i.dataset.itemId===bt);if(n)n.focus(),bt=null}function ao({list:e,rowSelector:t,handleSelector:n,onMove:i}){let o=()=>[...e.querySelectorAll(t)],r=()=>o().forEach((g)=>g.classList.remove("is-dragging","drop-before","drop-after")),s=null,a=(g,w)=>{let c=o().filter((h,k)=>k!==w);if(c.forEach((h)=>h.classList.remove("drop-before","drop-after")),g<c.length)c[g].classList.add("drop-before");else c[c.length-1]?.classList.add("drop-after")},l=(g)=>{if(g.button!==0||!(g.target instanceof Element))return;let w=g.target.closest(n),c=w?.closest(t);if(!w||!c||!w.dataset.itemId)return;let h=o().indexOf(c);if(h<0)return;g.preventDefault();try{w.setPointerCapture(g.pointerId)}catch{}s={from:h,itemId:w.dataset.itemId,to:h,pointerId:g.pointerId,handle:w},c.classList.add("is-dragging")},u=(g)=>{if(!s||g.pointerId!==s.pointerId)return;let w=o().map((c)=>{let h=c.getBoundingClientRect();return h.top+h.height/2});s.to=ca(g.clientY,w,s.from),a(s.to,s.from)},f=(g)=>{if(!s||g.pointerId!==s.pointerId)return;let{from:w,to:c,itemId:h,handle:k}=s;if(s=null,k.hasPointerCapture(g.pointerId))k.releasePointerCapture(g.pointerId);if(r(),c!==w)i(w,c,h)},p=(g)=>{if(g.key!=="ArrowUp"&&g.key!=="ArrowDown"||!(g.target instanceof Element))return;let w=g.target.closest(n),c=w?.closest(t);if(!w||!c||!w.dataset.itemId)return;g.preventDefault();let h=o(),k=h.indexOf(c),v=g.key==="ArrowUp"?k-1:k+1;if(k<0||v<0||v>=h.length)return;bt=w.dataset.itemId,i(k,v,w.dataset.itemId)},y=()=>{s=null,r()};return e.addEventListener("pointerdown",l),e.addEventListener("pointermove",u),e.addEventListener("pointerup",f),e.addEventListener("pointercancel",y),e.addEventListener("keydown",p),()=>{e.removeEventListener("pointerdown",l),e.removeEventListener("pointermove",u),e.removeEventListener("pointerup",f),e.removeEventListener("pointercancel",y),e.removeEventListener("keydown",p)}}var lo="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";var xe="oxitune-sync-queue",cn="oxitune-sync-queue-styles",vt="data-oxitune-sync-queue",He="data-oxitune-sync-queue-tab",da="M8 5v14l11-7z",ma="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",pa=/^[A-Za-z0-9_-]{11}$/;function mo(e){if(typeof e!=="object"||e===null)return null;let t=e.serviceEndpoint?.queueAddEndpoint;if(typeof t!=="object"||t===null)return null;let{queueTarget:n,queueInsertPosition:i}=t;return{videoId:typeof n?.videoId==="string"&&pa.test(n.videoId)?n.videoId:null,next:i==="INSERT_AFTER_CURRENT_VIDEO"}}function fa(e){return`
  html[${vt}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${vt}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(e)};
    font-size: 14px;
  }
  html[${He}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${xe} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--oxitune-font);
    color: var(--oxitune-text);
  }
  html[${He}] #${xe} { display: block; }
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
`}function ga(e){z();let t=document.getElementById(cn);if(!t)t=m("style",{id:cn}),document.head.appendChild(t);let n=fa(e);if(t.textContent!==n)t.textContent=n}var po=".oxitune-sq-handle",ya=".oxitune-sq-queued";function uo(e){let t=m("div",{className:"oxitune-sq-row"}),n=m("img",{className:"oxitune-sq-thumb"});n.alt="",n.loading="lazy",n.src=`https://i.ytimg.com/vi/${e.videoId}/default.jpg`;let i=m("div",{className:"oxitune-sq-text"});if(i.append(m("span",{className:"oxitune-sq-title",text:e.title}),m("span",{className:"oxitune-sq-sub",text:e.sub})),e.handle)t.appendChild(e.handle);if(t.append(n,i),e.actions.length){let o=m("div",{className:"oxitune-sq-actions"});o.append(...e.actions),t.appendChild(o)}return t}function co(e,t,n){let i=R({label:e,iconPath:t,muted:!0});return i.addEventListener("click",(o)=>{o.stopPropagation(),n()}),i}function fo(e,t,n){let i=d(),o=[];if(t.nowPlaying)o.push(m("div",{className:"oxitune-sq-heading",text:i.syncQueueNowPlaying})),o.push(uo({...t.nowPlaying,sub:t.nowPlaying.artist,actions:[]}));if(o.push(m("div",{className:"oxitune-sq-heading",text:i.syncQueueTitle})),t.queue.length===0)o.push(m("p",{className:"oxitune-sq-hint",text:X(t.myRole)?i.syncQueueEmpty:i.syncQueueListenerHint}));let r=t.myRole==="host"||t.myRole==="moderator";for(let s of t.queue){let a=[];if(X(t.myRole))a.push(co(i.syncQueuePlayNow(s.title),da,()=>n.play(s.id)));if(r||s.added_by_id===t.myId)a.push(co(i.syncQueueRemove(s.title),ma,()=>n.remove(s.id)));let l;if(X(t.myRole)&&t.queue.length>1)l=R({label:i.syncQueueDrag(s.title),iconPath:lo,muted:!0}),l.classList.add("oxitune-sq-handle"),l.dataset.itemId=s.id;let u=i.syncQueueFrom(s.added_by),f=uo({videoId:s.video_id,title:s.title,sub:s.artist?`${s.artist} · ${u}`:u,actions:a,handle:l});f.classList.add("oxitune-sq-queued"),o.push(f)}e.replaceChildren(...o),so(e,po)}var ve=null;function xt(){let e=document.documentElement;if(!ve){e.removeAttribute(He);return}let t=document.querySelector("ytmusic-player-page #side-panel"),n=document.getElementById(xe);if(t&&n?.parentElement!==t){if(!n)n=m("div",{id:xe}),ao({list:n,rowSelector:ya,handleSelector:po,onMove:(o,r,s)=>ve?.actions.move(s,r)});n.setAttribute("role","region"),n.setAttribute("aria-label",d().syncQueueTitle),fo(n,ve.model,ve.actions),t.insertBefore(n,t.querySelector(":scope > #tab-renderer"))}let i=document.querySelector("ytmusic-player-page tp-yt-paper-tab");e.toggleAttribute(He,!!n?.isConnected&&i?.getAttribute("aria-selected")==="true")}function go(e,t){ve={model:e,actions:t},ga(d().syncQueueTab),document.documentElement.setAttribute(vt,"");let n=document.getElementById(xe);if(n)fo(n,e,t);xt()}function dn(){ve=null,document.documentElement.removeAttribute(vt),document.documentElement.removeAttribute(He),document.getElementById(xe)?.remove(),document.getElementById(cn)?.remove()}function ke(e){if(e.is_host)return"host";let t=e.members.find((n)=>n.id===e.current_user_id);return t?oo(t):"dj"}function ha(e,t,n){let i=new Set(e.map((r)=>r.id)),o=new Set(t.map((r)=>r.id));return{joined:t.filter((r)=>r.id!==n&&!i.has(r.id)).map((r)=>r.nickname),left:e.filter((r)=>r.id!==n&&!o.has(r.id)).map((r)=>r.nickname)}}var ce=/^[A-Za-z0-9_-]{11}$/,ba=2,va=0.25,xa=0.05,wa=3,yo=0.1,ka=0.5,Ta=1,Ea=1000,Pa=1,ho=5000,Sa=4000,bo=15000,_a=3,La=4000,vo=8000,Ca=3,mn=1e4,Ma=3,xo=15000,wo=1,Ia=1e4,Aa=5,Ra=1e4,Na=1.2;function fn(e,t){return Number.isFinite(t)&&t>wo?Math.min(e,t-wo):e}function Oa(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null,playbackRate:1};if(ce.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;if(!e.is_playing){if(Math.abs(t.currentTime-e.current_time_secs)>ka)i.seekTo=fn(e.current_time_secs,t.duration);return i}let o=e.current_time_secs+Math.min(Ta,Math.max(0,n)),r=o-t.currentTime;if(Math.abs(r)>ba)i.seekTo=fn(o,t.duration);else if(Math.abs(r)>(t.correcting?xa:va))i.playbackRate=1+Math.max(-yo,Math.min(yo,r/wa));return i}class ko{windowSize;samples=[];constructor(e=30){this.windowSize=e}transitSecs(e,t){let n=t-e;if(this.samples.push(n),this.samples.length>this.windowSize)this.samples.shift();return(n-Math.min(...this.samples))/1000}reset(){this.samples=[]}}function za(e,t){return t!==null&&e<t&&t-e<Ra}function To(e,t){switch(e){case"next":return{kind:"next"};case"previous":return{kind:"previous"};case"play":return{kind:"set_playing",playing:!0};case"pause":return{kind:"set_playing",playing:!1};case"play_pause":return{kind:"set_playing",playing:t};default:return null}}var Va=[["ytmusic-player-bar .next-button","next"],["ytmusic-player-bar .previous-button","previous"],["ytmusic-player-bar #play-pause-button","play_pause"]];function Eo(){return new URLSearchParams(window.location.search).get("v")}function J(e){let t=b.getMoviePlayer(),n=t?.getVideoData?.()?.video_id,i=t?.getCurrentTime?.();if(n&&ce.test(n)&&typeof i==="number"&&Number.isFinite(i)){let o=t?.getDuration?.();return{videoId:n,currentTime:i,duration:typeof o==="number"&&o>0?o:e?e.duration:NaN}}return{videoId:Eo(),currentTime:e?e.currentTime:0,duration:e?e.duration:NaN}}function wt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function we(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class Po{notify;isHost=!1;inRoom=!1;canControl=!0;queueAdvance=null;constructor(e=L){this.notify=e}lastBroadcast=null;pendingNav=null;transit=new ko;newestPayloadMs=null;hostVideoId=null;ownNavs=new Map;requestedVideo=null;nearEndAtMs=Number.NEGATIVE_INFINITY;userInputAtMs=Number.NEGATIVE_INFINITY;avToggleAtMs=Number.NEGATIVE_INFINITY;pendingSeek=null;recentSeeks=[];seekLoopWarnedAtMs=Number.NEGATIVE_INFINITY;waitingLogged=!1;stall=null;finished=null;rateCorrection=null;setRoomState(e,t,n=!0){let i=e!==this.inRoom||t!==this.isHost;if(this.inRoom=e,this.isHost=t,this.canControl=n,_n(this.isGuest()),!i)return;this.pendingNav=null,this.lastBroadcast=null,this.transit.reset(),this.newestPayloadMs=null,this.hostVideoId=null,this.ownNavs.clear(),this.requestedVideo=null,this.nearEndAtMs=Number.NEGATIVE_INFINITY,this.recentSeeks=[],this.seekLoopWarnedAtMs=Number.NEGATIVE_INFINITY,this.waitingLogged=!1,this.stall=null,this.avToggleAtMs=Number.NEGATIVE_INFINITY,this.pendingSeek=null,this.finished=null,this.endRateCorrection()}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}isGuest(){return this.inRoom&&!this.isHost}handleRemotePlayback(e,t,n=Date.now()){if(!this.isGuest()||wt())return;if(za(e.timestamp_ms,this.newestPayloadMs))return;this.newestPayloadMs=e.timestamp_ms;let i=this.transit.transitSecs(e.timestamp_ms,n);if(ce.test(e.video_id))this.hostVideoId=e.video_id;let o=this.requestedVideo;if(o){if(e.video_id!==o.videoId&&n-o.atMs<Sa)return;this.requestedVideo=null}let r=J(t);if(this.waitingForHostsNext(e,r.videoId,t,n)){if(!this.waitingLogged)this.waitingLogged=!0,S("info","sync",`guest: finished ${e.video_id} before the host, waiting for its next song`);this.endRateCorrection(),b.pause();return}this.waitingLogged=!1;let s={videoId:r.videoId,paused:t?t.paused:!0,currentTime:r.currentTime,duration:r.duration,correcting:this.rateCorrection!==null},a=Oa(e,s,i);if(a.navigateTo){this.endRateCorrection();let l=this.pendingNav;if(l&&l.videoId===a.navigateTo&&n-l.atMs<ho)return;let u=l&&l.videoId===a.navigateTo?l.attempts+1:1;if(this.pendingNav={videoId:a.navigateTo,atMs:n,attempts:u},this.rememberOwnNav(a.navigateTo,n),S(u>1?"warn":"info","sync",`guest: host plays ${a.navigateTo} at ${e.current_time_secs.toFixed(1)} s, we have ${r.videoId??"nothing"}: `+(u>1?`switch didn't take, full reload (attempt ${u}); ${pe()}`:"switching")),b.pause(),u>1)window.location.href=`https://music.youtube.com/watch?v=${a.navigateTo}`;else we(a.navigateTo);return}if(this.pendingNav=null,!t)return;if(a.setPlaying===!0)b.play();else if(a.setPlaying===!1)b.pause();if(a.seekTo!==null)this.endRateCorrection(),this.logSeek(s.currentTime,a.seekTo,e,n),b.seekTo(a.seekTo);else this.setCatchUpRate(t,a.playbackRate)}waitingForHostsNext(e,t,n,i){let o=this.finished;return!!o&&e.video_id===o.videoId&&i-o.atMs<Ia&&o.duration-e.current_time_secs<Aa&&(t!==o.videoId||!!n?.ended)}logSeek(e,t,n,i){if(this.recentSeeks=this.recentSeeks.filter((o)=>i-o<mn),this.recentSeeks.push(i),S("info","sync",`guest: seek ${e.toFixed(1)} -> ${t.toFixed(1)} s (host ${n.current_time_secs.toFixed(1)} s, ${n.is_playing?"playing":"paused"})`),this.recentSeeks.length>=Ca&&i-this.seekLoopWarnedAtMs>mn)this.seekLoopWarnedAtMs=i,S("warn","sync",`guest: ${this.recentSeeks.length} seeks in ${mn/1000} s; ${pe()}`)}rememberOwnNav(e,t){for(let[n,i]of this.ownNavs)if(t-i>bo)this.ownNavs.delete(n);this.ownNavs.set(e,t)}setCatchUpRate(e,t){if(t===1){this.endRateCorrection();return}if(!this.rateCorrection||this.rateCorrection.video!==e)this.endRateCorrection(),S("info","sync",`guest: catching up at ${t.toFixed(3)}x`),this.rateCorrection={video:e,rate:e.playbackRate,preservesPitch:e.preservesPitch};e.preservesPitch=!0,e.playbackRate=t}endRateCorrection(){let e=this.rateCorrection;if(!e)return;this.rateCorrection=null,e.video.playbackRate=e.rate,e.video.preservesPitch=e.preservesPitch}noteLocalTick(e,t=Date.now()){if(!this.isGuest()||!e)return;let{videoId:n,currentTime:i,duration:o}=J(e);if(Number.isFinite(o)&&o>0&&o-i<_a){if(this.nearEndAtMs=t,n)this.finished={videoId:n,duration:o,atMs:t}}}checkPlayer(e){if(!this.inRoom||!e||e.paused||wt())return this.stall=null,!1;let{videoId:t,currentTime:n}=J(e),i=this.stall;if(!i||i.songId!==t||Math.abs(n-i.songTime)>0.05)return this.stall={songId:t,songTime:n,videoTime:e.currentTime,warned:i?.songId===t&&i.warned},!1;if(i.warned||e.currentTime-i.videoTime<Ma)return!1;return i.warned=!0,S("warn","player",`YouTube Music's player time is stuck while the video plays on; ${pe()}`),!0}noteUserInput(e=Date.now()){this.userInputAtMs=e}noteAvToggle(e=Date.now()){this.avToggleAtMs=e}applyPendingSeek(e,t=Date.now()){let n=this.pendingSeek;if(!n||!e)return;if(!this.isHost||t-n.atMs>xo){this.pendingSeek=null;return}let{videoId:i,duration:o}=J(e);if(i!==n.videoId||!Number.isFinite(o)||o<=0)return;this.pendingSeek=null;let r=fn(n.position+(n.playing?(t-n.atMs)/1000:0),o);S("info","sync",`host: ${i} is the other version of the song, carrying on at ${r.toFixed(1)} s`),b.seekTo(r)}handleLocalTrackChange(e,t=Date.now()){if(!this.isGuest()||!this.canControl||!e||!ce.test(e))return null;if(this.hostVideoId===null||e===this.hostVideoId)return null;let n=this.ownNavs.get(e);if(n!==void 0&&t-n<bo)return null;let i=(o)=>(S("info","sync",`guest: now on ${e}, host on ${this.hostVideoId}: ${o}, not sent; ${pe()}`),null);if(t-this.nearEndAtMs<La)return i("autoplay after the song ended");if(t-this.userInputAtMs>vo)return i("YouTube Music switched by itself");if(this.requestedVideo?.videoId===e)return null;if(this.requestedVideo={videoId:e,atMs:t},t-this.avToggleAtMs<vo)return S("info","sync",`guest: switched ${this.hostVideoId} to its other version ${e}, asking the host to keep its place`),{kind:"play_video",video_id:e,keep_position:!0};return S("info","sync",`guest: picked ${e} (host on ${this.hostVideoId}), asking the host to play it`),{kind:"play_video",video_id:e}}requestControl(e,t){if(!this.canControl){if(e.kind!=="next"){this.notify(d().syncListenerOnly);return}t("vote_sync_skip").then(()=>this.notify(d().syncVotedSkip)).catch((n)=>{S("warn","sync",`vote to skip failed: ${String(n)}`),this.notify(d().actionFailed)});return}t("send_sync_control",{action:e}).catch((n)=>{S("warn","sync",`request ${e.kind} to the host failed: ${String(n)}`),this.notify(d().actionFailed)})}applyRemoteControl(e){if(!this.inRoom||!this.isHost)return;let{from:t,action:n,source:i}=e,o=i?.kind==="vote"?d().syncVoteSkipped:i?.kind==="queue"?d().syncFromQueue(i.title,t):null;switch(n.kind){case"next":b.next(),this.notify(o??d().syncGuestNext(t));break;case"previous":b.previous(),this.notify(o??d().syncGuestPrevious(t));break;case"set_playing":{let r=b.getVideo();if(!r||r.paused!==n.playing)return;if(n.playing)b.play();else b.pause();this.notify(o??(n.playing?d().syncGuestResumed(t):d().syncGuestPaused(t)));break}case"play_video":{if(!ce.test(n.video_id)||n.video_id===Eo())return;if(n.keep_position){let r=b.getVideo();this.pendingSeek={videoId:n.video_id,position:J(r).currentTime,playing:!!r&&!r.paused,atMs:Date.now()},we(n.video_id);break}we(n.video_id),this.notify(o??d().syncGuestPicked(t));break}}}advanceQueue(e,t,n){if(!t||wt())return;let{currentTime:i,duration:o}=J(t),r=o-i;if(!Number.isFinite(r)||r>Na&&!t.ended)return;this.playNextFromQueue(e,n,t,!1)}playNextFromQueue(e,t,n=b.getVideo(),i=!0,o=Date.now()){if(!this.inRoom||!this.isHost||e===0)return!1;let{videoId:r}=J(n),s=this.queueAdvance;if(s&&s.from===r&&o-s.atMs<ho)return!0;this.queueAdvance={from:r,atMs:o};let a=()=>{if(i)b.nextInYtm()};return t("sync_queue_take_next").then((l)=>{let u=l;if(!u||!ce.test(u.video_id)){a();return}b.pause(),we(u.video_id),this.notify(d().syncFromQueue(u.title,u.added_by))}).catch((l)=>{S("warn","sync",`host: playing from the shared queue failed: ${String(l)}`),a()}),!0}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!t||wt())return;if(this.pendingSeek&&Date.now()-this.pendingSeek.atMs<xo)return;if(t.ended)return;let{videoId:o,currentTime:r}=J(t);if(!o)return;let s=Date.now(),a=this.lastBroadcast,l=a?a.position+(s-a.atMs)/1000*a.rate:0,u=!!a&&a.playing&&!t.paused&&Math.abs(r-l)>Pa,f=!!a&&a.videoId!==o;if(!i&&!u&&!f&&a&&s-a.atMs<Ea)return;this.lastBroadcast={atMs:s,videoId:o,position:r,rate:t.playbackRate,playing:!t.paused},n("broadcast_sync_state",{playback:{video_id:o,title:e.title,artist:e.artist,current_time_secs:r,is_playing:!t.paused,timestamp_ms:s}}).catch((p)=>S("warn","sync",`host: broadcast failed: ${String(p)}`))}}var F=null,de=null,kt=null,j=null,gn=null,qa=1000;function So(){let e=j,t=de;if(!e||!t){dn();return}let n=gn,i=(o)=>(r)=>{t(o,{itemId:r}).catch((s)=>{S("warn","sync",`${o} failed: ${String(s)}`),L(d().actionFailed)})};go({queue:e.queue??[],nowPlaying:n?.videoId&&ce.test(n.videoId)?{videoId:n.videoId,title:n.title,artist:n.artist}:null,myId:e.current_user_id,myRole:ke(e)},{play:i("sync_queue_play"),remove:i("sync_queue_remove"),move:(o,r)=>{t("sync_queue_move",{itemId:o,toIndex:r}).catch((s)=>{S("warn","sync",`sync_queue_move failed: ${String(s)}`),L(d().actionFailed)})}})}function Ha(){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,bubbles:!0}))}function Da(e,t){if(!j||!X(ke(j))){L(d().syncQueueListenerNo);return}if(!e.videoId){L(d().syncQueueSongsOnly);return}t("sync_queue_add",{input:e.videoId,next:e.next}).then(()=>L(e.next?d().syncQueuedNext:d().syncQueued)).catch((n)=>{S("warn","sync",`adding to the shared queue failed: ${String(n)}`),L(d().actionFailed)})}function _o(e){let t=F;if(!t||!de||!t.isGuest())return!1;let n=b.getVideo(),i=To(e,n?n.paused:!0);if(!i)return!1;return t.requestControl(i,de),!0}function Lo(e){let t=F;if(!t||!de||!t.isGuest())return!1;return t.requestControl({kind:"play_video",video_id:e},de),!0}function pn(e,t,n="left"){let i=j;if(j=e,un(e?{listeners:e.members.length,isHost:e.is_host}:null),So(),!t)return;if(!e){if(!i)return;L(n==="kicked"?d().syncKicked:n==="lost"?d().syncLost:d().syncRoomClosed);return}if(!i||i.room_id!==e.room_id){if(!e.is_host)L(d().syncConnected);return}if(e.reconnecting){if(!i.reconnecting)L(d().syncReconnecting);return}let o=(p)=>p.members.find((y)=>y.is_host)?.id;if(o(i)!==o(e)){let p=e.members.find((y)=>y.is_host);if(e.is_host)L(d().syncYouHost);else if(p)L(d().syncNewHost(p.nickname));return}if(i.reconnecting)return;let{joined:r,left:s}=ha(i.members,e.members,e.current_user_id),a=[...r.map(d().syncJoined),...s.map(d().syncLeft)],l=e.skip_votes??[],u=l.filter((p)=>p!==e.current_user_id&&!(i.skip_votes??[]).includes(p));for(let p of u){let y=e.members.find((g)=>g.id===p)?.nickname;if(y)a.push(d().syncVoteProgress(y,l.length,ro(e.members.length)))}let f=ke(e);if(f!==ke(i))a.push(f==="moderator"?d().syncRoleModerator:f==="listener"?d().syncRoleListener:d().syncRoleDj);if(a.length>0)L(a.join(" · "))}var Co={id:"sync_room",manifest:Qi,name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Po;F=t,de=e.invoke;let n=[];if(e.events)n.push(e.events.listen("sync-room-updated",(s)=>{t.setRoomState(!0,s.payload.is_host,X(ke(s.payload))),pn(s.payload,!0)}),e.events.listen("sync-room-left",(s)=>{t.setRoomState(!1,!1),pn(null,!0,s.payload?.reason??"left")}),e.events.listen("sync-playback-remote",(s)=>{t.handleRemotePlayback(s.payload,e.getVideoElement())}),e.events.listen("sync-control-remote",(s)=>{t.applyRemoteControl(s.payload)}),e.events.listen("sync-reaction",(s)=>{Gn(s.payload.emoji,s.payload.from)}));let i=(s)=>{if(!(s.target instanceof Element))return;let a=s.target;if(a.closest("ytmusic-player-page tp-yt-paper-tab"))setTimeout(xt,0);if(t.isInRoom()){let p=a.closest("ytmusic-menu-service-item-renderer"),y=p?mo(p.data):null;if(y){s.preventDefault(),s.stopImmediatePropagation(),Ha(),Da(y,e.invoke);return}}if(!s.isTrusted)return;if(t.isRoomHost()&&a.closest("ytmusic-player-bar .next-button")&&t.playNextFromQueue(j?.queue?.length??0,e.invoke)){s.preventDefault(),s.stopImmediatePropagation();return}if(!t.isGuest())return;let l=Va.find(([p])=>a.closest(p));if(!l)return;let u=e.getVideoElement(),f=To(l[1],u?u.paused:!0);if(!f)return;s.preventDefault(),s.stopImmediatePropagation(),t.requestControl(f,e.invoke)};window.addEventListener("click",i,!0);let o=(s)=>{if(!s.isTrusted)return;if(t.noteUserInput(),s.target instanceof Element&&s.target.closest("ytmusic-av-toggle"))t.noteAvToggle()};window.addEventListener("pointerdown",o,!0),window.addEventListener("keydown",o,!0);let r=setInterval(xt,qa);qt(()=>t.playNextFromQueue(j?.queue?.length??0,e.invoke)),e.invoke("get_sync_room_state").then((s)=>{if(F!==t||!s||typeof s!=="object")return;let a=s;if(t.setRoomState(!0,a.is_host,X(ke(a))),pn(a,!1),!a.is_host&&a.playback_state)t.handleRemotePlayback(a.playback_state,e.getVideoElement())}).catch((s)=>S("warn","sync",`restoring the room after a page load failed: ${String(s)}`)),kt=()=>{n.forEach((s)=>s.then((a)=>a())),window.removeEventListener("click",i,!0),window.removeEventListener("pointerdown",o,!0),window.removeEventListener("keydown",o,!0),clearInterval(r),qt(null),t.setRoomState(!1,!1),F=null,de=null,j=null,gn=null,un(null),dn()}},onTrackChange(e,t){let n=F;if(!n)return;if(gn=e,So(),n.isInRoom()){let o=b.getMoviePlayer()?.getPlayerResponse?.()?.playabilityStatus;if(o?.status&&o.status!=="OK")S("warn","player",`${e.videoId??"?"} won't play here; ${pe()}`)}n.applyPendingSeek(t.getVideoElement()),n.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0);let i=n.handleLocalTrackChange(e.videoId);if(i)n.requestControl(i,t.invoke)},onPlaybackChange(e,t){F?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){let n=t.getVideoElement();F?.broadcastLocalState(t.track,n,t.invoke),F?.noteLocalTick(n),F?.checkPlayer(n),F?.applyPendingSeek(n),F?.advanceQueue(j?.queue?.length??0,n,t.invoke)},onDestroy(){if(kt)kt(),kt=null}};var Mo={id:"app.oxitune.power",name:"Smart Power & Audio Watchdog",version:"1.0.0",apiVersion:1,description:"Keeps the system awake during playback",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","page","internal:config","internal:power"],entry:"index.js"};var Tt=null,$a=(e,t)=>t&&e!==!1,Io={id:"power_watchdog",manifest:Mo,name:"Smart Power & Audio Watchdog",description:"Keeps the system awake during playback",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=null,o=(y)=>{if(n===y)return;n=y,e.invoke("set_inhibit_sleep",{inhibit:y}).catch((g)=>{if(n===y)n=!y;console.error("[Oxitune Power] set_inhibit_sleep failed:",g)})},r=async()=>{if(!("wakeLock"in navigator)||t!==null)return;try{t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null})}catch{}},s=()=>{t?.release().catch(()=>{}),t=null},a=()=>{let y=e.getVideoElement(),g=!!y&&!y.paused&&!y.ended,w=$a(e.config.inhibit_sleep,g);if(o(w),w)r();else s()},l=(y)=>{for(let g of["play","playing","pause","ended"])y.addEventListener(g,a);i=y},u=(y)=>{for(let g of["play","playing","pause","ended"])y.removeEventListener(g,a)},f=e.getVideoElement();if(f)l(f);a();let p=window.setInterval(()=>{let y=e.getVideoElement();if(y&&y!==i){if(i)u(i);l(y),a()}},1000);Tt=()=>{if(clearInterval(p),i)u(i);i=null,s(),o(!1)}},onDestroy(){if(Tt)Tt(),Tt=null}};var Ao={id:"app.oxitune.remote",name:"Mobile Web Remote",version:"1.0.0",apiVersion:1,description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",author:"Oxitune",matches:["https://music.youtube.com/*"],runAt:"document-idle",permissions:["player:read","player:control","page","internal:remote"],entry:"index.js"};var No=(e)=>typeof e==="object"&&e!==null&&!Array.isArray(e),C=(e,...t)=>t.reduce((n,i)=>n==null?void 0:n[i],e),Pt=/^[A-Za-z0-9_-]{11}$/;function Te(e){let t=C(e,"runs");if(Array.isArray(t))return t.map((i)=>typeof C(i,"text")==="string"?C(i,"text"):"").join("");let n=C(e,"simpleText");return typeof n==="string"?n:""}function yn(e){if(!Array.isArray(e)||e.length===0)return null;let t=C(e[e.length-1],"url");return typeof t==="string"?t:null}function Ro(e,t){return Te(C(e,"flexColumns",t,"musicResponsiveListItemFlexColumnRenderer","text"))}function Ua(e){let t=C(e,"playlistItemData","videoId")??C(e,"overlay","musicItemThumbnailOverlayRenderer","content","musicPlayButtonRenderer","playNavigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Pt.test(t))return null;return{video_id:t,title:Ro(e,0),subtitle:Ro(e,1),thumbnail:yn(C(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function ja(e){let t=C(e,"title","runs",0,"navigationEndpoint","watchEndpoint","videoId");if(typeof t!=="string"||!Pt.test(t))return null;return{video_id:t,title:Te(C(e,"title")),subtitle:Te(C(e,"subtitle")),thumbnail:yn(C(e,"thumbnail","musicThumbnailRenderer","thumbnail","thumbnails"))}}function hn(e,t=20){let n=[],i=new Set,o=(r,s)=>{if(n.length>=t||s>40)return;if(Array.isArray(r)){for(let a of r)o(a,s+1);return}if(!No(r))return;for(let[a,l]of Object.entries(r)){let u=null;if(a==="musicResponsiveListItemRenderer")u=Ua(l);else if(a==="musicCardShelfRenderer")u=ja(l);if(u&&!i.has(u.video_id)){if(i.add(u.video_id),n.push(u),n.length>=t)return}o(l,s+1)}};return o(e,0),n}function Et(e){let t=C(e,"playlistPanelVideoRenderer")??C(e,"playlistPanelVideoWrapperRenderer","primaryRenderer","playlistPanelVideoRenderer");return No(t)?t:null}function Oo(e){let t=[];return e.forEach((n,i)=>{let o=Et(n),r=C(o,"videoId");if(!o||typeof r!=="string")return;t.push({id:`${i}:${r}`,video_id:r,title:Te(C(o,"title")),artist:Te(C(o,"shortBylineText"))||Te(C(o,"longBylineText")),thumbnail:yn(C(o,"thumbnail","thumbnails")),current:C(o,"selected")===!0})}),t}function zo(e,t){let n=t.indexOf(":");if(n<=0)return-1;let i=Number(t.slice(0,n)),o=t.slice(n+1),r=Number.isInteger(i)?Et(e[i]):null;if(r&&C(r,"videoId")===o)return i;return e.findIndex((s)=>C(Et(s),"videoId")===o)}function Vo(e,t){if(!t)return e.length;let n=e.findIndex((i)=>C(Et(i),"selected")===!0);return n>=0?n+1:e.length}function qo(e,t,n=15000){if(!e)return!0;let{position_secs:i,sampled_at_ms:o,...r}=e,{position_secs:s,sampled_at_ms:a,...l}=t;if(JSON.stringify(r)!==JSON.stringify(l))return!0;if(a-o>=n)return!0;let u=e.playing?i+(a-o)/1000:i;return Math.abs(s-u)>1.5}var Ga="EgWKAQIIAWoMEA4QChADEAQQCRAF",Wa=1000,Ya=2000;function vn(){return document.querySelector("#queue")}function It(){let e=vn()?.queue?.store?.store?.getState().queue?.items;return Array.isArray(e)?e:[]}function St(e,t){let n=vn();if(!n?.dispatch)throw Error("remote.error.noQueue");n.dispatch({type:e,payload:t})}function Do(){let e=document.querySelector("ytmusic-app")?.networkManager;if(!e||typeof e.fetch!=="function")throw Error("remote.error.unsupported");return e}async function Qa(e){let t=Do(),n=hn(await t.fetch("/search",{query:e,params:Ga}));if(n.length===0)n=hn(await t.fetch("/search",{query:e}));return n}async function Ka(e,t){let n=vn()?.queue?.store?.store;if(!n)throw Error("remote.error.noQueue");let i=n.getState().queue??{},r=(await Do().fetch("/music/get_queue",{queueContextParams:i.queueContextParams,queueInsertPosition:t?"INSERT_AFTER_CURRENT_VIDEO":"INSERT_AT_END",videoIds:[e]}))?.queueDatas,s=Array.isArray(r)?r.map((l)=>l&&typeof l==="object"&&("content"in l)?l.content:null).filter(Boolean):[];if(s.length===0)throw Error("remote.error.unsupported");let a=It();St("ADD_ITEMS",{nextQueueItemId:n.getState().queue?.nextQueueItemId,index:Vo(a,t),items:s,shuffleEnabled:!1,shouldAssignIds:!0})}function bn(e){let t=zo(It(),e);if(t<0)throw Error("remote.error.gone");return t}function Xa(){let e=getComputedStyle(document.documentElement),t=e.getPropertyValue("--oxitune-accent-primary").trim(),n=e.getPropertyValue("--oxitune-accent-secondary").trim(),i=e.getPropertyValue("--oxitune-accent").trim();return t&&n&&i?{primary:t,secondary:n,accent:i}:null}function Ja(){let e=b.getVideo(),n=document.getElementById("movie_player")?.getCurrentTime?.();return{playing:!!e&&!e.paused&&!e.ended,position_secs:typeof n==="number"&&Number.isFinite(n)?n:e?.currentTime??0,sampled_at_ms:Date.now(),volume:e?Se(e)/100:1,muted:e?_e(e):!1,like:b.getLikeStatus(),shuffle:b.isShuffleOn(),repeat:b.getRepeatMode(),accent:Xa()}}async function Za(e,t){switch(t.kind){case"command":if(t.command==="shuffle")b.toggleShuffle();else if(t.command==="repeat")b.cycleRepeat();else e.sendPlayerCommand(t.command);return null;case"seek":return b.seekTo(t.position_secs),null;case"volume":return b.setVolume(t.volume),null;case"play":if(!Pt.test(t.video_id))throw Error("remote.error.invalid");if(!Lo(t.video_id))we(t.video_id);return null;case"search":return Qa(t.query);case"enqueue":return await Ka(t.video_id,t.next),null;case"queue_jump":return St("SET_INDEX",bn(t.item_id)),null;case"queue_remove":return St("REMOVE_ITEM",bn(t.item_id)),null;case"queue_move":{let n=bn(t.item_id),i=Math.max(0,Math.min(t.to_index,It().length-1));return St("MOVE_ITEM",{fromIndex:n,toIndex:i}),null}}}var _t=[],Lt=[],Ct=null,Mt="";function Fo(){Lt.forEach((e)=>clearInterval(e)),Lt=[],Ct=null,Mt=""}function el(e){if(Lt.length>0)return;let t=()=>{let i=Ja();if(!qo(Ct,i))return;Ct=i,e.invoke("remote_publish",{kind:"state",data:i}).catch(()=>{return})},n=()=>{let i=Oo(It()),o=JSON.stringify(i);if(o===Mt)return;Mt=o,e.invoke("remote_publish",{kind:"queue",data:i}).catch(()=>{return})};t(),n(),Lt.push(window.setInterval(t,Wa),window.setInterval(n,Ya))}function Ho(e,t){if(t>0)el(e);else Fo()}function $o(e){let t=e.events;if(!t)return;t.listen("remote-action",({payload:n})=>{if(!n?.action)return;Za(e,n.action).then((i)=>{if(n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!0,data:i??null}).catch(()=>{return});Ct=null,Mt=""},(i)=>{let o=i instanceof Error?i.message:String(i);if(console.warn("[Oxitune Remote] action failed:",n.action.kind,o),n.id!=null)e.invoke("remote_reply",{id:n.id,ok:!1,error:o}).catch(()=>{return})})}).then((n)=>_t.push(n)),t.listen("remote-clients",({payload:n})=>Ho(e,n)).then((n)=>_t.push(n)),e.invoke("remote_clients").then((n)=>Ho(e,typeof n==="number"?n:0)).catch(()=>{return})}function Bo(){_t.forEach((e)=>e()),_t=[],Fo()}var Uo={id:"web_remote",manifest:Ao,name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){$o(e)},onDestroy(){Bo()}};var Z="oxitune-window-controls",De={minimize:"M5 11.5h14v1H5z",maximize:"M5 5h14v14H5V5zm1 1v12h12V6H6z",restore:"M8 5h11v11h-3v3H5V8h3V5zm1 1v2h7v7h2V6H9zM6 9v9h9V9H6z",close:"M6.7 6 12 11.3 17.3 6l.7.7-5.3 5.3 5.3 5.3-.7.7-5.3-5.3L6.7 18l-.7-.7 5.3-5.3L6 6.7z"},tl=132,nl=`
  html:has(#${Z}) ytmusic-nav-bar #right-content {
    right: 0 !important;
    padding-right: 0 !important;
    margin-right: ${tl+8}px !important;
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
`,il=["a","button","input","textarea","select",'[role="button"]','[role="tab"]',"tp-yt-paper-icon-button","yt-icon-button","ytmusic-search-box","ytmusic-settings-button","ytmusic-cast-button","ytmusic-chip-cloud-renderer",`#${Z}`,"#oxitune-nav-slot"].join(", ");async function xn(e){return(await M("window_action",{action:e}))?.maximized===!0}function Fe(e){xn(e).then((t)=>{if(e==="toggle_maximize")Yo(t)}).catch((t)=>console.error("[Oxitune] Window action failed:",t))}function ol(e){if(!(e instanceof Element))return!1;if(!e.closest("ytmusic-nav-bar, #nav-bar-background"))return!1;return e.closest(il)===null}function rl(){return document.fullscreenElement!=null||document.querySelector("ytmusic-player-page[player-fullscreened]")!==null}var ee=null,jo=!1,Go=!1;function Wo(){let e=rl();if(e===Go)return;Go=e,xn(e?"enter_fullscreen":"exit_fullscreen").catch((t)=>S("warn","Window",`fullscreen ${e} failed: ${String(t)}`))}function Yo(e){if(!ee)return;let t=e?d().windowRestore:d().windowMaximize;Ke(ee,e?De.restore:De.maximize),ee.setAttribute("aria-label",t),ee.dataset.oxituneTooltip=t}async function Qo(){if(!ee)return;Yo(await xn("state").catch(()=>!1))}function sl(){if(jo)return;jo=!0,document.addEventListener("mousedown",(t)=>{if(t.button!==0||!ol(t.target))return;if(t.preventDefault(),t.detail===2)Fe("toggle_maximize");else Fe("start_dragging")},!0);let e=null;window.addEventListener("resize",()=>{if(e)clearTimeout(e);e=setTimeout(()=>void Qo(),150)}),document.addEventListener("fullscreenchange",Wo),new MutationObserver(Wo).observe(document.documentElement,{subtree:!0,attributes:!0,attributeFilter:["player-fullscreened"]})}function Ko(){if(typeof window>"u"||!window.__TAURI__?.core)return;if(sl(),document.getElementById(Z)?.isConnected)return;if(!document.querySelector("ytmusic-nav-bar")||!document.body)return;if(z(),!document.getElementById("oxitune-window-controls-styles")){let i=document.createElement("style");i.id="oxitune-window-controls-styles",i.textContent=nl,document.head.appendChild(i)}let e=m("div",{id:Z}),t=R({label:d().windowMinimize,iconPath:De.minimize});t.addEventListener("click",()=>Fe("minimize")),ee=R({label:d().windowMaximize,iconPath:De.maximize}),ee.addEventListener("click",()=>Fe("toggle_maximize"));let n=R({label:d().windowClose,iconPath:De.close});n.classList.add("oxitune-window-close"),n.addEventListener("click",()=>Fe("close")),e.append(t,ee,n),document.body.appendChild(e),Qo()}var Xo=!1,Jo="";function al(){if(document.getElementById("oxitune-player-bar-edges")||!document.head)return;let e=document.createElement("style");e.id="oxitune-player-bar-edges",e.textContent=`
  ytmusic-player-bar {
    --ytmusic-player-bar-fullscreen-progress-bar-inset: 0px !important;
  }
`,document.head.appendChild(e)}function $e(){al();let e=document.documentElement,t=`${Math.max(0,window.innerWidth-e.clientWidth)}px`;if(t===Jo&&e.style.getPropertyValue("--ytmusic-scrollbar-width")===t)return;Jo=t,e.style.setProperty("--ytmusic-scrollbar-width",t)}function Zo(){if(Xo||typeof window>"u")return;Xo=!0,$e(),window.addEventListener("resize",$e),new ResizeObserver($e).observe(document.documentElement)}var tr="oxitune.tips.v1",ne="oxitune-tip",er="oxitune-tip-styles",ll=15000,te=12,nr=[{anchor:"#oxitune-menu-btn",title:()=>d().tipMenuTitle,body:()=>d().tipMenuBody},{anchor:"ytmusic-player-bar",title:()=>d().tipPlayerTitle,body:()=>d().tipPlayerBody},{anchor:"#oxitune-menu-btn",title:()=>d().tipShortcutsTitle,body:()=>d().tipShortcutsBody}];function ul(e,t){return e.onboarding_done===!0&&!t}function cl(e,t,n){let i=e.top+e.height+te+t.height<=n.height||e.top<t.height+te,o=i?e.top+e.height+te:e.top-t.height-te,r=e.left+e.width/2-t.width/2,s=Math.min(Math.max(te,r),Math.max(te,n.width-t.width-te));return{top:Math.max(te,o),left:s,below:i}}function dl(e,t=nr){return t.filter((n)=>{let i=e.querySelector(n.anchor);if(!i)return!1;let o=i.getBoundingClientRect();return o.width>0&&o.height>0})}function ir(){try{return localStorage.getItem(tr)==="1"}catch{return!1}}function ml(){try{localStorage.setItem(tr,"1")}catch{}}var pl=`
  #${ne} {
    position: fixed;
    z-index: 2204;
    box-sizing: border-box;
    width: 320px;
    padding: 16px 16px 8px;
    background: var(--oxitune-surface);
    border-radius: 12px;
    box-shadow: 0 4px 32px rgba(0, 0, 0, 0.5);
    font: 400 14px/20px var(--oxitune-font);
    color: var(--oxitune-text);
    animation: oxitune-tip-in 0.15s ease-out;
  }
  #${ne} .oxitune-tip-title { display: block; font: 500 16px/24px var(--oxitune-font); margin-bottom: 4px; }
  #${ne} .oxitune-tip-body { display: block; color: var(--oxitune-text-secondary); }
  #${ne} .oxitune-tip-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
  #${ne} .oxitune-tip-count { flex: 1; font-size: 12px; color: var(--oxitune-text-secondary); }
  .oxitune-tip-target { outline: 2px solid var(--oxitune-accent-color) !important; outline-offset: 2px; border-radius: 20px; }
  @keyframes oxitune-tip-in { from { opacity: 0; transform: translateY(-4px); } }
  @media (prefers-reduced-motion: reduce) { #${ne} { animation: none; } }
`;function fl(){if(z(),document.getElementById(er))return;let e=document.createElement("style");e.id=er,e.textContent=pl,(document.head||document.documentElement).appendChild(e)}var At=!1;function or(){document.getElementById(ne)?.remove(),document.querySelectorAll(".oxitune-tip-target").forEach((e)=>e.classList.remove("oxitune-tip-target"))}function rr(e,t,n){or();let i=e[t],o=i?document.querySelector(i.anchor):null;if(!i||!o){n();return}let r=t===e.length-1,s=m("div",{id:ne});s.setAttribute("role","dialog"),s.setAttribute("aria-label",i.title());let a=m("button",{className:"oxitune-button oxitune-button--filled",text:r?d().tipDone:d().tipNext}),l=m("button",{className:"oxitune-button",text:d().tipSkip}),u=m("div",{className:"oxitune-tip-actions"});if(u.append(m("span",{className:"oxitune-tip-count",text:`${t+1}/${e.length}`})),!r)u.append(l);u.append(a),s.append(m("span",{className:"oxitune-tip-title",text:i.title()}),m("span",{className:"oxitune-tip-body",text:i.body()}),u),document.body.appendChild(s),o.classList.add("oxitune-tip-target");let f=o.getBoundingClientRect(),p=cl({top:f.top,left:f.left,width:f.width,height:f.height},{width:s.offsetWidth,height:s.offsetHeight},{width:window.innerWidth,height:window.innerHeight});s.style.top=`${p.top}px`,s.style.left=`${p.left}px`,a.addEventListener("click",()=>rr(e,t+1,n)),l.addEventListener("click",n),a.focus()}function wn(e=!1){if(At||!e&&ir())return;At=!0,fl();let t=Date.now(),n=(r)=>{if(r.key==="Escape")i()},i=()=>{or(),ml(),window.removeEventListener("keydown",n,!0),window.removeEventListener("resize",i),At=!1},o=()=>{let r=dl(document);if(r.length===0||r[0].anchor!==nr[0].anchor){if(Date.now()-t<ll)setTimeout(o,500);else At=!1;return}window.addEventListener("keydown",n,!0),window.addEventListener("resize",i),rr(r,0,i)};o()}function kn(e){if(ul(e,ir()))wn()}var me=(e)=>{M(e).catch((t)=>{console.error(`[Oxitune] ${e} failed:`,t),L(d().actionFailed)})};function gl(){eo({onSyncChipClick:()=>me("toggle_sync_window"),items:[{id:"settings",iconPath:_.tune,label:d().menuSettings,hint:"Ctrl+,",onSelect:()=>me("toggle_settings_window")},{id:"local",iconPath:_.folderMusic,label:d().menuLocal,onSelect:()=>me("toggle_local_library_window")},{id:"sync",iconPath:_.group,label:d().menuSync,onSelect:()=>me("toggle_sync_window")},{id:"remote",iconPath:_.phone,label:d().menuRemote,onSelect:()=>me("open_remote_pairing")},{id:"mini",iconPath:_.miniPlayer,label:d().menuMiniPlayer,onSelect:()=>me("toggle_mini_player")}]})}var yl={lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!1]};function sr(e){let t={};for(let[n,[i,o]]of Object.entries(yl)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}var hl=4,ar=2000;async function lr(){console.log("[Oxitune] Initializing desktop integration bridge...");let e={};gl();let t=()=>{to(),Ko(),$e()};Zo(),t();let n=setInterval(t,1000);window.addEventListener("pagehide",()=>clearInterval(n));let i=async(c)=>{try{let h=await M("get_config",{},{timeoutMs:c});return h&&typeof h==="object"?h:null}catch(h){return console.warn("[Oxitune] Loading config failed, retrying:",h),null}},o=!1;for(let c=0;c<hl&&!o;c++){if(c>0)await new Promise((k)=>setTimeout(k,250));let h=await i(2000);if(h)Object.assign(e,h),o=!0}let s=new $t({track:null,config:e,invoke:M,sendPlayerCommand:(c)=>{y(c)},getVideoElement:()=>b.getVideo(),listen:(c,h)=>Nt.listen(c,h)},(c,h)=>{if(c instanceof Xe)c.report("hook",h)});s.register(wi),s.register(Ii),s.register(Ri),s.register(Oi),s.register(qi),s.register(Di),s.register(Ui),s.register(Gi),s.register(Yi),s.register(Co),s.register(Io),s.register(Uo);let a=(c)=>{let h=Je(c);if(s.disable(c),h)Jn(h)};for(let c of Kn({sendPlayerCommand:(h)=>y(h),onSwitchedOff:a}))s.register(c);try{await s.initAll(sr(e))}catch(c){console.error("[Oxitune] Registry init error:",c)}let l=new Ht,u=0,f=Date.now();async function p(c,h,k){try{await M("update_track_info",{track:{title:c.title,artist:c.artist,album:c.album||null,cover_url:c.coverUrl||null,duration_secs:Math.round(c.durationSecs||0),current_time_secs:Math.round(h),is_playing:k,video_id:c.videoId||null,playlist_id:c.playlistId||null,sampled_at_ms:Date.now()}})}catch(v){console.error("[Oxitune] Failed to sync track info to backend:",v)}}l.onTrackChange(async(c)=>{u=c.currentTimeSecs||0,f=Date.now(),s.handleTrackChange(c),await p(c,c.currentTimeSecs||0,c.isPlaying)}),l.onPlaybackChange(async(c)=>{s.handlePlaybackChange(c);let h=l.getCurrentTrack();if(h)h.isPlaying=c,u=h.currentTimeSecs||0,f=Date.now(),await p(h,h.currentTimeSecs||0,c)}),l.onTick((c)=>{s.handleTick(c);let h=l.getCurrentTrack();if(!h||!h.isPlaying)return;let k=Date.now(),v=(k-f)/1000,x=u+v;if(Math.abs(c-x)>2||v>=15)u=c,f=k,h.currentTimeSecs=Math.round(c),p(h,c,!0)});function y(c){if(_o(c))return;switch(c){case"play":b.play();break;case"pause":case"stop":b.pause();break;case"play_pause":b.playPause();break;case"next":b.next();break;case"previous":b.previous();break;case"like":b.toggleLike();break;case"dislike":b.toggleDislike();break;case"mute":b.toggleMute();break}}let g=(c,h)=>{Nt.listen(c,(k)=>h(k.payload))};g("plugin-state-changed",(c)=>{if(c&&!c.enabled)s.disable(c.id)}),g("plugin-settings-changed",(c)=>{if(c?.id&&c.values)Je(c.id)?.setSettings(c.values)}),g("plugin-media-progress",(c)=>{if(c?.plugin)Je(c.plugin)?.mediaProgress(c)}),g("plugin-media-tools",(c)=>{if(c?.state)Xn().forEach((h)=>h.mediaTools(c))}),g("player-command",(c)=>y(c)),g("tray-command",(c)=>y(c)),g("mpris-command",(c)=>y(c)),g("global-shortcut-event",(c)=>y(c)),g("player-seek",(c)=>b.seekTo(c)),g("mpris-command-seek",(c)=>b.seekTo(c)),g("player-volume",(c)=>b.setVolume(c));let w=(c)=>{Object.assign(e,c);let h=sr(e);for(let[k,v]of Object.entries(h))if(v)s.enable(k).catch((x)=>console.error(`[Oxitune] Failed to enable plugin ${k}:`,x));else s.disable(k).catch((x)=>console.error(`[Oxitune] Failed to disable plugin ${k}:`,x))};if(g("config-updated",(c)=>{if(c&&typeof c==="object")w(c)}),!o){console.error("[Oxitune] Config not loaded yet; plugins run on defaults until it is.");let c=setInterval(()=>{i(ar).then((h)=>{if(!h||o)return;o=!0,clearInterval(c),w(h),kn(e)})},ar)}else kn(e);g("onboarding-finished",()=>wn(!0)),window.addEventListener("keydown",(c)=>{if(c.ctrlKey&&c.key===","||c.key==="F2")c.preventDefault(),me("toggle_settings_window")}),console.log("[Oxitune] Integration successfully activated.")}var bl=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(bl)if(Qn(),Nn(),Vn(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>lr());else lr();})();
