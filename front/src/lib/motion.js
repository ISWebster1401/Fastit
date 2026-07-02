export const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09 } },
}

export const revealProps = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, amount: 0.3 },
}

export const springHover = { type: 'spring', stiffness: 300, damping: 22 }
