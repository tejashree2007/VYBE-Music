/**
 * VYBE Music App - Mood Manager
 * Handles mood selection, dynamic theme shifts, and "Your VYBE right now" recommendations.
 */

class MoodManager {
  constructor() {
    this.currentMoodId = 'happy';
    this.currentMood = null;
    this.listeners = [];
  }

  init() {
    const savedMood = localStorage.getItem('vybe_user_mood');
    const initialMoodId = savedMood && window.MOODS.find(m => m.id === savedMood) ? savedMood : 'happy';
    this.setMood(initialMoodId, false);
    this.renderMoodCards();
  }

  onMoodChange(callback) {
    this.listeners.push(callback);
  }

  setMood(moodId, triggerNotification = true) {
    const mood = window.MOODS.find(m => m.id === moodId);
    if (!mood) return;

    this.currentMoodId = moodId;
    this.currentMood = mood;
    localStorage.setItem('vybe_user_mood', moodId);

    // 1. Update CSS Custom Properties for Dynamic Theme Glow
    this.applyThemeColors(mood);

    // 2. Update Nav Mood Indicator
    this.updateNavPill(mood);

    // 3. Update Mood Cards active state
    this.updateActiveMoodCard(moodId);

    // 4. Update "Your VYBE right now" showcase section
    this.renderYourVybeRightNow(mood);

    // 5. Notify subscribers (e.g. player visualizer color update)
    this.listeners.forEach(cb => cb(mood));

    if (triggerNotification && window.showToast) {
      window.showToast(`${mood.emoji} Tuned to ${mood.label} VYBE!`, '✨');
    }
  }

  applyThemeColors(mood) {
    const root = document.documentElement;
    root.style.setProperty('--mood-accent', mood.accent);
    root.style.setProperty('--mood-accent-light', mood.accentLight);
    root.style.setProperty('--mood-gradient', mood.gradient);
    root.style.setProperty('--mood-glow', mood.glowColor);
    root.style.setProperty('--mood-bg-tint', mood.bgTint);

    // Update ambient blob background colors
    const blob1 = document.querySelector('.ambient-blob-1');
    if (blob1) blob1.style.background = mood.glowColor;
  }

  updateNavPill(mood) {
    const pill = document.getElementById('currentMoodNavPill');
    if (pill) {
      pill.innerHTML = `
        <div class="mood-dot-pulse" style="background: ${mood.accent}; box-shadow: 0 0 10px ${mood.accent};"></div>
        <span>${mood.emoji} ${mood.label}</span>
      `;
    }
  }

  renderMoodCards() {
    const container = document.getElementById('moodCardsGrid');
    if (!container) return;

    container.innerHTML = window.MOODS.map(mood => {
      const isActive = mood.id === this.currentMoodId;
      return `
        <div class="mood-card ${isActive ? 'active' : ''}" data-mood-id="${mood.id}" id="moodCard-${mood.id}">
          <div class="mood-card-header">
            <span class="mood-emoji">${mood.emoji}</span>
            <span class="mood-active-tag">ACTIVE VYBE</span>
          </div>
          <div class="mood-card-body">
            <h3 class="mood-name">${mood.label}</h3>
            <p class="mood-tagline">${mood.tagline}</p>
          </div>
          <div class="mood-card-footer">
            <span class="mood-tempo-badge">Tempo: ${mood.bpmRange}</span>
            <span>${mood.energy} Energy</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards
    container.querySelectorAll('.mood-card').forEach(card => {
      card.addEventListener('click', () => {
        const moodId = card.getAttribute('data-mood-id');
        this.setMood(moodId, true);

        // Smooth scroll to "Your VYBE right now" section
        const showcase = document.getElementById('yourVybeRightNowSection');
        if (showcase) {
          showcase.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  updateActiveMoodCard(moodId) {
    document.querySelectorAll('.mood-card').forEach(card => {
      if (card.getAttribute('data-mood-id') === moodId) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  renderYourVybeRightNow(mood) {
    // 1. Update Showcase Banner info
    const titleEl = document.getElementById('showcaseMoodTitle');
    const descEl = document.getElementById('showcaseMoodDesc');
    const energyEl = document.getElementById('showcaseEnergy');
    const tempoEl = document.getElementById('showcaseTempo');
    const valenceEl = document.getElementById('showcaseValence');

    if (titleEl) {
      titleEl.innerHTML = `Your VYBE right now: <span class="mood-highlight">${mood.emoji} ${mood.label}</span>`;
    }
    if (descEl) {
      descEl.textContent = mood.desc;
    }
    if (energyEl) energyEl.textContent = `${mood.energy} Energy Level`;
    if (tempoEl) tempoEl.textContent = mood.bpmRange;
    if (valenceEl) valenceEl.textContent = mood.valence;

    // 2. Filter & recommend songs
    const filteredSongs = window.MOCK_SONGS.filter(song => song.moods.includes(mood.id));
    this.renderSongsGrid(filteredSongs, mood);
  }

  renderSongsGrid(songs, mood) {
    const grid = document.getElementById('personalizedSongsGrid');
    if (!grid) return;

    if (songs.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
          <p>No songs found for this mood filter right now.</p>
        </div>
      `;
      return;
    }

    const currentTrackId = window.audioEngine && window.audioEngine.currentTrack ? window.audioEngine.currentTrack.id : null;
    const isPlaying = window.audioEngine && window.audioEngine.isPlaying;

    grid.innerHTML = songs.map(song => {
      const isCurrent = song.id === currentTrackId;
      const isLiked = (window.likedSongIds || []).includes(song.id);

      return `
        <div class="song-card ${isCurrent ? 'playing-now' : ''}" data-song-id="${song.id}">
          <div class="song-card-cover-wrap">
            <img class="song-card-cover" src="${song.coverUrl}" alt="${song.title}" loading="lazy" />
            <span class="song-mood-pill">
              <span>${mood.emoji}</span> ${mood.label}
            </span>
            <button class="song-play-overlay-btn" title="Play ${song.title}" data-song-id="${song.id}">
              ${isCurrent && isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>'}
            </button>
          </div>
          <div class="song-card-info">
            <div class="song-title-row">
              <h4 class="song-title" title="${song.title}" data-song-id="${song.id}">${song.title}</h4>
              <button class="song-like-btn ${isLiked ? 'liked' : ''}" data-song-id="${song.id}" title="${isLiked ? 'Unlike' : 'Like'}">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
              </button>
            </div>
            <p class="song-artist">${song.artist} • <span style="color: var(--text-muted);">${song.album}</span></p>
            <div class="song-vibe-reason" title="VYBE Recommendation Insight">
              <i class="fas fa-sparkles" style="color: var(--mood-accent); margin-right: 4px;"></i>
              ${song.vibeReason}
            </div>
            <div class="song-card-meta">
              <span><i class="fas fa-fire-alt" style="margin-right: 4px;"></i>${song.bpm} BPM</span>
              <span><i class="far fa-clock" style="margin-right: 4px;"></i>${song.duration}</span>
              <span>${song.plays} plays</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events for cards and buttons
    grid.querySelectorAll('.song-play-overlay-btn, .song-title').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const songId = btn.getAttribute('data-song-id');
        const song = window.MOCK_SONGS.find(s => s.id === songId);
        if (song && window.playerController) {
          window.playerController.playTrackFromList(song, songs);
        }
      });
    });

    grid.querySelectorAll('.song-like-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const songId = btn.getAttribute('data-song-id');
        if (window.toggleLikeSong) {
          window.toggleLikeSong(songId);
        }
      });
    });
  }
}

window.moodManager = new MoodManager();
