(function () {
  var dialog = document.getElementById("lightbox");
  if (!dialog) return;

  var img = dialog.querySelector(".lightbox-image");
  var caption = dialog.querySelector(".lightbox-caption");
  var counter = dialog.querySelector(".lightbox-counter");
  var prevBtn = dialog.querySelector(".lightbox-prev");
  var nextBtn = dialog.querySelector(".lightbox-next");

  var sets = {};
  var thumbs = document.querySelectorAll(".gallery-thumb");
  thumbs.forEach(function (btn) {
    var id = btn.getAttribute("data-gallery");
    if (!sets[id]) sets[id] = [];
    sets[id].push({
      src: btn.getAttribute("data-src"),
      alt: btn.getAttribute("data-alt") || "",
      caption: btn.getAttribute("data-caption") || ""
    });
    btn.addEventListener("click", function () {
      openSet(id, parseInt(btn.getAttribute("data-index"), 10));
    });
  });

  var currentSet = [];
  var index = 0;
  var lastFocus = null;
  var startX = 0;

  function render() {
    var item = currentSet[index];
    if (!item) return;
    img.src = item.src;
    img.alt = item.alt;
    caption.textContent = item.caption;
    counter.textContent = index + 1 + " / " + currentSet.length;
    var many = currentSet.length > 1;
    prevBtn.hidden = !many;
    nextBtn.hidden = !many;
  }

  function openSet(id, i) {
    currentSet = sets[id] || [];
    if (!currentSet.length) return;
    index = i;
    lastFocus = document.activeElement;
    render();
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  }

  function step(delta) {
    if (currentSet.length < 2) return;
    index = (index + delta + currentSet.length) % currentSet.length;
    render();
  }

  prevBtn.addEventListener("click", function () {
    step(-1);
  });
  nextBtn.addEventListener("click", function () {
    step(1);
  });

  dialog.addEventListener("close", function () {
    img.removeAttribute("src");
    img.alt = "";
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      dialog.close();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  });

  dialog.addEventListener("pointerdown", function (event) {
    if (event.target.closest("button")) return;
    startX = event.clientX;
  });

  dialog.addEventListener("pointerup", function (event) {
    if (event.target.closest("button")) return;
    var dx = event.clientX - startX;
    if (Math.abs(dx) > 56) {
      step(dx < 0 ? 1 : -1);
    }
  });
})();
