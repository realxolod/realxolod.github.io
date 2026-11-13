// Mode-aware audio player powered by Apple iTunes Search API + standard HTML5 <audio>.
import { isSoundOn } from './audio';
import type { SiteMode } from './easter';

interface TrackConfig {
  defaultTitle: string;
  defaultAlbum: string;
  queries: string[];
  exactTitle?: string;
  strictP4?: boolean;
  strictSh?: boolean;
  excludeReprise?: boolean;
}

interface TrackState {
  title: string;
  album: string;
  trackId: number | null;
  previewUrl: string | null;
  artworkUrl: string | null;
  loaded: boolean;
}

const PLAYLIST_CONFIGS: Record<SiteMode, TrackConfig[]> = {
  normal: [
    {
      defaultTitle: 'Radiohead — Weird Fishes / Arpeggi',
      defaultAlbum: 'In Rainbows',
      queries: ['https://itunes.apple.com/search?term=radiohead+weird+fishes+arpeggi&entity=song&limit=1'],
    },
    {
      defaultTitle: 'Radiohead — Jigsaw Falling Into Place',
      defaultAlbum: 'In Rainbows',
      queries: ['https://itunes.apple.com/search?term=radiohead+jigsaw+falling+into+place&entity=song&limit=1'],
    },
    {
      defaultTitle: 'Radiohead — Nude',
      defaultAlbum: 'In Rainbows',
      queries: ['https://itunes.apple.com/search?term=radiohead+nude+in+rainbows&entity=song&limit=1'],
    },
  ],
  ok: [
    {
      defaultTitle: 'Radiohead — No Surprises',
      defaultAlbum: 'OK Computer (1997)',
      queries: ['https://itunes.apple.com/search?term=radiohead+no+surprises&entity=song&limit=1'],
    },
    {
      defaultTitle: 'Radiohead — Subterranean Homesick Alien',
      defaultAlbum: 'OK Computer (1997)',
      queries: ['https://itunes.apple.com/search?term=radiohead+subterranean+homesick+alien&entity=song&limit=1'],
    },
    {
      defaultTitle: 'Radiohead — Airbag',
      defaultAlbum: 'OK Computer (1997)',
      queries: ['https://itunes.apple.com/search?term=radiohead+airbag+ok+computer&entity=song&limit=1'],
    },
  ],
  sh: [
    {
      defaultTitle: 'Akira Yamaoka — Theme of Laura',
      defaultAlbum: 'Silent Hill 2 OST // 99.4 FM',
      strictSh: true,
      queries: ['https://itunes.apple.com/search?term=Theme+of+Laura+Akira+Yamaoka&entity=song&limit=10'],
    },
    {
      defaultTitle: 'Akira Yamaoka — Black Fairy',
      defaultAlbum: 'Silent Hill 2 OST // 99.4 FM',
      strictSh: true,
      queries: ['https://itunes.apple.com/search?term=Black+Fairy+Akira+Yamaoka&entity=song&limit=10'],
    },
    {
      defaultTitle: 'Akira Yamaoka — Promise',
      defaultAlbum: 'Silent Hill 2 OST // 99.4 FM',
      strictSh: true,
      excludeReprise: true,
      queries: ['https://itunes.apple.com/search?term=Promise+Akira+Yamaoka+Silent+Hill+2&entity=song&limit=10'],
    },
  ],
  p4: [
    {
      defaultTitle: 'Shihoko Hirata · Shoji Meguro — Heaven',
      defaultAlbum: 'ペルソナ4 OST // Midnight Channel',
      exactTitle: 'heaven',
      strictP4: true,
      queries: [
        'https://itunes.apple.com/search?term=Heaven+Shihoko+Hirata+Persona+4&entity=song&limit=15',
        'https://itunes.apple.com/search?term=Heaven+Shihoko+Hirata+Persona+4&entity=song&limit=15&country=JP',
      ],
    },
    {
      defaultTitle: 'Shihoko Hirata · Shoji Meguro — Heartbeat, Heartbreak',
      defaultAlbum: 'ペルソナ4 OST // Midnight Channel',
      exactTitle: 'heartbeat, heartbreak',
      strictP4: true,
      queries: [
        'https://itunes.apple.com/search?term=Heartbeat+Heartbreak+Shihoko+Hirata&entity=song&limit=10',
        'https://itunes.apple.com/search?term=Heartbeat+Heartbreak+Shihoko+Hirata&entity=song&limit=10&country=JP',
      ],
    },
    {
      defaultTitle: 'Shihoko Hirata · Shoji Meguro — Signs of Love',
      defaultAlbum: 'ペルソナ4 OST // Midnight Channel',
      exactTitle: 'signs of love',
      strictP4: true,
      queries: [
        'https://itunes.apple.com/search?term=Signs+of+Love+Shihoko+Hirata+Persona+4&entity=song&limit=15',
        'https://itunes.apple.com/search?term=Signs+of+Love+Shihoko+Hirata+Persona+4&entity=song&limit=15&country=JP',
      ],
    },
  ],
};

