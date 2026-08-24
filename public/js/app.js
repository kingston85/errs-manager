// Shared, dependency-free UI behavior for every page that uses the app
// layout (views/layout.ejs) — no bundler, no framework, just what the
// pages that link this file actually use. Split into small, independent
// pieces below; a page missing one of the target elements just skips it.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Sortable tables ---------------------------------------------------
  // Every <th> in a .data-table becomes clickable: sorts the CURRENT page
  // of rows only (this app paginates server-side — see src/routes/generic.js
  // — so "sort" here means "sort what's already on screen," the same
  // scope a spreadsheet's column-header click has on a filtered view).
  // Type is sniffed from the column's own cell text (currency/number,
  // date, or plain text) rather than declared per-table, so this works on
  // every existing list view with zero template changes.
  function initSortableTables() {
    document.querySelectorAll('table.data-table').forEach(function (table) {
      var thead = table.querySelector('thead');
      var tbody = table.querySelector('tbody');
      if (!thead || !tbody) return;
      var headers = Array.prototype.slice.call(thead.querySelectorAll('th'));

      headers.forEach(function (th, index) {
        // The last column in every list view here is an actions cell (Edit/
        // Delete buttons, usually with no header text) — not meaningfully
        // sortable, and clicking it would just reorder by "" for every row.
        if (!th.textContent.trim()) return;
        th.classList.add('sortable');
        th.setAttribute('role', 'button');
        th.setAttribute('tabindex', '0');

        var sort = function () {
          var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
          if (rows.length < 2) return;
          var ascending = !th.classList.contains('sort-asc');

          var cellText = function (row) {
            var cell = row.children[index];
            return cell ? cell.textContent.trim() : '';
          };
          var asNumber = function (text) {
            var cleaned = text.replace(/[^0-9.\-]/g, '');
            return cleaned === '' || cleaned === '-' ? null : Number(cleaned);
          };
          var asDate = function (text) {
            var t = Date.parse(text);
            return isNaN(t) ? null : t;
          };

          // Decide the column's type from its first non-empty cell, rather
          // than every cell — a badge like "—" for a blank date shouldn't
          // knock a date column back to text sorting.
          var sample = rows.map(cellText).find(function (t) { return t && t !== '—'; }) || '';
          var type = asDate(sample) !== null && /[a-zA-Z]|\d{4}-\d{2}-\d{2}/.test(sample) ? 'date'
            : asNumber(sample) !== null && /\d/.test(sample) ? 'number'
            : 'text';

          rows.sort(function (a, b) {
            var av = cellText(a), bv = cellText(b);
            var cmp;
            if (type === 'number') {
              var an = asNumber(av), bn = asNumber(bv);
              cmp = (an === null ? -Infinity : an) - (bn === null ? -Infinity : bn);
            } else if (type === 'date') {
              var ad = asDate(av), bd = asDate(bv);
              cmp = (ad === null ? -Infinity : ad) - (bd === null ? -Infinity : bd);
            } else {
              cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' });
            }
            return ascending ? cmp : -cmp;
          });

          headers.forEach(function (h) { h.classList.remove('sort-asc', 'sort-desc'); });
          th.classList.add(ascending ? 'sort-asc' : 'sort-desc');
          rows.forEach(function (row) { tbody.appendChild(row); });
        };

        th.addEventListener('click', sort);
        th.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); }
        });
      });
    });
  }

  // ---- Clickable rows -----------------------------------------------------
  // A <tr data-href="..."> (see views/partials/*, generic/list.ejs etc.)
  // navigates like a link when clicked anywhere in the row — except a click
  // that actually landed on a real interactive element inside it (the Edit
  // button, a Delete form, a link), which keeps doing what it already did.
  function initClickableRows() {
    document.querySelectorAll('tr[data-href]').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('a, button, input, select, textarea, form, label')) return;
        window.location.href = row.getAttribute('data-href');
      });
    });
  }

  // ---- Animated progress bars ---------------------------------------------
  // The server renders the true width inline; this reads it, zeroes it,
  // forces a reflow, then restores it so the CSS transition (style.css)
  // actually has something to animate between.
  function initProgressBars() {
    if (reduceMotion) return;
    document.querySelectorAll('.progress-bar > div').forEach(function (bar) {
      var target = bar.style.width;
      if (!target) return;
      bar.style.width = '0%';
      // eslint-disable-next-line no-unused-expressions
      bar.offsetHeight; // force reflow so the transition applies to the next line, not this one
      requestAnimationFrame(function () { bar.style.width = target; });
    });
  }

  // ---- Animated stat numbers -----------------------------------------------
  // Dashboard/report stat tiles (.stat-value with a plain integer) count up
  // from 0 on load — skipped for reduced-motion, and for anything that isn't
  // a bare integer (a tile showing "12%" or similar stays as static text).
  function initStatCounters() {
    if (reduceMotion) return;
    document.querySelectorAll('.stat-value').forEach(function (el) {
      var target = parseInt(el.textContent.trim(), 10);
      if (isNaN(target) || String(target) !== el.textContent.trim()) return;
      var duration = 500;
      var start = null;
      var from = 0;
      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(from + (target - from) * eased);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      }
      requestAnimationFrame(step);
    });
  }

  // ---- Toasts ---------------------------------------------------------------
  // Auto-dismiss after a few seconds, or on the close button; see
  // src/lib/flash.js for how these get here.
  function initToasts() {
    document.querySelectorAll('.toast').forEach(function (toast) {
      var remove = function () {
        toast.classList.add('toast-leaving');
        setTimeout(function () { toast.remove(); }, 220);
      };
      var timer = setTimeout(remove, 5000);
      var closeBtn = toast.querySelector('.toast-close');
      if (closeBtn) closeBtn.addEventListener('click', function () { clearTimeout(timer); remove(); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSortableTables();
    initClickableRows();
    initProgressBars();
    initStatCounters();
    initToasts();
  });
})();
