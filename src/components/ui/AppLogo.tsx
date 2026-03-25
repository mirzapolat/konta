interface AppLogoProps {
  size?: number
  className?: string
}

export default function AppLogo({ size = 24, className }: AppLogoProps) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt="Konta"
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
