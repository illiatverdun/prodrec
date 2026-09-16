/* Calendar item · Figma 113:8701. Shared by index.html and components.html.
   markup() builds one cell for any of the 12 variants; bindAvatarHover() wires
   transitions.dev 11 (avatar group hover) for every avatar stack inside a root. */
(function () {
  "use strict";

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /* { day, key, today, disabled, selected, avatars: [src | { src, fresh }], force: "hover" }
     Annotation 113:8769: at most 4 avatars, the rest are not shown. */
  function markup(o) {
    const attrs = [
      o.key ? ` data-key="${esc(o.key)}"` : "",
      o.today ? " data-today" : "",
      o.disabled ? " data-disabled" : "",
      o.selected ? " data-selected" : "",
      o.force ? ` data-force="${esc(o.force)}"` : "",
    ].join("");
    const avatars = o.selected && o.avatars && o.avatars.length
      ? `<span class="day__avatars">${o.avatars.slice(0, 4).map((a) => `<img class="day__avatar t-avatar${a.fresh ? " is-new" : ""}" src="${esc(a.src || a)}" alt="">`).join("")}</span>`
      : "";
    return `<div class="day"${attrs}><div class="day__card"><span class="day__num">${esc(o.day)}</span>${avatars}</div></div>`;
  }

  /* transitions.dev 11 · orchestration, adapted to event delegation so re-rendered grids keep working. */
  function bindAvatarHover(root) {
    const cs = getComputedStyle(document.documentElement);
    const num = (name, fb) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    const ease = (name, fb) => cs.getPropertyValue(name).trim() || fb;

    function setShifts(group, activeIdx, phase) {
      const lift = num("--avatar-lift", -4);
      const falloff = num("--avatar-falloff", 0.45);
      const scale = num("--avatar-scale", 1.05);
      const tf = phase === "out"
        ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
        : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");

      group.querySelectorAll(".t-avatar").forEach((el, i) => {
        el.style.transitionTimingFunction = tf;
        if (activeIdx == null) {
          el.style.setProperty("--shift", "0px");
          el.style.setProperty("--scale-active", "1");
          return;
        }
        const d = Math.abs(i - activeIdx);
        el.style.setProperty("--shift", (lift * Math.pow(falloff, d)).toFixed(3) + "px");
        el.style.setProperty("--scale-active", i === activeIdx ? String(scale) : "1");
      });
    }

    root.addEventListener("pointerover", (e) => {
      const avatar = e.target.closest(".t-avatar");
      if (!avatar || avatar.closest(".day[data-disabled]")) return;
      const group = avatar.parentElement;
      setShifts(group, [...group.children].indexOf(avatar), "in");
    });
    root.addEventListener("pointerout", (e) => {
      const group = e.target.closest(".day__avatars");
      if (group && !group.contains(e.relatedTarget)) setShifts(group, null, "out");
    });
  }

  window.CalendarItem = { markup, bindAvatarHover };
})();
