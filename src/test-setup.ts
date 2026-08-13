import '@testing-library/jest-dom/vitest'
import { toast } from 'sonner'

// sonner keeps its toast queue in a module-level singleton independent of the
// React tree, so toasts triggered in one test can otherwise leak into the
// next test's freshly-mounted <Toaster/>. Dismissing after each test marks
// them inactive so a new Toaster won't replay them.
afterEach(() => {
  toast.dismiss()
})
