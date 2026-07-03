(function () {
  const STORAGE_KEY = 'promptGalleryLanguage';
  const SUPPORTED = ['en', 'zh'];

  const dict = {
    en: {
      'site.title': 'Prompt Library - AI Prompt Gallery',
      'language.label': 'Language',
      'hero.title': 'Unleash Your Imagination with <span class="text-gradient">AI Prompts</span>',
      'hero.subtitle': 'Discover a curated gallery of stunning AI-generated art prompts. Dive into a world of creativity, explore unique styles, and find inspiration for your next masterpiece.',
      'hero.cta': 'Explore Prompts',
      'sidebar.title': 'Prompt Library',
      'sidebar.search': 'Search',
      'sidebar.searchPlaceholder': 'Search prompts, tags, authors...',
      'sidebar.sort': 'Sort By',
      'sidebar.recent': 'Recent',
      'sidebar.popular': 'Popular',
      'sidebar.random': 'Random',
      'sidebar.categories': 'Categories',
      'sidebar.filters': 'Filters',
      'sidebar.access': 'Access',
      'sidebar.type': 'Type',
      'gallery.title': 'Discover AI Prompts',
      'gallery.backToFirst': 'Back to Page 1',
      'gallery.category': 'Category:',
      'gallery.emptyPage': 'Page {page} is empty for now.',
      'gallery.noMatches': 'No prompts match the current filters.',
      'gallery.emptyHint': 'New prompt cards will appear here when they are added.',
      'gallery.viewDetails': 'View details',
      'gallery.copyPrompt': 'Copy prompt',
      'gallery.premiumPrivate': 'Premium prompt is private',
      'pagination.loadMore': 'Load More',
      'footer.copyright': '© 2023 AI Prompts. All rights reserved.',
      'footer.explore': 'Explore',
      'footer.recent': 'Recent Prompts',
      'footer.popular': 'Popular Prompts',
      'footer.categories': 'Categories',
      'footer.featured': 'Featured Artists',
      'footer.library': 'Prompt Library',
      'footer.resources': 'Resources',
      'footer.how': 'How it Works',
      'footer.guidelines': 'Prompt Guidelines',
      'footer.api': 'API Documentation',
      'footer.blog': 'Blog',
      'footer.community': 'Community',
      'footer.discord': 'Join Discord',
      'footer.support': 'Support',
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Service',
      'detail.back': 'Back to gallery',
      'detail.prompt': 'Prompt',
      'detail.copy': 'Copy',
      'detail.private': 'Private',
      'detail.download': 'Download',
      'detail.viewOriginal': 'View Original',
      'detail.notFound': 'Prompt not found',
      'detail.privateMessage': 'Premium prompt is private. Use View Original if you have access.',
      'toast.promptNotFound': 'Prompt not found.',
      'toast.premiumPrivate': 'Premium prompt is private.',
      'toast.noPrompt': 'No prompt to copy.',
      'toast.copied': 'Copied!',
      'toast.copyFailed': 'Copy failed.',
      'toast.noImage': 'No image to download.',
      'toast.downloadStarted': 'Download started.',
      'toast.downloadFailed': 'Download failed.'
    },
    zh: {
      'site.title': '提示词库 - AI 提示词画廊',
      'language.label': '语言',
      'hero.title': '释放你的想象力<br/><span class="text-gradient">AI 提示词</span>',
      'hero.subtitle': '探索精选 AI 生成艺术提示词图库，发现独特风格，汲取灵感，开启你的下一件作品。',
      'hero.cta': '浏览提示词',
      'sidebar.title': '提示词库',
      'sidebar.search': '搜索',
      'sidebar.searchPlaceholder': '搜索提示词、标签、作者...',
      'sidebar.sort': '排序',
      'sidebar.recent': '最新',
      'sidebar.popular': '热门',
      'sidebar.random': '随机',
      'sidebar.categories': '分类',
      'sidebar.filters': '筛选',
      'sidebar.access': '权限',
      'sidebar.type': '类型',
      'gallery.title': '探索 AI 提示词',
      'gallery.backToFirst': '返回第一页',
      'gallery.category': '分类：',
      'gallery.emptyPage': '第 {page} 页暂时为空。',
      'gallery.noMatches': '没有符合当前筛选条件的提示词。',
      'gallery.emptyHint': '添加新的提示词卡片后会显示在这里。',
      'gallery.viewDetails': '查看详情',
      'gallery.copyPrompt': '复制提示词',
      'gallery.premiumPrivate': '高级提示词为私密内容',
      'pagination.loadMore': '加载更多',
      'footer.copyright': '© 2023 AI Prompts. 保留所有权利。',
      'footer.explore': '探索',
      'footer.recent': '最新提示词',
      'footer.popular': '热门提示词',
      'footer.categories': '分类',
      'footer.featured': '精选创作者',
      'footer.library': '提示词库',
      'footer.resources': '资源',
      'footer.how': '使用方式',
      'footer.guidelines': '提示词指南',
      'footer.api': 'API 文档',
      'footer.blog': '博客',
      'footer.community': '社区',
      'footer.discord': '加入 Discord',
      'footer.support': '支持',
      'footer.privacy': '隐私政策',
      'footer.terms': '服务条款',
      'detail.back': '返回图库',
      'detail.prompt': '提示词',
      'detail.copy': '复制',
      'detail.private': '私密',
      'detail.download': '下载图片',
      'detail.viewOriginal': '原始来源',
      'detail.notFound': '未找到提示词',
      'detail.privateMessage': '高级提示词为私密内容。如你有权限，请使用“查看原始来源”。',
      'toast.promptNotFound': '未找到提示词。',
      'toast.premiumPrivate': '高级提示词为私密内容。',
      'toast.noPrompt': '没有可复制的提示词。',
      'toast.copied': '已复制！',
      'toast.copyFailed': '复制失败。',
      'toast.noImage': '没有可下载的图片。',
      'toast.downloadStarted': '已开始下载。',
      'toast.downloadFailed': '下载失败。'
    }
  };

  const terms = {
    en: {
      category: { all: 'All', cityscape: 'Cityscape', portrait: 'Portrait', scene: 'Scene', concept: 'Concept', design: 'Design', product: 'Product', commercial: 'Commercial', workflow: 'Workflow', tutorial: 'Tutorial' },
      access: { free: 'Free', premium: 'Premium' },
      type: { all: 'All', image: 'Image', video: 'Video' },
      tag: { cityscape: 'cityscape', portrait: 'portrait', scene: 'scene', concept: 'concept', design: 'design', product: 'product', commercial: 'commercial', workflow: 'workflow', tutorial: 'tutorial', 'x.com': 'X.com', 'x-twitter': 'x-twitter', gemini: 'Gemini', chatgpt: 'ChatGPT', gems: 'Gems', gpts: 'GPTs', ppt: 'PPT', 'word-card': 'Word-card', recipe: 'Recipe', 'anatomical atlas': 'Anatomical Atlas', vibrant: 'vibrant', sunset: 'sunset', enchanted: 'enchanted', forest: 'forest', pathway: 'pathway', 'brand-visual': 'brand visual', cover: 'cover', 'business-card': 'business card' }
    },
    zh: {
      category: { all: '全部', cityscape: '城市景观', portrait: '人像', scene: '场景', concept: '概念', design: '设计', product: '产品', commercial: '商业', workflow: '工作流', tutorial: '教程' },
      access: { free: '免费', premium: '高级' },
      type: { all: '全部', image: '图片', video: '视频' },
      tag: { cityscape: '城市景观', portrait: '人像', scene: '场景', concept: '概念', design: '设计', product: '产品', commercial: '商业', workflow: '工作流', tutorial: '教程', 'x.com': 'X.com', 'x-twitter': 'X/Twitter', gemini: 'Gemini', chatgpt: 'ChatGPT', gems: 'Gems', gpts: 'GPTs', ppt: 'PPT', 'word-card': 'Word-card', recipe: '食谱', 'anatomical atlas': '解剖图谱', vibrant: '鲜艳', sunset: '日落', enchanted: '魔法', forest: '森林', pathway: '小径', 'brand-visual': '品牌视觉', cover: '封面', 'business-card': '名片' }
    }
  };

  const promptTitles = {
    zh: {
      'vibrant-scene-at-sunset': '日落活力城市景观',
      'enchanted-forest-pathway': '魔法森林小径'
    }
  };

  const promptTexts = {
    zh: {
      'vibrant-scene-at-sunset': '日落时分的活力城市景观，具有电影感光影。',
      'enchanted-forest-pathway': '秋日魔法森林小径，柔和的光线穿过树木。'
    }
  };

  function normalize(lang) {
    const value = (lang || '').toLowerCase();
    if (value.startsWith('zh')) return 'zh';
    return SUPPORTED.includes(value) ? value : 'en';
  }

  function detectLanguage() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('lang');
    if (fromUrl) return normalize(fromUrl);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalize(stored);
    return normalize(navigator.language || 'en');
  }

  let currentLang = detectLanguage();

  function t(key, vars) {
    let text = (dict[currentLang] && dict[currentLang][key]) || dict.en[key] || key;
    Object.entries(vars || {}).forEach(([name, value]) => {
      text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), value);
    });
    return text;
  }

  function term(group, value) {
    const key = (value || '').toString().toLowerCase();
    return (terms[currentLang] && terms[currentLang][group] && terms[currentLang][group][key]) ||
      (terms.en[group] && terms.en[group][key]) ||
      value || '';
  }

  function promptTitle(item) {
    if (!item) return '';
    return (promptTitles[currentLang] && promptTitles[currentLang][item.id]) || (currentLang === 'zh' && item.titleZh) || item.title || 'Untitled';
  }

  function promptText(item) {
    if (!item) return '';
    return (promptTexts[currentLang] && promptTexts[currentLang][item.id]) || (currentLang === 'zh' && item.promptZh) || item.prompt || '';
  }

  function setText(selector, key) {
    const el = document.querySelector(selector);
    if (el) el.textContent = t(key);
  }

  function setHtml(selector, key) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = t(key);
  }

  function setPlaceholder(selector, key) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('placeholder', t(key));
  }

  function setOption(selector, group, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = term(group, value);
  }

  function applyStatic() {
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    document.title = t('site.title');

    setHtml('header h1', 'hero.title');
    setText('header p', 'hero.subtitle');
    const heroCta = document.querySelector('header a[href="#promptGallery"]');
    if (heroCta) heroCta.innerHTML = `${t('hero.cta')} <i class="bi bi-arrow-right ml-3 -mr-1"></i>`;

    setText('#promptGallery aside h2', 'sidebar.title');
    setText('label[for="searchInput"]', 'sidebar.search');
    setPlaceholder('#searchInput', 'sidebar.searchPlaceholder');
    const sectionHeadings = document.querySelectorAll('#promptGallery aside h3');
    if (sectionHeadings[0]) sectionHeadings[0].textContent = t('sidebar.sort');
    if (sectionHeadings[1]) sectionHeadings[1].textContent = t('sidebar.categories');
    if (sectionHeadings[2]) sectionHeadings[2].textContent = t('sidebar.filters');

    document.querySelectorAll('input[name="sort"]').forEach(input => {
      const label = input.closest('label')?.querySelector('span');
      const key = input.value === 'recent' ? 'sidebar.recent' : input.value === 'popular' ? 'sidebar.popular' : 'sidebar.random';
      if (label) label.textContent = t(key);
    });

    document.querySelectorAll('input[name="category"]').forEach(input => {
      const label = input.closest('label')?.querySelector('span');
      if (label) label.textContent = term('category', input.value);
    });

    const accessLabel = Array.from(document.querySelectorAll('#promptGallery aside .text-sm')).find(el => el.textContent.trim() === 'Access' || el.textContent.trim() === '权限');
    if (accessLabel) accessLabel.textContent = t('sidebar.access');
    const typeLabel = document.querySelector('label[for="typeSelect"]');
    if (typeLabel) typeLabel.textContent = t('sidebar.type');
    const freeLabel = document.querySelector('#filterFree')?.closest('label')?.querySelector('span');
    const premiumLabel = document.querySelector('#filterPremium')?.closest('label')?.querySelector('span');
    if (freeLabel) freeLabel.textContent = term('access', 'free');
    if (premiumLabel) premiumLabel.textContent = term('access', 'premium');
    setOption('#typeSelect option[value="all"]', 'type', 'all');
    setOption('#typeSelect option[value="image"]', 'type', 'image');
    setOption('#typeSelect option[value="video"]', 'type', 'video');

    setText('#promptGallery h2.text-4xl', 'gallery.title');
    const backBtn = document.getElementById('backToFirstPageBtn');
    if (backBtn) backBtn.innerHTML = `<i class="bi bi-house-door"></i>${t('gallery.backToFirst')}`;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.innerHTML = `${t('pagination.loadMore')} <i class="bi bi-arrow-clockwise ml-2"></i>`;

    const footer = document.querySelector('footer');
    if (footer) {
      const copyright = footer.querySelector('p');
      if (copyright) copyright.textContent = t('footer.copyright');
      const headings = footer.querySelectorAll('h4');
      if (headings[0]) headings[0].textContent = t('footer.explore');
      if (headings[1]) headings[1].textContent = t('footer.resources');
      if (headings[2]) headings[2].textContent = t('footer.community');
      const links = footer.querySelectorAll('li a');
      ['footer.recent','footer.popular','footer.categories','footer.featured','footer.library','footer.how','footer.guidelines','footer.api','footer.blog','footer.discord','footer.support','footer.privacy','footer.terms'].forEach((key, index) => {
        if (links[index]) links[index].textContent = t(key);
      });
    }

    const switcherLabel = document.querySelector('#languageSwitcher [data-language-label]');
    const switcherToggle = document.getElementById('languageToggle');
    if (switcherLabel) switcherLabel.textContent = t('language.label');
    if (switcherToggle) switcherToggle.setAttribute('aria-label', t('language.label'));
    updateLanguageSwitcher();

    const detailBack = document.getElementById('backToGallery');
    if (detailBack) detailBack.textContent = `← ${t('detail.back')}`;
    const promptHeading = document.querySelector('#detailPrompt')?.closest('.bg-gray-800')?.querySelector('.text-lg');
    if (promptHeading) promptHeading.textContent = t('detail.prompt');
    const copyBtn = document.getElementById('copyPromptBtn');
    if (copyBtn && !copyBtn.dataset.privateState) copyBtn.textContent = t('detail.copy');
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.innerHTML = `<i class="bi bi-download"></i>${t('detail.download')}`;
    const viewOriginalBtn = document.getElementById('viewOriginalBtn');
    if (viewOriginalBtn) viewOriginalBtn.innerHTML = `<i class="bi bi-box-arrow-up-right"></i>${t('detail.viewOriginal')}`;
  }

  function languageMeta(lang) {
    return lang === 'zh'
      ? { label: '中文', flag: 'flag-cn' }
      : { label: 'EN', flag: 'flag-us' };
  }

  function updateLanguageSwitcher() {
    const toggle = document.getElementById('languageToggle');
    if (!toggle) return;
    const meta = languageMeta(currentLang);
    toggle.innerHTML = `<span class="flag-icon ${meta.flag}" aria-hidden="true"></span><span data-current-language>${meta.label}</span><i class="bi bi-chevron-down text-xs"></i>`;
    document.querySelectorAll('[data-language-option]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.lang === currentLang);
    });
  }

  function closeLanguageMenu() {
    const menu = document.getElementById('languageMenu');
    const toggle = document.getElementById('languageToggle');
    if (menu) menu.classList.add('hidden');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function createLanguageSwitcher() {
    if (document.getElementById('languageSwitcher')) return;
    const wrap = document.createElement('div');
    wrap.id = 'languageSwitcher';
    wrap.className = 'fixed top-4 right-4 z-[120] flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white shadow-lg backdrop-blur';
    wrap.innerHTML = `
      <span class="hidden sm:inline text-slate-300" data-language-label>${t('language.label')}</span>
      <div class="language-picker">
        <button aria-expanded="false" aria-haspopup="true" aria-label="${t('language.label')}" class="language-toggle" id="languageToggle" type="button"></button>
        <div class="language-menu hidden" id="languageMenu">
          <button class="language-option" data-language-option data-lang="en" type="button"><span class="flag-icon flag-us" aria-hidden="true"></span><span>EN</span></button>
          <button class="language-option" data-language-option data-lang="zh" type="button"><span class="flag-icon flag-cn" aria-hidden="true"></span><span>中文</span></button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const toggle = document.getElementById('languageToggle');
    const menu = document.getElementById('languageMenu');
    updateLanguageSwitcher();

    toggle.addEventListener('click', event => {
      event.stopPropagation();
      const isHidden = menu.classList.toggle('hidden');
      toggle.setAttribute('aria-expanded', String(!isHidden));
    });

    menu.querySelectorAll('[data-language-option]').forEach(btn => {
      btn.addEventListener('click', event => {
        event.stopPropagation();
        setLanguage(btn.dataset.lang);
        closeLanguageMenu();
      });
    });

    document.addEventListener('click', event => {
      if (!wrap.contains(event.target)) closeLanguageMenu();
    });
  }
  function setLanguage(lang) {
    currentLang = normalize(lang);
    localStorage.setItem(STORAGE_KEY, currentLang);
    applyStatic();
    updateLanguageSwitcher();
    window.dispatchEvent(new CustomEvent('prompt-gallery-language-change', { detail: { lang: currentLang } }));
  }

  window.PromptGalleryI18N = {
    t,
    term,
    promptTitle,
    promptText,
    applyStatic,
    setLanguage,
    getLanguage: () => currentLang
  };

  function init() {
    createLanguageSwitcher();
    applyStatic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();