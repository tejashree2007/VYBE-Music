/**
 * VYBE Music App - Player Controller & Visualizer
 */

class PlayerController {
  constructor() {
    this.queue = [];
    this.currentIndex = -1;
    this.isShuffle = false;
    this.isRepeat = false;
    this.isDraggingScrubber = false;
    this.visualizerAnimationId = null;

    // Canvas & Audio
    this.canvas = null;
    this.canvasCtx = null;
    this.frequencyArray = new Uint8Array(64);
  }

  init() {
    this.bindDOMElements();
    this.initAudioEngineListeners();
    this.initVisualizer();
    this.bindEvents();

    // Default to the first song in library ready to play
    if (window.MOCK_SONGS && window.MOCK_SONGS.length > 0) {
      this.loadTrack(window.MOCK_SONGS[0], false);
      this.queue = [...window.MOCK_SONGS];
      this.currentIndex = 0;
      this.renderQueueList();
    }
  }

  bindDOMElements() {
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.shuffleBtn = document.getElementById('shuffleBtn');
    this.repeatBtn = document.getElementById('repeatBtn');

    this.scrubberTrack = document.getElementById('scrubberTrack');
    this.scrubberFill = document.getElementById('scrubberFill');
    this.scrubberThumb = document.getElementById('scrubberThumb');
    this.currentTimeLabel = document.getElementById('currentTimeLabel');
    this.durationLabel = document.getElementById('durationLabel');

    this.playerThumb = document.getElementById('playerThumb');
    this.playerTitle = document.getElementById('playerTitle');
    this.playerArtist = document.getElementById('playerArtist');
    this.playerMoodBadge = document.getElementById('playerMoodBadge');
    this.playerLikeBtn = document.getElementById('playerLikeBtn');

    this.volumeBtn = document.getElementById('volumeBtn');
    this.volumeSliderTrack = document.getElementById('volumeSliderTrack');
    this.volumeSliderFill = document.getElementById('volumeSliderFill');

    this.queueToggleBtn = document.getElementById('queueToggleBtn');
    this.queuePanel = document.getElementById('queuePanel');
    this.queueList = document.getElementById('queueList');
    this.queueCountBadge = document.getElementById('queueCountBadge');
    this.queueClearBtn = document.getElementById('queueClearBtn');

    this.canvas = document.getElementById('audioVisualizerCanvas');
    if (this.canvas) {
      this.canvasCtx = this.canvas.getContext('2d');
    }
  }

  initAudioEngineListeners() {
    window.audioEngine.onTimeUpdate = (current, duration) => {
      if (this.isDraggingScrubber) return;
      const pct = Math.min(100, Math.max(0, (current / duration) * 100));
      if (this.scrubberFill) this.scrubberFill.style.width = `${pct}%`;
      if (this.scrubberThumb) this.scrubberThumb.style.left = `${pct}%`;
      if (this.currentTimeLabel) this.currentTimeLabel.textContent = this.formatTime(current);
    };

    window.audioEngine.onEnded = () => {
      if (this.isRepeat) {
        window.audioEngine.playTrack(this.queue[this.currentIndex], 0);
      } else {
        this.next();
      }
    };

    window.audioEngine.onStateChange = (isPlaying, track) => {
      this.updatePlayStateUI(isPlaying);
    };
  }

  formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  loadTrack(track, autoplay = true) {
    if (!track) return;
    if (this.playerThumb) this.playerThumb.src = track.coverUrl;
    if (this.playerTitle) this.playerTitle.textContent = track.title;
    if (this.playerArtist) this.playerArtist.textContent = track.artist;
    if (this.durationLabel) this.durationLabel.textContent = track.duration;
    if (this.currentTimeLabel) this.currentTimeLabel.textContent = '0:00';
    if (this.scrubberFill) this.scrubberFill.style.width = '0%';
    if (this.scrubberThumb) this.scrubberThumb.style.left = '0%';

    // Update mood badge on player
    const primaryMoodId = track.moods[0];
    const moodObj = window.MOODS.find(m => m.id === primaryMoodId);
    if (this.playerMoodBadge && moodObj) {
      this.playerMoodBadge.innerHTML = `<span>${moodObj.emoji}</span> ${moodObj.label}`;
      this.playerMoodBadge.style.color = moodObj.accent;
    }

    // Update liked state
    this.updateLikedButton(track.id);

    if (autoplay) {
      window.audioEngine.playTrack(track, 0);
    }
  }

