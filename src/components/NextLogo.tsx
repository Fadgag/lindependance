import React from 'react'

type Props = {
  className?: string
  size?: number
}

export default function NextLogo({ className = '', size = 48 }: Props) {
  const s = size
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={s}
      height={s}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="false"
      role="img"
      className={className}
    >
      {/* subtle rounded background */}
      <rect x="0" y="0" width="48" height="48" rx="10" fill="currentColor" opacity="0.06" />
      {/* stylized N / arrow mark */}
      <path
        d="M12 36L24 12L36 36H30L24 24L18 36H12Z"
        fill="currentColor"
        className="transition-transform duration-200"
      />
      {/* small chevron to evoke 'next' motion */}
      <path d="M30 20 L34 24 L30 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

