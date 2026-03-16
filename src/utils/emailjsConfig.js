export const NOTIFICATIONS_CONFIG_MESSAGE = 'La configuracion de notificaciones no esta completa'

const readEnvValue = (...keys) => {
  for (const key of keys) {
    const value = import.meta.env?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export const getEmailJsConfig = () => ({
  serviceId: readEnvValue('VITE_EMAILJS_SERVICE_ID', 'VITE_EMAILJS_SERVICE'),
  templateId: readEnvValue('VITE_EMAILJS_TEMPLATE_ID', 'VITE_EMAILJS_TEMPLATE'),
  publicKey: readEnvValue('VITE_EMAILJS_PUBLIC_KEY', 'VITE_EMAILJS_USER_ID', 'VITE_EMAILJS_KEY'),
})

export const getMissingEmailJsEnvKeys = (config = getEmailJsConfig()) => {
  const missingKeys = []
  if (!config.serviceId) missingKeys.push('VITE_EMAILJS_SERVICE_ID')
  if (!config.templateId) missingKeys.push('VITE_EMAILJS_TEMPLATE_ID')
  if (!config.publicKey) missingKeys.push('VITE_EMAILJS_PUBLIC_KEY')
  return missingKeys
}

export const hasCompleteEmailJsConfig = (config = getEmailJsConfig()) =>
  getMissingEmailJsEnvKeys(config).length === 0
