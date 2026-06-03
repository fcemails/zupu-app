'use client'

export default function PrintButton() {
  return (
    <button
      type="button"
      className="btn primary sm"
      onClick={() => window.print()}
    >
      打印 / 导出 PDF
    </button>
  )
}