  playTrackFromList(track, list) {
    this.queue = [...list];
    this.currentIndex = this.queue.findIndex(s => s.id === track.id);
    if (this.currentIndex === -1) {
      this.queue.unshift(track);
      this.currentIndex = 0;
    }
    this.loadTrack(track, true);
    this.renderQueueList();

    if (window.showToast) {
      window.showToast(`Now Playing: ${track.title} by ${track.artist}`, '🎵');
    }
  }

  playAllFromMood(moodId) {
    const moodSongs = window.MOCK_SONGS.filter(s => s.moods.includes(moodId));
    if (moodSongs.length === 0) return;
    this.queue = [...moodSongs];
    this.currentIndex = 0;
    this.loadTrack(this.queue[0], true);
    this.renderQueueList();

    const moodObj = window.MOODS.find(m => m.id === moodId);
    if (window.showToast && moodObj) {
      window.showToast(`Playing all ${moodSongs.length} songs from ${moodObj.emoji} ${moodObj.label} VYBE!`, '🎶');
    }
  }

  shuffleMood(moodId) {
    const moodSongs = window.MOCK_SONGS.filter(s => s.moods.includes(moodId));
    if (moodSongs.length === 0) return;
    const shuffled = [...moodSongs].sort(() => Math.random() - 0.5);
    this.queue = shuffled;
    this.currentIndex = 0;
    this.loadTrack(this.queue[0], true);
    this.renderQueueList();

    if (window.showToast) {
      window.showToast(`Shuffled ${shuffled.length} tracks in this VYBE!`, '🔀');
    }
  }

  togglePlayPause() {
    if (!window.audioEngine.currentTrack && this.queue.length > 0) {
      this.loadTrack(this.queue[0], true);
      return;
    }
    window.audioEngine.togglePlayPause();
  }

  next() {
    if (this.queue.length === 0) return;
    if (this.isShuffle) {
      this.currentIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.queue.length;
    }
    this.loadTrack(this.queue[this.currentIndex], true);
    this.renderQueueList();
  }

  prev() {
    if (this.queue.length === 0) return;
    if (window.audioEngine.currentTime > 3) {
      // Restart current song
      window.audioEngine.seek(0);
      return;
    }
    this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
    this.loadTrack(this.queue[this.currentIndex], true);
    this.renderQueueList();
  }

