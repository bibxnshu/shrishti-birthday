'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const G = window.gsap;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let savedMotion = false;
  try { savedMotion = localStorage.getItem('shrishti-motion-paused') === 'true'; } catch {}
  let motionPaused = media.matches || savedMotion;
  let entered = false;
  let giftOpened = false;
  let giftBusy = false;
  let sunTurns = 0;
  let sunBusy = false;
  let celebrated = false;
  let cardURL;
  const flights = [];
  const finiteTweens = new Set();

  const wait = ms => new Promise(resolve => setTimeout(resolve, motionPaused ? 0 : ms));
  const tween = (target, options) => new Promise(resolve => to(target, { ...options, onComplete: resolve }));

  function to(target, options) {
    if (!G) { options.onComplete?.(); return null; }
    const originalComplete = options.onComplete;
    const tween = G.to(target, {
      overwrite: 'auto', ...options,
      duration: motionPaused ? 0 : (options.duration ?? .55),
      delay: motionPaused ? 0 : (options.delay ?? 0),
      onComplete() { finiteTweens.delete(this); originalComplete?.(); }
    });
    if (tween.isActive()) finiteTweens.add(tween);
    return tween;
  }
  function reveal(target, options = {}) {
    if (!G || motionPaused) return;
    G.from(target, { y: 15, opacity: .25, duration: .7, ease: 'power2.out', clearProps: 'opacity,transform', ...options });
  }
  function say(id, text) { $(id).textContent = text; }
  function go(target) { target.scrollIntoView({ behavior: motionPaused ? 'instant' : 'smooth', block: 'center' }); }

  // Restore the original layered bouquet instead of scaling a finished picture.
  function bloomBouquet(scene) {
    if (!scene?.classList.contains('layered') || scene.dataset.bloomed) return;
    if (scene.closest('dialog') && !scene.closest('dialog').open) return;
    if (scene.classList.contains('hero-bouquet') && !entered) return;
    scene.dataset.bloomed = 'true';
    if (!G || motionPaused) return;
    const timeline = G.timeline({ onComplete() { finiteTweens.delete(this); } });
    finiteTweens.add(timeline);
    timeline.fromTo(scene.querySelector('.bouquet-base'),
      { opacity: 0, scaleY: .65, scaleX: .8, y: 18, transformOrigin: '50% 90%' },
      { opacity: 1, scaleY: 1, scaleX: 1, y: 0, duration: 1.35, ease: 'power2.out', clearProps: 'transform,opacity' })
      .fromTo(scene.querySelectorAll('.bouquet-bloom'),
        { opacity: 0, scale: .08, rotation: -20, clipPath: 'circle(0% at 50% 50%)' },
        { opacity: 1, scale: 1, rotation: 0, clipPath: 'circle(72% at 50% 50%)', duration: 1.65, stagger: .4, ease: 'power2.out', clearProps: 'transform,opacity,clipPath' }, .75);
    if (scene.classList.contains('intro-bouquet')) {
      timeline.fromTo('#intro-title', { opacity: .2, y: 10 }, { opacity: 1, y: 0, duration: 1, clearProps: 'transform,opacity' }, 1.6);
    }
  }
  async function prepareBouquets() {
    const sheet = new Image(); sheet.src = 'assets/bouquet-layers.webp';
    let timeout;
    const loaded = await Promise.race([
      sheet.decode().then(() => true).catch(() => false),
      new Promise(resolve => { timeout = setTimeout(() => resolve(false), 5000); })
    ]);
    clearTimeout(timeout);
    if (!loaded) return;
    const boxes = [[21,3,629,706],[86,708,580,1203],[700,701,1187,1207],[690,115,1208,603]];
    $$('.bouquet-scene').forEach(scene => {
      const composition = scene.querySelector('.bouquet-composition');
      const fragment = document.createDocumentFragment();
      for (const [index, [left,top,right,bottom]] of boxes.entries()) {
        const canvas = document.createElement('canvas'); canvas.width = right-left; canvas.height = bottom-top;
        canvas.className = index ? `bouquet-bloom bloom-${index}` : 'bouquet-base';
        canvas.setAttribute('aria-hidden', 'true');
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(sheet,left,top,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
        fragment.append(canvas);
      }
      composition.querySelector('.bouquet-fallback').hidden = true;
      composition.append(fragment); scene.classList.add('layered');
      if (scene.classList.contains('intro-bouquet')) bloomBouquet(scene);
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        bloomBouquet(entry.target);
        if (entry.target.dataset.bloomed) observer.unobserve(entry.target);
      }), { threshold: .3 });
      $$('.hero-bouquet,.ending-bouquet').forEach(scene => observer.observe(scene));
    } else $$('.hero-bouquet,.ending-bouquet').forEach(bloomBouquet);
    if (entered) bloomBouquet($('.hero-bouquet'));
  }

  // The approved character drawings are packed into equal cells at one shared scale.
  // The visible cell height is trimmed per pose so every bubble sits above his head.
  const poseBoxes = [[113,10,304,371],[474,21,689,371],[803,102,1006,370],[1152,12,1334,371],[111,383,297,729],[459,385,678,729],[806,383,987,729],[1151,385,1352,730],[94,736,291,1066],[386,747,675,1058],[810,784,1036,1058],[1137,758,1382,1058]];
  const frames = { hello: 0, curious: 1, sit: 2, flower: 3, happy: 4, walk: 5, thinking: 6, surprised: 7, kidding: 8, push: 9, sleepy: 10, wish: 11 };
  const characterScale = Math.min(...poseBoxes.map(([l,t,r,b]) => Math.min(284 / (r-l), 384 / (b-t))));
  function pose(actor, name) {
    if (typeof actor === 'string') actor = $(actor);
    if (!actor) return;
    actor.dataset.pose = name;
    actor.classList.toggle('peaceful', name === 'peaceful');
    if (name === 'peaceful') return;
    const index = frames[name] ?? 0;
    const box = poseBoxes[index];
    actor.style.setProperty('--visible-ratio', 300 / ((box[3] - box[1]) * characterScale + 8));
    actor.querySelector('.leo').style.backgroundPosition = `${index % 4 * 100 / 3}% ${Math.floor(index / 4) * 50}%`;
  }
  function packAtlas(src, boxes, columns, rows, cellWidth, cellHeight, variable, uniform) {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = cellWidth * columns; canvas.height = cellHeight * rows;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const commonScale = Math.min(...boxes.map(([l,t,r,b]) => Math.min((cellWidth-16)/(r-l), (cellHeight-16)/(b-t))));
        boxes.forEach(([l,t,r,b], i) => {
          const w = r-l, h = b-t;
          const scale = uniform ? commonScale : Math.min((cellWidth-16)/w, (cellHeight-16)/h);
          const dw = w * scale, dh = h * scale;
          ctx.drawImage(img, l, t, w, h, i % columns * cellWidth + (cellWidth-dw)/2, Math.floor(i/columns)*cellHeight + cellHeight-dh-8, dw, dh);
        });
        document.documentElement.style.setProperty(variable, `url("${canvas.toDataURL()}")`);
      } catch { /* The original atlas remains a usable fallback. */ }
    };
    img.src = src;
  }
  packAtlas('assets/leo-approved.webp', poseBoxes, 4, 3, 300, 400, '--leo-atlas', true);
  packAtlas('assets/flowers-approved.webp', [[51,39,494,514],[581,23,957,527],[1028,99,1453,490],[64,528,443,946],[503,585,1132,918]], 3, 2, 400, 400, '--flower-atlas', false);
  $$('.actor').forEach(actor => pose(actor, actor.dataset.pose));

  function syncMotion() {
    document.documentElement.classList.toggle('motion-paused', motionPaused);
    $('#motion-button').setAttribute('aria-pressed', String(motionPaused));
    $('#motion-button').setAttribute('aria-label', motionPaused ? 'Resume decorative motion' : 'Pause decorative motion');
    $('#motion-icon').textContent = motionPaused ? '▷' : 'Ⅱ';
    const halted = motionPaused || document.hidden || !!$('dialog[open]');
    flights.forEach(tween => tween.paused(halted));
    if (motionPaused) {
      [...finiteTweens].forEach(tween => tween.progress(1));
      $('#particles').replaceChildren();
    }
  }
  $('#motion-button').addEventListener('click', () => {
    motionPaused = !motionPaused;
    try { localStorage.setItem('shrishti-motion-paused', String(motionPaused)); } catch {}
    syncMotion();
  });
  media.addEventListener?.('change', event => { if (event.matches) { motionPaused = true; syncMotion(); } });
  syncMotion();

  // Native dialogs provide keyboard focus containment; Escape always works.
  function openDialog(dialog) {
    if (typeof dialog.showModal !== 'function') return false;
    dialog.showModal(); document.body.classList.add('modal-open'); syncMotion(); return true;
  }
  $$('dialog').forEach(dialog => dialog.addEventListener('close', () => {
    document.body.classList.toggle('modal-open', !!$('dialog[open]'));
    syncMotion();
  }));
  function enter(withMusic = true) {
    if (entered) return;
    if (withMusic) playMusic(); else pauseMusic();
    entered = true;
    const dialog = $('#intro-dialog');
    to('.intro-content', { opacity: 0, y: -7, duration: .32, onComplete() {
      if (dialog.open) dialog.close();
      reveal('.hero-copy', { y: 14, duration: .9 });
      bloomBouquet($('.hero-bouquet'));
    }});
  }
  $('#enter-button').addEventListener('click', () => enter(true));
  $('#enter-quietly').addEventListener('click', () => enter(false));
  $('#intro-dialog').addEventListener('cancel', () => { entered = true; pauseMusic(); });
  $('#intro-dialog').addEventListener('close', () => { entered = true; bloomBouquet($('.hero-bouquet')); });
  if (!openDialog($('#intro-dialog'))) entered = true;
  prepareBouquets();

  // Touch the illustration or its nearby golden cue; both do the same thing.
  $$('[data-tap-target]').forEach(cue => cue.addEventListener('click', () => {
    const target = $(cue.dataset.tapTarget);
    if (target && !target.disabled && !target.closest('[hidden]')) target.click();
  }));
  const tapSpots = $$('[data-tap-spot]');
  const tapObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      target.classList.toggle('tap-spot-ready', isIntersecting && !target.dataset.touched);
    });
  }, { threshold: .6, rootMargin: '0px 0px -8% 0px' }) : null;
  tapSpots.forEach(target => {
    const rings = document.createElement('span');
    rings.className = 'tap-rings'; rings.setAttribute('aria-hidden', 'true');
    target.append(rings);
    target.addEventListener('click', () => {
      if (target.hasAttribute('data-tap-repeat')) return;
      target.dataset.touched = 'true'; target.classList.remove('tap-spot-ready');
      tapObserver?.unobserve(target);
    }, { once: true });
    if (tapObserver) tapObserver.observe(target); else target.classList.add('tap-spot-ready');
  });

  let helloCount = 0;
  $('#hello-guide').addEventListener('click', () => {
    const choices = [['hello', 'Hello, birthday girl. The sunflowers are for you.'], ['flower', 'I picked the sunny ones. Obviously.'], ['sit', 'We can just sit here a moment.']];
    const [name, words] = choices[helloCount++ % choices.length];
    pose('#hello-guide .actor', name);
    say('#hello-speech', words);
    say('#hello-hint', 'Tap him again for another little hello.');
    to('#hello-guide .actor', { y: -5, duration: .2, yoyo: true, repeat: 1 });
  });
  $$('.wish-note').forEach(note => note.addEventListener('toggle', () => {
    note.querySelector('.note-action-label').textContent = note.open ? 'Tap to fold away' : 'Tap to unfold';
    if (note.open) { reveal(note.querySelector('.note-inside'), { y: -8, duration: .5 }); chime(587.33); }
    updateProgress();
  }));

  $('#sunflower-button').addEventListener('click', async () => {
    if (sunBusy || sunTurns >= 3) return;
    sunBusy = true;
    sunTurns++;
    const button = $('#sunflower-button'); button.disabled = true;
    $('#sun-hint').disabled = true;
    say('#sun-hint', 'Watch its little face…');
    try {
      await tween('#sunflower-plant', { y: -3, duration: .12 });
      await tween('#sunflower-plant', { y: 0, duration: .16 });
      pose('#sun-guide', 'curious');
      say('#sun-speech', 'There. Facing the sun…');
      await tween('#flower-head', { rotationY: 160, duration: 1, ease: 'power2.inOut' });
      await wait(900);
      pose('#sun-guide', 'surprised');
      say('#sun-speech', 'Oh! It’s turning back to you.');
      await tween('#flower-head', { rotationY: 0, duration: 1.2, ease: 'power2.inOut' });
      chime([523.25,659.25,783.99][sunTurns-1]);
      if (sunTurns === 1) {
        pose('#sun-guide', 'thinking');
        say('#sun-speech', 'It looked at the sun… then chose you. Shall we try again?');
        say('#sun-hint', 'Tap the sunflower to try again.');
      } else if (sunTurns === 2) {
        pose('#sun-guide', 'thinking');
        say('#sun-speech', 'Again! It keeps coming back to you. One last try?');
        say('#sun-hint', 'One last tap on the sunflower.');
      } else {
        pose('#sun-guide', 'flower');
        say('#sun-speech', 'Wait… I think I understand.');
        await wait(1100);
        say('#sun-speech', 'Oh. You’re its sunshine.');
        say('#sun-instruction', 'Some things know where their sunshine is.');
        say('#sun-hint', 'Your little sunflower has found its sunshine.');
        button.setAttribute('aria-label', 'The sunflower has turned back toward you');
        $('#sun-reveal').hidden = false;
        reveal('#sun-reveal', { y: 12, duration: 1.2 });
        updateProgress();
      }
    } finally {
      sunBusy = false; button.disabled = sunTurns >= 3;
      $('#sun-hint').disabled = button.disabled;
      $('#sun-hint').classList.toggle('cue-complete', sunTurns >= 3);
    }
  });
  $('#gift-button').addEventListener('click', async () => {
    if (giftBusy) return;
    const letter = $('#personal-letter'), button = $('#gift-button');
    if (giftOpened) { go(letter); letter.querySelector('summary').focus({ preventScroll: true }); return; }
    giftBusy = true; button.disabled = true;
    $('#gift-hint').disabled = true;
    try {
      pose('#gift-guide', 'push');
      say('#gift-speech', 'Just a little tug on that ribbon…');
      await tween('.gift-art', { rotation: -4, scale: 1.04, duration: .18 });
      button.classList.add('opened');
      await tween('.gift-art', { rotation: 0, scale: 1, duration: .4, ease: 'power2.out' });
      giftOpened = true;
      pose('#gift-guide', 'surprised');
      particles(button, 28); chime(783.99);
      await wait(280);
      letter.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      button.setAttribute('aria-label', 'Find your birthday envelope');
      say('#gift-speech', 'An envelope! Tap the sunflower seal when you’re ready.');
      say('#gift-hint', 'Now tap here to open your envelope.');
      $('#gift-hint').dataset.tapTarget = '#letter-seal';
      reveal(letter, { y: -32, scale: .94, duration: .85 });
      letter.scrollIntoView({ behavior: motionPaused ? 'instant' : 'smooth', block: 'nearest' });
      letter.querySelector('summary').focus({ preventScroll: true });
      updateProgress();
    } finally { giftBusy = false; button.disabled = false; $('#gift-hint').disabled = false; }
  });
  // Without JavaScript the letter remains readable; with it, the gift reveals it.
  $('#personal-letter').hidden = true;
  $('#personal-letter').addEventListener('toggle', event => {
    const open = event.target.open;
    pose('#gift-guide', open ? 'sit' : (giftOpened ? 'flower' : 'push'));
    say('#gift-speech', open ? 'Take your time.' : 'Your letter is here whenever you want it.');
    $('.letter-open-label').textContent = open ? 'Tap here to fold your letter away' : 'Tap the sunflower seal to open my letter';
    if (giftOpened) say('#gift-hint', open ? 'Tap here to fold your letter away.' : 'Tap here to open your envelope again.');
    if (open) reveal('.letter-paper', { y: 8, duration: .6 });
    updateProgress();
  });

  // Small edge blooms leave the reading column and tap targets unobstructed.
  $$('.edge-garden').forEach((section, index) => {
    const layer = document.createElement('div'); layer.className = 'edge-blooms'; layer.setAttribute('aria-hidden', 'true');
    for (let i=0; i<2; i++) {
      const flower = document.createElement('span'); flower.className = 'edge-flower';
      const frame = (index*2+i)%5;
      flower.style.backgroundPosition = `${frame%3*50}% ${Math.floor(frame/3)*100}%`;
      flower.style[i === 0 ? 'left' : 'right'] = '3px';
      flower.style.top = `${18 + Math.random()*59}%`;
      flower.style.animationDuration = `${4.5 + Math.random()*3}s`;
      layer.append(flower);
    }
    section.prepend(layer);
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    }), { threshold: .12 });
    $$('.reveal').forEach(element => observer.observe(element));
    const blooms = new IntersectionObserver(entries => entries.forEach(entry => {
      const flowers = entry.target.querySelectorAll('.edge-flower');
      flowers.forEach(flower => { flower.style.animationPlayState = entry.isIntersecting ? '' : 'paused'; });
      if (!entry.isIntersecting) return;
      flowers.forEach(flower => { flower.style.top = `${17+Math.random()*60}%`; });
      reveal(flowers, { scale: .45, y: 12, stagger: .2, duration: 1.3 });
    }), { threshold: .13 });
    $$('.edge-garden').forEach(element => blooms.observe(element));
  }
  function startFlights() {
    flights.forEach(tween => tween.kill()); flights.length = 0; $('#butterflies').replaceChildren();
    if (!G) return;
    for (let i=0; i<(innerWidth < 650 ? 1 : 2); i++) {
      const butterfly = document.createElement('span'); butterfly.className = 'butterfly'; butterfly.innerHTML = '<span></span>';
      $('#butterflies').append(butterfly);
      const x = i === 0 ? 5 : innerWidth-32;
      G.set(butterfly, { x, y: innerHeight*.32 });
      const flight = G.timeline({ repeat: -1, yoyo: true, delay: i*3 });
      flight.to(butterfly, { y: innerHeight*.7, x: x + (i ? -8 : 8), rotation: i ? 12 : -12, duration: 13, ease: 'sine.inOut' })
        .to(butterfly, { y: innerHeight*.2, x, rotation: i ? -8 : 8, duration: 17, ease: 'sine.inOut' });
      flights.push(flight);
    }
    syncMotion();
  }
  startFlights();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { startFlights(); updateProgress(); }, 250); }, { passive: true });
  let scrollQueued = false;
  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#reading-progress').style.transform = `scaleX(${max > 0 ? Math.min(1,Math.max(0,scrollY/max)) : 0})`;
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  window.addEventListener('load', updateProgress);

  function particles(target, amount) {
    if (!G || motionPaused) return;
    const rect = target.getBoundingClientRect();
    for (let i=0; i<amount; i++) {
      const particle = document.createElement('span'); particle.className = 'particle';
      particle.style.left = `${rect.left+rect.width/2}px`; particle.style.top = `${Math.max(20,rect.top+rect.height*.35)}px`;
      particle.style.background = ['#d7a130','#efd888','#80935a','#bb7531'][i%4];
      $('#particles').append(particle);
      to(particle, { x: (Math.random()-.5)*Math.min(innerWidth*.85,650), y: -70-Math.random()*240, rotation: Math.random()*450, opacity: 0, duration: 1.8+Math.random(), ease: 'power2.out', onComplete() { particle.remove(); } });
    }
  }

  // One media element preserves mobile playback permission across the two songs.
  const soundtrack = $('#birthday-music');
  const musicTracks = [
    { src: 'assets/music/indila-love-story-150s.mp3', title: 'Love Story', version: 'Indila · 2:30' },
    { src: 'assets/music/epic-version.mp3', title: 'Golden Brown × Love Story', version: 'Epic version' }
  ];
  const musicHolds = new Set();
  let soundOn = false, soundContext, musicGain, musicSource;
  let musicIndex = 0, musicRequest = 0, musicLoading = false, musicNotice = '';
  // Every visit begins at full page volume; she can still adjust it while listening.
  let musicVolume = 1;

  function updateMusicUI() {
    const playing = !soundtrack.paused && !soundtrack.ended && (!soundContext || soundContext.state === 'running');
    const held = musicHolds.size > 0;
    $('#sound-button').dataset.playing = String(playing);
    $('#sound-button').setAttribute('aria-label', `${playing ? 'Music is playing.' : 'Music is paused.'} Open music and volume controls`);
    $('#music-position').textContent = `0${musicIndex+1} / 02`;
    $('#music-track-title').textContent = musicTracks[musicIndex].title;
    $('#music-track-version').textContent = musicTracks[musicIndex].version;
    $('#music-next').textContent = musicIndex === 0 ? 'Up next: the Epic version. Both songs repeat.' : 'Up next: Love Story by Indila. Both songs repeat.';
    $('#music-toggle').textContent = held ? 'Paused for a moment' : musicLoading ? 'Starting music…' : playing ? 'Pause music' : 'Play music';
    $('#music-toggle').disabled = held || musicLoading;
    $('#music-status').textContent = musicHolds.has('microphone') ? 'The music will return after your candle wish.'
      : musicNotice || (playing ? 'Playing for you, on repeat.' : '');
  }
  function applyMusicVolume() {
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(soundContext.currentTime);
      musicGain.gain.setTargetAtTime(musicVolume, soundContext.currentTime, .08);
    } else soundtrack.volume = musicVolume;
    $$('[data-music-volume]').forEach(input => { input.value = Math.round(musicVolume*100); });
    $$('[data-volume-value]').forEach(output => { output.textContent = `${Math.round(musicVolume*100)}%`; });
  }
  function prepareSound() {
    if (soundContext) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { applyMusicVolume(); return; }
    soundContext = new Audio();
    musicGain = soundContext.createGain();
    musicGain.gain.value = musicVolume;
    musicSource = soundContext.createMediaElementSource(soundtrack);
    musicSource.connect(musicGain); musicGain.connect(soundContext.destination);
    soundtrack.volume = 1;
    soundContext.addEventListener('statechange', updateMusicUI);
  }
  function selectMusicTrack(index) {
    musicIndex = index;
    soundtrack.src = musicTracks[index].src;
    soundtrack.load();
    updateMusicUI();
  }
  async function playMusic({ automatic = false } = {}) {
    if (musicHolds.size || document.hidden) return;
    const request = ++musicRequest;
    try {
      prepareSound();
      // A blocked page-load attempt must not wait forever for a suspended context.
      if (automatic && soundContext && soundContext.state !== 'running') { updateMusicUI(); return; }
      if (soundtrack.error) selectMusicTrack(musicIndex);
      soundOn = true; musicLoading = true; musicNotice = ''; updateMusicUI();
      // Both calls happen inside the first tap, before any await, for mobile browsers.
      const resumed = soundContext?.resume();
      const playing = soundtrack.play();
      await Promise.all([resumed, playing]);
      if (request !== musicRequest) return;
      musicLoading = false; updateMusicUI();
    } catch (error) {
      if (request !== musicRequest) return;
      soundOn = false; musicLoading = false; soundtrack.pause();
      if (!automatic) musicNotice = error.name === 'NotAllowedError'
        ? 'Tap Play music to start the soundtrack.'
        : 'The music couldn’t load. Check your connection, then tap Play music to retry.';
      updateMusicUI();
    }
  }
  function pauseMusic() {
    ++musicRequest; soundOn = false; musicLoading = false; musicNotice = '';
    soundtrack.pause(); soundContext?.suspend().catch(() => {}); updateMusicUI();
  }
  function holdMusic(reason) {
    musicHolds.add(reason); ++musicRequest; musicLoading = false;
    soundtrack.pause(); soundContext?.suspend().catch(() => {}); updateMusicUI();
  }
  function releaseMusic(reason) {
    const released = musicHolds.delete(reason);
    if (released && soundOn && !musicHolds.size && !document.hidden) playMusic();
    else updateMusicUI();
  }
  soundtrack.addEventListener('ended', () => {
    selectMusicTrack((musicIndex+1) % musicTracks.length);
    if (soundOn) playMusic();
  });
  soundtrack.addEventListener('play', updateMusicUI);
  soundtrack.addEventListener('pause', updateMusicUI);
  soundtrack.addEventListener('error', () => {
    if (!soundOn) return;
    ++musicRequest; soundOn = false; musicLoading = false;
    musicNotice = 'The music couldn’t load. Check your connection, then tap Play music to retry.';
    updateMusicUI();
  });
  $('#music-toggle').addEventListener('click', () => {
    if (!soundtrack.paused && soundOn) pauseMusic(); else playMusic();
  });
  $('#sound-button').addEventListener('click', () => {
    if (!openDialog($('#music-dialog'))) {
      if (soundOn) pauseMusic(); else playMusic();
    }
  });
  $('#close-music').addEventListener('click', () => $('#music-dialog').close());
  $$('[data-music-volume]').forEach(input => input.addEventListener('input', () => {
    musicVolume = Number(input.value)/100; applyMusicVolume();
  }));
  applyMusicVolume(); updateMusicUI();

  // Small interaction chimes stay well below the soundtrack's level.
  function chime(frequency = 659.25, delay = 0, length = 1.5) {
    if (!soundOn || !musicVolume || soundtrack.paused || !soundContext || soundContext.state !== 'running' || document.hidden || micActive) return;
    const now = soundContext.currentTime + delay;
    const oscillator = soundContext.createOscillator(); const gain = soundContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.018*musicVolume,now+.035); gain.gain.exponentialRampToValueAtTime(.0001,now+length);
    oscillator.connect(gain); gain.connect(soundContext.destination); oscillator.start(now); oscillator.stop(now+length+.1);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  // Microphone data never leaves this device. Every cancellation stops the tracks.
  let micStream, micContext, micFrame = 0, micTimeout = 0, micGeneration = 0, micActive = false;
  function stopMicrophone(message) {
    micGeneration++; micActive = false;
    cancelAnimationFrame(micFrame); clearTimeout(micTimeout);
    micStream?.getTracks().forEach(track => track.stop()); micStream = null;
    micContext?.close().catch(() => {}); micContext = null;
    $('#mic-level').hidden = true; $('#stop-mic').hidden = true; $('#mic-button').disabled = false;
    if (message) $('#mic-status').textContent = message;
    releaseMusic('microphone');
  }
  async function startMicrophone() {
    if (micActive || celebrated) return;
    micActive = true;
    const generation = ++micGeneration;
    $('#mic-button').disabled = true; $('#stop-mic').hidden = false;
    $('#mic-status').textContent = 'Allow microphone access when your browser asks.';
    holdMusic('microphone');
    micTimeout = setTimeout(() => stopMicrophone('You can try the microphone again, or use the tap above.'), 25000);
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!navigator.mediaDevices?.getUserMedia || !Audio) throw new Error('Microphone is unavailable');
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (generation !== micGeneration || celebrated) { acquired.getTracks().forEach(track => track.stop()); return; }
      micStream = acquired; micContext = new Audio(); await micContext.resume();
      if (generation !== micGeneration || !micContext) return;
      const analyser = micContext.createAnalyser(); analyser.fftSize = 2048;
      micContext.createMediaStreamSource(micStream).connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      $('#mic-level').hidden = false;
      $('#mic-status').textContent = 'One quiet moment… then gently blow.';
      let sum = 0, samples = 0, held = 0, previous = performance.now(); const started = previous;
      const listen = now => {
        if (generation !== micGeneration || !micActive) return;
        analyser.getFloatTimeDomainData(data);
        let energy = 0; for (const value of data) energy += value*value;
        const rms = Math.sqrt(energy/data.length), elapsed = Math.min(70,now-previous); previous = now;
        $('#mic-level').value = Math.min(1,rms*8);
        if (now-started < 1100) { sum += rms; samples++; }
        else {
          if (!held) $('#mic-status').textContent = 'Now blow gently for a moment.';
          const threshold = Math.max(.045,sum/Math.max(1,samples)*2.5);
          held = rms > threshold ? held+elapsed : Math.max(0,held-elapsed*1.5);
          if (held > 280) { celebrate(); return; }
        }
        micFrame = requestAnimationFrame(listen);
      };
      micFrame = requestAnimationFrame(listen);
    } catch (error) {
      if (generation !== micGeneration) return;
      stopMicrophone(error.name === 'NotAllowedError' ? 'Microphone access wasn’t allowed. You can still tap to make your wish.' : 'The microphone isn’t available here. You can still tap to make your wish.');
    }
  }
  function celebrate() {
    if (celebrated) return;
    celebrated = true; stopMicrophone();
    $('#cake').classList.add('extinguished'); $('#cake').setAttribute('aria-label', 'A butterscotch birthday cake with the candle blown out');
    $('#wish-controls').hidden = true; $('#birthday-reveal').hidden = false;
    $('#cake-guide').classList.remove('faces-cake'); pose('#cake-guide', 'happy');
    say('#cake-speech', 'There. A birthday wish, just for you.');
    particles($('#cake'), innerWidth < 650 ? 40 : 65);
    reveal('#birthday-reveal', { y: 12, duration: .85 });
    $('#birthday-reveal').focus({ preventScroll: true }); go($('#birthday-reveal'));
    [523.25,659.25,783.99].forEach((frequency,i) => chime(frequency,i*.15));
    updateProgress();
  }
  $('#mic-button').addEventListener('click', startMicrophone);
  $('#tap-candle').addEventListener('click', celebrate);
  $('#stop-mic').addEventListener('click', () => stopMicrophone('Microphone stopped. You can use the tap instead.'));
  $('#relight').addEventListener('click', () => {
    celebrated = false; $('#cake').classList.remove('extinguished');
    $('#cake').setAttribute('aria-label', 'A butterscotch birthday cake with one glowing candle');
    $('#birthday-reveal').hidden = true; $('#wish-controls').hidden = false;
    $('#cake-guide').classList.add('faces-cake'); pose('#cake-guide', 'wish');
    say('#cake-speech', 'One more? All right. Make it a good one.');
    $('#mic-status').textContent = 'Blow gently with the microphone, or tap to make your wish. Nothing is recorded.';
    $('#mic-button').focus({ preventScroll: true }); go($('#cake')); updateProgress();
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && micActive) stopMicrophone('Microphone stopped. Tap again whenever you’re ready.');
  }, { threshold: .05 }).observe($('#wish'));

  function wrapCardParagraph(ctx, text, maxWidth) {
    return text.split('\n').flatMap(paragraph => {
      const lines = [];
      let line = '';
      paragraph.trim().split(/\s+/).forEach(word => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else line = candidate;
      });
      if (line) lines.push(line);
      return lines;
    });
  }

  // Share the page's complete closing message with the downloadable keepsake.
  $('#save-card').addEventListener('click', async () => {
    const button = $('#save-card'); button.disabled = true;
    $('#card-status').textContent = 'Gathering your flowers…';
    try {
      if (!cardURL) {
        const art = new Image(); art.src = 'assets/dedication-bouquet.webp'; await art.decode();
        await document.fonts.ready;
        const canvas = document.createElement('canvas'); canvas.width = 1200;
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('No canvas');
        const bodyFont = '38px "DM Sans", sans-serif';
        const lineHeight = 61, paragraphGap = 34, bodyTop = 945;
        ctx.font = bodyFont;
        const paragraphs = $$('.ending-wish > p').map(paragraph => {
          const copy = paragraph.cloneNode(true);
          copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
          return wrapCardParagraph(ctx, copy.textContent.trim(), 940);
        });
        const bodyHeight = paragraphs.reduce((height, lines) => height + lines.length * lineHeight, 0)
          + (paragraphs.length - 1) * paragraphGap;
        canvas.height = bodyTop + bodyHeight + 230;
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.strokeStyle = '#dfc797'; ctx.lineWidth = 2; ctx.strokeRect(43,43,canvas.width-86,canvas.height-86);
        const height = 600, width = height*art.naturalWidth/art.naturalHeight;
        ctx.drawImage(art,(canvas.width-width)/2,65,width,height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#684522'; ctx.font = '500 79px "Cormorant Garamond", Georgia, serif';
        ctx.fillText('Happy birthday,',600,757); ctx.fillStyle = '#a36524'; ctx.fillText('Shrishti.',600,837);
        ctx.textAlign = 'left'; ctx.fillStyle = '#705a41'; ctx.font = bodyFont;
        let baseline = bodyTop;
        paragraphs.forEach(lines => {
          lines.forEach(line => { ctx.fillText(line,130,baseline); baseline += lineHeight; });
          baseline += paragraphGap;
        });
        ctx.textAlign = 'center'; ctx.font = '34px "DM Sans", sans-serif';
        ctx.fillText('With good wishes,',600,canvas.height-180);
        ctx.fillStyle = '#53623c'; ctx.font = '600 56px "Cormorant Garamond", Georgia, serif';
        ctx.fillText($('.ending-signature strong').textContent,600,canvas.height-110);
        const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png')); if (!blob) throw new Error('Card unavailable');
        cardURL = URL.createObjectURL(blob);
        $('#card-preview').width = canvas.width; $('#card-preview').height = canvas.height;
      }
      $('#card-preview').src = cardURL; $('#download-card').href = cardURL;
      if (!openDialog($('#card-dialog'))) $('#download-card').click();
      $('#card-status').textContent = '';
    } catch { $('#card-status').textContent = 'The card couldn’t be prepared. Tap again to try once more.'; }
    finally { button.disabled = false; }
  });
  $('#close-card').addEventListener('click', () => $('#card-dialog').close());
  document.addEventListener('visibilitychange', () => {
    syncMotion();
    if (document.hidden) {
      holdMusic('page');
      if (micActive) stopMicrophone('Microphone stopped while the page was away.');
    } else releaseMusic('page');
  });
  window.addEventListener('pagehide', () => { holdMusic('page'); stopMicrophone(); flights.forEach(tween => tween.pause()); });
  window.addEventListener('pageshow', () => { syncMotion(); releaseMusic('page'); });
  // Play automatically where permitted; the headphone prompt's first tap is the fallback.
  playMusic({ automatic: true });
})();
