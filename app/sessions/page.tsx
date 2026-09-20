import { redirect } from 'next/navigation'

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const tab = typeof params.tab === 'string' ? params.tab : 'past'
  redirect(`/?tab=${tab}`)
}
