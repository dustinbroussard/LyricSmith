import { useTheme } from '@/theme/ThemeProvider'

type Props = { icon?: boolean; className?: string }

export default function BrandMark({ icon=false, className=''}: Props) {
  const { mode } = useTheme()
  const color = mode === 'dark' ? '#fef9c3' : mode === 'light' ? '#2b2b2b' : undefined
  const src = icon ? '/assets/logo-mardi-icon.svg' : '/assets/logo-mardi-full.svg'
  return <img src={src} alt="LyricSmith" className={className} style={color ? { color } : undefined} />
}
