'use strict';
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
function closeMenu(){ navigation?.classList.remove('is-open'); menuButton?.setAttribute('aria-expanded','false'); }
menuButton?.addEventListener('click',()=>{
  const open = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded',String(open));
});
navigation?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&navigation?.classList.contains('is-open')){closeMenu();menuButton.focus();}});

// Keep one Bandcamp iframe alive when minimized. Only selecting a different song
// or explicitly stopping playback replaces its source.
const player = document.getElementById('music-player');
const frame = document.getElementById('bandcamp-player');
const playerBody = document.getElementById('player-body');
const playerTitle = document.getElementById('player-title');
const minimize = document.getElementById('player-minimize');
const playerStatus = document.getElementById('player-status');
let selectedTrack = frame?.dataset.track;
function setExpanded(expanded){
  if(!playerBody) return;
  playerBody.hidden = !expanded;
  playerBody.inert = !expanded;
  minimize.setAttribute('aria-expanded',String(expanded));
  minimize.setAttribute('aria-label',expanded?'Minimize music player':'Expand music player');
  minimize.textContent = expanded?'−':'+';
}
document.querySelectorAll('[data-track]').forEach(link=>{
  if(link.tagName!=='A') return;
  link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey) return;
    event.preventDefault();
    const id=link.dataset.track;
    if(id!==selectedTrack){
      frame.src='https://bandcamp.com/EmbeddedPlayer/track='+encodeURIComponent(id)+'/size=small/bgcol=fffaf1/linkcol=a8411a/transparent=true/';
      selectedTrack=id;
    }
    frame.title=link.dataset.title+' by Reb Yen — Bandcamp audio player';
    playerTitle.textContent=link.dataset.title;
    player.classList.add('is-docked');
    document.body.classList.add('has-player');
    setExpanded(true);
    document.querySelectorAll('.song-row').forEach(row=>{
      if(row.dataset.song===id) row.setAttribute('aria-current','true');
      else row.removeAttribute('aria-current');
    });
    const fallback=document.getElementById('player-fallback');
    fallback.href=link.href;
    playerStatus.textContent=link.dataset.title+' selected. Press play in the Bandcamp player to listen.';
    player.focus({preventScroll:true});
  });
});
minimize?.addEventListener('click',()=>setExpanded(playerBody.hidden));
document.getElementById('player-return')?.addEventListener('click',()=>{
  player.classList.remove('is-docked');
  document.body.classList.remove('has-player');
  setExpanded(true);
});
document.getElementById('player-stop')?.addEventListener('click',()=>{
  frame.src='about:blank';
  selectedTrack=null;
  player.classList.remove('is-docked');
  document.body.classList.remove('has-player');
  playerTitle.textContent='Choose a song to listen';
  setExpanded(false);
  document.querySelectorAll('.song-row').forEach(row=>row.removeAttribute('aria-current'));
  playerStatus.textContent='Music stopped. Choose any Listen button to start again.';
  document.querySelector('#music [data-track]')?.focus({preventScroll:true});
});

const lightbox=document.getElementById('photo-dialog');
let lastPhotoButton=null;
document.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{
  lastPhotoButton=button;
  document.getElementById('dialog-image').src=button.dataset.photo;
  document.getElementById('dialog-image').alt=button.querySelector('img').alt;
  document.getElementById('dialog-title').textContent=button.querySelector('span').textContent;
  lightbox.showModal();
}));
document.getElementById('close-photo')?.addEventListener('click',()=>lightbox.close());
lightbox?.addEventListener('click',event=>{if(event.target===lightbox){const box=lightbox.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)lightbox.close();}});
lightbox?.addEventListener('close',()=>lastPhotoButton?.focus());
document.getElementById('print-kit')?.addEventListener('click',()=>window.print());
