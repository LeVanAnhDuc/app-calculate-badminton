import '@testing-library/jest-dom/vitest'
import { toast } from 'sonner'

// jsdom doesn't implement matchMedia; vaul's <Drawer/> queries it (e.g. to
// detect standalone display mode) and throws without a stub.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// sonner keeps its toast queue in a module-level singleton independent of the
// React tree, so toasts triggered in one test can otherwise leak into the
// next test's freshly-mounted <Toaster/>. Dismissing after each test marks
// them inactive so a new Toaster won't replay them.
afterEach(() => {
  toast.dismiss()
})
