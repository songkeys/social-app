import {AppBskyGraphDefs} from '@atproto/api'
import {
  useQuery,
  QueryClient,
  QueryFunctionContext,
} from '@tanstack/react-query'

import {accumulate} from '#/lib/async/accumulate'
import {useSession, getAgent} from '#/state/session'
import {STALE} from '#/state/queries'

export type MyListsFilter = 'all' | 'curate' | 'mod'
export const RQKEY = (
  filter: MyListsFilter,
  sessionDid: string | undefined,
) => ['my-lists', filter, sessionDid]

export function useMyListsQuery(filter: MyListsFilter) {
  const {currentAccount} = useSession()
  return useQuery<AppBskyGraphDefs.ListView[]>({
    staleTime: STALE.MINUTES.ONE,
    queryKey: RQKEY(filter, currentAccount?.did),
    queryFn,
    enabled: !!currentAccount,
  })
}

async function queryFn({queryKey}: QueryFunctionContext) {
  const [_, filter, sessionDid] = queryKey as ReturnType<typeof RQKEY>
  let lists: AppBskyGraphDefs.ListView[] = []
  const promises = [
    accumulate(cursor =>
      getAgent()
        .app.bsky.graph.getLists({
          actor: sessionDid!,
          cursor,
          limit: 50,
        })
        .then(res => ({
          cursor: res.data.cursor,
          items: res.data.lists,
        })),
    ),
  ]
  if (filter === 'all' || filter === 'mod') {
    promises.push(
      accumulate(cursor =>
        getAgent()
          .app.bsky.graph.getListMutes({
            cursor,
            limit: 50,
          })
          .then(res => ({
            cursor: res.data.cursor,
            items: res.data.lists,
          })),
      ),
    )
    promises.push(
      accumulate(cursor =>
        getAgent()
          .app.bsky.graph.getListBlocks({
            cursor,
            limit: 50,
          })
          .then(res => ({
            cursor: res.data.cursor,
            items: res.data.lists,
          })),
      ),
    )
  }
  const resultset = await Promise.all(promises)
  for (const res of resultset) {
    for (let list of res) {
      if (
        filter === 'curate' &&
        list.purpose !== 'app.bsky.graph.defs#curatelist'
      ) {
        continue
      }
      if (filter === 'mod' && list.purpose !== 'app.bsky.graph.defs#modlist') {
        continue
      }
      if (!lists.find(l => l.uri === list.uri)) {
        lists.push(list)
      }
    }
  }
  return lists
}

export function invalidate(qc: QueryClient, filter?: MyListsFilter) {
  if (filter) {
    qc.invalidateQueries({queryKey: ['my-lists', filter]})
  } else {
    qc.invalidateQueries({queryKey: ['my-lists']})
  }
}
