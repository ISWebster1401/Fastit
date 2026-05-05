import '@testing-library/jest-dom'

// jsdom no implementa scrollIntoView — mock global
window.HTMLElement.prototype.scrollIntoView = () => {}
