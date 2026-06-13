(function () {
    'use strict';

    function ratingLabel(r) {
        if (r === 0) return 'Not Rated';
        if (r >= 98) return '10/10 🌟';
        var value = r % 10 ? (r / 10).toFixed(1) : String(r / 10);
        var emoji = r >= 90 ? '❤️' : r >= 80 ? '🙌' : r >= 70 ? '👍' : r >= 50 ? '👋' : '👎';
        return value + '/10 ' + emoji;
    }

    function bandClass(r) {
        if (r >= 98) return 'band-10';
        if (r >= 50) return 'band-' + Math.floor(r / 10);
        return r > 0 ? 'band-low' : 'band-0';
    }

    var container = document.getElementById('items');
    var items = Array.prototype.map.call(container.children, function (el) {
        return {
            el: el,
            name: (el.dataset.name || '').toUpperCase(),
            rating: parseInt(el.dataset.rating, 10) || 0,
            index: parseInt(el.dataset.index, 10) || 0
        };
    });

    /* ---------- stats ---------- */
    var rated = items.filter(function (i) { return i.rating > 0; });
    var perfect = items.filter(function (i) { return i.rating >= 98; });
    document.getElementById('stat-rated').textContent = rated.length;
    document.getElementById('stat-perfect').textContent = perfect.length;
    if (rated.length) {
        var sum = rated.reduce(function (s, i) { return s + (i.rating >= 98 ? 100 : i.rating); }, 0);
        document.getElementById('stat-average').textContent = (sum / rated.length / 10).toFixed(1);
    }

    /* ---------- histogram (scores 1–10) ---------- */
    var buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    rated.forEach(function (i) {
        var b = i.rating >= 98 ? 10 : Math.floor(i.rating / 10);
        if (b >= 1) buckets[b - 1]++;
    });
    var maxBucket = Math.max.apply(null, buckets);
    var histogram = document.getElementById('histogram');
    buckets.forEach(function (count, idx) {
        var score = idx + 1;
        var bar = document.createElement('div');
        bar.className = 'bar';
        bar.title = score + '/10 — ' + count + (count === 1 ? ' entry' : ' entries');
        var fill = document.createElement('div');
        fill.className = 'bar-fill ' + bandClass(score === 10 ? 98 : score * 10);
        var height = maxBucket ? (count / maxBucket) * 100 : 0;
        if (count > 0 && height < 6) height = 6;
        fill.style.height = height + '%';
        bar.appendChild(fill);
        histogram.appendChild(bar);
    });

    /* ---------- hall of fame (highest rating group) ---------- */
    if (rated.length) {
        var maxRating = rated.reduce(function (m, i) { return Math.max(m, i.rating); }, 0);
        var top = items
            .filter(function (i) { return i.rating === maxRating; })
            .sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
        var hofList = document.getElementById('top10');
        top.forEach(function (i) {
            var card = document.createElement('div');
            card.className = 'hof-item';
            var name = document.createElement('span');
            name.className = 'name';
            name.textContent = i.el.dataset.name;
            var tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = 'Top 10 🚀';
            card.appendChild(name);
            card.appendChild(tag);
            hofList.appendChild(card);
        });
        document.getElementById('hall-of-fame').hidden = false;
    }

    /* ---------- sorting ---------- */
    function byName(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; }
    var sorters = {
        newest: function (a, b) { return b.index - a.index; },
        oldest: function (a, b) { return a.index - b.index; },
        alpha: byName,
        grouped: function (a, b) { return (b.rating - a.rating) || byName(a, b); }
    };
    var currentMode = 'newest';

    function applySort(mode) {
        currentMode = mode;
        var sorted = items.slice().sort(sorters[mode]);
        container.querySelectorAll('.group-header').forEach(function (h) { h.remove(); });
        var frag = document.createDocumentFragment();
        if (mode === 'grouped') {
            var last = null;
            sorted.forEach(function (i) {
                if (i.rating !== last) {
                    last = i.rating;
                    var header = document.createElement('h3');
                    header.className = 'group-header';
                    header.dataset.rating = i.rating;
                    frag.appendChild(header);
                }
                frag.appendChild(i.el);
            });
        } else {
            sorted.forEach(function (i) { frag.appendChild(i.el); });
        }
        container.appendChild(frag);
        applyFilter();
    }

    document.querySelectorAll('.segmented input[name="order"]').forEach(function (radio) {
        radio.addEventListener('change', function () { applySort(radio.value); });
    });

    /* ---------- search ---------- */
    var input = document.getElementById('filter');
    var clearBtn = document.getElementById('clear-search');
    var countEl = document.getElementById('match-count');
    var debounceTimer;

    input.addEventListener('input', function () {
        clearBtn.hidden = !input.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilter, 120);
    });

    clearBtn.addEventListener('click', function () {
        input.value = '';
        clearBtn.hidden = true;
        applyFilter();
        input.focus();
    });

    function applyFilter() {
        var query = input.value.trim().toUpperCase();
        var visible = 0;
        items.forEach(function (i) {
            var show = !query || i.name.indexOf(query) > -1;
            i.el.classList.toggle('hidden', !show);
            if (show) visible++;
        });
        countEl.textContent = query ? visible + ' of ' + items.length : '';
        if (currentMode === 'grouped') updateGroupHeaders();
    }

    function updateGroupHeaders() {
        container.querySelectorAll('.group-header').forEach(function (header) {
            var count = 0;
            var el = header.nextElementSibling;
            while (el && !el.classList.contains('group-header')) {
                if (!el.classList.contains('hidden')) count++;
                el = el.nextElementSibling;
            }
            header.textContent = ratingLabel(parseInt(header.dataset.rating, 10)) + ' · ' + count;
            header.classList.toggle('hidden', count === 0);
        });
    }

    /* ---------- random pick ---------- */
    document.getElementById('random-pick').addEventListener('click', function () {
        var visible = items.filter(function (i) { return !i.el.classList.contains('hidden'); });
        if (!visible.length) return;
        var pick = visible[Math.floor(Math.random() * visible.length)].el;
        pick.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pick.classList.remove('flash');
        void pick.offsetWidth;
        pick.classList.add('flash');
    });

    /* ---------- reviews: tap to toggle on touch devices ---------- */
    container.addEventListener('click', function (e) {
        var item = e.target.closest('.item.has-review');
        if (item) item.classList.toggle('open');
    });

    /* ---------- back to top ---------- */
    var backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', function () {
        backToTop.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    applySort('newest');
})();
