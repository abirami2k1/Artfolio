import { Link, useParams } from 'react-router'

function EditorPage() {
  const { id } = useParams()

  return (
    <section className="p-6">
      <h1 className="font-display text-4xl">Editor</h1>
      <p className="mt-2 text-muted">Book {id}</p>
      <Link className="mt-4 inline-block text-accent underline" to={`/book/${id}`}>
        Done
      </Link>
    </section>
  )
}

export default EditorPage
