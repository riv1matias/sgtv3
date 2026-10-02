/**
 * Datos de demostración (ficticios). Crea organización, usuarios, catálogos y un conjunto de tareas
 * y certificados recorriendo el circuito real a través de los servicios (así la auditoría queda completa).
 */
import { eq } from 'drizzle-orm'
import { getDb, getPool, schema as s } from '../src/db'
import { leerTodas } from '../src/domain/flujo/definiciones'
import { PARAMETROS_DEFECTO } from '../src/server/comun'
import { cargarUsuario, type Usuario } from '../src/server/usuarios'
import { crearTarea, ejecutarAccionTarea, agregarBitacora, procesarVencimientos } from '../src/server/servicios/tareas'
import { adjuntarDocumentos, crearCertificado, ejecutarAccionCertificado, guardarBorrador, registrarDocumentoSap, resolverAlerta, subirFacturaTercero, tomarCertificado } from '../src/server/servicios/certificados'
import { cerrarPeriodo, crearAjuste, crearPeriodo } from '../src/server/servicios/liquidaciones'
import { registrarEvento, SISTEMA } from '../src/server/auditoria'
import { aTexto, dec, mul } from '../src/domain/dinero'

let db: ReturnType<typeof getDb>

// ─────────────────────────────── Organización ───────────────────────────────

const rect = (lng1: number, lat1: number, lng2: number, lat2: number) => ({
  type: 'MultiPolygon', coordinates: [[[[lng1, lat1], [lng2, lat1], [lng2, lat2], [lng1, lat2], [lng1, lat1]]]],
})

const ORG: Array<{ codigo: string; nombre: string; subs: Array<{ codigo: string; nombre: string; poligono?: unknown; bases: string[] }> }> = [
  { codigo: 'AMBA', nombre: 'AMBA', subs: [
    { codigo: 'CAPN', nombre: 'Capital Norte', poligono: rect(-58.54, -34.60, -58.33, -34.52), bases: ['Belgrano', 'Palermo', 'Saavedra'] },
    { codigo: 'CAPS', nombre: 'Capital Sur', poligono: rect(-58.54, -34.71, -58.33, -34.60), bases: ['Boedo', 'Flores', 'Barracas'] },
    { codigo: 'GBAN', nombre: 'GBA Norte', poligono: rect(-58.90, -34.52, -58.40, -34.30), bases: ['San Isidro', 'Tigre', 'Pilar'] },
    { codigo: 'GBAO', nombre: 'GBA Oeste', poligono: rect(-58.95, -34.75, -58.54, -34.52), bases: ['Morón', 'Merlo', 'Moreno'] },
    { codigo: 'GBAS', nombre: 'GBA Sur', poligono: rect(-58.54, -35.00, -58.10, -34.71), bases: ['Avellaneda', 'Quilmes', 'Lanús'] },
  ] },
  { codigo: 'MED', nombre: 'Mediterránea', subs: [
    { codigo: 'GCBA', nombre: 'Gran Córdoba', poligono: rect(-64.35, -31.55, -64.05, -31.30), bases: ['Córdoba Centro', 'Villa Carlos Paz'] },
    { codigo: 'CBAN', nombre: 'Córdoba Norte', bases: ['Jesús María'] },
    { codigo: 'CBAS', nombre: 'Córdoba Sur', bases: ['Río Cuarto'] },
    { codigo: 'CUYO', nombre: 'Mediterránea Cuyo', bases: ['Mendoza', 'San Juan'] },
  ] },
  { codigo: 'LIT', nombre: 'Litoral', subs: [
    { codigo: 'GROS', nombre: 'Gran Rosario', poligono: rect(-60.85, -33.05, -60.55, -32.85), bases: ['Rosario Centro', 'Funes'] },
    { codigo: 'LITC', nombre: 'Litoral Centro', bases: ['Santa Fe', 'Paraná'] },
    { codigo: 'LITN', nombre: 'Litoral Norte', bases: ['Resistencia', 'Corrientes'] },
  ] },
  { codigo: 'PBP', nombre: 'PBA y Patagonia', subs: [
    { codigo: 'PBAC', nombre: 'PBA Centro', bases: ['Azul', 'Tandil'] },
    { codigo: 'PBAK', nombre: 'PBA Costa', bases: ['Mar del Plata'] },
    { codigo: 'PATA', nombre: 'Patagonia', bases: ['Neuquén', 'Bariloche'] },
  ] },
]

function cuitCon(base10: string) {
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = pesos.reduce((a, p, i) => a + p * Number(base10[i]), 0)
  let v = 11 - (sum % 11)
  if (v === 11) v = 0
  if (v === 10) v = 9
  return `${base10.slice(0, 2)}-${base10.slice(2)}-${v}`
}

