import type { EventMountArg } from '@fullcalendar/core'
import tippy from 'tippy.js'

/** Construit et attache une bulle tippy sur un événement de calendrier */
export function buildCalendarTooltip(info: EventMountArg): void {
  const isUnavail = info.event.extendedProps?.type === 'unavailability'

  if (isUnavail) {
    const container = document.createElement('div')
    const label = document.createElement('p')
    label.style.fontWeight = '700'
    label.style.fontSize = '13px'
    label.textContent = `🚫 ${String(info.event.title ?? '')}`
    container.appendChild(label)
    const sub = document.createElement('p')
    sub.style.fontSize = '11px'
    sub.style.color = '#64748b'
    sub.style.marginTop = '4px'
    sub.textContent = 'Créneau indisponible — cliquez pour supprimer'
    container.appendChild(sub)
    tippy(info.el, { content: container, allowHTML: false, theme: 'studio-light', placement: 'top', animation: 'shift-away', interactive: true })
    return
  }

  const props = info.event.extendedProps as Record<string, unknown> | undefined
  const container = document.createElement('div')
  container.style.color = '#2D2424'

  const title = document.createElement('p')
  title.style.color = '#D4A3A1'
  title.style.fontWeight = '800'
  title.style.fontSize = '10px'
  title.style.textTransform = 'uppercase'
  title.style.margin = '0 0 4px 0'
  title.textContent = 'Détails du RDV'
  container.appendChild(title)

  const main = document.createElement('p')
  main.style.fontWeight = '700'
  main.style.fontSize = '14px'
  main.style.margin = '0'
  main.textContent = String(info.event.title ?? '')
  container.appendChild(main)

  const block = document.createElement('div')
  block.style.marginTop = '8px'
  block.style.display = 'flex'
  block.style.flexDirection = 'column'
  block.style.gap = '2px'

  const timeP = document.createElement('p')
  timeP.style.fontSize = '11px'
  timeP.style.margin = '0'
  timeP.textContent = `⏰ ${info.timeText}`
  block.appendChild(timeP)

  if (props?.customerName) {
    const c = document.createElement('p')
    c.style.fontSize = '11px'
    c.style.margin = '0'
    c.textContent = `👤 ${String(props.customerName)}`
    block.appendChild(c)
  }
  if (props?.serviceName) {
    const s = document.createElement('p')
    s.style.fontSize = '11px'
    s.style.color = '#D4A3A1'
    s.style.fontStyle = 'italic'
    s.style.marginTop = '4px'
    s.textContent = `✨ ${String(props.serviceName)}`
    block.appendChild(s)
  }
  if (props?.price) {
    const p = document.createElement('p')
    p.style.fontSize = '11px'
    p.style.fontWeight = 'bold'
    p.style.marginTop = '2px'
    p.textContent = `💰 ${String(props.price)}`
    block.appendChild(p)
  }
  if (props?.soldProducts) {
    const sp = document.createElement('p')
    sp.style.fontSize = '11px'
    sp.style.marginTop = '6px'
    sp.style.fontWeight = '700'
    sp.textContent = '🛒 Ventes enregistrées'
    block.appendChild(sp)
  }
  container.appendChild(block)
  tippy(info.el, { content: container, allowHTML: false, theme: 'studio-light', placement: 'top', animation: 'shift-away', interactive: true })
}

