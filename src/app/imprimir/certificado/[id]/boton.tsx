'use client'

export function BotonImprimir() {
  return (
    <div className="no-print mb-4 flex justify-end">
      <button onClick={() => window.print()} className="rounded-lg bg-marca-600 px-4 py-2 text-sm font-medium text-white hover:bg-marca-700">Imprimir / guardar como PDF</button>
    </div>
  )
}
