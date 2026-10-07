import { Link } from 'react-router'

function ShelfPage() {
  return (
    <section>
      <h1 className="font-display text-4xl">Shelf</h1>
      <p className="mt-2 text-muted">Your books will live here.</p>
      <Link className="mt-4 inline-block text-accent underline" to="/book/sample">
        Open sample book
      </Link>
    </section>
  )
}

export default ShelfPage
