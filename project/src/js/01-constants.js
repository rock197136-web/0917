/* =========================================================
   CONSTANTS
========================================================= */
const FINISH = {
  SPIN:   { label:'轉停勝利', en:'SPIN FINISH',   points:1, color:'var(--fin-spin)',   icon:'●', cls:'spin'   },
  OVER:   { label:'擊飛勝利', en:'OVER FINISH',   points:2, color:'var(--fin-over)',   icon:'▲', cls:'over'   },
  BURST:  { label:'爆裂勝利', en:'BURST FINISH',  points:2, color:'var(--fin-burst)',  icon:'✦', cls:'burst'  },
  XTREME: { label:'極限勝利', en:'X-TREME FINISH',points:3, color:'var(--fin-xtreme)', icon:'◆', cls:'xtreme' }
};
const TROPHY_ICONS = {
  1: `<img src="data:image/png;base64,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" alt="" draggable="false">`,
  2: `<img src="data:image/png;base64,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" alt="" draggable="false">`,
  3: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAFkElEQVR4nO2XXWwUVRTHf3d26fZrd2X7ZWmhtOWjUAFFwGAUXfErmBiVgDGSoEKM0RA1+kyMiT4ZEmJMiEZNTNQHvyIPPkjC4idVaaIClqZNodhSuuza7ra7292ZuceH6ZZtbVd2UROT/l9m7tw59/znf8659wzMYx7zmMc85nE1UMUaiogU5Eipony5izESEWmt8U2N9Yx5Y5ZnIiLFkPxbg9mU2nZDE0nTZiA8xorFAVAuUEbOqgpEg7ZAT5obBl909v2VwN+QzqugiEigojSYHfvLS0LB1deytb0elItXP+sM3re+OYTHi7g90/hhpiE9htgmpmWRSFvs3rKCb7ouMprMBHN95CM554SIyLZNbdywbBE6OQoiHOu6yJ3t9VhaiIxnOHUhTnB9G2QSiJXOVQURQbTGtDUKMJTCUPDVmWFuX1WHMlxQ6uPnvot88UPXnErOqqCISHONj+uXN7D77o3EB3tAbE4OjPD+t728+9St1AX8tD3/AT0fvgzxIUiNXv5epbBtG22ZxCcsAMKxFM+918F1TVVs39iEMlx461t58dBhWmp8cyqZP8TmBFa4h0dfP0rG1hx64mZeOXwS5XLjKvc75BBEuVAuDygQcQgaykJpG3DSUAu0XOvnma0r2XEwRENVJW8+oaYpPxuMfJNKKdzuEgCOftfB2icPQEkZ2DZWcozlj+wHlJNzyCQ7nKs49k54J/OyzM/aJw/wwaeHHXUWLEApg3xlcgXbjFAXqKB20WLKyitY4CklY2syZmZqfnqdC+DkIAgCaC1ogRKPh7rmNlwV17DA7bpskWdHnZOgiGBrIZZI8dbeW9i2ZROhE6c50vErWzetYUNjOWVv7EEFlqC8NVDqhdiFKXuNYFs2WuDjn/r55ZLNkeO/gAg7793CocdvZnQsiWXbeeWZNcRKKXUuMkbKFN7+qpfkRIYH1tWyb8+jxEb+cJSxLSSTgvEImBOTyjlSaNvEymRIpC1nP5xENBJm395d7LyxgbFUmne+7iWtFX2X4nNWcd5NUkRkYYUn+OCGpSFveQlti/x0SyOHvwwFq0sVG5urQs9uWwueSpRhIKkYoEhOpDEtG8vWfNhxjo7ecDCaVtx/122hlWqQzr4Ipi183nkuOJJIh4raB3NJZu9vb2/k+XtXcfDLbs5dHAWgqc7P9g1L2NBSPamWk38/nY3yyYnzDITjADQvCvD0Hct4/cgZQqcGLhO4mpMkdwERkf7hGMd7Iwxecpy6DEX/cIzve8PEUiar6r0AdA3FOT04yvlwHJdSaBHGU2l+7PuD/uH4FRG7YoK5RLNNQlbSnuEYLTU+fo8mcSmDxQvLMG3Nb4MxzkeTKKA3HKO11kd4JMFHx3vz5ttVEcwlOXO8f8dNlBjCibOR4GO3rQxFExnqA5W81jU4q00hPq8aIiIt1V65e/1y6X7/Jek+8LDs3LxMmqu9UmjPOBuK6gdnoq2pluUNC1F2GtPW1PhKaVtS/U8snf+omwuSg6XVXu5pr+WpW5cgkT5i40l2bV7KXavrWFrtnXr3PyMoIuIv9wT95Z5gS42P/dvXY+HmgYPHgieHkgwkXfw+kiZQ4eGF+9bQWuPDX+4JFkuy4ITNquY2DOqrvdj2zOZ+OqKxJJbWWLamPzpecJEUlYPNtdewqbWe+29sZWgkgcvl+Mx6zjasthYiYyk6zw7TPTRSjKviCGoBS2sSaRNbNO3r1uA2k9PeMVPjnOoJEx2fYMK0KTYNCyIoIlJVWRrc/9DmUEPACTPA8IUwhjanf4SVQRBK3AarG6tYXOWlqrI0WOjfXUH5ICLSuLDCaUSzljLZx0wqlA1vlkOucgIMjiT+vZMk60TrXKczQpfTVWdvs3SGRpMFF0lRVVyozZSz//qYm8f/AX8CAfK8OZcwW6UAAAAASUVORK5CYII=" alt="" draggable="false">`
};
const STORAGE_KEY = 'beyblade-x-tournament-v1';

