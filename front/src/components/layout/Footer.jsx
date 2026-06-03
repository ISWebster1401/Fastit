import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-[#e2e8f0]/80 dark:border-white/[0.06] mt-auto transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748b] dark:text-white/25">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#1e40af] dark:bg-blue-500 rounded-md flex items-center justify-center text-white font-bold text-[9px]">F</div>
          <span className="text-[#0f172a] dark:text-white/50 font-medium">Fast-IT</span>
          <span className="text-[#e2e8f0] dark:text-white/10">|</span>
          <span>Hardware crítico con asesoría experta</span>
          <span className="text-[#e2e8f0] dark:text-white/10">|</span>
          <span>© 2026 Fast-IT</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/terms"   className="hover:text-[#1e40af] dark:hover:text-blue-400 transition-colors">Términos</Link>
          <Link to="/privacy" className="hover:text-[#1e40af] dark:hover:text-blue-400 transition-colors">Privacidad</Link>
          <Link to="/contact" className="hover:text-[#1e40af] dark:hover:text-blue-400 transition-colors">Contacto</Link>
        </div>
      </div>
    </footer>
  )
}
