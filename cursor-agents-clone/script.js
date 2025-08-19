;(function () {
  const root = document.documentElement
  const toggle = document.getElementById('themeToggle')
  const menuBtn = document.getElementById('mobileMenuBtn')
  const mobileMenu = document.getElementById('mobileMenu')

  function setTheme(dark) {
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    toggle.innerHTML = dark ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>'
  }

  const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const saved = localStorage.getItem('theme')
  setTheme(saved ? saved === 'dark' : preferredDark)

  toggle?.addEventListener('click', () => {
    setTheme(!root.classList.contains('dark'))
  })

  menuBtn?.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.contains('hidden')
    mobileMenu.classList.toggle('hidden', !isHidden)
  })
})()

