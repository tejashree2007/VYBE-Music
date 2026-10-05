/**
 * VYBE Music App - Main Application Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {
  // Load liked songs from localStorage
  try {
    window.likedSongIds = JSON.parse(localStorage.getItem('vybe_liked_songs')) || ['s1', 's5', 's18'];
  } catch (e) {
    window.likedSongIds = ['s1', 's5', 's18'];
  }

  // Update liked count in header/ui if exists
  updateLikedCounter();

  // Initialize components
  if (window.moodManager) window.moodManager.init();
  if (window.playerController) window.playerController.init();

  // Initialize other sections
  renderTrendingSection();
  renderArtistsSection();
  bindAppActions();
  bindSearch();
  bindGenreFilters();
  bindKeyboardShortcuts();
});

// Toast System
window.showToast = function(message, icon = '✨') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
};

// Like / Favorite System
window.toggleLikeSong = function(songId) {
  if (!window.likedSongIds) window.likedSongIds = [];
  const song = window.MOCK_SONGS.find(s => s.id === songId);
  const index = window.likedSongIds.indexOf(songId);

  if (index > -1) {
    window.likedSongIds.splice(index, 1);
    window.showToast(`Removed "${song ? song.title : 'Song'}" from Liked Songs`, '💔');
  } else {
    window.likedSongIds.push(songId);
    window.showToast(`Saved "${song ? song.title : 'Song'}" to your Liked Songs!`, '❤️');
  }

  localStorage.setItem('vybe_liked_songs', JSON.stringify(window.likedSongIds));
  updateLikedCounter();

  // Refresh all like buttons in the DOM
  document.querySelectorAll(`.song-like-btn[data-song-id="${songId}"]`).forEach(btn => {
    const isLiked = window.likedSongIds.includes(songId);
    btn.classList.toggle('liked', isLiked);
    btn.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>`;
  });

  if (window.playerController && window.audioEngine.currentTrack) {
    window.playerController.updateLikedButton(window.audioEngine.currentTrack.id);
  }
};

function updateLikedCounter() {
  const badge = document.getElementById('likedCountBadge');
  if (badge && window.likedSongIds) {
    badge.textContent = window.likedSongIds.length;
  }
}

// Bind Action Buttons
function bindAppActions() {
  const playAllBtn = document.getElementById('playAllVybeBtn');
  const shuffleVybeBtn = document.getElementById('shuffleVybeBtn');
  const savePlaylistBtn = document.getElementById('savePlaylistBtn');
  const currentMoodNavPill = document.getElementById('currentMoodNavPill');

  if (playAllBtn) {
    playAllBtn.addEventListener('click', () => {
      const activeMoodId = window.moodManager.currentMoodId;
      window.playerController.playAllFromMood(activeMoodId);
    });
  }

  if (shuffleVybeBtn) {
    shuffleVybeBtn.addEventListener('click', () => {
      const activeMoodId = window.moodManager.currentMoodId;
      window.playerController.shuffleMood(activeMoodId);
    });
  }

  if (currentMoodNavPill) {
    currentMoodNavPill.addEventListener('click', () => {
      const moodSection = document.getElementById('vybeMoodSection');
      if (moodSection) moodSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Playlist Modal
  const modal = document.getElementById('playlistModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const confirmSavePlaylistBtn = document.getElementById('confirmSavePlaylistBtn');
  const playlistNameInput = document.getElementById('playlistNameInput');

  if (savePlaylistBtn && modal) {
    savePlaylistBtn.addEventListener('click', () => {
      const mood = window.moodManager.currentMood;
      if (playlistNameInput && mood) {
        playlistNameInput.value = `${mood.emoji} My ${mood.label} VYBE Mix`;
      }
      modal.classList.add('active');
    });
  }

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  if (confirmSavePlaylistBtn && modal) {
    confirmSavePlaylistBtn.addEventListener('click', () => {
      const name = playlistNameInput ? playlistNameInput.value : 'My VYBE Playlist';
      modal.classList.remove('active');
      window.showToast(`Saved playlist "${name}" to Your Library!`, '📁');
    });
  }
}

// Live Search
function bindSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      // Restore active mood songs
      window.moodManager.renderYourVybeRightNow(window.moodManager.currentMood);
      return;
    }

    const matches = window.MOCK_SONGS.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.artist.toLowerCase().includes(query) ||
      s.album.toLowerCase().includes(query) ||
      s.genre.toLowerCase().includes(query) ||
      s.moods.some(m => m.includes(query))
    );

    const titleEl = document.getElementById('showcaseMoodTitle');
    if (titleEl) {
      titleEl.innerHTML = `Search Results for: <span class="mood-highlight">"${e.target.value}"</span> (${matches.length})`;
    }

    window.moodManager.renderSongsGrid(matches, window.moodManager.currentMood);
  });
}

// Genre Filter Pills
function bindGenreFilters() {
  const pills = document.querySelectorAll('.genre-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const genre = pill.getAttribute('data-genre');
      if (genre === 'all') {
        window.moodManager.renderYourVybeRightNow(window.moodManager.currentMood);
      } else {
        const moodSongs = window.MOCK_SONGS.filter(s => s.moods.includes(window.moodManager.currentMoodId));
        const filtered = moodSongs.filter(s => s.genre.toLowerCase().includes(genre.toLowerCase()));

        window.moodManager.renderSongsGrid(filtered.length > 0 ? filtered : moodSongs, window.moodManager.currentMood);

        if (window.showToast) {
          window.showToast(`Filtered by ${pill.textContent} within ${window.moodManager.currentMood.label} VYBE`, '🎯');
        }
      }
    });
  });
}

// Trending Section
function renderTrendingSection() {
  const container = document.getElementById('trendingSongsGrid');
  if (!container) return;

  // Curate top 4 songs with highest plays
  const trending = [...window.MOCK_SONGS].sort((a, b) => b.energy - a.energy).slice(0, 4);

  container.innerHTML = trending.map(song => {
    const moodObj = window.MOODS.find(m => m.id === song.moods[0]) || window.MOODS[0];
    return `
      <div class="song-card" data-song-id="${song.id}">
        <div class="song-card-cover-wrap">
          <img class="song-card-cover" src="${song.coverUrl}" alt="${song.title}" loading="lazy" />
          <span class="song-mood-pill"><span>${moodObj.emoji}</span> ${moodObj.label}</span>
          <button class="song-play-overlay-btn" title="Play ${song.title}" data-song-id="${song.id}">
            <i class="fas fa-play"></i>
          </button>
        </div>
        <div class="song-card-info">
          <div class="song-title-row">
            <h4 class="song-title" data-song-id="${song.id}">${song.title}</h4>
            <button class="song-like-btn" data-song-id="${song.id}"><i class="far fa-heart"></i></button>
          </div>
          <p class="song-artist">${song.artist}</p>
          <div class="song-card-meta">
            <span>🔥 ${song.plays} streams</span>
            <span>${song.duration}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.song-play-overlay-btn, .song-title').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const songId = btn.getAttribute('data-song-id');
      const song = window.MOCK_SONGS.find(s => s.id === songId);
      if (song && window.playerController) {
        window.playerController.playTrackFromList(song, trending);
      }
    });
  });

  container.querySelectorAll('.song-like-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const songId = btn.getAttribute('data-song-id');
      window.toggleLikeSong(songId);
    });
  });
}

// Popular Artists Section
function renderArtistsSection() {
  const container = document.getElementById('artistsRow');
  if (!container || !window.POPULAR_ARTISTS) return;

  container.innerHTML = window.POPULAR_ARTISTS.map(artist => `
    <div class="artist-card" data-artist="${artist.name}">
      <img class="artist-avatar" src="${artist.avatar}" alt="${artist.name}" loading="lazy" />
      <h4 class="artist-name">${artist.name}</h4>
      <p class="artist-role">${artist.role}</p>
      <span class="artist-followers">${artist.monthlyListeners} monthly listeners</span>
    </div>
  `).join('');

  container.querySelectorAll('.artist-card').forEach(card => {
    card.addEventListener('click', () => {
      const artistName = card.getAttribute('data-artist');
      const artistSong = window.MOCK_SONGS.find(s => s.artist.toLowerCase().includes(artistName.toLowerCase()));
      if (artistSong && window.playerController) {
        window.playerController.playTrackFromList(artistSong, window.MOCK_SONGS);
      }
    });
  });
}

// Keyboard Shortcuts
function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Avoid triggering when user is typing in an input
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (window.playerController) window.playerController.togglePlayPause();
    } else if (e.code === 'ArrowRight' && e.shiftKey) {
      if (window.playerController) window.playerController.next();
    } else if (e.code === 'ArrowLeft' && e.shiftKey) {
      if (window.playerController) window.playerController.prev();
    } else if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault();
      const input = document.getElementById('searchInput');
      if (input) input.focus();
    }
  });
}
