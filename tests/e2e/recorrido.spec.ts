import { test, expect } from '@playwright/test'
import { ingresar, sinErrores } from './ayuda'

// Recorre todas las pantallas del menú de cada perfil y verifica que ninguna falle
const PERFILES: Array<[string, string[]]> = [
  ['Lucía Fernández', ['/i', '/i/tareas', '/i/tareas/nueva', '/i/certificados', '/i/contratistas', '/i/indicadores', '/i/catalogos', '/i/config/delegaciones', '/i/notificaciones', '/i/buscar?q=T-AMBA', '/i/ayuda']],
  ['Martín Gómez', ['/i', '/i/auditoria']],
  ['Carla Benítez', ['/i', '/i/certificados?estado=APROB_GERENTE']],
  ['Sofía Acosta', ['/i', '/i/materiales', '/i/materiales?tab=stock', '/i/liquidaciones']],
  ['Valeria Ruiz', ['/i', '/i/liquidaciones', '/i/catalogos?tab=reglas']],
  ['Gustavo Ibáñez', ['/i/catalogos', '/i/catalogos?tab=codigos&q=fibra', '/i/catalogos?tab=materiales', '/i/catalogos?tab=imputaciones']],
  ['Administración del Sistema', ['/i/config', '/i/config?tab=organizacion', '/i/config?tab=parametros', '/i/config?tab=flujos', '/i/auditoria?verificar=1']],
  ['Mariana López', ['/c', '/c/tareas', '/c/certificados', '/c/liquidaciones', '/c/cuadrillas', '/c/stock', '/c/indicadores', '/c/lpu', '/c/notificaciones', '/c/ayuda', '/c/tareas']],
  ['Hernán Vega', ['/campo']],
]

for (const [perfil, rutas] of PERFILES) {
  test(`pantallas de ${perfil}`, async ({ page }) => {
    await ingresar(page, perfil)
    for (const r of rutas) {
      const resp = await page.goto(r)
      expect(resp?.status(), r).toBeLessThan(400)
      await sinErrores(page)
    }
  })
}

test('la auditoría verifica la cadena íntegra', async ({ page }) => {
  await ingresar(page, 'Auditoría Interna')
  await page.goto('/i/auditoria?verificar=1')
  await expect(page.getByText('Cadena íntegra')).toBeVisible()
})

test('un contratista no puede ver la tarea de otro contratista', async ({ page }) => {
  await ingresar(page, 'Tomás Aguirre')
  await page.goto('/c/tareas')
  await expect(page.getByText('T-MED-000001')).toBeVisible()
  await expect(page.getByText('T-AMBA-000001')).toHaveCount(0)
})
