import { expect, type Page } from '@playwright/test'

export async function ingresar(page: Page, nombre: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByRole('button', { name: new RegExp(nombre) }).first().click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'))
}

/** Falla si la página muestra un error de servidor */
export async function sinErrores(page: Page) {
  await expect(page.locator('body')).not.toContainText('Application error')
  await expect(page.locator('body')).not.toContainText('Internal Server Error')
  await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error')
}
