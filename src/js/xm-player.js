// XM Module Player for whoami page
(function() {
  let player = null;
  let isPlaying = false;
  let audioStarted = false;
  
  // Initialize ScripTracker player (only after user interaction)
  function initPlayer() {
    // Don't initialize until user has interacted
    if (!audioStarted) {
      return false;
    }
    
    // Check for ScripTracker in global scope
    if (typeof ScripTracker !== 'undefined' && !player) {
      try {
        player = new ScripTracker();
        
        // Set up event handlers
        player.on(ScripTracker.Events.playerReady, function(playerInstance) {
          console.log("XM module ready");
          // Auto-play since user has already interacted
          playerInstance.play();
        });
        
        player.on(ScripTracker.Events.play, function() {
          isPlaying = true;
          updatePlayButton();
          // Emit custom event for demo effect
          window.dispatchEvent(new Event('xm-play'));
        });
        
        player.on(ScripTracker.Events.stop, function() {
          isPlaying = false;
          updatePlayButton();
          // Emit custom event for demo effect
          window.dispatchEvent(new Event('xm-pause'));
        });
        
        player.on(ScripTracker.Events.songEnded, function() {
          // Loop the song
          player.play();
        });
        
        return true;
      } catch (e) {
        console.error('Failed to initialize ScripTracker:', e);
        return false;
      }
    } else if (!ScripTracker) {
      console.warn('ScripTracker not available yet');
      return false;
    }
    return true;
  }
  
  // Load and play XM module (requires user interaction)
  function loadAndPlayModule() {
    if (!audioStarted) {
      // Need user interaction first
      return;
    }
    
    if (!player) {
      initPlayer();
    }
    
    if (!player) {
      console.warn('ScripTracker not available');
      return;
    }
    
    if (isPlaying) {
      return; // Already playing
    }
    
    // Load the XM module  
    if (player && player.loadModule) {
      player.loadModule('static/xm/sobolsoft.xm');
    } else {
      console.error('ScripTracker loadModule method not found');
    }
  }
  
  // Stop playing
  function stopModule() {
    if (player && isPlaying) {
      player.stop();
      // Ensure player is rewound to avoid crackling
      if (player.rewind) {
        player.rewind();
      }
    }
  }
  
  // Toggle play/pause
  function togglePlayPause() {
    if (!audioStarted) {
      audioStarted = true;
      loadAndPlayModule();
    } else if (isPlaying) {
      stopModule();
    } else {
      if (player) {
        player.play();
      } else {
        loadAndPlayModule();
      }
    }
  }
  
  // Update play button state
  function updatePlayButton() {
    const playBtn = document.getElementById('xm-play-button');
    if (playBtn) {
      playBtn.textContent = isPlaying ? '⏸' : '▶';
    }
  }
  
  // Add play button to whoami page
  function addPlayButton() {
    const isWhoamiPage = window.location.hash.includes('whoami');
    if (!isWhoamiPage) return;
    
    // Check if button already exists
    if (document.getElementById('xm-play-button')) return;
    
    // Store original logo content for demo effect
    const logo = document.querySelector('.logo');
    if (logo && !logo.dataset.originalContent) {
      logo.dataset.originalContent = logo.innerHTML;
    }
    
    // Create play button
    const button = document.createElement('button');
    button.id = 'xm-play-button';
    button.textContent = '▶';
    button.style.cssText = `
      background: transparent;
      color: aquamarine;
      border: 1px solid aquamarine;
      padding: 0.25rem 0.5rem;
      font-family: "Fira Code", monospace;
      font-size: 0.875rem;
      cursor: pointer;
      margin-left: 1rem;
      transition: all 0.2s;
      vertical-align: middle;
      line-height: 1;
    `;
    
    button.addEventListener('click', togglePlayPause);
    
    button.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(127, 255, 212, 0.1)';
      this.style.borderColor = 'cadetblue';
      this.style.color = 'cadetblue';
    });
    
    button.addEventListener('mouseleave', function() {
      this.style.background = 'transparent';
      this.style.borderColor = 'aquamarine';
      this.style.color = 'aquamarine';
    });
    
    // Find the h1 and insert button inline
    const content = document.getElementById('content');
    if (content) {
      const firstH1 = content.querySelector('h1');
      if (firstH1 && firstH1.textContent.includes('About')) {
        firstH1.appendChild(button);
      } else if (firstH1) {
        firstH1.appendChild(button);
      } else {
        content.insertAdjacentElement('afterbegin', button);
      }
    }
  }
  
  // Check if we're on the whoami page
  function checkPage() {
    const hash = window.location.hash;
    const isWhoamiPage = hash.includes('whoami');
    
    if (isWhoamiPage) {
      setTimeout(function() {
        addPlayButton();
        updatePlayButton(); // Update button state
      }, 100); // Give content time to load
      
      // Auto-play if user has interacted (clicked nav link)
      if (audioStarted && !isPlaying) {
        loadAndPlayModule();
      }
    } else if (!isWhoamiPage && isPlaying) {
      // Stop music when leaving whoami page
      stopModule();
    }
  }
  
  // Listen for hash changes
  window.addEventListener('hashchange', checkPage);
  
  // Also check when content is loaded via the renderer
  const originalRenderFi = window.renderFi;
  window.renderFi = function(target) {
    // Call the original function
    originalRenderFi.apply(this, arguments);
    
    // Check if we should play/stop music
    setTimeout(checkPage, 100); // Small delay to ensure content is loaded
  };
  
  // Add click handler to whoami navigation link
  function addNavClickHandler() {
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
      if (link.href && link.href.includes('whoami')) {
        link.addEventListener('click', function() {
          // Enable audio on user interaction
          if (!audioStarted) {
            audioStarted = true;
          }
        });
      }
    });
  }
  
  // Delayed initialization to ensure ScripTracker is loaded
  function delayedInit() {
    setTimeout(function() {
      // Don't init player yet - wait for user interaction
      checkPage();
      addNavClickHandler();
    }, 100); // Small delay to ensure bundle is fully executed
  }
  
  // Initial check when page loads
  window.addEventListener('load', delayedInit);
  
  // Also check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', delayedInit);
  } else {
    delayedInit();
  }
  
  // Export for debugging
  window.xmPlayer = {
    player: function() { return player; },
    isPlaying: function() { return isPlaying; },
    audioStarted: function() { return audioStarted; },
    togglePlayPause: togglePlayPause
  };
})();