/* =========================================================
   BRACKET COLOR THEME (顏色主題) — purely a local display
   preference (not synced between devices, like zoom level),
   lets each viewer pick their favorite highlight color for
   the winner slots in the knockout bracket tree.
========================================================= */
const BRACKET_THEMES = {
  cyan:      { label:'霓虹青', hex:'#00e5ff', rgb:'0,229,255',   oppositeRgb:'255,82,45'  },
  violet:    { label:'紫羅蘭', hex:'#a855f7', rgb:'168,85,247', oppositeRgb:'139,255,47' },
  amber:     { label:'琥珀橙', hex:'#ffa726', rgb:'255,167,38', oppositeRgb:'22,119,255' },
  rose:      { label:'玫瑰粉', hex:'#ec4899', rgb:'236,72,153', oppositeRgb:'45,230,157'},
  clawgreen: { label:'魔爪綠', hex:'#7cff00', rgb:'124,255,0',  oppositeRgb:'196,60,255' }
};
const BRACKET_THEME_KEY = 'beyblade-x-bracket-theme';
const BRACKET_THEME_DEFAULT = 'amber';

function populateThemeSelect(){
  const list = document.getElementById('bracketThemeList');
  if(!list) return;
  list.innerHTML = Object.entries(BRACKET_THEMES).map(([key, t]) => `
    <li class="theme-dropdown-option" role="option" data-key="${key}" onclick="selectBracketTheme('${key}')">
      <span class="theme-dropdown-dot" style="background:${t.hex};"></span>
      <span style="color:${t.hex};">${t.label}</span>
      <span class="theme-dropdown-check">${icon('check',12)}</span>
    </li>
  `).join('');
}

function toggleThemeDropdown(forceOpen){
  const btn = document.getElementById('bracketThemeBtn');
  const list = document.getElementById('bracketThemeList');
  if(!btn || !list) return;
  const willOpen = forceOpen !== undefined ? forceOpen : list.classList.contains('hidden');
  list.classList.toggle('hidden', !willOpen);
  btn.setAttribute('aria-expanded', String(willOpen));
}

function closeThemeDropdownOnOutsideClick(e){
  const wrap = document.getElementById('bracketThemeDropdown');
  if(wrap && !wrap.contains(e.target)) toggleThemeDropdown(false);
}
document.addEventListener('click', closeThemeDropdownOnOutsideClick);
document.addEventListener('click', (e) => {
  const more = document.getElementById('bracketMoreMenu');
  if(more && more.open && !more.contains(e.target)) more.removeAttribute('open');
});

function selectBracketTheme(key){
  applyBracketTheme(key, true);
  toggleThemeDropdown(false);
  const more = document.getElementById('bracketMoreMenu');
  if(more) more.removeAttribute('open');
}

function applyBracketTheme(key, persist){
  const finalKey = BRACKET_THEMES[key] ? key : BRACKET_THEME_DEFAULT;
  const t = BRACKET_THEMES[finalKey];
  document.documentElement.style.setProperty('--theme-rgb', t.rgb);
  document.documentElement.style.setProperty('--theme-opposite-rgb', t.oppositeRgb);

  const dot = document.getElementById('bracketThemeBtnDot');
  const label = document.getElementById('bracketThemeBtnLabel');
  if(dot) dot.style.background = t.hex;
  if(label){ label.textContent = t.label; label.style.color = t.hex; }

  const list = document.getElementById('bracketThemeList');
  if(list){
    list.querySelectorAll('.theme-dropdown-option').forEach(li =>
      li.classList.toggle('selected', li.dataset.key === finalKey)
    );
  }

  if(persist){
    try{ localStorage.setItem(BRACKET_THEME_KEY, finalKey); }catch(e){}
  }
}

function setBracketTheme(key){
  applyBracketTheme(key, true);
}

function initBracketTheme(){
  populateThemeSelect();
  let saved = BRACKET_THEME_DEFAULT;
  try{ saved = localStorage.getItem(BRACKET_THEME_KEY) || BRACKET_THEME_DEFAULT; }catch(e){}
  applyBracketTheme(saved, false);
}