const CONTRATISTAS = [
  { razon: 'Redes del Plata S.A.', cuit: cuitCon('3071234561'), subs: ['CAPN', 'CAPS', 'GBAS'], centro: 'C101', ap: 'P101', am: 'M101' },
  { razon: 'Conexiones del Sur S.R.L.', cuit: cuitCon('3071234562'), subs: ['CAPS', 'GBAS', 'GBAO'], centro: 'C102', ap: 'P102', am: 'M102' },
  { razon: 'Obras y Ductos Norte S.A.', cuit: cuitCon('3071234563'), subs: ['CAPN', 'GBAN'], centro: 'C103', ap: 'P103', am: 'M103' },
  { razon: 'Fibra Mediterránea S.R.L.', cuit: cuitCon('3071234564'), subs: ['GCBA', 'CBAN', 'CBAS'], centro: 'C201', ap: 'P201', am: 'M201' },
  { razon: 'Servicios Técnicos Litoral S.A.', cuit: cuitCon('3071234565'), subs: ['GROS', 'LITC'], centro: 'C301', ap: 'P301', am: 'M301' },
]

// ─────────────────────────────── Catálogos (ficticios) ───────────────────────────────

type Cod = [s4: string, desc: string, um: string, cat: string, mant: number, obras: number, extra?: Partial<typeof s.codigosMo.$inferInsert>, alias?: string]
const CODIGOS: Cod[] = [
  ['5900101', 'Tendido de cable de fibra óptica aérea sobre poste', 'M', 'FO', 1450, 1380, { umbralAlerta: '3000', alcance: 'Incluye morsetería, retención y señalización. No incluye poste nuevo.' }, '990100101'],
  ['5900102', 'Tendido de cable de fibra óptica en ducto existente', 'M', 'FO', 1620, 1540, { umbralAlerta: '3000' }, '990100102'],
  ['5900103', 'Fusión de fibra óptica (por empalme)', 'UN', 'FO', 9800, 9300, { umbralAlerta: '200' }, '990100103'],
  ['5900104', 'Medición reflectométrica por fibra', 'UN', 'FO', 6200, 5900, {}, '990100104'],
  ['5900105', 'Instalación de caja de empalme aérea', 'UN', 'FO', 48500, 46000, {}, '990100105'],
  ['5900106', 'Instalación de NAP / caja terminal óptica', 'UN', 'FO', 36200, 34400, {}, '990100106'],
  ['5900201', 'Tendido de cable coaxil troncal sobre poste', 'M', 'RD', 1210, 1150, { umbralAlerta: '3000' }, '990200201'],
  ['5900202', 'Reemplazo de amplificador de red', 'UN', 'RD', 58700, 0, {}, '990200202'],
  ['5900203', 'Mantenimiento de fuente de alimentación', 'UN', 'Mantenimiento', 77600, 0, {}, '990200203'],
  ['5900204', 'Normalización de acometida de cliente', 'UN', 'Mantenimiento', 18400, 0, {}, '990200204'],
  ['5900205', 'Aplomado de poste o columna existente', 'UN', 'Mantenimiento', 42300, 40100, {}, '990200205'],
  ['5900206', 'Colocación de poste de madera 9 m', 'UN', 'Mantenimiento', 186000, 176500, {}, '990200206'],
  ['5900207', 'Colocación de rienda con ancla existente', 'UN', 'Mantenimiento', 29800, 28300, {}, '990200207'],
  ['5900208', 'Retiro de red en desuso', 'M', 'Mantenimiento', 540, 510, { umbralAlerta: '5000' }, '990200208'],
  ['5900301', 'Excavación de zanja a mano en vereda', 'M', 'CIVIL', 22400, 21300, { umbralAlerta: '500' }, '990300301'],
  ['5900302', 'Reposición de vereda de cemento alisado', 'M2', 'CIVIL', 21000, 17800, {}, '990300302'],
  ['5900303', 'Construcción de cámara de hormigón 60x60', 'UN', 'CIVIL', 385600, 365800, {}, '990300303'],
  ['5900304', 'Perforación dirigida con ducto de 63 mm', 'M', 'CIVIL', 0, 140900, { umbralAlerta: '1000' }, '990300304'],
  ['5900305', 'Cruce de calle con rotura de pavimento', 'UN', 'CIVIL', 175700, 0, {}, '990300305'],
  ['5900306', 'Vaciado de cámara con bomba', 'UN', 'CIVIL', 68800, 62600, {}, '990300306'],
  ['5900401', 'Relevamiento y diseño de red por manzana', 'MZA', 'Proyectos', 32500, 32500, {}, '990400401'],
  ['5900402', 'Diseño de edificio por montante', 'UN', 'Proyectos', 24200, 24200, {}, '990400402'],
  ['5900501', 'Instalación de punto de red en evento', 'UN', 'Eventos', 15800, 0, {}, '990500501'],
  ['5900502', 'Verificación de señal en evento', 'UN', 'Eventos', 8900, 0, {}, '990500502'],
  ['5900601', 'Adicional por mantenimiento de urgencia', 'UN', 'Adicional', 728700, 0, { soloUrgencia: true, requiereSegundaAprobacion: true }, '990600601'],
  ['5900602', 'Costo mínimo diario', 'AD', 'Adicional', 1, 1, { montoAbierto: true, requiereSegundaAprobacion: true, umbralAlerta: '600000', alcance: 'Aplica cuando la producción del día no alcanza el mínimo acordado. Uno por certificado.' }, '990600602'],
  ['5900603', 'Recursos solicitados', 'AD', 'Adicional', 1, 1, { montoAbierto: true, requiereSegundaAprobacion: true, requiereFactura: true, alcance: 'Materiales o insumos provistos por el contratista a pedido. Requiere factura del proveedor.' }, '990600603'],
  ['5900604', 'Adicional fin de semana y feriado', 'AD', 'Adicional', 1, 1, { montoAbierto: true, requiereSegundaAprobacion: true }, '990600604'],
  ['5900605', 'Adicional viáticos', 'AD', 'Adicional', 1, 1, { montoAbierto: true, requiereSegundaAprobacion: true }, '990600605'],
]

