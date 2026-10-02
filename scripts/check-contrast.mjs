import { readFile, writeFile } from 'node:fs/promises'

const css = await readFile('src/app/styles.css', 'utf8')
const colors = new Map([...css.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(match => [match[1], match[2]]))
const button = await readFile('src/shared/components/ui/button.tsx', 'utf8')
const opacity = Number(button.match(/focus-visible:ring-ring\/(\d+)/)[1]) / 100
const rgb = hex => [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255)
const luminance = channels => channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
const ratio = (foreground, background) => { const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05) }
const pairs = [['foreground', 'background'], ['card-foreground', 'card'], ['primary-foreground', 'primary'], ['secondary-foreground', 'secondary'], ['muted-foreground', 'background'], ['muted-foreground', 'muted'], ['accent-foreground', 'accent'], ['destructive', 'background']]
const checks = pairs.map(([foreground, background]) => ({ foreground, background, ratio: ratio(rgb(colors.get(foreground)), rgb(colors.get(background))), minimum: 4.5 }))
for (const background of ['background', 'card', 'secondary']) {
  const bg = rgb(colors.get(background)), ring = rgb(colors.get('ring'))
  checks.push({ foreground: `ring at ${opacity * 100}% opacity`, background, ratio: ratio(ring.map((value, index) => value * opacity + bg[index] * (1 - opacity)), bg), minimum: 3 })
}
await writeFile('docs/evidence/contrast.json', JSON.stringify({ capturedAt: new Date().toISOString(), scope: 'Configured opaque text color pairs and button focus rings. Does not inspect every rendered element, gradients, photographs, hover or disabled states.', checks }, null, 2))
console.log(checks.map(check => `${check.foreground} / ${check.background}: ${check.ratio.toFixed(2)}`).join('\n'))
if (checks.some(check => check.ratio < check.minimum)) throw new Error('Configured contrast threshold failed')
