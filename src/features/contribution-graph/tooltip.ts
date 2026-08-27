export function setupContributionGraphTooltips(): void {
  let tooltip = document.getElementById('contribution-graph-tooltip')

  if (!tooltip) {
    tooltip = document.createElement('div')
    tooltip.id = 'contribution-graph-tooltip'
    tooltip.setAttribute('role', 'tooltip')
    tooltip.hidden = true
    document.body.append(tooltip)
  }

  const positionTooltip = (cell: Element) => {
    const text = cell.getAttribute('data-tooltip')
    if (!text) return

    tooltip.textContent = text
    tooltip.hidden = false

    const rect = cell.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    const offset = 8

    let top = rect.top - tooltipRect.height - offset
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2

    left = Math.max(
      offset,
      Math.min(left, window.innerWidth - tooltipRect.width - offset)
    )

    if (top < offset) {
      top = rect.bottom + offset
    }

    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`
  }

  const hideTooltip = () => {
    tooltip.hidden = true
  }

  document
    .querySelectorAll('.contribution-graph__cell[data-date]')
    .forEach(cell => {
      cell.addEventListener('mouseenter', () => positionTooltip(cell))
      cell.addEventListener('focus', () => positionTooltip(cell))
      cell.addEventListener('mouseleave', hideTooltip)
      cell.addEventListener('blur', hideTooltip)
    })
}
