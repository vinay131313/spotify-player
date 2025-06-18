// Music Player JavaScript - Optimized Version
let audio = new Audio();
let nextAudio = new Audio(); // For preloading next song
let audioCache = new Map(); // For caching audio elements
let helper = 0;
let currentSongGlobal;
let songs = new Map();
let globalFolder;

// Initialize volume controls once
function setupVolumeControls() {
  document.querySelector(".volume").innerHTML = `
    <img class="vol" src="/spotify-player/img/volume.svg" alt="">
    <input class="range" type="range" value="50">
    <p class="volPercentage">50%</p>`;

  document.querySelector(".range")?.addEventListener("input", (e) => {
    const volume = Number(e.target.value) / 100;
    audio.volume = volume;
    document.querySelector(".volPercentage").innerHTML = `${Math.round(volume * 100)}%`;
    
    if (volume === 0) {
      document.querySelector(".vol").src = "/spotify-player/img/mute.svg";
    } else {
      document.querySelector(".vol").src = "/spotify-player/img/volume.svg";
    }
  });

  document.querySelector(".vol")?.addEventListener("click", (e) => {
    if (audio.volume > 0) {
      audio.volume = 0;
      document.querySelector(".range").value = 0;
      document.querySelector(".volPercentage").innerHTML = "0%";
      e.target.src = "/spotify-player/img/mute.svg";
    } else {
      audio.volume = 0.5;
      document.querySelector(".range").value = 50;
      document.querySelector(".volPercentage").innerHTML = "50%";
      e.target.src = "/spotify-player/img/volume.svg";
    }
  });
}

