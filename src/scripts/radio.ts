// Radiohead player powered by Apple iTunes Search API + standard HTML5 <audio>.

interface TrackConfig {
  defaultTitle: string;
  query: string;
}

interface TrackState {
  title: string;
  album: string;
  previewUrl: string | null;
  artworkUrl: string | null;
}

const TRACK_CONFIGS: TrackConfig[] = [
  {
    defaultTitle: 'Radiohead — Weird Fishes / Arpeggi',
    query: 'radiohead+weird+fishes+arpeggi',
  },
  {
    defaultTitle: 'Radiohead — Everything In Its Right Place',
    query: 'radiohead+everything+in+its+right+place',
  },
  {
    defaultTitle: 'Radiohead — Jigsaw Falling Into Place',
    query: 'radiohead+jigsaw+falling+into+place',
  },
];

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

  const tracks: TrackState[] = TRACK_CONFIGS.map((cfg) => ({
    title: cfg.defaultTitle,
    album: 'Loading iTunes preview...',
    previewUrl: null,
    artworkUrl: null,
  }));

  let trackIndex = 0;
  let playing = false;

  const updateProgress = () => {
    const dur = audio.duration || 30;
    const cur = audio.currentTime || 0;
    const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
    progressBar.style.width = `${pct}%`;
    timeEl.textContent = `${formatTime(cur)} / ${formatTime(audio.duration || 30)}`;
  };

  const render = () => {
    const track = tracks[trackIndex];
    titleEl.textContent = track.title;
    titleEl.title = track.title;
    metaEl.textContent = track.album;
    counterEl.textContent = `${trackIndex + 1}/${tracks.length}`;

    if (track.artworkUrl) {
      artworkEl.src = track.artworkUrl;
      artworkEl.alt = `${track.title} cover`;
      artworkEl.classList.remove('opacity-0');
    } else {
      artworkEl.removeAttribute('src');
      artworkEl.classList.add('opacity-0');
    }

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

  const loadTrack = (index: number, autoPlay: boolean) => {
    trackIndex = (index + tracks.length) % tracks.length;
    const track = tracks[trackIndex];
    progressBar.style.width = '0%';
    timeEl.textContent = '0:00 / 0:30';

    if (track.previewUrl) {
      if (audio.src !== track.previewUrl) {
        audio.src = track.previewUrl;
      }
      if (autoPlay) {
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
      }
    } else {
      audio.pause();
      audio.removeAttribute('src');
      playing = false;
    }

    render();
  };

  // Fetch real studio previews & album artwork from Apple iTunes Search API
  Promise.all(
    TRACK_CONFIGS.map(async (cfg, idx) => {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${cfg.query}&entity=song&limit=1`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const item = data?.results?.[0];
        if (item) {
          tracks[idx] = {
            title:
              item.artistName && item.trackName
                ? `${item.artistName} — ${item.trackName}`
                : cfg.defaultTitle,
            album: item.collectionName || 'iTunes Studio Preview',
            previewUrl: item.previewUrl || null,
            artworkUrl: item.artworkUrl100 || null,
          };
        } else {
          tracks[idx].album = 'Preview unavailable';
        }
      } catch {
        tracks[idx].album = 'iTunes API unavailable';
      }

      if (idx === trackIndex) {
        if (tracks[idx].previewUrl && !audio.src) {
          audio.src = tracks[idx].previewUrl!;
        }
        render();
      }
    })
  );

  playBtn.addEventListener('click', () => {
    const track = tracks[trackIndex];
    if (!track.previewUrl) return;

    if (audio.src !== track.previewUrl) {
      audio.src = track.previewUrl;
    }

    if (audio.paused) {
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