const P4_BLOCKED = /\b(8-?bit|remix|cover|instrumental|lofi|karaoke|piano)\b/i;
const P4_PREFERRED = /(Shihoko Hirata|目黒将司|ペルソナ4)/i;
const SH_BLOCKED = /\b(cover|remix|8-?bit|piano|guitar|lofi|karaoke|tribute|arrangement)\b/i;

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function initRadio() {
  const root = document.getElementById('player');
  const aurora = document.getElementById('aurora');
  const audio = document.getElementById('radio-audio') as HTMLAudioElement | null;
  const playBtn = document.getElementById('play-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const titleEl = document.getElementById('track-title');
  const metaEl = document.getElementById('track-meta');
  const counterEl = document.getElementById('track-counter');
  const artworkEl = document.getElementById('vinyl-artwork') as HTMLImageElement | null;
  const progressTrack = document.getElementById('progress-track');
  const progressBar = document.getElementById('progress-bar');
  const timeEl = document.getElementById('track-time');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');

  if (
    !root ||
    !audio ||
    !playBtn ||
    !prevBtn ||
    !nextBtn ||
    !titleEl ||
    !metaEl ||
    !counterEl ||
    !artworkEl ||
    !progressTrack ||
    !progressBar ||
    !timeEl ||
    !iconPlay ||
    !iconPause
  ) {
    return;
  }

  audio.volume = 0.5;
  audio.muted = !isSoundOn();

  const makeList = (mode: SiteMode): TrackState[] =>
    PLAYLIST_CONFIGS[mode].map((c) => ({
      title: c.defaultTitle,
      album: c.defaultAlbum,
      trackId: null,
      previewUrl: null,
      artworkUrl: null,
      loaded: false,
    }));

  const playlists: Record<SiteMode, TrackState[]> = {
    normal: makeList('normal'),
    ok: makeList('ok'),
    sh: makeList('sh'),
    p4: makeList('p4'),
  };

  let activeMode: SiteMode = 'normal';
  let trackIndex = 0;
  let playing = false;
  let fadeRafId: number | null = null;

  const cancelFade = () => {
    if (fadeRafId !== null) {
      cancelAnimationFrame(fadeRafId);
      fadeRafId = null;
    }
  };

  const getActiveTrack = (): TrackState => playlists[activeMode][trackIndex];

  const updateProgress = () => {
    const dur = audio.duration || 30;
    const cur = audio.currentTime || 0;
    const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
    progressBar.style.width = `${pct}%`;
    progressTrack.setAttribute('aria-valuenow', String(Math.round(pct)));
    timeEl.textContent = `${formatTime(cur)} / ${formatTime(audio.duration || 30)}`;
  };

  const render = () => {
    const list = playlists[activeMode];
    const track = list[trackIndex];
    titleEl.textContent = track.title;
    titleEl.title = track.title;
    metaEl.textContent = track.album;
    counterEl.textContent = `${trackIndex + 1}/${list.length}`;

    if (track.artworkUrl) {
      artworkEl.src = track.artworkUrl;
      artworkEl.alt = `${track.title} cover`;
      artworkEl.classList.remove('opacity-0');
    } else {
      artworkEl.removeAttribute('src');
      artworkEl.classList.add('opacity-0');
    }
    artworkEl.classList.toggle('grayscale', activeMode === 'sh');
    artworkEl.classList.toggle('contrast-125', activeMode === 'sh');
    artworkEl.classList.toggle('brightness-75', activeMode === 'sh');

    root.classList.toggle('is-playing', playing);
    if (aurora) {
      aurora.classList.toggle('radio-playing', playing);
      aurora.classList.toggle('opacity-15', playing);
      aurora.classList.toggle('opacity-0', !playing);
    }
    playBtn.setAttribute('aria-pressed', String(playing));
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    iconPlay.classList.toggle('hidden', playing);
    iconPause.classList.toggle('hidden', !playing);
  };

  const fadeVolume = (from: number, to: number, durationMs: number, onDone?: () => void) => {
    cancelFade();
    const start = performance.now();
    audio.volume = Math.max(0, Math.min(1, from));

    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * t));
      if (t < 1) {
        fadeRafId = requestAnimationFrame(step);
      } else {
        fadeRafId = null;
        if (onDone) onDone();
      }
    };

    fadeRafId = requestAnimationFrame(step);
  };

  const resolveTrack = async (mode: SiteMode, idx: number): Promise<TrackState> => {
    const state = playlists[mode][idx];
    if (state.loaded) return state;

    const cfg = PLAYLIST_CONFIGS[mode][idx];
    const usedIds = new Set(
      playlists[mode]
        .filter((s, i) => i !== idx && s.trackId !== null)
        .map((s) => s.trackId as number)
    );
    const usedUrls = new Set(
      playlists[mode]
        .filter((s, i) => i !== idx && s.previewUrl !== null)
        .map((s) => s.previewUrl as string)
    );
    const isUnique = (r: any) =>
      (!r?.trackId || !usedIds.has(r.trackId)) && (!r?.previewUrl || !usedUrls.has(r.previewUrl));

    try {
      let item: any = null;
      for (const url of cfg.queries) {
        const res = await fetch(url, { referrerPolicy: 'no-referrer' });
        if (!res.ok) continue;
        const data = await res.json();
        const results: any[] = Array.isArray(data?.results) ? data.results : [];
        if (results.length === 0) continue;

        if (cfg.strictP4) {
          const clean = results.filter((r) => {
            const meta = `${r?.trackName ?? ''} ${r?.artistName ?? ''} ${r?.collectionName ?? ''}`;
            return r?.previewUrl && isUnique(r) && !P4_BLOCKED.test(meta);
          });
          const exactTitle = cfg.exactTitle ?? '';
          item =
            clean.find(
              (r) =>
                String(r?.trackName ?? '').trim().toLowerCase() === exactTitle &&
                P4_PREFERRED.test(`${r?.artistName ?? ''} ${r?.collectionName ?? ''}`)
            ) ??
            clean.find((r) => String(r?.trackName ?? '').trim().toLowerCase() === exactTitle) ??
            clean.find((r) => P4_PREFERRED.test(`${r?.artistName ?? ''} ${r?.collectionName ?? ''}`)) ??
            clean[0] ??
            null;
        } else if (cfg.strictSh) {
          const clean = results.filter((r) => {
            const artist = String(r?.artistName ?? '').toLowerCase();
            const track = String(r?.trackName ?? '');
            const meta = `${track} ${r?.artistName ?? ''}`;
            if (!r?.previewUrl || !isUnique(r)) return false;
            if (!artist.includes('akira yamaoka')) return false;
            if (SH_BLOCKED.test(meta)) return false;
            if (cfg.excludeReprise && /reprise/i.test(track)) return false;
            return true;
          });
          item = clean[0] ?? null;
        } else {
          item = results.find((r) => r?.previewUrl && isUnique(r)) ?? results[0];
        }
        if (item?.previewUrl) break;
      }

      if (item) {
        state.trackId = typeof item.trackId === 'number' ? item.trackId : null;
        state.previewUrl = item.previewUrl || null;
        state.artworkUrl = item.artworkUrl100 || null;
        if (mode === 'normal' || mode === 'ok') {
          if (item.artistName && item.trackName) {
            state.title = `${item.artistName} — ${item.trackName}`;
          }
          if (item.collectionName) {
            state.album = item.collectionName;
          }
        }
      } else {
        state.album = 'stream blocked // offline';
      }
    } catch {
      state.album = 'stream blocked // offline';
    }

    state.loaded = true;
    return state;
  };

  const loadTrack = async (index: number, autoPlay: boolean, fadeInMs = 0) => {
    const targetMode = activeMode;
    const list = playlists[targetMode];
    trackIndex = (index + list.length) % list.length;
    progressBar.style.width = '0%';
    timeEl.textContent = '0:00 / 0:30';
    render();

    const track = await resolveTrack(targetMode, trackIndex);
    if (activeMode !== targetMode) return;

    if (track.previewUrl) {
      if (audio.src !== track.previewUrl) {
        audio.src = track.previewUrl;
      }
      if (autoPlay && isSoundOn()) {
        const targetVol = targetMode === 'sh' ? 0.6 : 0.55;
        audio.volume = fadeInMs > 0 ? 0 : targetVol;
        audio
          .play()
          .then(() => {
            playing = true;
            render();
            if (fadeInMs > 0) fadeVolume(0, targetVol, fadeInMs);
          })
          .catch(() => {
            audio.volume = 0.5;
            playing = false;
            render();
          });
      }
    } else {
      audio.pause();
      audio.removeAttribute('src');
      playing = false;
    }

    render();
  };

  window.addEventListener('sound-change', (event: Event) => {
    const enabled = Boolean((event as CustomEvent<{ enabled: boolean }>).detail?.enabled);
    audio.muted = !enabled;
    if (!enabled && !audio.paused) {
      cancelFade();
      audio.pause();
      playing = false;
      render();
    }
  });

  window.addEventListener('mode-audio', (event: Event) => {
    const { mode, prevMode } = (
      event as CustomEvent<{ mode: SiteMode; prevMode: SiteMode }>
    ).detail;
    cancelFade();

    if (mode === 'normal') {
      const startVol = audio.paused ? 0 : audio.volume;
      fadeVolume(startVol, 0, prevMode === 'sh' ? 500 : 400, () => {
        activeMode = 'normal';
        trackIndex = 0;
        audio.pause();
        audio.volume = 0.5;
        playing = false;
        loadTrack(0, false);
      });
      return;
    }

    audio.pause();
    playing = false;
    activeMode = mode;
    trackIndex = 0;
    loadTrack(0, true, mode === 'sh' ? 1800 : 1200);
  });

  // Preload normal playlist on boot
  Promise.all(PLAYLIST_CONFIGS.normal.map((_, idx) => resolveTrack('normal', idx))).then(() => {
    if (activeMode === 'normal') {
      const cur = playlists.normal[trackIndex];
      if (cur?.previewUrl && !audio.src) {
        audio.src = cur.previewUrl;
      }
      render();
    }
  });

  playBtn.addEventListener('click', async () => {
    const track = await resolveTrack(activeMode, trackIndex);
    if (!track.previewUrl) return;

    if (audio.src !== track.previewUrl) {
      audio.src = track.previewUrl;
    }

    if (audio.paused) {
      if (!isSoundOn()) return;
      audio
        .play()
        .then(() => {
          playing = true;
          render();
        })
        .catch(() => {
          playing = false;
          render();
        });
    } else {
      cancelFade();
      audio.pause();
      playing = false;
      render();
    }
  });

  prevBtn.addEventListener('click', () => {
    loadTrack(trackIndex - 1, playing);
  });

  nextBtn.addEventListener('click', () => {
    loadTrack(trackIndex + 1, playing);
  });

  progressTrack.addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = progressTrack.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    updateProgress();
  });

  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', updateProgress);

  audio.onended = () => {
    loadTrack(trackIndex + 1, true);
  };

  render();
}
