(function () {
  "use strict";

  var STORAGE_KEY = "beach-music";
  var audio = document.getElementById("bg-music");
  var toggle = document.getElementById("music-toggle");
  if (!audio || !toggle) return;

  audio.volume = 0.4;

  function isPlaying() {
    return !audio.paused && !audio.ended;
  }

  function setToggleState(playing) {
    toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    toggle.setAttribute("aria-label", playing ? "Pause background music" : "Play background music");
    toggle.textContent = playing ? "♫" : "♪";
    toggle.classList.toggle("is-playing", playing);
  }

  function savePreference(playing) {
    try {
      localStorage.setItem(STORAGE_KEY, playing ? "on" : "off");
    } catch (e) {
      /* ignore storage errors */
    }
  }

  function playMusic() {
    return audio.play().then(function () {
      setToggleState(true);
      savePreference(true);
    }).catch(function () {
      setToggleState(false);
      savePreference(false);
    });
  }

  function pauseMusic() {
    audio.pause();
    setToggleState(false);
    savePreference(false);
  }

  toggle.addEventListener("click", function () {
    if (isPlaying()) {
      pauseMusic();
    } else {
      playMusic();
    }
  });

  audio.addEventListener("ended", function () {
    setToggleState(false);
  });

  setToggleState(false);

  try {
    if (localStorage.getItem(STORAGE_KEY) === "on") {
      playMusic();
    }
  } catch (e) {
    /* ignore storage errors */
  }
})();
