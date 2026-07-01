(function(){
  const grid = document.getElementById('promptGrid');
  const searchInput = document.getElementById('searchInput');
  const filterFree = document.getElementById('filterFree');
  const filterPremium = document.getElementById('filterPremium');
  const typeSelect = document.getElementById('typeSelect');
  const paginationControls = document.getElementById('paginationControls');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const backToFirstPageBtn = document.getElementById('backToFirstPageBtn');

  if (!grid || !Array.isArray(window.PROMPTS)) return;

  const ITEMS_PER_PAGE = 8;
  const TOTAL_PAGES = 10;
  let currentPage = 1;

  function getSelectedValue(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : 'all';
  }

  function matches(p){
    const q = (searchInput?.value || '').trim().toLowerCase();
    const allowFree = !!filterFree?.checked;
    const allowPremium = !!filterPremium?.checked;
    const type = (typeSelect?.value || 'all').toLowerCase();
    const selectedCat = getSelectedValue('category');

    if(selectedCat !== 'all' && (p.category || '').toLowerCase() !== selectedCat.toLowerCase()) return false;
    if((p.access || '').toLowerCase() === 'free' && !allowFree) return false;
    if((p.access || '').toLowerCase() === 'premium' && !allowPremium) return false;
    if(type !== 'all' && (p.type || 'image').toLowerCase() !== type) return false;

    if(!q) return true;
    const hay = [
      p.title, p.subtitle, p.author, p.creator, p.model, p.category,
      ...(p.tags || [])
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }

  function sortPrompts(list) {
    const sortBy = getSelectedValue('sort');
    if (sortBy === 'popular') {
      return list.sort((a, b) => ((b.access || '').toLowerCase() === 'premium') - ((a.access || '').toLowerCase() === 'premium'));
    }
    if (sortBy === 'random') return list.sort(() => Math.random() - 0.5);
    return list;
  }

  function render(){
    const list = sortPrompts(PROMPTS.filter(matches));
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = list.slice(start, start + ITEMS_PER_PAGE);

    grid.innerHTML = pageItems.length
      ? pageItems.map(cardHTML).join('')
      : emptyPageHTML(list.length);
    bindCopyButtons();
    updatePagination();
  }

  function cardHTML(p){
    const tagPills = (p.tags || []).slice(0, 5).map(t => (
      `<span class="text-xs px-2 py-1 rounded-full bg-gray-700/60 text-gray-200 border border-gray-600/60">${escapeHtml(t)}</span>`
    )).join('');
    const isPremium = (p.access || '').toLowerCase() === 'premium';
    const accessBadge = isPremium
      ? `<span class="text-sm font-semibold text-yellow-400">Premium</span>`
      : `<span class="text-sm font-semibold text-green-400">Free</span>`;
    const copyTitle = isPremium ? 'Premium prompt is private' : 'Copy prompt';

    const imageFitClass = p.category === 'portrait'
      ? 'object-cover object-top'
      : 'object-cover object-center';

    return `
      <div class="group block bg-gray-800/60 hover:bg-gray-800 rounded-2xl overflow-hidden border border-gray-700/70 transition relative w-full">
        <div class="relative overflow-hidden bg-gray-950/50" style="aspect-ratio: 4 / 3;">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" class="w-full h-full ${imageFitClass} transition duration-300"/>

          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6">
            <a href="detail.html?id=${encodeURIComponent(p.id)}" class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-gray-900 hover:bg-blue-500 hover:text-white transition shadow-lg" title="View details">
              <i class="bi bi-eye-fill text-xl"></i>
            </a>
            <button class="copy-btn w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-gray-900 hover:bg-green-500 hover:text-white transition shadow-lg"
                    data-id="${escapeHtml(p.id)}" title="${copyTitle}" type="button">
              <i class="bi bi-clipboard-fill text-xl"></i>
            </button>
          </div>
        </div>

        <div class="p-5">
          <div class="text-xl font-bold mb-2">${escapeHtml(p.title)}</div>
          <div class="flex flex-wrap gap-2 mb-4">${tagPills}</div>
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-300">Category: <span class="text-gray-100 font-semibold">${escapeHtml(p.category)}</span></div>
            ${accessBadge}
          </div>
        </div>
      </div>`;
  }

  function escapeHtml(s){
    return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]));
  }

  function emptyPageHTML(totalMatches) {
    const message = totalMatches
      ? `Page ${currentPage} is empty for now.`
      : 'No prompts match the current filters.';

    return `
      <div class="flex items-center justify-center rounded-2xl border border-gray-700 text-center px-6" style="grid-column: 1 / -1; min-height: 320px; border-style: dashed; background: rgba(17, 24, 39, 0.4);">
        <div>
          <div class="text-xl font-semibold text-gray-100 mb-2">${message}</div>
          <div class="text-sm text-gray-400">New prompt cards will appear here when they are added.</div>
        </div>
      </div>`;
  }

  function buttonClasses(active, disabled) {
    if (active) {
      return 'pagination-btn bg-blue-600 text-white px-5 py-2 rounded-full font-semibold transition-colors duration-200';
    }

    const base = 'pagination-btn bg-slate-800 px-5 py-2 rounded-full font-semibold transition-colors duration-200';
    return disabled
      ? `${base} text-slate-500 opacity-50 cursor-not-allowed`
      : `${base} text-slate-200 hover:bg-slate-700`;
  }

  function navButtonClasses(disabled) {
    const base = 'pagination-btn bg-slate-800 px-4 py-2 rounded-full transition-colors duration-200';
    return disabled
      ? `${base} text-slate-500 opacity-50 cursor-not-allowed`
      : `${base} text-slate-400 hover:text-blue-500`;
  }

  function getVisiblePages() {
    const pages = new Set([1, TOTAL_PAGES]);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(TOTAL_PAGES - 1, currentPage + 1);

    for (let page = start; page <= end; page += 1) {
      pages.add(page);
    }

    if (currentPage <= 3) {
      pages.add(2);
      pages.add(3);
    }

    if (currentPage >= TOTAL_PAGES - 2) {
      pages.add(TOTAL_PAGES - 2);
      pages.add(TOTAL_PAGES - 1);
    }

    return [...pages]
      .filter(page => page >= 1 && page <= TOTAL_PAGES)
      .sort((a, b) => a - b);
  }

  function pageButtonHTML(page) {
    return `<button class="${buttonClasses(currentPage === page)}" data-page="${page}" type="button">${page}</button>`;
  }

  function updatePagination() {
    if (!paginationControls) return;
    const visiblePages = getVisiblePages();
    const pageParts = [];

    visiblePages.forEach((page, index) => {
      const previousPage = visiblePages[index - 1];
      if (previousPage && page - previousPage > 1) {
        pageParts.push('<span class="text-slate-400">...</span>');
      }
      pageParts.push(pageButtonHTML(page));
    });

    paginationControls.innerHTML = `
      <button class="${navButtonClasses(currentPage === 1)}" data-page-action="prev" type="button" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="bi bi-chevron-left"></i>
      </button>
      ${pageParts.join('')}
      <button class="${navButtonClasses(currentPage === TOTAL_PAGES)}" data-page-action="next" type="button" ${currentPage === TOTAL_PAGES ? 'disabled' : ''}>
        <i class="bi bi-chevron-right"></i>
      </button>`;

    bindPaginationButtons();
    updateBackToFirstPageButton();
  }

  function updateBackToFirstPageButton() {
    if (!backToFirstPageBtn) return;
    backToFirstPageBtn.classList.toggle('hidden', currentPage === 1);
  }

  function goToPage(page) {
    const nextPage = Math.min(Math.max(Number(page) || 1, 1), TOTAL_PAGES);
    if (nextPage === currentPage) return;

    currentPage = nextPage;
    render();
    document.getElementById('promptGallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindPaginationButtons() {
    if (!paginationControls) return;

    paginationControls.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => goToPage(btn.dataset.page), { once: true });
    });

    paginationControls.querySelectorAll('[data-page-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        goToPage(btn.dataset.pageAction === 'next' ? currentPage + 1 : currentPage - 1);
      }, { once: true });
    });
  }

  function resetToFirstPage() {
    currentPage = 1;
    render();
  }

  function getCopyValue(p) {
    const prompt = (p.prompt || '').toString().trim();
    if (prompt && !prompt.includes('TODO')) return prompt;
    return (p.originalUrl || '').toString().trim();
  }

  function showToast(message) {
    let toast = document.getElementById('galleryToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'galleryToast';
      toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-black/80 text-white px-4 py-2 rounded-lg text-sm shadow-lg transition-opacity duration-200';
      toast.style.opacity = '0';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.style.opacity = '0';
    }, 1600);
  }

  async function copyText(text) {
    const value = (text || '').toString();
    if (!value.trim()) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (err) {}

    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }

  function bindCopyButtons(){
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();

        const item = PROMPTS.find(p => String(p.id) === String(btn.dataset.id));
        if (!item) {
          showToast('Prompt not found.');
          return;
        }
        if ((item.access || '').toLowerCase() === 'premium') {
          showToast('Premium prompt is private.');
          return;
        }

        const value = getCopyValue(item);
        if (!value) {
          showToast('No prompt to copy.');
          return;
        }

        const ok = await copyText(value);
        showToast(ok ? 'Copied!' : 'Copy failed.');
      }, { once: true });
    });
  }

  [searchInput, filterFree, filterPremium, typeSelect].forEach(el => {
    if(el) el.addEventListener('input', resetToFirstPage);
  });

  document.querySelectorAll('input[name="category"], input[name="sort"]').forEach(el => {
    el.addEventListener('change', resetToFirstPage);
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => goToPage(currentPage + 1));
  }

  if (backToFirstPageBtn) {
    backToFirstPageBtn.addEventListener('click', () => goToPage(1));
  }

  render();
})();
