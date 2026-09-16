const DEFAULT_PER_PAGE = 10;

/**
 * paginate - Filtre et pagine une liste d items
 * @param {Array} items - Liste complete
 * @param {number} page - Page courante (1-indexed)
 * @param {number} perPage - Items par page
 * @returns {{ paginated, total, totalPages, currentPage, start, end }}
 */
export function paginate(items, page = 1, perPage = DEFAULT_PER_PAGE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  const end = Math.min(start + perPage, total);
  const paginated = items.slice(start, end);

  return { paginated, total, totalPages, currentPage, start, end };
}

/**
 * renderPagination - Genere le HTML de la barre de pagination
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {number} total - nombre total d items
 * @param {number} start
 * @param {number} end
 * @param {string} eventAttr - attribut data- pour identifier le module
 * @returns {string} HTML
 */
export function renderPagination(currentPage, totalPages, total, start, end, eventAttr = 'page') {
  if (totalPages <= 1) {
    return `<div style="font-size:0.8rem;color:#8C8580;padding:0.5rem 0;">
      ${total} element${total > 1 ? 's' : ''} au total
    </div>`;
  }

  const pages = [];
  const delta = 2;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    }
  }

  // Deduplication + ellipsis
  const pagesWithGaps = [];
  let prev = 0;
  for (const p of pages) {
    if (prev && p - prev > 1) pagesWithGaps.push('...');
    pagesWithGaps.push(p);
    prev = p;
  }

  const btnBase = `style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 0.4rem;border-radius:8px;border:1px solid #EAE4DC;background:#fff;font-size:0.82rem;cursor:pointer;font-weight:600;"`;
  const btnActive = `style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 0.4rem;border-radius:8px;border:1px solid #E8B4B8;background:#E8B4B8;font-size:0.82rem;cursor:pointer;font-weight:700;"`;

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;flex-wrap:wrap;gap:0.5rem;">
      <span style="font-size:0.8rem;color:#8C8580;">
        Affichage <strong>${start + 1}-${end}</strong> sur <strong>${total}</strong> element${total > 1 ? 's' : ''}
      </span>
      <div style="display:flex;gap:0.3rem;align-items:center;">
        <button ${currentPage > 1 ? `${btnBase} data-${eventAttr}="${currentPage - 1}"` : `style="display:inline-flex;align-items:center;min-width:32px;height:32px;padding:0 0.4rem;border-radius:8px;border:1px solid #EAE4DC;background:#FAF8F5;font-size:0.82rem;color:#ccc;cursor:not-allowed;" disabled`}>
          ← Prec.
        </button>
        ${pagesWithGaps.map(p => p === '...'
          ? `<span style="padding:0 0.2rem;color:#8C8580;">…</span>`
          : `<button ${p === currentPage ? btnActive : `${btnBase} data-${eventAttr}="${p}"`}>${p}</button>`
        ).join('')}
        <button ${currentPage < totalPages ? `${btnBase} data-${eventAttr}="${currentPage + 1}"` : `style="display:inline-flex;align-items:center;min-width:32px;height:32px;padding:0 0.4rem;border-radius:8px;border:1px solid #EAE4DC;background:#FAF8F5;font-size:0.82rem;color:#ccc;cursor:not-allowed;" disabled`}>
          Suiv. →
        </button>
      </div>
    </div>
  `;
}
