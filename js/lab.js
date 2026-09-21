// The sound lab: a button per sound and sliders for the key numbers.
// Hidden behind the small "sound lab" link. Remove or hide it once the sounds are tuned.

(() => {
  const groups = [
    { name: "Volume", play: null, sliders: [
      ["master", "Master volume", 0, 0.5, 0.01] ] },
    { name: "zwoop (zoom)", play: () => Sound.zwoop(), sliders: [
      ["zwoop.f0", "Start pitch (Hz)", 100, 1500, 10],
      ["zwoop.f1", "End pitch (Hz)", 100, 2000, 10],
      ["zwoop.dur", "Length (s)", 0.1, 1, 0.01] ] },
    { name: "tin-din (attention)", play: () => Sound.tindin(), sliders: [
      ["tindin.hi", "High note (Hz)", 600, 2500, 5],
      ["tindin.lo", "Low note (Hz)", 600, 2500, 5],
      ["tindin.gap", "Gap (s)", 0.05, 0.4, 0.01],
      ["tindin.decay", "Fade-out (s)", 0.1, 1, 0.01] ] },
    { name: "pop", play: () => Sound.pop(), sliders: [
      ["pop.f", "Pitch (Hz)", 200, 1500, 10],
      ["pop.dur", "Length (s)", 0.03, 0.3, 0.01] ] },
    { name: "page turn", play: () => Sound.page(), sliders: [
      ["page.f0", "Sweep start (Hz)", 200, 3000, 50],
      ["page.f1", "Sweep end (Hz)", 500, 6000, 50],
      ["page.dur", "Length (s)", 0.1, 1, 0.01] ] }
  ];

  const body = document.getElementById("labBody");
  const out = document.getElementById("labOut");

  const getVal = path => path.split(".").reduce((o, k) => o[k], Sound.params);
  const setVal = (path, v) => {
    const keys = path.split(".");
    const last = keys.pop();
    keys.reduce((o, k) => o[k], Sound.params)[last] = v;
  };
  const refreshOut = () => { out.value = JSON.stringify(Sound.params, null, 1); };

  groups.forEach(g => {
    const fs = document.createElement("fieldset");
    const lg = document.createElement("legend");
    lg.textContent = g.name;
    fs.appendChild(lg);

    if (g.play) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nav-btn lab-play";
      b.textContent = "Play";
      b.addEventListener("click", () => { Sound.unlock(); g.play(); });
      fs.appendChild(b);
    }

    g.sliders.forEach(([path, label, min, max, step]) => {
      const row = document.createElement("label");
      const name = document.createElement("span");
      name.textContent = label;
      const input = document.createElement("input");
      input.type = "range";
      input.min = min; input.max = max; input.step = step;
      input.value = getVal(path);
      const num = document.createElement("output");
      num.textContent = input.value;
      input.addEventListener("input", () => {
        setVal(path, parseFloat(input.value));
        num.textContent = input.value;
        if (path === "master") Sound.applyVolume();
        refreshOut();
      });
      row.append(name, input, num);
      fs.appendChild(row);
    });
    body.appendChild(fs);
  });

  refreshOut();
})();
