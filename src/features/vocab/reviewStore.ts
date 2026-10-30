import { defineStore } from 'pinia'
import { ref } from 'vue'

type ReviewSelection = { ids: string[]; bookName: string }
const storageKey = (userId: string) => `review_selection.${userId}`

export const useReviewStore = defineStore('review', () => {
  // Remove selections written by the old account-agnostic store.
  try {
    localStorage.removeItem('review_ids')
    localStorage.removeItem('review_book_name')
  } catch { /* Storage may be unavailable; in-memory practice still works. */ }
  const reviewIds = ref<string[]>([])
  const bookName = ref('')
  let activeUserId = ''

  function restoreReviewData(userId?: string | number) {
    activeUserId = userId == null ? '' : String(userId)
    reviewIds.value = []
    bookName.value = ''
    if (!activeUserId) return
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey(activeUserId)) || 'null') as ReviewSelection | null
      if (stored && Array.isArray(stored.ids) && stored.ids.every(id => typeof id === 'string') && typeof stored.bookName === 'string') {
        reviewIds.value = stored.ids
        bookName.value = stored.bookName
      }
    } catch { /* Storage may be unavailable or contain an old selection. */ }
  }

  function setReviewData(ids: string[], name: string, userId?: string | number) {
    restoreReviewData(userId)
    reviewIds.value = ids
    bookName.value = name
    if (activeUserId) {
      try { sessionStorage.setItem(storageKey(activeUserId), JSON.stringify({ ids, bookName: name })) }
      catch { /* Keep the current in-memory selection. */ }
    }
  }

  function clearReviewData() {
    if (activeUserId) {
      try { sessionStorage.removeItem(storageKey(activeUserId)) }
      catch { /* Continue clearing the in-memory selection. */ }
    }
    activeUserId = ''
    reviewIds.value = []
    bookName.value = ''
  }

  return { reviewIds, bookName, restoreReviewData, setReviewData, clearReviewData }
})