const MATERIALES: Array<[string, string, string, string, boolean, number]> = [
  ['10100001', 'Cable de fibra óptica 48 FO autosoportado', 'M', 'Fibra', true, 820],
  ['10100002', 'Cable de fibra óptica 12 FO para ducto', 'M', 'Fibra', true, 610],
  ['10100003', 'Cable coaxil troncal .500', 'M', 'Coaxil', true, 740],
  ['10100004', 'Cable coaxil RG6 para acometida', 'M', 'Coaxil', false, 180],
  ['10200001', 'Caja de empalme óptica 48 FO', 'UN', 'Pasivos', true, 58000],
  ['10200002', 'NAP 16 puertos', 'UN', 'Pasivos', true, 41000],
  ['10200003', 'Amplificador de línea', 'UN', 'Activos', true, 265000],
  ['10200004', 'Fuente de alimentación 90 V', 'UN', 'Activos', true, 690000],
  ['10300001', 'Morsa de retención para cable', 'UN', 'Herrajes', false, 3200],
  ['10300002', 'Preformado de retención', 'UN', 'Herrajes', false, 2100],
  ['10300003', 'Rienda de acero galvanizado', 'M', 'Herrajes', true, 950],
  ['10400001', 'Poste de madera 9 m', 'UN', 'Postes', true, 210000],
  ['10400002', 'Tritubo PEAD 40 mm', 'M', 'Ductos', false, 1900],
  ['10400003', 'Cemento portland (bolsa 50 kg)', 'UN', 'Obra civil', false, 9800],
  ['10400004', 'Tapa de cámara 60x60', 'UN', 'Obra civil', true, 121000],
]

const IMPUTACIONES = [
  { tipo: 'wo', numero: 'WO-HX-0104512', descripcion: 'Mantenimiento correctivo red HFC Capital Sur' },
  { tipo: 'wo', numero: 'WO-HX-0104588', descripcion: 'Mantenimiento preventivo FTTH Capital Norte' },
  { tipo: 'wo', numero: 'WO-HX-0201177', descripcion: 'Mantenimiento correctivo Gran Córdoba' },
  { tipo: 'pep', numero: 'ARATO-26011.AF', descripcion: 'Expansión FTTH AMBA 2026', presupuesto: '250000000' },
  { tipo: 'pep', numero: 'ARATO-26042.BH', descripcion: 'Backhaul sitios Gran Rosario 2026', presupuesto: '80000000' },
  { tipo: 'oc', numero: 'OC-7710023', descripcion: 'Eventos corporativos 2026' },
]

// ─────────────────────────────── Utilidades ───────────────────────────────

// PNG 1x1 válido; se le agregan bytes al final para que cada archivo tenga un hash distinto
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
let nArchivo = 0
const foto = (nombre: string) => new File([Buffer.concat([PNG, Buffer.from(`#${++nArchivo}-${nombre}`)])], nombre, { type: 'image/png' })
const pdf = (nombre: string) => new File([Buffer.from(`%PDF-1.4\n% documento de demostración ${++nArchivo} ${nombre}\n%%EOF`)], nombre, { type: 'application/pdf' })
const csv = (nombre: string, filas: Array<[string, number]>) => new File([`Material;Cantidad\n${filas.map(([c, q]) => `${c};${q}`).join('\n')}\n`], nombre, { type: 'text/csv' })

