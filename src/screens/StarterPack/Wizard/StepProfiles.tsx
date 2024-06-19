import React, {useState} from 'react'
import {ListRenderItemInfo, View} from 'react-native'
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller'
import {AppBskyActorDefs, ModerationOpts} from '@atproto/api'

import {isNative} from 'platform/detection'
import {useActorAutocompleteQuery} from 'state/queries/actor-autocomplete'
import {useActorSearchPaginated} from 'state/queries/actor-search'
import {SearchInput} from 'view/com/util/forms/SearchInput'
import {List} from 'view/com/util/List'
import {useWizardState} from '#/screens/StarterPack/Wizard/State'
import {atoms as a, useTheme} from '#/alf'
import {Loader} from '#/components/Loader'
import {ScreenTransition} from '#/components/StarterPack/Wizard/ScreenTransition'
import {WizardProfileCard} from '#/components/StarterPack/Wizard/WizardListCard'

function keyExtractor(item: AppBskyActorDefs.ProfileViewBasic) {
  return item?.did ?? ''
}

export function StepProfiles({
  moderationOpts,
}: {
  moderationOpts: ModerationOpts
}) {
  const t = useTheme()
  const [state, dispatch] = useWizardState()
  const [query, setQuery] = useState('')

  const {data: topPages, fetchNextPage} = useActorSearchPaginated({
    query: encodeURIComponent('*'),
  })
  const topFollowers = topPages?.pages.flatMap(p => p.actors)

  const {data: results} = useActorAutocompleteQuery(query, true, 12)

  const renderItem = ({
    item,
  }: ListRenderItemInfo<AppBskyActorDefs.ProfileViewBasic>) => {
    return (
      <WizardProfileCard
        profile={item}
        state={state}
        dispatch={dispatch}
        moderationOpts={moderationOpts}
      />
    )
  }

  return (
    <ScreenTransition style={[a.flex_1]} direction={state.transitionDirection}>
      <View style={[a.border_b, t.atoms.border_contrast_medium]}>
        <View style={[a.my_sm, a.px_md, {height: 40}]}>
          <SearchInput
            query={query}
            onChangeQuery={setQuery}
            onPressCancelSearch={() => setQuery('')}
            onSubmitQuery={() => {}}
          />
        </View>
      </View>
      <List
        data={query ? results : topFollowers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{paddingTop: 6}}
        renderScrollComponent={props => <KeyboardAwareScrollView {...props} />}
        keyboardShouldPersistTaps="handled"
        containWeb={true}
        sideBorders={false}
        style={[a.flex_1]}
        onEndReached={() => {
          console.log('test')
          fetchNextPage()
        }}
        onEndReachedThreshold={isNative ? 2 : 0.25}
        ListEmptyComponent={
          <View style={[a.flex_1, a.align_center, a.mt_lg]}>
            <Loader size="lg" />
          </View>
        }
      />
    </ScreenTransition>
  )
}