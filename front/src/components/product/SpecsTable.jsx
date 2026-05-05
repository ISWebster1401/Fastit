export default function SpecsTable({ specs }) {
  if (!specs || Object.keys(specs).length === 0) {
    return <p className="text-[#64748b] dark:text-white/30 text-sm italic">Sin especificaciones técnicas registradas.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <tbody>
          {Object.entries(specs).map(([key, value], i) => (
            <tr
              key={key}
              className={`border-b border-[#e2e8f0] dark:border-white/[0.06] ${
                i % 2 === 0
                  ? 'bg-[#f8fafc] dark:bg-white/[0.03]'
                  : 'bg-white dark:bg-transparent'
              }`}
            >
              <td className="py-3 px-4 font-medium text-[#64748b] dark:text-blue-400/70 w-48 align-top whitespace-nowrap">
                {key}
              </td>
              <td className="py-3 px-4 text-[#0f172a] dark:text-white/80 font-mono text-xs">
                {String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