export async function sembrar() {
  db = getDb()
  const [yaExiste] = await db.select().from(s.flujos).limit(1)
  if (yaExiste) { console.log('La base ya tiene datos. Usá "pnpm db:reset" para empezar de cero.'); return }

  for (const def of leerTodas()) {
    await db.insert(s.flujos).values({ clave: def.flujo, version: def.version, definicion: def, vigenteDesde: '2026-01-01' })
  }
  for (const [clave, valor] of Object.entries(PARAMETROS_DEFECTO)) await db.insert(s.parametros).values({ clave, valor })

  const subPorCod = new Map<string, number>()
  for (const r of ORG) {
    const [reg] = await db.insert(s.regiones).values({ codigo: r.codigo, nombre: r.nombre }).returning()
    for (const sub of r.subs) {
      const [x] = await db.insert(s.subregiones).values({ regionId: reg.id, codigo: sub.codigo, nombre: sub.nombre, poligono: sub.poligono ?? null }).returning()
      subPorCod.set(sub.codigo, x.id)
      for (const b of sub.bases) await db.insert(s.bases).values({ subregionId: x.id, nombre: b })
    }
  }

  const contrPorNombre = new Map<string, number>()
  for (const c of CONTRATISTAS) {
    const [x] = await db.insert(s.contratistas).values({ razonSocial: c.razon, cuit: c.cuit, centroSap: c.centro, almacenProyecto: c.ap, almacenMantenimiento: c.am }).returning()
    contrPorNombre.set(c.razon, x.id)
    for (const sc of c.subs) await db.insert(s.contratistaSubregiones).values({ contratistaId: x.id, subregionId: subPorCod.get(sc)! })
  }

  // Usuarios internos (ficticios). Cada uno con su supervisor, roles y subregiones.
  const U = new Map<string, string>()
  async function usuario(clave: string, nombre: string, apellido: string, roles: string[], subs: string[], opts: { supervisor?: string; cargo?: string; contratista?: string } = {}) {
    const [u] = await db.insert(s.usuarios).values({
      email: `${clave}@demo.local`, nombre, apellido, tipo: opts.contratista ? 'contratista' : 'interno', cargo: opts.cargo ?? null,
      supervisorId: opts.supervisor ? U.get(opts.supervisor)! : null, contratistaId: opts.contratista ? contrPorNombre.get(opts.contratista)! : null,
    }).returning()
    U.set(clave, u.id)
    for (const r of roles) await db.insert(s.usuarioRoles).values({ usuarioId: u.id, rol: r })
    for (const sc of subs) await db.insert(s.usuarioSubregiones).values({ usuarioId: u.id, subregionId: subPorCod.get(sc)! })
    return u.id
  }
  const AMBA_CAP = ['CAPN', 'CAPS']
  await usuario('carla.benitez', 'Carla', 'Benítez', ['gerente'], ['CAPN', 'CAPS', 'GBAS'], { cargo: 'Gerente Capital' })
  await usuario('pablo.herrera', 'Pablo', 'Herrera', ['gerente'], ['GBAN', 'GBAO'], { cargo: 'Gerente GBA' })
  await usuario('martin.gomez', 'Martín', 'Gómez', ['supervisor', 'solicitante'], AMBA_CAP, { supervisor: 'carla.benitez', cargo: 'Supervisor de Mantenimiento' })
  await usuario('lucia.fernandez', 'Lucía', 'Fernández', ['solicitante'], AMBA_CAP, { supervisor: 'martin.gomez', cargo: 'Inspectora' })
  await usuario('diego.romero', 'Diego', 'Romero', ['solicitante'], ['CAPN', 'CAPS', 'GBAS'], { supervisor: 'martin.gomez', cargo: 'Técnico' })
  await usuario('laura.quiroga', 'Laura', 'Quiroga', ['gerente'], ['GCBA', 'CBAN', 'CBAS', 'CUYO'], { cargo: 'Gerente Mediterránea' })
  await usuario('natalia.sosa', 'Natalia', 'Sosa', ['solicitante'], ['GCBA'], { supervisor: 'laura.quiroga', cargo: 'Analista' })
  await usuario('jorge.castro', 'Jorge', 'Castro', ['administracion', 'supervisor'], ['CAPN', 'CAPS', 'GBAN', 'GBAO', 'GBAS'], { cargo: 'Jefe de Administración AMBA' })
  await usuario('sofia.acosta', 'Sofía', 'Acosta', ['administracion'], ['CAPN', 'CAPS', 'GBAN', 'GBAO', 'GBAS'], { supervisor: 'jorge.castro', cargo: 'Administrativa' })
  await usuario('ricardo.molina', 'Ricardo', 'Molina', ['cerco', 'supervisor'], [], { cargo: 'Jefe de CERCO' })
  await usuario('valeria.ruiz', 'Valeria', 'Ruiz', ['cerco'], [], { supervisor: 'ricardo.molina', cargo: 'Analista CERCO' })
  await usuario('andrea.paz', 'Andrea', 'Paz', ['adm_obra'], ['CAPN', 'CAPS', 'GBAN', 'GBAO', 'GBAS'], { cargo: 'Administración de Obra AMBA' })
  await usuario('gustavo.ibanez', 'Gustavo', 'Ibáñez', ['compras'], [], { cargo: 'Compras' })
  await usuario('admin', 'Administración', 'del Sistema', ['admin_sistema'], [], { cargo: 'TI' })
  await usuario('auditoria', 'Auditoría', 'Interna', ['auditor'], [], { cargo: 'Auditoría' })
  // Contratistas
  await usuario('rdp.admin', 'Mariana', 'López', ['contratista_responsable'], [], { contratista: 'Redes del Plata S.A.', cargo: 'Administrativa' })
  await usuario('rdp.tecnico', 'Hernán', 'Vega', ['contratista_tecnico'], [], { contratista: 'Redes del Plata S.A.', cargo: 'Jefe de cuadrilla' })
  await usuario('cds.admin', 'Federico', 'Núñez', ['contratista_responsable'], [], { contratista: 'Conexiones del Sur S.R.L.', cargo: 'Responsable' })
  await usuario('odn.admin', 'Paula', 'Medina', ['contratista_responsable'], [], { contratista: 'Obras y Ductos Norte S.A.', cargo: 'Responsable' })
  await usuario('fme.admin', 'Tomás', 'Aguirre', ['contratista_responsable'], [], { contratista: 'Fibra Mediterránea S.R.L.', cargo: 'Responsable' })
  await usuario('stl.admin', 'Carolina', 'Ríos', ['contratista_responsable'], [], { contratista: 'Servicios Técnicos Litoral S.A.', cargo: 'Responsable' })

  // Catálogo de MO y dos LPU (la segunda con +12% de actualización)
  const compras = U.get('gustavo.ibanez')!
  const [lpu1] = await db.insert(s.lpuVersiones).values({ nombre: 'LPU junio 2026', vigenciaDesde: '2026-06-01', porcentajeInformado: '0', estado: 'publicada', creadoPor: compras, publicadaAt: new Date('2026-05-25T12:00:00Z'), publicadaPor: compras }).returning()
  const [lpu2] = await db.insert(s.lpuVersiones).values({ nombre: 'LPU septiembre 2026', vigenciaDesde: '2026-09-01', porcentajeInformado: '12', estado: 'publicada', creadoPor: compras, publicadaAt: new Date('2026-08-28T12:00:00Z'), publicadaPor: compras }).returning()
  const codPorS4 = new Map<string, number>()
  for (const [s4, desc, um, cat, mant, obras, extra, alias] of CODIGOS) {
    const [c] = await db.insert(s.codigosMo).values({ codigoS4: s4, descripcion: desc, unidad: um, categoria: cat, ...(extra ?? {}) }).returning()
    codPorS4.set(s4, c.id)
    if (alias) await db.insert(s.codigoMoAlias).values({ codigoMoId: c.id, alias, origen: 'codigo' })
    for (const [lista, precio] of [['mantenimiento', mant], ['obras', obras]] as const) {
      if (precio <= 0) continue
      const p2 = um === 'AD' ? '1' : aTexto(mul(dec(precio), dec('1.12')), 4)
      await db.insert(s.lpuPrecios).values([{ lpuId: lpu1.id, codigoMoId: c.id, lista, precio: String(precio) }, { lpuId: lpu2.id, codigoMoId: c.id, lista, precio: p2 }])
    }
  }
  const matPorCod = new Map<string, number>()
  for (const [cod, desc, um, grupo, rec, precio] of MATERIALES) {
    const [m] = await db.insert(s.materiales).values({ codigoSap: cod, descripcion: desc, unidad: um, grupo, recuperable: rec, precioReferencia: String(precio), umbralAlerta: um === 'M' ? '5000' : '50' }).returning()
    matPorCod.set(cod, m.id)
  }
  const impPorNum = new Map<string, number>()
  for (const i of IMPUTACIONES) {
    const [x] = await db.insert(s.imputaciones).values({ tipo: i.tipo, numero: i.numero, descripcion: i.descripcion, presupuesto: i.presupuesto ?? null }).returning()
    impPorNum.set(i.numero, x.id)
  }
  // Reglas de CERCO
  const cerco = U.get('ricardo.molina')!
  await db.insert(s.reglasCodigo).values([
    { tipo: 'maximo_por_certificado', codigoMoId: codPorS4.get('5900602')!, parametro: '1', mensaje: 'Costo mínimo diario: se admite uno por certificado', creadoPor: cerco },
    { tipo: 'requiere_codigo_base', codigoMoId: codPorS4.get('5900103')!, codigoRelacionadoId: codPorS4.get('5900104')!, mensaje: 'Las fusiones de fibra deben ir acompañadas de la medición reflectométrica', creadoPor: cerco },
    { tipo: 'solo_tipo_trabajo', codigoMoId: codPorS4.get('5900604')!, parametro: 'mantenimiento,eventos', mensaje: 'El adicional de fin de semana no aplica a obras', creadoPor: cerco },
  ])
  await registrarEvento(db, SISTEMA, { entidad: 'sistema', entidadId: 'seed', accion: 'carga_inicial', comentario: 'Datos de demostración' })
  console.log('Maestros cargados')

  await circuitoDeDemo({ U, contrPorNombre, subPorCod, codPorS4, matPorCod, impPorNum })
  await procesarVencimientos()
  console.log('Seed completo')
}