async function getSongs(folder) {
  try {
    songs.clear();
    let response = await fetch(`/spotify-player/songs/${folder}/${folder}.json`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    let fs = await response.json();
    
    let songUl = document.querySelector(".songList");
    songUl.innerHTML = "";

    for (const item of fs) {
      let temp = item.split(".mp3")[0];
      let temp1 = temp.split("(")[0];
      let temp2 = temp.includes(")") ? temp.split(")")[1] : "";
      temp = (temp1 + temp2).trim();
      songs.set(temp, item);
      
      songUl.innerHTML += `
        <ul>
          <div class="music invert"><img src="/spotify-player/img/music.svg" alt=""></div>
          <div class="info">
            <div class="songName">${temp}</div>
          </div>
          <div class="playNow">play now</div>
          <div class="playSvg invert"><img class="svg" src="/spotify-player/img/play.svg" alt=""></div>
        </ul>`;
    }
  } catch (error) {
    console.error("Error loading songs:", error);
    document.querySelector(".songInfo").innerHTML = "Error loading songs";
  }
}

function secondsToMinutes(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainingSeconds = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function updateTime() {
  if (audio.readyState >= 1) {
    document.querySelector(".songTime").innerHTML = `${secondsToMinutes(
      audio.currentTime
    )} / ${secondsToMinutes(audio.duration)}`;
    document.querySelector(".circle").style.left =
      (audio.currentTime / audio.duration) * 100 + "%";
      
    if (audio.currentTime === audio.duration) {
      document.querySelector(".play_button").src = "/spotify-player/img/play.svg";
      if (currentSongGlobal) {
        currentSongGlobal.querySelector(".svg").src = "/spotify-player/img/play.svg";
      }
    }
  }
}

function showLoading() {
  const songInfo = document.querySelector(".songInfo");
  songInfo.textContent = "Loading...";
  songInfo.classList.add('loading');
}

async function playMusic(trackName, track) {
  try {
    showLoading();
    
    // Store previous volume
    const previousVolume = audio.volume || 0.5;
    
    // Clean up previous audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener('timeupdate', updateTime);
    } else {
      audio = new Audio();
    }
    
    // Set up error handling
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      document.querySelector(".songInfo").innerHTML = "Error loading song";
    }, { once: true });

    // Encode and set source
    const encodedTrack = encodeURIComponent(track);
    const audioUrl = `https://vinay131313.github.io/spotify-player/songs/${globalFolder}/${encodedTrack}`;
    audio.src = audioUrl;
    
    // Update UI immediately
    document.querySelector(".songInfo").innerHTML = trackName;
    document.querySelector(".songInfo").classList.remove('loading');
    
    if (currentSongGlobal) {
      currentSongGlobal.querySelector(".svg").src = "/spotify-player/img/pause.svg";
    }
    document.querySelector(".play_button").src = "/spotify-player/img/pause.svg";
    
    // Wait for audio to be ready with timeout
    await Promise.race([
      new Promise((resolve) => {
        if (audio.readyState >= 3) resolve(); // Already have enough data
        audio.addEventListener('canplaythrough', resolve, { once: true });
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Audio loading timeout')), 3000))
    ]);

    // Restore volume and play
    audio.volume = previousVolume;
    await audio.play();
    audio.addEventListener("timeupdate", updateTime);
    
    // Preload next song if available
    if (currentSongGlobal?.nextElementSibling) {
      const nextTrack = currentSongGlobal.nextElementSibling.querySelector(".songName").innerHTML.trim();
      const nextEncoded = encodeURIComponent(songs.get(nextTrack));
      nextAudio.src = `https://vinay131313.github.io/spotify-player/songs/${globalFolder}/${nextEncoded}`;
      nextAudio.preload = 'auto';
    }
    
  } catch (error) {
    console.error("Error in playMusic:", error);
    document.querySelector(".songInfo").innerHTML = "Error playing: " + trackName;
    
    // Try next song if available
    if (currentSongGlobal?.nextElementSibling) {
      const nextSong = currentSongGlobal.nextElementSibling;
      const nextTrackName = nextSong.querySelector(".songName").innerHTML.trim();
      playMusic(nextTrackName, songs.get(nextTrackName));
    }
  }
}

async function createAlbum() {
  try {
    const allSongFolder = await fetch("/spotify-player/songs/folder.json");
    const folder = await allSongFolder.json();
    
    for (const item of folder) {
      let a = await fetch(`/spotify-player/songs/${item}/info.json`);
      if (!a.ok) throw new Error("Failed to fetch album info");
      let response = await a.json();

      document.querySelector(".card-container").innerHTML += `
        <div data-folder="${item}" class="card">
          <div class="playout">
            <div class="play">
              <div class="circular"><img src="/spotify-player/img/play.svg" alt=""></div>
            </div>
          </div>
          <img class="rounded" src="/spotify-player/songs/${item}/cover.jpeg" alt="">
          <h2 class="f-size1">${response.title}</h2>
          <p class="f-size1">${response.discription}</p>
        </div>`;
    }
  } catch (error) {
    console.error("Error creating album:", error);
  }
}

function updateNavButtons() {
  const nextBtn = document.querySelector(".nextsong");
  const prevBtn = document.querySelector(".prevsong");

  // Next button state
  if (!currentSongGlobal?.nextElementSibling) {
    nextBtn.style.opacity = 0.3;
    nextBtn.style.pointerEvents = "none";
  } else {
    nextBtn.style.opacity = 1;
    nextBtn.style.pointerEvents = "auto";
  }

  // Previous button state
  if (!currentSongGlobal?.previousElementSibling) {
    prevBtn.style.opacity = 0.3;
    prevBtn.style.pointerEvents = "none";
  } else {
    prevBtn.style.opacity = 1;
    prevBtn.style.pointerEvents = "auto";
  }
}

function handleSongClick(e) {
  const clickedUl = e.target.closest("ul");
  if (!clickedUl) return;

  const isSvgClick = e.target.classList.contains("svg");

  // Play/Pause current song
  if (isSvgClick && clickedUl === currentSongGlobal) {
    e.stopImmediatePropagation();
    if (audio.paused) {
      audio.play();
      e.target.src = "/spotify-player/img/pause.svg";
      document.querySelector(".play_button").src = "/spotify-player/img/pause.svg";
    } else {
      audio.pause();
      e.target.src = "/spotify-player/img/play.svg";
      document.querySelector(".play_button").src = "/spotify-player/img/play.svg";
    }
    return;
  }

  // Change to new song
  if (currentSongGlobal) {
    currentSongGlobal.querySelector(".svg").src = "/spotify-player/img/play.svg";
  }

  const trackName = clickedUl.querySelector(".songName").innerHTML.trim();
  currentSongGlobal = clickedUl;
  updateNavButtons();

  // Update active song UI
  document.querySelectorAll(".songList ul").forEach((ul) => {
    ul.classList.remove("activeSong");
  });
  clickedUl.classList.add("activeSong");

  // Play the new song
  playMusic(trackName, songs.get(trackName));

  // Update play/pause icons
  clickedUl.querySelector(".svg").src = "/spotify-player/img/pause.svg";
  document.querySelector(".play_button").src = "/spotify-player/img/pause.svg";
}

async function main() {
  setupVolumeControls();
  await createAlbum();

  // Card container click handler
  document.querySelector(".card-container").addEventListener("click", async (e) => {
    const card = e.target.closest(".card");
    const clickOnPlay = e.target.closest(".playout");
    
    if (card) {
      const folder = card.dataset.folder;
      globalFolder = folder;
      await getSongs(folder);
      
      document.querySelector(".left").style.left = "0%";
      
      if (clickOnPlay) {
        let songListElement = document.querySelector(".songList");
        if (songListElement?.firstElementChild) {
          let songElement = songListElement.firstElementChild;
          let songName = songElement.querySelector(".songName").innerHTML.trim();
          currentSongGlobal = songElement;
          updateNavButtons();
          playMusic(songName, songs.get(songName));
        }
      }
    }
  });

  // Song list click handler
  document.querySelector(".songList").addEventListener("click", handleSongClick);

  // Play/pause button
  document.querySelector(".play_button").addEventListener("click", () => {
    if (!currentSongGlobal) {
      currentSongGlobal = document.querySelector(".songList").firstElementChild;
    }
    
    const playIcon = currentSongGlobal?.querySelector(".svg");
    if (audio.paused) {
      audio.play();
      document.querySelector(".play_button").src = "/spotify-player/img/pause.svg";
      if (playIcon) playIcon.src = "/spotify-player/img/pause.svg";
    } else {
      audio.pause();
      document.querySelector(".play_button").src = "/spotify-player/img/play.svg";
      if (playIcon) playIcon.src = "/spotify-player/img/play.svg";
    }
  });

  // Next song button
  document.querySelector(".nextsong").addEventListener("click", () => {
    if (currentSongGlobal?.nextElementSibling) {
      currentSongGlobal.querySelector(".svg").src = "/spotify-player/img/play.svg";
      currentSongGlobal.classList.remove("activeSong");
      currentSongGlobal = currentSongGlobal.nextElementSibling;
      currentSongGlobal.classList.add("activeSong");
      updateNavButtons();
      
      const nextTrackName = currentSongGlobal.querySelector(".info").firstElementChild.innerHTML.trim();
      playMusic(nextTrackName, songs.get(nextTrackName));
    }
  });

  // Previous song button
  document.querySelector(".prevsong").addEventListener("click", () => {
    if (currentSongGlobal?.previousElementSibling) {
      currentSongGlobal.querySelector(".svg").src = "/spotify-player/img/play.svg";
      currentSongGlobal.classList.remove("activeSong");
      currentSongGlobal = currentSongGlobal.previousElementSibling;
      currentSongGlobal.classList.add("activeSong");
      updateNavButtons();
      
      const prevTrackName = currentSongGlobal.querySelector(".info").firstElementChild.innerHTML.trim();
      playMusic(prevTrackName, songs.get(prevTrackName));
    }
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    const songList = document.querySelector(".songList");
    const isHoveringSongList = songList.matches(":hover");

    // Handle scrolling when hovering song list
    if (isHoveringSongList) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        songList.scrollBy({ top: 40, behavior: "smooth" });
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        songList.scrollBy({ top: -40, behavior: "smooth" });
        return;
      }
    }

    // Handle spacebar play/pause
    if (e.code === "Space") {
      e.preventDefault();
      const playButton = document.querySelector(".play_button");
      if (audio.paused) {
        audio.play();
        playButton.src = "/spotify-player/img/pause.svg";
        if (currentSongGlobal) {
          currentSongGlobal.querySelector(".svg").src = "/spotify-player/img/pause.svg";
        }
      } else {
        audio.pause();
        playButton.src = "/spotify-player/img/play.svg";
        if (currentSongGlobal) {
          currentSongGlobal.querySelector(".svg").src = "/spotify-player/img/play.svg";
        }
      }
      return;
    }

    // Handle arrow keys for navigation
    if (!currentSongGlobal) return;

    if (e.key === "ArrowRight" && currentSongGlobal.nextElementSibling) {
      currentSongGlobal.querySelector(".svg").src = "/spotify-player/img/play.svg";
      currentSongGlobal.classList.remove("activeSong");
      currentSongGlobal = currentSongGlobal.nextElementSibling;
      currentSongGlobal.classList.add("activeSong");
      updateNavButtons();
      
      const nextTrackName = currentSongGlobal.querySelector(".info").firstElementChild.innerHTML.trim();
      playMusic(nextTrackName, songs.get(nextTrackName));
    }

    if (e.key === "ArrowLeft" && currentSongGlobal.previousElementSibling) {
      currentSongGlobal.querySelector(".svg").src = "/spotify-player/img/play.svg";
      currentSongGlobal.classList.remove("activeSong");
      currentSongGlobal = currentSongGlobal.previousElementSibling;
      currentSongGlobal.classList.add("activeSong");
      updateNavButtons();
      
      const prevTrackName = currentSongGlobal.querySelector(".info").firstElementChild.innerHTML.trim();
      playMusic(prevTrackName, songs.get(prevTrackName));
    }
  });

  // Seekbar functionality
  const seekbar = document.querySelector(".seekbar");
  const circle = document.querySelector(".circle");
  let isDragging = false;
  let dragOffsetX = 0;

  circle.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", endDrag);
  circle.addEventListener("touchstart", startDrag);
  document.addEventListener("touchmove", handleDrag);
  document.addEventListener("touchend", endDrag);

  function startDrag(e) {
    isDragging = true;
    e.preventDefault();
    document.body.style.userSelect = "none";
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const circleRect = circle.getBoundingClientRect();
    dragOffsetX = clientX - (circleRect.left + circleRect.width / 2);
  }

  function handleDrag(e) {
    if (!isDragging || !audio.duration) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const seekbarRect = seekbar.getBoundingClientRect();
    let centerX = Math.max(0, Math.min(seekbarRect.width, clientX - seekbarRect.left - dragOffsetX));
    const percent = (centerX / seekbarRect.width) * 100;
    audio.currentTime = (percent / 100) * audio.duration;
    circle.style.left = `${percent}%`;
  }

  function endDrag() {
    document.body.style.userSelect = "auto";
    isDragging = false;
  }

  // Seekbar click
  seekbar.addEventListener("click", (e) => {
    const seekbarRect = seekbar.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const percent = (clientX - seekbarRect.left) / seekbarRect.width;
    audio.currentTime = percent * audio.duration;
    circle.style.left = `${percent * 100}%`;
  });

  // Menu controls
  document.querySelector(".hamburgur").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0%";
  });
  document.querySelector(".close").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-100%";
  });
}

// Start the application
main();
