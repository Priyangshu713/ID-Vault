import { FilePlus2 } from 'lucide-react'

type EmptyStateProps = { onAdd: () => void }

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-labelledby="empty-title">
      <span className="empty-state__icon"><FilePlus2 size={27} /></span>
      <h1 id="empty-title">Your vault is empty</h1>
      <p>Add your first document and keep everything important in one place.</p>
      <button className="primary-button" onClick={onAdd}>Add document</button>
    </section>
  )
}