// ─────────────────────────────── Circuito de demostración ───────────────────────────────

async function circuitoDeDemo(ctx: { U: Map<string, string>; contrPorNombre: Map<string, number>; subPorCod: Map<string, number>; codPorS4: Map<string, number>; matPorCod: Map<string, number>; impPorNum: Map<string, number> }) {
  const u = async (k: string): Promise<Usuario> => (await cargarUsuario(ctx.U.get(k)!))!
  const lucia = await u('lucia.fernandez')
  const diego = await u('diego.romero')
  const natalia = await u('natalia.sosa')
  const rdp = await u('rdp.admin')
  const rdpTec = await u('rdp.tecnico')
  const cds = await u('cds.admin')
  const fme = await u('fme.admin')
  const carla = await u('carla.benitez')
  const sofia = await u('sofia.acosta')
  const valeria = await u('valeria.ruiz')
  const andrea = await u('andrea.paz')
  const jorge = await u('jorge.castro')
  const C = (k: string) => ctx.contrPorNombre.get(k)!
  const COD = (k: string) => ctx.codPorS4.get(k)!
  const MAT = (k: string) => ctx.matPorCod.get(k)!
  const IMP = (k: string) => ctx.impPorNum.get(k)!

  const tarea = (d: { titulo: string; tipo?: 'mantenimiento' | 'obra' | 'eventos'; lat: number; lng: number; dir: string; contr: string; imp: string; urg?: string; previstos?: number; subtipo?: string; desc?: string }, quien = lucia) =>
    crearTarea({
      tipoTrabajo: d.tipo ?? 'mantenimiento', subtipo: d.subtipo ?? (d.tipo === 'obra' ? null : 'correctivo'), titulo: d.titulo, descripcion: d.desc ?? null, direccion: d.dir, lat: d.lat, lng: d.lng,
      contratistaIds: [C(d.contr)], imputacionId: IMP(d.imp), urgencia: !!d.urg, urgenciaJustificacion: d.urg ?? null, certificadosPrevistos: d.previstos ?? 1,
      datosExtra: d.tipo === 'obra' ? { proyecto: 'ARATO-26011', etapa: 'Overlay' } : { tipoRed: 'FTTH' },
    }, quien)
  const acc = (t: { id: string }, a: string, quien: Usuario, datos: Record<string, unknown> = {}) => ejecutarAccionTarea(t.id, a, datos, quien)

  const mo = (codigo: string, cantidad: string) => ({ tipo: 'mo' as const, codigoMoId: COD(codigo), cantidad })
  const ad = (codigo: string, importe: string, justificacion: string) => ({ tipo: 'mo' as const, codigoMoId: COD(codigo), importe, justificacion })
  const mat = (codigo: string, cantidad: string) => ({ tipo: 'material' as const, materialId: MAT(codigo), cantidad })
  const rec = (codigo: string, cantidad: string) => ({ tipo: 'recuperado' as const, materialId: MAT(codigo), cantidad, estadoRecuperado: 'utilizable' })

  /** Tarea aceptada, iniciada y con certificado emitido */
  async function certificada(t: { id: string }, contr: Usuario, items: Parameters<typeof guardarBorrador>[1]['items'], opts: { fin?: boolean; desde?: string; hasta?: string } = {}) {
    await acc(t, 'aceptar', contr)
    await acc(t, 'iniciar', contr)
    if (opts.fin !== false) await acc(t, 'informar_fin', contr)
    const c = await crearCertificado(t.id, contr)
    await guardarBorrador(c.id, { periodo: '2026-09', fechaEjecDesde: opts.desde ?? '2026-09-10', fechaEjecHasta: opts.hasta ?? '2026-09-12', items }, contr)
    await adjuntarDocumentos(c.id, [foto('antes.png'), foto('despues.png'), pdf('planilla-de-trabajo.pdf')], 'auto', contr)
    await ejecutarAccionCertificado(c.id, 'emitir', {}, contr)
    return c
  }
  const aprobar = (c: { id: string }, quien: Usuario, comentario = 'Verificado en campo') => ejecutarAccionCertificado(c.id, 'aprobar', { comentario }, quien)

  // 1. Asignada, esperando aceptación (urgencia)
  await tarea({ titulo: 'Corte de fibra troncal por obra vial', lat: -34.628, lng: -58.43, dir: 'Av. La Plata 1500, CABA', contr: 'Redes del Plata S.A.', imp: 'WO-HX-0104512', urg: 'Pedido telefónico del NOC: 1.200 clientes sin servicio desde las 3 AM' })
  // 2. Aceptada
  const t2 = await tarea({ titulo: 'Reemplazo de amplificador con falla intermitente', lat: -34.585, lng: -58.44, dir: 'Av. Córdoba 5200, CABA', contr: 'Redes del Plata S.A.', imp: 'WO-HX-0104588' }, diego)
  await acc(t2, 'aceptar', rdp)
  // 3. En ejecución con bitácora de la cuadrilla
  const t3 = await tarea({ titulo: 'Normalización de acometidas edificio Boedo', lat: -34.63, lng: -58.415, dir: 'Av. Boedo 900, CABA', contr: 'Redes del Plata S.A.', imp: 'WO-HX-0104512' })
  await acc(t3, 'aceptar', rdp)
  await acc(t3, 'iniciar', rdp)
  await agregarBitacora(t3.id, 'Relevamos las 24 acometidas, 9 requieren normalización', [foto('relevamiento-1.png'), foto('relevamiento-2.png')], rdpTec)
  // 4. En espera por permiso municipal
  const t4 = await tarea({ titulo: 'Cruce de calle para nuevo ducto', lat: -34.64, lng: -58.40, dir: 'Av. Caseros 2800, CABA', contr: 'Conexiones del Sur S.R.L.', imp: 'WO-HX-0104512' })
  await acc(t4, 'aceptar', cds)
  await acc(t4, 'iniciar', cds)
  await acc(t4, 'poner_en_espera', cds, { motivo: 'Permiso municipal', comentario: 'Trámite de permiso de rotura iniciado el 15/09' })
  // 5. Certificado en validación técnica (con alerta de cantidad atípica)
  const t5 = await tarea({ titulo: 'Retiro de red coaxil en desuso', lat: -34.62, lng: -58.45, dir: 'Av. Rivadavia 6500, CABA', contr: 'Redes del Plata S.A.', imp: 'WO-HX-0104512' })
  await certificada(t5, rdp, [mo('5900208', '6200'), mo('5900205', '3'), rec('10100003', '6200')])
  // 6. En aprobación gerencial (tiene costo mínimo diario)
  const t6 = await tarea({ titulo: 'Reparación de fuente de alimentación', lat: -34.60, lng: -58.40, dir: 'Av. Corrientes 3000, CABA', contr: 'Redes del Plata S.A.', imp: 'WO-HX-0104512' }, diego)
  const c6 = await certificada(t6, rdp, [mo('5900203', '1'), ad('5900602', '420000', 'La cuadrilla esperó 5 h el acceso al gabinete; producción del día por debajo del mínimo'), mat('10200004', '1')])
  await aprobar(c6, diego)
  // 7. En validación de materiales
  const t7 = await tarea({ titulo: 'Tendido de fibra aérea para cliente corporativo', lat: -34.58, lng: -58.47, dir: 'Av. Triunvirato 4000, CABA', contr: 'Redes del Plata S.A.', imp: 'WO-HX-0104588' }, diego)
  const c7 = await certificada(t7, rdp, [mo('5900101', '850'), mo('5900105', '2'), mo('5900103', '24'), mo('5900104', '24'), mat('10100001', '850'), mat('10200001', '2'), mat('10300001', '14')])
  await aprobar(c7, diego)
  // 8. En aprobación final de CERCO (consumo registrado)
  const t8 = await tarea({ titulo: 'Aplomado de postes y reposición de riendas', lat: -34.65, lng: -58.38, dir: 'Av. Montes de Oca 1200, CABA', contr: 'Conexiones del Sur S.R.L.', imp: 'WO-HX-0104512' })
  const c8 = await certificada(t8, cds, [mo('5900205', '6'), mo('5900207', '4'), mat('10300003', '48')])
  await aprobar(c8, lucia)
  await tomarCertificado(c8.id, sofia)
  await registrarDocumentoSap(c8.id, { tipo: 'consumo', numeroDocumento: '4900123456', fecha: '2026-09-22', archivo: csv('consumo-4900123456.csv', [['10300003', 48]]) }, sofia)
  await aprobar(c8, sofia, 'Consumo registrado en SAP')
  // 9. Aprobado para pago
  const t9 = await tarea({ titulo: 'Colocación de NAP en edificio', lat: -34.59, lng: -58.43, dir: 'Guatemala 4800, CABA', contr: 'Redes del Plata S.A.', imp: 'WO-HX-0104588' }, diego)
  const c9 = await certificada(t9, rdp, [mo('5900106', '3'), mo('5900103', '12'), mo('5900104', '12'), mat('10200002', '3')])
  await aprobar(c9, diego)
  await tomarCertificado(c9.id, sofia)
  await registrarDocumentoSap(c9.id, { tipo: 'consumo', numeroDocumento: '4900123501', fecha: '2026-09-23', archivo: csv('consumo-4900123501.csv', [['10200002', 3]]) }, sofia)
  await aprobar(c9, sofia)
  await aprobar(c9, valeria, 'Documentación completa y códigos dentro del alcance')
  // 10. Observado por el solicitante
  const t10 = await tarea({ titulo: 'Excavación y reposición de vereda', lat: -34.625, lng: -58.44, dir: 'Av. Directorio 2100, CABA', contr: 'Conexiones del Sur S.R.L.', imp: 'WO-HX-0104512' })
  const c10 = await certificada(t10, cds, [mo('5900301', '35'), mo('5900302', '40')])
  await ejecutarAccionCertificado(c10.id, 'observar', { motivo: 'Cantidades incorrectas', comentario: 'La reposición de vereda no puede superar lo excavado: medí 35 m2 en el lugar' }, lucia)
  // 11. Obra en tres avances, el primero aprobado por Adm. de Obra
  const t11 = await tarea({ titulo: 'Overlay FTTH Palermo — tendido en ducto', tipo: 'obra', lat: -34.575, lng: -58.42, dir: 'Palermo, CABA', contr: 'Redes del Plata S.A.', imp: 'ARATO-26011.AF', previstos: 3 }, diego)
  const c11 = await certificada(t11, rdp, [mo('5900102', '1200'), mo('5900401', '4'), mat('10100002', '1200')], { fin: false })
  await aprobar(c11, diego)
  await tomarCertificado(c11.id, sofia)
  await registrarDocumentoSap(c11.id, { tipo: 'consumo', numeroDocumento: '4900123777', fecha: '2026-09-24', archivo: csv('consumo-4900123777.csv', [['10100002', 1150]]) }, sofia)
  const alertas = await db.select().from(s.alertas).where(eq(s.alertas.entidadId, c11.id))
  for (const a of alertas) await resolverAlerta(a.id, 'Se consumieron 1.150 m: 50 m quedaron en la bobina y vuelven al almacén (se registra en el próximo avance)', sofia)
  await aprobar(c11, sofia)
  await aprobar(c11, andrea, 'Primer avance conforme a obra')
  // 12. Rechazo del gerente → revisión del solicitante
  const t12 = await tarea({ titulo: 'Guardia de fin de semana por tormenta', lat: -34.61, lng: -58.39, dir: 'Av. San Juan 2500, CABA', contr: 'Conexiones del Sur S.R.L.', imp: 'WO-HX-0104512' })
  const c12 = await certificada(t12, cds, [mo('5900204', '12'), ad('5900604', '310000', 'Trabajo sábado y domingo por tormenta del 13/09')])
  await aprobar(c12, lucia)
  await ejecutarAccionCertificado(c12.id, 'rechazar', { motivo: 'Documentación insuficiente', comentario: 'Falta la orden del NOC que autorizó la guardia de fin de semana' }, carla)
  // 13. Córdoba: asignada a otro contratista
  await tarea({ titulo: 'Mantenimiento preventivo nodo Centro', lat: -31.42, lng: -64.19, dir: 'Bv. San Juan 400, Córdoba', contr: 'Fibra Mediterránea S.R.L.', imp: 'WO-HX-0201177', subtipo: 'preventivo' }, natalia)
  // 14. Recursos solicitados con factura de terceros (validación técnica)
  const t14 = await tarea({ titulo: 'Reparación urgente de cámara inundada', lat: -34.645, lng: -58.42, dir: 'Av. Sáenz 800, CABA', contr: 'Redes del Plata S.A.', imp: 'WO-HX-0104512', urg: 'Cámara inundada con riesgo de corte masivo, pedido por WhatsApp del supervisor de guardia' })
  await acc(t14, 'aceptar', rdp)
  await acc(t14, 'iniciar', rdp)
  await acc(t14, 'informar_fin', rdp)
  const c14 = await crearCertificado(t14.id, rdp)
  const factura = await subirFacturaTercero(c14.id, pdf('factura-bomba-alquiler.pdf'), rdp)
  await guardarBorrador(c14.id, { periodo: '2026-09', fechaEjecDesde: '2026-09-20', fechaEjecHasta: '2026-09-20', items: [
    mo('5900306', '2'), mo('5900601', '1'),
    { tipo: 'mo', codigoMoId: COD('5900603'), importe: '185000', justificacion: 'Alquiler de bomba de achique de alto caudal', facturaNumero: 'B-0003-00012345', facturaCuit: '20-12345678-6', facturaFecha: '2026-09-20', facturaImporte: '185000', facturaDocumentoId: factura },
  ] }, rdp)
  await adjuntarDocumentos(c14.id, [foto('camara-inundada.png'), foto('camara-achicada.png')], 'auto', rdp)
  await ejecutarAccionCertificado(c14.id, 'emitir', {}, rdp)

  // 15. Lista para certificar: ejecutada, con fotos de la cuadrilla y sin certificado (recorrido sugerido para el proveedor)
  const t15 = await tarea({
    titulo: 'Reparación de empalme de fibra en cámara', lat: -34.603, lng: -58.412, dir: 'Av. Díaz Vélez 4100, CABA', contr: 'Redes del Plata S.A.', imp: 'WO-HX-0104512',
    desc: 'Cámara con empalme de 48 fibras dañado por humedad. Reemplazar la caja de empalme, fusionar las 48 fibras y medir con OTDR. Recuperar la caja dañada.',
  })
  await acc(t15, 'aceptar', rdp)
  await acc(t15, 'iniciar', rdp)
  await agregarBitacora(t15.id, 'Caja de empalme reemplazada y 48 fusiones realizadas. Medición OTDR dentro de valores.', [foto('empalme-antes.png'), foto('empalme-despues.png')], rdpTec)
  await acc(t15, 'informar_fin', rdp)

  // Período anterior cerrado con una liquidación pendiente de factura, y un ajuste para la próxima
  await crearPeriodo('2026-09', '2026-09-26', jorge)
  const [p] = await db.select().from(s.periodos).where(eq(s.periodos.nombre, '2026-09'))
  await cerrarPeriodo(p.id, jorge)
  await crearPeriodo('2026-10', '2026-10-20', jorge)
  await crearAjuste({ contratistaId: C('Conexiones del Sur S.R.L.'), tipo: 'debito', importe: '45000', motivo: 'Reposición de vereda mal ejecutada verificada después del pago (cert. de agosto)' }, jorge)
  void fme
}

if (process.argv[1]?.includes('seed')) {
  sembrar().then(() => getPool().end()).catch(async (e) => { console.error(e); await getPool().end(); process.exit(1) })
}
