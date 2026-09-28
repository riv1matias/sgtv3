import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { ingresar, sinErrores } from './ayuda'

const foto = path.join(__dirname, 'archivos', 'foto.png')
const factura = path.join(__dirname, 'archivos', 'factura.pdf')

async function boton(page: Page, nombre: string | RegExp) {
  await page.getByRole('button', { name: nombre }).first().click()
}

test('circuito completo: pedido → certificado → aprobaciones → liquidación → factura', async ({ page }) => {
  page.on('dialog', (d) => d.accept())
  const titulo = `Prueba E2E ${Date.now()}`

  // 1. El solicitante pide la tarea; la subregión se detecta por la ubicación
  await ingresar(page, 'Lucía Fernández')
  await page.goto('/i/tareas/nueva')
  await page.locator('input[name=lat]').fill('-34.635')
  await page.locator('input[name=lng]').fill('-58.43')
  await expect(page.getByText('Subregión detectada por ubicación')).toContainText('Capital Sur')
  await page.locator('select[name=contratistaId]').selectOption({ label: 'Redes del Plata S.A.' })
  await page.locator('input[name=titulo]').fill(titulo)
  await page.locator('input[name=direccion]').fill('Av. La Plata 2000, CABA')
  const imp = await page.locator('select[name=imputacionId] option', { hasText: 'WO-HX-0104512' }).getAttribute('value')
  await page.locator('select[name=imputacionId]').selectOption(imp!)
  await boton(page, 'Crear y asignar tarea')
  await page.waitForURL(/\/i\/tareas\/[0-9a-f-]+\?creada=1/)
  const tareaId = page.url().split('/tareas/')[1].split('?')[0]
  await expect(page.getByText('Tarea creada y asignada')).toBeVisible()

  // 2. El contratista acepta, ejecuta y certifica
  await ingresar(page, 'Mariana López')
  await page.goto(`/c/tareas/${tareaId}`)
  await boton(page, 'Aceptar tarea')
  await expect(page.getByText('Aceptada').first()).toBeVisible()
  await boton(page, 'Iniciar trabajo')
  await expect(page.getByText('En ejecución').first()).toBeVisible()
  await boton(page, 'Informar fin de ejecución')
  await expect(page.getByText('Ejecutada').first()).toBeVisible()
  await boton(page, /Certificar/)
  await page.waitForURL(/\/c\/certificados\/[0-9a-f-]+$/)
  const certId = page.url().split('/certificados/')[1]

  await page.locator('input[type=date]').nth(0).fill('2026-09-20')
  await page.locator('input[type=date]').nth(1).fill('2026-09-22')
  const buscador = page.getByPlaceholder(/Buscá por código S4/)
  await buscador.fill('fibra óptica aérea')
  await expect(page.getByRole('button', { name: /5900101/ })).toBeVisible()
  await buscador.press('Enter')
  await page.keyboard.type('250')
  await boton(page, 'Guardar borrador')
  await expect(page.getByText('Borrador guardado')).toBeVisible()
  await page.locator('input[name=archivos]').setInputFiles(foto)
  await boton(page, 'Adjuntar')
  await expect(page.getByText('Documentos adjuntados')).toBeVisible()
  await page.getByText('Emitir certificado ▾').click()
  await boton(page, 'Guardar y emitir')
  await page.waitForURL(/emitido=1/)
  await expect(page.getByText('Validación técnica').first()).toBeVisible()

  // 3. Validación técnica del solicitante (sin materiales ni códigos de 2da aprobación → aprobación final)
  await ingresar(page, 'Lucía Fernández')
  await page.goto(`/i/certificados/${certId}`)
  await boton(page, /^Aprobar/)
  await expect(page.getByText('Aprobación final').first()).toBeVisible()

  // 4. Aprobación final de CERCO
  await ingresar(page, 'Valeria Ruiz')
  await page.goto('/i')
  await page.getByRole('link', { name: /CERT-/ }).first().waitFor()
  await page.goto(`/i/certificados/${certId}`)
  await boton(page, /^Aprobación final/)
  await expect(page.getByText('Aprobado para pago').first()).toBeVisible()

  // 5. Administración cierra el período: congela precios y genera la liquidación
  await ingresar(page, 'Jorge Castro')
  await page.goto('/i/liquidaciones')
  await boton(page, 'Cerrar período')
  await expect(page.getByText(/Período cerrado/)).toBeVisible()

  // 6. El contratista adjunta la factura y la liquidación queda cerrada
  await ingresar(page, 'Mariana López')
  await page.goto(`/c/certificados/${certId}`)
  await expect(page.getByText('En liquidación').first()).toBeVisible()
  await page.goto('/c/liquidaciones')
  await page.getByRole('link', { name: /LIQ-/ }).first().click()
  await page.waitForURL(/\/c\/liquidaciones\/\d+/)
  await expect(page.getByRole('link', { name: /CERT-/ }).filter({ hasText: /./ }).first()).toBeVisible()
  await page.locator('input[name=numero]').fill('A-0001-00009999')
  await page.locator('input[name=archivo]').setInputFiles(factura)
  await boton(page, 'Adjuntar factura y cerrar')
  await expect(page.getByText(/Ver factura/)).toBeVisible()
  await page.goto(`/c/certificados/${certId}`)
  await expect(page.getByText('Cerrado').first()).toBeVisible()
  await sinErrores(page)

  // 7. La historia completa queda en la auditoría y la cadena sigue íntegra
  await ingresar(page, 'Auditoría Interna')
  await page.goto('/i/auditoria?verificar=1')
  await expect(page.getByText('Cadena íntegra')).toBeVisible()
})

test('rechazo del gerente → revisión del solicitante → reenvío', async ({ page }) => {
  await ingresar(page, 'Lucía Fernández')
  await page.goto('/i')
  await page.getByRole('link', { name: 'CERT-2026-000008' }).click()
  await expect(page.getByText('Revisión de rechazo').first()).toBeVisible()
  await expect(page.getByText('Falta la orden del NOC').first()).toBeVisible()
  await page.locator('summary', { hasText: 'Responder y reenviar' }).click()
  await page.locator('details[open] textarea[name=comentario]').fill('Adjunto referencia: ticket NOC 55812 del 13/09')
  await page.locator('details[open]').getByRole('button', { name: /Confirmar/ }).click()
  await expect(page.getByText('Aprobación gerencial').first()).toBeVisible()
})

test('observación con motivo obligatorio vuelve al contratista', async ({ page }) => {
  await ingresar(page, 'Lucía Fernández')
  await page.goto('/i/certificados?estado=VAL_TECNICA')
  await page.getByRole('link', { name: 'CERT-2026-000009' }).click()
  await page.locator('summary', { hasText: 'Observar (devolver' }).click()
  const form = page.locator('details[open]')
  await form.locator('select[name=motivo]').selectOption('Documentación insuficiente')
  await form.locator('textarea[name=comentario]').fill('Falta la foto de la bomba instalada')
  await form.getByRole('button', { name: /Confirmar/ }).click()
  await expect(page.getByText('Observado').first()).toBeVisible()
  // El contratista lo ve para corregir, con el motivo
  await ingresar(page, 'Mariana López')
  await page.goto('/c')
  await expect(page.getByText('Certificados observados o rebotados')).toBeVisible()
})
