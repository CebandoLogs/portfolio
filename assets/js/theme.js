// Tema claro/oscuro: respeta lo que eligió el visitante; si no eligió, usa el
// valor inicial configurado en el panel ("auto" sigue al sistema operativo).
(function () {
  var root = document.documentElement;
  var KEY = "cl-tema";
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function resolve() {
    var t = stored() || root.getAttribute("data-default-theme") || "auto";
    if (t === "claro") t = "light";
    if (t === "oscuro") t = "dark";
    if (t !== "light" && t !== "dark") t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return t;
  }
  root.setAttribute("data-theme", resolve());
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.hidden = false;
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  });
})();
