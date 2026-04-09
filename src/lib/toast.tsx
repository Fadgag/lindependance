
"use client"

// No React runtime imports required — this util manipulates DOM directly for simple toasts

export function showToast(message: string) {
  // Try to use a simple DOM-based toast to avoid adding a dependency.
  try {
    let container = document.getElementById('app-toast-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'app-toast-container'
      container.style.position = 'fixed'
      container.style.right = '20px'
      container.style.top = '20px'
      container.style.zIndex = '999999'
      document.body.appendChild(container)
    }

    const el = document.createElement('div')
    el.style.background = '#F3F1ED'
    el.style.border = '1px solid rgba(0,0,0,0.06)'
    el.style.padding = '10px 14px'
    el.style.borderRadius = '12px'
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'
    el.style.marginTop = '8px'
    el.style.fontFamily = 'inherit'
    el.style.color = '#2b2b2b'
    el.textContent = message

    container.appendChild(el)
    setTimeout(() => {
      el.style.transition = 'opacity 400ms, transform 400ms'
      el.style.opacity = '0'
      el.style.transform = 'translateY(-6px)'
      setTimeout(() => el.remove(), 450)
    }, 3200)
  } catch (err) {
    // fail silently - don't leak errors to console in production
  }
}

