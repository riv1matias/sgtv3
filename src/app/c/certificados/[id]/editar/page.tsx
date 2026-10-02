import { redirect } from 'next/navigation'

export default async function Editar({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/c/certificados/${(await params).id}`)
}
