
let audio = new Audio();
let helper = 0;
let currentSongGlobal;
let songs = new Map();

async function getSongs(folder) {
  songs.clear();
  let fs = await fetch(`/songs/${folder}`);
  if (!fs.ok) {
    throw new Error("Failed to fetch: fs (getSongs function)");
  }
  let response = await fs.text();
  let div = document.createElement("div");
  div.innerHTML = response;
  let as = div.getElementsByTagName("a");

  for (let i = 0; i < as.length; i++) {
    const element = as[i];
    if (element.href.endsWith(".mp3")) {
      let temp = decodeURIComponent(element.href.split(`${folder}/`)[1]);
      temp = temp.split(".mp3")[0];
      let temp1 = temp.split("(")[0];
      let temp2 = temp.includes(")") ? temp.split(")")[1] : "";
      temp = temp1 + temp2;
      songs.set(temp.trim(), element.href);
    }
  }

  let songUl = document.querySelector(".songList");
  songUl.innerHTML = "";

  for (const [key, value] of songs) {
    console.log("key : " + key);
    songUl.innerHTML += `
      <ul>
        <div class="music invert"><img src="img/music.svg" alt=""></div>
        <div class="info">
          <div class="songName">${key}</div>
        </div>
        <div class="playNow">play now</div>
        <div class="playSvg invert"><img class="svg" src="img/play.svg" alt=""></div>
      </ul>`;
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
    let play = document.querySelector(".play_button");
    if (audio.currentTime === audio.duration) {
      console.log("song finish");
      play.src = "img/play.svg";
      if (currentSongGlobal)
        currentSongGlobal.querySelector(".svg").src = "img/play.svg";
    }
  }
}

function playMusic(trackName, track) {
  let volumetemp = 0.5;
  let mute0 = 0;
  if (audio) {
    audio.pause();
  }
  audio.src = track;
  audio.play();
  helper = 1;
  console.log("track : " + track);
  document.querySelector(".songInfo").innerHTML = trackName;
  audio.volume = 0.5;

  document.querySelector(".volume").innerHTML = `
    <img class="vol" src="img/volume.svg" alt="">
    <input class="range" type="range" value="50">
    <p class="volPercentage">50%</p>`;

  document.querySelector(".range").addEventListener("input", (e) => {
    const volume = Number(e.target.value);
    audio.volume = volume / 100;
    document.querySelector(".volPercentage").innerHTML = `${volume}%`;
    if (mute0 && volume > 0) {
      document.querySelector(".vol").src = "img/volume.svg";
      mute0 = 0;
    }
    if (volume === 0) {
      document.querySelector(".vol").src = "img/mute.svg";
    } else {
      volumetemp = audio.volume;
    }
  });

  document.querySelector(".vol").addEventListener("click", (e) => {
    if (audio.volume !== 0) {
      volumetemp = audio.volume;
      mute0 = 1;
      e.target.src = "img/mute.svg";
      audio.volume = 0;
      document.querySelector(".range").value = 0;
      document.querySelector(".volPercentage").innerHTML = "0%";
    } else {
      mute0 = 0;
      audio.volume = volumetemp;
      document.querySelector(".range").value = volumetemp * 100;
      document.querySelector(".volPercentage").innerHTML = `${
        volumetemp * 100
      }%`;
      e.target.src = "img/volume.svg";
    }
  });

  if (currentSongGlobal)
    currentSongGlobal.querySelector(".svg").src = "img/pause.svg";
  document.querySelector(".play_button").src = "img/pause.svg";
  audio.addEventListener("timeupdate", updateTime);
}

async function createAlbum() {
  const allSongFolder = await fetch("/songs/folder.json");
  const folder = await allSongFolder.json();
  for (const item of folder) 
  {
    let a = await fetch(`spotify-player/songs/${item}/info.json`);
    if (!a) 
    {
      throw new Error("Failed to fetch :  a");
    }
      let response = await a.json();

      document.querySelector(
        ".card-container"
      ).innerHTML += `<div data-folder = "${item}" class="card">
                        <div class="playout">
                            <div class="play">
                                <div class="circular"><img src="img/play.svg" alt=""></div>
                            </div>
                        </div>

                        <img class="rounded"
                            src="/songs/${item}/cover.jpeg"
                            alt="">
                        <h2 class="f-size1">${response.title}</h2>
                        <p class="f-size1">${response.discription}</p>
                    </div>`;
    }
  }


