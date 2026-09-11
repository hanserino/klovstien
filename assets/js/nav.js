(function () {
  var sidebar = document.getElementById("meny");
  var toggle = document.querySelector(".menu-toggle");
  if (!sidebar || !toggle) return;

  toggle.addEventListener("click", function () {
    var open = sidebar.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
})();