  updatePlayStateUI(isPlaying) {
    if (this.playPauseBtn) {
      this.playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
      if (isPlaying) {
        this.playPauseBtn.classList.add('playing');
      } else {
        this.playPauseBtn.classList.remove('playing');
      }
    }

    // Refresh overlay buttons on song cards
    document.querySelectorAll('.song-card').forEach(card => {
      const cardSongId = card.getAttribute('data-song-id');
      const isCurrent = window.audioEngine.currentTrack && window.audioEngine.currentTrack.id === cardSongId;
      const overlayBtn = card.querySelector('.song-play-overlay-btn');

      if (isCurrent) {
        card.classList.add('playing-now');
        if (overlayBtn) {
          overlayBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
      } else {
        card.classList.remove('playing-now');
        if (overlayBtn) {
          overlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
      }
    });
  }

  updateLikedButton(songId) {
    const isLiked = (window.likedSongIds || []).includes(songId);
    if (this.playerLikeBtn) {
      this.playerLikeBtn.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>`;
      if (isLiked) {
        this.playerLikeBtn.classList.add('liked');
      } else {
        this.playerLikeBtn.classList.remove('liked');
      }
    }
  }

  bindEvents() {
    // Play / Pause
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    }

    // Prev / Next
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());

    // Shuffle & Repeat
    if (this.shuffleBtn) {
      this.shuffleBtn.addEventListener('click', () => {
        this.isShuffle = !this.isShuffle;
        this.shuffleBtn.classList.toggle('active', this.isShuffle);
        if (window.showToast) window.showToast(`Shuffle is ${this.isShuffle ? 'ON' : 'OFF'}`, '🔀');
      });
    }

    if (this.repeatBtn) {
      this.repeatBtn.addEventListener('click', () => {
        this.isRepeat = !this.isRepeat;
        this.repeatBtn.classList.toggle('active', this.isRepeat);
        if (window.showToast) window.showToast(`Repeat is ${this.isRepeat ? 'ON' : 'OFF'}`, '🔁');
      });
    }

    // Scrubber click & drag
    if (this.scrubberTrack) {
      const handleScrub = (e) => {
        const rect = this.scrubberTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        window.audioEngine.seek(pct);
      };

      this.scrubberTrack.addEventListener('click', handleScrub);
    }

    // Volume Track
    if (this.volumeSliderTrack) {
      this.volumeSliderTrack.addEventListener('click', (e) => {
        const rect = this.volumeSliderTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        window.audioEngine.setVolume(pct);
        if (this.volumeSliderFill) this.volumeSliderFill.style.width = `${pct * 100}%`;
        if (this.volumeBtn) {
          this.volumeBtn.innerHTML = pct === 0 ? '<i class="fas fa-volume-mute"></i>' : pct < 0.5 ? '<i class="fas fa-volume-down"></i>' : '<i class="fas fa-volume-up"></i>';
        }
      });
    }

    // Like in player bar
    if (this.playerLikeBtn) {
      this.playerLikeBtn.addEventListener('click', () => {
        if (window.audioEngine.currentTrack && window.toggleLikeSong) {
          window.toggleLikeSong(window.audioEngine.currentTrack.id);
          this.updateLikedButton(window.audioEngine.currentTrack.id);
        }
      });
    }

    // Queue Toggle
    if (this.queueToggleBtn && this.queuePanel) {
      this.queueToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.queuePanel.classList.toggle('open');
        this.queueToggleBtn.classList.toggle('active', this.queuePanel.classList.contains('open'));
      });

      document.addEventListener('click', (e) => {
        if (!this.queuePanel.contains(e.target) && !this.queueToggleBtn.contains(e.target)) {
          this.queuePanel.classList.remove('open');
          this.queueToggleBtn.classList.remove('active');
        }
      });
    }

    if (this.queueClearBtn) {
      this.queueClearBtn.addEventListener('click', () => {
        this.queue = [];
        this.currentIndex = -1;
        this.renderQueueList();
        if (window.showToast) window.showToast('Queue cleared', '🗑️');
      });
    }
  }

  renderQueueList() {
    if (!this.queueList) return;
    if (this.queueCountBadge) this.queueCountBadge.textContent = this.queue.length;

    if (this.queue.length === 0) {
      this.queueList.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1.5rem;">Queue is empty.</p>`;
      return;
    }

    this.queueList.innerHTML = this.queue.map((song, idx) => {
      const isCurrent = idx === this.currentIndex;
      return `
        <div class="queue-item ${isCurrent ? 'active' : ''}" data-idx="${idx}">
          <img class="queue-item-thumb" src="${song.coverUrl}" alt="${song.title}" />
          <div class="queue-item-meta">
            <div class="queue-item-title">${song.title}</div>
            <div class="queue-item-artist">${song.artist}</div>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${song.duration}</span>
        </div>
      `;
    }).join('');

    this.queueList.querySelectorAll('.queue-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-idx'), 10);
        this.currentIndex = idx;
        this.loadTrack(this.queue[this.currentIndex], true);
        this.renderQueueList();
      });
    });
  }

  initVisualizer() {
    if (!this.canvas || !this.canvasCtx) return;

    const draw = () => {
      this.visualizerAnimationId = requestAnimationFrame(draw);

      const width = this.canvas.width;
      const height = this.canvas.height;
      this.canvasCtx.clearRect(0, 0, width, height);

      const isPlaying = window.audioEngine && window.audioEngine.isPlaying;

      if (isPlaying) {
        window.audioEngine.getFrequencyData(this.frequencyArray);
      }

      const barCount = 14;
      const barWidth = 3.5;
      const gap = (width - (barCount * barWidth)) / (barCount - 1);
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--mood-accent').trim() || '#F59E0B';

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isPlaying) {
          const val = this.frequencyArray[i * 2] || 0;
          barHeight = Math.max(4, (val / 255) * height * 0.95);
        } else {
          // Subtle resting breathing wave
          barHeight = 4 + Math.sin(Date.now() / 350 + i * 0.6) * 2;
        }

        const x = i * (barWidth + gap);
        const y = height - barHeight;

        this.canvasCtx.fillStyle = accent;
        this.canvasCtx.shadowColor = accent;
        this.canvasCtx.shadowBlur = isPlaying ? 6 : 2;

        // Rounded bar
        this.canvasCtx.beginPath();
        this.canvasCtx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        this.canvasCtx.fill();
      }
    };

    draw();
  }
}

window.playerController = new PlayerController();