async function main() {
  let songUl = document.querySelector(".songList");
  createAlbum();

  //Use event delegation for showing dyanmically populated elements
  document
    .querySelector(".card-container")
    .addEventListener("click", async (e) => {
      const card = e.target.closest(".card");
      if (card) {
        const folder = card.dataset.folder;
        await getSongs(folder);
      }
    });

  // first , fav

  //---------------------------------------------------------------------------------

  function updateNavButtons() {
    const nextBtn = document.querySelector(".nextsong");
    const prevBtn = document.querySelector(".prevsong");

    // Disable (fade) if no next song
    if (!currentSongGlobal?.nextElementSibling) {
      nextBtn.style.opacity = 0.3;
      nextBtn.style.pointerEvents = "none"; // Prevent click
    } else {
      nextBtn.style.opacity = 1;
      nextBtn.style.pointerEvents = "auto";
    }

    // Disable (fade) if no previous song
    if (!currentSongGlobal?.previousElementSibling) {
      prevBtn.style.opacity = 0.3;
      prevBtn.style.pointerEvents = "none";
    } else {
      prevBtn.style.opacity = 1;
      prevBtn.style.pointerEvents = "auto";
    }
  }

  //---------------------------------------------------------------------------------

  function songer(e) {
    const clickedUl = e.target.closest("ul");
    if (!clickedUl) return;

    const isSvgClick = e.target.classList.contains("svg");

    // Play/Pause icon clicked
    if (isSvgClick && clickedUl === currentSongGlobal) {
      e.stopImmediatePropagation();
      if (audio.paused) {
        audio.play();
        e.target.src = "img/pause.svg";
        document.querySelector(".play_button").src = "img/pause.svg";
      } else {
        audio.pause();
        e.target.src = "img/play.svg";
        document.querySelector(".play_button").src = "img/play.svg";
      }
      return;
    }
    //it convert prvious song play button to play format from pause format
    if (currentSongGlobal) {
      currentSongGlobal.querySelector(".svg").src = "img/play.svg";
    }
    // Song row clicked (start new song)
    const trackName = clickedUl.querySelector(".songName").innerHTML.trim();
    currentSongGlobal = clickedUl;
    updateNavButtons();

    // Remove active classes and set new
    document.querySelectorAll(".songList ul").forEach((ul) => {
      ul.classList.remove("activeSong");
    });
    clickedUl.classList.add("activeSong");

    // Start playing the song
    playMusic(trackName, songs.get(trackName));

    // Sync icons
    clickedUl.querySelector(".svg").src = "img/pause.svg";
    document.querySelector(".play_button").src = "img/pause.svg";
  }

  document.querySelector(".songList").addEventListener("click", songer);
  let play = document.querySelector(".play_button");
  play.addEventListener("click", () => {
    let play0;
    if (!currentSongGlobal) {
      currentSongGlobal = document.querySelector(".songList").firstElementChild;
    }
    play0 = currentSongGlobal.querySelector(".svg");
    if (audio.paused) {
      audio.play();
      play.src = "img/pause.svg";
      play0.src = "img/pause.svg";
    } else {
      audio.pause();
      play.src = "img/play.svg";
      play0.src = "img/play.svg";
    }
  });

  // console.log("song : " + currentSongGlobal);
  document.querySelector(".nextsong").addEventListener("click", () => {
    if (currentSongGlobal) {
      let nextSong = currentSongGlobal.nextElementSibling;
      if (nextSong) {
        //it convert prvious song play button to play format from pause format
        currentSongGlobal.querySelector(".svg").src = "img/play.svg";
        currentSongGlobal.classList.remove("activeSong");
        currentSongGlobal = nextSong;
        currentSongGlobal.classList.add("activeSong");
        updateNavButtons();
        let x = nextSong
          .querySelector(".info")
          .firstElementChild.innerHTML.trim();

        playMusic(x, songs.get(x));
      }
    }
  });

  document.querySelector(".prevsong").addEventListener("click", () => {
    if (currentSongGlobal) {
      let prevSong = currentSongGlobal.previousElementSibling;
      if (prevSong) {
        //it convert prvious song play button to play format from pause format
        currentSongGlobal.querySelector(".svg").src = "img/play.svg";
        currentSongGlobal.classList.remove("activeSong");
        currentSongGlobal = prevSong;
        currentSongGlobal.classList.add("activeSong");
        updateNavButtons();
        let x = prevSong
          .querySelector(".info")
          .firstElementChild.innerHTML.trim();
        playMusic(x, songs.get(x));
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    const songList = document.querySelector(".songList");
    const isHoveringSongList = songList.matches(":hover");

    // 1. Handle scrolling when hovering song list
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

    // 2. Handle spacebar play/pause
    if (e.code === "Space") {
      e.preventDefault();
      const playButton = document.querySelector(".play_button");
      if (audio.paused) {
        audio.play();
        playButton.src = "img/pause.svg";
        if (currentSongGlobal) {
          currentSongGlobal.querySelector(".svg").src = "img/pause.svg";
        }
      } else {
        audio.pause();
        playButton.src = "img/play.svg";
        if (currentSongGlobal) {
          currentSongGlobal.querySelector(".svg").src = "img/play.svg";
        }
      }
      return; // Exit after handling spacebar
    }

    // 3. Handle arrow keys (outside spacebar condition!)
    if (!currentSongGlobal) return;

    if (e.key === "ArrowRight") {
      let nextSong = currentSongGlobal.nextElementSibling;
      if (nextSong) {
        //it convert prvious song play button to play format from pause format
        currentSongGlobal.querySelector(".svg").src = "img/play.svg";
        currentSongGlobal.classList.remove("activeSong");
        currentSongGlobal = nextSong;
        currentSongGlobal.classList.add("activeSong");
        updateNavButtons();
        let x = nextSong
          .querySelector(".info")
          .firstElementChild.innerHTML.trim();
        playMusic(x, songs.get(x));
      }
    }

    if (e.key === "ArrowLeft") {
      let prevSong = currentSongGlobal.previousElementSibling;
      if (prevSong) {
        //it convert prvious song play button to play format from pause format
        currentSongGlobal.querySelector(".svg").src = "img/play.svg";
        currentSongGlobal.classList.remove("activeSong");
        currentSongGlobal = prevSong;
        currentSongGlobal.classList.add("activeSong");
        updateNavButtons();
        let x = prevSong
          .querySelector(".info")
          .firstElementChild.innerHTML.trim();
        playMusic(x, songs.get(x));
      }
    }
  });

  document.querySelector(".seekbar").addEventListener("click", (e) => {
    const seekbarRect = seekbar.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);

    const offsetX = clientX - seekbarRect.left;

    const percent = offsetX / seekbarRect.width;

    audio.currentTime = percent * audio.duration;
    circle.style.left = percent * 100 + "%";
  });

  //-----------------------------------------------------------------------------------------------------------------------------------

  // Drag functionality

  let isDragging = false;
  const seekbar = document.querySelector(".seekbar");
  const seekbarContainer = document.querySelector(".seekbar");
  const circle = document.querySelector(".circle");

  circle.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", endDrag);
  circle.addEventListener("touchstart", startDrag);
  document.addEventListener("touchmove", handleDrag);
  document.addEventListener("touchend", endDrag);

  let dragOffsetX = 0;

  function startDrag(e) {
    isDragging = true;
    e.preventDefault();
    document.body.style.userSelect = "none";
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const circleRect = circle.getBoundingClientRect();

    // Offset relative to circle center (not left)
    dragOffsetX = clientX - (circleRect.left + circleRect.width / 2);
  }

  function handleDrag(e) {
    if (!isDragging || !audio.duration) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const seekbarRect = seekbarContainer.getBoundingClientRect();

    // Calculate center position of circle relative to seekbar
    let centerX = clientX - seekbarRect.left - dragOffsetX;

    // Clamp centerX within seekbar boundaries
    centerX = Math.max(0, Math.min(seekbarRect.width, centerX));

    const percent = (centerX / seekbarRect.width) * 100;

    audio.currentTime = (percent / 100) * audio.duration;
    circle.style.left = `${percent}%`;
  }

  function endDrag() {
    document.body.style.userSelect = "auto";
    isDragging = false;
  }
  document.querySelector(".hamburgur").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0%";
  });
  document.querySelector(".close").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-100%";
  });

  //-------------------------------------------------------------------------------------------------------------------
}

main();


