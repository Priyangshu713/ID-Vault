import type { AuthUser } from '../data/authTypes'

type GreetingProps = {
  user?: AuthUser | null
}

const getTimeGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function Greeting({ user }: GreetingProps) {
  const greeting = getTimeGreeting()
  const displayName = user?.givenName || (user?.name ? user.name.split(' ')[0] : 'there')

  return (
    <section className="greeting" data-entrance="greeting" aria-labelledby="greeting-title">
      <p className="eyebrow">{greeting}</p>
      <h1 id="greeting-title" className="greeting__name">{displayName}</h1>
      <p className="greeting__copy">Your personal identity documents, protected in your private vault.</p>
    </section>
  )
}
