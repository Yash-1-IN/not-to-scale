// Kelvin: a thermometer with two scales, and a marker that slides down to absolute zero.

(() => {
  const K = Kit, C = K.C;
  const yOf = T => 420 - 0.9 * T;                 // kelvin -> canvas y
  const hg = T => ({ attr: { y: +yOf(T).toFixed(2), height: +(440 - yOf(T)).toFixed(2) } });
  const spd = T => ({ attr: { width: +(11 * Math.sqrt(T)).toFixed(1) } });
  const left = 'style="text-anchor:end"', right = 'style="text-anchor:start"';
  const tick = (T, kText, cText, what) => `
    ${K.l(456, yOf(T), 470, yOf(T), "var(--ink)", 2.5, 'class="fade"')}${K.l(498, yOf(T), 512, yOf(T), "var(--ink)", 2.5, 'class="fade"')}
    ${K.t(448, yOf(T) + 5, kText, "graph-label fade", left)}${K.t(520, yOf(T) + 5, cText, "graph-label fade", right)}
    ${K.t(640, yOf(T) + 5, what, "atom-sub fade", right)}`;

  const svg = `
    ${K.t(380, 42, "kelvin (K)", "atom-name fade", 'style="font-size:20px"')}${K.t(590, 42, "Celsius (°C)", "atom-name fade", 'style="font-size:20px"')}
    <rect class="fade" x="470" y="60" width="28" height="366" rx="14" fill="#FFFDF8" stroke="var(--ink)" stroke-width="3"/>
    <rect id="mercury" class="fade" x="477" y="${yOf(298.15)}" width="14" height="${440 - yOf(298.15)}" fill="${C.heat}"/>
    <circle class="fade" cx="484" cy="448" r="24" fill="${C.heat}" stroke="var(--ink)" stroke-width="3"/>
    ${tick(0, "0 K", "−273.15 °C", "absolute zero")}${tick(273.15, "273.15 K", "0 °C", "water freezes")}${tick(373.15, "373.15 K", "100 °C", "water boils")}
    ${K.t(830, 205, "298.15 K", "atom-name fade", 'id="rK"')}${K.t(830, 245, "25 °C", "atom-name fade", 'id="rC"')}
    ${K.t(810, 322, "average particle speed", "graph-label fade")}
    <rect class="fade" x="700" y="336" width="220" height="16" rx="8" fill="${C.pale}"/>
    <rect id="spd" class="fade" x="700" y="336" width="${11 * Math.sqrt(298.15)}" height="16" rx="8" fill="${C.heat}"/>`;

  K.page({
    id: "kelvin",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Kelvin: a temperature scale that starts at zero",
    description: "A tall thermometer with kelvin marked down the left and degrees Celsius down the right. It starts at room temperature, 298.15 K or 25 °C. Tapping moves the red column to where water freezes (273.15 K, 0 °C), where water boils (373.15 K, 100 °C), and finally to absolute zero (0 K, −273.15 °C), where an average particle speed bar on the right shrinks to nothing.",
    svg, bounds: [360, 30, 940, 476], tapLabel: "Tap to move the thermometer",
    steps: [
      { caption: "Room temperature is about 25 °C, which is 298.15 K. Kelvin is Celsius shifted up by 273.15: T (K) = T (°C) + 273.15.",
        booklet: "§4 unit conversions: temperature (K) = temperature (°C) + 273.15." },
      { caption: "Water freezes at 0 °C = 273.15 K. A step of 1 K is exactly the same size as a step of 1 °C. Only the zero point is different.",
        to: { "#mercury": hg(273.15), "#spd": spd(273.15) }, text: { "#rK": "273.15 K", "#rC": "0 °C" } },
      { caption: "Water boils at 100 °C = 373.15 K (at standard pressure).",
        to: { "#mercury": hg(373.15), "#spd": spd(373.15) }, text: { "#rK": "373.15 K", "#rC": "100 °C" } },
      { caption: "Absolute zero: 0 K = −273.15 °C, where the particles have the least energy they possibly can. Nothing can be colder, so kelvin never goes negative.",
        footnote: "Temperature in kelvin is proportional to the particles' average kinetic energy — which is why the speed bar shrinks to nothing, and why gas-law sums always use kelvin.",
        to: { "#mercury": hg(0), "#spd": spd(0) }, text: { "#rK": "0 K", "#rC": "−273.15 °C" }, dur: 1.4 }
    ]
  });
})();
